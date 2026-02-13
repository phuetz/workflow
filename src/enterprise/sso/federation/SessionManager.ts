/**
 * SessionManager - Manages federated sessions
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import {
  FederatedSession,
  FederatedIdentity,
} from './types';

export interface SessionManagerConfig {
  defaultSessionDuration: number;
  maxSessionDuration: number;
}

export class SessionManager extends EventEmitter {
  private sessions: Map<string, FederatedSession> = new Map();
  private config: SessionManagerConfig;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: SessionManagerConfig) {
    super();
    this.config = config;
  }

  /**
   * Start session cleanup interval
   */
  startCleanup(intervalMs: number = 60000): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cleanupInterval = setInterval(
      () => this.cleanupExpiredSessions(),
      intervalMs
    );
  }

  /**
   * Stop session cleanup interval
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Manage federated session
   */
  async manageFederatedSession(
    userId: string,
    federatedIdentityId: string,
    action: 'create' | 'refresh' | 'terminate',
    sessionData?: Partial<FederatedSession>,
    identity?: FederatedIdentity
  ): Promise<FederatedSession | null> {
    switch (action) {
      case 'create':
        return this.createFederatedSession(userId, federatedIdentityId, sessionData, identity);
      case 'refresh':
        return this.refreshFederatedSession(sessionData?.id || '');
      case 'terminate':
        await this.terminateFederatedSession(sessionData?.id || '');
        return null;
      default:
        throw new Error(`Unknown session action: ${action}`);
    }
  }

  /**
   * Create a federated session
   */
  private async createFederatedSession(
    userId: string,
    federatedIdentityId: string,
    data?: Partial<FederatedSession>,
    identity?: FederatedIdentity
  ): Promise<FederatedSession> {
    if (identity && identity.status !== 'active') {
      throw new Error('Cannot create session for inactive identity');
    }

    const now = new Date();
    const sessionDuration = Math.min(
      data?.expiresAt
        ? data.expiresAt.getTime() - now.getTime()
        : this.config.defaultSessionDuration,
      this.config.maxSessionDuration
    );

    const session: FederatedSession = {
      id: crypto.randomUUID(),
      userId,
      federatedIdentityId,
      providerId: identity?.providerId || data?.providerId || '',
      sessionToken: this.generateSessionToken(),
      accessToken: data?.accessToken,
      refreshToken: data?.refreshToken,
      idToken: data?.idToken,
      expiresAt: new Date(now.getTime() + sessionDuration),
      createdAt: now,
      lastActivityAt: now,
      ipAddress: data?.ipAddress,
      userAgent: data?.userAgent,
      status: 'active',
      attributes: data?.attributes || {},
    };

    this.sessions.set(session.id, session);

    this.emit('sessionCreated', {
      sessionId: session.id,
      userId,
      providerId: session.providerId,
      expiresAt: session.expiresAt,
    });

    return session;
  }

  /**
   * Refresh a federated session
   */
  private async refreshFederatedSession(sessionId: string): Promise<FederatedSession> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    if (session.status !== 'active') {
      throw new Error('Cannot refresh inactive session');
    }

    const now = new Date();
    if (now > session.expiresAt) {
      session.status = 'expired';
      throw new Error('Session has expired');
    }

    const newExpiry = new Date(
      now.getTime() + this.config.defaultSessionDuration
    );
    const maxExpiry = new Date(
      session.createdAt.getTime() + this.config.maxSessionDuration
    );

    session.expiresAt = newExpiry < maxExpiry ? newExpiry : maxExpiry;
    session.lastActivityAt = now;

    this.emit('sessionRefreshed', {
      sessionId: session.id,
      newExpiresAt: session.expiresAt,
    });

    return session;
  }

  /**
   * Terminate a federated session
   */
  private async terminateFederatedSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    session.status = 'terminated';

    this.emit('sessionTerminated', {
      sessionId: session.id,
      userId: session.userId,
    });
  }

  /**
   * Terminate sessions by provider
   */
  async terminateSessionsByProvider(providerId: string): Promise<void> {
    const sessionEntries = Array.from(this.sessions.values());
    for (const session of sessionEntries) {
      if (session.providerId === providerId && session.status === 'active') {
        session.status = 'terminated';
        this.emit('sessionTerminated', { sessionId: session.id });
      }
    }
  }

  /**
   * Terminate sessions by identity
   */
  async terminateSessionsByIdentity(identityId: string): Promise<void> {
    const sessionEntries = Array.from(this.sessions.values());
    for (const session of sessionEntries) {
      if (session.federatedIdentityId === identityId && session.status === 'active') {
        session.status = 'terminated';
        this.emit('sessionTerminated', { sessionId: session.id });
      }
    }
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): FederatedSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get active sessions count
   */
  getActiveSessionsCount(): number {
    return Array.from(this.sessions.values())
      .filter(s => s.status === 'active' && s.expiresAt > new Date()).length;
  }

  /**
   * Cleanup expired sessions
   */
  cleanupExpiredSessions(): void {
    const now = new Date();
    const sessionEntries = Array.from(this.sessions.entries());

    for (const [sessionId, session] of sessionEntries) {
      if (session.status === 'active' && session.expiresAt < now) {
        session.status = 'expired';
        this.emit('sessionExpired', { sessionId });
      }

      const sessionAge = now.getTime() - session.createdAt.getTime();
      if (
        (session.status === 'terminated' || session.status === 'expired') &&
        sessionAge > 24 * 60 * 60 * 1000
      ) {
        this.sessions.delete(sessionId);
      }
    }
  }

  /**
   * Clear all sessions
   */
  clear(): void {
    this.sessions.clear();
  }

  private generateSessionToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}
