/**
 * Password History Manager
 *
 * Enforces password history policies to prevent password reuse
 * Features:
 * - Configurable history size (default: 24 passwords)
 * - Prevents reuse of recent passwords
 * - Automatic cleanup of old history
 * - Password age tracking
 * - Compliant with NIST, PCI DSS, and SOC 2 requirements
 */

import { PrismaClient } from '@prisma/client';
import { getPasswordHashingService } from './PasswordHashingService';

export interface PasswordHistoryEntry {
  id: string;
  userId: string;
  passwordHash: string;
  createdAt: Date;
}

export interface PasswordHistoryPolicy {
  historySize: number;          // Number of passwords to remember (default: 24)
  minimumAge: number;            // Minimum hours before password can be changed (default: 1)
  maximumAge: number;            // Maximum days before password must be changed (default: 90)
  enforceHistory: boolean;       // Whether to enforce history (default: true)
}

export interface PasswordReuseCheckResult {
  canUse: boolean;
  reason?: string;
  matchedPasswordAge?: string;  // How old the matching password is
  suggestedAction?: string;
}

export class PasswordHistoryManager {
  private static instance: PasswordHistoryManager;
  private prisma: PrismaClient;
  private hashingService = getPasswordHashingService();

  // Default policy following PCI DSS and NIST guidelines
  private readonly defaultPolicy: PasswordHistoryPolicy = {
    historySize: 24,        // Remember last 24 passwords
    minimumAge: 1,          // 1 hour minimum
    maximumAge: 90,         // 90 days maximum
    enforceHistory: true
  };

  private constructor() {
    this.prisma = new PrismaClient();
  }

  public static getInstance(): PasswordHistoryManager {
    if (!PasswordHistoryManager.instance) {
      PasswordHistoryManager.instance = new PasswordHistoryManager();
    }
    return PasswordHistoryManager.instance;
  }

  /**
   * Check if password can be used (not in recent history)
   */
  public async canUsePassword(
    userId: string,
    newPassword: string,
    policy?: Partial<PasswordHistoryPolicy>
  ): Promise<PasswordReuseCheckResult> {
    const finalPolicy = { ...this.defaultPolicy, ...policy };

    if (!finalPolicy.enforceHistory) {
      return { canUse: true };
    }

    try {
      // Get password history for user
      const history = await this.getPasswordHistory(userId, finalPolicy.historySize);

      // Check against each historical password
      for (const entry of history) {
        const matches = await this.hashingService.verify(entry.passwordHash, newPassword);

        if (matches) {
          const age = this.getPasswordAge(entry.createdAt);

          return {
            canUse: false,
            reason: `This password was used ${age} ago. Please choose a different password.`,
            matchedPasswordAge: age,
            suggestedAction: `You cannot reuse your last ${finalPolicy.historySize} passwords. Choose a unique password that you haven't used recently.`
          };
        }
      }

      return { canUse: true };

    } catch (error) {
      console.error('Failed to check password history:', error);
      // Fail open - allow password change but log error
      return {
        canUse: true,
        reason: 'Unable to verify password history'
      };
    }
  }

  /**
   * Add password to user's history
   */
  public async addToHistory(userId: string, passwordHash: string): Promise<void> {
    try {
      // Add new password to history
      await this.prisma.passwordHistory.create({
        data: {
          userId,
          passwordHash,
          createdAt: new Date()
        }
      });

      // Clean up old history (keep only configured number of passwords)
      await this.cleanupHistory(userId, this.defaultPolicy.historySize);

    } catch (error) {
      console.error('Failed to add password to history:', error);
      throw error;
    }
  }

  /**
   * Get password history for a user
   */
  public async getPasswordHistory(
    userId: string,
    limit: number = 24
  ): Promise<PasswordHistoryEntry[]> {
    try {
      const history = await this.prisma.passwordHistory.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit
      });

      return history;

    } catch (error) {
      console.error('Failed to get password history:', error);
      return [];
    }
  }

  /**
   * Check if password change is allowed based on minimum age
   */
  public async canChangePassword(
    userId: string,
    minimumAgeHours?: number
  ): Promise<{ allowed: boolean; reason?: string; nextAllowedChange?: Date }> {
    const minAge = minimumAgeHours ?? this.defaultPolicy.minimumAge;

    try {
      // Get most recent password change
      const lastChange = await this.prisma.passwordHistory.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      });

      if (!lastChange) {
        return { allowed: true };
      }

      const hoursSinceChange = this.getHoursSince(lastChange.createdAt);

      if (hoursSinceChange < minAge) {
        const nextAllowed = new Date(lastChange.createdAt.getTime() + minAge * 60 * 60 * 1000);

        return {
          allowed: false,
          reason: `Password was changed ${this.getPasswordAge(lastChange.createdAt)} ago. Minimum time between changes is ${minAge} hour(s).`,
          nextAllowedChange: nextAllowed
        };
      }

      return { allowed: true };

    } catch (error) {
      console.error('Failed to check password age:', error);
      return { allowed: true }; // Fail open
    }
  }

  /**
   * Check if password has expired
   */
  public async isPasswordExpired(
    userId: string,
    maximumAgeDays?: number
  ): Promise<{ expired: boolean; age?: string; expiresAt?: Date }> {
    const maxAge = maximumAgeDays ?? this.defaultPolicy.maximumAge;

    try {
      const lastChange = await this.prisma.passwordHistory.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      });

      if (!lastChange) {
        return { expired: false };
      }

      const daysSinceChange = this.getDaysSince(lastChange.createdAt);
      const expiresAt = new Date(lastChange.createdAt.getTime() + maxAge * 24 * 60 * 60 * 1000);

      if (daysSinceChange > maxAge) {
        return {
          expired: true,
          age: this.getPasswordAge(lastChange.createdAt),
          expiresAt
        };
      }

      return {
        expired: false,
        age: this.getPasswordAge(lastChange.createdAt),
        expiresAt
      };

    } catch (error) {
      console.error('Failed to check password expiration:', error);
      return { expired: false };
    }
  }

  /**
   * Get password statistics for a user
   */
  public async getPasswordStats(userId: string): Promise<{
    totalChanges: number;
    lastChanged: Date | null;
    passwordAge: string | null;
    daysUntilExpiry: number | null;
    changesThisYear: number;
  }> {
    try {
      const history = await this.prisma.passwordHistory.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      });

      const lastChange = history[0];
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      const changesThisYear = history.filter(
        h => h.createdAt >= oneYearAgo
      ).length;

      let daysUntilExpiry: number | null = null;
      if (lastChange) {
        const expiryDate = new Date(
          lastChange.createdAt.getTime() + this.defaultPolicy.maximumAge * 24 * 60 * 60 * 1000
        );
        daysUntilExpiry = Math.ceil((expiryDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
      }

      return {
        totalChanges: history.length,
        lastChanged: lastChange?.createdAt || null,
        passwordAge: lastChange ? this.getPasswordAge(lastChange.createdAt) : null,
        daysUntilExpiry,
        changesThisYear
      };

    } catch (error) {
      console.error('Failed to get password stats:', error);
      return {
        totalChanges: 0,
        lastChanged: null,
        passwordAge: null,
        daysUntilExpiry: null,
        changesThisYear: 0
      };
    }
  }

  /**
   * Clean up old password history entries
   */
  private async cleanupHistory(userId: string, keepCount: number): Promise<void> {
    try {
      // Get all history entries for user
      const allHistory = await this.prisma.passwordHistory.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      });

      // If we have more than keepCount, delete the oldest ones
      if (allHistory.length > keepCount) {
        const toDelete = allHistory.slice(keepCount);
        const idsToDelete = toDelete.map(h => h.id);

        await this.prisma.passwordHistory.deleteMany({
          where: {
            id: { in: idsToDelete }
          }
        });
      }

    } catch (error) {
      console.error('Failed to cleanup password history:', error);
    }
  }

  /**
   * Delete all password history for a user
   */
  public async deleteUserHistory(userId: string): Promise<void> {
    try {
      await this.prisma.passwordHistory.deleteMany({
        where: { userId }
      });
    } catch (error) {
      console.error('Failed to delete user history:', error);
      throw error;
    }
  }

  /**
   * Get password age as human-readable string
   */
  private getPasswordAge(date: Date): string {
    const hours = this.getHoursSince(date);

    if (hours < 1) {
      const minutes = Math.floor((Date.now() - date.getTime()) / (1000 * 60));
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }

    if (hours < 24) {
      return `${Math.floor(hours)} hour${Math.floor(hours) !== 1 ? 's' : ''}`;
    }

    const days = Math.floor(hours / 24);
    if (days < 30) {
      return `${days} day${days !== 1 ? 's' : ''}`;
    }

    const months = Math.floor(days / 30);
    if (months < 12) {
      return `${months} month${months !== 1 ? 's' : ''}`;
    }

    const years = Math.floor(months / 12);
    return `${years} year${years !== 1 ? 's' : ''}`;
  }

  /**
   * Get hours since a date
   */
  private getHoursSince(date: Date): number {
    return (Date.now() - date.getTime()) / (1000 * 60 * 60);
  }

  /**
   * Get days since a date
   */
  private getDaysSince(date: Date): number {
    return (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
  }

  /**
   * Update policy (for testing/configuration)
   */
  public setPolicy(policy: Partial<PasswordHistoryPolicy>): void {
    Object.assign(this.defaultPolicy, policy);
  }

  /**
   * Get current policy
   */
  public getPolicy(): PasswordHistoryPolicy {
    return { ...this.defaultPolicy };
  }
}

// Singleton export
export function getPasswordHistoryManager(): PasswordHistoryManager {
  return PasswordHistoryManager.getInstance();
}

export default getPasswordHistoryManager;
