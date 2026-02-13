/**
 * Local Authentication Provider
 * JWT-based authentication using Prisma database
 *
 * @module services/auth/providers/LocalAuthProvider
 * @version 1.0.0
 */

import { BaseAuthProvider } from './AuthProvider';
import type {
  User,
  AuthResult,
  AuthTokens,
  LoginCredentials,
  RegisterData,
} from '../types';
import { getPermissionsForRole } from '../types';
import { logger } from '../../SimpleLogger';

// Dynamic imports to avoid circular dependencies
let prisma: any = null;
let jwtService: any = null;
let PasswordHashingService: any = null;
let emailService: any = null;

/**
 * Local authentication provider using JWT and Prisma
 */
export class LocalAuthProvider extends BaseAuthProvider {
  readonly name = 'local';

  private passwordService: any = null;
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Dynamic imports
      const prismaModule = await import('../../../backend/database/prisma');
      prisma = prismaModule.prisma;

      const jwtModule = await import('../../../backend/auth/jwt');
      jwtService = jwtModule.jwtService;

      const passwordModule = await import('../../../backend/auth/PasswordHashingService');
      PasswordHashingService = passwordModule.PasswordHashingService;
      this.passwordService = PasswordHashingService.getInstance();

      const emailModule = await import('../../../backend/services/emailService');
      emailService = emailModule.emailService;

      this.initialized = true;
      logger.info('LocalAuthProvider initialized');
    } catch (error) {
      logger.error('Failed to initialize LocalAuthProvider', { error });
      throw error;
    }
  }

  async login(credentials: LoginCredentials): Promise<AuthResult> {
    const { email, password } = credentials;

    try {
      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (!user) {
        logger.warn('Login attempt for non-existent user', { email });
        return {
          success: false,
          error: 'Invalid email or password',
          errorCode: 'INVALID_CREDENTIALS',
        };
      }

      // Check account status
      if (user.status !== 'ACTIVE') {
        logger.warn('Login attempt for inactive account', { email, status: user.status });
        return {
          success: false,
          error: 'Account is not active',
          errorCode: 'ACCOUNT_INACTIVE',
        };
      }

      // Check if account is locked
      if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
        logger.warn('Login attempt for locked account', { email });
        return {
          success: false,
          error: 'Account is temporarily locked. Please try again later.',
          errorCode: 'ACCOUNT_LOCKED',
        };
      }

      // Verify password
      const isValidPassword = await this.passwordService.verify(user.passwordHash, password);

      if (!isValidPassword) {
        // Increment failed login attempts
        const newAttempts = user.failedLoginAttempts + 1;
        const lockUntil = newAttempts >= 5
          ? new Date(Date.now() + 15 * 60 * 1000) // Lock for 15 minutes
          : null;

        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: newAttempts,
            accountLockedUntil: lockUntil,
          },
        });

        logger.warn('Failed login attempt', { email, attempts: newAttempts });
        return {
          success: false,
          error: 'Invalid email or password',
          errorCode: 'INVALID_CREDENTIALS',
        };
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
      const permissions = getPermissionsForRole(user.role);
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

      // Update internal state
      this.currentUser = this.toUser(user);
      this.tokens = {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
        tokenType: 'Bearer',
      };

      this.notifyAuthStateChange();

      logger.info('User logged in successfully', { userId: user.id, email });

      return {
        success: true,
        user: this.currentUser,
        tokens: this.tokens,
      };
    } catch (error) {
      logger.error('Login error', { error });
      return {
        success: false,
        error: 'An error occurred during login',
        errorCode: 'LOGIN_ERROR',
      };
    }
  }

  async logout(): Promise<void> {
    try {
      if (this.currentUser && this.tokens) {
        await prisma.userSession.deleteMany({
          where: {
            userId: this.currentUser.id,
            sessionToken: this.tokens.refreshToken?.split('.')[2],
          },
        });
      }
    } catch (error) {
      logger.warn('Logout session cleanup failed', { error });
    } finally {
      this.currentUser = null;
      this.tokens = null;
      this.notifyAuthStateChange();
      logger.info('User logged out');
    }
  }

  async register(data: RegisterData): Promise<AuthResult> {
    const { email, password, firstName, lastName } = data;

    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (existingUser) {
        logger.warn('Registration attempt with existing email', { email });
        return {
          success: false,
          error: 'An account with this email already exists',
          errorCode: 'EMAIL_EXISTS',
        };
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
          role: 'USER',
          status: 'ACTIVE',
          emailVerified: false,
          emailVerificationToken,
          emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
          preferences: {},
        },
      });

      // Generate tokens
      const permissions = getPermissionsForRole(user.role);
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

      // Update internal state
      this.currentUser = this.toUser(user);
      this.tokens = {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
        tokenType: 'Bearer',
      };

      this.notifyAuthStateChange();

      logger.info('User registered successfully', { userId: user.id, email });

      // Send verification email (non-blocking)
      emailService.sendVerificationEmail({
        email: user.email,
        firstName: user.firstName || undefined,
        emailVerificationToken,
      }).catch((error: any) => {
        logger.error('Failed to send verification email', { userId: user.id, error });
      });

      return {
        success: true,
        user: this.currentUser,
        tokens: this.tokens,
      };
    } catch (error) {
      logger.error('Registration error', { error });
      return {
        success: false,
        error: 'An error occurred during registration',
        errorCode: 'REGISTRATION_ERROR',
      };
    }
  }

  async refreshToken(): Promise<AuthTokens | null> {
    if (!this.tokens?.refreshToken) {
      return null;
    }

    try {
      const payload = await jwtService.verifyToken(this.tokens.refreshToken);

      if (!payload || payload.type !== 'refresh') {
        return null;
      }

      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || user.status !== 'ACTIVE') {
        return null;
      }

      const permissions = getPermissionsForRole(user.role);
      const result = await jwtService.refreshAccessToken(this.tokens.refreshToken, permissions);

      if (!result) {
        return null;
      }

      this.tokens = {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresIn: result.expiresIn,
        tokenType: 'Bearer',
      };

      // Update session
      await prisma.userSession.updateMany({
        where: {
          userId: user.id,
          sessionToken: this.tokens.refreshToken.split('.')[2],
        },
        data: {
          lastUsedAt: new Date(),
        },
      });

      logger.info('Tokens refreshed successfully', { userId: user.id });

      return this.tokens;
    } catch (error) {
      logger.error('Token refresh error', { error });
      return null;
    }
  }

  async verifyToken(token: string): Promise<User | null> {
    try {
      const payload = await jwtService.verifyToken(token);

      if (!payload) {
        return null;
      }

      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || user.status !== 'ACTIVE') {
        return null;
      }

      return this.toUser(user);
    } catch (error) {
      logger.error('Token verification error', { error });
      return null;
    }
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    if (!this.currentUser) {
      throw new Error('User not authenticated');
    }

    const user = await prisma.user.findUnique({
      where: { id: this.currentUser.id },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const isValid = await this.passwordService.verify(user.passwordHash, currentPassword);

    if (!isValid) {
      throw new Error('Current password is incorrect');
    }

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
      where: { id: user.id },
      data: { passwordHash: newPasswordHash },
    });

    // Invalidate all sessions
    await prisma.userSession.deleteMany({
      where: { userId: user.id },
    });

    // Send notification (non-blocking)
    emailService.sendPasswordChangedEmail({
      email: user.email,
      firstName: user.firstName || undefined,
    }).catch((error: any) => {
      logger.error('Failed to send password changed email', { userId: user.id, error });
    });

    logger.info('Password changed successfully', { userId: user.id });
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // Don't reveal if user exists
      logger.info('Password reset requested for non-existent email', { email });
      return;
    }

    const resetToken = this.generateSecureToken();

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpires: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: resetToken,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    // Send email (non-blocking)
    emailService.sendPasswordResetEmail(
      {
        email: user.email,
        firstName: user.firstName || undefined,
      },
      resetToken
    ).catch((error: any) => {
      logger.error('Failed to send password reset email', { userId: user.id, error });
    });

    logger.info('Password reset requested', { userId: user.id });
  }

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

    const passwordHash = await this.passwordService.hash(newPassword);

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

    await prisma.passwordResetToken.updateMany({
      where: { token },
      data: { used: true, usedAt: new Date() },
    });

    await prisma.userSession.deleteMany({
      where: { userId: user.id },
    });

    // Send notification (non-blocking)
    emailService.sendPasswordChangedEmail({
      email: user.email,
      firstName: user.firstName || undefined,
    }).catch((error: any) => {
      logger.error('Failed to send password changed email after reset', { userId: user.id, error });
    });

    logger.info('Password reset successfully', { userId: user.id });
  }

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

    // Send welcome email (non-blocking)
    emailService.sendWelcomeEmail({
      email: user.email,
      firstName: user.firstName || undefined,
    }).catch((error: any) => {
      logger.error('Failed to send welcome email', { userId: user.id, error });
    });

    if (this.currentUser && this.currentUser.id === user.id) {
      this.currentUser.emailVerified = true;
      this.notifyAuthStateChange();
    }

    logger.info('Email verified successfully', { userId: user.id });
  }

  async resendVerificationEmail(): Promise<void> {
    if (!this.currentUser) {
      throw new Error('User not authenticated');
    }

    const user = await prisma.user.findUnique({
      where: { id: this.currentUser.id },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.emailVerified) {
      throw new Error('Email is already verified');
    }

    const emailVerificationToken = this.generateSecureToken();

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken,
        emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    await emailService.sendVerificationEmail({
      email: user.email,
      firstName: user.firstName || undefined,
      emailVerificationToken,
    });

    logger.info('Verification email resent', { userId: user.id });
  }

  private toUser(dbUser: any): User {
    return {
      id: dbUser.id,
      email: dbUser.email,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      displayName: [dbUser.firstName, dbUser.lastName].filter(Boolean).join(' ') || dbUser.email,
      role: dbUser.role.toLowerCase() as 'admin' | 'user' | 'viewer',
      status: dbUser.status.toLowerCase() as 'active' | 'inactive' | 'suspended',
      permissions: getPermissionsForRole(dbUser.role),
      emailVerified: dbUser.emailVerified,
      lastLoginAt: dbUser.lastLoginAt,
    };
  }

  private generateSecureToken(): string {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  }
}
