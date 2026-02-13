/**
 * Threat Detection Service
 * Real-time threat detection, intrusion detection, and security monitoring
 */

import { EventEmitter } from 'events';
import crypto from 'crypto';

export interface ThreatEvent {
  id: string;
  timestamp: Date;
  type: ThreatType;
  severity: ThreatSeverity;
  source: {
    ipAddress: string;
    country?: string;
    city?: string;
    organization?: string;
    userAgent?: string;
    userId?: string;
  };
  target: {
    resource: string;
    endpoint?: string;
    method?: string;
    userId?: string;
  };
  indicators: ThreatIndicator[];
  score: number; // 0-100 threat score
  confidence: number; // 0-100 confidence level
  evidence: Record<string, unknown>;
  mitigated: boolean;
  mitigationActions: string[];
  metadata: Record<string, unknown>;
}

export enum ThreatType {
  BRUTE_FORCE = 'brute_force',
  SQL_INJECTION = 'sql_injection',
  XSS = 'xss',
  CSRF = 'csrf',
  DOS = 'dos',
  DDOS = 'ddos',
  MALWARE = 'malware',
  INTRUSION = 'intrusion',
  DATA_EXFILTRATION = 'data_exfiltration',
  PRIVILEGE_ESCALATION = 'privilege_escalation',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  ANOMALOUS_BEHAVIOR = 'anomalous_behavior',
  ACCOUNT_TAKEOVER = 'account_takeover',
  INSIDER_THREAT = 'insider_threat'
}

export enum ThreatSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info'
}

export interface ThreatIndicator {
  type: 'ip' | 'user_agent' | 'pattern' | 'frequency' | 'geolocation' | 'behavior';
  value: string;
  description: string;
  weight: number; // 0-1 weight in threat calculation
}

export interface SecurityRule {
  id: string;
  name: string;
  description: string;
  type: ThreatType;
  enabled: boolean;
  conditions: SecurityCondition[];
  actions: SecurityAction[];
  severity: ThreatSeverity;
  threshold: number;
  timeWindow: number; // seconds
  cooldown: number; // seconds
  createdAt: Date;
  updatedAt: Date;
}

export interface SecurityCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'regex' | 'in' | 'count_gt';
  value: unknown;
  weight: number;
}

export interface SecurityAction {
  type: 'block_ip' | 'rate_limit' | 'alert' | 'quarantine' | 'logout_user' | 'disable_account' | 'log';
  config: Record<string, unknown>;
  enabled: boolean;
}

export interface ThreatIntelligence {
  maliciousIPs: Set<string>;
  maliciousUserAgents: Set<string>;
  suspiciousPatterns: RegExp[];
  knownAttacks: Map<string, unknown>;
  geoLocationData: Map<string, unknown>;
}

export interface AnomalyDetection {
  userBehaviorProfiles: Map<string, UserBehaviorProfile>;
  systemBaselines: SystemBaseline;
  anomalyThreshold: number;
  learningPeriod: number; // days
}

export interface UserBehaviorProfile {
  userId: string;
  normalPatterns: {
    loginTimes: number[]; // hours of day
    ipAddresses: string[];
    userAgents: string[];
    resources: string[];
    requestFrequency: number;
    sessionDuration: number;
  };
  recentActivity: ActivityPoint[];
  riskScore: number;
  lastUpdated: Date;
}

export interface ActivityPoint {
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  resource: string;
  action: string;
  success: boolean;
}

export interface SystemBaseline {
  normalTraffic: {
    requestsPerMinute: number;
    errorRate: number;
    responseTime: number;
  };
  peakHours: number[];
  commonEndpoints: string[];
  typicalUserAgents: string[];
  lastCalculated: Date;
}

export class ThreatDetectionService extends EventEmitter {
  private threats: Map<string, ThreatEvent> = new Map();
  private rules: Map<string, SecurityRule> = new Map();
  private blockedIPs: Set<string> = new Set();
  private rateLimits: Map<string, RateLimitState> = new Map();
  private threatIntelligence: ThreatIntelligence;
  private anomalyDetection: AnomalyDetection;
  private eventBuffer: unknown[] = [];
  private analysisTimer: NodeJS.Timeout;
  
  constructor() {
    super();
    this.threatIntelligence = {
      maliciousIPs: new Set(),
      maliciousUserAgents: new Set(),
      suspiciousPatterns: [],
      knownAttacks: new Map(),
      geoLocationData: new Map()
    };
    
    this.anomalyDetection = {
      userBehaviorProfiles: new Map(),
      systemBaselines: {
        normalTraffic: {
          requestsPerMinute: 100,
          errorRate: 0.05,
          responseTime: 200
        },
        peakHours: [9, 10, 11, 14, 15, 16],
        commonEndpoints: ['/api/workflows', '/api/auth', '/api/users'],
        typicalUserAgents: [],
        lastCalculated: new Date()
      },
      anomalyThreshold: 0.7,
      learningPeriod: 30
    };
    
    this.initializeSecurityRules();
    this.loadThreatIntelligence();
    this.startRealTimeAnalysis();
  }
  
  private initializeSecurityRules(): void {
    const defaultRules: Omit<SecurityRule, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        name: 'Brute Force Attack Detection',
        description: 'Detect multiple failed login attempts from same IP',
        type: ThreatType.BRUTE_FORCE,
        enabled: true,
        conditions: [
          {
            field: 'event.type',
            operator: 'eq',
            value: 'failed_login',
            weight: 1.0
          },
          {
            field: 'source.ipAddress',
            operator: 'count_gt',
            value: 5,
            weight: 0.8
          }
        ],
        actions: [
          {
            type: 'block_ip',
            config: { duration: 3600 }, // 1 hour
            enabled: true
          },
          {
            type: 'alert',
            config: { channels: ['email', 'slack'] },
            enabled: true
          }
        ],
        severity: ThreatSeverity.HIGH,
        threshold: 0.8,
        timeWindow: 300, // 5 minutes
        cooldown: 1800 // 30 minutes
      },
      {
        name: 'SQL Injection Detection',
        description: 'Detect SQL injection attempts in requests',
        type: ThreatType.SQL_INJECTION,
        enabled: true,
        conditions: [
          {
            field: 'request.query',
            operator: 'regex',
            value: /(\bunion\b|\bselect\b|\binsert\b|\bdelete\b|\bdrop\b|\b--\b|\b;)/i,
            weight: 0.9
          },
          {
            field: 'request.body',
            operator: 'regex',
            value: /(\bunion\b|\bselect\b|\binsert\b|\bdelete\b|\bdrop\b|\b--\b|\b;)/i,
            weight: 0.9
          }
        ],
        actions: [
          {
            type: 'block_ip',
            config: { duration: 7200 },
            enabled: true
          },
          {
            type: 'alert',
            config: { 
              channels: ['email', 'slack'],
              severity: 'critical'
            },
            enabled: true
          }
        ],
        severity: ThreatSeverity.CRITICAL,
        threshold: 0.9,
        timeWindow: 60,
        cooldown: 3600
      },
      {
        name: 'DDoS Attack Detection',
        description: 'Detect distributed denial of service attacks',
        type: ThreatType.DDOS,
        enabled: true,
        conditions: [
          {
            field: 'system.requestsPerMinute',
            operator: 'gt',
            value: 1000,
            weight: 0.7
          },
          {
            field: 'system.uniqueIPs',
            operator: 'gt',
            value: 100,
            weight: 0.6
          },
          {
            field: 'system.errorRate',
            operator: 'gt',
            value: 0.5,
            weight: 0.8
          }
        ],
        actions: [
          {
            type: 'rate_limit',
            config: { 
              limit: 10,
              window: 60,
              global: true
            },
            enabled: true
          },
          {
            type: 'alert',
            config: { 
              channels: ['email', 'slack', 'sms'],
              severity: 'critical'
            },
            enabled: true
          }
        ],
        severity: ThreatSeverity.CRITICAL,
        threshold: 0.8,
        timeWindow: 120,
        cooldown: 1800
      },
      {
        name: 'Anomalous User Behavior',
        description: 'Detect unusual user activity patterns',
        type: ThreatType.ANOMALOUS_BEHAVIOR,
        enabled: true,
        conditions: [
          {
            field: 'user.riskScore',
            operator: 'gt',
            value: 0.7,
            weight: 0.8
          },
          {
            field: 'user.newLocation',
            operator: 'eq',
            value: true,
            weight: 0.6
          }
        ],
        actions: [
          {
            type: 'alert',
            config: { channels: ['email'] },
            enabled: true
          },
          {
            type: 'log',
            config: { level: 'warn' },
            enabled: true
          }
        ],
        severity: ThreatSeverity.MEDIUM,
        threshold: 0.7,
        timeWindow: 3600,
        cooldown: 7200
      }
    ];
    
    for (const ruleData of defaultRules) {
      const rule: SecurityRule = {
        ...ruleData,
        id: crypto.randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      this.rules.set(rule.id, rule);
    }
  }
  
  private loadThreatIntelligence(): void {
    // Load known malicious IPs (would typically come from external feeds)
    const knownMaliciousIPs = [
      '185.220.101.1',
      '198.98.51.189',
      '87.120.254.48'
    ];
    
    for (const ip of knownMaliciousIPs) {
      this.threatIntelligence.maliciousIPs.add(ip);
    }
    
    // Load malicious user agents
    const maliciousUserAgents = [
      'sqlmap',
      'nikto',
      'nmap',
      'masscan',
      'zgrab'
    ];
    
    for (const ua of maliciousUserAgents) {
      this.threatIntelligence.maliciousUserAgents.add(ua.toLowerCase());
    }
    
    // Load suspicious patterns
    this.threatIntelligence.suspiciousPatterns = [
      /\.\.\//g, // Directory traversal
      /<script/gi, // XSS
      /javascript:/gi, // XSS
      /on\w+\s*=/gi, // Event handlers
      /eval\s*\(/gi, // Code injection
      /exec\s*\(/gi, // Command injection
    ];
  }
  
  private startRealTimeAnalysis(): void {
    // Process event buffer every 5 seconds
    this.analysisTimer = setInterval(() => {
      this.processEventBuffer();
    }, 5000);
  }
  
  // Event Processing
  
  public async analyzeEvent(event: unknown): Promise<ThreatEvent | null> {
    this.eventBuffer.push(event);
    
    // Immediate analysis for high-priority events
    if (this.isHighPriorityEvent(event)) {
      return await this.performThreatAnalysis(event);
    }
    
    return null;
  }
  
  private isHighPriorityEvent(event: unknown): boolean {
    return event.type === 'failed_login' ||
           event.type === 'suspicious_request' ||
           event.severity === 'critical';
  }
  
  private async processEventBuffer(): Promise<void> {
    if (this.eventBuffer.length === 0) return;
    
    const events = [...this.eventBuffer];
    this.eventBuffer = [];
    
    // Batch analysis
    await this.performBatchAnalysis(events);
    
    // Update baselines and profiles
    await this.updateAnomalyDetection(events);
  }
  
  private async performBatchAnalysis(events: unknown[]): Promise<void> {
    for (const event of events) {
      try {
        const threat = await this.performThreatAnalysis(event);
        if (threat && threat.score >= 0.5) {
          await this.handleThreat(threat);
        }
      } catch (error) {
        console.error('Error analyzing event:', error);
      }
    }
  }
  
  private async performThreatAnalysis(event: unknown): Promise<ThreatEvent | null> {
    const indicators: ThreatIndicator[] = [];
    let totalScore = 0;
    let confidence = 0;
    let threatType = ThreatType.SUSPICIOUS_ACTIVITY;
    
    // Check threat intelligence
    const intelIndicators = this.checkThreatIntelligence(event);
    indicators.push(...intelIndicators);
    
    // Check security rules
    const ruleMatches = await this.checkSecurityRules(event);
    
    // Check anomaly detection
    const anomalyScore = await this.checkAnomalies(event);
    
    // Check behavioral patterns
    const behaviorScore = await this.checkBehaviorPatterns(event);
    
    // Calculate threat score
    for (const indicator of indicators) {
      totalScore += indicator.weight * 0.3;
    }
    
    totalScore += ruleMatches.score * 0.4;
    totalScore += anomalyScore * 0.2;
    totalScore += behaviorScore * 0.1;
    
    // Normalize score to 0-100
    totalScore = Math.min(Math.max(totalScore * 100, 0), 100);
    
    if (totalScore < 30) return null;
    
    // Determine threat type and severity
    if (ruleMatches.matchedRule) {
      threatType = ruleMatches.matchedRule.type;
    }
    
    const severity = this.calculateSeverity(totalScore);
    confidence = this.calculateConfidence(indicators, ruleMatches);
    
    const threat: ThreatEvent = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      type: threatType,
      severity,
      source: {
        ipAddress: event.ipAddress || '0.0.0.0',
        userAgent: event.userAgent,
        userId: event.userId
      },
      target: {
        resource: event.resource || 'unknown',
        endpoint: event.endpoint,
        method: event.method,
        userId: event.targetUserId
      },
      indicators,
      score: totalScore,
      confidence,
      evidence: {
        originalEvent: event,
        ruleMatches: ruleMatches.matches,
        anomalyScore,
        behaviorScore
      },
      mitigated: false,
      mitigationActions: [],
      metadata: {}
    };
    
    this.threats.set(threat.id, threat);
    
    return threat;
  }
  
  private checkThreatIntelligence(event: unknown): ThreatIndicator[] {
    const indicators: ThreatIndicator[] = [];
    
    // Check malicious IPs
    if (event.ipAddress && this.threatIntelligence.maliciousIPs.has(event.ipAddress)) {
      indicators.push({
        type: 'ip',
        value: event.ipAddress,
        description: 'IP address found in threat intelligence',
        weight: 0.9
      });
    }
    
    // Check malicious user agents
    if (event.userAgent) {
      const userAgent = event.userAgent.toLowerCase();
      for (const maliciousUA of this.threatIntelligence.maliciousUserAgents) {
        if (userAgent.includes(maliciousUA)) {
          indicators.push({
            type: 'user_agent',
            value: event.userAgent,
            description: 'Malicious user agent detected',
            weight: 0.8
          });
          break;
        }
      }
    }
    
    // Check suspicious patterns
    const eventString = JSON.stringify(event).toLowerCase();
    for (const pattern of this.threatIntelligence.suspiciousPatterns) {
      if (pattern.test(eventString)) {
        indicators.push({
          type: 'pattern',
          value: pattern.toString(),
          description: 'Suspicious pattern detected',
          weight: 0.7
        });
      }
    }
    
    return indicators;
  }
  
  private async checkSecurityRules(event: unknown): Promise<{
    score: number;
    matches: string[];
    matchedRule?: SecurityRule;
  }> {
    let maxScore = 0;
    const matches: string[] = [];
    let matchedRule: SecurityRule | undefined;
    
    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;
      
      let ruleScore = 0;
      let _conditionsMet = 0;
      
      for (const condition of rule.conditions) {
        if (this.evaluateCondition(condition, event)) {
          ruleScore += condition.weight;
          _conditionsMet++; // eslint-disable-line @typescript-eslint/no-unused-vars
        }
      }
      
      // Normalize rule score
      const normalizedScore = ruleScore / rule.conditions.length;
      
      if (normalizedScore >= rule.threshold) {
        matches.push(rule.id);
        
        if (normalizedScore > maxScore) {
          maxScore = normalizedScore;
          matchedRule = rule;
        }
      }
    }
    
    return {
      score: maxScore,
      matches,
      matchedRule
    };
  }
  
  private evaluateCondition(condition: SecurityCondition, event: unknown): boolean {
    const fieldValue = this.getNestedValue(event, condition.field);
    
    switch (condition.operator) {
      case 'eq':
        return fieldValue === condition.value;
      case 'ne':
        return fieldValue !== condition.value;
      case 'gt':
        return fieldValue > condition.value;
      case 'gte':
        return fieldValue >= condition.value;
      case 'lt':
        return fieldValue < condition.value;
      case 'lte':
        return fieldValue <= condition.value;
      case 'contains':
        return typeof fieldValue === 'string' && fieldValue.includes(condition.value);
      case 'regex':
        return condition.value.test && condition.value.test(fieldValue);
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(fieldValue);
      case 'count_gt':
        // Count events in time window
        return this.countEventsInWindow(condition.field, condition.value, event) > condition.value;
      default:
        return false;
    }
  }
  
  private countEventsInWindow(field: string, value: unknown, currentEvent: unknown): number {
    const timeWindow = 300000; // 5 minutes
    const threshold = new Date(Date.now() - timeWindow);
    
    return this.eventBuffer.filter(event => {
      return new Date(event.timestamp) > threshold &&
             this.getNestedValue(event, field) === this.getNestedValue(currentEvent, field);
    }).length;
  }
  
  private getNestedValue(obj: unknown, path: string): unknown {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
  
  private async checkAnomalies(event: unknown): Promise<number> {
    if (!event.userId) return 0;
    
    const profile = this.anomalyDetection.userBehaviorProfiles.get(event.userId);
    if (!profile) return 0; // New user, no baseline yet
    
    let anomalyScore = 0;
    const weights = {
      location: 0.3,
      time: 0.2,
      frequency: 0.3,
      resource: 0.2
    };
    
    // Check location anomaly
    if (event.ipAddress && !profile.normalPatterns.ipAddresses.includes(event.ipAddress)) {
      anomalyScore += weights.location;
    }
    
    // Check time anomaly
    const hour = new Date(event.timestamp).getHours();
    if (!profile.normalPatterns.loginTimes.includes(hour)) {
      anomalyScore += weights.time;
    }
    
    // Check frequency anomaly
    const recentActivity = profile.recentActivity.filter(a => 
      new Date(a.timestamp) > new Date(Date.now() - 3600000) // Last hour
    );
    
    if (recentActivity.length > profile.normalPatterns.requestFrequency * 2) {
      anomalyScore += weights.frequency;
    }
    
    // Check resource anomaly
    if (event.resource && !profile.normalPatterns.resources.includes(event.resource)) {
      anomalyScore += weights.resource;
    }
    
    return Math.min(anomalyScore, 1);
  }
  
  private async checkBehaviorPatterns(event: unknown): Promise<number> {
    let behaviorScore = 0;
    
    // Check for rapid requests
    const recentEvents = this.eventBuffer.filter(e => 
      e.ipAddress === event.ipAddress &&
      new Date(e.timestamp) > new Date(Date.now() - 60000) // Last minute
    );
    
    if (recentEvents.length > 60) { // More than 1 request per second
      behaviorScore += 0.4;
    }
    
    // Check for error patterns
    const errorEvents = recentEvents.filter(e => e.status && e.status >= 400);
    if (errorEvents.length > recentEvents.length * 0.5) {
      behaviorScore += 0.3;
    }
    
    // Check for scanning behavior
    const uniqueEndpoints = new Set(recentEvents.map(e => e.endpoint));
    if (uniqueEndpoints.size > 20) { // Accessing many different endpoints
      behaviorScore += 0.3;
    }
    
    return Math.min(behaviorScore, 1);
  }
  
  private calculateSeverity(score: number): ThreatSeverity {
    if (score >= 90) return ThreatSeverity.CRITICAL;
    if (score >= 70) return ThreatSeverity.HIGH;
    if (score >= 50) return ThreatSeverity.MEDIUM;
    if (score >= 30) return ThreatSeverity.LOW;
    return ThreatSeverity.INFO;
  }
  
  private calculateConfidence(indicators: ThreatIndicator[], ruleMatches: unknown): number {
    let confidence = 0;
    
    // Base confidence from indicators
    confidence += indicators.length * 0.1;
    
    // Confidence from rule matches
    confidence += ruleMatches.matches.length * 0.2;
    
    // High confidence for threat intelligence matches
    const intelMatches = indicators.filter(i => i.type === 'ip' || i.type === 'user_agent');
    confidence += intelMatches.length * 0.3;
    
    return Math.min(confidence * 100, 100);
  }
  
  // Threat Response
  
  private async handleThreat(threat: ThreatEvent): Promise<void> {
    // Find applicable rule for mitigation actions
    const rule = Array.from(this.rules.values())
      .find(r => r.type === threat.type && r.enabled);
    
    if (rule) {
      for (const action of rule.actions) {
        if (action.enabled) {
          await this.executeMitigationAction(action, threat);
          threat.mitigationActions.push(`${action.type}: ${JSON.stringify(action.config)}`);
        }
      }
    }
    
    threat.mitigated = true;
    
    this.emit('threatDetected', threat);
  }
  
  private async executeMitigationAction(action: SecurityAction, threat: ThreatEvent): Promise<void> {
    switch (action.type) {
      case 'block_ip':
        this.blockIP(threat.source.ipAddress, action.config.duration || 3600);
        break;
        
      case 'rate_limit':
        this.applyRateLimit(threat.source.ipAddress, action.config);
        break;
        
      case 'alert':
        this.sendAlert(threat, action.config);
        break;
        
      case 'logout_user':
        if (threat.source.userId) {
          this.emit('logoutUser', { userId: threat.source.userId });
        }
        break;
        
      case 'disable_account':
        if (threat.source.userId) {
          this.emit('disableAccount', { 
            userId: threat.source.userId,
            reason: `Security threat detected: ${threat.type}`
          });
        }
        break;
        
      case 'log':
        console.log(`Security Action [${action.config.level || 'info'}]:`, {
          threatId: threat.id,
          type: threat.type,
          severity: threat.severity,
          source: threat.source
        });
        break;
    }
  }
  
  private blockIP(ipAddress: string, duration: number): void {
    this.blockedIPs.add(ipAddress);
    
    // Auto-unblock after duration
    setTimeout(() => {
      this.blockedIPs.delete(ipAddress);
      this.emit('ipUnblocked', { ipAddress });
    }, duration * 1000);
    
    this.emit('ipBlocked', { ipAddress, duration });
  }
  
  private applyRateLimit(key: string, config: unknown): void {
    const rateLimitKey = config.global ? 'global' : key;
    const now = Date.now();
    
    if (!this.rateLimits.has(rateLimitKey)) {
      this.rateLimits.set(rateLimitKey, {
        count: 0,
        resetTime: now + (config.window * 1000),
        limit: config.limit
      });
    }
    
    const rateLimit = this.rateLimits.get(rateLimitKey)!;
    
    if (now > rateLimit.resetTime) {
      rateLimit.count = 0;
      rateLimit.resetTime = now + (config.window * 1000);
    }
    
    rateLimit.count++;
    
    this.emit('rateLimitApplied', { 
      key: rateLimitKey, 
      count: rateLimit.count, 
      limit: rateLimit.limit 
    });
  }
  
  private sendAlert(threat: ThreatEvent, config: unknown): void {
    const alert = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      threatId: threat.id,
      severity: config.severity || threat.severity,
      message: `Security threat detected: ${threat.type}`,
      details: {
        source: threat.source,
        target: threat.target,
        score: threat.score,
        confidence: threat.confidence
      },
      channels: config.channels || ['log']
    };
    
    this.emit('securityAlert', alert);
  }
  
  // Anomaly Detection Updates
  
  private async updateAnomalyDetection(events: unknown[]): Promise<void> {
    // Update user behavior profiles
    for (const event of events) {
      if (event.userId) {
        await this.updateUserBehaviorProfile(event);
      }
    }
    
    // Update system baselines
    await this.updateSystemBaselines(events);
  }
  
  private async updateUserBehaviorProfile(event: unknown): Promise<void> {
    const userId = event.userId;
    let profile = this.anomalyDetection.userBehaviorProfiles.get(userId);
    
    if (!profile) {
      profile = {
        userId,
        normalPatterns: {
          loginTimes: [],
          ipAddresses: [],
          userAgents: [],
          resources: [],
          requestFrequency: 0,
          sessionDuration: 0
        },
        recentActivity: [],
        riskScore: 0,
        lastUpdated: new Date()
      };
      this.anomalyDetection.userBehaviorProfiles.set(userId, profile);
    }
    
    // Add to recent activity
    profile.recentActivity.push({
      timestamp: new Date(event.timestamp),
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      resource: event.resource,
      action: event.action,
      success: event.success !== false
    });
    
    // Keep only last 1000 activities
    if (profile.recentActivity.length > 1000) {
      profile.recentActivity = profile.recentActivity.slice(-1000);
    }
    
    // Update normal patterns (learning mode)
    const learningCutoff = new Date(Date.now() - this.anomalyDetection.learningPeriod * 24 * 60 * 60 * 1000);
    const learningEvents = profile.recentActivity.filter(a => a.timestamp > learningCutoff);
    
    if (learningEvents.length > 50) { // Enough data for learning
      profile.normalPatterns.loginTimes = [...new Set(learningEvents.map(e => e.timestamp.getHours()))];
      profile.normalPatterns.ipAddresses = [...new Set(learningEvents.map(e => e.ipAddress))];
      profile.normalPatterns.userAgents = [...new Set(learningEvents.map(e => e.userAgent))];
      profile.normalPatterns.resources = [...new Set(learningEvents.map(e => e.resource))];
      profile.normalPatterns.requestFrequency = learningEvents.length / this.anomalyDetection.learningPeriod;
    }
    
    // Calculate risk score
    profile.riskScore = this.calculateUserRiskScore(profile);
    profile.lastUpdated = new Date();
  }
  
  private calculateUserRiskScore(profile: UserBehaviorProfile): number {
    let riskScore = 0;
    
    // Recent failed activities
    const recentFailures = profile.recentActivity
      .filter(a => a.timestamp > new Date(Date.now() - 3600000) && !a.success)
      .length;
    
    riskScore += Math.min(recentFailures * 0.1, 0.5);
    
    // New locations
    const recentIPs = profile.recentActivity
      .filter(a => a.timestamp > new Date(Date.now() - 86400000)) // Last day
      .map(a => a.ipAddress);
    
    const newIPs = recentIPs.filter(ip => !profile.normalPatterns.ipAddresses.includes(ip));
    riskScore += Math.min(newIPs.length * 0.2, 0.3);
    
    // Unusual activity times
    const recentHours = profile.recentActivity
      .filter(a => a.timestamp > new Date(Date.now() - 86400000))
      .map(a => a.timestamp.getHours());
    
    const unusualHours = recentHours.filter(hour => !profile.normalPatterns.loginTimes.includes(hour));
    riskScore += Math.min(unusualHours.length * 0.05, 0.2);
    
    return Math.min(riskScore, 1);
  }
  
  private async updateSystemBaselines(events: unknown[]): Promise<void> {
    const now = new Date();
    const baseline = this.anomalyDetection.systemBaselines;
    
    // Update every hour
    if (now.getTime() - baseline.lastCalculated.getTime() < 3600000) {
      return;
    }
    
    const recentEvents = events.filter(e => 
      new Date(e.timestamp) > new Date(now.getTime() - 3600000)
    );
    
    if (recentEvents.length > 0) {
      baseline.normalTraffic.requestsPerMinute = recentEvents.length / 60;
      baseline.normalTraffic.errorRate = recentEvents.filter(e => e.status >= 400).length / recentEvents.length;
      
      const responseTimes = recentEvents.map(e => e.responseTime).filter(t => t);
      if (responseTimes.length > 0) {
        baseline.normalTraffic.responseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      }
      
      baseline.commonEndpoints = [...new Set(recentEvents.map(e => e.endpoint))].slice(0, 50);
      baseline.typicalUserAgents = [...new Set(recentEvents.map(e => e.userAgent))].slice(0, 20);
    }
    
    baseline.lastCalculated = now;
  }
  
  // Public API
  
  public isIPBlocked(ipAddress: string): boolean {
    return this.blockedIPs.has(ipAddress);
  }
  
  public isRateLimited(key: string): boolean {
    const rateLimit = this.rateLimits.get(key);
    if (!rateLimit) return false;
    
    const now = Date.now();
    if (now > rateLimit.resetTime) {
      rateLimit.count = 0;
      rateLimit.resetTime = now + 60000; // Reset window
      return false;
    }
    
    return rateLimit.count >= rateLimit.limit;
  }
  
  public getThreat(threatId: string): ThreatEvent | undefined {
    return this.threats.get(threatId);
  }
  
  public getThreats(filter?: {
    type?: ThreatType;
    severity?: ThreatSeverity;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): ThreatEvent[] {
    let threats = Array.from(this.threats.values());
    
    if (filter) {
      if (filter.type) {
        threats = threats.filter(t => t.type === filter.type);
      }
      if (filter.severity) {
        threats = threats.filter(t => t.severity === filter.severity);
      }
      if (filter.startDate) {
        threats = threats.filter(t => t.timestamp >= filter.startDate!);
      }
      if (filter.endDate) {
        threats = threats.filter(t => t.timestamp <= filter.endDate!);
      }
    }
    
    threats.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    if (filter?.limit) {
      threats = threats.slice(0, filter.limit);
    }
    
    return threats;
  }
  
  public getSecurityRule(ruleId: string): SecurityRule | undefined {
    return this.rules.get(ruleId);
  }
  
  public getAllSecurityRules(): SecurityRule[] {
    return Array.from(this.rules.values());
  }
  
  public createSecurityRule(ruleData: Omit<SecurityRule, 'id' | 'createdAt' | 'updatedAt'>): SecurityRule {
    const rule: SecurityRule = {
      ...ruleData,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.rules.set(rule.id, rule);
    
    this.emit('securityRuleCreated', { ruleId: rule.id, name: rule.name });
    
    return rule;
  }
  
  public updateSecurityRule(
    ruleId: string,
    updates: Partial<Omit<SecurityRule, 'id' | 'createdAt' | 'updatedAt'>>
  ): SecurityRule {
    const rule = this.rules.get(ruleId);
    
    if (!rule) {
      throw new Error('Security rule not found');
    }
    
    Object.assign(rule, updates, { updatedAt: new Date() });
    
    this.emit('securityRuleUpdated', { ruleId, updates });
    
    return rule;
  }
  
  public deleteSecurityRule(ruleId: string): void {
    const rule = this.rules.get(ruleId);
    
    if (!rule) {
      throw new Error('Security rule not found');
    }
    
    this.rules.delete(ruleId);
    
    this.emit('securityRuleDeleted', { ruleId });
  }
  
  public getStats(): {
    totalThreats: number;
    threatsToday: number;
    blockedIPs: number;
    activeRateLimits: number;
    userProfiles: number;
    averageThreatScore: number;
  } {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const threats = Array.from(this.threats.values());
    const threatsToday = threats.filter(t => t.timestamp >= today);
    
    const averageScore = threats.length > 0 
      ? threats.reduce((sum, t) => sum + t.score, 0) / threats.length
      : 0;
    
    return {
      totalThreats: threats.length,
      threatsToday: threatsToday.length,
      blockedIPs: this.blockedIPs.size,
      activeRateLimits: this.rateLimits.size,
      userProfiles: this.anomalyDetection.userBehaviorProfiles.size,
      averageThreatScore: Math.round(averageScore)
    };
  }
  
  // Cleanup
  
  public cleanup(retentionDays: number = 30): number {
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    let deletedCount = 0;
    
    // Clean up old threats
    for (const [threatId, threat] of this.threats.entries()) {
      if (threat.timestamp < cutoffDate) {
        this.threats.delete(threatId);
        deletedCount++;
      }
    }
    
    // Clean up user profiles
    for (const [userId, profile] of this.anomalyDetection.userBehaviorProfiles.entries()) {
      profile.recentActivity = profile.recentActivity.filter(a => a.timestamp > cutoffDate);
      
      if (profile.recentActivity.length === 0 && profile.lastUpdated < cutoffDate) {
        this.anomalyDetection.userBehaviorProfiles.delete(userId);
      }
    }
    
    this.emit('cleanupCompleted', { deletedThreats: deletedCount });
    
    return deletedCount;
  }
  
  public destroy(): void {
    if (this.analysisTimer) {
      clearInterval(this.analysisTimer);
    }
    
    this.threats.clear();
    this.rules.clear();
    this.blockedIPs.clear();
    this.rateLimits.clear();
    this.eventBuffer = [];
    
    this.emit('serviceDestroyed');
  }
}

interface RateLimitState {
  count: number;
  resetTime: number;
  limit: number;
}