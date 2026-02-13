/**
 * Authentication System
 * Complete auth with 2FA, API keys, and session management
 */

import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';
import { EventEmitter } from 'events';
import { logger } from '../services/SimpleLogger';

// Optional imports for 2FA functionality
let speakeasy: any;
let QRCode: any;

// Dynamically import 2FA libraries if available
try {
  speakeasy = require('speakeasy');
} catch {
  // 2FA libraries not installed
}

try {
  QRCode = require('qrcode');
} catch {
  // QRCode library not installed
}

export interface User {
  id: string;
  email: string;
  username: string;
  passwordHash?: string;
  role: UserRole;
  permissions: Permission[];
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  apiKeys: APIKey[];
  sessions: Session[];
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    lastLogin?: Date;
    loginAttempts: number;
    locked: boolean;
    lockedUntil?: Date;
    emailVerified: boolean;
    phoneVerified: boolean;
    ipWhitelist?: string[];
  };
  preferences: {
    theme?: 'light' | 'dark';
    language?: string;
    timezone?: string;
    notifications?: NotificationPreferences;
  };
}

export interface UserRole {
  id: string;
  name: string;
  level: number;
  permissions: Permission[];
}

export interface Permission {
  resource: string;
  action: string;
  conditions?: any;
}

export interface APIKey {
  id: string;
  key: string;
  name: string;
  description?: string;
  permissions: Permission[];
  rateLimit?: {
    requests: number;
    window: number;
  };
  ipWhitelist?: string[];
  expiresAt?: Date;
  lastUsed?: Date;
  createdAt: Date;
  revoked: boolean;
  revokedAt?: Date;
  revokedReason?: string;
}

export interface Session {
  id: string;
  token: string;
  userId: string;
  deviceId?: string;
  deviceName?: string;
  ip: string;
  userAgent: string;
  createdAt: Date;
  expiresAt: Date;
  lastActivity: Date;
  revoked: boolean;
}

export interface AuthConfig {
  jwtSecret: string;
  jwtExpiry: string;
  sessionExpiry: number;
  maxLoginAttempts: number;
  lockoutDuration: number;
  passwordPolicy: PasswordPolicy;
  twoFactorRequired: boolean;
  apiKeyLength: number;
  allowMultipleSessions: boolean;
  sessionTimeout: number;
}

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  preventReuse: number;
  expiryDays?: number;
}

export interface LoginResult {
  success: boolean;
  user?: User;
  token?: string;
  refreshToken?: string;
  requiresTwoFactor?: boolean;
  message?: string;
}

export interface TwoFactorSetup {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
  webhooks: boolean;
}

export class AuthenticationSystem extends EventEmitter {
  private users: Map<string, User> = new Map();
  private sessions: Map<string, Session> = new Map();
  private apiKeys: Map<string, APIKey> = new Map();
  private refreshTokens: Map<string, string> = new Map();
  private passwordHistory: Map<string, string[]> = new Map();
  private loginAttempts: Map<string, number> = new Map();
  private config: AuthConfig;

  constructor(config?: Partial<AuthConfig>) {
    super();
    this.config = {
      jwtSecret: process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex'),
      jwtExpiry: '1h',
      sessionExpiry: 24 * 60 * 60 * 1000, // 24 hours
      maxLoginAttempts: 5,
      lockoutDuration: 30 * 60 * 1000, // 30 minutes
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        preventReuse: 5
      },
      twoFactorRequired: false,
      apiKeyLength: 32,
      allowMultipleSessions: true,
      sessionTimeout: 30 * 60 * 1000, // 30 minutes
      ...config
    };

    this.startSessionCleanup();
  }

  /**
   * Register new user
   */
  async register(params: {
    email: string;
    username: string;
    password: string;
    role?: string;
  }): Promise<User> {
    // Check if user exists
    const existingUser = Array.from(this.users.values()).find(
      u => u.email === params.email || u.username === params.username
    );

    if (existingUser) {
      throw new Error('User already exists');
    }

    // Validate password
    this.validatePassword(params.password);

    // Hash password
    const passwordHash = await bcrypt.hash(params.password, 10);

    // Create user
    const user: User = {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      email: params.email,
      username: params.username,
      passwordHash,
      role: this.getRole(params.role || 'user'),
      permissions: [],
      twoFactorEnabled: false,
      apiKeys: [],
      sessions: [],
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        loginAttempts: 0,
        locked: false,
        emailVerified: false,
        phoneVerified: false
      },
      preferences: {
        theme: 'light',
        language: 'en',
        timezone: 'UTC',
        notifications: {
          email: true,
          sms: false,
          push: true,
          webhooks: false
        }
      }
    };

    // Store user
    this.users.set(user.id, user);

    // Store password in history
    this.passwordHistory.set(user.id, [passwordHash]);

    // Emit event
    this.emit('user-registered', user);

    logger.info(`User registered: ${user.username}`);

    return this.sanitizeUser(user);
  }

  /**
   * Login user
   */
  async login(params: {
    username: string;
    password: string;
    ip: string;
    userAgent: string;
    deviceId?: string;
  }): Promise<LoginResult> {
    // Find user
    const user = Array.from(this.users.values()).find(
      u => u.username === params.username || u.email === params.username
    );

    if (!user) {
      return { success: false, message: 'Invalid credentials' };
    }

    // Check if account is locked
    if (user.metadata.locked) {
      if (user.metadata.lockedUntil && user.metadata.lockedUntil > new Date()) {
        return { success: false, message: 'Account is locked' };
      } else {
        // Unlock account
        user.metadata.locked = false;
        user.metadata.lockedUntil = undefined;
        user.metadata.loginAttempts = 0;
      }
    }

    // Verify password
    const validPassword = await bcrypt.compare(params.password, user.passwordHash!);

    if (!validPassword) {
      // Increment login attempts
      user.metadata.loginAttempts++;

      if (user.metadata.loginAttempts >= this.config.maxLoginAttempts) {
        // Lock account
        user.metadata.locked = true;
        user.metadata.lockedUntil = new Date(Date.now() + this.config.lockoutDuration);
        
        this.emit('account-locked', user);
        
        return { success: false, message: 'Account locked due to too many failed attempts' };
      }

      return { success: false, message: 'Invalid credentials' };
    }

    // Reset login attempts
    user.metadata.loginAttempts = 0;
    user.metadata.lastLogin = new Date();

    // Check if 2FA is required
    if (user.twoFactorEnabled) {
      return {
        success: false,
        requiresTwoFactor: true,
        message: 'Two-factor authentication required'
      };
    }

    // Create session
    const session = this.createSession(user, params);
    
    // Generate tokens
    const token = this.generateJWT(user);
    const refreshToken = this.generateRefreshToken(user);

    this.emit('user-login', { user, session });

    logger.info(`User logged in: ${user.username}`);

    return {
      success: true,
      user: this.sanitizeUser(user),
      token,
      refreshToken
    };
  }

  /**
   * Verify two-factor code
   */
  async verifyTwoFactor(params: {
    userId: string;
    code: string;
    ip: string;
    userAgent: string;
  }): Promise<LoginResult> {
    const user = this.users.get(params.userId);

    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      return { success: false, message: 'Invalid request' };
    }

    // Verify TOTP code
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: params.code,
      window: 2
    });

    if (!verified) {
      return { success: false, message: 'Invalid code' };
    }

    // Create session
    const session = this.createSession(user, params);
    
    // Generate tokens
    const token = this.generateJWT(user);
    const refreshToken = this.generateRefreshToken(user);

    this.emit('2fa-verified', { user, session });

    return {
      success: true,
      user: this.sanitizeUser(user),
      token,
      refreshToken
    };
  }

  /**
   * Setup two-factor authentication
   */
  async setupTwoFactor(userId: string): Promise<TwoFactorSetup> {
    const user = this.users.get(userId);

    if (!user) {
      throw new Error('User not found');
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `WorkflowPlatform (${user.username})`,
      length: 32
    });

    // Generate QR code
    const qrCode = await QRCode.toDataURL(secret.otpauth_url!);

    // Generate backup codes
    const backupCodes = Array.from({ length: 10 }, () =>
      crypto.randomBytes(4).toString('hex').toUpperCase()
    );

    // Store secret (temporarily until confirmed)
    user.twoFactorSecret = secret.base32;

    return {
      secret: secret.base32,
      qrCode,
      backupCodes
    };
  }

  /**
   * Enable two-factor authentication
   */
  async enableTwoFactor(userId: string, code: string): Promise<boolean> {
    const user = this.users.get(userId);

    if (!user || !user.twoFactorSecret) {
      throw new Error('2FA setup not initiated');
    }

    // Verify code
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 2
    });

    if (!verified) {
      return false;
    }

    // Enable 2FA
    user.twoFactorEnabled = true;
    user.metadata.updatedAt = new Date();

    this.emit('2fa-enabled', user);

    logger.info(`2FA enabled for user: ${user.username}`);

    return true;
  }

  /**
   * Create API key
   */
  createAPIKey(params: {
    userId: string;
    name: string;
    description?: string;
    permissions?: Permission[];
    expiresIn?: number;
    ipWhitelist?: string[];
  }): APIKey {
    const user = this.users.get(params.userId);

    if (!user) {
      throw new Error('User not found');
    }

    // Generate API key
    const keyValue = this.generateAPIKeyValue();

    const apiKey: APIKey = {
      id: `apikey_${Date.now()}`,
      key: keyValue,
      name: params.name,
      description: params.description,
      permissions: params.permissions || user.permissions,
      ipWhitelist: params.ipWhitelist,
      expiresAt: params.expiresIn 
        ? new Date(Date.now() + params.expiresIn)
        : undefined,
      createdAt: new Date(),
      revoked: false
    };

    // Store API key
    user.apiKeys.push(apiKey);
    this.apiKeys.set(keyValue, apiKey);

    this.emit('api-key-created', { user, apiKey });

    logger.info(`API key created for user: ${user.username}`);

    return apiKey;
  }

  /**
   * Validate API key
   */
  async validateAPIKey(key: string, ip?: string): Promise<{
    valid: boolean;
    apiKey?: APIKey;
    user?: User;
    reason?: string;
  }> {
    const apiKey = this.apiKeys.get(key);

    if (!apiKey) {
      return { valid: false, reason: 'Invalid API key' };
    }

    // Check if revoked
    if (apiKey.revoked) {
      return { valid: false, reason: 'API key has been revoked' };
    }

    // Check expiry
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return { valid: false, reason: 'API key has expired' };
    }

    // Check IP whitelist
    if (ip && apiKey.ipWhitelist && !apiKey.ipWhitelist.includes(ip)) {
      return { valid: false, reason: 'IP not whitelisted' };
    }

    // Update last used
    apiKey.lastUsed = new Date();

    // Find user
    const user = Array.from(this.users.values()).find(
      u => u.apiKeys.some(k => k.key === key)
    );

    return {
      valid: true,
      apiKey,
      user: user ? this.sanitizeUser(user) : undefined
    };
  }

  /**
   * Revoke API key
   */
  revokeAPIKey(keyId: string, reason?: string): void {
    // Find API key in users
    for (const user of Array.from(this.users.values())) {
      const apiKey = user.apiKeys.find(k => k.id === keyId);

      if (apiKey) {
        apiKey.revoked = true;
        apiKey.revokedAt = new Date();
        apiKey.revokedReason = reason;

        // Remove from global map
        this.apiKeys.delete(apiKey.key);

        this.emit('api-key-revoked', { user, apiKey });

        logger.info(`API key revoked: ${apiKey.name}`);

        return;
      }
    }

    throw new Error('API key not found');
  }

  /**
   * Refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<{
    success: boolean;
    token?: string;
    message?: string;
  }> {
    const userId = this.refreshTokens.get(refreshToken);

    if (!userId) {
      return { success: false, message: 'Invalid refresh token' };
    }

    const user = this.users.get(userId);

    if (!user) {
      return { success: false, message: 'User not found' };
    }

    // Generate new access token
    const token = this.generateJWT(user);

    return {
      success: true,
      token
    };
  }

  /**
   * Logout user
   */
  logout(sessionId: string): void {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new Error('Session not found');
    }

    // Revoke session
    session.revoked = true;
    this.sessions.delete(sessionId);

    // Remove from user sessions
    const user = this.users.get(session.userId);
    if (user) {
      user.sessions = user.sessions.filter(s => s.id !== sessionId);
    }

    this.emit('user-logout', { userId: session.userId, sessionId });

    logger.info(`User logged out: ${session.userId}`);
  }

  /**
   * Change password
   */
  async changePassword(params: {
    userId: string;
    currentPassword: string;
    newPassword: string;
  }): Promise<void> {
    const user = this.users.get(params.userId);

    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const validPassword = await bcrypt.compare(params.currentPassword, user.passwordHash!);

    if (!validPassword) {
      throw new Error('Invalid current password');
    }

    // Validate new password
    this.validatePassword(params.newPassword);

    // Check password history
    const history = this.passwordHistory.get(user.id) || [];
    for (const oldHash of history.slice(0, this.config.passwordPolicy.preventReuse)) {
      if (await bcrypt.compare(params.newPassword, oldHash)) {
        throw new Error('Password has been used recently');
      }
    }

    // Hash new password
    const newHash = await bcrypt.hash(params.newPassword, 10);

    // Update password
    user.passwordHash = newHash;
    user.metadata.updatedAt = new Date();

    // Update history
    history.unshift(newHash);
    this.passwordHistory.set(user.id, history.slice(0, 10));

    // Revoke all sessions
    this.revokeAllSessions(user.id);

    this.emit('password-changed', user);

    logger.info(`Password changed for user: ${user.username}`);
  }

  /**
   * Reset password
   */
  async resetPassword(params: {
    token: string;
    newPassword: string;
  }): Promise<void> {
    // Verify reset token
    const decoded = jwt.verify(params.token, this.config.jwtSecret) as any;

    if (!decoded.userId || decoded.type !== 'password-reset') {
      throw new Error('Invalid reset token');
    }

    const user = this.users.get(decoded.userId);

    if (!user) {
      throw new Error('User not found');
    }

    // Validate new password
    this.validatePassword(params.newPassword);

    // Hash new password
    const newHash = await bcrypt.hash(params.newPassword, 10);

    // Update password
    user.passwordHash = newHash;
    user.metadata.updatedAt = new Date();

    // Update history
    const history = this.passwordHistory.get(user.id) || [];
    history.unshift(newHash);
    this.passwordHistory.set(user.id, history.slice(0, 10));

    // Revoke all sessions
    this.revokeAllSessions(user.id);

    this.emit('password-reset', user);

    logger.info(`Password reset for user: ${user.username}`);
  }

  /**
   * Generate password reset token
   */
  generatePasswordResetToken(email: string): string {
    const user = Array.from(this.users.values()).find(u => u.email === email);

    if (!user) {
      throw new Error('User not found');
    }

    const token = jwt.sign(
      {
        userId: user.id,
        type: 'password-reset'
      },
      this.config.jwtSecret,
      { expiresIn: '1h' }
    );

    this.emit('password-reset-requested', user);

    return token;
  }

  /**
   * Create session
   */
  private createSession(user: User, params: any): Session {
    const session: Session = {
      id: `session_${Date.now()}`,
      token: crypto.randomBytes(32).toString('hex'),
      userId: user.id,
      deviceId: params.deviceId,
      deviceName: params.deviceName,
      ip: params.ip,
      userAgent: params.userAgent,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.config.sessionExpiry),
      lastActivity: new Date(),
      revoked: false
    };

    // Store session
    this.sessions.set(session.id, session);
    user.sessions.push(session);

    // Check for multiple sessions
    if (!this.config.allowMultipleSessions && user.sessions.length > 1) {
      // Revoke old sessions
      const oldSessions = user.sessions.slice(0, -1);
      oldSessions.forEach(s => {
        s.revoked = true;
        this.sessions.delete(s.id);
      });
      user.sessions = [session];
    }

    return session;
  }

  /**
   * Generate JWT
   */
  private generateJWT(user: User): string {
    return jwt.sign(
      {
        userId: user.id,
        username: user.username,
        email: user.email,
        role: user.role.name,
        permissions: user.permissions
      },
      this.config.jwtSecret,
      { expiresIn: this.config.jwtExpiry } as jwt.SignOptions
    );
  }

  /**
   * Generate refresh token
   */
  private generateRefreshToken(user: User): string {
    const token = crypto.randomBytes(32).toString('hex');
    this.refreshTokens.set(token, user.id);
    return token;
  }

  /**
   * Generate API key value
   */
  private generateAPIKeyValue(): string {
    const prefix = 'wf_';
    const key = crypto.randomBytes(this.config.apiKeyLength).toString('hex');
    return `${prefix}${key}`;
  }

  /**
   * Validate password against policy
   */
  private validatePassword(password: string): void {
    const policy = this.config.passwordPolicy;

    if (password.length < policy.minLength) {
      throw new Error(`Password must be at least ${policy.minLength} characters`);
    }

    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      throw new Error('Password must contain uppercase letters');
    }

    if (policy.requireLowercase && !/[a-z]/.test(password)) {
      throw new Error('Password must contain lowercase letters');
    }

    if (policy.requireNumbers && !/\d/.test(password)) {
      throw new Error('Password must contain numbers');
    }

    if (policy.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      throw new Error('Password must contain special characters');
    }
  }

  /**
   * Get role
   */
  private getRole(roleName: string): UserRole {
    const roles: Record<string, UserRole> = {
      admin: {
        id: 'role_admin',
        name: 'admin',
        level: 100,
        permissions: [
          { resource: '*', action: '*' }
        ]
      },
      user: {
        id: 'role_user',
        name: 'user',
        level: 10,
        permissions: [
          { resource: 'workflow', action: 'read' },
          { resource: 'workflow', action: 'write' },
          { resource: 'execution', action: 'read' },
          { resource: 'execution', action: 'write' }
        ]
      },
      viewer: {
        id: 'role_viewer',
        name: 'viewer',
        level: 1,
        permissions: [
          { resource: 'workflow', action: 'read' },
          { resource: 'execution', action: 'read' }
        ]
      }
    };

    return roles[roleName] || roles.user;
  }

  /**
   * Sanitize user object
   */
  private sanitizeUser(user: User): User {
    const sanitized = { ...user };
    delete sanitized.passwordHash;
    delete sanitized.twoFactorSecret;
    return sanitized;
  }

  /**
   * Revoke all sessions for user
   */
  private revokeAllSessions(userId: string): void {
    const user = this.users.get(userId);
    
    if (!user) return;

    user.sessions.forEach(session => {
      session.revoked = true;
      this.sessions.delete(session.id);
    });

    user.sessions = [];
  }

  /**
   * Start session cleanup interval
   */
  private startSessionCleanup(): void {
    setInterval(() => {
      const now = Date.now();

      // Clean expired sessions
      for (const [id, session] of Array.from(this.sessions.entries())) {
        if (session.expiresAt < new Date() || session.revoked) {
          this.sessions.delete(id);

          // Remove from user
          const user = this.users.get(session.userId);
          if (user) {
            user.sessions = user.sessions.filter(s => s.id !== id);
          }
        }
      }

      // Clean expired refresh tokens
      // In production, store these in Redis with TTL
    }, 60000); // Every minute
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string): any {
    try {
      return jwt.verify(token, this.config.jwtSecret);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  /**
   * Check permission
   */
  hasPermission(user: User, resource: string, action: string): boolean {
    const permissions = [...user.role.permissions, ...user.permissions];
    
    return permissions.some(p => 
      (p.resource === '*' || p.resource === resource) &&
      (p.action === '*' || p.action === action)
    );
  }

  /**
   * Get user by ID
   */
  getUserById(userId: string): User | undefined {
    const user = this.users.get(userId);
    return user ? this.sanitizeUser(user) : undefined;
  }

  /**
   * Get all users
   */
  getAllUsers(): User[] {
    return Array.from(this.users.values()).map(u => this.sanitizeUser(u));
  }

  /**
   * Update user
   */
  updateUser(userId: string, updates: Partial<User>): User {
    const user = this.users.get(userId);
    
    if (!user) {
      throw new Error('User not found');
    }

    Object.assign(user, updates);
    user.metadata.updatedAt = new Date();

    this.emit('user-updated', user);

    return this.sanitizeUser(user);
  }

  /**
   * Delete user
   */
  deleteUser(userId: string): void {
    const user = this.users.get(userId);
    
    if (!user) {
      throw new Error('User not found');
    }

    // Revoke all sessions
    this.revokeAllSessions(userId);

    // Remove API keys
    user.apiKeys.forEach(key => {
      this.apiKeys.delete(key.key);
    });

    // Remove user
    this.users.delete(userId);
    this.passwordHistory.delete(userId);

    this.emit('user-deleted', userId);

    logger.info(`User deleted: ${user.username}`);
  }

  /**
   * Get authentication statistics
   */
  getStatistics(): any {
    const stats = {
      totalUsers: this.users.size,
      activeSessions: this.sessions.size,
      activeAPIKeys: this.apiKeys.size,
      usersWithTwoFactor: Array.from(this.users.values()).filter(u => u.twoFactorEnabled).length,
      lockedAccounts: Array.from(this.users.values()).filter(u => u.metadata.locked).length
    };

    return stats;
  }
}

// Export singleton instance
export const authSystem = new AuthenticationSystem();