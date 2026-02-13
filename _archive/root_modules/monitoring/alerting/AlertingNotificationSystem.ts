import { EventEmitter } from 'events';
import * as crypto from 'crypto';

export interface Alert {
  id: string;
  name: string;
  description?: string;
  severity: 'info' | 'warning' | 'critical' | 'emergency';
  status: 'open' | 'acknowledged' | 'resolved' | 'suppressed';
  source: string;
  sourceType: 'metric' | 'log' | 'trace' | 'synthetic' | 'external';
  timestamp: number;
  resolvedAt?: number;
  acknowledgedAt?: number;
  acknowledgedBy?: string;
  tags: { [key: string]: string };
  context: AlertContext;
  fingerprint: string;
  groupingKey: string;
  escalationLevel: number;
  suppressUntil?: number;
  metadata: {
    ruleId: string;
    ruleName: string;
    query?: string;
    threshold?: number;
    actualValue?: number;
    evaluationDuration: number;
    fireCount: number;
    lastFired: number;
    correlations?: string[];
  };
}

export interface AlertContext {
  service?: string;
  environment?: string;
  region?: string;
  cluster?: string;
  host?: string;
  tenant?: string;
  user?: string;
  workflow?: {
    id: string;
    name: string;
    executionId?: string;
    nodeId?: string;
  };
  custom?: { [key: string]: unknown };
}

export interface AlertRule {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  query: AlertQuery;
  conditions: AlertCondition[];
  evaluation: {
    interval: number;
    for: number;
    timeout?: number;
  };
  labels?: { [key: string]: string };
  annotations?: { [key: string]: string };
  severity: Alert['severity'];
  notificationChannels: string[];
  escalation?: EscalationPolicy;
  suppression?: SuppressionRule;
  recovery?: RecoveryCondition;
  dependencies?: string[];
  schedule?: AlertSchedule;
  metadata: {
    createdAt: number;
    updatedAt: number;
    createdBy: string;
    version: number;
    tags: string[];
  };
}

export interface AlertQuery {
  type: 'metric' | 'log' | 'trace';
  datasource: string;
  query: string;
  parameters?: { [key: string]: unknown };
  timeRange?: {
    from: string;
    to: string;
  };
  groupBy?: string[];
  filters?: { [key: string]: unknown };
}

export interface AlertCondition {
  id: string;
  type: 'threshold' | 'change' | 'anomaly' | 'outlier' | 'missing_data';
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'ne';
  value: number | string;
  aggregation?: 'avg' | 'sum' | 'min' | 'max' | 'count' | 'rate' | 'percentile';
  percentile?: number;
  timeWindow?: number;
  confidence?: number;
  sensitivity?: number;
}

export interface EscalationPolicy {
  enabled: boolean;
  levels: EscalationLevel[];
  maxEscalations?: number;
  cooldownPeriod?: number;
}

export interface EscalationLevel {
  level: number;
  delay: number;
  channels: string[];
  conditions?: {
    stillFiring?: boolean;
    notAcknowledged?: boolean;
    severityIncrease?: boolean;
  };
}

export interface SuppressionRule {
  type: 'time_based' | 'dependency' | 'maintenance' | 'rate_limit';
  duration?: number;
  schedule?: AlertSchedule;
  dependencies?: string[];
  conditions?: { [key: string]: unknown };
  rateLimiting?: {
    maxAlerts: number;
    timeWindow: number;
  };
}

export interface RecoveryCondition {
  enabled: boolean;
  threshold?: number;
  duration?: number;
  autoResolve: boolean;
}

export interface AlertSchedule {
  timezone: string;
  activePeriods: Array<{
    days: ('monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday')[];
    startTime: string;
    endTime: string;
  }>;
  excludeDates?: string[];
  includeHolidays?: boolean;
}

export interface NotificationChannel {
  id: string;
  name: string;
  type: 'email' | 'slack' | 'webhook' | 'pagerduty' | 'opsgenie' | 'teams' | 'discord' | 'sms';
  enabled: boolean;
  config: NotificationChannelConfig;
  filters?: NotificationFilter[];
  rateLimiting?: {
    maxNotifications: number;
    timeWindow: number;
  };
  retryPolicy?: {
    maxRetries: number;
    backoff: 'linear' | 'exponential';
    initialDelay: number;
    maxDelay: number;
  };
  formatting?: NotificationFormat;
  metadata: {
    createdAt: number;
    updatedAt: number;
    lastUsed?: number;
    successCount: number;
    errorCount: number;
  };
}

export interface NotificationChannelConfig {
  // Email
  recipients?: string[];
  smtpSettings?: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };

  // Slack
  webhookUrl?: string;
  channel?: string;
  username?: string;
  iconEmoji?: string;
  token?: string;

  // Webhook
  url?: string;
  method?: 'POST' | 'PUT' | 'PATCH';
  headers?: { [key: string]: string };
  authentication?: {
    type: 'basic' | 'bearer' | 'apikey';
    credentials: { [key: string]: string };
  };

  // PagerDuty
  integrationKey?: string;
  severity?: string;

  // OpsGenie
  apiKey?: string;
  team?: string;
  priority?: string;

  // SMS
  provider?: 'twilio' | 'aws_sns';
  phoneNumbers?: string[];
  credentials?: { [key: string]: string };

  // Custom
  custom?: { [key: string]: unknown };
}

export interface NotificationFilter {
  type: 'severity' | 'source' | 'tag' | 'time' | 'frequency';
  condition: {
    operator: 'eq' | 'ne' | 'in' | 'nin' | 'gt' | 'lt';
    value: unknown;
  };
  enabled: boolean;
}

export interface NotificationFormat {
  titleTemplate: string;
  bodyTemplate: string;
  colorMapping?: { [severity: string]: string };
  includeFields?: string[];
  excludeFields?: string[];
  customFields?: { [key: string]: string };
}

export interface NotificationHistory {
  id: string;
  alertId: string;
  channelId: string;
  timestamp: number;
  status: 'sent' | 'failed' | 'pending' | 'throttled';
  attempts: number;
  lastAttempt: number;
  error?: string;
  metadata: {
    deliveryTime?: number;
    responseCode?: number;
    messageId?: string;
  };
}

export interface AlertGroup {
  id: string;
  name: string;
  alerts: Alert[];
  groupingKey: string;
  status: 'active' | 'resolved';
  createdAt: number;
  updatedAt: number;
  lastFired: number;
  count: number;
  severity: Alert['severity'];
  commonLabels: { [key: string]: string };
  summary: string;
}

export interface AlertSummary {
  total: number;
  byStatus: { [status: string]: number };
  bySeverity: { [severity: string]: number };
  bySource: { [source: string]: number };
  topAlerts: Alert[];
  trends: {
    timestamp: number;
    count: number;
    resolved: number;
  }[];
}

export class AlertingNotificationSystem extends EventEmitter {
  private alerts: Map<string, Alert> = new Map();
  private alertRules: Map<string, AlertRule> = new Map();
  private notificationChannels: Map<string, NotificationChannel> = new Map();
  private notificationHistory: Map<string, NotificationHistory> = new Map();
  private alertGroups: Map<string, AlertGroup> = new Map();
  private evaluationTimers: Map<string, NodeJS.Timeout> = new Map();
  private escalationTimers: Map<string, NodeJS.Timeout> = new Map();
  private suppressionTimers: Map<string, NodeJS.Timeout> = new Map();
  private isRunning = false;

  constructor() {
    super();
  }

  public async start(): Promise<void> {
    if (this.isRunning) return;

    // Start rule evaluation loops
    for (const rule of this.alertRules.values()) {
      if (rule.enabled) {
        this.startRuleEvaluation(rule);
      }
    }

    // Start cleanup tasks
    setInterval(() => {
      this.cleanupResolvedAlerts();
      this.cleanupNotificationHistory();
    }, 300000); // Every 5 minutes

    this.isRunning = true;
    this.emit('system:started');
  }

  public async stop(): Promise<void> {
    if (!this.isRunning) return;

    // Stop all timers
    for (const timer of this.evaluationTimers.values()) {
      clearInterval(timer);
    }
    for (const timer of this.escalationTimers.values()) {
      clearTimeout(timer);
    }
    for (const timer of this.suppressionTimers.values()) {
      clearTimeout(timer);
    }

    this.evaluationTimers.clear();
    this.escalationTimers.clear();
    this.suppressionTimers.clear();

    this.isRunning = false;
    this.emit('system:stopped');
  }

  // Alert Rule Management
  public createAlertRule(rule: Omit<AlertRule, 'id' | 'metadata'>): AlertRule {
    const alertRule: AlertRule = {
      id: crypto.randomUUID(),
      metadata: {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: 'system',
        version: 1,
        tags: []
      },
      ...rule
    };

    this.alertRules.set(alertRule.id, alertRule);

    if (alertRule.enabled && this.isRunning) {
      this.startRuleEvaluation(alertRule);
    }

    this.emit('rule:created', alertRule);
    return alertRule;
  }

  public updateAlertRule(id: string, updates: Partial<AlertRule>): AlertRule {
    const rule = this.alertRules.get(id);
    if (!rule) {
      throw new Error(`Alert rule not found: ${id}`);
    }

    const updatedRule: AlertRule = {
      ...rule,
      ...updates,
      metadata: {
        ...rule.metadata,
        updatedAt: Date.now(),
        version: rule.metadata.version + 1
      }
    };

    this.alertRules.set(id, updatedRule);

    // Restart evaluation if rule is enabled
    this.stopRuleEvaluation(id);
    if (updatedRule.enabled && this.isRunning) {
      this.startRuleEvaluation(updatedRule);
    }

    this.emit('rule:updated', updatedRule);
    return updatedRule;
  }

  public deleteAlertRule(id: string): void {
    const rule = this.alertRules.get(id);
    if (!rule) {
      throw new Error(`Alert rule not found: ${id}`);
    }

    this.stopRuleEvaluation(id);
    this.alertRules.delete(id);

    // Resolve all alerts from this rule
    for (const alert of this.alerts.values()) {
      if (alert.metadata.ruleId === id && alert.status !== 'resolved') {
        this.resolveAlert(alert.id, 'Rule deleted');
      }
    }

    this.emit('rule:deleted', rule);
  }

  // Alert Management
  public createAlert(alert: Omit<Alert, 'id' | 'timestamp' | 'fingerprint' | 'groupingKey'>): Alert {
    const newAlert: Alert = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      fingerprint: this.generateFingerprint(alert),
      groupingKey: this.generateGroupingKey(alert),
      escalationLevel: 0,
      ...alert
    };

    // Check for existing alerts with same fingerprint
    const existingAlert = this.findAlertByFingerprint(newAlert.fingerprint);
    if (existingAlert && existingAlert.status !== 'resolved') {
      // Update existing alert
      existingAlert.metadata.fireCount++;
      existingAlert.metadata.lastFired = Date.now();
      this.emit('alert:updated', existingAlert);
      return existingAlert;
    }

    this.alerts.set(newAlert.id, newAlert);
    this.updateAlertGroup(newAlert);

    // Check suppression
    if (this.isAlertSuppressed(newAlert)) {
      newAlert.status = 'suppressed';
      this.scheduleSuppressionEnd(newAlert);
    } else {
      // Send notifications
      this.sendAlertNotifications(newAlert);
    }

    this.emit('alert:created', newAlert);
    return newAlert;
  }

  public acknowledgeAlert(id: string, acknowledgedBy: string, note?: string): void {
    const alert = this.alerts.get(id);
    if (!alert) {
      throw new Error(`Alert not found: ${id}`);
    }

    if (alert.status === 'open') {
      alert.status = 'acknowledged';
      alert.acknowledgedAt = Date.now();
      alert.acknowledgedBy = acknowledgedBy;

      if (note) {
        alert.context.custom = { ...alert.context.custom, acknowledgeNote: note };
      }

      // Cancel escalation
      this.cancelEscalation(alert.id);

      this.emit('alert:acknowledged', alert);
    }
  }

  public resolveAlert(id: string, reason?: string): void {
    const alert = this.alerts.get(id);
    if (!alert) {
      throw new Error(`Alert not found: ${id}`);
    }

    if (alert.status !== 'resolved') {
      alert.status = 'resolved';
      alert.resolvedAt = Date.now();

      if (reason) {
        alert.context.custom = { ...alert.context.custom, resolveReason: reason };
      }

      // Cancel escalation and suppression
      this.cancelEscalation(alert.id);
      this.cancelSuppression(alert.id);

      // Update alert group
      this.updateAlertGroup(alert);

      // Send resolution notification
      this.sendResolutionNotification(alert);

      this.emit('alert:resolved', alert);
    }
  }

  // Notification Channel Management
  public createNotificationChannel(channel: Omit<NotificationChannel, 'id' | 'metadata'>): NotificationChannel {
    const notificationChannel: NotificationChannel = {
      id: crypto.randomUUID(),
      metadata: {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        successCount: 0,
        errorCount: 0
      },
      ...channel
    };

    this.notificationChannels.set(notificationChannel.id, notificationChannel);
    this.emit('channel:created', notificationChannel);
    
    return notificationChannel;
  }

  public updateNotificationChannel(id: string, updates: Partial<NotificationChannel>): NotificationChannel {
    const channel = this.notificationChannels.get(id);
    if (!channel) {
      throw new Error(`Notification channel not found: ${id}`);
    }

    const updatedChannel: NotificationChannel = {
      ...channel,
      ...updates,
      metadata: {
        ...channel.metadata,
        updatedAt: Date.now()
      }
    };

    this.notificationChannels.set(id, updatedChannel);
    this.emit('channel:updated', updatedChannel);
    
    return updatedChannel;
  }

  public deleteNotificationChannel(id: string): void {
    const channel = this.notificationChannels.get(id);
    if (!channel) {
      throw new Error(`Notification channel not found: ${id}`);
    }

    this.notificationChannels.delete(id);
    this.emit('channel:deleted', channel);
  }

  // Private Methods
  private startRuleEvaluation(rule: AlertRule): void {
    const timer = setInterval(async () => {
      try {
        await this.evaluateRule(rule);
      } catch (error) {
        this.emit('rule:evaluation:failed', { rule, error });
      }
    }, rule.evaluation.interval);

    this.evaluationTimers.set(rule.id, timer);
  }

  private stopRuleEvaluation(ruleId: string): void {
    const timer = this.evaluationTimers.get(ruleId);
    if (timer) {
      clearInterval(timer);
      this.evaluationTimers.delete(ruleId);
    }
  }

  private async evaluateRule(rule: AlertRule): Promise<void> {
    const startTime = Date.now();

    try {
      // Check if rule should be evaluated based on schedule
      if (rule.schedule && !this.isRuleScheduleActive(rule.schedule)) {
        return;
      }

      // Check dependencies
      if (rule.dependencies && this.hasFailedDependencies(rule.dependencies)) {
        return;
      }

      // Execute query
      const queryResult = await this.executeQuery(rule.query);

      // Evaluate conditions
      const conditionResults = rule.conditions.map(condition => 
        this.evaluateCondition(condition, queryResult)
      );

      const isFiring = conditionResults.every(result => result.isMet);
      const evaluationDuration = Date.now() - startTime;

      // Check if alert should fire
      if (isFiring) {
        const alert = this.createAlert({
          name: rule.name,
          description: rule.description,
          severity: rule.severity,
          status: 'open',
          source: rule.id,
          sourceType: 'metric',
          tags: { ...rule.labels },
          context: this.buildAlertContext(rule, queryResult, conditionResults),
          escalationLevel: 0,
          metadata: {
            ruleId: rule.id,
            ruleName: rule.name,
            query: rule.query.query,
            threshold: conditionResults[0]?.threshold,
            actualValue: conditionResults[0]?.actualValue,
            evaluationDuration,
            fireCount: 1,
            lastFired: Date.now()
          }
        });

        // Schedule escalation if configured
        if (rule.escalation?.enabled) {
          this.scheduleEscalation(alert, rule.escalation);
        }
      } else {
        // Check for recovery
        this.checkAlertRecovery(rule);
      }

    } catch (error) {
      this.emit('rule:evaluation:error', { rule, error });
    }
  }

  private async executeQuery(_query: AlertQuery): Promise<unknown> { // eslint-disable-line @typescript-eslint/no-unused-vars
    // Mock query execution - in reality, this would query the actual datasource
    return {
      values: [Math.random() * 100],
      timestamp: Date.now(),
      metadata: {}
    };
  }

  private evaluateCondition(condition: AlertCondition, queryResult: unknown): {
    isMet: boolean;
    threshold?: number;
    actualValue?: number;
  } {
    const value = queryResult.values?.[0] || 0;
    const threshold = typeof condition.value === 'number' ? condition.value : parseFloat(condition.value);

    let isMet = false;

    switch (condition.operator) {
      case 'gt':
        isMet = value > threshold;
        break;
      case 'gte':
        isMet = value >= threshold;
        break;
      case 'lt':
        isMet = value < threshold;
        break;
      case 'lte':
        isMet = value <= threshold;
        break;
      case 'eq':
        isMet = value === threshold;
        break;
      case 'ne':
        isMet = value !== threshold;
        break;
    }

    return {
      isMet,
      threshold,
      actualValue: value
    };
  }

  private buildAlertContext(rule: AlertRule, queryResult: unknown, conditionResults: unknown[]): AlertContext {
    return {
      service: rule.labels?.service,
      environment: rule.labels?.environment,
      custom: {
        queryResult,
        conditionResults,
        ruleLabels: rule.labels,
        ruleAnnotations: rule.annotations
      }
    };
  }

  private async sendAlertNotifications(alert: Alert): Promise<void> {
    const rule = this.alertRules.get(alert.metadata.ruleId);
    if (!rule) return;

    for (const channelId of rule.notificationChannels) {
      const channel = this.notificationChannels.get(channelId);
      if (!channel || !channel.enabled) continue;

      // Check filters
      if (channel.filters && !this.passesNotificationFilters(alert, channel.filters)) {
        continue;
      }

      // Check rate limiting
      if (channel.rateLimiting && this.isRateLimited(channelId, channel.rateLimiting)) {
        continue;
      }

      try {
        await this.sendNotification(alert, channel);
        
        // Record success
        channel.metadata.successCount++;
        channel.metadata.lastUsed = Date.now();

      } catch (error) {
        // Record failure
        channel.metadata.errorCount++;
        
        // Schedule retry if configured
        if (channel.retryPolicy) {
          this.scheduleNotificationRetry(alert, channel, error);
        }

        this.emit('notification:failed', { alert, channel, error });
      }
    }
  }

  private async sendNotification(alert: Alert, channel: NotificationChannel): Promise<void> {
    const notification: NotificationHistory = {
      id: crypto.randomUUID(),
      alertId: alert.id,
      channelId: channel.id,
      timestamp: Date.now(),
      status: 'pending',
      attempts: 1,
      lastAttempt: Date.now(),
      metadata: {}
    };

    this.notificationHistory.set(notification.id, notification);

    try {
      switch (channel.type) {
        case 'email':
          await this.sendEmailNotification(alert, channel);
          break;
        case 'slack':
          await this.sendSlackNotification(alert, channel);
          break;
        case 'webhook':
          await this.sendWebhookNotification(alert, channel);
          break;
        case 'pagerduty':
          await this.sendPagerDutyNotification(alert, channel);
          break;
        case 'opsgenie':
          await this.sendOpsGenieNotification(alert, channel);
          break;
        case 'sms':
          await this.sendSMSNotification(alert, channel);
          break;
        default:
          throw new Error(`Unsupported notification type: ${channel.type}`);
      }

      notification.status = 'sent';
      this.emit('notification:sent', { alert, channel });

    } catch (error) {
      notification.status = 'failed';
      notification.error = error.message;
      throw error;
    }
  }

  private async sendEmailNotification(alert: Alert, channel: NotificationChannel): Promise<void> {
    const message = this.formatNotificationMessage(alert, channel);
    
    console.log('Sending email notification:', {
      to: channel.config.recipients,
      subject: message.title,
      body: message.body
    });
  }

  private async sendSlackNotification(alert: Alert, channel: NotificationChannel): Promise<void> {
    const message = this.formatNotificationMessage(alert, channel);
    
    console.log('Sending Slack notification:', {
      webhook: channel.config.webhookUrl,
      channel: channel.config.channel,
      message: message.body
    });
  }

  private async sendWebhookNotification(alert: Alert, channel: NotificationChannel): Promise<void> {
    const _message = this.formatNotificationMessage(alert, channel); // eslint-disable-line @typescript-eslint/no-unused-vars
    
    console.log('Sending webhook notification:', {
      url: channel.config.url,
      method: channel.config.method,
      alert: alert
    });
  }

  private async sendPagerDutyNotification(alert: Alert, channel: NotificationChannel): Promise<void> {
    console.log('Sending PagerDuty notification:', {
      integrationKey: channel.config.integrationKey,
      alert: alert
    });
  }

  private async sendOpsGenieNotification(alert: Alert, channel: NotificationChannel): Promise<void> {
    console.log('Sending OpsGenie notification:', {
      apiKey: channel.config.apiKey,
      alert: alert
    });
  }

  private async sendSMSNotification(alert: Alert, channel: NotificationChannel): Promise<void> {
    const message = this.formatNotificationMessage(alert, channel);
    
    console.log('Sending SMS notification:', {
      provider: channel.config.provider,
      phones: channel.config.phoneNumbers,
      message: message.body
    });
  }

  private formatNotificationMessage(alert: Alert, channel: NotificationChannel): {
    title: string;
    body: string;
  } {
    const format = channel.formatting;
    
    const title = format?.titleTemplate
      ? this.interpolateTemplate(format.titleTemplate, alert)
      : `[${alert.severity.toUpperCase()}] ${alert.name}`;
    
    const body = format?.bodyTemplate
      ? this.interpolateTemplate(format.bodyTemplate, alert)
      : this.generateDefaultMessage(alert);

    return { title, body };
  }

  private interpolateTemplate(template: string, alert: Alert): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const value = this.getNestedValue(alert, path.trim());
      return value !== undefined ? String(value) : match;
    });
  }

  private getNestedValue(obj: unknown, path: string): unknown {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  private generateDefaultMessage(alert: Alert): string {
    return `Alert: ${alert.name}
Severity: ${alert.severity}
Status: ${alert.status}
Source: ${alert.source}
Time: ${new Date(alert.timestamp).toISOString()}
${alert.description ? `Description: ${alert.description}` : ''}
${alert.metadata.actualValue !== undefined ? `Current Value: ${alert.metadata.actualValue}` : ''}
${alert.metadata.threshold !== undefined ? `Threshold: ${alert.metadata.threshold}` : ''}`;
  }

  // Helper Methods
  private generateFingerprint(alert: Omit<Alert, 'id' | 'timestamp' | 'fingerprint' | 'groupingKey'>): string {
    const input = `${alert.name}:${alert.source}:${JSON.stringify(alert.tags)}`;
    return crypto.createHash('md5').update(input).digest('hex');
  }

  private generateGroupingKey(alert: Omit<Alert, 'id' | 'timestamp' | 'fingerprint' | 'groupingKey'>): string {
    const groupingFields = [alert.name, alert.source, alert.context.service, alert.context.environment];
    return groupingFields.filter(f => f).join(':');
  }

  private findAlertByFingerprint(fingerprint: string): Alert | undefined {
    return Array.from(this.alerts.values()).find(alert => alert.fingerprint === fingerprint);
  }

  private isAlertSuppressed(alert: Alert): boolean {
    const rule = this.alertRules.get(alert.metadata.ruleId);
    if (!rule?.suppression) return false;

    const suppression = rule.suppression;

    switch (suppression.type) {
      case 'time_based':
        return suppression.duration ? Date.now() < (alert.timestamp + suppression.duration) : false;
      case 'maintenance':
        return this.isMaintenanceWindow(suppression.schedule);
      case 'rate_limit':
        return this.isRateLimitExceeded(alert, suppression.rateLimiting);
      default:
        return false;
    }
  }

  private scheduleEscalation(alert: Alert, escalation: EscalationPolicy): void {
    if (!escalation.levels.length) return;

    const firstLevel = escalation.levels[0];
    const timer = setTimeout(() => {
      this.escalateAlert(alert, escalation, 0);
    }, firstLevel.delay);

    this.escalationTimers.set(alert.id, timer);
  }

  private escalateAlert(alert: Alert, escalation: EscalationPolicy, levelIndex: number): void {
    if (levelIndex >= escalation.levels.length) return;
    if (alert.status === 'resolved' || alert.status === 'acknowledged') return;

    const level = escalation.levels[levelIndex];
    alert.escalationLevel = level.level;

    // Send escalation notifications
    for (const channelId of level.channels) {
      const channel = this.notificationChannels.get(channelId);
      if (channel && channel.enabled) {
        this.sendNotification(alert, channel).catch(error => {
          this.emit('escalation:notification:failed', { alert, channel, error });
        });
      }
    }

    this.emit('alert:escalated', { alert, level });

    // Schedule next escalation level
    const nextLevelIndex = levelIndex + 1;
    if (nextLevelIndex < escalation.levels.length) {
      const nextLevel = escalation.levels[nextLevelIndex];
      const timer = setTimeout(() => {
        this.escalateAlert(alert, escalation, nextLevelIndex);
      }, nextLevel.delay);

      this.escalationTimers.set(alert.id, timer);
    }
  }

  private cancelEscalation(alertId: string): void {
    const timer = this.escalationTimers.get(alertId);
    if (timer) {
      clearTimeout(timer);
      this.escalationTimers.delete(alertId);
    }
  }

  private cancelSuppression(alertId: string): void {
    const timer = this.suppressionTimers.get(alertId);
    if (timer) {
      clearTimeout(timer);
      this.suppressionTimers.delete(alertId);
    }
  }

  private scheduleSuppressionEnd(alert: Alert): void {
    const rule = this.alertRules.get(alert.metadata.ruleId);
    if (!rule?.suppression?.duration) return;

    const timer = setTimeout(() => {
      if (alert.status === 'suppressed') {
        alert.status = 'open';
        this.sendAlertNotifications(alert);
        this.emit('alert:suppression:ended', alert);
      }
    }, rule.suppression.duration);

    this.suppressionTimers.set(alert.id, timer);
  }

  private updateAlertGroup(alert: Alert): void {
    let group = this.alertGroups.get(alert.groupingKey);
    
    if (!group) {
      group = {
        id: crypto.randomUUID(),
        name: alert.groupingKey,
        alerts: [],
        groupingKey: alert.groupingKey,
        status: 'active',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastFired: alert.timestamp,
        count: 0,
        severity: alert.severity,
        commonLabels: { ...alert.tags },
        summary: alert.name
      };
      
      this.alertGroups.set(alert.groupingKey, group);
    }

    // Update group
    if (!group.alerts.find(a => a.id === alert.id)) {
      group.alerts.push(alert);
      group.count++;
    }

    group.updatedAt = Date.now();
    group.lastFired = Math.max(group.lastFired, alert.timestamp);
    
    // Update severity to highest
    const severityOrder = { info: 0, warning: 1, critical: 2, emergency: 3 };
    if (severityOrder[alert.severity] > severityOrder[group.severity]) {
      group.severity = alert.severity;
    }

    // Update status
    const hasActiveAlerts = group.alerts.some(a => a.status === 'open' || a.status === 'acknowledged');
    group.status = hasActiveAlerts ? 'active' : 'resolved';

    this.emit('alert:group:updated', group);
  }

  private cleanupResolvedAlerts(): void {
    const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days
    
    for (const [id, alert] of this.alerts.entries()) {
      if (alert.status === 'resolved' && alert.resolvedAt && alert.resolvedAt < cutoff) {
        this.alerts.delete(id);
      }
    }
  }

  private cleanupNotificationHistory(): void {
    const cutoff = Date.now() - (30 * 24 * 60 * 60 * 1000); // 30 days
    
    for (const [id, notification] of this.notificationHistory.entries()) {
      if (notification.timestamp < cutoff) {
        this.notificationHistory.delete(id);
      }
    }
  }

  private isRuleScheduleActive(schedule: AlertSchedule): boolean {
    const now = new Date();
    const dayName = now.toLocaleDateString('en-US', { weekday: 'lowercase' }) as string;
    const timeString = now.toTimeString().slice(0, 5); // HH:MM

    return schedule.activePeriods.some(period => {
      if (!period.days.includes(dayName)) return false;
      
      return timeString >= period.startTime && timeString <= period.endTime;
    });
  }

  private hasFailedDependencies(dependencies: string[]): boolean {
    return dependencies.some(depId => {
      const depRule = this.alertRules.get(depId);
      return !depRule || !depRule.enabled;
    });
  }

  private checkAlertRecovery(rule: AlertRule): void {
    if (!rule.recovery?.enabled) return;

    // Find active alerts for this rule
    for (const alert of this.alerts.values()) {
      if (alert.metadata.ruleId === rule.id && alert.status === 'open') {
        if (rule.recovery.autoResolve) {
          this.resolveAlert(alert.id, 'Auto-resolved by recovery condition');
        }
      }
    }
  }

  private passesNotificationFilters(alert: Alert, filters: NotificationFilter[]): boolean {
    return filters.every(filter => {
      if (!filter.enabled) return true;

      switch (filter.type) {
        case 'severity':
          return this.evaluateFilterCondition(alert.severity, filter.condition);
        case 'source':
          return this.evaluateFilterCondition(alert.source, filter.condition);
        case 'tag':
          return Object.entries(alert.tags).some(([_key, value]) => // eslint-disable-line @typescript-eslint/no-unused-vars
            this.evaluateFilterCondition(value, filter.condition)
          );
        default:
          return true;
      }
    });
  }

  private evaluateFilterCondition(value: unknown, condition: NotificationFilter['condition']): boolean {
    switch (condition.operator) {
      case 'eq':
        return value === condition.value;
      case 'ne':
        return value !== condition.value;
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(value);
      case 'nin':
        return Array.isArray(condition.value) && !condition.value.includes(value);
      default:
        return true;
    }
  }

  private isRateLimited(channelId: string, rateLimiting: NonNullable<NotificationChannel['rateLimiting']>): boolean {
    const cutoff = Date.now() - rateLimiting.timeWindow;
    const recentNotifications = Array.from(this.notificationHistory.values())
      .filter(n => n.channelId === channelId && n.timestamp >= cutoff);
    
    return recentNotifications.length >= rateLimiting.maxNotifications;
  }

  private isMaintenanceWindow(schedule?: AlertSchedule): boolean {
    if (!schedule) return false;
    return this.isRuleScheduleActive(schedule);
  }

  private isRateLimitExceeded(alert: Alert, rateLimiting?: SuppressionRule['rateLimiting']): boolean {
    if (!rateLimiting) return false;

    const cutoff = Date.now() - rateLimiting.timeWindow;
    const recentAlerts = Array.from(this.alerts.values())
      .filter(a => a.fingerprint === alert.fingerprint && a.timestamp >= cutoff);
    
    return recentAlerts.length >= rateLimiting.maxAlerts;
  }

  private scheduleNotificationRetry(alert: Alert, channel: NotificationChannel, _error: Error): void { // eslint-disable-line @typescript-eslint/no-unused-vars
    if (!channel.retryPolicy) return;

    const history = Array.from(this.notificationHistory.values())
      .find(h => h.alertId === alert.id && h.channelId === channel.id);
    
    if (!history || history.attempts >= channel.retryPolicy.maxRetries) return;

    const delay = this.calculateRetryDelay(history.attempts, channel.retryPolicy);
    
    setTimeout(() => {
      history.attempts++;
      history.lastAttempt = Date.now();
      
      this.sendNotification(alert, channel).catch(retryError => {
        this.emit('notification:retry:failed', { alert, channel, error: retryError });
      });
    }, delay);
  }

  private calculateRetryDelay(attempt: number, retryPolicy: NonNullable<NotificationChannel['retryPolicy']>): number {
    if (retryPolicy.backoff === 'exponential') {
      return Math.min(
        retryPolicy.initialDelay * Math.pow(2, attempt - 1),
        retryPolicy.maxDelay
      );
    } else {
      return Math.min(
        retryPolicy.initialDelay * attempt,
        retryPolicy.maxDelay
      );
    }
  }

  private async sendResolutionNotification(alert: Alert): Promise<void> {
    const rule = this.alertRules.get(alert.metadata.ruleId);
    if (!rule) return;

    for (const channelId of rule.notificationChannels) {
      const channel = this.notificationChannels.get(channelId);
      if (!channel?.enabled) continue;

      try {
        const _message = this.formatNotificationMessage(alert, channel); // eslint-disable-line @typescript-eslint/no-unused-vars
        console.log(`Sending resolution notification for alert ${alert.id} via ${channel.type}`);
      } catch (error) {
        this.emit('resolution:notification:failed', { alert, channel, error });
      }
    }
  }

  // Public API
  public getAlert(id: string): Alert | undefined {
    return this.alerts.get(id);
  }

  public getAllAlerts(filters?: {
    status?: Alert['status'][];
    severity?: Alert['severity'][];
    source?: string[];
  }): Alert[] {
    let alerts = Array.from(this.alerts.values());

    if (filters) {
      if (filters.status) {
        alerts = alerts.filter(a => filters.status!.includes(a.status));
      }
      if (filters.severity) {
        alerts = alerts.filter(a => filters.severity!.includes(a.severity));
      }
      if (filters.source) {
        alerts = alerts.filter(a => filters.source!.includes(a.source));
      }
    }

    return alerts.sort((a, b) => b.timestamp - a.timestamp);
  }

  public getAlertRule(id: string): AlertRule | undefined {
    return this.alertRules.get(id);
  }

  public getAllAlertRules(): AlertRule[] {
    return Array.from(this.alertRules.values());
  }

  public getNotificationChannel(id: string): NotificationChannel | undefined {
    return this.notificationChannels.get(id);
  }

  public getAllNotificationChannels(): NotificationChannel[] {
    return Array.from(this.notificationChannels.values());
  }

  public getAlertSummary(timeRange?: { from: number; to: number }): AlertSummary {
    let alerts = Array.from(this.alerts.values());

    if (timeRange) {
      alerts = alerts.filter(a => 
        a.timestamp >= timeRange.from && a.timestamp <= timeRange.to
      );
    }

    const byStatus = alerts.reduce((acc, alert) => {
      acc[alert.status] = (acc[alert.status] || 0) + 1;
      return acc;
    }, {} as { [status: string]: number });

    const bySeverity = alerts.reduce((acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1;
      return acc;
    }, {} as { [severity: string]: number });

    const bySource = alerts.reduce((acc, alert) => {
      acc[alert.source] = (acc[alert.source] || 0) + 1;
      return acc;
    }, {} as { [source: string]: number });

    return {
      total: alerts.length,
      byStatus,
      bySeverity,
      bySource,
      topAlerts: alerts
        .filter(a => a.status === 'open')
        .sort((a, b) => {
          const severityOrder = { emergency: 4, critical: 3, warning: 2, info: 1 };
          return severityOrder[b.severity] - severityOrder[a.severity];
        })
        .slice(0, 10),
      trends: [] // Would calculate trends from historical data
    };
  }

  public getSystemStats(): {
    alerts: { total: number; active: number; resolved: number };
    rules: { total: number; enabled: number; disabled: number };
    channels: { total: number; enabled: number; disabled: number };
    notifications: { sent: number; failed: number; pending: number };
    status: 'healthy' | 'warning' | 'critical';
  } {
    const alerts = Array.from(this.alerts.values());
    const rules = Array.from(this.alertRules.values());
    const channels = Array.from(this.notificationChannels.values());
    const notifications = Array.from(this.notificationHistory.values());

    const criticalAlerts = alerts.filter(a => a.severity === 'critical' || a.severity === 'emergency').length;
    const failedNotifications = notifications.filter(n => n.status === 'failed').length;

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (criticalAlerts > 0 || failedNotifications > 10) {
      status = 'critical';
    } else if (alerts.filter(a => a.status === 'open').length > 5) {
      status = 'warning';
    }

    return {
      alerts: {
        total: alerts.length,
        active: alerts.filter(a => a.status === 'open' || a.status === 'acknowledged').length,
        resolved: alerts.filter(a => a.status === 'resolved').length
      },
      rules: {
        total: rules.length,
        enabled: rules.filter(r => r.enabled).length,
        disabled: rules.filter(r => !r.enabled).length
      },
      channels: {
        total: channels.length,
        enabled: channels.filter(c => c.enabled).length,
        disabled: channels.filter(c => !c.enabled).length
      },
      notifications: {
        sent: notifications.filter(n => n.status === 'sent').length,
        failed: notifications.filter(n => n.status === 'failed').length,
        pending: notifications.filter(n => n.status === 'pending').length
      },
      status
    };
  }
}

export default AlertingNotificationSystem;