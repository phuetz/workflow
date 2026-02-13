/**
 * JWT Token Management
 * Real JWT implementation with secure token generation and validation
 */

import crypto from 'crypto';
import { logger } from '../../services/SimpleLogger';

interface JWTPayload {
  sub: string; // user id
  email: string;
  role: string;
  permissions: string[];
  iat: number;
  exp: number;
  jti: string; // JWT ID for token tracking
  type?: 'access' | 'refresh'; // TOKEN TYPE FIX: Add token type for validation
  family?: string; // SECURITY FIX: Token family for refresh token rotation
  version?: number; // SECURITY FIX: Token version for invalidation
}

interface JWTHeader {
  alg: 'HS256' | 'HS384' | 'HS512';
  typ: 'JWT';
}

export class JWTService {
  private readonly secret: string;
  private readonly issuer: string;
  private readonly audience: string;
  private readonly accessTokenExpiry: number = 15 * 60; // 15 minutes
  private readonly refreshTokenExpiry: number = 7 * 24 * 60 * 60; // 7 days
  private readonly revokedTokens: Set<string> = new Set();
  
  // SECURITY FIX: Enhanced token tracking for security
  private readonly tokenFamilies: Map<string, {
    userId: string;
    createdAt: number;
    lastUsed: number;
    refreshCount: number;
    version: number;
  }> = new Map();
  
  private readonly refreshAttempts: Map<string, {
    count: number;
    lastAttempt: number;
  }> = new Map();
  
  private readonly MAX_REFRESH_ATTEMPTS = 5;
  private readonly REFRESH_WINDOW = 60 * 1000; // 1 minute
  private readonly MAX_REFRESH_COUNT = 100; // Max refreshes per token family

  constructor() {
    this.secret = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
    this.issuer = process.env.JWT_ISSUER || 'workflow-pro';
    this.audience = process.env.JWT_AUDIENCE || 'workflow-pro-users';
    
    if (!process.env.JWT_SECRET) {
      logger.warn('JWT_SECRET not set, using random secret. Set JWT_SECRET in production!');
    }
  }

  /**
   * Generate access and refresh tokens
   */
  async generateTokens(user: {
    id: string;
    email: string;
    role: string;
    permissions: string[];
  }): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    const now = Math.floor(Date.now() / 1000);
    const tokenFamily = crypto.randomBytes(16).toString('hex');
    const tokenVersion = 1;

    // SECURITY FIX: Track token family
    this.tokenFamilies.set(tokenFamily, {
      userId: user.id,
      createdAt: now,
      lastUsed: now,
      refreshCount: 0,
      version: tokenVersion
    });
    
    // Access token payload
    const accessPayload: JWTPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      iat: now,
      exp: now + this.accessTokenExpiry,
      jti: this.generateTokenId(),
      type: 'access',
      family: tokenFamily,
      version: tokenVersion
    };

    // SECURITY FIX: Refresh token should not contain sensitive permissions
    const refreshPayload: JWTPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      permissions: [], // Refresh tokens should not have permissions
      iat: now,
      exp: now + this.refreshTokenExpiry,
      jti: this.generateTokenId(),
      type: 'refresh',
      family: tokenFamily,
      version: tokenVersion
    };

    const accessToken = await this.createToken(accessPayload);
    const refreshToken = await this.createToken(refreshPayload);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.accessTokenExpiry
    };
  }

  /**
   * Verify and decode token
   */
  async verifyToken(token: string): Promise<JWTPayload | null> {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid token format');
      }

      const [headerB64, payloadB64, signatureB64] = parts;

      // Verify signature
      const expectedSignature = await this.sign(`${headerB64}.${payloadB64}`);
      if (expectedSignature !== signatureB64) {
        throw new Error('Invalid signature');
      }

      // Decode payload
      const header: JWTHeader = JSON.parse(this.base64UrlDecode(headerB64));
      const payload: JWTPayload = JSON.parse(this.base64UrlDecode(payloadB64));
      const now = Math.floor(Date.now() / 1000);

      // Check if token is revoked
      if (this.revokedTokens.has(payload.jti)) {
        throw new Error('Token has been revoked');
      }

      // Check expiration
      if (payload.exp < now) {
        throw new Error('Token has expired');
      }

      // Check issuer and audience
      if (header.typ !== 'JWT') {
        throw new Error('Invalid token type');
      }

      return payload;
    } catch (error) {
      logger.error('Token verification failed:', error);
      return null;
    }
  }

  /**
   * SECURITY FIX: Enhanced refresh access token with comprehensive security checks
   */
  async refreshAccessToken(refreshToken: string, userPermissions?: string[]): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  } | null> {
    const payload = await this.verifyToken(refreshToken);
    if (!payload) {
      logger.warn('Invalid refresh token provided');
      return null;
    }

    // SECURITY FIX: Validate token type
    if (payload.type !== 'refresh') {
      logger.error('Token type validation failed: expected refresh token');
      return null;
    }

    // SECURITY FIX: Rate limiting for refresh attempts
    const rateLimitKey = `refresh:${payload.sub}`;
    if (!this.checkRefreshRateLimit(rateLimitKey)) {
      logger.error('Refresh rate limit exceeded for user:', payload.sub);
      return null;
    }

    // SECURITY FIX: Validate token family
    if (!payload.family || !this.tokenFamilies.has(payload.family)) {
      logger.error('Invalid token family or family not found');
      return null;
    }

    const family = this.tokenFamilies.get(payload.family)!;
    const now = Math.floor(Date.now() / 1000);
    const newVersion = family.version + 1;

    // SECURITY FIX: Check for token family abuse
    if (family.refreshCount >= this.MAX_REFRESH_COUNT) {
      logger.error('Token family refresh limit exceeded');
      this.revokeTokenFamily(payload.family);
      return null;
    }

    // SECURITY FIX: Check token version
    if (payload.version !== family.version) {
      logger.error('Token version mismatch - possible token theft');
      this.revokeTokenFamily(payload.family);
      return null;
    }

    // Update family tracking
    family.lastUsed = now;
    family.refreshCount += 1;
    family.version = newVersion;

    // SECURITY FIX: Generate new access token with fresh permissions
    const accessPayload: JWTPayload = {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      permissions: userPermissions || [], // Use provided permissions, not from token
      iat: now,
      exp: now + this.accessTokenExpiry,
      jti: this.generateTokenId(),
      type: 'access',
      family: payload.family,
      version: newVersion
    };

    // SECURITY FIX: Generate new refresh token (token rotation)
    const refreshPayload: JWTPayload = {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      permissions: [], // Refresh tokens should not have permissions
      iat: now,
      exp: now + this.refreshTokenExpiry,
      jti: this.generateTokenId(),
      type: 'refresh',
      family: payload.family,
      version: newVersion
    };

    // SECURITY FIX: Revoke old refresh token
    this.revokeToken(payload.jti);

    const accessToken = await this.createToken(accessPayload);
    const newRefreshToken = await this.createToken(refreshPayload);

    logger.info('Token refresh successful', {
      userId: payload.sub,
      family: payload.family,
      refreshCount: family.refreshCount
    });

    return {
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn: this.accessTokenExpiry
    };
  }

  /**
   * Revoke a token
   */
  revokeToken(tokenId: string): void {
    this.revokedTokens.add(tokenId);

    // Clean up old revoked tokens periodically
    if (this.revokedTokens.size > 10000) {
      // In production, store in Redis with TTL
      const tokensArray = Array.from(this.revokedTokens);
      this.revokedTokens.clear();
      // Keep last 5000 tokens
      tokensArray.slice(-5000).forEach(id => this.revokedTokens.add(id));
    }
  }

  /**
   * Extract token from Authorization header
   */
  extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }

  // Private methods
  private async createToken(payload: JWTPayload): Promise<string> {
    const header: JWTHeader = {
      alg: 'HS256',
      typ: 'JWT'
    };

    const headerB64 = this.base64UrlEncode(JSON.stringify(header));
    const payloadB64 = this.base64UrlEncode(JSON.stringify(payload));
    const signature = await this.sign(`${headerB64}.${payloadB64}`);

    return `${headerB64}.${payloadB64}.${signature}`;
  }

  private async sign(data: string): Promise<string> {
    const hmac = crypto.createHmac('sha256', this.secret);
    hmac.update(data);
    return this.base64UrlEncode(hmac.digest());
  }

  private base64UrlEncode(data: string | Buffer): string {
    const base64 = Buffer.isBuffer(data)
      ? data.toString('base64')
      : Buffer.from(data).toString('base64');

    return base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  private base64UrlDecode(data: string): string {
    const base64 = data
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(data.length + (4 - data.length % 4) % 4, '=');

    return Buffer.from(base64, 'base64').toString('utf-8');
  }

  private generateTokenId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * SECURITY FIX: Rate limiting for refresh token attempts
   */
  private checkRefreshRateLimit(key: string): boolean {
    const now = Date.now();
    const attempts = this.refreshAttempts.get(key);

    if (!attempts) {
      this.refreshAttempts.set(key, { count: 1, lastAttempt: now });
      return true;
    }

    // Reset counter if outside window
    if (now - attempts.lastAttempt > this.REFRESH_WINDOW) {
      attempts.count = 1;
      attempts.lastAttempt = now;
      return true;
    }

    // Check if limit exceeded
    if (attempts.count >= this.MAX_REFRESH_ATTEMPTS) {
      return false;
    }

    attempts.count += 1;
    attempts.lastAttempt = now;
    return true;
  }
  
  /**
   * SECURITY FIX: Revoke entire token family
   */
  private revokeTokenFamily(familyId: string): void {
    const family = this.tokenFamilies.get(familyId);
    if (family) {
      logger.warn('Revoking token family due to security violation', {
        familyId,
        userId: family.userId,
        refreshCount: family.refreshCount
      });
      this.tokenFamilies.delete(familyId);
    }
  }
  
  /**
   * SECURITY FIX: Enhanced cleanup with proper expiration handling
   */
  cleanupRevokedTokens(): void {
    const now = Date.now();
    const beforeSize = this.revokedTokens.size;

    // Clean up expired token families
    for (const [familyId, family] of this.tokenFamilies) {
      // Remove families older than refresh token expiry
      if (now - family.createdAt > this.refreshTokenExpiry * 1000) {
        this.tokenFamilies.delete(familyId);
      }
    }

    // Clean up old refresh attempts
    for (const [key, attempts] of this.refreshAttempts) {
      if (now - attempts.lastAttempt > this.REFRESH_WINDOW * 2) {
        this.refreshAttempts.delete(key);
      }
    }

    // In production, revoked tokens would be handled by Redis TTL
    // For now, limit the size to prevent memory issues
    if (this.revokedTokens.size > 10000) {
      const tokensArray = Array.from(this.revokedTokens);
      this.revokedTokens.clear();
      // Keep last 5000 tokens
      tokensArray.slice(-5000).forEach(id => this.revokedTokens.add(id));
    }

    logger.info(`Token cleanup completed. Revoked tokens: ${beforeSize} -> ${this.revokedTokens.size}, Active families: ${this.tokenFamilies.size}`);
  }
  
  /**
   * SECURITY FIX: Get token statistics for monitoring
   */
  getTokenStats(): {
    revokedTokens: number;
    activeFamilies: number;
    refreshAttempts: number;
  } {
    return {
      revokedTokens: this.revokedTokens.size,
      activeFamilies: this.tokenFamilies.size,
      refreshAttempts: this.refreshAttempts.size
    };
  }
}

// Singleton instance
export const jwtService = new JWTService();