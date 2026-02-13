/**
 * User Repository - Prisma Implementation
 * Handles all user-related database operations
 */

import { User, Role, UserStatus, Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { logger } from '../../../services/SimpleLogger';

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  firstName?: string;
  lastName?: string;
  role?: Role;
  emailVerified?: boolean;
  timezone?: string;
  language?: string;
  preferences?: Prisma.InputJsonValue;
}

export interface UpdateUserInput {
  email?: string;
  passwordHash?: string;
  firstName?: string;
  lastName?: string;
  role?: Role;
  status?: UserStatus;
  emailVerified?: boolean;
  emailVerificationToken?: string | null;
  emailVerificationExpires?: Date | null;
  passwordResetToken?: string | null;
  passwordResetExpires?: Date | null;
  lastLoginAt?: Date;
  failedLoginAttempts?: number;
  accountLockedUntil?: Date | null;
  twoFactorEnabled?: boolean;
  twoFactorSecret?: string | null;
  backupCodes?: string[];
  profilePicture?: string | null;
  timezone?: string;
  language?: string;
  preferences?: Prisma.InputJsonValue;
}

export interface UserFilter {
  role?: Role;
  status?: UserStatus;
  emailVerified?: boolean;
  search?: string;
}

export class UserRepository {
  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    try {
      return await prisma.user.findUnique({
        where: { id },
      });
    } catch (error) {
      logger.error('Error finding user by ID:', error);
      throw error;
    }
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    try {
      return await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });
    } catch (error) {
      logger.error('Error finding user by email:', error);
      throw error;
    }
  }

  /**
   * Find user by email verification token
   */
  async findByEmailVerificationToken(token: string): Promise<User | null> {
    try {
      return await prisma.user.findFirst({
        where: {
          emailVerificationToken: token,
          emailVerificationExpires: {
            gt: new Date(),
          },
        },
      });
    } catch (error) {
      logger.error('Error finding user by verification token:', error);
      throw error;
    }
  }

  /**
   * Find user by password reset token
   */
  async findByPasswordResetToken(token: string): Promise<User | null> {
    try {
      return await prisma.user.findFirst({
        where: {
          passwordResetToken: token,
          passwordResetExpires: {
            gt: new Date(),
          },
        },
      });
    } catch (error) {
      logger.error('Error finding user by reset token:', error);
      throw error;
    }
  }

  /**
   * Create new user
   */
  async create(data: CreateUserInput): Promise<User> {
    try {
      return await prisma.user.create({
        data: {
          email: data.email.toLowerCase(),
          passwordHash: data.passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          role: data.role || Role.USER,
          emailVerified: data.emailVerified || false,
          timezone: data.timezone || 'UTC',
          language: data.language || 'en',
          preferences: data.preferences || {},
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new Error('Email already exists');
        }
      }
      logger.error('Error creating user:', error);
      throw error;
    }
  }

  /**
   * Update user
   */
  async update(id: string, data: UpdateUserInput): Promise<User> {
    try {
      // If email is being updated, normalize it
      if (data.email) {
        data.email = data.email.toLowerCase();
      }

      return await prisma.user.update({
        where: { id },
        data,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new Error('Email already exists');
        }
        if (error.code === 'P2025') {
          throw new Error('User not found');
        }
      }
      logger.error('Error updating user:', error);
      throw error;
    }
  }

  /**
   * Delete user
   */
  async delete(id: string): Promise<boolean> {
    try {
      await prisma.user.delete({
        where: { id },
      });
      return true;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          return false;
        }
      }
      logger.error('Error deleting user:', error);
      throw error;
    }
  }

  /**
   * Find all users with filters and pagination
   */
  async findAll(options?: {
    skip?: number;
    limit?: number;
    filter?: UserFilter;
    orderBy?: Prisma.UserOrderByWithRelationInput;
  }): Promise<{ users: User[]; total: number }> {
    try {
      const where: Prisma.UserWhereInput = {};

      if (options?.filter) {
        if (options.filter.role) {
          where.role = options.filter.role;
        }
        if (options.filter.status) {
          where.status = options.filter.status;
        }
        if (options.filter.emailVerified !== undefined) {
          where.emailVerified = options.filter.emailVerified;
        }
        if (options.filter.search) {
          where.OR = [
            { email: { contains: options.filter.search, mode: 'insensitive' } },
            { firstName: { contains: options.filter.search, mode: 'insensitive' } },
            { lastName: { contains: options.filter.search, mode: 'insensitive' } },
          ];
        }
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip: options?.skip || 0,
          take: options?.limit || 100,
          orderBy: options?.orderBy || { createdAt: 'desc' },
        }),
        prisma.user.count({ where }),
      ]);

      return { users, total };
    } catch (error) {
      logger.error('Error finding users:', error);
      throw error;
    }
  }

  /**
   * Record failed login attempt
   */
  async recordFailedLogin(userId: string): Promise<void> {
    try {
      const user = await this.findById(userId);
      if (!user) return;

      const failedAttempts = user.failedLoginAttempts + 1;
      const updates: UpdateUserInput = {
        failedLoginAttempts: failedAttempts,
      };

      // Lock account after 5 failed attempts
      if (failedAttempts >= 5) {
        updates.accountLockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
        updates.status = UserStatus.SUSPENDED;
      }

      await this.update(userId, updates);
    } catch (error) {
      logger.error('Error recording failed login:', error);
      throw error;
    }
  }

  /**
   * Reset failed login attempts
   */
  async resetFailedLogins(userId: string): Promise<void> {
    try {
      await this.update(userId, {
        failedLoginAttempts: 0,
        accountLockedUntil: null,
        lastLoginAt: new Date(),
      });
    } catch (error) {
      logger.error('Error resetting failed logins:', error);
      throw error;
    }
  }

  /**
   * Check if account is locked
   */
  async isAccountLocked(userId: string): Promise<boolean> {
    try {
      const user = await this.findById(userId);
      if (!user) return false;

      if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
        return true;
      }

      // Auto-unlock if lock period expired
      if (user.accountLockedUntil && user.accountLockedUntil <= new Date()) {
        await this.update(userId, {
          accountLockedUntil: null,
          failedLoginAttempts: 0,
          status: UserStatus.ACTIVE,
        });
      }

      return false;
    } catch (error) {
      logger.error('Error checking account lock:', error);
      throw error;
    }
  }

  /**
   * Count users by criteria
   */
  async count(filter?: UserFilter): Promise<number> {
    try {
      const where: Prisma.UserWhereInput = {};

      if (filter) {
        if (filter.role) where.role = filter.role;
        if (filter.status) where.status = filter.status;
        if (filter.emailVerified !== undefined) where.emailVerified = filter.emailVerified;
      }

      return await prisma.user.count({ where });
    } catch (error) {
      logger.error('Error counting users:', error);
      throw error;
    }
  }

  /**
   * Search users
   */
  async search(query: string, limit: number = 50): Promise<User[]> {
    try {
      return await prisma.user.findMany({
        where: {
          OR: [
            { email: { contains: query, mode: 'insensitive' } },
            { firstName: { contains: query, mode: 'insensitive' } },
            { lastName: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: limit,
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      logger.error('Error searching users:', error);
      throw error;
    }
  }

  /**
   * Get user with relations
   */
  async findByIdWithRelations(userId: string) {
    try {
      return await prisma.user.findUnique({
        where: { id: userId },
        include: {
          workflows: {
            where: { status: { not: 'ARCHIVED' } },
            orderBy: { updatedAt: 'desc' },
            take: 10,
          },
          credentials: {
            where: { isActive: true },
            select: {
              id: true,
              name: true,
              type: true,
              description: true,
              createdAt: true,
              lastUsedAt: true,
            },
          },
          teams: {
            include: {
              team: true,
            },
          },
          apiKeys: {
            where: { isActive: true },
            select: {
              id: true,
              name: true,
              permissions: true,
              lastUsedAt: true,
              expiresAt: true,
            },
          },
        },
      });
    } catch (error) {
      logger.error('Error finding user with relations:', error);
      throw error;
    }
  }

  /**
   * Batch create users (for seeding/importing)
   */
  async batchCreate(users: CreateUserInput[]): Promise<number> {
    try {
      const result = await prisma.user.createMany({
        data: users.map(user => ({
          email: user.email.toLowerCase(),
          passwordHash: user.passwordHash,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role || Role.USER,
          emailVerified: user.emailVerified || false,
          timezone: user.timezone || 'UTC',
          language: user.language || 'en',
          preferences: user.preferences || {},
        })),
        skipDuplicates: true,
      });

      return result.count;
    } catch (error) {
      logger.error('Error batch creating users:', error);
      throw error;
    }
  }

  /**
   * Get user statistics
   */
  async getStatistics() {
    try {
      const [total, active, inactive, suspended, admins, verified] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { status: UserStatus.ACTIVE } }),
        prisma.user.count({ where: { status: UserStatus.INACTIVE } }),
        prisma.user.count({ where: { status: UserStatus.SUSPENDED } }),
        prisma.user.count({ where: { role: Role.ADMIN } }),
        prisma.user.count({ where: { emailVerified: true } }),
      ]);

      return {
        total,
        active,
        inactive,
        suspended,
        admins,
        verified,
        unverified: total - verified,
      };
    } catch (error) {
      logger.error('Error getting user statistics:', error);
      throw error;
    }
  }
}

// Singleton instance
export const userRepository = new UserRepository();
export default userRepository;
