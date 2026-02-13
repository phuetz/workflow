/**
 * Session Manager
 * Handles SSO session lifecycle, validation, and cleanup
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import {
  SSOProviderConfig,
  SSOUser,
  SSOSession,
  OIDCToken,
  DEFAULT_SESSION_CONFIG,
} from './types';
import { TokenManager } from './TokenManager';

export class SessionManager {
  private sessions: Map<string, SSOSession> = new Map();
  private eventEmitter: EventEmitter;
  private tokenManager: TokenManager;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(eventEmitter: EventEmitter, tokenManager: TokenManager) {
    this.eventEmitter = eventEmitter;
    this.tokenManager = tokenManager;
  }

  /**
   * Generate a secure random token
   */
  private generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Create a new session
   */
  public createSession(
    user: SSOUser,
    provider: SSOProviderConfig,
    idpSessionId?: string,
    tokens?: OIDCToken
  ): SSOSession {
    const sessionConfig = provider.session || DEFAULT_SESSION_CONFIG;
    const now = new Date();

    // If single session per user, revoke existing sessions
    if (sessionConfig.singleSessionPerUser) {
      const existingSessions = this.getUserSessions(user.id);
      for (const session of existingSessions) {
        session.status = 'revoked';
        this.sessions.set(session.id, session);
      }
    }

    const session: SSOSession = {
      id: this.generateSecureToken(),
      userId: user.id,
      providerId: provider.id,
      protocol: provider.protocol,
      status: 'active',
      idpSessionId,
      accessToken: tokens?.accessToken,
      refreshToken: tokens?.refreshToken,
      tokenExpiresAt: tokens ? new Date(now.getTime() + tokens.expiresIn * 1000) : undefined,
      mfaCompleted: user.mfaVerified,
      createdAt: now,
      lastActivityAt: now,
      expiresAt: new Date(now.getTime() + sessionConfig.idleTimeoutMs),
    };

    this.sessions.set(session.id, session);
    return session;
  }

  /**
   * Get session by ID
   */
  public getSession(sessionId: string): SSOSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all sessions for a user
   */
  public getUserSessions(userId: string): SSOSession[] {
    return Array.from(this.sessions.values()).filter((s) => s.userId === userId);
  }

  /**
   * Validate session
   */
  public validateSession(sessionId: string): { valid: boolean; reason?: string } {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { valid: false, reason: 'Session not found' };
    }

    if (session.status !== 'active') {
      return { valid: false, reason: `Session status: ${session.status}` };
    }

    const now = new Date();
    if (now > session.expiresAt) {
      session.status = 'expired';
      this.sessions.set(sessionId, session);
      return { valid: false, reason: 'Session expired' };
    }

    return { valid: true };
  }

  /**
   * Refresh session
   */
  public async refreshSession(
    sessionId: string,
    provider: SSOProviderConfig
  ): Promise<{ success: boolean; session?: SSOSession; error?: string }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    if (session.status !== 'active') {
      return { success: false, error: 'Session is not active' };
    }

    const sessionConfig = provider.session || DEFAULT_SESSION_CONFIG;
    const now = new Date();

    // Check absolute timeout
    const absoluteExpiry = new Date(session.createdAt.getTime() + sessionConfig.absoluteTimeoutMs);
    if (now > absoluteExpiry) {
      session.status = 'expired';
      this.sessions.set(sessionId, session);
      return { success: false, error: 'Session absolute timeout exceeded' };
    }

    // Refresh token if OIDC and token is expiring
    if (
      session.protocol === 'oidc' &&
      session.refreshToken &&
      session.tokenExpiresAt &&
      this.tokenManager.isTokenExpiring(session.tokenExpiresAt)
    ) {
      try {
        const newTokens = await this.tokenManager.refreshTokens(provider, session.refreshToken);
        session.accessToken = newTokens.accessToken;
        session.refreshToken = newTokens.refreshToken || session.refreshToken;
        session.tokenExpiresAt = this.tokenManager.calculateTokenExpiry(newTokens.expiresIn);

        this.eventEmitter.emit('audit:request', {
          eventType: 'token_refresh',
          userId: session.userId,
          providerId: session.providerId,
          sessionId: session.id,
          success: true,
          details: {},
        });
      } catch (error) {
        this.eventEmitter.emit('audit:request', {
          eventType: 'token_refresh',
          userId: session.userId,
          providerId: session.providerId,
          sessionId: session.id,
          success: false,
          errorMessage: error instanceof Error ? error.message : 'Token refresh failed',
          details: {},
        });
      }
    }

    // Update session
    session.lastActivityAt = now;
    session.expiresAt = new Date(now.getTime() + sessionConfig.idleTimeoutMs);
    this.sessions.set(sessionId, session);

    this.eventEmitter.emit('session:refreshed', { sessionId, userId: session.userId });

    return { success: true, session };
  }

  /**
   * Revoke session
   */
  public revokeSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    session.status = 'revoked';
    this.sessions.set(sessionId, session);

    this.eventEmitter.emit('auth:logout', { sessionId, userId: session.userId });

    return true;
  }

  /**
   * Revoke all user sessions
   */
  public revokeUserSessions(userId: string): number {
    const sessions = this.getUserSessions(userId);
    let count = 0;

    for (const session of sessions) {
      if (session.status === 'active') {
        session.status = 'revoked';
        this.sessions.set(session.id, session);
        count++;
      }
    }

    return count;
  }

  /**
   * Start session cleanup interval
   */
  public startCleanup(intervalMs: number = 5 * 60 * 1000): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(() => {
      const now = new Date();
      const entries = Array.from(this.sessions.entries());
      for (const [sessionId, session] of entries) {
        if (session.status === 'active' && now > session.expiresAt) {
          session.status = 'expired';
          this.sessions.set(sessionId, session);
          this.eventEmitter.emit('session:expired', { sessionId, userId: session.userId });
        }
      }
    }, intervalMs);
  }

  /**
   * Stop session cleanup
   */
  public stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Get all sessions
   */
  public getAllSessions(): SSOSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Get session count
   */
  public get size(): number {
    return this.sessions.size;
  }

  /**
   * Clear all sessions
   */
  public clear(): void {
    this.sessions.clear();
  }
}
