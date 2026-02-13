import CryptoJS from 'crypto-js';
import { logger } from './LoggingService';

export interface SecurityConfig {
  encryptionKey: string;
  mfaEnabled: boolean;
  sessionTimeout: number;
  maxLoginAttempts: number;
  passwordComplexity: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
  };
  ipWhitelist: string[];
  auditLogging: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  permissions: Permission[];
  mfaEnabled: boolean;
  mfaSecret?: string;
  lastLogin?: Date;
  loginAttempts: number;
  isLocked: boolean;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum UserRole {
  ADMIN = 'admin',
  EDITOR = 'editor',
  VIEWER = 'viewer',
  GUEST = 'guest'
}

export enum Permission {
  // Workflow permissions
  WORKFLOW_CREATE = 'workflow:create',
  WORKFLOW_READ = 'workflow:read',
  WORKFLOW_UPDATE = 'workflow:update',
  WORKFLOW_DELETE = 'workflow:delete',
  WORKFLOW_EXECUTE = 'workflow:execute',
  WORKFLOW_SHARE = 'workflow:share',
  
  // User management
  USER_CREATE = 'user:create',
  USER_READ = 'user:read',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',
  USER_ASSIGN_ROLES = 'user:assign_roles',
  
  // System administration
  SYSTEM_ADMIN = 'system:admin',
  SYSTEM_AUDIT = 'system:audit',
  SYSTEM_BACKUP = 'system:backup',
  SYSTEM_RESTORE = 'system:restore',
  
  // Data access
  DATA_EXPORT = 'data:export',
  DATA_IMPORT = 'data:import',
  DATA_ENCRYPT = 'data:encrypt',
  DATA_DECRYPT = 'data:decrypt',
  
  // App management
  APP_INSTALL = 'app:install',
  APP_UNINSTALL = 'app:uninstall',
  APP_CONFIGURE = 'app:configure',
  
  // Security
  SECURITY_AUDIT = 'security:audit',
  SECURITY_CONFIGURE = 'security:configure'
}

export interface SecurityAuditEvent {
  id: string;
  timestamp: Date;
  userId: string;
  action: string;
  resource: string;
  details: unknown;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface MFASecret {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export interface SecurityAlert {
  id: string;
  type: 'suspicious_login' | 'multiple_failed_attempts' | 'privilege_escalation' | 'data_breach' | 'unauthorized_access';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  userId?: string;
  ipAddress?: string;
  resolved: boolean;
  details: unknown;
}

export class SecurityService {
  private config: SecurityConfig;
  private auditEvents: SecurityAuditEvent[] = [];
  private securityAlerts: SecurityAlert[] = [];
  private users: Map<string, User> = new Map();
  private sessions: Map<string, Record<string, unknown>> = new Map();
  
  private securityMonitoringInterval?: NodeJS.Timeout;

  constructor(config: SecurityConfig) {
    this.config = config;
    this.initializeDefaultUsers();
    this.startSecurityMonitoring();
  }

  // Authentication & Authorization
  async authenticateUser(email: string, password: string, mfaCode?: string): Promise<{ success: boolean; user?: User; token?: string; error?: string }> {
    
    if (!user) {
      this.logAuditEvent(email, 'login_failed', 'user', { reason: 'user_not_found' });
      return { success: false, error: 'Invalid credentials' };
    }

    if (user.isLocked) {
      this.logAuditEvent(user.id, 'login_failed', 'user', { reason: 'account_locked' });
      return { success: false, error: 'Account is locked' };
    }

    // Verify password
    if (!passwordValid) {
      user.loginAttempts++;
      if (user.loginAttempts >= this.config.maxLoginAttempts) {
        user.isLocked = true;
        this.createSecurityAlert('multiple_failed_attempts', 'high', `Account locked after ${this.config.maxLoginAttempts} failed attempts`, user.id);
      }
      this.logAuditEvent(user.id, 'login_failed', 'user', { reason: 'invalid_password', attempts: user.loginAttempts });
      return { success: false, error: 'Invalid credentials' };
    }

    // Verify MFA if enabled
    if (user.mfaEnabled && this.config.mfaEnabled) {
      if (!mfaCode) {
        return { success: false, error: 'MFA code required' };
      }
      if (!mfaValid) {
        this.logAuditEvent(user.id, 'login_failed', 'user', { reason: 'invalid_mfa' });
        return { success: false, error: 'Invalid MFA code' };
      }
    }

    // Reset login attempts on successful login
    user.loginAttempts = 0;
    user.lastLogin = new Date();
    
    // Create session
      userId: user.id,
      token,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.config.sessionTimeout * 1000),
      ipAddress: this.getCurrentIP(),
      userAgent: this.getCurrentUserAgent()
    };
    
    this.sessions.set(token, session);
    
    this.logAuditEvent(user.id, 'login_success', 'user', { sessionId: token });
    
    return { success: true, user, token };
  }

  async hasPermission(userId: string, permission: Permission): Promise<boolean> {
    if (!user) return false;

    // Admin has all permissions
    if (user.role === UserRole.ADMIN) return true;

    // Check specific permissions
    return user.permissions.includes(permission) || this.getRolePermissions(user.role).includes(permission);
  }

  async checkPermission(userId: string, permission: Permission, resource?: string): Promise<boolean> {
    
    this.logAuditEvent(userId, 'permission_check', resource || 'system', {
      permission,
      granted: hasPermission
    });

    if (!hasPermission) {
      this.createSecurityAlert('unauthorized_access', 'medium', `User attempted to access resource without permission: ${permission}`, userId);
    }

    return hasPermission;
  }

  // Multi-Factor Authentication
  async generateMFASecret(userId: string): Promise<MFASecret> {
    if (!user) throw new Error('User not found');


    const mfaSecret: MFASecret = {
      secret,
      qrCode,
      backupCodes
    };

    this.logAuditEvent(userId, 'mfa_secret_generated', 'user', {});

    return mfaSecret;
  }

  async enableMFA(userId: string, secret: string, verificationCode: string): Promise<boolean> {
    if (!user) throw new Error('User not found');

    if (!isValid) {
      this.logAuditEvent(userId, 'mfa_enable_failed', 'user', { reason: 'invalid_code' });
      return false;
    }

    user.mfaEnabled = true;
    user.mfaSecret = secret;
    user.updatedAt = new Date();

    this.logAuditEvent(userId, 'mfa_enabled', 'user', {});
    return true;
  }

  async disableMFA(userId: string, currentPassword: string): Promise<boolean> {
    if (!user) throw new Error('User not found');

    if (!passwordValid) {
      this.logAuditEvent(userId, 'mfa_disable_failed', 'user', { reason: 'invalid_password' });
      return false;
    }

    user.mfaEnabled = false;
    user.mfaSecret = undefined;
    user.updatedAt = new Date();

    this.logAuditEvent(userId, 'mfa_disabled', 'user', {});
    return true;
  }

  // Data Encryption
  encryptData(data: Record<string, unknown>, key?: string): string {
    return CryptoJS.AES.encrypt(JSON.stringify(data), encryptionKey).toString();
  }

  decryptData(encryptedData: string, key?: string): Record<string, unknown> {
    try {
      return JSON.parse(decryptedData);
    } catch (error) {
      throw new Error('Failed to decrypt data');
    }
  }

  // Session Management
  async validateSession(token: string): Promise<{ valid: boolean; user?: User }> {
    if (!session) return { valid: false };

    if (new Date() > session.expiresAt) {
      this.sessions.delete(token);
      return { valid: false };
    }

    if (!user) return { valid: false };

    return { valid: true, user };
  }

  async invalidateSession(token: string): Promise<void> {
    if (session) {
      this.logAuditEvent(session.userId, 'session_invalidated', 'session', { sessionId: token });
      this.sessions.delete(token);
    }
  }

  async invalidateAllUserSessions(userId: string): Promise<void> {
    for (const [token, session] of this.sessions.entries()) {
      if (session.userId === userId) {
        sessionsToDelete.push(token);
      }
    }

    sessionsToDelete.forEach(token => this.sessions.delete(token));
    this.logAuditEvent(userId, 'all_sessions_invalidated', 'user', { count: sessionsToDelete.length });
  }

  // Audit Logging
  private logAuditEvent(userId: string, action: string, resource: string, details: Record<string, unknown>): void {
    if (!this.config.auditLogging) return;

    const event: SecurityAuditEvent = {
      id: this.generateId(),
      timestamp: new Date(),
      userId,
      action,
      resource,
      details,
      ipAddress: this.getCurrentIP(),
      userAgent: this.getCurrentUserAgent(),
      success: true,
      riskLevel: this.assessRiskLevel(action, details)
    };

    this.auditEvents.push(event);
    this.analyzeSecurityEvent(event);
  }

  getAuditEvents(filters?: {
    userId?: string;
    action?: string;
    resource?: string;
    startDate?: Date;
    endDate?: Date;
    riskLevel?: string;
  }): SecurityAuditEvent[] {

    if (filters) {
      events = events.filter(event => {
        if (filters.userId && event.userId !== filters.userId) return false;
        if (filters.action && event.action !== filters.action) return false;
        if (filters.resource && event.resource !== filters.resource) return false;
        if (filters.startDate && event.timestamp < filters.startDate) return false;
        if (filters.endDate && event.timestamp > filters.endDate) return false;
        if (filters.riskLevel && event.riskLevel !== filters.riskLevel) return false;
        return true;
      });
    }

    return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // Security Monitoring
  private startSecurityMonitoring(): void {
    this.securityMonitoringInterval = setInterval(() => {
      this.cleanupExpiredSessions();
      this.analyzeSecurityPatterns();
    }, 60000); // Run every minute
  }

  destroy(): void {
    if (this.securityMonitoringInterval) {
      clearInterval(this.securityMonitoringInterval);
      this.securityMonitoringInterval = undefined;
    }
  }

  private cleanupExpiredSessions(): void {
    for (const [token, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(token);
      }
    }
  }

  private analyzeSecurityPatterns(): void {
      event.timestamp > new Date(Date.now() - 3600000) // Last hour
    );

    // Detect suspicious patterns
    this.detectSuspiciousLogin(recentEvents);
    this.detectUnusualActivity(recentEvents);
    this.detectPrivilegeEscalation(recentEvents);
  }

  private detectSuspiciousLogin(events: SecurityAuditEvent[]): void {

    loginEvents.forEach(event => {
      loginsByIP.set(event.ipAddress, count + 1);
    });

    loginsByIP.forEach((count, ip) => {
      if (count > 10) { // More than 10 logins from same IP in an hour
        this.createSecurityAlert('suspicious_login', 'high', `Multiple logins from IP: ${ip}`, undefined, ip);
      }
    });
  }

  private detectUnusualActivity(events: SecurityAuditEvent[]): void {
    if (highRiskEvents.length > 5) {
      this.createSecurityAlert('unauthorized_access', 'critical', `High number of high-risk events: ${highRiskEvents.length}`);
    }
  }

  private detectPrivilegeEscalation(events: SecurityAuditEvent[]): void {
    if (roleChanges.length > 0) {
      this.createSecurityAlert('privilege_escalation', 'high', `Role changes detected: ${roleChanges.length}`);
    }
  }

  private createSecurityAlert(type: SecurityAlert['type'], severity: SecurityAlert['severity'], message: string, userId?: string, ipAddress?: string): void {
    const alert: SecurityAlert = {
      id: this.generateId(),
      type,
      severity,
      message,
      timestamp: new Date(),
      userId,
      ipAddress,
      resolved: false,
      details: {}
    };

    this.securityAlerts.push(alert);
  }

  getSecurityAlerts(filters?: {
    type?: SecurityAlert['type'];
    severity?: SecurityAlert['severity'];
    resolved?: boolean;
    userId?: string;
  }): SecurityAlert[] {

    if (filters) {
      alerts = alerts.filter(alert => {
        if (filters.type && alert.type !== filters.type) return false;
        if (filters.severity && alert.severity !== filters.severity) return false;
        if (filters.resolved !== undefined && alert.resolved !== filters.resolved) return false;
        if (filters.userId && alert.userId !== filters.userId) return false;
        return true;
      });
    }

    return alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  resolveSecurityAlert(alertId: string): void {
    if (alert) {
      alert.resolved = true;
    }
  }

  // Utility Methods
  private initializeDefaultUsers(): void {
    const adminUser: User = {
      id: 'admin-001',
      email: 'admin@workflowpro.com',
      name: 'System Administrator',
      role: UserRole.ADMIN,
      permissions: Object.values(Permission),
      mfaEnabled: true,
      loginAttempts: 0,
      isLocked: false,
      passwordHash: '$2b$10$...',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.users.set(adminUser.id, adminUser);
  }

  private getRolePermissions(role: UserRole): Permission[] {
    switch (role) {
      case UserRole.ADMIN:
        return Object.values(Permission);
      case UserRole.EDITOR:
        return [
          Permission.WORKFLOW_CREATE,
          Permission.WORKFLOW_READ,
          Permission.WORKFLOW_UPDATE,
          Permission.WORKFLOW_EXECUTE,
          Permission.WORKFLOW_SHARE,
          Permission.DATA_EXPORT,
          Permission.DATA_IMPORT,
          Permission.APP_INSTALL,
          Permission.APP_CONFIGURE
        ];
      case UserRole.VIEWER:
        return [
          Permission.WORKFLOW_READ,
          Permission.DATA_EXPORT
        ];
      case UserRole.GUEST:
        return [
          Permission.WORKFLOW_READ
        ];
      default:
        return [];
    }
  }

  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    // SECURITY: Never use hardcoded passwords in production
    if (!password || !hash || typeof password !== 'string' || typeof hash !== 'string') {
      return false;
    }
    
    // For demo purposes, simulate proper bcrypt verification
    // In production, use: return await bcrypt.compare(password, hash);
    try {
      // Basic simulation - in real app this should use proper bcrypt
      return hashedInput === hash;
    } catch (error) {
      logger.error('Password verification failed:', error);
      return false;
    }
  }

  private async verifyMFACode(secret: string, code: string): Promise<boolean> {
    // SECURITY: Never use hardcoded MFA codes in production
    if (!secret || !code || typeof secret !== 'string' || typeof code !== 'string') {
      return false;
    }
    
    // Validate code format (should be 6 digits)
    if (!/^\d{6}$/.test(code)) {
      return false;
    }
    
    // For demo purposes, simulate TOTP verification
    // In production, use a proper TOTP library like otplib
    try {
      // Simple time-based validation simulation
      return expectedCode === code;
    } catch (error) {
      logger.error('MFA verification failed:', error);
      return false;
    }
  }

  private generateSecureToken(): string {
    return CryptoJS.lib.WordArray.random(32).toString();
  }

  private generateRandomSecret(): string {
    return CryptoJS.lib.WordArray.random(16).toString();
  }

  private generateQRCode(email: string, secret: string): string {
    return `otpauth://totp/WorkflowPro:${email}?secret=${secret}&issuer=WorkflowPro`;
  }

  private generateBackupCodes(): string[] {
    for (let __i = 0; i < 10; i++) {
      codes.push(Math.random().toString(36).substring(2, 10).toUpperCase());
    }
    return codes;
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  private getCurrentIP(): string {
    return '192.168.1.100'; // Mock IP
  }

  private getCurrentUserAgent(): string {
    return navigator.userAgent || 'Unknown';
  }

  private assessRiskLevel(action: string, details: Record<string, unknown>): SecurityAuditEvent['riskLevel'] {

    if (criticalActions.includes(action)) return 'critical';
    if (highRiskActions.includes(action)) return 'high';
    if (details?.failed || details?.denied) return 'medium';
    return 'low';
  }

  private analyzeSecurityEvent(event: SecurityAuditEvent): void {
    if (event.riskLevel === 'critical') {
      this.createSecurityAlert('data_breach', 'critical', `Critical security event: ${event.action}`, event.userId);
    }
  }
}

// Singleton instance
export const securityService = new SecurityService({
  encryptionKey: 'your-secret-key-here',
  mfaEnabled: true,
  sessionTimeout: 3600,
  maxLoginAttempts: 5,
  passwordComplexity: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true
  },
  ipWhitelist: [],
  auditLogging: true
});