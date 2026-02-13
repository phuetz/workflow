/**
 * Credential Factory
 * Generate test credentials
 */

import { PrismaClient, Credential, CredentialType } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

export interface CredentialFactoryOptions {
  name?: string;
  type?: CredentialType;
  data?: Record<string, unknown>;
  userId?: string;
  teamId?: string;
}

export class CredentialFactory {
  private static counter = 0;

  static async create(userId: string, options: CredentialFactoryOptions = {}): Promise<Credential> {
    CredentialFactory.counter++;

    const credential = await prisma.credential.create({
      data: {
        name: options.name || `Test Credential ${CredentialFactory.counter}`,
        type: options.type || CredentialType.API_KEY,
        data: options.data || CredentialFactory.getDefaultCredentialData(options.type),
        userId,
        teamId: options.teamId
      }
    });

    return credential;
  }

  static async createMany(userId: string, count: number, options: CredentialFactoryOptions = {}): Promise<Credential[]> {
    const credentials: Credential[] = [];
    for (let i = 0; i < count; i++) {
      credentials.push(await CredentialFactory.create(userId, options));
    }
    return credentials;
  }

  static async createApiKey(userId: string, options: CredentialFactoryOptions = {}): Promise<Credential> {
    return CredentialFactory.create(userId, {
      ...options,
      type: CredentialType.API_KEY,
      data: {
        apiKey: CredentialFactory.generateApiKey(),
        ...(options.data || {})
      }
    });
  }

  static async createOAuth2(userId: string, options: CredentialFactoryOptions = {}): Promise<Credential> {
    return CredentialFactory.create(userId, {
      ...options,
      type: CredentialType.OAUTH2,
      data: {
        clientId: `test-client-${Date.now()}`,
        clientSecret: CredentialFactory.generateSecret(),
        accessToken: CredentialFactory.generateToken(),
        refreshToken: CredentialFactory.generateToken(),
        expiresAt: new Date(Date.now() + 3600000),
        ...(options.data || {})
      }
    });
  }

  static async createBasicAuth(userId: string, options: CredentialFactoryOptions = {}): Promise<Credential> {
    return CredentialFactory.create(userId, {
      ...options,
      type: CredentialType.BASIC_AUTH,
      data: {
        username: 'testuser',
        password: 'testpassword',
        ...(options.data || {})
      }
    });
  }

  static async createHeaderAuth(userId: string, options: CredentialFactoryOptions = {}): Promise<Credential> {
    return CredentialFactory.create(userId, {
      ...options,
      type: CredentialType.HEADER_AUTH,
      data: {
        headerName: 'Authorization',
        headerValue: `Bearer ${CredentialFactory.generateToken()}`,
        ...(options.data || {})
      }
    });
  }

  private static getDefaultCredentialData(type?: CredentialType): Record<string, unknown> {
    switch (type) {
      case CredentialType.OAUTH2:
        return {
          clientId: `test-client-${Date.now()}`,
          clientSecret: CredentialFactory.generateSecret(),
          accessToken: CredentialFactory.generateToken(),
          refreshToken: CredentialFactory.generateToken(),
          expiresAt: new Date(Date.now() + 3600000)
        };
      case CredentialType.BASIC_AUTH:
        return {
          username: 'testuser',
          password: 'testpassword'
        };
      case CredentialType.HEADER_AUTH:
        return {
          headerName: 'Authorization',
          headerValue: `Bearer ${CredentialFactory.generateToken()}`
        };
      case CredentialType.API_KEY:
      default:
        return {
          apiKey: CredentialFactory.generateApiKey()
        };
    }
  }

  private static generateApiKey(): string {
    return `sk_test_${crypto.randomBytes(32).toString('hex')}`;
  }

  private static generateToken(): string {
    return crypto.randomBytes(32).toString('base64');
  }

  private static generateSecret(): string {
    return crypto.randomBytes(48).toString('hex');
  }

  static resetCounter(): void {
    CredentialFactory.counter = 0;
  }
}
