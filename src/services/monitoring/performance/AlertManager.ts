/**
 * Alert Manager
 *
 * Handles alert rules, alert checking, and alert lifecycle management.
 * @module monitoring/performance/AlertManager
 */

import { EventEmitter } from 'events';
import { logger } from '../../SimpleLogger';
import type {
  AlertRule,
  InternalPerformanceMetrics,
  PerformanceAlert
} from './types';

/**
 * AlertManager handles alert rules and alert state management
 */
export class AlertManager {
  private alertRules: AlertRule[] = [];
  private activeAlerts: Map<string, PerformanceAlert> = new Map();
  private readonly eventEmitter: EventEmitter;

  constructor(eventEmitter: EventEmitter) {
    this.eventEmitter = eventEmitter;
    this.setupDefaultAlertRules();
  }

  /**
   * Setup default alert rules
   */
  private setupDefaultAlertRules(): void {
    this.alertRules = [
      {
        id: 'high-cpu',
        name: 'High CPU Usage',
        condition: (metrics) => metrics.system.cpu.usage > 80,
        threshold: 80,
        severity: 'warning',
        cooldown: 300000 // 5 minutes
      },
      {
        id: 'high-memory',
        name: 'High Memory Usage',
        condition: (metrics) => metrics.system.memory.usagePercent > 85,
        threshold: 85,
        severity: 'warning',
        cooldown: 300000
      },
      {
        id: 'high-error-rate',
        name: 'High Error Rate',
        condition: (metrics) => metrics.api.errorRate > 5,
        threshold: 5,
        severity: 'critical',
        cooldown: 60000 // 1 minute
      },
      {
        id: 'slow-response',
        name: 'Slow Response Time',
        condition: (metrics) => metrics.api.avgResponseTime > 1000,
        threshold: 1000,
        severity: 'warning',
        cooldown: 300000
      },
      {
        id: 'database-slow',
        name: 'Database Performance Degraded',
        condition: (metrics) => metrics.database.avgQueryTime > 50,
        threshold: 50,
        severity: 'warning',
        cooldown: 300000
      }
    ];
  }

  /**
   * Check all alert rules against current metrics
   */
  public checkAlertRules(metrics: InternalPerformanceMetrics): void {
    const now = Date.now();

    for (const rule of this.alertRules) {
      const isTriggered = rule.condition(metrics);
      const existingAlert = this.activeAlerts.get(rule.id);

      if (isTriggered) {
        if (!existingAlert || now - existingAlert.timestamp.getTime() > rule.cooldown) {
          const alert: PerformanceAlert = {
            id: rule.id,
            type: 'performance_degradation',
            severity: rule.severity,
            title: rule.name,
            description: `Alert condition met: ${rule.name}`,
            workflowId: '',
            metric: rule.id,
            threshold: rule.threshold,
            currentValue: this.getAlertValue(rule, metrics),
            timestamp: new Date(),
            acknowledged: false,
            resolved: false,
            actions: []
          };

          this.activeAlerts.set(rule.id, alert);
          metrics.alerts.push(alert);
          this.eventEmitter.emit('alert', alert);

          logger.warn(`Performance alert triggered: ${rule.name}`, {
            value: alert.currentValue,
            threshold: alert.threshold
          });
        }
      } else if (existingAlert) {
        this.activeAlerts.delete(rule.id);
        this.eventEmitter.emit('alert-cleared', existingAlert);
      }
    }
  }

  /**
   * Get alert value based on rule
   */
  private getAlertValue(rule: AlertRule, metrics: InternalPerformanceMetrics): number {
    switch (rule.id) {
      case 'high-cpu':
        return metrics.system.cpu.usage;
      case 'high-memory':
        return metrics.system.memory.usagePercent;
      case 'high-error-rate':
        return metrics.api.errorRate;
      case 'slow-response':
        return metrics.api.avgResponseTime;
      case 'database-slow':
        return metrics.database.avgQueryTime;
      default:
        return 0;
    }
  }

  /**
   * Get active alerts
   */
  public getActiveAlerts(): PerformanceAlert[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Add custom alert rule
   */
  public addAlertRule(rule: AlertRule): void {
    this.alertRules.push(rule);
  }

  /**
   * Remove alert rule
   */
  public removeAlertRule(ruleId: string): void {
    this.alertRules = this.alertRules.filter(r => r.id !== ruleId);
    this.activeAlerts.delete(ruleId);
  }
}
