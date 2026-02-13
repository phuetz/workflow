/**
 * User Repository
 * Database operations for user management
 */

import crypto from 'crypto';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  firstName?: string;
  lastName?: string;
  role: 'admin' | 'user' | 'viewer';
  status: 'active' | 'inactive' | 'suspended';
  permissions: string[];
  emailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  lastLoginAt?: Date;
  failedLoginAttempts: number;
  lockedUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class UserRepository {
  // In-memory storage for demo - replace with real database
  private users: Map<string, User> = new Map();
  private emailIndex: Map<string, string> = new Map(); // email -> userId

  constructor() {
    // Initialize with demo admin user
    const adminUser: User = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'admin@workflowpro.com',
      passwordHash: '', // Will be set by auth service
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      status: 'active',
      permissions: [],
      emailVerified: true,
      failedLoginAttempts: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.users.set(adminUser.id, adminUser);
    this.emailIndex.set(adminUser.email.toLowerCase(), adminUser.id);
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    const userId = this.emailIndex.get(email.toLowerCase());
    if (!userId) return null;
    return this.users.get(userId) || null;
  }

  /**
   * Find user by email verification token
   */
  async findByEmailVerificationToken(token: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.emailVerificationToken === token && 
          user.emailVerificationExpires && 
          user.emailVerificationExpires > new Date()) {
        return user;
      }
    }
    return null;
  }

  /**
   * Find user by password reset token
   */
  async findByPasswordResetToken(token: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.passwordResetToken === token && 
          user.passwordResetExpires && 
          user.passwordResetExpires > new Date()) {
        return user;
      }
    }
    return null;
  }

  /**
   * Create new user
   */
  async create(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    // Check if email already exists
    if (await this.findByEmail(userData.email)) {
      throw new Error('Email already exists');
    }

    const user: User = {
      ...userData,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.users.set(user.id, user);
    this.emailIndex.set(user.email.toLowerCase(), user.id);

    return user;
  }

  /**
   * Update user
   */
  async update(id: string, updates: Partial<User>): Promise<User | null> {
    const user = this.users.get(id);
    if (!user) return null;

    // If email is being updated, check for duplicates
    if (updates.email && updates.email !== user.email) {
      const existingUser = await this.findByEmail(updates.email);
      if (existingUser) {
        throw new Error('Email already exists');
      }

      // Update email index
      this.emailIndex.delete(user.email.toLowerCase());
      this.emailIndex.set(updates.email.toLowerCase(), id);
    }

    const updatedUser: User = {
      ...user,
      ...updates,
      id: user.id, // Prevent ID change
      createdAt: user.createdAt, // Prevent creation date change
      updatedAt: new Date()
    };

    this.users.set(id, updatedUser);
    return updatedUser;
  }

  /**
   * Delete user
   */
  async delete(id: string): Promise<boolean> {
    const user = this.users.get(id);
    if (!user) return false;

    this.users.delete(id);
    this.emailIndex.delete(user.email.toLowerCase());
    return true;
  }

  /**
   * Get all users (with pagination)
   */
  async findAll(options?: {
    skip?: number;
    limit?: number;
    role?: string;
    status?: string;
  }): Promise<{ users: User[]; total: number }> {
    let users = Array.from(this.users.values());

    // Apply filters
    if (options?.role) {
      users = users.filter(u => u.role === options.role);
    }
    if (options?.status) {
      users = users.filter(u => u.status === options.status);
    }

    const total = users.length;
    const skip = options?.skip || 0;
    const limit = options?.limit || 100;

    // Apply pagination
    users = users.slice(skip, skip + limit);

    return { users, total };
  }

  /**
   * Record failed login attempt
   */
  async recordFailedLogin(userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (!user) return;

    user.failedLoginAttempts++;
    user.updatedAt = new Date();

    // Lock account after 5 failed attempts
    if (user.failedLoginAttempts >= 5) {
      user.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      user.status = 'suspended';
    }

    this.users.set(userId, user);
  }

  /**
   * Reset failed login attempts
   */
  async resetFailedLogins(userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (!user) return;

    user.failedLoginAttempts = 0;
    user.lockedUntil = undefined;
    if (user.status === 'suspended' && !user.lockedUntil) {
      user.status = 'active';
    }
    user.lastLoginAt = new Date();
    user.updatedAt = new Date();

    this.users.set(userId, user);
  }

  /**
   * Check if account is locked
   */
  async isAccountLocked(userId: string): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user) return false;

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return true;
    }

    // Unlock if lock period has expired
    if (user.lockedUntil && user.lockedUntil <= new Date()) {
      user.lockedUntil = undefined;
      user.failedLoginAttempts = 0;
      if (user.status === 'suspended') {
        user.status = 'active';
      }
      this.users.set(userId, user);
    }

    return false;
  }

  /**
   * Count users by criteria
   */
  async count(criteria?: {
    role?: string;
    status?: string;
    emailVerified?: boolean;
  }): Promise<number> {
    let count = 0;

    for (const user of this.users.values()) {
      if (criteria?.role && user.role !== criteria.role) continue;
      if (criteria?.status && user.status !== criteria.status) continue;
      if (criteria?.emailVerified !== undefined && user.emailVerified !== criteria.emailVerified) continue;
      count++;
    }

    return count;
  }

  /**
   * Search users
   */
  async search(query: string): Promise<User[]> {
    const results: User[] = [];
    const lowerQuery = query.toLowerCase();

    for (const user of this.users.values()) {
      if (
        user.email.toLowerCase().includes(lowerQuery) ||
        user.firstName?.toLowerCase().includes(lowerQuery) ||
        user.lastName?.toLowerCase().includes(lowerQuery)
      ) {
        results.push(user);
      }
    }

    return results;
  }

  private generateId(): string {
    if (crypto.randomUUID) {
      return crypto.randomUUID();
    }

    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

// Singleton instance
export const userRepository = new UserRepository();