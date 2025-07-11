/**
 * Security & Encryption Manager
 * Comprehensive security system for data protection
 */

interface EncryptionResult {
  encryptedData: string;
  iv: string;
  authTag: string;
}

interface AuditLogEntry {
  id: string;
  userId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface SecurityPolicy {
  passwordMinLength: number;
  passwordRequireUppercase: boolean;
  passwordRequireLowercase: boolean;
  passwordRequireNumbers: boolean;
  passwordRequireSpecialChars: boolean;
  sessionTimeout: number;
  maxLoginAttempts: number;
  lockoutDuration: number;
  enableTwoFactor: boolean;
  allowedOrigins: string[];
  rateLimits: {
    api: number;
    webhook: number;
    execution: number;
  };
}

export class SecurityManager {
  private encryptionKey: string;
  private auditLogs: AuditLogEntry[] = [];
  private failedAttempts: Map<string, { count: number; lastAttempt: Date }> = new Map();
  
  private securityPolicy: SecurityPolicy = {
    passwordMinLength: 8,
    passwordRequireUppercase: true,
    passwordRequireLowercase: true,
    passwordRequireNumbers: true,
    passwordRequireSpecialChars: true,
    sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minutes
    enableTwoFactor: false,
    allowedOrigins: ['http://localhost:3000', 'https://workflowbuilder.com'],
    rateLimits: {
      api: 1000, // requests per hour
      webhook: 10000, // requests per hour
      execution: 100 // executions per hour
    }
  };

  constructor() {
    this.encryptionKey = this.getOrGenerateEncryptionKey();
    this.initializeSecurityHeaders();
    this.startSecurityMonitoring();
  }

  // ================================
  // ENCRYPTION & DECRYPTION
  // ================================

  async encrypt(data: string): Promise<EncryptionResult> {
    try {
      // In a real implementation, this would use Web Crypto API or Node.js crypto
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      
      // Generate random IV
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      // Import key for AES-GCM
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(this.encryptionKey.slice(0, 32)),
        { name: 'AES-GCM' },
        false,
        ['encrypt']
      );
      
      // Encrypt data
      const encryptedBuffer = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        dataBuffer
      );
      
      const encryptedArray = new Uint8Array(encryptedBuffer);
      
      return {
        encryptedData: this.bufferToBase64(encryptedArray),
        iv: this.bufferToBase64(iv),
        authTag: 'mock-auth-tag' // Would be extracted from GCM in real implementation
      };
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  async decrypt(encryptionResult: EncryptionResult): Promise<string> {
    try {
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      
      // Convert base64 back to buffers
      const encryptedData = this.base64ToBuffer(encryptionResult.encryptedData);
      const iv = this.base64ToBuffer(encryptionResult.iv);
      
      // Import key for AES-GCM
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(this.encryptionKey.slice(0, 32)),
        { name: 'AES-GCM' },
        false,
        ['decrypt']
      );
      
      // Decrypt data
      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        encryptedData
      );
      
      return decoder.decode(decryptedBuffer);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  // Hash passwords securely
  async hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + 'salt-workflowbuilder-pro');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return this.bufferToBase64(new Uint8Array(hashBuffer));
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    const computedHash = await this.hashPassword(password);
    return computedHash === hash;
  }

  // ================================
  // AUDIT LOGGING
  // ================================

  async logAction(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
    const auditEntry: AuditLogEntry = {
      id: this.generateSecureId(),
      timestamp: new Date().toISOString(),
      ...entry
    };

    this.auditLogs.push(auditEntry);
    
    // Keep only last 10000 entries in memory
    if (this.auditLogs.length > 10000) {
      this.auditLogs = this.auditLogs.slice(-10000);
    }

    // In production, this would be sent to a secure logging service
    console.log('🔒 Security Log:', auditEntry);

    // Alert on critical actions
    if (entry.severity === 'critical') {
      await this.sendSecurityAlert(auditEntry);
    }
  }

  async getAuditLogs(filters: {
    userId?: string;
    action?: string;
    resourceType?: string;
    severity?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  } = {}): Promise<AuditLogEntry[]> {
    let filtered = [...this.auditLogs];

    if (filters.userId) {
      filtered = filtered.filter(log => log.userId === filters.userId);
    }
    if (filters.action) {
      filtered = filtered.filter(log => log.action.includes(filters.action));
    }
    if (filters.resourceType) {
      filtered = filtered.filter(log => log.resourceType === filters.resourceType);
    }
    if (filters.severity) {
      filtered = filtered.filter(log => log.severity === filters.severity);
    }
    if (filters.startDate) {
      filtered = filtered.filter(log => log.timestamp >= filters.startDate!);
    }
    if (filters.endDate) {
      filtered = filtered.filter(log => log.timestamp <= filters.endDate!);
    }

    return filtered
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, filters.limit || 100);
  }

  // ================================
  // AUTHENTICATION SECURITY
  // ================================

  async checkLoginAttempts(identifier: string): Promise<boolean> {
    const attempts = this.failedAttempts.get(identifier);
    
    if (!attempts) return true;
    
    const now = new Date();
    const timeSinceLastAttempt = now.getTime() - attempts.lastAttempt.getTime();
    
    // Reset if lockout period has passed
    if (timeSinceLastAttempt > this.securityPolicy.lockoutDuration) {
      this.failedAttempts.delete(identifier);
      return true;
    }
    
    return attempts.count < this.securityPolicy.maxLoginAttempts;
  }

  async recordFailedLogin(identifier: string): Promise<void> {
    const existing = this.failedAttempts.get(identifier);
    const attempts = {
      count: (existing?.count || 0) + 1,
      lastAttempt: new Date()
    };
    
    this.failedAttempts.set(identifier, attempts);
    
    await this.logAction({
      action: 'login_failed',
      resourceType: 'authentication',
      severity: attempts.count >= this.securityPolicy.maxLoginAttempts ? 'high' : 'medium',
      newValues: { identifier, attempts: attempts.count }
    });
  }

  async recordSuccessfulLogin(identifier: string): Promise<void> {
    this.failedAttempts.delete(identifier);
    
    await this.logAction({
      action: 'login_success',
      resourceType: 'authentication',
      severity: 'low',
      newValues: { identifier }
    });
  }

  // ================================
  // PASSWORD VALIDATION
  // ================================

  validatePassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (password.length < this.securityPolicy.passwordMinLength) {
      errors.push(`Password must be at least ${this.securityPolicy.passwordMinLength} characters long`);
    }
    
    if (this.securityPolicy.passwordRequireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (this.securityPolicy.passwordRequireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (this.securityPolicy.passwordRequireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (this.securityPolicy.passwordRequireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  // ================================
  // RATE LIMITING
  // ================================

  private rateLimitCounts: Map<string, { count: number; resetTime: number }> = new Map();

  async checkRateLimit(key: string, limit: number, windowMs: number = 60 * 60 * 1000): Promise<boolean> {
    const now = Date.now();
    const current = this.rateLimitCounts.get(key);
    
    if (!current || now > current.resetTime) {
      this.rateLimitCounts.set(key, { count: 1, resetTime: now + windowMs });
      return true;
    }
    
    if (current.count >= limit) {
      await this.logAction({
        action: 'rate_limit_exceeded',
        resourceType: 'api',
        severity: 'medium',
        newValues: { key, count: current.count, limit }
      });
      return false;
    }
    
    current.count++;
    return true;
  }

  // ================================
  // CORS & CSP SECURITY
  // ================================

  validateOrigin(origin: string): boolean {
    return this.securityPolicy.allowedOrigins.includes(origin) || 
           this.securityPolicy.allowedOrigins.includes('*');
  }

  generateCSPHeader(): string {
    return [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https:",
      "connect-src 'self' https://api.workflowbuilder.com wss:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ');
  }

  // ================================
  // INPUT SANITIZATION
  // ================================

  sanitizeInput(input: any): any {
    if (typeof input === 'string') {
      return input
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/<[^>]*>/g, '')
        .trim();
    }
    
    if (Array.isArray(input)) {
      return input.map(item => this.sanitizeInput(item));
    }
    
    if (typeof input === 'object' && input !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(input)) {
        sanitized[this.sanitizeInput(key)] = this.sanitizeInput(value);
      }
      return sanitized;
    }
    
    return input;
  }

  validateJSON(jsonString: string): { valid: boolean; error?: string } {
    try {
      JSON.parse(jsonString);
      return { valid: true };
    } catch (error) {
      return { valid: false, error: 'Invalid JSON format' };
    }
  }

  // ================================
  // SECURITY MONITORING
  // ================================

  private securityMetrics = {
    loginAttempts: 0,
    failedLogins: 0,
    rateLimitViolations: 0,
    encryptionOperations: 0,
    auditLogEntries: 0
  };

  getSecurityMetrics() {
    return {
      ...this.securityMetrics,
      activeSessions: this.getActiveSessionCount(),
      auditLogCount: this.auditLogs.length,
      rateLimitEntries: this.rateLimitCounts.size
    };
  }

  // ================================
  // PRIVATE HELPER METHODS
  // ================================

  private getOrGenerateEncryptionKey(): string {
    let key = localStorage.getItem('encryption_key');
    if (!key) {
      key = this.generateSecureKey(64);
      localStorage.setItem('encryption_key', key);
    }
    return key;
  }

  private generateSecureKey(length: number): string {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  private generateSecureId(): string {
    return 'sec_' + this.generateSecureKey(16);
  }

  private bufferToBase64(buffer: Uint8Array): string {
    const binary = Array.from(buffer, byte => String.fromCharCode(byte)).join('');
    return btoa(binary);
  }

  private base64ToBuffer(base64: string): Uint8Array {
    const binary = atob(base64);
    return new Uint8Array(Array.from(binary, char => char.charCodeAt(0)));
  }

  private initializeSecurityHeaders(): void {
    // In a real application, these would be set on the server
    console.log('🔒 Security headers initialized');
  }

  private startSecurityMonitoring(): void {
    setInterval(() => {
      this.cleanupOldData();
      this.monitorSecurityThreats();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  private cleanupOldData(): void {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    // Clean up expired rate limit entries
    for (const [key, data] of this.rateLimitCounts.entries()) {
      if (now > data.resetTime) {
        this.rateLimitCounts.delete(key);
      }
    }
    
    // Clean up old failed login attempts
    for (const [key, data] of this.failedAttempts.entries()) {
      if (now - data.lastAttempt.getTime() > oneHour) {
        this.failedAttempts.delete(key);
      }
    }
  }

  private async monitorSecurityThreats(): Promise<void> {
    // Monitor for unusual patterns
    const recentLogs = this.auditLogs.filter(log => 
      new Date().getTime() - new Date(log.timestamp).getTime() < 15 * 60 * 1000
    );
    
    const criticalEvents = recentLogs.filter(log => log.severity === 'critical');
    if (criticalEvents.length > 5) {
      await this.sendSecurityAlert({
        id: 'threat-detected',
        action: 'multiple_critical_events',
        resourceType: 'security',
        severity: 'critical',
        timestamp: new Date().toISOString(),
        newValues: { count: criticalEvents.length }
      });
    }
  }

  private async sendSecurityAlert(entry: AuditLogEntry): Promise<void> {
    console.warn('🚨 SECURITY ALERT:', entry);
    // In production, this would send alerts via email, Slack, etc.
  }

  private getActiveSessionCount(): number {
    // In production, this would query the session store
    return Math.floor(Math.random() * 50) + 10;
  }
}

// Export singleton instance
export const securityManager = new SecurityManager();

// Utility functions for common security operations
export const security = {
  encrypt: securityManager.encrypt.bind(securityManager),
  decrypt: securityManager.decrypt.bind(securityManager),
  hashPassword: securityManager.hashPassword.bind(securityManager),
  verifyPassword: securityManager.verifyPassword.bind(securityManager),
  sanitize: securityManager.sanitizeInput.bind(securityManager),
  validatePassword: securityManager.validatePassword.bind(securityManager),
  logAction: securityManager.logAction.bind(securityManager),
  checkRateLimit: securityManager.checkRateLimit.bind(securityManager)
};