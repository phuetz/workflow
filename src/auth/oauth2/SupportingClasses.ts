/**
 * OAuth2 Supporting Classes
 * Helper classes for token, session, consent, PKCE, and JWT management
 */

import * as crypto from 'crypto';
import type { OAuth2Session } from './types';

// ============================================================================
// TOKEN STORE
// ============================================================================

export class TokenStore {
  private tokens: Map<string, any> = new Map();

  async store(token: string, data: any): Promise<void> {
    this.tokens.set(token, data);
  }

  async retrieve(token: string): Promise<any> {
    return this.tokens.get(token);
  }

  async delete(token: string): Promise<void> {
    this.tokens.delete(token);
  }
}

// ============================================================================
// SESSION MANAGER
// ============================================================================

export class SessionManager {
  private sessions: Map<string, OAuth2Session> = new Map();

  async createSession(userId: string, clientId?: string): Promise<OAuth2Session> {
    const session: OAuth2Session = {
      id: crypto.randomBytes(32).toString('hex'),
      userId,
      clientId,
      authTime: new Date(),
      lastActivity: new Date()
    };

    this.sessions.set(session.id, session);
    return session;
  }

  async getSession(sessionId: string): Promise<OAuth2Session | undefined> {
    return this.sessions.get(sessionId);
  }

  async updateSession(sessionId: string, updates: Partial<OAuth2Session>): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      Object.assign(session, updates, { lastActivity: new Date() });
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }

  getSessionsMap(): Map<string, OAuth2Session> {
    return this.sessions;
  }
}

// ============================================================================
// CONSENT MANAGER
// ============================================================================

interface ConsentRecord {
  userId: string;
  clientId: string;
  scopes: string[];
  grantedAt: Date;
  expiresAt?: Date;
  revokedAt?: Date;
}

export class ConsentManager {
  private consents: Map<string, ConsentRecord[]> = new Map();

  async checkConsent(userId: string, clientId: string, scopes: string[]): Promise<boolean> {
    const userConsents = this.consents.get(userId) || [];
    const consent = userConsents.find(c => c.clientId === clientId);

    if (!consent) return false;
    if (consent.revokedAt) return false;
    if (consent.expiresAt && consent.expiresAt < new Date()) return false;

    return scopes.every(scope => consent.scopes.includes(scope));
  }

  async grantConsent(userId: string, clientId: string, scopes: string[]): Promise<void> {
    const userConsents = this.consents.get(userId) || [];

    const consent: ConsentRecord = {
      userId,
      clientId,
      scopes,
      grantedAt: new Date()
    };

    const existingIndex = userConsents.findIndex(c => c.clientId === clientId);
    if (existingIndex >= 0) {
      userConsents[existingIndex] = consent;
    } else {
      userConsents.push(consent);
    }

    this.consents.set(userId, userConsents);
  }

  async revokeConsent(userId: string, clientId: string): Promise<void> {
    const userConsents = this.consents.get(userId) || [];
    const consent = userConsents.find(c => c.clientId === clientId);

    if (consent) {
      consent.revokedAt = new Date();
    }
  }
}

// ============================================================================
// PKCE VALIDATOR
// ============================================================================

export class PKCEValidator {
  validate(verifier: string, challenge: string, method: 'plain' | 'S256'): boolean {
    if (method === 'plain') {
      return verifier === challenge;
    }

    // S256 method
    const hash = crypto.createHash('sha256').update(verifier).digest('base64url');
    return hash === challenge;
  }
}

// ============================================================================
// JWT SERVICE
// ============================================================================

export class JWTService {
  constructor(private signingKey: string) {}

  sign(payload: any): string {
    const header = { alg: 'HS256', typ: 'JWT' };
    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');

    const signature = crypto
      .createHmac('sha256', this.signingKey)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64url');

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  verify(token: string): any {
    const [encodedHeader, encodedPayload, signature] = token.split('.');

    const expectedSignature = crypto
      .createHmac('sha256', this.signingKey)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64url');

    if (signature !== expectedSignature) {
      throw new Error('Invalid signature');
    }

    return JSON.parse(Buffer.from(encodedPayload, 'base64url').toString());
  }
}
