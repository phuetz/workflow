/**
 * Authentication Service
 * Advanced authentication with multiple providers and security features
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { EventEmitter } from 'events';
import crypto from 'crypto';

export interface User {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  roles: string[];
  permissions: string[];
  isActive: boolean;
  isEmailVerified: boolean;
  isTwoFactorEnabled: boolean;
  twoFactorSecret?: string;
  lastLoginAt?: Date;
  failedLoginAttempts: number;
  lockedUntil?: Date;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
  scope: string[];
}

export interface LoginCredentials {
  email: string;
  password: string;
  twoFactorCode?: string;
  rememberMe?: boolean;
}

export interface AuthConfig {
  jwtSecret: string;
  jwtRefreshSecret: string;
  accessTokenExpiry: string;
  refreshTokenExpiry: string;
  bcryptRounds: number;
  maxFailedAttempts: number;
  lockoutDuration: number;
  twoFactorIssuer: string;
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    preventReuse: number;
  };
  sessionConfig: {
    maxConcurrentSessions: number;
    sessionTimeout: number;
    slidingExpiration: boolean;
  };
}

export interface AuthProvider {
  name: string;
  type: 'oauth2' | 'saml' | 'ldap' | 'openid';
  config: Record<string, unknown>;
  enabled: boolean;
}

export interface Session {
  id: string;
  userId: string;
  deviceId: string;
  ipAddress: string;
  userAgent: string;
  location?: string;
  isActive: boolean;
  createdAt: Date;
  lastAccessedAt: Date;
  expiresAt: Date;
  metadata: Record<string, unknown>;
}

export interface SecurityEvent {
  type: 'login' | 'logout' | 'failed_login' | 'account_locked' | 'password_changed' | 'token_refresh';
  userId?: string;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  details: Record<string, unknown>;
  timestamp: Date;
}

export class AuthenticationService extends EventEmitter {
  private config: AuthConfig;
  private users: Map<string, User> = new Map();
  private sessions: Map<string, Session> = new Map();
  private refreshTokens: Map<string, string> = new Map(); // token -> userId
  private providers: Map<string, AuthProvider> = new Map();
  private passwordHistory: Map<string, string[]> = new Map(); // userId -> password hashes
  private securityEvents: SecurityEvent[] = [];
  
  constructor(config: AuthConfig) {
    super();
    this.config = config;
    this.initializeProviders();
  }
  
  private initializeProviders(): void {
    // Initialize default providers
    this.providers.set('local', {
      name: 'Local Authentication',
      type: 'oauth2',
      config: { enabled: true },
      enabled: true
    });
  }
  
  // User Management
  
  public async createUser(userData: {
    email: string;
    username: string;
    password: string;
    roles?: string[];
    permissions?: string[];
    metadata?: Record<string, unknown>;
  }): Promise<User> {
    // Validate email uniqueness
    const existingUser = Array.from(this.users.values())
      .find(u => u.email === userData.email || u.username === userData.username);
    
    if (existingUser) {
      throw new Error('User with this email or username already exists');
    }
    
    // Validate password policy
    this.validatePassword(userData.password);
    
    // Hash password
    const passwordHash = await bcrypt.hash(userData.password, this.config.bcryptRounds);
    
    const user: User = {
      id: crypto.randomUUID(),
      email: userData.email,
      username: userData.username,
      passwordHash,
      roles: userData.roles || ['user'],
      permissions: userData.permissions || [],
      isActive: true,
      isEmailVerified: false,
      isTwoFactorEnabled: false,
      failedLoginAttempts: 0,
      metadata: userData.metadata || {},
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.users.set(user.id, user);
    
    this.emit('userCreated', {
      userId: user.id,
      email: user.email,
      roles: user.roles
    });
    
    return user;
  }
  
  public async updateUser(
    userId: string,
    updates: Partial<Pick<User, 'email' | 'username' | 'roles' | 'permissions' | 'isActive' | 'metadata'>>
  ): Promise<User> {
    const user = this.users.get(userId);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    Object.assign(user, updates, { updatedAt: new Date() });
    
    this.emit('userUpdated', {
      userId,
      updates
    });
    
    return user;
  }
  
  public async deleteUser(userId: string): Promise<void> {
    const user = this.users.get(userId);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Invalidate all sessions
    await this.invalidateAllUserSessions(userId);
    
    // Remove user
    this.users.delete(userId);
    this.passwordHistory.delete(userId);
    
    this.emit('userDeleted', { userId });
  }
  
  public async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = this.users.get(userId);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    
    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }
    
    // Validate new password policy
    this.validatePassword(newPassword);
    
    // Check password history
    const userPasswordHistory = this.passwordHistory.get(userId) || [];
    
    for (const oldHash of userPasswordHistory) {
      const isReused = await bcrypt.compare(newPassword, oldHash);
      if (isReused) {
        throw new Error(`Password cannot be one of the last ${this.config.passwordPolicy.preventReuse} passwords`);
      }
    }
    
    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, this.config.bcryptRounds);
    
    // Update password history
    userPasswordHistory.unshift(user.passwordHash);
    if (userPasswordHistory.length > this.config.passwordPolicy.preventReuse) {
      userPasswordHistory.pop();
    }
    this.passwordHistory.set(userId, userPasswordHistory);
    
    // Update user
    user.passwordHash = newPasswordHash;
    user.updatedAt = new Date();
    
    // Invalidate all sessions except current (if provided)
    await this.invalidateAllUserSessions(userId);
    
    this.logSecurityEvent({
      type: 'password_changed',
      userId,
      ipAddress: '0.0.0.0', // Would be provided from request context
      userAgent: 'system',
      success: true,
      details: {},
      timestamp: new Date()
    });
    
    this.emit('passwordChanged', { userId });
  }
  
  // Authentication
  
  public async login(
    credentials: LoginCredentials,
    clientInfo: {
      ipAddress: string;
      userAgent: string;
      deviceId?: string;
    }
  ): Promise<AuthToken> {
    const user = Array.from(this.users.values())
      .find(u => u.email === credentials.email);
    
    if (!user) {
      await this.logFailedLogin(credentials.email, clientInfo, 'User not found');
      throw new Error('Invalid credentials');
    }
    
    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      await this.logFailedLogin(credentials.email, clientInfo, 'Account locked');
      throw new Error('Account is temporarily locked due to multiple failed login attempts');
    }
    
    // Check if account is active
    if (!user.isActive) {
      await this.logFailedLogin(credentials.email, clientInfo, 'Account inactive');
      throw new Error('Account is deactivated');
    }
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(credentials.password, user.passwordHash);
    
    if (!isPasswordValid) {
      await this.handleFailedLogin(user, clientInfo);
      throw new Error('Invalid credentials');
    }
    
    // Verify 2FA if enabled
    if (user.isTwoFactorEnabled) {
      if (!credentials.twoFactorCode) {
        throw new Error('Two-factor authentication code required');
      }
      
      const isCodeValid = speakeasy.totp.verify({
        secret: user.twoFactorSecret!,
        encoding: 'base32',
        token: credentials.twoFactorCode,
        window: 2 // Allow 2 time steps (60 seconds) tolerance
      });
      
      if (!isCodeValid) {
        await this.logFailedLogin(credentials.email, clientInfo, 'Invalid 2FA code');
        throw new Error('Invalid two-factor authentication code');
      }
    }
    
    // Reset failed login attempts
    user.failedLoginAttempts = 0;
    user.lockedUntil = undefined;
    user.lastLoginAt = new Date();
    
    // Create session
    const session = await this.createSession(user.id, clientInfo);
    
    // Generate tokens
    const tokens = await this.generateTokens(user, session);
    
    this.logSecurityEvent({
      type: 'login',
      userId: user.id,
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
      success: true,
      details: {
        sessionId: session.id,
        twoFactorUsed: user.isTwoFactorEnabled
      },
      timestamp: new Date()
    });
    
    this.emit('userLogin', {
      userId: user.id,
      sessionId: session.id,
      ipAddress: clientInfo.ipAddress
    });
    
    return tokens;
  }
  
  public async logout(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      throw new Error('Session not found');
    }
    
    // Invalidate session
    session.isActive = false;
    
    // Remove refresh token
    const refreshTokenEntry = Array.from(this.refreshTokens.entries())
      .find(([, userId]) => userId === session.userId);
    
    if (refreshTokenEntry) {
      this.refreshTokens.delete(refreshTokenEntry[0]);
    }
    
    this.logSecurityEvent({
      type: 'logout',
      userId: session.userId,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      success: true,
      details: { sessionId },
      timestamp: new Date()
    });
    
    this.emit('userLogout', {
      userId: session.userId,
      sessionId
    });
  }
  
  public async refreshToken(refreshToken: string): Promise<AuthToken> {
    const userId = this.refreshTokens.get(refreshToken);
    
    if (!userId) {
      throw new Error('Invalid refresh token');
    }
    
    const user = this.users.get(userId);
    
    if (!user || !user.isActive) {
      this.refreshTokens.delete(refreshToken);
      throw new Error('User not found or inactive');
    }
    
    // Find active session
    const session = Array.from(this.sessions.values())
      .find(s => s.userId === userId && s.isActive);
    
    if (!session) {
      this.refreshTokens.delete(refreshToken);
      throw new Error('No active session found');
    }
    
    // Remove old refresh token
    this.refreshTokens.delete(refreshToken);
    
    // Generate new tokens
    const tokens = await this.generateTokens(user, session);
    
    this.logSecurityEvent({
      type: 'token_refresh',
      userId,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      success: true,
      details: { sessionId: session.id },
      timestamp: new Date()
    });
    
    return tokens;
  }
  
  // Token Management
  
  private async generateTokens(user: User, session: Session): Promise<AuthToken> {
    const accessTokenPayload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      roles: user.roles,
      permissions: user.permissions,
      sessionId: session.id,
      iat: Math.floor(Date.now() / 1000)
    };
    
    const refreshTokenPayload = {
      sub: user.id,
      sessionId: session.id,
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000)
    };
    
    const accessToken = jwt.sign(accessTokenPayload, this.config.jwtSecret, {
      expiresIn: this.config.accessTokenExpiry,
      issuer: 'workflow-platform',
      audience: 'workflow-api'
    });
    
    const refreshToken = jwt.sign(refreshTokenPayload, this.config.jwtRefreshSecret, {
      expiresIn: this.config.refreshTokenExpiry,
      issuer: 'workflow-platform',
      audience: 'workflow-api'
    });
    
    // Store refresh token
    this.refreshTokens.set(refreshToken, user.id);
    
    return {
      accessToken,
      refreshToken,
      expiresIn: this.parseExpiry(this.config.accessTokenExpiry),
      tokenType: 'Bearer',
      scope: user.permissions
    };
  }
  
  public async verifyToken(token: string): Promise<jwt.JwtPayload | string> {
    try {
      const decoded = jwt.verify(token, this.config.jwtSecret, {
        issuer: 'workflow-platform',
        audience: 'workflow-api'
      });
      
      return decoded;
    } catch {
      throw new Error('Invalid or expired token');
    }
  }
  
  // Session Management
  
  private async createSession(
    userId: string,
    clientInfo: {
      ipAddress: string;
      userAgent: string;
      deviceId?: string;
    }
  ): Promise<Session> {
    // Check concurrent session limit
    const userSessions = Array.from(this.sessions.values())
      .filter(s => s.userId === userId && s.isActive);
    
    if (userSessions.length >= this.config.sessionConfig.maxConcurrentSessions) {
      // Invalidate oldest session
      const oldestSession = userSessions.sort((a, b) => 
        a.lastAccessedAt.getTime() - b.lastAccessedAt.getTime()
      )[0];
      
      oldestSession.isActive = false;
    }
    
    const session: Session = {
      id: crypto.randomUUID(),
      userId,
      deviceId: clientInfo.deviceId || crypto.randomUUID(),
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
      isActive: true,
      createdAt: new Date(),
      lastAccessedAt: new Date(),
      expiresAt: new Date(Date.now() + this.config.sessionConfig.sessionTimeout),
      metadata: {}
    };
    
    this.sessions.set(session.id, session);
    
    return session;
  }
  
  public async getSession(sessionId: string): Promise<Session | null> {
    const session = this.sessions.get(sessionId);
    
    if (!session || !session.isActive) {
      return null;
    }
    
    // Check expiration
    if (session.expiresAt < new Date()) {
      session.isActive = false;
      return null;
    }
    
    // Update last accessed time (sliding expiration)
    if (this.config.sessionConfig.slidingExpiration) {
      session.lastAccessedAt = new Date();
      session.expiresAt = new Date(Date.now() + this.config.sessionConfig.sessionTimeout);
    }
    
    return session;
  }
  
  public async invalidateSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    
    if (session) {
      session.isActive = false;
    }
  }
  
  public async invalidateAllUserSessions(userId: string): Promise<void> {
    const userSessions = Array.from(this.sessions.values())
      .filter(s => s.userId === userId);
    
    for (const session of userSessions) {
      session.isActive = false;
    }
    
    // Remove all refresh tokens for user
    const userRefreshTokens = Array.from(this.refreshTokens.entries())
      .filter(([, uid]) => uid === userId);
    
    for (const [refreshToken] of userRefreshTokens) {
      this.refreshTokens.delete(refreshToken);
    }
  }
  
  // Two-Factor Authentication
  
  public async enableTwoFactor(userId: string): Promise<{
    secret: string;
    qrCodeUrl: string;
    backupCodes: string[];
  }> {
    const user = this.users.get(userId);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    if (user.isTwoFactorEnabled) {
      throw new Error('Two-factor authentication is already enabled');
    }
    
    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `${this.config.twoFactorIssuer}:${user.email}`,
      issuer: this.config.twoFactorIssuer,
      length: 32
    });
    
    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);
    
    // Generate backup codes
    const backupCodes = Array.from({ length: 10 }, () => 
      crypto.randomBytes(4).toString('hex').toUpperCase()
    );
    
    // Store secret (not yet enabled)
    user.twoFactorSecret = secret.base32;
    user.metadata.backupCodes = backupCodes;
    
    return {
      secret: secret.base32,
      qrCodeUrl,
      backupCodes
    };
  }
  
  public async confirmTwoFactor(userId: string, verificationCode: string): Promise<void> {
    const user = this.users.get(userId);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    if (!user.twoFactorSecret) {
      throw new Error('Two-factor authentication setup not initiated');
    }
    
    // Verify the code
    const isCodeValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: verificationCode,
      window: 2
    });
    
    if (!isCodeValid) {
      throw new Error('Invalid verification code');
    }
    
    // Enable 2FA
    user.isTwoFactorEnabled = true;
    user.updatedAt = new Date();
    
    this.emit('twoFactorEnabled', { userId });
  }
  
  public async disableTwoFactor(userId: string, verificationCode: string): Promise<void> {
    const user = this.users.get(userId);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    if (!user.isTwoFactorEnabled) {
      throw new Error('Two-factor authentication is not enabled');
    }
    
    // Verify the code
    const isCodeValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret!,
      encoding: 'base32',
      token: verificationCode,
      window: 2
    });
    
    if (!isCodeValid) {
      throw new Error('Invalid verification code');
    }
    
    // Disable 2FA
    user.isTwoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    delete user.metadata.backupCodes;
    user.updatedAt = new Date();
    
    this.emit('twoFactorDisabled', { userId });
  }
  
  // Security Utilities
  
  private validatePassword(password: string): void {
    const policy = this.config.passwordPolicy;
    
    if (password.length < policy.minLength) {
      throw new Error(`Password must be at least ${policy.minLength} characters long`);
    }
    
    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      throw new Error('Password must contain at least one uppercase letter');
    }
    
    if (policy.requireLowercase && !/[a-z]/.test(password)) {
      throw new Error('Password must contain at least one lowercase letter');
    }
    
    if (policy.requireNumbers && !/\d/.test(password)) {
      throw new Error('Password must contain at least one number');
    }
    
    if (policy.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      throw new Error('Password must contain at least one special character');
    }
  }
  
  private async handleFailedLogin(
    user: User,
    clientInfo: { ipAddress: string; userAgent: string }
  ): Promise<void> {
    user.failedLoginAttempts++;
    
    if (user.failedLoginAttempts >= this.config.maxFailedAttempts) {
      user.lockedUntil = new Date(Date.now() + this.config.lockoutDuration);
      
      this.logSecurityEvent({
        type: 'account_locked',
        userId: user.id,
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
        success: false,
        details: {
          failedAttempts: user.failedLoginAttempts,
          lockedUntil: user.lockedUntil
        },
        timestamp: new Date()
      });
      
      this.emit('accountLocked', {
        userId: user.id,
        failedAttempts: user.failedLoginAttempts,
        lockedUntil: user.lockedUntil
      });
    }
    
    await this.logFailedLogin(user.email, clientInfo, 'Invalid password');
  }
  
  private async logFailedLogin(
    email: string,
    clientInfo: { ipAddress: string; userAgent: string },
    reason: string
  ): Promise<void> {
    this.logSecurityEvent({
      type: 'failed_login',
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
      success: false,
      details: { email, reason },
      timestamp: new Date()
    });
  }
  
  private logSecurityEvent(event: SecurityEvent): void {
    this.securityEvents.push(event);
    
    // Keep only last 10,000 events
    if (this.securityEvents.length > 10000) {
      this.securityEvents.shift();
    }
    
    this.emit('securityEvent', event);
  }
  
  private parseExpiry(expiry: string): number {
    // Parse JWT expiry string to seconds
    const match = expiry.match(/^(\d+)([smhdw])$/);
    if (!match) return 3600; // Default 1 hour
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    const multipliers = {
      's': 1,
      'm': 60,
      'h': 3600,
      'd': 86400,
      'w': 604800
    };
    
    return value * (multipliers[unit as keyof typeof multipliers] || 3600);
  }
  
  // Public API
  
  public getUser(userId: string): User | undefined {
    return this.users.get(userId);
  }
  
  public getUserByEmail(email: string): User | undefined {
    return Array.from(this.users.values()).find(u => u.email === email);
  }
  
  public getAllUsers(): User[] {
    return Array.from(this.users.values());
  }
  
  public getUserSessions(userId: string): Session[] {
    return Array.from(this.sessions.values())
      .filter(s => s.userId === userId && s.isActive);
  }
  
  public getSecurityEvents(limit: number = 100): SecurityEvent[] {
    return this.securityEvents.slice(-limit);
  }
  
  public getStats(): {
    totalUsers: number;
    activeUsers: number;
    activeSessions: number;
    securityEvents: number;
    lockedAccounts: number;
  } {
    const users = Array.from(this.users.values());
    const now = new Date();
    
    return {
      totalUsers: users.length,
      activeUsers: users.filter(u => u.isActive).length,
      activeSessions: Array.from(this.sessions.values()).filter(s => s.isActive).length,
      securityEvents: this.securityEvents.length,
      lockedAccounts: users.filter(u => u.lockedUntil && u.lockedUntil > now).length
    };
  }
}