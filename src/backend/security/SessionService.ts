/**
 * Session Management Service
 * Secure session handling with Redis-compatible interface
 */

import crypto from 'crypto';
import { logger } from '../../services/SimpleLogger';

export interface Session {
  id: string;
  userId: string;
  data: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  lastAccessedAt: Date;
  expiresAt: Date;
  isActive: boolean;
}

export interface SessionConfig {
  maxAge: number; // milliseconds
  rolling: boolean; // Extend expiry on each request
  secure: boolean; // HTTPS only
  httpOnly: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  maxConcurrentSessions: number; // Per user
}

export class SessionService {
  private sessions: Map<string, Session> = new Map(); // sessionId -> Session
  private userSessions: Map<string, Set<string>> = new Map(); // userId -> sessionIds
  private config: SessionConfig;

  private readonly SESSION_ID_LENGTH = 32;
  private readonly DEFAULT_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

  constructor(config?: Partial<SessionConfig>) {
    this.config = {
      maxAge: config?.maxAge || this.DEFAULT_MAX_AGE,
      rolling: config?.rolling ?? true,
      secure: config?.secure ?? process.env.NODE_ENV === 'production',
      httpOnly: config?.httpOnly ?? true,
      sameSite: config?.sameSite || 'lax',
      maxConcurrentSessions: config?.maxConcurrentSessions || 5
    };

    this.startCleanupInterval();
    logger.info('SessionService initialized', {
      maxAge: this.config.maxAge,
      rolling: this.config.rolling
    });
  }

  /**
   * Create new session
   */
  async create(data: {
    userId: string;
    ipAddress: string;
    userAgent: string;
    initialData?: Record<string, unknown>;
  }): Promise<Session> {
    // Check concurrent session limit
    const userSessionIds = this.userSessions.get(data.userId) || new Set();
    if (userSessionIds.size >= this.config.maxConcurrentSessions) {
      // Remove oldest session
      await this.removeOldestUserSession(data.userId);
    }

    // Generate secure session ID
    const sessionId = await this.generateSessionId();

    const now = new Date();
    const session: Session = {
      id: sessionId,
      userId: data.userId,
      data: data.initialData || {},
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      createdAt: now,
      lastAccessedAt: now,
      expiresAt: new Date(now.getTime() + this.config.maxAge),
      isActive: true
    };

    // Store session
    this.sessions.set(sessionId, session);

    // Add to user sessions
    userSessionIds.add(sessionId);
    this.userSessions.set(data.userId, userSessionIds);

    logger.info('Session created', {
      sessionId,
      userId: data.userId,
      ipAddress: data.ipAddress
    });

    return session;
  }

  /**
   * Get session by ID
   */
  async get(sessionId: string): Promise<Session | null> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    // Check if session expired
    if (!session.isActive || session.expiresAt < new Date()) {
      await this.destroy(sessionId);
      return null;
    }

    // Update last accessed time if rolling
    if (this.config.rolling) {
      const now = new Date();
      session.lastAccessedAt = now;
      session.expiresAt = new Date(now.getTime() + this.config.maxAge);
    }

    return session;
  }

  /**
   * Update session data
   */
  async update(sessionId: string, data: Partial<Session['data']>): Promise<Session | null> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      logger.warn('Session update failed: session not found', { sessionId });
      return null;
    }

    session.data = {
      ...session.data,
      ...data
    };
    session.lastAccessedAt = new Date();

    logger.debug('Session updated', { sessionId });
    return session;
  }

  /**
   * Destroy session
   */
  async destroy(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    // Remove from user sessions
    const userSessionIds = this.userSessions.get(session.userId);
    if (userSessionIds) {
      userSessionIds.delete(sessionId);
      if (userSessionIds.size === 0) {
        this.userSessions.delete(session.userId);
      }
    }

    // Remove session
    this.sessions.delete(sessionId);

    logger.info('Session destroyed', {
      sessionId,
      userId: session.userId
    });

    return true;
  }

  /**
   * Destroy all sessions for user
   */
  async destroyAllUserSessions(userId: string): Promise<number> {
    const userSessionIds = this.userSessions.get(userId);
    if (!userSessionIds) {
      return 0;
    }

    let destroyed = 0;
    for (const sessionId of userSessionIds) {
      if (await this.destroy(sessionId)) {
        destroyed++;
      }
    }

    logger.info('All user sessions destroyed', {
      userId,
      count: destroyed
    });

    return destroyed;
  }

  /**
   * Get all sessions for user
   */
  async getUserSessions(userId: string): Promise<Session[]> {
    const userSessionIds = this.userSessions.get(userId);
    if (!userSessionIds) {
      return [];
    }

    const sessions: Session[] = [];
    for (const sessionId of userSessionIds) {
      const session = await this.get(sessionId);
      if (session) {
        sessions.push(session);
      }
    }

    return sessions;
  }

  /**
   * Validate session
   */
  async validate(sessionId: string, options?: {
    checkIPAddress?: string;
    checkUserAgent?: string;
  }): Promise<{
    valid: boolean;
    session?: Session;
    reason?: string;
  }> {
    const session = await this.get(sessionId);
    if (!session) {
      return {
        valid: false,
        reason: 'Session not found or expired'
      };
    }

    // Check IP address if provided (optional for additional security)
    if (options?.checkIPAddress && session.ipAddress !== options.checkIPAddress) {
      logger.warn('Session IP address mismatch', {
        sessionId,
        expected: session.ipAddress,
        actual: options.checkIPAddress
      });
      return {
        valid: false,
        session,
        reason: 'IP address mismatch'
      };
    }

    // Check user agent if provided
    if (options?.checkUserAgent && session.userAgent !== options.checkUserAgent) {
      logger.warn('Session user agent mismatch', {
        sessionId,
        expected: session.userAgent,
        actual: options.checkUserAgent
      });
      return {
        valid: false,
        session,
        reason: 'User agent mismatch'
      };
    }

    return {
      valid: true,
      session
    };
  }

  /**
   * Regenerate session ID (for security after privilege escalation)
   */
  async regenerate(oldSessionId: string): Promise<Session | null> {
    const oldSession = this.sessions.get(oldSessionId);
    if (!oldSession) {
      return null;
    }

    // Create new session with same data
    const newSession = await this.create({
      userId: oldSession.userId,
      ipAddress: oldSession.ipAddress,
      userAgent: oldSession.userAgent,
      initialData: oldSession.data
    });

    // Destroy old session
    await this.destroy(oldSessionId);

    logger.info('Session ID regenerated', {
      oldSessionId,
      newSessionId: newSession.id,
      userId: oldSession.userId
    });

    return newSession;
  }

  /**
   * Touch session (update last accessed time)
   */
  async touch(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    const now = new Date();
    session.lastAccessedAt = now;

    if (this.config.rolling) {
      session.expiresAt = new Date(now.getTime() + this.config.maxAge);
    }

    return true;
  }

  /**
   * Get active sessions count
   */
  getActiveSessionsCount(): number {
    return this.sessions.size;
  }

  /**
   * Get sessions count by user
   */
  getUserSessionsCount(userId: string): number {
    const userSessionIds = this.userSessions.get(userId);
    return userSessionIds ? userSessionIds.size : 0;
  }

  /**
   * Get session statistics
   */
  getStats(): {
    totalSessions: number;
    totalUsers: number;
    averageSessionsPerUser: number;
    oldestSession?: Date;
    newestSession?: Date;
  } {
    let oldestSession: Date | undefined;
    let newestSession: Date | undefined;

    for (const session of this.sessions.values()) {
      if (!oldestSession || session.createdAt < oldestSession) {
        oldestSession = session.createdAt;
      }
      if (!newestSession || session.createdAt > newestSession) {
        newestSession = session.createdAt;
      }
    }

    const totalUsers = this.userSessions.size;
    const averageSessionsPerUser = totalUsers > 0 ? this.sessions.size / totalUsers : 0;

    return {
      totalSessions: this.sessions.size,
      totalUsers,
      averageSessionsPerUser,
      oldestSession,
      newestSession
    };
  }

  /**
   * Cleanup expired sessions
   */
  async cleanup(): Promise<number> {
    const now = new Date();
    let cleaned = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (!session.isActive || session.expiresAt < now) {
        await this.destroy(sessionId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info('Session cleanup completed', { cleaned });
    }

    return cleaned;
  }

  /**
   * Start periodic cleanup
   */
  private startCleanupInterval(): void {
    setInterval(async () => {
      await this.cleanup();
    }, 60 * 1000); // Every minute
  }

  /**
   * Remove oldest session for user
   */
  private async removeOldestUserSession(userId: string): Promise<void> {
    const sessions = await this.getUserSessions(userId);
    if (sessions.length === 0) return;

    // Sort by creation time
    sessions.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    // Remove oldest
    await this.destroy(sessions[0].id);

    logger.info('Oldest session removed for user', {
      userId,
      sessionId: sessions[0].id
    });
  }

  /**
   * Generate secure session ID
   */
  private async generateSessionId(): Promise<string> {
    // Generate random bytes
    const randomBytes = crypto.randomBytes(this.SESSION_ID_LENGTH);

    // Convert to URL-safe base64
    const sessionId = randomBytes.toString('base64url');

    // Ensure uniqueness
    if (this.sessions.has(sessionId)) {
      return this.generateSessionId(); // Recursive call (unlikely to happen)
    }

    return sessionId;
  }

  /**
   * Export session for debugging
   */
  async exportSession(sessionId: string): Promise<string | null> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    return JSON.stringify({
      ...session,
      data: '[REDACTED]' // Don't include sensitive data
    }, null, 2);
  }
}

// Singleton instance
export const sessionService = new SessionService();

// Express middleware helper
export function sessionMiddleware() {
  return async (req: any, res: any, next: any) => {
    try {
      // Get session ID from cookie or header
      const sessionId = req.cookies?.sessionId || req.headers['x-session-id'];

      if (sessionId) {
        const validation = await sessionService.validate(sessionId, {
          checkIPAddress: req.ip,
          checkUserAgent: req.headers['user-agent']
        });

        if (validation.valid && validation.session) {
          req.session = validation.session;
          req.sessionId = sessionId;

          // Touch session to update last accessed time
          await sessionService.touch(sessionId);
        }
      }

      next();
    } catch (error) {
      logger.error('Session middleware error:', error);
      next();
    }
  };
}
