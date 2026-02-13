/**
 * Real Authentication Service with Prisma
 * Handles user authentication using database
 *
 * @deprecated Use `@services/auth` (unified AuthService) instead.
 * This service is kept for backward compatibility.
 *
 * Migration:
 * ```typescript
 * // Old:
 * import { authService } from '@backend/auth/AuthService';
 *
 * // New:
 * import { authService } from '@services/auth';
 * await authService.initialize();
 * ```
 *
 * @see /src/services/auth/AuthService.ts for the unified implementation
 */

import { prisma } from '../database/prisma';
import { jwtService } from './jwt';
import { PasswordHashingService } from './PasswordHashingService';
import { emailService } from '../services/emailService';
import { logger } from '../../services/SimpleLogger';
import { Role, UserStatus } from '@prisma/client';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  status: string;
  permissions: string[];
  emailVerified: boolean;
  lastLoginAt: Date | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export class AuthService {
  private static instance: AuthService;
  private passwordService: PasswordHashingService;

  private constructor() {
    this.passwordService = PasswordHashingService.getInstance();
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Get permissions based on role
   */
  private getPermissionsForRole(role: Role): string[] {
    const permissions: Record<Role, string[]> = {
      ADMIN: [
        'workflow.create', 'workflow.read', 'workflow.update', 'workflow.delete',
        'workflow.execute', 'workflow.share', 'workflow.publish',
        'credential.create', 'credential.read', 'credential.update', 'credential.delete',
        'user.create', 'user.read', 'user.update', 'user.delete',
        'system.admin', 'audit.read'
      ],
      USER: [
        'workflow.create', 'workflow.read', 'workflow.update', 'workflow.delete',
        'workflow.execute', 'workflow.share',
        'credential.create', 'credential.read', 'credential.update', 'credential.delete'
      ],
      VIEWER: [
        'workflow.read', 'credential.read'
      ]
    };

    return permissions[role] || [];
  }

  /**
   * Convert database user to AuthUser
   */
  private toAuthUser(dbUser: any): AuthUser {
    return {
      id: dbUser.id,
      email: dbUser.email,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      role: dbUser.role.toLowerCase(),
      status: dbUser.status.toLowerCase(),
      permissions: this.getPermissionsForRole(dbUser.role),
      emailVerified: dbUser.emailVerified,
      lastLoginAt: dbUser.lastLoginAt,
    };
  }

  /**
   * Authenticate user with email and password
   */
  async login(credentials: LoginCredentials): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    const { email, password } = credentials;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      logger.warn('Login attempt for non-existent user', { email });
      throw new Error('Invalid email or password');
    }

    // Check account status
    if (user.status !== UserStatus.ACTIVE) {
      logger.warn('Login attempt for inactive account', { email, status: user.status });
      throw new Error('Account is not active');
    }

    // Check if account is locked
    if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
      logger.warn('Login attempt for locked account', { email });
      throw new Error('Account is temporarily locked. Please try again later.');
    }

    // Verify password
    const isValidPassword = await this.passwordService.verify(user.passwordHash, password);

    if (!isValidPassword) {
      // Increment failed login attempts
      const newAttempts = user.failedLoginAttempts + 1;
      const lockUntil = newAttempts >= 5
        ? new Date(Date.now() + 15 * 60 * 1000) // Lock for 15 minutes after 5 attempts
        : null;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: newAttempts,
          accountLockedUntil: lockUntil,
        },
      });

      logger.warn('Failed login attempt', { email, attempts: newAttempts });
      throw new Error('Invalid email or password');
    }

    // Reset failed login attempts and update last login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        accountLockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    // Generate tokens
    const permissions = this.getPermissionsForRole(user.role);
    const tokens = await jwtService.generateTokens({
      id: user.id,
      email: user.email,
      role: user.role.toLowerCase(),
      permissions,
    });

    // Create session
    await prisma.userSession.create({
      data: {
        userId: user.id,
        sessionToken: tokens.refreshToken.split('.')[2], // Store signature part
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    logger.info('User logged in successfully', { userId: user.id, email });

    return {
      user: this.toAuthUser(user),
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
      },
    };
  }

  /**
   * Register a new user
   */
  async register(data: RegisterData): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    const { email, password, firstName, lastName } = data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      logger.warn('Registration attempt with existing email', { email });
      throw new Error('An account with this email already exists');
    }

    // Hash password
    const passwordHash = await this.passwordService.hash(password);

    // Generate email verification token
    const emailVerificationToken = this.generateSecureToken();

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        firstName: firstName || null,
        lastName: lastName || null,
        role: Role.USER,
        status: UserStatus.ACTIVE,
        emailVerified: false,
        emailVerificationToken,
        emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        preferences: {},
      },
    });

    // Generate tokens
    const permissions = this.getPermissionsForRole(user.role);
    const tokens = await jwtService.generateTokens({
      id: user.id,
      email: user.email,
      role: user.role.toLowerCase(),
      permissions,
    });

    // Create session
    await prisma.userSession.create({
      data: {
        userId: user.id,
        sessionToken: tokens.refreshToken.split('.')[2],
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    logger.info('User registered successfully', { userId: user.id, email });

    // Send verification email (non-blocking)
    emailService.sendVerificationEmail({
      email: user.email,
      firstName: user.firstName || undefined,
      emailVerificationToken,
    }).catch((error) => {
      logger.error('Failed to send verification email', { userId: user.id, error });
    });

    return {
      user: this.toAuthUser(user),
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
      },
    };
  }

  /**
   * Refresh access token
   */
  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    // Verify refresh token
    const payload = await jwtService.verifyToken(refreshToken);

    if (!payload || payload.type !== 'refresh') {
      throw new Error('Invalid refresh token');
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new Error('User not found or inactive');
    }

    // Get fresh permissions
    const permissions = this.getPermissionsForRole(user.role);

    // Generate new tokens
    const result = await jwtService.refreshAccessToken(refreshToken, permissions);

    if (!result) {
      throw new Error('Failed to refresh tokens');
    }

    // Update session
    await prisma.userSession.updateMany({
      where: {
        userId: user.id,
        sessionToken: refreshToken.split('.')[2],
      },
      data: {
        lastUsedAt: new Date(),
      },
    });

    logger.info('Tokens refreshed successfully', { userId: user.id });

    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresIn: result.expiresIn,
    };
  }

  /**
   * Logout user
   */
  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      // Revoke specific session
      await prisma.userSession.deleteMany({
        where: {
          userId,
          sessionToken: refreshToken.split('.')[2],
        },
      });
    } else {
      // Revoke all sessions for user
      await prisma.userSession.deleteMany({
        where: { userId },
      });
    }

    logger.info('User logged out', { userId });
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<AuthUser | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return null;
    }

    return this.toAuthUser(user);
  }

  /**
   * Change password
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isValid = await this.passwordService.verify(user.passwordHash, currentPassword);

    if (!isValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await this.passwordService.hash(newPassword);

    // Store old password in history
    await prisma.passwordHistory.create({
      data: {
        userId: user.id,
        passwordHash: user.passwordHash,
      },
    });

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    // Invalidate all sessions except current
    await prisma.userSession.deleteMany({
      where: { userId },
    });

    // Send password changed confirmation email (non-blocking)
    emailService.sendPasswordChangedEmail({
      email: user.email,
      firstName: user.firstName || undefined,
    }).catch((error) => {
      logger.error('Failed to send password changed email', { userId, error });
    });

    logger.info('Password changed successfully', { userId });
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.emailVerified) {
      throw new Error('Email is already verified');
    }

    // Generate new verification token
    const emailVerificationToken = this.generateSecureToken();

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken,
        emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    // Send verification email
    await emailService.sendVerificationEmail({
      email: user.email,
      firstName: user.firstName || undefined,
      emailVerificationToken,
    });

    logger.info('Verification email resent', { userId: user.id });
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // Don't reveal if user exists
      logger.info('Password reset requested for non-existent email', { email });
      return;
    }

    // Generate reset token
    const resetToken = this.generateSecureToken();

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    // Also store in dedicated table for tracking
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: resetToken,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    // Send password reset email (non-blocking)
    emailService.sendPasswordResetEmail(
      {
        email: user.email,
        firstName: user.firstName || undefined,
      },
      resetToken
    ).catch((error) => {
      logger.error('Failed to send password reset email', { userId: user.id, error });
    });

    logger.info('Password reset requested', { userId: user.id });
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: { gt: new Date() },
      },
    });

    if (!user) {
      throw new Error('Invalid or expired reset token');
    }

    // Hash new password
    const passwordHash = await this.passwordService.hash(newPassword);

    // Update user
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
        failedLoginAttempts: 0,
        accountLockedUntil: null,
      },
    });

    // Mark token as used
    await prisma.passwordResetToken.updateMany({
      where: { token },
      data: { used: true, usedAt: new Date() },
    });

    // Invalidate all sessions
    await prisma.userSession.deleteMany({
      where: { userId: user.id },
    });

    // Send password changed confirmation email (non-blocking)
    emailService.sendPasswordChangedEmail({
      email: user.email,
      firstName: user.firstName || undefined,
    }).catch((error) => {
      logger.error('Failed to send password changed email after reset', { userId: user.id, error });
    });

    logger.info('Password reset successfully', { userId: user.id });
  }

  /**
   * Verify email
   */
  async verifyEmail(token: string): Promise<void> {
    const user = await prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationExpires: { gt: new Date() },
      },
    });

    if (!user) {
      throw new Error('Invalid or expired verification token');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
    });

    // Send welcome email after successful verification (non-blocking)
    emailService.sendWelcomeEmail({
      email: user.email,
      firstName: user.firstName || undefined,
    }).catch((error) => {
      logger.error('Failed to send welcome email', { userId: user.id, error });
    });

    logger.info('Email verified successfully', { userId: user.id });
  }

  /**
   * Generate secure random token
   */
  private generateSecureToken(): string {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  }
}

// Export singleton instance
export const authService = AuthService.getInstance();
