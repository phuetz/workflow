/**
 * AlertRouter - Alert Routing and Escalation Management
 * Handles routing rules, escalation policies, and channel management
 */

import { EventEmitter } from 'events';
import {
  Alert,
  AlertSeverity,
  NotificationChannel,
  NotificationChannelConfig,
  EscalationPolicy,
  EscalationRule,
  RoutingRule,
  DeliveryStatusRecord,
  ChannelStatistics,
  NotificationChannelType
} from './types';

export class AlertRouter extends EventEmitter {
  private channels: Map<string, NotificationChannel> = new Map();
  private escalationPolicies: Map<string, EscalationPolicy> = new Map();
  private routingRules: RoutingRule[] = [];
  private deliveryStatus: DeliveryStatusRecord[] = [];
  private escalationTimers: Map<string, NodeJS.Timeout> = new Map();
  private recentDeliveries: Map<string, Date[]> = new Map();
  private maxDeliveryHistory = 5000;

  constructor() {
    super();
    this.setupDefaultChannels();
    this.setupDefaultEscalationPolicy();
  }

  /**
   * Reset router state
   */
  reset(): void {
    this.deliveryStatus = [];
    this.recentDeliveries.clear();
    this.routingRules = [];

    // Clear escalation timers
    for (const timerId of this.escalationTimers.values()) {
      clearTimeout(timerId);
    }
    this.escalationTimers.clear();

    // Re-setup default channels and policies
    this.channels.clear();
    this.escalationPolicies.clear();
    this.setupDefaultChannels();
    this.setupDefaultEscalationPolicy();
  }

  /**
   * Get channels map
   */
  getChannels(): Map<string, NotificationChannel> {
    return this.channels;
  }

  /**
   * Get escalation policies
   */
  getEscalationPolicies(): Map<string, EscalationPolicy> {
    return this.escalationPolicies;
  }

  /**
   * Get escalation timers
   */
  getEscalationTimers(): Map<string, NodeJS.Timeout> {
    return this.escalationTimers;
  }

  /**
   * Get delivery status records
   */
  getDeliveryStatus(): DeliveryStatusRecord[] {
    return this.deliveryStatus;
  }

  // ================================
  // CHANNEL MANAGEMENT
  // ================================

  /**
   * Add notification channel
   */
  addChannel(channel: NotificationChannel): void {
    this.channels.set(channel.name, channel);
    this.emit('channel:added', channel);
  }

  /**
   * Remove notification channel
   */
  removeChannel(name: string): void {
    this.channels.delete(name);
    this.emit('channel:removed', name);
  }

  /**
   * Enable channel
   */
  enableChannel(name: string): void {
    const channel = this.channels.get(name);
    if (channel) {
      channel.enabled = true;
      this.emit('channel:enabled', name);
    }
  }

  /**
   * Disable channel
   */
  disableChannel(name: string): void {
    const channel = this.channels.get(name);
    if (channel) {
      channel.enabled = false;
      this.emit('channel:disabled', name);
    }
  }

  /**
   * Get channel by name
   */
  getChannel(name: string): NotificationChannel | undefined {
    return this.channels.get(name);
  }

  // ================================
  // ROUTING
  // ================================

  /**
   * Route alert to appropriate channels
   */
  routeAlert(alert: Alert): string[] {
    const channels: Set<string> = new Set();

    // Apply routing rules
    for (const rule of this.routingRules.sort((a, b) => b.priority - a.priority)) {
      if (rule.condition(alert)) {
        rule.channels.forEach(c => channels.add(c));
        break;
      }
    }

    // Default routing if no rules matched
    if (channels.size === 0) {
      if (alert.severity === 'critical') {
        this.channels.forEach((_, name) => channels.add(name));
      } else if (alert.severity === 'high') {
        ['email', 'slack'].forEach(name => {
          if (this.channels.has(name)) channels.add(name);
        });
      } else {
        if (this.channels.has('email')) channels.add('email');
      }
    }

    return Array.from(channels);
  }

  /**
   * Add routing rule
   */
  addRoutingRule(rule: RoutingRule): void {
    this.routingRules.push(rule);
    this.routingRules.sort((a, b) => b.priority - a.priority);
    this.emit('routing:rule-added', rule);
  }

  // ================================
  // RATE LIMITING
  // ================================

  /**
   * Check rate limit for channel
   */
  checkRateLimit(channel: NotificationChannel, severity: AlertSeverity): boolean {
    if (!channel.rateLimit) {
      return true;
    }

    const key = channel.name;
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    if (!this.recentDeliveries.has(key)) {
      this.recentDeliveries.set(key, []);
    }

    const deliveries = this.recentDeliveries.get(key)!;
    const recentCount = deliveries.filter(d => d > oneHourAgo).length;
    const dailyCount = deliveries.filter(d => d > oneDayAgo).length;

    return recentCount < channel.rateLimit.maxPerHour && dailyCount < channel.rateLimit.maxPerDay;
  }

  /**
   * Record delivery for rate limiting
   */
  recordDelivery(channel: NotificationChannel, severity: AlertSeverity): void {
    const key = channel.name;
    if (!this.recentDeliveries.has(key)) {
      this.recentDeliveries.set(key, []);
    }

    this.recentDeliveries.get(key)!.push(new Date());

    // Cleanup old entries
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const deliveries = this.recentDeliveries.get(key)!;
    const index = deliveries.findIndex(d => d > cutoff);
    if (index > 0) {
      deliveries.splice(0, index);
    }
  }

  /**
   * Add delivery status record
   */
  addDeliveryRecord(record: DeliveryStatusRecord): void {
    this.deliveryStatus.push(record);

    // Maintain size limit
    if (this.deliveryStatus.length > this.maxDeliveryHistory) {
      this.deliveryStatus.shift();
    }
  }

  // ================================
  // ESCALATION
  // ================================

  /**
   * Add escalation policy
   */
  addEscalationPolicy(policy: EscalationPolicy): void {
    this.escalationPolicies.set(policy.id, policy);
    this.emit('escalation:policy-added', policy);
  }

  /**
   * Get active escalation policy
   */
  getActivePolicy(): EscalationPolicy | undefined {
    return Array.from(this.escalationPolicies.values()).find(p => p.enabled);
  }

  /**
   * Get escalation rule for level
   */
  getEscalationRule(level: number): EscalationRule | undefined {
    const policy = this.getActivePolicy();
    if (!policy) return undefined;
    return policy.rules.find(r => r.level === level);
  }

  /**
   * Set escalation timer for alert
   */
  setEscalationTimer(alertId: string, callback: () => void, delayMs: number): void {
    const timerId = setTimeout(callback, delayMs);
    this.escalationTimers.set(alertId, timerId);
  }

  /**
   * Clear escalation timer for alert
   */
  clearEscalationTimer(alertId: string): void {
    const timerId = this.escalationTimers.get(alertId);
    if (timerId) {
      clearTimeout(timerId);
      this.escalationTimers.delete(alertId);
    }
  }

  // ================================
  // STATISTICS
  // ================================

  /**
   * Get channel statistics
   */
  getChannelStats(): ChannelStatistics[] {
    const stats: Map<string, ChannelStatistics> = new Map();

    for (const [name, channel] of this.channels) {
      stats.set(name, {
        channel: channel.type,
        name,
        sentCount: 0,
        deliveredCount: 0,
        failedCount: 0,
        averageDeliveryTime: 0,
        successRate: 0
      });
    }

    let totalDeliveryTimes: Map<string, number[]> = new Map();

    for (const delivery of this.deliveryStatus) {
      const stat = stats.get(delivery.channel);
      if (!stat) continue;

      stat.sentCount++;

      if (delivery.status === 'delivered') {
        stat.deliveredCount++;
        const deliveryTime = delivery.timestamp.getTime();
        if (!totalDeliveryTimes.has(delivery.channel)) {
          totalDeliveryTimes.set(delivery.channel, []);
        }
        totalDeliveryTimes.get(delivery.channel)!.push(deliveryTime);
      } else if (delivery.status === 'failed') {
        stat.failedCount++;
      }
    }

    for (const [name, stat] of stats) {
      stat.successRate = stat.sentCount > 0 ? (stat.deliveredCount / stat.sentCount) * 100 : 0;

      const times = totalDeliveryTimes.get(name) || [];
      if (times.length > 0) {
        stat.averageDeliveryTime = times.reduce((a, b) => a + b, 0) / times.length;
      }
    }

    return Array.from(stats.values());
  }

  /**
   * Cleanup old delivery status
   */
  cleanup(): void {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    this.deliveryStatus = this.deliveryStatus.filter(d => d.timestamp.getTime() > cutoff);

    for (const [channel, deliveries] of this.recentDeliveries) {
      this.recentDeliveries.set(
        channel,
        deliveries.filter(d => d.getTime() > cutoff)
      );
    }
  }

  // ================================
  // DEFAULT SETUP
  // ================================

  private setupDefaultChannels(): void {
    const channels: Array<[string, NotificationChannel]> = [
      ['email', { type: 'email', name: 'email', enabled: false, config: {}, severityFilter: ['medium', 'high', 'critical'] }],
      ['slack', { type: 'slack', name: 'slack', enabled: false, config: {}, severityFilter: ['high', 'critical'] }],
      ['teams', { type: 'teams', name: 'teams', enabled: false, config: {}, severityFilter: ['high', 'critical'] }],
      ['pagerduty', { type: 'pagerduty', name: 'pagerduty', enabled: false, config: {}, severityFilter: ['critical'] }],
      ['sms', { type: 'sms', name: 'sms', enabled: false, config: {}, severityFilter: ['critical'] }],
      ['webhook', { type: 'webhook', name: 'webhook', enabled: false, config: {}, severityFilter: ['low', 'medium', 'high', 'critical'] }]
    ];
    channels.forEach(([name, ch]) => this.channels.set(name, ch));
  }

  private setupDefaultEscalationPolicy(): void {
    const policy: EscalationPolicy = {
      id: 'default-escalation',
      name: 'Default Escalation Policy',
      enabled: true,
      rules: [
        {
          level: 0,
          delay: 0,
          channels: ['email'],
          recipients: ['ops-team@example.com']
        },
        {
          level: 1,
          delay: 15,
          channels: ['slack', 'email'],
          recipients: ['ops-lead@example.com', 'security-team@example.com']
        },
        {
          level: 2,
          delay: 30,
          channels: ['pagerduty', 'sms'],
          recipients: ['on-call@example.com'],
          condition: (alert) => alert.severity === 'critical'
        }
      ]
    };

    this.escalationPolicies.set(policy.id, policy);
  }
}
