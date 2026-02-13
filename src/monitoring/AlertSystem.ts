/**
 * Intelligent Alert System
 * Smart alerting with fatigue prevention and auto-fix integration
 */

import { EventEmitter } from 'events';
import { logger } from '../services/SimpleLogger';

export interface AlertChannel {
  name: string;
  type: 'slack' | 'email' | 'pagerduty' | 'webhook' | 'sms';
  send: (alert: IntelligentAlert) => Promise<void>;
  config: any;
  enabled: boolean;
}

export interface IntelligentAlert {
  id: string;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  errorType: string;
  suggestedActions: string[];
  autoFixAvailable: boolean;
  autoFixInProgress: boolean;
  timestamp: Date;
  metadata?: any;
  groupKey?: string;
}

export interface AlertRule {
  id: string;
  pattern: RegExp;
  severity: 'info' | 'warning' | 'error' | 'critical';
  cooldownPeriod: number;
  grouping: boolean;
  autoFixEnabled: boolean;
}

export interface AlertHistory {
  alertId: string;
  timestamp: Date;
  sent: boolean;
  channels: string[];
  reason?: string;
}

export class IntelligentAlerts extends EventEmitter {
  private channels: Map<string, AlertChannel> = new Map();
  private alertHistory: AlertHistory[] = [];
  private knownPatterns: Map<string, AlertRule> = new Map();
  private alertCooldowns: Map<string, Date> = new Map();
  private groupedAlerts: Map<string, IntelligentAlert[]> = new Map();
  private autoFixInProgress: Set<string> = new Set();
  private maxHistorySize = 10000;
  private groupingWindow = 5 * 60 * 1000; // 5 minutes
  private defaultCooldown = 30 * 60 * 1000; // 30 minutes

  constructor() {
    super();
    this.setupDefaultRules();
    this.setupDefaultChannels();
    this.startGroupedAlertProcessor();
  }

  /**
   * Evaluate if alert should be sent
   */
  async shouldAlert(error: Error, errorType: string): Promise<boolean> {
    // Check if known and handled
    if (this.isKnownAndHandled(errorType)) {
      logger.debug(`Alert suppressed: known and handled - ${errorType}`);
      return false;
    }

    // Check if recently alerted
    if (this.recentlyAlerted(errorType)) {
      logger.debug(`Alert suppressed: recently alerted - ${errorType}`);
      return false;
    }

    // Check if auto-fix is in progress
    if (this.isAutoFixInProgress(errorType)) {
      logger.debug(`Alert suppressed: auto-fix in progress - ${errorType}`);
      return false;
    }

    // Always alert for new patterns
    if (this.isNewPattern(errorType)) {
      logger.info(`New error pattern detected: ${errorType}`);
      return true;
    }

    // Always alert for critical errors
    if (this.isCritical(error, errorType)) {
      logger.warn(`Critical error detected: ${errorType}`);
      return true;
    }

    return false;
  }

  /**
   * Send alert through specified channels
   */
  async sendAlert(
    error: Error,
    errorType: string,
    channels?: string[]
  ): Promise<void> {
    const alert = this.createAlert(error, errorType);

    // Check if should alert
    const should = await this.shouldAlert(error, errorType);
    if (!should) {
      this.recordAlertHistory(alert.id, false, [], 'Suppressed by rules');
      return;
    }

    // Determine channels to use
    const targetChannels = channels || this.getChannelsForSeverity(alert.severity);

    // Check if should group
    const rule = this.findMatchingRule(errorType);
    if (rule?.grouping) {
      this.addToGroup(alert);
      this.recordAlertHistory(alert.id, false, [], 'Grouped for batching');
      return;
    }

    // Send alert
    await this.sendToChannels(alert, targetChannels);

    // Update cooldown
    this.updateCooldown(errorType, rule?.cooldownPeriod || this.defaultCooldown);

    // Record history
    this.recordAlertHistory(alert.id, true, targetChannels);

    this.emit('alert-sent', alert);
  }

  /**
   * Create alert from error
   */
  private createAlert(error: Error, errorType: string): IntelligentAlert {
    const severity = this.determineSeverity(error, errorType);
    const suggestedActions = this.getSuggestedActions(errorType);
    const autoFixAvailable = this.hasAutoFix(errorType);

    return {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: this.generateTitle(error, errorType),
      description: this.generateDescription(error, errorType),
      severity,
      errorType,
      suggestedActions,
      autoFixAvailable,
      autoFixInProgress: this.autoFixInProgress.has(errorType),
      timestamp: new Date(),
      metadata: {
        stack: error.stack,
        message: error.message
      },
      groupKey: this.generateGroupKey(errorType)
    };
  }

  /**
   * Generate alert title
   */
  private generateTitle(error: Error, errorType: string): string {
    const templates: Record<string, string> = {
      NETWORK_ERROR: 'Network connectivity issue detected',
      DATABASE_ERROR: 'Database connection failure',
      AUTH_ERROR: 'Authentication failure',
      VALIDATION_ERROR: 'Data validation failed',
      TIMEOUT_ERROR: 'Operation timeout exceeded',
      MEMORY_ERROR: 'High memory usage detected',
      CPU_ERROR: 'High CPU usage detected'
    };

    return templates[errorType] || `Error detected: ${errorType}`;
  }

  /**
   * Generate alert description
   */
  private generateDescription(error: Error, errorType: string): string {
    const parts: string[] = [];

    parts.push(`Error Type: ${errorType}`);
    parts.push(`Message: ${error.message}`);

    // Add context based on error type
    if (errorType === 'NETWORK_ERROR') {
      parts.push('This may affect external API calls and webhook deliveries.');
    } else if (errorType === 'DATABASE_ERROR') {
      parts.push('This may affect workflow execution and data persistence.');
    }

    // Add auto-fix status
    if (this.hasAutoFix(errorType)) {
      if (this.autoFixInProgress.has(errorType)) {
        parts.push('⚙️ Auto-fix is currently in progress.');
      } else {
        parts.push('✅ Auto-fix is available for this issue.');
      }
    }

    return parts.join('\n');
  }

  /**
   * Determine alert severity
   */
  private determineSeverity(
    error: Error,
    errorType: string
  ): 'info' | 'warning' | 'error' | 'critical' {
    const rule = this.findMatchingRule(errorType);
    if (rule) return rule.severity;

    // Default severity logic
    const criticalTypes = ['DATABASE_ERROR', 'AUTH_ERROR', 'MEMORY_ERROR'];
    const warningTypes = ['NETWORK_ERROR', 'TIMEOUT_ERROR'];

    if (criticalTypes.includes(errorType)) return 'critical';
    if (warningTypes.includes(errorType)) return 'warning';

    return 'error';
  }

  /**
   * Get suggested actions for error type
   */
  getSuggestedActions(errorType: string): string[] {
    const actions: Record<string, string[]> = {
      NETWORK_ERROR: [
        'Check network connectivity',
        'Verify external service status',
        'Review firewall rules',
        'Run network diagnostics'
      ],
      DATABASE_ERROR: [
        'Check database connectivity',
        'Verify database credentials',
        'Review connection pool settings',
        'Check disk space'
      ],
      AUTH_ERROR: [
        'Verify authentication credentials',
        'Check token expiration',
        'Review access permissions',
        'Regenerate API keys if needed'
      ],
      MEMORY_ERROR: [
        'Check memory usage',
        'Review application memory leaks',
        'Increase memory allocation',
        'Restart affected services'
      ],
      CPU_ERROR: [
        'Check CPU usage',
        'Review long-running processes',
        'Optimize resource-intensive operations',
        'Scale horizontally if needed'
      ],
      TIMEOUT_ERROR: [
        'Check operation timeout settings',
        'Review slow queries',
        'Optimize performance bottlenecks',
        'Increase timeout thresholds'
      ]
    };

    return actions[errorType] || [
      'Review error logs',
      'Check system health',
      'Contact support if issue persists'
    ];
  }

  /**
   * Check if auto-fix is available
   */
  hasAutoFix(errorType: string): boolean {
    const autoFixTypes = [
      'NETWORK_ERROR',
      'DATABASE_ERROR',
      'TIMEOUT_ERROR',
      'CACHE_ERROR'
    ];

    return autoFixTypes.includes(errorType);
  }

  /**
   * Mark auto-fix as in progress
   */
  markAutoFixInProgress(errorType: string): void {
    this.autoFixInProgress.add(errorType);
    this.emit('autofix-started', { errorType });
  }

  /**
   * Mark auto-fix as complete
   */
  markAutoFixComplete(errorType: string): void {
    this.autoFixInProgress.delete(errorType);
    this.emit('autofix-completed', { errorType });
  }

  /**
   * Check if error is known and handled
   */
  private isKnownAndHandled(errorType: string): boolean {
    const rule = this.findMatchingRule(errorType);
    return rule !== null && rule.autoFixEnabled && this.hasAutoFix(errorType);
  }

  /**
   * Check if recently alerted
   */
  private recentlyAlerted(errorType: string): boolean {
    const lastAlert = this.alertCooldowns.get(errorType);
    if (!lastAlert) return false;

    const rule = this.findMatchingRule(errorType);
    const cooldown = rule?.cooldownPeriod || this.defaultCooldown;

    return Date.now() - lastAlert.getTime() < cooldown;
  }

  /**
   * Check if auto-fix is in progress
   */
  private isAutoFixInProgress(errorType: string): boolean {
    return this.autoFixInProgress.has(errorType);
  }

  /**
   * Check if new error pattern
   */
  private isNewPattern(errorType: string): boolean {
    return !this.knownPatterns.has(errorType) &&
           !this.alertHistory.some(h => h.alertId.includes(errorType));
  }

  /**
   * Check if error is critical
   */
  private isCritical(error: Error, errorType: string): boolean {
    const criticalTypes = [
      'DATABASE_ERROR',
      'AUTH_ERROR',
      'SECURITY_ERROR',
      'DATA_LOSS_ERROR'
    ];

    return criticalTypes.includes(errorType) ||
           error.message.toLowerCase().includes('critical');
  }

  /**
   * Find matching alert rule
   */
  private findMatchingRule(errorType: string): AlertRule | null {
    for (const rule of Array.from(this.knownPatterns.values())) {
      if (rule.pattern.test(errorType)) {
        return rule;
      }
    }
    return null;
  }

  /**
   * Get channels for severity level
   */
  private getChannelsForSeverity(severity: string): string[] {
    const channelsBySeverity: Record<string, string[]> = {
      info: ['slack'],
      warning: ['slack', 'email'],
      error: ['slack', 'email'],
      critical: ['slack', 'email', 'pagerduty', 'sms']
    };

    return channelsBySeverity[severity] || ['slack'];
  }

  /**
   * Send alert to multiple channels
   */
  private async sendToChannels(
    alert: IntelligentAlert,
    channelNames: string[]
  ): Promise<void> {
    const promises = channelNames.map(async name => {
      const channel = this.channels.get(name);
      if (!channel || !channel.enabled) {
        logger.warn(`Channel not found or disabled: ${name}`);
        return;
      }

      try {
        await channel.send(alert);
        logger.info(`Alert sent to ${name}:`, alert.title);
      } catch (error) {
        logger.error(`Failed to send alert to ${name}:`, error);
      }
    });

    await Promise.all(promises);
  }

  /**
   * Add alert to group
   */
  private addToGroup(alert: IntelligentAlert): void {
    if (!alert.groupKey) return;

    const group = this.groupedAlerts.get(alert.groupKey) || [];
    group.push(alert);
    this.groupedAlerts.set(alert.groupKey, group);
  }

  /**
   * Generate group key
   */
  private generateGroupKey(errorType: string): string {
    const timestamp = Math.floor(Date.now() / this.groupingWindow);
    return `${errorType}_${timestamp}`;
  }

  /**
   * Process grouped alerts
   */
  private async processGroupedAlerts(): Promise<void> {
    const now = Date.now();

    for (const [groupKey, alerts] of Array.from(this.groupedAlerts.entries())) {
      if (alerts.length === 0) continue;

      const oldestAlert = alerts[0];
      const age = now - oldestAlert.timestamp.getTime();

      // Send if window expired or too many alerts
      if (age >= this.groupingWindow || alerts.length >= 10) {
        await this.sendGroupedAlert(groupKey, alerts);
        this.groupedAlerts.delete(groupKey);
      }
    }
  }

  /**
   * Send grouped alert
   */
  private async sendGroupedAlert(
    groupKey: string,
    alerts: IntelligentAlert[]
  ): Promise<void> {
    const firstAlert = alerts[0];
    const errorType = firstAlert.errorType;

    const groupedAlert: IntelligentAlert = {
      id: `grouped_${groupKey}`,
      title: `${alerts.length} ${errorType} errors detected`,
      description: `${alerts.length} similar errors occurred in the last ${this.groupingWindow / 60000} minutes.\n\nFirst error: ${firstAlert.description}`,
      severity: firstAlert.severity,
      errorType,
      suggestedActions: firstAlert.suggestedActions,
      autoFixAvailable: firstAlert.autoFixAvailable,
      autoFixInProgress: firstAlert.autoFixInProgress,
      timestamp: new Date(),
      metadata: {
        count: alerts.length,
        firstOccurrence: alerts[0].timestamp,
        lastOccurrence: alerts[alerts.length - 1].timestamp
      }
    };

    const channels = this.getChannelsForSeverity(groupedAlert.severity);
    await this.sendToChannels(groupedAlert, channels);

    this.emit('grouped-alert-sent', { groupKey, count: alerts.length });
  }

  /**
   * Start grouped alert processor
   */
  private startGroupedAlertProcessor(): void {
    setInterval(() => {
      this.processGroupedAlerts();
    }, 60000); // Process every minute
  }

  /**
   * Update cooldown for error type
   */
  private updateCooldown(errorType: string, cooldownPeriod: number): void {
    this.alertCooldowns.set(errorType, new Date());

    // Clean up old cooldowns
    setTimeout(() => {
      this.alertCooldowns.delete(errorType);
    }, cooldownPeriod);
  }

  /**
   * Record alert history
   */
  private recordAlertHistory(
    alertId: string,
    sent: boolean,
    channels: string[],
    reason?: string
  ): void {
    this.alertHistory.push({
      alertId,
      timestamp: new Date(),
      sent,
      channels,
      reason
    });

    // Trim history
    if (this.alertHistory.length > this.maxHistorySize) {
      this.alertHistory = this.alertHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Add alert channel
   */
  addChannel(channel: AlertChannel): void {
    this.channels.set(channel.name, channel);
    logger.info(`Alert channel added: ${channel.name}`);
  }

  /**
   * Add alert rule
   */
  addRule(rule: AlertRule): void {
    this.knownPatterns.set(rule.id, rule);
    logger.info(`Alert rule added: ${rule.id}`);
  }

  /**
   * Setup default rules
   */
  private setupDefaultRules(): void {
    this.addRule({
      id: 'network-errors',
      pattern: /NETWORK_ERROR/,
      severity: 'warning',
      cooldownPeriod: 30 * 60 * 1000, // 30 minutes
      grouping: true,
      autoFixEnabled: true
    });

    this.addRule({
      id: 'database-errors',
      pattern: /DATABASE_ERROR/,
      severity: 'critical',
      cooldownPeriod: 15 * 60 * 1000, // 15 minutes
      grouping: false,
      autoFixEnabled: true
    });

    this.addRule({
      id: 'auth-errors',
      pattern: /AUTH_ERROR/,
      severity: 'error',
      cooldownPeriod: 60 * 60 * 1000, // 1 hour
      grouping: true,
      autoFixEnabled: false
    });
  }

  /**
   * Setup default channels
   */
  private setupDefaultChannels(): void {
    // Slack channel
    this.addChannel({
      name: 'slack',
      type: 'slack',
      enabled: true,
      config: { webhook: process.env.SLACK_WEBHOOK_URL },
      send: async (alert) => {
        logger.info(`[SLACK] ${alert.title}`, { severity: alert.severity });
      }
    });

    // Email channel
    this.addChannel({
      name: 'email',
      type: 'email',
      enabled: true,
      config: { to: process.env.ALERT_EMAIL },
      send: async (alert) => {
        logger.info(`[EMAIL] ${alert.title}`, { severity: alert.severity });
      }
    });

    // PagerDuty channel
    this.addChannel({
      name: 'pagerduty',
      type: 'pagerduty',
      enabled: false,
      config: { serviceKey: process.env.PAGERDUTY_KEY },
      send: async (alert) => {
        logger.info(`[PAGERDUTY] ${alert.title}`, { severity: alert.severity });
      }
    });
  }

  /**
   * Get alert statistics
   */
  getStatistics(): any {
    const last24h = this.alertHistory.filter(
      h => Date.now() - h.timestamp.getTime() < 24 * 3600000
    );

    return {
      total: this.alertHistory.length,
      last24h: last24h.length,
      sent: last24h.filter(h => h.sent).length,
      suppressed: last24h.filter(h => !h.sent).length,
      byChannel: this.getChannelStatistics(last24h),
      activeCooldowns: this.alertCooldowns.size,
      groupedAlerts: this.groupedAlerts.size,
      autoFixInProgress: this.autoFixInProgress.size
    };
  }

  /**
   * Get channel statistics
   */
  private getChannelStatistics(history: AlertHistory[]): Record<string, number> {
    const stats: Record<string, number> = {};

    for (const record of history) {
      if (!record.sent) continue;

      for (const channel of record.channels) {
        stats[channel] = (stats[channel] || 0) + 1;
      }
    }

    return stats;
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.alertHistory = [];
    this.alertCooldowns.clear();
    this.groupedAlerts.clear();
  }
}

// Export singleton instance
export const intelligentAlerts = new IntelligentAlerts();
