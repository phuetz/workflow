/**
 * User Factory
 * Generate test users with realistic data
 */

import bcrypt from 'bcryptjs';
import { PrismaClient, User, Role } from '@prisma/client';

const prisma = new PrismaClient();

export interface UserFactoryOptions {
  email?: string;
  firstName?: string;
  lastName?: string;
  password?: string;
  role?: Role;
  emailVerified?: boolean;
  avatar?: string;
  settings?: Record<string, unknown>;
}

export class UserFactory {
  private static counter = 0;

  static async create(options: UserFactoryOptions = {}): Promise<User> {
    UserFactory.counter++;

    const defaultPassword = options.password || 'Password123!';
    const passwordHash = await bcrypt.hash(defaultPassword, 12);

    const user = await prisma.user.create({
      data: {
        email: options.email || `user${UserFactory.counter}@test.com`,
        firstName: options.firstName || `Test${UserFactory.counter}`,
        lastName: options.lastName || 'User',
        passwordHash,
        role: options.role || Role.USER,
        emailVerified: options.emailVerified ?? true,
        avatar: options.avatar,
        settings: options.settings || {}
      }
    });

    return user;
  }

  static async createMany(count: number, options: UserFactoryOptions = {}): Promise<User[]> {
    const users: User[] = [];
    for (let i = 0; i < count; i++) {
      users.push(await UserFactory.create(options));
    }
    return users;
  }

  static async createAdmin(options: Partial<UserFactoryOptions> = {}): Promise<User> {
    return UserFactory.create({
      ...options,
      role: Role.ADMIN,
      email: options.email || `admin${UserFactory.counter + 1}@test.com`
    });
  }

  static async createModerator(options: Partial<UserFactoryOptions> = {}): Promise<User> {
    return UserFactory.create({
      ...options,
      role: Role.MODERATOR,
      email: options.email || `moderator${UserFactory.counter + 1}@test.com`
    });
  }

  static async createViewer(options: Partial<UserFactoryOptions> = {}): Promise<User> {
    return UserFactory.create({
      ...options,
      role: Role.VIEWER,
      email: options.email || `viewer${UserFactory.counter + 1}@test.com`
    });
  }

  static resetCounter(): void {
    UserFactory.counter = 0;
  }
}
