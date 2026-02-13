/**
 * AlertManager - Barrel Export and Facade
 * Re-exports all types and provides the main AlertManager class
 */

import { EventEmitter } from 'events';

// Re-export all types
export * from './types';

// Re-export modules
export { AlertProcessor } from './AlertProcessor';
export { AlertRouter } from './AlertRouter';
export { AlertNotifier } from './AlertNotifier';

// Import modules for facade
import { AlertProcessor } from './AlertProcessor';
import { AlertRouter } from './AlertRouter';
import { AlertNotifier } from './AlertNotifier';
import {
  Alert,
  AlertFilter,
  NotificationChannel,
  EscalationPolicy,
  RoutingRule,
  AlertStatistics,
  ChannelStatistics,
  TimeRange
} from './types';

/**
 * AlertManager - Main Facade Class
 * Provides a unified API for alert management capabilities
 */
export class AlertManager extends EventEmitter {
  private static instance: AlertManager;
  private processor: AlertProcessor;
  private router: AlertRouter;
  private notifier: AlertNotifier;
  private cleanupInterval?: NodeJS.Timeout;
  private aggregationInterval?: NodeJS.Timeout;
  private escalationInterval?: NodeJS.Timeout;

  private constructor() {
    super();
    this.processor = new AlertProcessor();
    this.router = new AlertRouter();
    this.notifier = new AlertNotifier(this.router);

    // Forward events from processor
    this.processor.on('alert:created', (alert) => this.emit('alert:created', alert));
    this.processor.on('alert:acknowledged', (alert) => this.emit('alert:acknowledged', alert));
    this.processor.on('alert:resolved', (alert) => this.emit('alert:resolved', alert));
    this.processor.on('alert:muted', (alert) => this.emit('alert:muted', alert));

    // Forward events from router
    this.router.on('channel:added', (channel) => this.emit('channel:added', channel));
    this.router.on('channel:removed', (name) => this.emit('channel:removed', name));
    this.router.on('channel:enabled', (name) => this.emit('channel:enabled', name));
    this.router.on('channel:disabled', (name) => this.emit('channel:disabled', name));
    this.router.on('escalation:policy-added', (policy) => this.emit('escalation:policy-added', policy));
    this.router.on('routing:rule-added', (rule) => this.emit('routing:rule-added', rule));

    this.startCleanupTask();
    this.startAggregationProcessor();
    this.startEscalationProcessor();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): AlertManager {
    if (!AlertManager.instance) {
      AlertManager.instance = new AlertManager();
    }
    return AlertManager.instance;
  }

  /**
   * Reset the AlertManager state (useful for testing)
   */
  reset(): void {
    this.processor.reset();
    this.router.reset();
  }

  // ================================
  // ALERT MANAGEMENT
  // ================================

  async createAlert(alertData: Partial<Alert>): Promise<Alert> {
    const alert = this.processor.createAlert(alertData);
    await this.notifier.sendAlert(alert);
    return alert;
  }

  getAlert(id: string): Alert | undefined {
    return this.processor.getAlert(id);
  }

  getAllAlerts(filter?: AlertFilter): Alert[] {
    return this.processor.getAllAlerts(filter);
  }

  async acknowledgeAlert(id: string, userId: string): Promise<void> {
    this.processor.acknowledgeAlert(id, userId);
  }

  async resolveAlert(id: string, userId: string): Promise<void> {
    this.processor.resolveAlert(id, userId);
    this.router.clearEscalationTimer(id);
  }

  async muteAlert(id: string, durationMs: number): Promise<void> {
    this.processor.muteAlert(id, durationMs);
  }

  // ================================
  // CHANNEL MANAGEMENT
  // ================================

  addChannel(channel: NotificationChannel): void {
    this.router.addChannel(channel);
    this.notifier.configureEmailTransporter(channel);
  }

  removeChannel(name: string): void {
    this.router.removeChannel(name);
  }

  enableChannel(name: string): void {
    this.router.enableChannel(name);
  }

  disableChannel(name: string): void {
    this.router.disableChannel(name);
  }

  async testChannel(name: string): Promise<boolean> {
    return this.notifier.testChannel(name);
  }

  // ================================
  // ESCALATION MANAGEMENT
  // ================================

  addEscalationPolicy(policy: EscalationPolicy): void {
    this.router.addEscalationPolicy(policy);
  }

  async escalateAlert(alertId: string): Promise<void> {
    const alert = this.processor.getAlert(alertId);
    if (!alert || alert.status === 'resolved') {
      return;
    }

    const policy = this.router.getActivePolicy();
    if (!policy) {
      return;
    }

    alert.escalationLevel++;

    const rule = this.router.getEscalationRule(alert.escalationLevel);
    if (!rule) {
      return;
    }

    if (rule.condition && !rule.condition(alert)) {
      return;
    }

    for (const channelName of rule.channels) {
      const channel = this.router.getChannel(channelName);
      if (channel && channel.enabled) {
        await this.notifier.sendToChannel(alert, channel);
      }
    }

    this.emit('alert:escalated', { alert, level: alert.escalationLevel });
  }

  async checkEscalations(): Promise<void> {
    const policy = this.router.getActivePolicy();
    if (!policy) {
      return;
    }

    const now = new Date();

    for (const alert of this.processor.getAlerts().values()) {
      if (alert.status === 'resolved') {
        continue;
      }

      const rule = this.router.getEscalationRule(alert.escalationLevel);
      if (!rule) {
        continue;
      }

      const timeElapsed = now.getTime() - alert.timestamp.getTime();
      const delayMs = rule.delay * 60 * 1000;

      if (timeElapsed > delayMs) {
        await this.escalateAlert(alert.id);
      }
    }
  }

  // ================================
  // ROUTING
  // ================================

  addRoutingRule(rule: RoutingRule): void {
    this.router.addRoutingRule(rule);
  }

  routeAlert(alert: Alert): string[] {
    return this.router.routeAlert(alert);
  }

  // ================================
  // STATISTICS
  // ================================

  getAlertStats(dateRange: TimeRange): AlertStatistics {
    return this.processor.getAlertStats(dateRange);
  }

  getChannelStats(): ChannelStatistics[] {
    return this.router.getChannelStats();
  }

  getAcknowledgmentRate(): number {
    return this.processor.getAcknowledgmentRate();
  }

  getMTTR(): number {
    return this.processor.getMTTR();
  }

  // ================================
  // BACKGROUND TASKS
  // ================================

  private startCleanupTask(): void {
    this.cleanupInterval = setInterval(() => {
      this.processor.cleanup();
      this.router.cleanup();
    }, 60 * 60 * 1000); // Run hourly
  }

  private startAggregationProcessor(): void {
    this.aggregationInterval = setInterval(() => {
      this.processor.aggregateAlerts();
    }, 10 * 60 * 1000); // 10 minutes
  }

  private startEscalationProcessor(): void {
    this.escalationInterval = setInterval(async () => {
      await this.checkEscalations();
    }, 60 * 1000); // Check every minute
  }
}

// Export singleton
export const alertManager = AlertManager.getInstance();
export default AlertManager;
