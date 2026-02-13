/**
 * PLAN C PHASE 3 - Service Monolithique 1: Authentication Unifié
 * Consolide OAuth2, User Management, CSRF, JWT, Session Management
 * REFACTORED: Utilise SharedPatterns pour éliminer les duplications
 */

import { logger } from '../LoggingService';
import { encryptionService } from '../EncryptionService';
import cacheService from '../CacheService';
import { eventNotificationService } from '../EventNotificationService';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { 
  withErrorHandling, 
  withRetry,
  withCache,
  createValidator,
  validators,
  ResponseBuilder,
  createSingleton,
  generateId
} from '../../utils/SharedPatterns';

// Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'editor' | 'viewer';
  permissions: string[];
  metadata: Record<string, any>;
  createdAt: Date;
  lastLogin?: Date;
  isActive: boolean;
  mfaEnabled: boolean;
}

export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  expiresAt: Date;
  isValid: boolean;
}

export interface AuthResult {
  success: boolean;
  user?: User;
  token?: AuthToken;
  session?: Session;
  error?: string;
  requiresMFA?: boolean;
}

export interface OAuth2Config {
  provider: 'google' | 'github' | 'microsoft' | 'custom';
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope: string[];
  authUrl?: string;
  tokenUrl?: string;
}

/**
 * Service d'authentification unifié
 * Gère tous les aspects de l'authentification et autorisation
 */
export class UnifiedAuthenticationService {
  private static instance: UnifiedAuthenticationService;
  
  // Configuration
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-me';
  private readonly JWT_EXPIRES_IN = '1h';
  private readonly REFRESH_EXPIRES_IN = '7d';
  private readonly SESSION_TIMEOUT = 3600000; // 1 hour
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION = 900000; // 15 minutes
  
  // Storage
  private users: Map<string, User> = new Map();
  private sessions: Map<string, Session> = new Map();
  private loginAttempts: Map<string, number> = new Map();
  private lockedAccounts: Map<string, number> = new Map();
  private csrfTokens: Map<string, string> = new Map();
  private oauth2Configs: Map<string, OAuth2Config> = new Map();
  
  private constructor() {
    this.initialize();
  }
  
  static getInstance(): UnifiedAuthenticationService {
    if (!UnifiedAuthenticationService.instance) {
      UnifiedAuthenticationService.instance = new UnifiedAuthenticationService();
    }
    return UnifiedAuthenticationService.instance;
  }
  
  private initialize(): void {
    // Load OAuth2 configurations
    this.setupOAuth2Providers();
    
    // Start session cleanup interval
    setInterval(() => this.cleanupExpiredSessions(), 60000); // Every minute
    
    logger.info('Unified Authentication Service initialized');
  }
  
  /**
   * Authenticate user with email and password
   */
  async authenticate(email: string, password: string, ipAddress?: string): Promise<AuthResult> {
    return await withErrorHandling(
      async () => {
        // Check if account is locked
        if (this.isAccountLocked(email)) {
          return {
            success: false,
            error: 'Account is temporarily locked due to multiple failed login attempts'
          };
        }
        
        // Get user from cache or database
        const user = await this.getUserByEmail(email);
        
        if (!user) {
          this.recordFailedAttempt(email);
          return {
            success: false,
            error: 'Invalid credentials'
          };
        }
        
        // Verify password
        const isValidPassword = await this.verifyPassword(password, user.passwordHash);
        
        if (!isValidPassword) {
          this.recordFailedAttempt(email);
          return {
            success: false,
            error: 'Invalid credentials'
          };
        }
        
        // Check if MFA is required
        if (user.mfaEnabled) {
          return {
            success: false,
            requiresMFA: true,
            user: this.sanitizeUser(user)
          };
        }
        
        // Generate tokens and session
        const token = this.generateAuthToken(user);
        const session = await this.createSession(user, token.accessToken, ipAddress);
        
        // Clear failed attempts
        this.loginAttempts.delete(email);
        
        // Update last login
        user.lastLogin = new Date();
        await this.updateUser(user);
        
        // Emit login event
        eventNotificationService.notify('auth.login', { userId: user.id });
        
        logger.info(`User ${user.email} authenticated successfully`);
        
        return {
          success: true,
          user: this.sanitizeUser(user),
          token,
          session
        };
      },
      {
        operation: 'authenticate',
        module: 'UnifiedAuthenticationService',
        data: { email }
      },
      { success: false, error: 'Authentication failed' } // Default value on error
    ) as Promise<AuthResult>;
  }
  
  /**
   * Authenticate with OAuth2 provider
   */
  async authenticateOAuth2(
    provider: string,
    code: string,
    state?: string
  ): Promise<AuthResult> {
    return await withErrorHandling(
      async () => {
        const config = this.oauth2Configs.get(provider);
        
        if (!config) {
          return {
            success: false,
            error: `OAuth2 provider ${provider} not configured`
          };
        }
        
        // Exchange code for tokens with retry
        const tokens = await withRetry(
          () => this.exchangeOAuth2Code(config, code),
          { maxAttempts: 3, delay: 1000, strategy: 'exponential' }
        );
        
        if (!tokens) {
          return {
            success: false,
            error: 'Failed to exchange authorization code'
          };
        }
        
        // Get user info from provider with retry
        const userInfo = await withRetry(
          () => this.getOAuth2UserInfo(config, tokens.access_token),
          { maxAttempts: 3, delay: 1000, strategy: 'exponential' }
        );
        
        if (!userInfo) {
          return {
            success: false,
            error: 'Failed to get user information'
          };
        }
        
        // Find or create user
        let user = await this.getUserByEmail(userInfo.email);
        
        if (!user) {
          user = await this.createUserFromOAuth(provider, userInfo);
        }
        
        // Generate our tokens and session
        const token = this.generateAuthToken(user);
        const session = await this.createSession(user, token.accessToken);
        
        logger.info(`User ${user.email} authenticated via ${provider}`);
        
        return {
          success: true,
          user: this.sanitizeUser(user),
          token,
          session
        };
      },
      {
        operation: 'authenticateOAuth2',
        module: 'UnifiedAuthenticationService',
        data: { provider }
      },
      { success: false, error: 'OAuth2 authentication failed' }
    ) as Promise<AuthResult>;
  }
  
  /**
   * Verify MFA token
   */
  async verifyMFA(userId: string, mfaToken: string): Promise<AuthResult> {
    return await withErrorHandling(
      async () => {
        const user = await withCache(
          `user:${userId}`,
          () => this.getUserById(userId),
          { ttl: 300 }
        );
        
        if (!user) {
          return {
            success: false,
            error: 'User not found'
          };
        }
        
        // Verify TOTP token
        const isValid = await this.verifyTOTP(user.mfaSecret, mfaToken);
        
        if (!isValid) {
          return {
            success: false,
            error: 'Invalid MFA token'
          };
        }
        
        // Generate tokens and session
        const token = this.generateAuthToken(user);
        const session = await this.createSession(user, token.accessToken);
        
        logger.info(`MFA verification successful for user ${user.email}`);
        
        return {
          success: true,
          user: this.sanitizeUser(user),
          token,
          session
        };
      },
      {
        operation: 'verifyMFA',
        module: 'UnifiedAuthenticationService',
        data: { userId }
      },
      { success: false, error: 'MFA verification failed' }
    ) as Promise<AuthResult>;
  }
  
  /**
   * Validate JWT token
   */
  async validateToken(token: string): Promise<{ valid: boolean; user?: User }> {
    try {
      // Check cache first
      const cachedValidation = await cacheService.get(`token:${token}`);
      if (cachedValidation !== null) {
        return cachedValidation;
      }
      
      // Verify JWT
      const decoded = jwt.verify(token, this.JWT_SECRET) as any;
      
      // Get user
      const user = await this.getUserById(decoded.userId);
      
      if (!user || !user.isActive) {
        return { valid: false };
      }
      
      // Check session
      const session = this.getSessionByToken(token);
      
      if (!session || !session.isValid || session.expiresAt < new Date()) {
        return { valid: false };
      }
      
      const result = {
        valid: true,
        user: this.sanitizeUser(user)
      };
      
      // Cache validation result
      await cacheService.set(`token:${token}`, result, { ttl: 300 });
      
      return result;
      
    } catch (error) {
      logger.debug('Token validation failed:', error);
      return { valid: false };
    }
  }
  
  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<AuthResult> {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, this.JWT_SECRET) as any;
      
      if (decoded.type !== 'refresh') {
        return {
          success: false,
          error: 'Invalid refresh token'
        };
      }
      
      // Get user
      const user = await this.getUserById(decoded.userId);
      
      if (!user || !user.isActive) {
        return {
          success: false,
          error: 'User not found or inactive'
        };
      }
      
      // Generate new tokens
      const token = this.generateAuthToken(user);
      
      logger.info(`Token refreshed for user ${user.email}`);
      
      return {
        success: true,
        user: this.sanitizeUser(user),
        token
      };
      
    } catch (error) {
      logger.error('Token refresh error:', error);
      return {
        success: false,
        error: 'Token refresh failed'
      };
    }
  }
  
  /**
   * Logout user
   */
  async logout(token: string): Promise<void> {
    try {
      const session = this.getSessionByToken(token);
      
      if (session) {
        session.isValid = false;
        this.sessions.delete(session.id);
        
        // Clear token cache
        await cacheService.delete(`token:${token}`);
        
        eventNotificationService.notify('auth.logout', { userId: session.userId });
        logger.info(`User ${session.userId} logged out`);
      }
      
    } catch (error) {
      logger.error('Logout error:', error);
    }
  }
  
  /**
   * Authorize user action
   */
  authorize(user: User, resource: string, action: string): boolean {
    // Admin can do anything
    if (user.role === 'admin') {
      return true;
    }
    
    // Check specific permissions
    const permission = `${resource}:${action}`;
    
    if (user.permissions.includes(permission) || user.permissions.includes(`${resource}:*`)) {
      return true;
    }
    
    // Role-based checks
    if (user.role === 'editor') {
      const allowedActions = ['read', 'write', 'update'];
      return allowedActions.includes(action);
    }
    
    if (user.role === 'viewer') {
      return action === 'read';
    }
    
    return false;
  }
  
  /**
   * Generate CSRF token
   */
  generateCSRFToken(sessionId: string): string {
    const token = this.generateRandomToken();
    this.csrfTokens.set(sessionId, token);
    
    // Expire after 1 hour
    setTimeout(() => {
      this.csrfTokens.delete(sessionId);
    }, 3600000);
    
    return token;
  }
  
  /**
   * Validate CSRF token
   */
  validateCSRFToken(sessionId: string, token: string): boolean {
    const storedToken = this.csrfTokens.get(sessionId);
    return storedToken === token;
  }
  
  /**
   * Helper methods
   */
  
  private generateAuthToken(user: User): AuthToken {
    const accessToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        type: 'access'
      },
      this.JWT_SECRET,
      { expiresIn: this.JWT_EXPIRES_IN }
    );
    
    const refreshToken = jwt.sign(
      {
        userId: user.id,
        type: 'refresh'
      },
      this.JWT_SECRET,
      { expiresIn: this.REFRESH_EXPIRES_IN }
    );
    
    return {
      accessToken,
      refreshToken,
      expiresIn: 3600, // 1 hour in seconds
      tokenType: 'Bearer'
    };
  }
  
  private async createSession(user: User, token: string, ipAddress?: string): Promise<Session> {
    const session: Session = {
      id: this.generateRandomToken(),
      userId: user.id,
      token,
      ipAddress: ipAddress || 'unknown',
      userAgent: 'unknown',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.SESSION_TIMEOUT),
      isValid: true
    };
    
    this.sessions.set(session.id, session);
    
    return session;
  }
  
  private getSessionByToken(token: string): Session | undefined {
    return Array.from(this.sessions.values()).find(s => s.token === token);
  }
  
  private cleanupExpiredSessions(): void {
    const now = new Date();
    
    for (const [id, session] of this.sessions) {
      if (session.expiresAt < now || !session.isValid) {
        this.sessions.delete(id);
      }
    }
  }
  
  private isAccountLocked(email: string): boolean {
    const lockTime = this.lockedAccounts.get(email);
    
    if (!lockTime) {
      return false;
    }
    
    if (Date.now() > lockTime) {
      this.lockedAccounts.delete(email);
      return false;
    }
    
    return true;
  }
  
  private recordFailedAttempt(email: string): void {
    const attempts = (this.loginAttempts.get(email) || 0) + 1;
    this.loginAttempts.set(email, attempts);
    
    if (attempts >= this.MAX_LOGIN_ATTEMPTS) {
      this.lockedAccounts.set(email, Date.now() + this.LOCKOUT_DURATION);
      this.loginAttempts.delete(email);
      logger.warn(`Account ${email} locked due to multiple failed login attempts`);
    }
  }
  
  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
  
  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }
  
  private generateRandomToken(): string {
    return Math.random().toString(36).substr(2) + Date.now().toString(36);
  }
  
  private sanitizeUser(user: any): User {
    const { passwordHash, mfaSecret, ...sanitized } = user;
    return sanitized;
  }
  
  private async getUserByEmail(email: string): Promise<any> {
    // Check cache
    const cached = await cacheService.get(`user:email:${email}`);
    if (cached) return cached;
    
    // In real implementation, fetch from database
    // For now, return from memory store
    return Array.from(this.users.values()).find(u => u.email === email);
  }
  
  private async getUserById(id: string): Promise<any> {
    // Check cache
    const cached = await cacheService.get(`user:id:${id}`);
    if (cached) return cached;
    
    return this.users.get(id);
  }
  
  private async updateUser(user: User): Promise<void> {
    this.users.set(user.id, user);
    
    // Update cache
    await cacheService.set(`user:id:${user.id}`, user, { ttl: 3600 });
    await cacheService.set(`user:email:${user.email}`, user, { ttl: 3600 });
  }
  
  private async createUserFromOAuth(provider: string, userInfo: any): Promise<User> {
    const user: User = {
      id: this.generateRandomToken(),
      email: userInfo.email,
      name: userInfo.name || userInfo.email.split('@')[0],
      role: 'viewer',
      permissions: [],
      metadata: {
        provider,
        providerId: userInfo.id
      },
      createdAt: new Date(),
      isActive: true,
      mfaEnabled: false
    };
    
    this.users.set(user.id, user);
    
    return user;
  }
  
  private setupOAuth2Providers(): void {
    // Google OAuth2
    if (process.env.GOOGLE_CLIENT_ID) {
      this.oauth2Configs.set('google', {
        provider: 'google',
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        redirectUri: process.env.GOOGLE_REDIRECT_URI!,
        scope: ['openid', 'email', 'profile']
      });
    }
    
    // GitHub OAuth2
    if (process.env.GITHUB_CLIENT_ID) {
      this.oauth2Configs.set('github', {
        provider: 'github',
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET!,
        redirectUri: process.env.GITHUB_REDIRECT_URI!,
        scope: ['user:email']
      });
    }
  }
  
  private async exchangeOAuth2Code(config: OAuth2Config, code: string): Promise<any> {
    // Implementation would make HTTP request to provider's token endpoint
    // Simplified for now
    return { access_token: 'mock_token' };
  }
  
  private async getOAuth2UserInfo(config: OAuth2Config, accessToken: string): Promise<any> {
    // Implementation would make HTTP request to provider's user info endpoint
    // Simplified for now
    return {
      id: 'oauth_user_id',
      email: 'user@example.com',
      name: 'OAuth User'
    };
  }
  
  private async verifyTOTP(secret: string, token: string): Promise<boolean> {
    // Implementation would use a TOTP library
    // Simplified for now
    return token === '123456';
  }
}

// Export singleton instance
export const authService = UnifiedAuthenticationService.getInstance();