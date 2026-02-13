/**
 * Agent Monitoring System
 *
 * Real-time health monitoring for AI agents with:
 * - Uptime, latency, success rate tracking
 * - Multi-channel alerting
 * - Auto-remediation
 * - Performance metrics
 *
 * Update frequency: Real-time (1s)
 * Retention: 30 days
 * Alert latency: <10s
 */

import { EventEmitter } from 'events';
import { logger } from '../services/SimpleLogger';
import {
  Agent,
  AgentHealthMetrics,
  Alert,
  User,
} from './types/agentops';

/**
 * Metrics storage entry
 */
interface MetricsEntry {
  timestamp: number;
  metrics: AgentHealthMetrics;
}

/**
 * Alert state tracking
 */
interface AlertState {
  alert: Alert;
  triggered: boolean;
  lastTriggered?: number;
  conditionMetSince?: number;
}

/**
 * Agent monitoring manager
 */
export class AgentMonitoring extends EventEmitter {
  private metricsStore: Map<string, MetricsEntry[]> = new Map();
  private currentMetrics: Map<string, AgentHealthMetrics> = new Map();
  private alerts: Map<string, AlertState> = new Map();
  private agentAlerts: Map<string, Set<string>> = new Map(); // agentId -> alertIds

  private readonly RETENTION_DAYS = 30;
  private readonly UPDATE_INTERVAL = 1000; // 1 second
  private monitoringInterval?: NodeJS.Timeout;

  constructor() {
    super();
    this.startMonitoring();
  }

  /**
   * Start monitoring loop
   */
  private startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.checkAlerts();
      this.cleanupOldMetrics();
    }, this.UPDATE_INTERVAL);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
  }

  /**
   * Record metrics for an agent
   */
  recordMetrics(agentId: string, metrics: Partial<AgentHealthMetrics>): void {
    const timestamp = Date.now();

    // Get or create current metrics
    let current = this.currentMetrics.get(agentId);
    if (!current) {
      current = this.createDefaultMetrics(agentId);
      this.currentMetrics.set(agentId, current);
    }

    // Update metrics
    Object.assign(current, metrics, { timestamp });

    // Store in history
    if (!this.metricsStore.has(agentId)) {
      this.metricsStore.set(agentId, []);
    }
    this.metricsStore.get(agentId)!.push({
      timestamp,
      metrics: { ...current },
    });

    this.emit('metrics-recorded', { agentId, metrics: current });
  }

  /**
   * Record a single execution result
   */
  recordExecution(
    agentId: string,
    success: boolean,
    latency: number,
    error?: string,
    cost?: number
  ): void {
    const current = this.getCurrentMetrics(agentId);

    // Update counters
    current.totalRequests++;
    if (success) {
      current.successfulRequests++;
    } else {
      current.failedRequests++;
      if (error) {
        const errorType = this.categorizeError(error);
        current.errorBreakdown[errorType] = (current.errorBreakdown[errorType] || 0) + 1;
      }
    }

    // Update rates
    current.successRate = current.successfulRequests / current.totalRequests;
    current.errorRate = current.failedRequests / current.totalRequests;

    // Update latency statistics
    this.updateLatencyStats(current, latency);

    // Update cost
    if (cost) {
      current.totalCost += cost;
      current.costPerRequest = current.totalCost / current.totalRequests;
    }

    this.recordMetrics(agentId, current);
  }

  /**
   * Get current metrics for an agent
   */
  getCurrentMetrics(agentId: string): AgentHealthMetrics {
    let metrics = this.currentMetrics.get(agentId);
    if (!metrics) {
      metrics = this.createDefaultMetrics(agentId);
      this.currentMetrics.set(agentId, metrics);
    }
    return metrics;
  }

  /**
   * Get historical metrics for an agent
   */
  getHistoricalMetrics(
    agentId: string,
    startTime: number,
    endTime: number = Date.now()
  ): MetricsEntry[] {
    const history = this.metricsStore.get(agentId) || [];
    return history.filter(
      entry => entry.timestamp >= startTime && entry.timestamp <= endTime
    );
  }

  /**
   * Get metrics summary for time window
   */
  getMetricsSummary(
    agentId: string,
    windowMs: number = 3600000 // 1 hour default
  ): {
    uptime: number;
    avgLatency: number;
    p95Latency: number;
    successRate: number;
    errorRate: number;
    totalRequests: number;
    totalCost: number;
  } {
    const endTime = Date.now();
    const startTime = endTime - windowMs;
    const history = this.getHistoricalMetrics(agentId, startTime, endTime);

    if (history.length === 0) {
      return {
        uptime: 0,
        avgLatency: 0,
        p95Latency: 0,
        successRate: 0,
        errorRate: 0,
        totalRequests: 0,
        totalCost: 0,
      };
    }

    const latencies = history.map(h => h.metrics.latency.mean);
    const successRates = history.map(h => h.metrics.successRate);
    const errorRates = history.map(h => h.metrics.errorRate);

    return {
      uptime: history.reduce((sum, h) => sum + h.metrics.uptime, 0) / history.length,
      avgLatency: latencies.reduce((a, b) => a + b, 0) / latencies.length,
      p95Latency: history[Math.floor(history.length * 0.95)]?.metrics.latency.p95 || 0,
      successRate: successRates.reduce((a, b) => a + b, 0) / successRates.length,
      errorRate: errorRates.reduce((a, b) => a + b, 0) / errorRates.length,
      totalRequests: history.reduce((sum, h) => sum + h.metrics.totalRequests, 0),
      totalCost: history.reduce((sum, h) => sum + h.metrics.totalCost, 0),
    };
  }

  /**
   * Create an alert
   */
  createAlert(alert: Omit<Alert, 'id' | 'created'>): Alert {
    const fullAlert: Alert = {
      ...alert,
      id: this.generateAlertId(),
      created: Date.now(),
    };

    this.alerts.set(fullAlert.id, {
      alert: fullAlert,
      triggered: false,
    });

    // Track agent alerts
    if (!this.agentAlerts.has(alert.agentId)) {
      this.agentAlerts.set(alert.agentId, new Set());
    }
    this.agentAlerts.get(alert.agentId)!.add(fullAlert.id);

    this.emit('alert-created', { alert: fullAlert });

    return fullAlert;
  }

  /**
   * Update an alert
   */
  updateAlert(alertId: string, updates: Partial<Alert>): void {
    const state = this.alerts.get(alertId);
    if (!state) {
      throw new Error(`Alert ${alertId} not found`);
    }

    Object.assign(state.alert, updates);
    this.emit('alert-updated', { alert: state.alert });
  }

  /**
   * Delete an alert
   */
  deleteAlert(alertId: string): void {
    const state = this.alerts.get(alertId);
    if (!state) {
      throw new Error(`Alert ${alertId} not found`);
    }

    this.alerts.delete(alertId);
    this.agentAlerts.get(state.alert.agentId)?.delete(alertId);

    this.emit('alert-deleted', { alertId });
  }

  /**
   * Get all alerts for an agent
   */
  getAlerts(agentId: string): Alert[] {
    const alertIds = this.agentAlerts.get(agentId) || new Set();
    return Array.from(alertIds)
      .map(id => this.alerts.get(id)?.alert)
      .filter((a): a is Alert => a !== undefined);
  }

  /**
   * Get triggered alerts
   */
  getTriggeredAlerts(agentId?: string): Alert[] {
    const alerts = agentId
      ? this.getAlerts(agentId)
      : Array.from(this.alerts.values()).map(s => s.alert);

    return alerts.filter(alert => {
      const state = this.alerts.get(alert.id);
      return state?.triggered;
    });
  }

  /**
   * Check all alerts and trigger if conditions met
   */
  private checkAlerts(): void {
    for (const [alertId, state] of this.alerts) {
      if (state.alert.status !== 'active') continue;

      const metrics = this.currentMetrics.get(state.alert.agentId);
      if (!metrics) continue;

      const conditionsMet = this.evaluateConditions(state.alert, metrics);

      if (conditionsMet) {
        if (!state.conditionMetSince) {
          state.conditionMetSince = Date.now();
        }

        // Check if condition has been met for required duration
        const duration = Date.now() - state.conditionMetSince;
        const minDuration = Math.min(
          ...state.alert.conditions.map(c => c.duration)
        );

        if (duration >= minDuration && !state.triggered) {
          this.triggerAlert(state);
        }
      } else {
        // Condition no longer met
        state.conditionMetSince = undefined;
        if (state.triggered) {
          this.resolveAlert(state);
        }
      }
    }
  }

  /**
   * Evaluate alert conditions
   */
  private evaluateConditions(alert: Alert, metrics: AgentHealthMetrics): boolean {
    for (const condition of alert.conditions) {
      const value = this.getMetricValue(metrics, condition.metric);
      if (value === null) continue;

      const met = this.evaluateOperator(value, condition.operator, condition.threshold);
      if (!met) return false;
    }
    return true;
  }

  /**
   * Get metric value by path
   */
  private getMetricValue(metrics: AgentHealthMetrics, path: string): number | null {
    const parts = path.split('.');
    let value: any = metrics;

    for (const part of parts) {
      if (value === null || value === undefined) return null;
      value = value[part];
    }

    return typeof value === 'number' ? value : null;
  }

  /**
   * Evaluate comparison operator
   */
  private evaluateOperator(
    value: number,
    operator: '>' | '<' | '>=' | '<=' | '==' | '!=',
    threshold: number
  ): boolean {
    switch (operator) {
      case '>': return value > threshold;
      case '<': return value < threshold;
      case '>=': return value >= threshold;
      case '<=': return value <= threshold;
      case '==': return value === threshold;
      case '!=': return value !== threshold;
      default: return false;
    }
  }

  /**
   * Trigger an alert
   */
  private async triggerAlert(state: AlertState): Promise<void> {
    state.triggered = true;
    state.lastTriggered = Date.now();

    this.emit('alert-triggered', { alert: state.alert });

    // Send notifications
    await this.sendNotifications(state.alert);

    // Execute remediation actions
    if (state.alert.remediation?.enabled) {
      await this.executeRemediation(state.alert);
    }
  }

  /**
   * Resolve an alert
   */
  private resolveAlert(state: AlertState): void {
    state.triggered = false;
    this.emit('alert-resolved', { alert: state.alert });
  }

  /**
   * Send alert notifications
   */
  private async sendNotifications(alert: Alert): Promise<void> {
    for (const channel of alert.channels) {
      try {
        switch (channel.type) {
          case 'email':
            await this.sendEmailNotification(alert, channel.config);
            break;
          case 'slack':
            await this.sendSlackNotification(alert, channel.config);
            break;
          case 'teams':
            await this.sendTeamsNotification(alert, channel.config);
            break;
          case 'pagerduty':
            await this.sendPagerDutyNotification(alert, channel.config);
            break;
          case 'webhook':
            await this.sendWebhookNotification(alert, channel.config);
            break;
        }
      } catch (error) {
        logger.error(`Failed to send ${channel.type} notification:`, error);
      }
    }
  }

  /**
   * Execute remediation actions
   */
  private async executeRemediation(alert: Alert): Promise<void> {
    if (!alert.remediation?.enabled) return;

    for (const action of alert.remediation.actions) {
      try {
        switch (action) {
          case 'restart':
            this.emit('remediation-restart', { agentId: alert.agentId });
            break;
          case 'rollback':
            this.emit('remediation-rollback', { agentId: alert.agentId });
            break;
          case 'scale-up':
            this.emit('remediation-scale-up', { agentId: alert.agentId });
            break;
          case 'scale-down':
            this.emit('remediation-scale-down', { agentId: alert.agentId });
            break;
        }
      } catch (error) {
        logger.error(`Failed to execute remediation action ${action}:`, error);
      }
    }
  }

  // Notification methods (simplified implementations)

  private async sendEmailNotification(alert: Alert, config: any): Promise<void> {
    logger.debug(`Sending email notification for alert ${alert.name}`);
  }

  private async sendSlackNotification(alert: Alert, config: any): Promise<void> {
    logger.debug(`Sending Slack notification for alert ${alert.name}`);
  }

  private async sendTeamsNotification(alert: Alert, config: any): Promise<void> {
    logger.debug(`Sending Teams notification for alert ${alert.name}`);
  }

  private async sendPagerDutyNotification(alert: Alert, config: any): Promise<void> {
    logger.debug(`Sending PagerDuty notification for alert ${alert.name}`);
  }

  private async sendWebhookNotification(alert: Alert, config: any): Promise<void> {
    logger.debug(`Sending webhook notification for alert ${alert.name}`);
  }

  // Helper methods

  private createDefaultMetrics(agentId: string): AgentHealthMetrics {
    return {
      agentId,
      timestamp: Date.now(),
      uptime: 1,
      uptimeSeconds: 0,
      downtimeSeconds: 0,
      latency: {
        p50: 0,
        p95: 0,
        p99: 0,
        max: 0,
        min: 0,
        mean: 0,
      },
      successRate: 1,
      errorRate: 0,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      cpu: 0,
      memory: 0,
      memoryPercent: 0,
      requestsPerSecond: 0,
      bytesPerSecond: 0,
      totalCost: 0,
      costPerRequest: 0,
      errorBreakdown: {},
    };
  }

  private updateLatencyStats(metrics: AgentHealthMetrics, latency: number): void {
    // Simple running average (in practice, use proper percentile tracking)
    const count = metrics.totalRequests;
    metrics.latency.mean = (metrics.latency.mean * (count - 1) + latency) / count;
    metrics.latency.min = Math.min(metrics.latency.min || latency, latency);
    metrics.latency.max = Math.max(metrics.latency.max, latency);
    metrics.latency.p50 = metrics.latency.mean; // Simplified
    metrics.latency.p95 = metrics.latency.mean * 1.5; // Simplified
    metrics.latency.p99 = metrics.latency.mean * 2; // Simplified
  }

  private categorizeError(error: string): string {
    if (error.includes('timeout')) return 'timeout';
    if (error.includes('network')) return 'network';
    if (error.includes('auth')) return 'authentication';
    if (error.includes('permission')) return 'authorization';
    if (error.includes('rate limit')) return 'rate-limit';
    return 'other';
  }

  private cleanupOldMetrics(): void {
    const cutoffTime = Date.now() - this.RETENTION_DAYS * 24 * 60 * 60 * 1000;

    for (const [agentId, entries] of this.metricsStore) {
      const filtered = entries.filter(e => e.timestamp >= cutoffTime);
      if (filtered.length === 0) {
        this.metricsStore.delete(agentId);
      } else {
        this.metricsStore.set(agentId, filtered);
      }
    }
  }

  private generateAlertId(): string {
    return `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Singleton instance
 */
export const monitoring = new AgentMonitoring();
