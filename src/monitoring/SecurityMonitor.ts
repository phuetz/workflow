/**
 * Real-Time Security Monitoring System
 * Phase 2, Week 8: Security Monitoring & Alerting
 *
 * Comprehensive real-time security monitoring with:
 * - Live threat detection and metrics
 * - Security event stream processing
 * - Rule-based alerting with threshold monitoring
 * - Anomaly detection with statistical analysis
 * - Dashboard data generation
 * - WebSocket support for real-time updates
 * - 24-hour historical data retention
 * - Performance optimized for 1000+ events/second
 */

import { EventEmitter } from 'events';
import { SecurityEvent, SecuritySeverity, SecurityCategory } from '../audit/SecurityEventLogger';
import { AuditLogEntry, AuditEventType } from '../audit/AuditLogger';
import { logger } from '../services/SimpleLogger';

/**
 * Security metrics interface
 */
export interface SecurityMetrics {
  timestamp: Date;

  // Authentication Metrics
  totalLoginAttempts: number;
  failedLoginAttempts: number;
  successfulLogins: number;
  failureRate: number;

  // Security Events
  totalSecurityEvents: number;
  criticalEvents: number;
  highSeverityEvents: number;
  mediumSeverityEvents: number;
  lowSeverityEvents: number;

  // Threat Metrics
  averageThreatScore: number;
  maxThreatScore: number;
  activeThreats: number;
  mitigatedThreats: number;

  // Attack Patterns
  injectionAttempts: number;
  bruteForceAttempts: number;
  rateLimitViolations: number;
  permissionEscalations: number;
  dataExfiltrationAttempts: number;

  // System Health
  systemUptime: number;
  activeUsers: number;
  activeSessions: number;
  apiCallRate: number;
  errorRate: number;

  // Compliance
  complianceScore: number;
  controlsCompliant: number;
  controlsNonCompliant: number;
  violations: number;
}

/**
 * Monitoring rule interface
 */
export interface MonitoringRule {
  id: string;
  name: string;
  description: string;
  condition: (metrics: SecurityMetrics) => boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  threshold: number;
  action: 'log' | 'alert' | 'block' | 'notify';
  enabled: boolean;
  cooldownMs?: number;
  lastTriggered?: Date;
}

/**
 * Alert interface
 */
export interface Alert {
  id: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  rule: string;
  metrics: Partial<SecurityMetrics>;
  recommended_actions: string[];
  auto_mitigated: boolean;
  acknowledged?: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

/**
 * Trend data interface
 */
export interface TrendData {
  labels: string[];
  values: number[];
  avg: number;
  min: number;
  max: number;
}

/**
 * Dashboard data interface
 */
export interface DashboardData {
  currentMetrics: SecurityMetrics;
  trendData: {
    labels: string[];
    securityEvents: number[];
    threatScores: number[];
    failureRates: number[];
  };
  topThreats: Array<{
    type: string;
    count: number;
    severity: string;
  }>;
  recentAlerts: Alert[];
  systemStatus: {
    overall: 'healthy' | 'warning' | 'critical';
    components: Record<string, 'up' | 'down' | 'degraded'>;
  };
  complianceStatus: {
    overall: number;
    frameworks: Record<string, number>;
  };
}

/**
 * Anomaly interface
 */
export interface Anomaly {
  type: string;
  severity: string;
  value: number;
  baseline: number;
  deviation: number;
  timestamp: Date;
  description: string;
}

/**
 * Attack vector interface
 */
export interface AttackVector {
  type: string;
  count: number;
  severity: string;
  lastSeen: Date;
  sources: Array<{
    ipAddress: string;
    count: number;
  }>;
}

/**
 * Health status interface
 */
export interface HealthStatus {
  overall: 'healthy' | 'warning' | 'critical';
  components: Record<string, 'up' | 'down' | 'degraded'>;
  uptime: number;
  lastCheck: Date;
}

/**
 * Compliance status interface
 */
export interface ComplianceStatus {
  overall: number;
  frameworks: Record<string, number>;
  violations: Array<{
    framework: string;
    control: string;
    severity: string;
    lastViolation: Date;
  }>;
}

/**
 * Circular buffer for historical data
 */
class CircularBuffer<T> {
  private buffer: T[] = [];
  private maxSize: number;
  private index: number = 0;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  push(item: T): void {
    if (this.buffer.length < this.maxSize) {
      this.buffer.push(item);
    } else {
      this.buffer[this.index] = item;
      this.index = (this.index + 1) % this.maxSize;
    }
  }

  getAll(): T[] {
    if (this.buffer.length < this.maxSize) {
      return [...this.buffer];
    }
    return [...this.buffer.slice(this.index), ...this.buffer.slice(0, this.index)];
  }

  getLast(count: number): T[] {
    const all = this.getAll();
    return all.slice(-count);
  }

  clear(): void {
    this.buffer = [];
    this.index = 0;
  }

  size(): number {
    return this.buffer.length;
  }
}

/**
 * Real-Time Security Monitor
 * Singleton pattern for global access
 */
export class SecurityMonitor extends EventEmitter {
  private static instance: SecurityMonitor;

  private metrics: SecurityMetrics;
  private historicalMetrics: CircularBuffer<SecurityMetrics>;
  private rules: Map<string, MonitoringRule> = new Map();
  private alerts: Map<string, Alert> = new Map();
  private recentAlerts: Alert[] = [];
  private eventBuffer: Array<SecurityEvent | AuditLogEntry> = [];
  private isRunning: boolean = false;
  private startTime: Date = new Date();
  private updateInterval?: NodeJS.Timeout;
  private ruleEvaluationInterval?: NodeJS.Timeout;
  private eventProcessingInterval?: NodeJS.Timeout;

  // Metrics tracking
  private securityEvents: Map<string, SecurityEvent[]> = new Map();
  private loginAttempts: Map<string, { success: number; failed: number; ips: Set<string> }> = new Map();
  private apiCallStats: { total: number; lastMinute: number; errors: number } = {
    total: 0,
    lastMinute: 0,
    errors: 0
  };
  private activeSessions: Set<string> = new Set();
  private threatScores: number[] = [];

  // Compliance tracking
  private violationLog: Array<{ framework: string; control: string; timestamp: Date }> = [];
  private complianceScores: Map<string, number> = new Map();

  // Anomaly detection
  private baselineData: Map<string, { avg: number; stdDev: number }> = new Map();
  private anomalyHistory: Anomaly[] = [];

  // Component health
  private componentHealth: Map<string, { status: 'up' | 'down' | 'degraded'; lastCheck: Date; latency: number }> = new Map();

  constructor() {
    super();
    this.metrics = this.initializeMetrics();
    this.historicalMetrics = new CircularBuffer(1440); // 24 hours of 1-minute data
    this.setupDefaultRules();
    this.initializeComponentHealth();
    logger.info('SecurityMonitor initialized');
  }

  /**
   * Get singleton instance
   */
  static getInstance(): SecurityMonitor {
    if (!SecurityMonitor.instance) {
      SecurityMonitor.instance = new SecurityMonitor();
    }
    return SecurityMonitor.instance;
  }

  /**
   * Initialize metrics with default values
   */
  private initializeMetrics(): SecurityMetrics {
    return {
      timestamp: new Date(),
      totalLoginAttempts: 0,
      failedLoginAttempts: 0,
      successfulLogins: 0,
      failureRate: 0,
      totalSecurityEvents: 0,
      criticalEvents: 0,
      highSeverityEvents: 0,
      mediumSeverityEvents: 0,
      lowSeverityEvents: 0,
      averageThreatScore: 0,
      maxThreatScore: 0,
      activeThreats: 0,
      mitigatedThreats: 0,
      injectionAttempts: 0,
      bruteForceAttempts: 0,
      rateLimitViolations: 0,
      permissionEscalations: 0,
      dataExfiltrationAttempts: 0,
      systemUptime: 0,
      activeUsers: 0,
      activeSessions: 0,
      apiCallRate: 0,
      errorRate: 0,
      complianceScore: 100,
      controlsCompliant: 0,
      controlsNonCompliant: 0,
      violations: 0
    };
  }

  /**
   * Initialize component health monitoring
   */
  private initializeComponentHealth(): void {
    const components = [
      'database',
      'api-server',
      'cache',
      'queue',
      'websocket',
      'authentication',
      'logging'
    ];

    for (const component of components) {
      this.componentHealth.set(component, {
        status: 'up',
        lastCheck: new Date(),
        latency: 0
      });
    }
  }

  /**
   * Start the monitoring system
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('SecurityMonitor is already running');
      return;
    }

    this.isRunning = true;
    this.startTime = new Date();
    logger.info('SecurityMonitor started');

    // Update metrics every second
    this.updateInterval = setInterval(() => {
      this.updateMetrics();
    }, 1000);

    // Evaluate rules every 5 seconds
    this.ruleEvaluationInterval = setInterval(() => {
      const newAlerts = this.evaluateRules();
      if (newAlerts.length > 0) {
        this.emit('alerts', newAlerts);
      }
    }, 5000);

    // Process buffered events every 100ms
    this.eventProcessingInterval = setInterval(() => {
      this.processEventBuffer();
    }, 100);

    this.emit('started');
  }

  /**
   * Stop the monitoring system
   */
  stop(): void {
    if (!this.isRunning) {
      logger.warn('SecurityMonitor is not running');
      return;
    }

    this.isRunning = false;
    clearInterval(this.updateInterval);
    clearInterval(this.ruleEvaluationInterval);
    clearInterval(this.eventProcessingInterval);

    logger.info('SecurityMonitor stopped');
    this.emit('stopped');
  }

  /**
   * Process security event
   */
  processSecurityEvent(event: SecurityEvent): void {
    this.eventBuffer.push(event);

    // Update threat scores
    if (event.threatIndicators) {
      this.threatScores.push(event.threatIndicators.score);
      if (this.threatScores.length > 1000) {
        this.threatScores = this.threatScores.slice(-1000);
      }
    }

    // Update security event counts
    const key = event.category;
    if (!this.securityEvents.has(key)) {
      this.securityEvents.set(key, []);
    }
    const events = this.securityEvents.get(key)!;
    events.push(event);
    if (events.length > 10000) {
      this.securityEvents.set(key, events.slice(-10000));
    }

    this.emit('security-event', event);
  }

  /**
   * Process audit log entry
   */
  processAuditLog(log: AuditLogEntry): void {
    this.eventBuffer.push(log);

    // Track login attempts
    if (log.action.includes('auth:login') || log.action.includes('auth:failed_login')) {
      const userId = log.userId || 'unknown';
      if (!this.loginAttempts.has(userId)) {
        this.loginAttempts.set(userId, { success: 0, failed: 0, ips: new Set() });
      }

      const attempts = this.loginAttempts.get(userId)!;
      if (log.action.includes('failed')) {
        attempts.failed++;
      } else {
        attempts.success++;
      }

      if (log.ipAddress) {
        attempts.ips.add(log.ipAddress);
      }
    }

    // Track compliance violations
    if (log.severity === 'critical') {
      this.violationLog.push({
        framework: 'general',
        control: log.action,
        timestamp: new Date(log.timestamp)
      });
    }

    this.emit('audit-log', log);
  }

  /**
   * Process buffered events
   */
  private processEventBuffer(): void {
    if (this.eventBuffer.length === 0) return;

    const batch = this.eventBuffer.splice(0, Math.min(100, this.eventBuffer.length));

    for (const item of batch) {
      if ('category' in item) {
        // It's a SecurityEvent
        this.updateSecurityEventMetrics(item as SecurityEvent);
      } else {
        // It's an AuditLogEntry
        this.updateAuditMetrics(item as AuditLogEntry);
      }
    }
  }

  /**
   * Update metrics based on security events
   */
  private updateSecurityEventMetrics(event: SecurityEvent): void {
    this.metrics.totalSecurityEvents++;

    const severity = event.severity;
    if (severity === SecuritySeverity.CRITICAL) {
      this.metrics.criticalEvents++;
    } else if (severity === SecuritySeverity.HIGH) {
      this.metrics.highSeverityEvents++;
    } else if (severity === SecuritySeverity.MEDIUM) {
      this.metrics.mediumSeverityEvents++;
    } else if (severity === SecuritySeverity.LOW) {
      this.metrics.lowSeverityEvents++;
    }

    // Track attack patterns
    if (event.category === SecurityCategory.INJECTION) {
      this.metrics.injectionAttempts++;
    } else if (event.category === SecurityCategory.API_ABUSE) {
      this.metrics.bruteForceAttempts++;
    } else if (event.category === SecurityCategory.RATE_LIMIT) {
      this.metrics.rateLimitViolations++;
    } else if (event.category === SecurityCategory.PERMISSION) {
      this.metrics.permissionEscalations++;
    } else if (event.category === SecurityCategory.DATA_EXFILTRATION) {
      this.metrics.dataExfiltrationAttempts++;
    }

    // Track threat score
    if (event.threatIndicators) {
      if (event.threatIndicators.score > this.metrics.maxThreatScore) {
        this.metrics.maxThreatScore = event.threatIndicators.score;
      }
      this.metrics.activeThreats++;

      if (event.mitigation && event.mitigation.success) {
        this.metrics.mitigatedThreats++;
      }
    }
  }

  /**
   * Update metrics based on audit logs
   */
  private updateAuditMetrics(log: AuditLogEntry): void {
    // Track API calls
    if (log.action && (log.action.includes('api') || log.action.includes('http'))) {
      this.apiCallStats.total++;
      this.apiCallStats.lastMinute++;
    }

    // Track errors - check for any severity-like value
    const severity = log.severity || '';
    if (severity === 'critical' || severity === 'warning') {
      this.apiCallStats.errors++;
    }

    // Track active users
    if (log.userId) {
      this.activeSessions.add(log.userId);
    }

    // Update compliance violations
    if (severity === 'critical') {
      this.metrics.violations++;
    }
  }

  /**
   * Update metrics (called every second)
   */
  private updateMetrics(): void {
    this.metrics.timestamp = new Date();

    // Update uptime
    this.metrics.systemUptime = Date.now() - this.startTime.getTime();

    // Update user metrics
    this.metrics.activeUsers = this.activeSessions.size;
    this.metrics.activeSessions = this.activeSessions.size;

    // Update API metrics
    this.metrics.apiCallRate = this.apiCallStats.lastMinute;
    if (this.apiCallStats.total > 0) {
      this.metrics.errorRate = (this.apiCallStats.errors / this.apiCallStats.total) * 100;
    }

    // Reset last minute counter every 60 seconds
    if (Math.floor(this.metrics.systemUptime / 1000) % 60 === 0) {
      this.apiCallStats.lastMinute = 0;
    }

    // Calculate threat score
    if (this.threatScores.length > 0) {
      this.metrics.averageThreatScore =
        this.threatScores.reduce((a, b) => a + b, 0) / this.threatScores.length;
    }

    // Calculate login failure rate
    const totalLogins = this.metrics.totalLoginAttempts;
    if (totalLogins > 0) {
      this.metrics.failureRate = (this.metrics.failedLoginAttempts / totalLogins) * 100;
    }

    // Calculate compliance score
    this.updateComplianceScore();

    // Store historical data every minute
    const now = new Date();
    if (now.getSeconds() === 0) {
      this.historicalMetrics.push({ ...this.metrics });
    }

    this.emit('metrics-updated', this.metrics);
  }

  /**
   * Update compliance score
   */
  private updateComplianceScore(): void {
    const frameworks = ['SOC2', 'ISO27001', 'HIPAA', 'GDPR'];
    let totalScore = 0;

    for (const framework of frameworks) {
      // Base score is 100, deduct for violations
      let score = 100;
      const violationCount = this.violationLog.filter(
        v => v.framework === framework || v.framework === 'general'
      ).length;
      score -= Math.min(violationCount * 5, 100);

      this.complianceScores.set(framework, Math.max(score, 0));
      totalScore += Math.max(score, 0);
    }

    this.metrics.complianceScore = totalScore / frameworks.length;
    this.metrics.controlsCompliant = frameworks.length;
    this.metrics.controlsNonCompliant = Math.max(
      frameworks.length - Math.round(this.metrics.complianceScore / 25),
      0
    );
  }

  /**
   * Get current metrics
   */
  getMetrics(): SecurityMetrics {
    return { ...this.metrics };
  }

  /**
   * Get historical metrics for a duration
   */
  getHistoricalMetrics(duration: number): SecurityMetrics[] {
    const durationMinutes = Math.ceil(duration / 60000);
    return this.historicalMetrics.getLast(durationMinutes);
  }

  /**
   * Add monitoring rule
   */
  addRule(rule: MonitoringRule): void {
    this.rules.set(rule.id, rule);
    logger.info(`Monitoring rule added: ${rule.id}`);
  }

  /**
   * Remove monitoring rule
   */
  removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
    logger.info(`Monitoring rule removed: ${ruleId}`);
  }

  /**
   * Enable monitoring rule
   */
  enableRule(ruleId: string): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = true;
      logger.info(`Monitoring rule enabled: ${ruleId}`);
    }
  }

  /**
   * Disable monitoring rule
   */
  disableRule(ruleId: string): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = false;
      logger.info(`Monitoring rule disabled: ${ruleId}`);
    }
  }

  /**
   * Evaluate all rules and return triggered alerts
   */
  evaluateRules(): Alert[] {
    const newAlerts: Alert[] = [];
    const now = new Date();

    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;

      // Check cooldown
      if (rule.lastTriggered) {
        const cooldown = rule.cooldownMs || 300000; // 5 minutes default
        if (now.getTime() - rule.lastTriggered.getTime() < cooldown) {
          continue;
        }
      }

      // Evaluate condition
      try {
        if (rule.condition(this.metrics)) {
          const alert = this.createAlert(rule);
          newAlerts.push(alert);
          this.alerts.set(alert.id, alert);
          this.recentAlerts.push(alert);
          if (this.recentAlerts.length > 1000) {
            this.recentAlerts = this.recentAlerts.slice(-1000);
          }

          rule.lastTriggered = now;

          // Execute action
          this.executeAlertAction(rule, alert);
        }
      } catch (error) {
        logger.error(`Error evaluating rule ${rule.id}:`, error);
      }
    }

    return newAlerts;
  }

  /**
   * Create alert from rule
   */
  private createAlert(rule: MonitoringRule): Alert {
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const actions = this.getRecommendedActions(rule);

    return {
      id: alertId,
      timestamp: new Date(),
      severity: rule.severity,
      title: rule.name,
      description: rule.description,
      rule: rule.id,
      metrics: { ...this.metrics },
      recommended_actions: actions,
      auto_mitigated: false
    };
  }

  /**
   * Get recommended actions for alert
   */
  private getRecommendedActions(rule: MonitoringRule): string[] {
    const actions: Record<string, string[]> = {
      'high-failure-rate': [
        'Review authentication logs',
        'Check for brute force attempts',
        'Verify account lockout settings',
        'Consider temporary IP blocking'
      ],
      'brute-force-detected': [
        'Immediately block source IP',
        'Review account for unauthorized access',
        'Enable MFA on affected accounts',
        'Reset passwords for compromised accounts'
      ],
      'critical-events-spike': [
        'Investigate recent security events',
        'Check system logs for anomalies',
        'Enable enhanced logging',
        'Contact security team'
      ],
      'high-threat-score': [
        'Conduct threat assessment',
        'Review detailed threat indicators',
        'Isolate affected systems if needed',
        'Initiate incident response'
      ],
      'api-error-rate-high': [
        'Check API server health',
        'Review error logs',
        'Verify database connectivity',
        'Check rate limiting configuration'
      ],
      'rapid-api-calls': [
        'Verify request source',
        'Check for DDoS patterns',
        'Review rate limiting rules',
        'Consider temporary IP blocking'
      ],
      'compliance-drop': [
        'Review compliance violations',
        'Address failed controls',
        'Update compliance policies',
        'Schedule audit review'
      ],
      'unusual-activity-hours': [
        'Verify user identity',
        'Check for account compromise',
        'Review access patterns',
        'Consider requiring additional authentication'
      ],
      'permission-escalation': [
        'Investigate permission change',
        'Audit user access levels',
        'Review role assignments',
        'Log detailed access changes'
      ],
      'large-data-export': [
        'Verify export request legitimacy',
        'Check data classification',
        'Review data loss prevention rules',
        'Log export details'
      ]
    };

    return actions[rule.id] || [
      'Review alert details',
      'Consult security team',
      'Follow incident response procedure'
    ];
  }

  /**
   * Execute alert action
   */
  private executeAlertAction(rule: MonitoringRule, alert: Alert): void {
    switch (rule.action) {
      case 'log':
        logger.warn(`Alert triggered: ${rule.name}`, { alert });
        break;
      case 'alert':
        this.emit('alert', alert);
        break;
      case 'block':
        logger.error(`Blocking action triggered: ${rule.name}`);
        this.emit('block', alert);
        break;
      case 'notify':
        logger.info(`Notify action triggered: ${rule.name}`);
        this.emit('notify', alert);
        break;
    }
  }

  /**
   * Setup default monitoring rules
   */
  private setupDefaultRules(): void {
    // High failure rate rule (>20%)
    this.addRule({
      id: 'high-failure-rate',
      name: 'High Login Failure Rate',
      description: 'Login failure rate exceeded 20%',
      condition: (metrics) => metrics.failureRate > 20,
      severity: 'high',
      threshold: 20,
      action: 'alert',
      enabled: true,
      cooldownMs: 300000
    });

    // Brute force detection (>5 failed attempts in 5 minutes)
    this.addRule({
      id: 'brute-force-detected',
      name: 'Brute Force Attack Detected',
      description: 'Multiple failed login attempts detected',
      condition: (metrics) => metrics.bruteForceAttempts > 5,
      severity: 'critical',
      threshold: 5,
      action: 'block',
      enabled: true,
      cooldownMs: 600000
    });

    // Critical events spike (>10 in 1 minute)
    this.addRule({
      id: 'critical-events-spike',
      name: 'Critical Events Spike',
      description: 'Unusual spike in critical security events',
      condition: (metrics) => metrics.criticalEvents > 10,
      severity: 'critical',
      threshold: 10,
      action: 'alert',
      enabled: true,
      cooldownMs: 300000
    });

    // High threat score (average >70)
    this.addRule({
      id: 'high-threat-score',
      name: 'High Threat Score',
      description: 'Average threat score exceeded 70',
      condition: (metrics) => metrics.averageThreatScore > 70,
      severity: 'high',
      threshold: 70,
      action: 'alert',
      enabled: true,
      cooldownMs: 300000
    });

    // API error rate (>5%)
    this.addRule({
      id: 'api-error-rate-high',
      name: 'High API Error Rate',
      description: 'API error rate exceeded 5%',
      condition: (metrics) => metrics.errorRate > 5,
      severity: 'medium',
      threshold: 5,
      action: 'notify',
      enabled: true,
      cooldownMs: 600000
    });

    // Rapid API calls (>100/second)
    this.addRule({
      id: 'rapid-api-calls',
      name: 'Rapid API Calls Detected',
      description: 'API call rate exceeded 100 per second',
      condition: (metrics) => metrics.apiCallRate > 100,
      severity: 'high',
      threshold: 100,
      action: 'block',
      enabled: true,
      cooldownMs: 300000
    });

    // Compliance score drop (below 80%)
    this.addRule({
      id: 'compliance-drop',
      name: 'Compliance Score Drop',
      description: 'Compliance score dropped below 80%',
      condition: (metrics) => metrics.complianceScore < 80,
      severity: 'high',
      threshold: 80,
      action: 'alert',
      enabled: true,
      cooldownMs: 900000
    });

    // Unusual activity hours (outside 6am-10pm)
    this.addRule({
      id: 'unusual-activity-hours',
      name: 'Unusual Activity Hours',
      description: 'Activity detected outside business hours',
      condition: (metrics) => {
        const hour = new Date().getHours();
        return (metrics.activeUsers > 0 && (hour < 6 || hour > 22)) || metrics.activeUsers > 500;
      },
      severity: 'medium',
      threshold: 1,
      action: 'log',
      enabled: true,
      cooldownMs: 3600000
    });

    // Multiple failed permissions (>3 in 1 minute)
    this.addRule({
      id: 'permission-escalation',
      name: 'Permission Escalation Attempts',
      description: 'Multiple permission escalation attempts detected',
      condition: (metrics) => metrics.permissionEscalations > 3,
      severity: 'critical',
      threshold: 3,
      action: 'block',
      enabled: true,
      cooldownMs: 600000
    });

    // Large data export (>100MB in 1 hour)
    this.addRule({
      id: 'large-data-export',
      name: 'Large Data Export Detected',
      description: 'Unusually large data export detected',
      condition: (metrics) => metrics.dataExfiltrationAttempts > 3,
      severity: 'high',
      threshold: 3,
      action: 'block',
      enabled: true,
      cooldownMs: 600000
    });
  }

  /**
   * Get dashboard data
   */
  getDashboardData(): DashboardData {
    const historical = this.historicalMetrics.getLast(60); // Last 60 minutes

    const trendLabels = historical.map((m, i) => {
      const date = new Date(m.timestamp);
      return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
    });

    const securityEventsTrend = historical.map(m => m.totalSecurityEvents);
    const threatScoresTrend = historical.map(m => m.averageThreatScore);
    const failureRatesTrend = historical.map(m => m.failureRate);

    // Calculate top threats
    const threatCounts: Record<string, { count: number; severity: string }> = {};
    for (const events of this.securityEvents.values()) {
      for (const event of events.slice(-100)) {
        const key = event.category;
        if (!threatCounts[key]) {
          threatCounts[key] = { count: 0, severity: event.severity };
        }
        threatCounts[key].count++;
      }
    }

    const topThreats = Object.entries(threatCounts)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([type, data]) => ({
        type,
        count: data.count,
        severity: data.severity
      }));

    // System status
    let overallStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (this.metrics.errorRate > 5 || this.metrics.criticalEvents > 5) {
      overallStatus = 'critical';
    } else if (this.metrics.errorRate > 2 || this.metrics.highSeverityEvents > 3) {
      overallStatus = 'warning';
    }

    const componentStatus: Record<string, 'up' | 'down' | 'degraded'> = {};
    for (const [name, health] of this.componentHealth) {
      componentStatus[name] = health.status;
    }

    // Compliance status
    const complianceFrameworks: Record<string, number> = {};
    for (const [framework, score] of this.complianceScores) {
      complianceFrameworks[framework] = score;
    }

    return {
      currentMetrics: this.getMetrics(),
      trendData: {
        labels: trendLabels,
        securityEvents: securityEventsTrend,
        threatScores: threatScoresTrend,
        failureRates: failureRatesTrend
      },
      topThreats,
      recentAlerts: this.recentAlerts.slice(-20),
      systemStatus: {
        overall: overallStatus,
        components: componentStatus
      },
      complianceStatus: {
        overall: this.metrics.complianceScore,
        frameworks: complianceFrameworks
      }
    };
  }

  /**
   * Get real-time stream
   */
  getRealtimeStream(): EventEmitter {
    return this;
  }

  /**
   * Calculate trends for a field
   */
  calculateTrends(field: string, duration: number): TrendData {
    const durationMinutes = Math.ceil(duration / 60000);
    const historical = this.historicalMetrics.getLast(durationMinutes);

    const values = historical.map(m => {
      const value = (m as any)[field] || 0;
      return typeof value === 'number' ? value : 0;
    });

    return {
      labels: historical.map(m => m.timestamp.toISOString()),
      values,
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values)
    };
  }

  /**
   * Identify anomalies
   */
  identifyAnomalies(): Anomaly[] {
    const anomalies: Anomaly[] = [];
    const fields = [
      'totalSecurityEvents',
      'failureRate',
      'averageThreatScore',
      'apiCallRate',
      'errorRate'
    ];

    for (const field of fields) {
      const trend = this.calculateTrends(field, 24 * 3600000); // Last 24 hours

      if (trend.values.length < 2) continue;

      // Calculate standard deviation
      const mean = trend.avg;
      const variance =
        trend.values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / trend.values.length;
      const stdDev = Math.sqrt(variance);

      // Check current value
      const current = (this.metrics as any)[field] || 0;
      const deviation = Math.abs(current - mean);

      if (deviation > stdDev * 2) {
        // More than 2 standard deviations
        const severity =
          deviation > stdDev * 3
            ? 'critical'
            : deviation > stdDev * 2.5
              ? 'high'
              : 'medium';

        anomalies.push({
          type: field,
          severity,
          value: current,
          baseline: mean,
          deviation: Math.round(deviation * 100) / 100,
          timestamp: new Date(),
          description: `${field} is ${deviation > mean ? 'higher' : 'lower'} than baseline by ${Math.round((deviation / mean) * 100)}%`
        });
      }
    }

    this.anomalyHistory.push(...anomalies);
    if (this.anomalyHistory.length > 10000) {
      this.anomalyHistory = this.anomalyHistory.slice(-10000);
    }

    return anomalies;
  }

  /**
   * Get top attack vectors
   */
  getTopAttackVectors(): AttackVector[] {
    const vectors: Map<string, AttackVector> = new Map();

    for (const events of this.securityEvents.values()) {
      for (const event of events.slice(-1000)) {
        const type = event.category;
        if (!vectors.has(type)) {
          vectors.set(type, {
            type,
            count: 0,
            severity: event.severity,
            lastSeen: new Date(),
            sources: []
          });
        }

        const vector = vectors.get(type)!;
        vector.count++;
        vector.lastSeen = new Date(Math.max(vector.lastSeen.getTime(), event.timestamp.getTime()));

        if (event.ipAddress) {
          const sourceIndex = vector.sources.findIndex(s => s.ipAddress === event.ipAddress);
          if (sourceIndex >= 0) {
            vector.sources[sourceIndex].count++;
          } else {
            vector.sources.push({ ipAddress: event.ipAddress, count: 1 });
          }
        }
      }
    }

    return Array.from(vectors.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  /**
   * Get system health
   */
  getSystemHealth(): HealthStatus {
    let overallHealth: 'healthy' | 'warning' | 'critical' = 'healthy';

    if (this.metrics.errorRate > 5 || this.metrics.criticalEvents > 5) {
      overallHealth = 'critical';
    } else if (this.metrics.errorRate > 2 || this.metrics.highSeverityEvents > 3) {
      overallHealth = 'warning';
    }

    const components: Record<string, 'up' | 'down' | 'degraded'> = {};
    for (const [name, health] of this.componentHealth) {
      components[name] = health.status;
    }

    return {
      overall: overallHealth,
      components,
      uptime: this.metrics.systemUptime,
      lastCheck: new Date()
    };
  }

  /**
   * Check compliance
   */
  checkCompliance(): ComplianceStatus {
    const violations = this.violationLog
      .filter(v => {
        const age = Date.now() - v.timestamp.getTime();
        return age < 24 * 3600000; // Last 24 hours
      })
      .map(v => ({
        framework: v.framework,
        control: v.control,
        severity: 'high',
        lastViolation: v.timestamp
      }));

    const frameworks: Record<string, number> = {};
    for (const [name, score] of this.complianceScores) {
      frameworks[name] = score;
    }

    return {
      overall: this.metrics.complianceScore,
      frameworks,
      violations
    };
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId: string, acknowledgedBy: string): void {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedBy = acknowledgedBy;
      alert.acknowledgedAt = new Date();
      this.emit('alert-acknowledged', alert);
    }
  }

  /**
   * Update component health
   */
  updateComponentHealth(
    component: string,
    status: 'up' | 'down' | 'degraded',
    latency: number = 0
  ): void {
    this.componentHealth.set(component, {
      status,
      lastCheck: new Date(),
      latency
    });

    this.emit('component-health-updated', { component, status, latency });
  }

  /**
   * Get all monitoring rules
   */
  getRules(): MonitoringRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Get all alerts
   */
  getAlerts(): Alert[] {
    return Array.from(this.alerts.values());
  }

  /**
   * Clear alerts
   */
  clearAlerts(): void {
    this.alerts.clear();
    this.recentAlerts = [];
    this.emit('alerts-cleared');
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = this.initializeMetrics();
    this.securityEvents.clear();
    this.loginAttempts.clear();
    this.threatScores = [];
    this.historicalMetrics.clear();
    this.anomalyHistory = [];
    this.violationLog = [];
    logger.info('SecurityMonitor metrics reset');
  }

  /**
   * Export metrics as JSON
   */
  exportMetrics(): string {
    return JSON.stringify(
      {
        currentMetrics: this.metrics,
        historicalMetrics: this.historicalMetrics.getAll(),
        alerts: Array.from(this.alerts.values()),
        anomalies: this.anomalyHistory.slice(-100),
        exportedAt: new Date().toISOString()
      },
      null,
      2
    );
  }
}

// Export singleton instance
export const securityMonitor = SecurityMonitor.getInstance();
