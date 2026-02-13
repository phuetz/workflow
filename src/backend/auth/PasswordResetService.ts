/**
 * Secure Password Reset Service
 *
 * Implements secure password reset flow with:
 * - Cryptographically secure random tokens
 * - Token expiration (1 hour)
 * - Rate limiting per email/IP
 * - Email verification
 * - Password strength validation
 * - Breach checking
 * - History enforcement
 * - Audit logging
 *
 * Security features:
 * - Timing-safe comparison
 * - No user enumeration (same response for valid/invalid emails)
 * - Token invalidation after use
 * - IP-based rate limiting
 */

import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';
import { getPasswordHashingService } from './PasswordHashingService';
import { getPasswordStrengthValidator } from './PasswordStrengthValidator';
import { getPasswordBreachChecker } from './PasswordBreachChecker';
import { getPasswordHistoryManager } from './PasswordHistoryManager';
import { emailService } from '../services/emailService';

export interface ResetRequest {
  email: string;
  ipAddress?: string;
}

export interface ResetRequestResult {
  success: boolean;
  message: string;
  expiresAt?: Date;
  rateLimited?: boolean;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
  ipAddress?: string;
}

export interface ResetPasswordResult {
  success: boolean;
  message: string;
  errors?: string[];
}

export interface ResetToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  used: boolean;
}

export class PasswordResetService {
  private static instance: PasswordResetService;
  private prisma: PrismaClient;
  private hashingService = getPasswordHashingService();
  private strengthValidator = getPasswordStrengthValidator();
  private breachChecker = getPasswordBreachChecker();
  private historyManager = getPasswordHistoryManager();

  // Rate limiting configuration
  private readonly maxRequestsPerEmail = 3;      // Max 3 requests per email per hour
  private readonly maxRequestsPerIP = 10;        // Max 10 requests per IP per hour
  private readonly tokenExpiryMinutes = 60;       // Tokens expire after 1 hour
  private readonly tokenLength = 32;              // 32 bytes = 256 bits

  // In-memory rate limiting (in production, use Redis)
  private emailRateLimits: Map<string, { count: number; resetAt: Date }> = new Map();
  private ipRateLimits: Map<string, { count: number; resetAt: Date }> = new Map();

  private constructor() {
    this.prisma = new PrismaClient();
  }

  public static getInstance(): PasswordResetService {
    if (!PasswordResetService.instance) {
      PasswordResetService.instance = new PasswordResetService();
    }
    return PasswordResetService.instance;
  }

  /**
   * Request a password reset token
   */
  public async requestReset(request: ResetRequest): Promise<ResetRequestResult> {
    const { email, ipAddress } = request;

    try {
      // Check rate limits
      const emailLimited = this.checkEmailRateLimit(email);
      const ipLimited = ipAddress ? this.checkIPRateLimit(ipAddress) : false;

      if (emailLimited || ipLimited) {
        return {
          success: false,
          message: 'Too many password reset requests. Please try again later.',
          rateLimited: true
        };
      }

      // Find user by email
      const user = await this.prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });

      // SECURITY: Return same message whether user exists or not (prevent enumeration)
      const successMessage = 'If an account exists with that email, you will receive password reset instructions.';

      if (!user) {
        // Still track rate limit even for invalid emails
        this.trackEmailRequest(email);
        if (ipAddress) this.trackIPRequest(ipAddress);

        return {
          success: true,  // Return success to prevent enumeration
          message: successMessage
        };
      }

      // Generate secure reset token
      const token = this.generateSecureToken();
      const expiresAt = new Date(Date.now() + this.tokenExpiryMinutes * 60 * 1000);

      // Invalidate any existing reset tokens for this user
      await this.invalidateUserTokens(user.id);

      // Create new reset token
      await this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          token: await this.hashingService.hash(token), // Store hashed token
          expiresAt,
          used: false,
          ipAddress
        }
      });

      // Track rate limits
      this.trackEmailRequest(email);
      if (ipAddress) this.trackIPRequest(ipAddress);

      // Send email with reset link containing the plain token
      await emailService.sendPasswordResetEmail(
        {
          email: user.email,
          firstName: user.firstName || undefined
        },
        token
      );

      // Log the request
      await this.prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'PASSWORD_RESET_REQUESTED',
          resource: 'USER',
          resourceId: user.id,
          details: { email, ipAddress },
          ipAddress
        }
      });

      return {
        success: true,
        message: successMessage,
        expiresAt
      };

    } catch (error) {
      console.error('Password reset request failed:', error);
      return {
        success: false,
        message: 'Failed to process password reset request. Please try again later.'
      };
    }
  }

  /**
   * Reset password using token
   */
  public async resetPassword(request: ResetPasswordRequest): Promise<ResetPasswordResult> {
    const { token, newPassword, ipAddress } = request;

    try {
      // Validate token format
      if (!token || token.length !== this.tokenLength * 2) { // Hex encoded
        return {
          success: false,
          message: 'Invalid reset token.'
        };
      }

      // Find valid token
      const resetToken = await this.findValidToken(token);

      if (!resetToken) {
        return {
          success: false,
          message: 'Invalid or expired reset token.'
        };
      }

      // Get user
      const user = await this.prisma.user.findUnique({
        where: { id: resetToken.userId }
      });

      if (!user) {
        return {
          success: false,
          message: 'User not found.'
        };
      }

      // Validate new password strength
      const strengthResult = this.strengthValidator.validate(newPassword, {
        personalInfo: [user.email, user.firstName || '', user.lastName || '']
      });

      if (!strengthResult.isValid) {
        return {
          success: false,
          message: 'Password does not meet security requirements.',
          errors: strengthResult.feedback
        };
      }

      // Check if password has been breached
      const breachResult = await this.breachChecker.checkPassword(newPassword);

      if (breachResult.isBreached && breachResult.severity !== 'safe') {
        return {
          success: false,
          message: 'This password has been exposed in data breaches.',
          errors: [breachResult.recommendation]
        };
      }

      // Check password history
      const historyCheck = await this.historyManager.canUsePassword(user.id, newPassword);

      if (!historyCheck.canUse) {
        return {
          success: false,
          message: 'Cannot reuse recent passwords.',
          errors: [historyCheck.reason || 'This password was recently used.']
        };
      }

      // Hash new password
      const passwordHash = await this.hashingService.hash(newPassword);

      // Update user password
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          passwordResetToken: null,
          passwordResetExpires: null
        }
      });

      // Add to password history
      await this.historyManager.addToHistory(user.id, passwordHash);

      // Mark token as used
      await this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { used: true, usedAt: new Date() }
      });

      // Invalidate all other sessions (force re-login)
      await this.prisma.userSession.updateMany({
        where: { userId: user.id },
        data: { expiresAt: new Date() } // Expire immediately
      });

      // Log password reset
      await this.prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'PASSWORD_RESET_COMPLETED',
          resource: 'USER',
          resourceId: user.id,
          details: { ipAddress },
          ipAddress
        }
      });

      // Send email notification of password change
      await emailService.sendPasswordChangedEmail({
        email: user.email,
        firstName: user.firstName || undefined
      });

      return {
        success: true,
        message: 'Password has been reset successfully. Please log in with your new password.'
      };

    } catch (error) {
      console.error('Password reset failed:', error);
      return {
        success: false,
        message: 'Failed to reset password. Please try again or request a new reset link.'
      };
    }
  }

  /**
   * Verify if a reset token is valid
   */
  public async verifyToken(token: string): Promise<{ valid: boolean; expiresAt?: Date; userId?: string }> {
    try {
      const resetToken = await this.findValidToken(token);

      if (!resetToken) {
        return { valid: false };
      }

      return {
        valid: true,
        expiresAt: resetToken.expiresAt,
        userId: resetToken.userId
      };

    } catch (error) {
      return { valid: false };
    }
  }

  /**
   * Generate cryptographically secure random token
   */
  private generateSecureToken(): string {
    return crypto.randomBytes(this.tokenLength).toString('hex');
  }

  /**
   * Find and validate reset token
   */
  private async findValidToken(plainToken: string): Promise<ResetToken | null> {
    try {
      // Get all non-expired, unused tokens
      const tokens = await this.prisma.passwordResetToken.findMany({
        where: {
          expiresAt: { gt: new Date() },
          used: false
        }
      });

      // Check each token with timing-safe comparison
      for (const token of tokens) {
        const matches = await this.hashingService.verify(token.token, plainToken);

        if (matches) {
          return token;
        }
      }

      return null;

    } catch (error) {
      console.error('Token verification failed:', error);
      return null;
    }
  }

  /**
   * Invalidate all reset tokens for a user
   */
  private async invalidateUserTokens(userId: string): Promise<void> {
    await this.prisma.passwordResetToken.updateMany({
      where: { userId },
      data: { used: true }
    });
  }

  /**
   * Check email rate limit
   */
  private checkEmailRateLimit(email: string): boolean {
    const limit = this.emailRateLimits.get(email.toLowerCase());

    if (!limit) return false;

    if (new Date() > limit.resetAt) {
      this.emailRateLimits.delete(email.toLowerCase());
      return false;
    }

    return limit.count >= this.maxRequestsPerEmail;
  }

  /**
   * Check IP rate limit
   */
  private checkIPRateLimit(ip: string): boolean {
    const limit = this.ipRateLimits.get(ip);

    if (!limit) return false;

    if (new Date() > limit.resetAt) {
      this.ipRateLimits.delete(ip);
      return false;
    }

    return limit.count >= this.maxRequestsPerIP;
  }

  /**
   * Track email request for rate limiting
   */
  private trackEmailRequest(email: string): void {
    const key = email.toLowerCase();
    const limit = this.emailRateLimits.get(key);

    if (!limit || new Date() > limit.resetAt) {
      this.emailRateLimits.set(key, {
        count: 1,
        resetAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
      });
    } else {
      limit.count++;
    }
  }

  /**
   * Track IP request for rate limiting
   */
  private trackIPRequest(ip: string): void {
    const limit = this.ipRateLimits.get(ip);

    if (!limit || new Date() > limit.resetAt) {
      this.ipRateLimits.set(ip, {
        count: 1,
        resetAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
      });
    } else {
      limit.count++;
    }
  }

  /**
   * Clean up expired tokens
   */
  public async cleanupExpiredTokens(): Promise<number> {
    try {
      const result = await this.prisma.passwordResetToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: new Date() } },
            { used: true, createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } // Delete used tokens older than 24h
          ]
        }
      });

      return result.count;

    } catch (error) {
      console.error('Token cleanup failed:', error);
      return 0;
    }
  }

  /**
   * Get reset statistics (for monitoring)
   */
  public async getResetStats(since: Date): Promise<{
    totalRequests: number;
    successfulResets: number;
    failedResets: number;
    expiredTokens: number;
  }> {
    try {
      const requests = await this.prisma.auditLog.count({
        where: {
          action: 'PASSWORD_RESET_REQUESTED',
          timestamp: { gte: since }
        }
      });

      const completions = await this.prisma.auditLog.count({
        where: {
          action: 'PASSWORD_RESET_COMPLETED',
          timestamp: { gte: since }
        }
      });

      const expired = await this.prisma.passwordResetToken.count({
        where: {
          expiresAt: { lt: new Date() },
          used: false,
          createdAt: { gte: since }
        }
      });

      return {
        totalRequests: requests,
        successfulResets: completions,
        failedResets: requests - completions,
        expiredTokens: expired
      };

    } catch (error) {
      return {
        totalRequests: 0,
        successfulResets: 0,
        failedResets: 0,
        expiredTokens: 0
      };
    }
  }
}

// Singleton export
export function getPasswordResetService(): PasswordResetService {
  return PasswordResetService.getInstance();
}

export default getPasswordResetService;
