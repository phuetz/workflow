/**
 * AlertProcessor - Alert Creation, Management, and Statistics
 * Handles alert lifecycle, deduplication, aggregation, and statistics
 */

import { EventEmitter } from 'events';
import {
  Alert,
  AlertFilter,
  AlertStatus,
  AlertSeverity,
  AlertCategory,
  AlertStatistics,
  AggregatedAlert,
  TimeRange,
  generateAlertId
} from './types';
import { logger } from '../../services/SimpleLogger';

export class AlertProcessor extends EventEmitter {
  private alerts: Map<string, Alert> = new Map();
  private alertHistory: Alert[] = [];
  private aggregatedAlerts: Map<string, AggregatedAlert> = new Map();
  private deduplicationWindow = 5 * 60 * 1000; // 5 minutes
  private alertAggregationWindow = 10 * 60 * 1000; // 10 minutes
  private maxStoredAlerts = 1000;

  constructor() {
    super();
  }

  /**
   * Reset processor state
   */
  reset(): void {
    this.alerts.clear();
    this.alertHistory = [];
    this.aggregatedAlerts.clear();
  }

  /**
   * Get alerts map
   */
  getAlerts(): Map<string, Alert> {
    return this.alerts;
  }

  /**
   * Create a new alert
   */
  createAlert(alertData: Partial<Alert>): Alert {
    const alert: Alert = {
      id: generateAlertId(),
      timestamp: new Date(),
      severity: alertData.severity || 'medium',
      title: alertData.title || 'Unnamed Alert',
      description: alertData.description || '',
      source: alertData.source || 'unknown',
      category: alertData.category || 'system',
      metrics: alertData.metrics,
      context: alertData.context,
      recommended_actions: alertData.recommended_actions || [],
      status: 'open',
      escalationLevel: 0,
      notificationsSent: 0
    };

    // Check for duplicates
    if (this.isDuplicateAlert(alert)) {
      logger.debug(`Alert deduplicated: ${alert.title}`, { component: 'AlertProcessor' });
      return alert;
    }

    // Store alert
    this.alerts.set(alert.id, alert);
    this.alertHistory.push(alert);

    // Maintain size limits
    if (this.alertHistory.length > this.maxStoredAlerts) {
      this.alertHistory.shift();
    }

    this.emit('alert:created', alert);

    return alert;
  }

  /**
   * Get alert by ID
   */
  getAlert(id: string): Alert | undefined {
    return this.alerts.get(id);
  }

  /**
   * Get all alerts with optional filtering
   */
  getAllAlerts(filter?: AlertFilter): Alert[] {
    let results = Array.from(this.alerts.values());

    if (!filter) {
      return results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }

    if (filter.severity && filter.severity.length > 0) {
      results = results.filter(a => filter.severity!.includes(a.severity));
    }

    if (filter.category && filter.category.length > 0) {
      results = results.filter(a => filter.category!.includes(a.category));
    }

    if (filter.status && filter.status.length > 0) {
      results = results.filter(a => filter.status!.includes(a.status));
    }

    if (filter.source) {
      results = results.filter(a => a.source === filter.source);
    }

    if (filter.startDate) {
      results = results.filter(a => a.timestamp >= filter.startDate!);
    }

    if (filter.endDate) {
      results = results.filter(a => a.timestamp <= filter.endDate!);
    }

    results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const offset = filter.offset || 0;
    const limit = filter.limit || 100;

    return results.slice(offset, offset + limit);
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(id: string, userId: string): void {
    const alert = this.getAlert(id);
    if (!alert) {
      throw new Error(`Alert not found: ${id}`);
    }

    alert.status = 'acknowledged';
    alert.acknowledgedBy = userId;
    alert.acknowledgedAt = new Date();

    this.emit('alert:acknowledged', alert);
  }

  /**
   * Resolve alert
   */
  resolveAlert(id: string, userId: string): void {
    const alert = this.getAlert(id);
    if (!alert) {
      throw new Error(`Alert not found: ${id}`);
    }

    alert.status = 'resolved';
    alert.resolvedBy = userId;
    alert.resolvedAt = new Date();

    this.emit('alert:resolved', alert);
  }

  /**
   * Mute alert for specified duration
   */
  muteAlert(id: string, durationMs: number): void {
    const alert = this.getAlert(id);
    if (!alert) {
      throw new Error(`Alert not found: ${id}`);
    }

    alert.status = 'muted';
    alert.muteUntil = new Date(Date.now() + durationMs);

    this.emit('alert:muted', alert);
  }

  /**
   * Check if alert is duplicate
   */
  private isDuplicateAlert(alert: Alert): boolean {
    const cutoff = Date.now() - this.deduplicationWindow;

    for (const existingAlert of this.alerts.values()) {
      if (existingAlert.timestamp.getTime() < cutoff) {
        continue;
      }

      if (
        existingAlert.title === alert.title &&
        existingAlert.source === alert.source &&
        existingAlert.severity === alert.severity
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Aggregate similar alerts
   */
  aggregateAlerts(): void {
    const cutoff = Date.now() - this.alertAggregationWindow;
    const groups: Map<string, Alert[]> = new Map();

    for (const alert of this.alerts.values()) {
      if (alert.timestamp.getTime() < cutoff) {
        continue;
      }

      const key = `${alert.category}:${alert.source}:${alert.severity}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(alert);
    }

    for (const [key, alerts] of groups.entries()) {
      if (alerts.length > 2) {
        const aggregated: AggregatedAlert = {
          id: generateAlertId(),
          title: `${alerts[0].title} (${alerts.length} occurrences)`,
          count: alerts.length,
          firstOccurrence: alerts[0].timestamp,
          lastOccurrence: alerts[alerts.length - 1].timestamp,
          severity: alerts[0].severity,
          relatedAlertIds: alerts.map(a => a.id)
        };

        this.aggregatedAlerts.set(key, aggregated);
      }
    }
  }

  /**
   * Get alert statistics
   */
  getAlertStats(dateRange: TimeRange): AlertStatistics {
    const alerts = this.alertHistory.filter(
      a => a.timestamp >= dateRange.start && a.timestamp <= dateRange.end
    );

    const stats: AlertStatistics = {
      totalAlerts: alerts.length,
      byStatus: { open: 0, acknowledged: 0, resolved: 0, muted: 0 },
      bySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
      byCategory: { security: 0, performance: 0, compliance: 0, system: 0, data: 0, integration: 0 },
      acknowledgedCount: 0,
      acknowledgedRate: 0,
      resolvedCount: 0,
      resolvedRate: 0,
      avgTimeToAcknowledge: 0,
      avgTimeToResolve: 0
    };

    let totalAckTime = 0;
    let totalResolveTime = 0;
    let ackCount = 0;
    let resolveCount = 0;

    for (const alert of alerts) {
      stats.byStatus[alert.status]++;
      stats.bySeverity[alert.severity]++;
      stats.byCategory[alert.category]++;

      if (alert.status === 'acknowledged' || alert.status === 'resolved') {
        stats.acknowledgedCount++;
        if (alert.acknowledgedAt) {
          totalAckTime += alert.acknowledgedAt.getTime() - alert.timestamp.getTime();
          ackCount++;
        }
      }

      if (alert.status === 'resolved') {
        stats.resolvedCount++;
        if (alert.resolvedAt) {
          totalResolveTime += alert.resolvedAt.getTime() - alert.timestamp.getTime();
          resolveCount++;
        }
      }
    }

    stats.acknowledgedRate = alerts.length > 0 ? (stats.acknowledgedCount / alerts.length) * 100 : 0;
    stats.resolvedRate = alerts.length > 0 ? (stats.resolvedCount / alerts.length) * 100 : 0;
    stats.avgTimeToAcknowledge = ackCount > 0 ? totalAckTime / ackCount : 0;
    stats.avgTimeToResolve = resolveCount > 0 ? totalResolveTime / resolveCount : 0;

    return stats;
  }

  /**
   * Get acknowledgment rate
   */
  getAcknowledgmentRate(): number {
    if (this.alerts.size === 0) return 0;

    let ackCount = 0;
    for (const alert of this.alerts.values()) {
      if (alert.status === 'acknowledged' || alert.status === 'resolved') {
        ackCount++;
      }
    }

    return (ackCount / this.alerts.size) * 100;
  }

  /**
   * Get Mean Time To Resolve
   */
  getMTTR(): number {
    const resolvedAlerts = Array.from(this.alerts.values()).filter(a => a.status === 'resolved');
    if (resolvedAlerts.length === 0) return 0;

    let totalTime = 0;
    for (const alert of resolvedAlerts) {
      if (alert.resolvedAt) {
        totalTime += alert.resolvedAt.getTime() - alert.timestamp.getTime();
      }
    }

    return totalTime / resolvedAlerts.length;
  }

  /**
   * Cleanup old alerts
   */
  cleanup(): void {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24 hours

    const idsToDelete: string[] = [];
    for (const [id, alert] of this.alerts) {
      if (alert.timestamp.getTime() < cutoff && alert.status === 'resolved') {
        idsToDelete.push(id);
      }
    }

    idsToDelete.forEach(id => this.alerts.delete(id));
  }
}
