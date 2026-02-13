/**
 * Security Event Logger
 * Specialized logger for security-related events with threat intelligence
 * Phase 2 Week 7: Audit Logging & Compliance
 */

import crypto from 'crypto';
import { EventEmitter } from 'events';
import { logger } from '../services/SimpleLogger';

/**
 * Security severity levels
 */
export enum SecuritySeverity {
  INFO = 'INFO',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

/**
 * Security event categories
 */
export enum SecurityCategory {
  AUTH = 'auth',
  RATE_LIMIT = 'rate_limit',
  TOKEN = 'token',
  PERMISSION = 'permission',
  DATA_EXFILTRATION = 'data_exfiltration',
  INJECTION = 'injection',
  API_ABUSE = 'api_abuse',
  CONFIG_TAMPERING = 'config_tampering',
  CREDENTIAL_COMPROMISE = 'credential_compromise',
  SESSION_HIJACKING = 'session_hijacking',
  SUSPICIOUS_PATTERN = 'suspicious_pattern'
}

/**
 * Threat indicators for risk assessment
 */
export interface ThreatIndicators {
  score: number; // 0-100
  indicators: string[];
  riskFactors: string[];
  confidence: number; // 0-1
}

/**
 * Automatic mitigation action
 */
export interface MitigationAction {
  action: string;
  automated: boolean;
  success: boolean;
  reason?: string;
  timestamp: Date;
}

/**
 * Request details for context
 */
export interface RequestDetails {
  method: string;
  path: string;
  headers: Record<string, string>;
  body?: any;
  query?: Record<string, any>;
}

/**
 * Main security event interface
 */
export interface SecurityEvent {
  id: string;
  timestamp: Date;
  severity: SecuritySeverity;
  category: SecurityCategory;
  eventType: string;
  description: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  requestDetails?: RequestDetails;
  threatIndicators: ThreatIndicators;
  mitigation?: MitigationAction;
  correlationId?: string;
  metadata?: Record<string, any>;
  immutableHash?: string;
  previousHash?: string;
}

/**
 * Threat analysis result
 */
export interface ThreatAnalysis {
  userId: string;
  timeWindow: number;
  eventCount: number;
  suspiciousEvents: number;
  riskScore: number;
  patterns: {
    failedLogins: number;
    unusualLocations: number;
    rapidRequests: number;
    abnormalBehavior: number;
  };
  recommendations: string[];
}

/**
 * IP reputation data
 */
export interface IPReputation {
  ipAddress: string;
  reputation: 'trusted' | 'suspicious' | 'blocked';
  score: number; // 0-100
  country: string;
  lastSeen: Date;
  violationCount: number;
}

/**
 * Rate limit tracking
 */
interface RateLimitEntry {
  userId?: string;
  ipAddress: string;
  resource: string;
  count: number;
  timestamp: Date;
}

/**
 * Login attempt tracking
 */
interface LoginAttempt {
  userId: string;
  ipAddress: string;
  country: string;
  timestamp: Date;
  success: boolean;
  userAgent: string;
}

/**
 * SecurityEventLogger class
 * Specialized logging for security events with threat intelligence
 */
export class SecurityEventLogger extends EventEmitter {
  private events: SecurityEvent[] = [];
  private readonly maxEvents = 100000;
  private readonly retentionDays = 90;

  // IP reputation tracking
  private ipReputation: Map<string, IPReputation> = new Map();

  // Rate limit tracking
  private rateLimitTracking: Map<string, RateLimitEntry[]> = new Map();

  // Login attempt tracking for anomaly detection
  private loginAttempts: Map<string, LoginAttempt[]> = new Map();

  // Event correlations
  private eventCorrelations: Map<string, string[]> = new Map();

  // Threat thresholds
  private readonly THREAT_THRESHOLDS = {
    failedLoginAttempts: 5,
    failedLoginWindow: 15 * 60 * 1000, // 15 minutes
    impossibleTravelThreshold: 900000, // 15 minutes in ms
    rateLimitViolations: 10,
    rateLimitWindow: 60 * 1000, // 1 minute
    dataExfiltrationThreshold: 100 * 1024 * 1024, // 100MB
    injectionPayloadSize: 10000
  };

  constructor() {
    super();
    this.startRetentionCleanup();
  }

  /**
   * Log a security event
   */
  async logEvent(event: Partial<SecurityEvent>): Promise<SecurityEvent> {
    const previousEvent = this.events[this.events.length - 1];

    const fullEvent: SecurityEvent = {
      id: `sec_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`,
      timestamp: new Date(),
      severity: event.severity || SecuritySeverity.INFO,
      category: event.category || SecurityCategory.SUSPICIOUS_PATTERN,
      eventType: event.eventType || 'unknown',
      description: event.description || '',
      userId: event.userId,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      requestDetails: event.requestDetails,
      threatIndicators: event.threatIndicators || {
        score: 0,
        indicators: [],
        riskFactors: [],
        confidence: 0
      },
      mitigation: event.mitigation,
      correlationId: event.correlationId,
      metadata: event.metadata,
      previousHash: previousEvent?.immutableHash
    };

    // Calculate threat score
    fullEvent.threatIndicators.score = this.calculateThreatScore(fullEvent);

    // Calculate immutable hash
    fullEvent.immutableHash = this.calculateHash(fullEvent);

    // Add to events
    this.events.push(fullEvent);

    // Trim if exceeds max
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Store IP reputation data if available
    if (fullEvent.ipAddress) {
      this.updateIPReputation(fullEvent.ipAddress);
    }

    // Emit event
    this.emit('event:logged', { event: fullEvent });

    // Check if alert should be triggered
    if (this.shouldAlert(fullEvent)) {
      this.emit('alert:triggered', {
        event: fullEvent,
        timestamp: new Date(),
        alertLevel: fullEvent.severity
      });

      // Log to console for visibility
      logger.warn(`Security Alert [${fullEvent.severity}]: ${fullEvent.description}`, {
        eventId: fullEvent.id,
        userId: fullEvent.userId,
        ipAddress: fullEvent.ipAddress,
        threatScore: fullEvent.threatIndicators.score
      }, 'security');
    }

    return fullEvent;
  }

  /**
   * Log failed authentication attempt
   */
  async logFailedAuth(
    userId: string,
    reason: string,
    context: {
      ipAddress: string;
      userAgent?: string;
      country?: string;
    }
  ): Promise<SecurityEvent> {
    const event = await this.logEvent({
      severity: SecuritySeverity.LOW,
      category: SecurityCategory.AUTH,
      eventType: 'auth.failed',
      description: `Failed authentication: ${reason}`,
      userId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      threatIndicators: {
        score: 10,
        indicators: ['failed_login'],
        riskFactors: [reason],
        confidence: 0.8
      },
      metadata: {
        reason,
        country: context.country
      }
    });

    // Track login attempt for anomaly detection
    this.trackLoginAttempt({
      userId,
      ipAddress: context.ipAddress,
      country: context.country || 'unknown',
      timestamp: new Date(),
      success: false,
      userAgent: context.userAgent || 'unknown'
    });

    // Check for brute force patterns
    const bruteForceIndicators = this.detectBruteForce(userId, context.ipAddress);
    if (bruteForceIndicators.detected) {
      event.threatIndicators.score += bruteForceIndicators.score;
      event.threatIndicators.indicators.push(...bruteForceIndicators.indicators);
    }

    return event;
  }

  /**
   * Log suspicious activity
   */
  async logSuspiciousActivity(
    description: string,
    severity: SecuritySeverity,
    context: {
      userId?: string;
      ipAddress?: string;
      userAgent?: string;
      indicators?: string[];
      riskFactors?: string[];
    }
  ): Promise<SecurityEvent> {
    return this.logEvent({
      severity,
      category: SecurityCategory.SUSPICIOUS_PATTERN,
      eventType: 'suspicious.activity',
      description,
      userId: context.userId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      threatIndicators: {
        score: this.severityToScore(severity),
        indicators: context.indicators || [],
        riskFactors: context.riskFactors || [],
        confidence: 0.85
      }
    });
  }

  /**
   * Log injection attempt
   */
  async logInjectionAttempt(
    type: string,
    payload: string,
    context: {
      userId?: string;
      ipAddress: string;
      userAgent?: string;
      parameterName?: string;
      endpoint?: string;
    }
  ): Promise<SecurityEvent> {
    const severity = payload.length > this.THREAT_THRESHOLDS.injectionPayloadSize
      ? SecuritySeverity.HIGH
      : SecuritySeverity.MEDIUM;

    return this.logEvent({
      severity,
      category: SecurityCategory.INJECTION,
      eventType: `injection.${type}`,
      description: `${type} injection attempt detected`,
      userId: context.userId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      threatIndicators: {
        score: 75,
        indicators: [
          `${type}_injection`,
          'malicious_input',
          `payload_length_${payload.length}`
        ],
        riskFactors: [
          `Attack Type: ${type}`,
          `Payload Size: ${payload.length} bytes`,
          `Parameter: ${context.parameterName || 'unknown'}`
        ],
        confidence: 0.95
      },
      metadata: {
        type,
        payloadLength: payload.length,
        parameterName: context.parameterName,
        endpoint: context.endpoint,
        payloadHash: crypto.createHash('sha256').update(payload).digest('hex')
      }
    });
  }

  /**
   * Log rate limit violation
   */
  async logRateLimitViolation(
    resource: string,
    limit: number,
    actual: number,
    context: {
      userId?: string;
      ipAddress: string;
      userAgent?: string;
      timeWindow?: number;
    }
  ): Promise<SecurityEvent> {
    const timeWindow = context.timeWindow || 60;

    // Track rate limit violations
    this.trackRateLimit({
      userId: context.userId,
      ipAddress: context.ipAddress,
      resource,
      count: actual,
      timestamp: new Date()
    });

    const exceedPercentage = ((actual - limit) / limit) * 100;
    const severity = exceedPercentage > 200 ? SecuritySeverity.HIGH : SecuritySeverity.MEDIUM;

    return this.logEvent({
      severity,
      category: SecurityCategory.RATE_LIMIT,
      eventType: 'ratelimit.exceeded',
      description: `Rate limit exceeded for ${resource}: ${actual}/${limit} in ${timeWindow}s`,
      userId: context.userId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      threatIndicators: {
        score: Math.min(actual / limit * 100, 100),
        indicators: ['rate_limit_violation'],
        riskFactors: [
          `Limit: ${limit}`,
          `Actual: ${actual}`,
          `Exceeded by: ${exceedPercentage.toFixed(1)}%`
        ],
        confidence: 0.9
      },
      metadata: {
        resource,
        limit,
        actual,
        timeWindow,
        violationRatio: actual / limit
      }
    });
  }

  /**
   * Log permission escalation attempt
   */
  async logPermissionEscalation(
    userId: string,
    attemptedRole: string,
    context: {
      ipAddress: string;
      userAgent?: string;
      currentRole?: string;
      method?: string;
    }
  ): Promise<SecurityEvent> {
    return this.logEvent({
      severity: SecuritySeverity.HIGH,
      category: SecurityCategory.PERMISSION,
      eventType: 'permission.escalation_attempt',
      description: `Permission escalation attempt: user attempted to escalate to ${attemptedRole}`,
      userId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      threatIndicators: {
        score: 80,
        indicators: [
          'privilege_escalation',
          'unauthorized_access_attempt',
          `target_role_${attemptedRole}`
        ],
        riskFactors: [
          `Current Role: ${context.currentRole || 'user'}`,
          `Attempted Role: ${attemptedRole}`,
          `Method: ${context.method || 'unknown'}`
        ],
        confidence: 0.95
      },
      metadata: {
        attemptedRole,
        currentRole: context.currentRole,
        method: context.method
      }
    });
  }

  /**
   * Log data exfiltration indicator
   */
  async logDataExfiltration(
    description: string,
    dataSize: number,
    context: {
      userId: string;
      ipAddress: string;
      userAgent?: string;
      dataType?: string;
      destination?: string;
    }
  ): Promise<SecurityEvent> {
    const severity = dataSize > this.THREAT_THRESHOLDS.dataExfiltrationThreshold
      ? SecuritySeverity.CRITICAL
      : SecuritySeverity.HIGH;

    return this.logEvent({
      severity,
      category: SecurityCategory.DATA_EXFILTRATION,
      eventType: 'data.exfiltration',
      description,
      userId: context.userId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      threatIndicators: {
        score: 90,
        indicators: [
          'data_exfiltration',
          'suspicious_export',
          `data_size_${dataSize}`
        ],
        riskFactors: [
          `Data Size: ${(dataSize / 1024 / 1024).toFixed(2)} MB`,
          `Data Type: ${context.dataType || 'unknown'}`,
          `Destination: ${context.destination || 'unknown'}`
        ],
        confidence: 0.9
      },
      metadata: {
        dataSize,
        dataType: context.dataType,
        destination: context.destination
      }
    });
  }

  /**
   * Detect brute force patterns
   */
  private detectBruteForce(
    userId: string,
    ipAddress: string
  ): { detected: boolean; score: number; indicators: string[] } {
    const attempts = this.loginAttempts.get(userId) || [];
    const now = new Date().getTime();
    const recentAttempts = attempts.filter(
      a => (now - a.timestamp.getTime()) < this.THREAT_THRESHOLDS.failedLoginWindow
    );

    const failedAttempts = recentAttempts.filter(a => !a.success);
    const fromSameIP = failedAttempts.filter(a => a.ipAddress === ipAddress);

    const detected = fromSameIP.length >= this.THREAT_THRESHOLDS.failedLoginAttempts;

    return {
      detected,
      score: detected ? 40 : 0,
      indicators: detected ? [
        'brute_force_pattern',
        `failed_attempts_${fromSameIP.length}`,
        `time_window_${this.THREAT_THRESHOLDS.failedLoginWindow / 1000}s`
      ] : []
    };
  }

  /**
   * Detect impossible travel
   */
  detectImpossibleTravel(userId: string): {
    detected: boolean;
    score: number;
    indicators: string[];
  } {
    const attempts = this.loginAttempts.get(userId) || [];
    if (attempts.length < 2) {
      return { detected: false, score: 0, indicators: [] };
    }

    const recentAttempts = attempts.slice(-2);
    const [first, second] = recentAttempts;

    const timeDiff = second.timestamp.getTime() - first.timestamp.getTime();
    const isImpossible = timeDiff < this.THREAT_THRESHOLDS.impossibleTravelThreshold
      && first.country !== second.country;

    return {
      detected: isImpossible,
      score: isImpossible ? 85 : 0,
      indicators: isImpossible ? [
        'impossible_travel',
        `from_${first.country}`,
        `to_${second.country}`,
        `time_delta_${timeDiff / 1000}s`
      ] : []
    };
  }

  /**
   * Track login attempt
   */
  private trackLoginAttempt(attempt: LoginAttempt): void {
    const key = attempt.userId;
    const attempts = this.loginAttempts.get(key) || [];
    attempts.push(attempt);

    // Keep only recent attempts (last 24 hours)
    const cutoff = new Date().getTime() - 24 * 60 * 60 * 1000;
    const filtered = attempts.filter(a => a.timestamp.getTime() > cutoff);

    this.loginAttempts.set(key, filtered);
  }

  /**
   * Track rate limit violations
   */
  private trackRateLimit(entry: RateLimitEntry): void {
    const key = `${entry.userId || 'anonymous'}_${entry.ipAddress}_${entry.resource}`;
    const entries = this.rateLimitTracking.get(key) || [];
    entries.push(entry);

    // Keep only recent entries (last hour)
    const cutoff = new Date().getTime() - 60 * 60 * 1000;
    const filtered = entries.filter(e => e.timestamp.getTime() > cutoff);

    this.rateLimitTracking.set(key, filtered);
  }

  /**
   * Update IP reputation
   */
  private updateIPReputation(ipAddress: string): void {
    const existing = this.ipReputation.get(ipAddress);

    if (existing) {
      existing.lastSeen = new Date();
      existing.violationCount++;

      // Update reputation based on violations
      if (existing.violationCount > 50) {
        existing.reputation = 'blocked';
        existing.score = 100;
      } else if (existing.violationCount > 20) {
        existing.reputation = 'suspicious';
        existing.score = 75;
      }
    } else {
      this.ipReputation.set(ipAddress, {
        ipAddress,
        reputation: 'trusted',
        score: 20,
        country: 'unknown',
        lastSeen: new Date(),
        violationCount: 1
      });
    }
  }

  /**
   * Calculate threat score (0-100)
   */
  calculateThreatScore(event: SecurityEvent): number {
    let score = 0;

    // Base score from severity
    score += this.severityToScore(event.severity);

    // Add threat indicators
    if (event.threatIndicators) {
      score = Math.max(score, event.threatIndicators.score);
    }

    // Add IP reputation penalty
    if (event.ipAddress) {
      const ipRep = this.ipReputation.get(event.ipAddress);
      if (ipRep) {
        score = Math.min(100, score + ipRep.score * 0.3);
      }
    }

    // Check for impossible travel
    if (event.userId) {
      const impossibleTravel = this.detectImpossibleTravel(event.userId);
      if (impossibleTravel.detected) {
        score = Math.min(100, score + impossibleTravel.score);
      }
    }

    return Math.round(Math.min(100, Math.max(0, score)));
  }

  /**
   * Convert severity to threat score
   */
  private severityToScore(severity: SecuritySeverity): number {
    const scores: Record<SecuritySeverity, number> = {
      [SecuritySeverity.INFO]: 10,
      [SecuritySeverity.LOW]: 25,
      [SecuritySeverity.MEDIUM]: 50,
      [SecuritySeverity.HIGH]: 75,
      [SecuritySeverity.CRITICAL]: 95
    };
    return scores[severity] || 0;
  }

  /**
   * Determine if alert should be triggered
   */
  shouldAlert(event: SecurityEvent): boolean {
    // Always alert on critical events
    if (event.severity === SecuritySeverity.CRITICAL) {
      return true;
    }

    // Alert on high severity with high threat score
    if (event.severity === SecuritySeverity.HIGH && event.threatIndicators.score > 70) {
      return true;
    }

    // Alert on certain categories
    const criticalCategories = [
      SecurityCategory.CREDENTIAL_COMPROMISE,
      SecurityCategory.SESSION_HIJACKING,
      SecurityCategory.DATA_EXFILTRATION
    ];

    if (criticalCategories.includes(event.category)) {
      return true;
    }

    return false;
  }

  /**
   * Get related events by correlation ID
   */
  async getRelatedEvents(eventId: string): Promise<SecurityEvent[]> {
    const event = this.events.find(e => e.id === eventId);
    if (!event) {
      return [];
    }

    // Find events that:
    // 1. Share the same correlationId as this event
    // 2. Have this event's ID as their correlationId
    // 3. Have their correlationId stored in this event's metadata
    return this.events.filter(e =>
      e.id !== eventId && (
        // Events with matching correlationId
        (event.correlationId && e.correlationId === event.correlationId) ||
        // Events that reference this event's ID as their correlationId
        e.correlationId === eventId ||
        // Events referenced in metadata correlationId
        (e.metadata?.correlationId === eventId || event.metadata?.correlationId === e.id)
      )
    );
  }

  /**
   * Analyze threat patterns for a user
   */
  analyzePattern(userId: string, timeWindowMs: number = 3600000): ThreatAnalysis {
    const now = new Date().getTime();
    const cutoff = now - timeWindowMs;

    const userEvents = this.events.filter(
      e => e.userId === userId && e.timestamp.getTime() > cutoff
    );

    const suspiciousEvents = userEvents.filter(
      e => e.severity === SecuritySeverity.HIGH || e.severity === SecuritySeverity.CRITICAL
    );

    // Analyze patterns
    const patterns = {
      failedLogins: userEvents.filter(e => e.eventType === 'auth.failed').length,
      unusualLocations: this.countUnusualLocations(userId),
      rapidRequests: this.countRapidRequests(userId, 60000), // 1 minute
      abnormalBehavior: userEvents.filter(
        e => e.category === SecurityCategory.SUSPICIOUS_PATTERN
      ).length
    };

    // Calculate risk score
    const riskScore = Math.min(100, (suspiciousEvents.length / Math.max(1, userEvents.length)) * 100);

    // Generate recommendations
    const recommendations: string[] = [];
    if (patterns.failedLogins > 5) {
      recommendations.push('Enforce MFA for this user');
      recommendations.push('Reset user password');
    }
    if (patterns.unusualLocations > 2) {
      recommendations.push('Review login locations');
      recommendations.push('Enable geo-blocking if needed');
    }
    if (riskScore > 70) {
      recommendations.push('Temporarily suspend account');
      recommendations.push('Conduct security audit');
    }

    return {
      userId,
      timeWindow: timeWindowMs,
      eventCount: userEvents.length,
      suspiciousEvents: suspiciousEvents.length,
      riskScore,
      patterns,
      recommendations
    };
  }

  /**
   * Count unusual location logins
   */
  private countUnusualLocations(userId: string): number {
    const attempts = this.loginAttempts.get(userId) || [];
    const countries = new Set(attempts.map(a => a.country));
    return Math.max(0, countries.size - 1); // Subtract the primary location
  }

  /**
   * Count rapid requests
   */
  private countRapidRequests(userId: string, windowMs: number): number {
    const now = new Date().getTime();
    const cutoff = now - windowMs;

    const userEvents = this.events.filter(
      e => e.userId === userId && e.timestamp.getTime() > cutoff
    );

    // Count events that happen in rapid succession
    let rapidCount = 0;
    for (let i = 1; i < userEvents.length; i++) {
      const timeDiff = userEvents[i].timestamp.getTime() - userEvents[i - 1].timestamp.getTime();
      if (timeDiff < 1000) { // Less than 1 second apart
        rapidCount++;
      }
    }

    return rapidCount;
  }

  /**
   * Calculate cryptographic hash for event
   */
  private calculateHash(event: SecurityEvent): string {
    const data = JSON.stringify({
      timestamp: event.timestamp,
      userId: event.userId,
      ipAddress: event.ipAddress,
      eventType: event.eventType,
      severity: event.severity,
      threatScore: event.threatIndicators.score,
      previousHash: event.previousHash
    });

    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Verify event chain integrity
   */
  verifyIntegrity(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (let i = 0; i < this.events.length; i++) {
      const event = this.events[i];

      // Verify hash
      const calculatedHash = this.calculateHash(event);
      if (calculatedHash !== event.immutableHash) {
        errors.push(`Event ${event.id} hash mismatch`);
      }

      // Verify chain
      if (i > 0) {
        const previousEvent = this.events[i - 1];
        if (event.previousHash !== previousEvent.immutableHash) {
          errors.push(`Event ${event.id} chain broken`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get events by severity
   */
  getEventsBySeverity(severity: SecuritySeverity, limit: number = 100): SecurityEvent[] {
    return this.events
      .filter(e => e.severity === severity)
      .slice(-limit)
      .reverse();
  }

  /**
   * Get events by category
   */
  getEventsByCategory(category: SecurityCategory, limit: number = 100): SecurityEvent[] {
    return this.events
      .filter(e => e.category === category)
      .slice(-limit)
      .reverse();
  }

  /**
   * Get events by user
   */
  getEventsByUser(userId: string, limit: number = 100): SecurityEvent[] {
    return this.events
      .filter(e => e.userId === userId)
      .slice(-limit)
      .reverse();
  }

  /**
   * Get events by IP address
   */
  getEventsByIP(ipAddress: string, limit: number = 100): SecurityEvent[] {
    return this.events
      .filter(e => e.ipAddress === ipAddress)
      .slice(-limit)
      .reverse();
  }

  /**
   * Get events by time range
   */
  getEventsByTimeRange(startDate: Date, endDate: Date): SecurityEvent[] {
    return this.events.filter(
      e => e.timestamp >= startDate && e.timestamp <= endDate
    ).reverse();
  }

  /**
   * Get security statistics
   */
  getStatistics(startDate?: Date, endDate?: Date): {
    totalEvents: number;
    eventsBySeverity: Record<SecuritySeverity, number>;
    eventsByCategory: Record<SecurityCategory, number>;
    topThreatenedUsers: Array<{ userId: string; eventCount: number; riskScore: number }>;
    topThreatenedIPs: Array<{ ipAddress: string; eventCount: number; reputation: string }>;
    averageThreatScore: number;
  } {
    let events = this.events;

    if (startDate || endDate) {
      events = this.getEventsByTimeRange(
        startDate || new Date(0),
        endDate || new Date()
      );
    }

    // Count by severity
    const eventsBySeverity: Record<SecuritySeverity, number> = {
      [SecuritySeverity.INFO]: 0,
      [SecuritySeverity.LOW]: 0,
      [SecuritySeverity.MEDIUM]: 0,
      [SecuritySeverity.HIGH]: 0,
      [SecuritySeverity.CRITICAL]: 0
    };

    // Count by category
    const eventsByCategory: Record<SecurityCategory, number> = {
      [SecurityCategory.AUTH]: 0,
      [SecurityCategory.RATE_LIMIT]: 0,
      [SecurityCategory.TOKEN]: 0,
      [SecurityCategory.PERMISSION]: 0,
      [SecurityCategory.DATA_EXFILTRATION]: 0,
      [SecurityCategory.INJECTION]: 0,
      [SecurityCategory.API_ABUSE]: 0,
      [SecurityCategory.CONFIG_TAMPERING]: 0,
      [SecurityCategory.CREDENTIAL_COMPROMISE]: 0,
      [SecurityCategory.SESSION_HIJACKING]: 0,
      [SecurityCategory.SUSPICIOUS_PATTERN]: 0
    };

    const userStats = new Map<string, { count: number; threatScores: number[] }>();
    const ipStats = new Map<string, { count: number }>();
    let totalThreatScore = 0;
    let threatEventCount = 0;

    for (const event of events) {
      eventsBySeverity[event.severity]++;
      eventsByCategory[event.category]++;

      totalThreatScore += event.threatIndicators.score;
      threatEventCount++;

      if (event.userId) {
        const stat = userStats.get(event.userId) || { count: 0, threatScores: [] };
        stat.count++;
        stat.threatScores.push(event.threatIndicators.score);
        userStats.set(event.userId, stat);
      }

      if (event.ipAddress) {
        const stat = ipStats.get(event.ipAddress) || { count: 0 };
        stat.count++;
        ipStats.set(event.ipAddress, stat);
      }
    }

    // Get top threatened users
    const topThreatenedUsers = Array.from(userStats.entries())
      .map(([userId, stat]) => ({
        userId,
        eventCount: stat.count,
        riskScore: Math.round(stat.threatScores.reduce((a, b) => a + b, 0) / stat.threatScores.length)
      }))
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 10);

    // Get top threatened IPs
    const topThreatenedIPs = Array.from(ipStats.entries())
      .map(([ipAddress, stat]) => {
        const rep = this.ipReputation.get(ipAddress);
        return {
          ipAddress,
          eventCount: stat.count,
          reputation: rep?.reputation || 'unknown'
        };
      })
      .sort((a, b) => b.eventCount - a.eventCount)
      .slice(0, 10);

    return {
      totalEvents: events.length,
      eventsBySeverity,
      eventsByCategory,
      topThreatenedUsers,
      topThreatenedIPs,
      averageThreatScore: threatEventCount > 0 ? Math.round(totalThreatScore / threatEventCount) : 0
    };
  }

  /**
   * Start retention cleanup
   */
  private startRetentionCleanup(): void {
    setInterval(() => {
      const cutoffDate = new Date(Date.now() - this.retentionDays * 24 * 60 * 60 * 1000);
      this.events = this.events.filter(e => e.timestamp >= cutoffDate);

      // Also clean up tracking maps
      const now = new Date().getTime();
      const trackingCutoff = now - 24 * 60 * 60 * 1000; // 24 hours

      // Clean login attempts
      for (const [userId, attempts] of this.loginAttempts.entries()) {
        const filtered = attempts.filter(a => a.timestamp.getTime() > trackingCutoff);
        if (filtered.length === 0) {
          this.loginAttempts.delete(userId);
        } else {
          this.loginAttempts.set(userId, filtered);
        }
      }
    }, 24 * 60 * 60 * 1000); // Run daily
  }

  /**
   * Export events as JSON
   */
  exportJSON(startDate?: Date, endDate?: Date): string {
    let events = this.events;

    if (startDate || endDate) {
      events = this.getEventsByTimeRange(
        startDate || new Date(0),
        endDate || new Date()
      );
    }

    return JSON.stringify(events, null, 2);
  }

  /**
   * Export events as CSV
   */
  exportCSV(startDate?: Date, endDate?: Date): string {
    let events = this.events;

    if (startDate || endDate) {
      events = this.getEventsByTimeRange(
        startDate || new Date(0),
        endDate || new Date()
      );
    }

    const headers = [
      'ID',
      'Timestamp',
      'Severity',
      'Category',
      'Event Type',
      'Description',
      'User ID',
      'IP Address',
      'Threat Score',
      'Confidence',
      'User Agent'
    ];

    const rows = events.map(event => [
      event.id,
      event.timestamp.toISOString(),
      event.severity,
      event.category,
      event.eventType,
      event.description,
      event.userId || '',
      event.ipAddress || '',
      event.threatIndicators.score,
      event.threatIndicators.confidence,
      event.userAgent || ''
    ]);

    return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  }

  /**
   * Clear all events
   */
  clear(): void {
    this.events = [];
    this.ipReputation.clear();
    this.rateLimitTracking.clear();
    this.loginAttempts.clear();
    this.eventCorrelations.clear();
  }
}

// Export singleton instance
export const securityEventLogger = new SecurityEventLogger();
