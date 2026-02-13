/**
 * Agent SLA Monitor
 *
 * Monitors Service Level Agreements for AI agents including uptime,
 * latency, success rate, and cost. Provides real-time alerting and
 * automatic remediation capabilities.
 */

import { EventEmitter } from 'events';
import { logger } from '../services/SimpleLogger';
import {
  SLADefinition,
  SLAViolation,
  SLAMonitoringResult,
  SLAMetric,
  SLAScope,
  AlertSeverity,
} from './types/observability';

/**
 * SLA metric value
 */
interface MetricValue {
  timestamp: number;
  value: number;
  metadata?: Record<string, any>;
}

/**
 * SLA monitoring configuration
 */
interface MonitorConfig {
  checkInterval: number; // ms
  alertLatency: number; // ms - max time to send alert
  retentionDays: number;
}

/**
 * Agent SLA monitor implementation
 */
export class AgentSLAMonitor extends EventEmitter {
  private config: MonitorConfig;
  private slas: Map<string, SLADefinition>;
  private violations: Map<string, SLAViolation>;
  private metrics: Map<string, MetricValue[]>; // Key: `${slaId}_${scope}`
  private activeViolations: Map<string, Set<string>>; // slaId -> violation IDs
  private monitoringIntervals: Map<string, NodeJS.Timeout>;

  constructor(config: Partial<MonitorConfig> = {}) {
    super();
    this.config = {
      checkInterval: 60000, // 1 minute default
      alertLatency: 10000, // 10 seconds
      retentionDays: 90,
      ...config,
    };

    this.slas = new Map();
    this.violations = new Map();
    this.metrics = new Map();
    this.activeViolations = new Map();
    this.monitoringIntervals = new Map();

    this.startCleanupTask();
  }

  /**
   * Create an SLA definition
   */
  createSLA(sla: Omit<SLADefinition, 'id'>): string {
    const id = this.generateSLAId();
    const definition: SLADefinition = { id, ...sla };

    this.slas.set(id, definition);
    this.activeViolations.set(id, new Set());

    if (definition.enabled) {
      this.startMonitoring(id);
    }

    this.emit('sla:created', definition);

    return id;
  }

  /**
   * Update an SLA definition
   */
  updateSLA(id: string, updates: Partial<SLADefinition>): void {
    const sla = this.slas.get(id);
    if (!sla) {
      throw new Error(`SLA not found: ${id}`);
    }

    const wasEnabled = sla.enabled;
    Object.assign(sla, updates);

    // Restart monitoring if interval changed or enabled state changed
    if (wasEnabled !== sla.enabled || updates.monitoringInterval) {
      this.stopMonitoring(id);
      if (sla.enabled) {
        this.startMonitoring(id);
      }
    }

    this.emit('sla:updated', sla);
  }

  /**
   * Delete an SLA definition
   */
  deleteSLA(id: string): void {
    this.stopMonitoring(id);
    this.slas.delete(id);
    this.activeViolations.delete(id);

    this.emit('sla:deleted', id);
  }

  /**
   * Get SLA definition
   */
  getSLA(id: string): SLADefinition | undefined {
    return this.slas.get(id);
  }

  /**
   * Get all SLA definitions
   */
  getAllSLAs(): SLADefinition[] {
    return Array.from(this.slas.values());
  }

  /**
   * Record a metric value
   */
  recordMetric(
    slaId: string,
    value: number,
    scope: {
      agentId?: string;
      workflowId?: string;
      userId?: string;
      teamId?: string;
      organizationId?: string;
    } = {},
    metadata?: Record<string, any>
  ): void {
    const sla = this.slas.get(slaId);
    if (!sla) {
      return;
    }

    const key = this.getMetricKey(slaId, scope);
    const metricValue: MetricValue = {
      timestamp: Date.now(),
      value,
      metadata,
    };

    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }

    this.metrics.get(key)!.push(metricValue);

    // Check SLA immediately
    this.checkSLA(slaId, scope);
  }

  /**
   * Get SLA violations
   */
  getViolations(
    filter: {
      slaIds?: string[];
      agentIds?: string[];
      workflowIds?: string[];
      severity?: AlertSeverity[];
      startTime?: number;
      endTime?: number;
      resolved?: boolean;
    } = {}
  ): SLAViolation[] {
    let violations = Array.from(this.violations.values());

    if (filter.slaIds) {
      violations = violations.filter(v => filter.slaIds!.includes(v.slaId));
    }

    if (filter.agentIds) {
      violations = violations.filter(v =>
        v.scope.agentId && filter.agentIds!.includes(v.scope.agentId)
      );
    }

    if (filter.workflowIds) {
      violations = violations.filter(v =>
        v.scope.workflowId && filter.workflowIds!.includes(v.scope.workflowId)
      );
    }

    if (filter.severity) {
      violations = violations.filter(v => filter.severity!.includes(v.severity));
    }

    if (filter.startTime) {
      violations = violations.filter(v => v.timestamp >= filter.startTime!);
    }

    if (filter.endTime) {
      violations = violations.filter(v => v.timestamp <= filter.endTime!);
    }

    if (filter.resolved !== undefined) {
      violations = violations.filter(v => v.remediated === filter.resolved);
    }

    return violations.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get active violations for an SLA
   */
  getActiveViolations(slaId: string): SLAViolation[] {
    const violationIds = this.activeViolations.get(slaId);
    if (!violationIds) {
      return [];
    }

    return Array.from(violationIds)
      .map(id => this.violations.get(id))
      .filter(v => v !== undefined) as SLAViolation[];
  }

  /**
   * Resolve a violation
   */
  resolveViolation(violationId: string): void {
    const violation = this.violations.get(violationId);
    if (!violation) {
      return;
    }

    violation.remediated = true;

    // Remove from active violations
    const activeSet = this.activeViolations.get(violation.slaId);
    if (activeSet) {
      activeSet.delete(violationId);
    }

    this.emit('violation:resolved', violation);
  }

  /**
   * Get SLA compliance status
   */
  getComplianceStatus(slaId: string): {
    compliant: boolean;
    uptime: number; // percentage
    violationCount: number;
    activeViolationCount: number;
    lastViolation?: SLAViolation;
  } {
    const sla = this.slas.get(slaId);
    if (!sla) {
      throw new Error(`SLA not found: ${slaId}`);
    }

    const violations = this.getViolations({ slaIds: [slaId] });
    const activeViolations = this.getActiveViolations(slaId);

    // Calculate uptime (simplified)
    const now = Date.now();
    const last30Days = now - 30 * 24 * 60 * 60 * 1000;
    const recentViolations = violations.filter(v => v.timestamp >= last30Days);
    const totalDowntime = recentViolations.reduce((sum, v) => sum + v.duration, 0);
    const uptime = ((30 * 24 * 60 * 60 * 1000 - totalDowntime) / (30 * 24 * 60 * 60 * 1000)) * 100;

    return {
      compliant: activeViolations.length === 0,
      uptime,
      violationCount: violations.length,
      activeViolationCount: activeViolations.length,
      lastViolation: violations[0],
    };
  }

  /**
   * Get SLA metrics summary
   */
  getMetricsSummary(slaId: string): {
    current: number;
    target: number;
    p50: number;
    p95: number;
    p99: number;
    trend: 'improving' | 'stable' | 'degrading';
  } {
    const sla = this.slas.get(slaId);
    if (!sla) {
      throw new Error(`SLA not found: ${slaId}`);
    }

    const key = this.getMetricKey(slaId, {});
    const values = this.metrics.get(key) || [];

    const recentValues = values
      .filter(v => Date.now() - v.timestamp < 60 * 60 * 1000) // Last hour
      .map(v => v.value)
      .sort((a, b) => a - b);

    const current = recentValues.length > 0
      ? recentValues[recentValues.length - 1]
      : 0;

    const p50 = this.percentile(recentValues, 0.5);
    const p95 = this.percentile(recentValues, 0.95);
    const p99 = this.percentile(recentValues, 0.99);

    // Calculate trend
    const last5Min = values.filter(v => Date.now() - v.timestamp < 5 * 60 * 1000);
    const last15Min = values.filter(v =>
      Date.now() - v.timestamp >= 5 * 60 * 1000 &&
      Date.now() - v.timestamp < 15 * 60 * 1000
    );

    const avg5Min = last5Min.reduce((sum, v) => sum + v.value, 0) / last5Min.length;
    const avg15Min = last15Min.reduce((sum, v) => sum + v.value, 0) / last15Min.length;

    let trend: 'improving' | 'stable' | 'degrading' = 'stable';
    if (sla.metric === 'latency') {
      // Lower is better for latency
      if (avg5Min < avg15Min * 0.9) trend = 'improving';
      else if (avg5Min > avg15Min * 1.1) trend = 'degrading';
    } else {
      // Higher is better for uptime, success_rate
      if (avg5Min > avg15Min * 1.1) trend = 'improving';
      else if (avg5Min < avg15Min * 0.9) trend = 'degrading';
    }

    return {
      current,
      target: sla.target,
      p50,
      p95,
      p99,
      trend,
    };
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.violations.clear();
    this.metrics.clear();
    for (const interval of this.monitoringIntervals.values()) {
      clearInterval(interval);
    }
    this.monitoringIntervals.clear();
  }

  /**
   * Start monitoring an SLA
   */
  private startMonitoring(slaId: string): void {
    const sla = this.slas.get(slaId);
    if (!sla) {
      return;
    }

    const interval = setInterval(() => {
      this.checkSLA(slaId);
    }, sla.monitoringInterval);

    this.monitoringIntervals.set(slaId, interval);
  }

  /**
   * Stop monitoring an SLA
   */
  private stopMonitoring(slaId: string): void {
    const interval = this.monitoringIntervals.get(slaId);
    if (interval) {
      clearInterval(interval);
      this.monitoringIntervals.delete(slaId);
    }
  }

  /**
   * Check SLA and create violation if needed
   */
  private checkSLA(
    slaId: string,
    scope: {
      agentId?: string;
      workflowId?: string;
      userId?: string;
      teamId?: string;
      organizationId?: string;
    } = {}
  ): void {
    const sla = this.slas.get(slaId);
    if (!sla || !sla.enabled) {
      return;
    }

    const key = this.getMetricKey(slaId, scope);
    const values = this.metrics.get(key) || [];

    // Get recent values (last monitoring interval)
    const recentValues = values.filter(v =>
      Date.now() - v.timestamp < sla.monitoringInterval
    );

    if (recentValues.length === 0) {
      return;
    }

    // Calculate current metric value
    let currentValue: number;
    switch (sla.metric) {
      case 'uptime':
        // Percentage of successful checks
        currentValue = (recentValues.filter(v => v.value > 0).length / recentValues.length) * 100;
        break;
      case 'latency':
        // P95 latency
        currentValue = this.percentile(
          recentValues.map(v => v.value).sort((a, b) => a - b),
          0.95
        );
        break;
      case 'success_rate':
        // Average success rate
        currentValue = recentValues.reduce((sum, v) => sum + v.value, 0) / recentValues.length;
        break;
      case 'cost':
        // Total cost
        currentValue = recentValues.reduce((sum, v) => sum + v.value, 0);
        break;
    }

    const result: SLAMonitoringResult = {
      timestamp: Date.now(),
      slaId,
      metric: sla.metric,
      value: currentValue,
      target: sla.target,
      status: 'ok',
    };

    // Check for violation
    const isViolation = this.isViolation(currentValue, sla);

    if (isViolation) {
      result.status = 'violation';

      // Create or update violation
      const violationId = this.createViolation(sla, currentValue, scope);
      const violation = this.violations.get(violationId)!;
      result.violation = violation;

      // Send alert
      this.sendAlert(violation, sla);

      // Attempt auto-remediation
      if (sla.autoRemediation?.enabled) {
        this.attemptRemediation(violation, sla);
      }
    } else if (currentValue >= sla.target * 0.9) {
      result.status = 'warning';
    }

    this.emit('sla:checked', result);
  }

  /**
   * Check if value violates SLA
   */
  private isViolation(value: number, sla: SLADefinition): boolean {
    switch (sla.metric) {
      case 'uptime':
      case 'success_rate':
        // Higher is better
        return value < sla.threshold;
      case 'latency':
      case 'cost':
        // Lower is better
        return value > sla.threshold;
    }
  }

  /**
   * Create or update a violation
   */
  private createViolation(
    sla: SLADefinition,
    actualValue: number,
    scope: any
  ): string {
    const scopeKey = JSON.stringify(scope);
    const existingViolation = Array.from(this.violations.values()).find(v =>
      v.slaId === sla.id &&
      JSON.stringify(v.scope) === scopeKey &&
      !v.remediated
    );

    if (existingViolation) {
      // Update existing violation
      existingViolation.duration = Date.now() - existingViolation.timestamp;
      return existingViolation.id;
    }

    // Create new violation
    const id = this.generateViolationId();
    const severity = this.calculateSeverity(actualValue, sla);

    const violation: SLAViolation = {
      id,
      slaId: sla.id,
      slaName: sla.name,
      timestamp: Date.now(),
      metric: sla.metric,
      target: sla.target,
      actual: actualValue,
      severity,
      scope,
      duration: 0,
      remediated: false,
    };

    this.violations.set(id, violation);
    this.activeViolations.get(sla.id)!.add(id);

    this.emit('violation:created', violation);

    return id;
  }

  /**
   * Calculate violation severity
   */
  private calculateSeverity(value: number, sla: SLADefinition): AlertSeverity {
    const deviation = Math.abs((value - sla.target) / sla.target);

    if (deviation >= 0.5) return 'critical';
    if (deviation >= 0.3) return 'high';
    if (deviation >= 0.1) return 'medium';
    return 'low';
  }

  /**
   * Send alert for violation
   */
  private async sendAlert(violation: SLAViolation, sla: SLADefinition): Promise<void> {
    const alertStart = Date.now();

    for (const channel of sla.alertChannels) {
      try {
        // In production, this would send to actual channels
        // For now, just emit an event
        this.emit('alert:sent', {
          violation,
          channel,
          sla,
        });
      } catch (error) {
        logger.error(`Failed to send alert to ${channel}:`, error);
      }
    }

    const alertLatency = Date.now() - alertStart;
    if (alertLatency > this.config.alertLatency) {
      logger.warn(`Alert latency exceeded: ${alertLatency}ms`);
    }
  }

  /**
   * Attempt auto-remediation
   */
  private async attemptRemediation(
    violation: SLAViolation,
    sla: SLADefinition
  ): Promise<void> {
    if (!sla.autoRemediation?.enabled) {
      return;
    }

    const actions: string[] = [];

    for (const action of sla.autoRemediation.actions) {
      try {
        // In production, this would execute actual remediation actions
        // For now, just emit an event
        this.emit('remediation:attempted', {
          violation,
          action,
        });

        actions.push(action.type);
      } catch (error) {
        logger.error(`Remediation action failed:`, error);
      }
    }

    violation.remediationActions = actions;
  }

  /**
   * Get metric key for storage
   */
  private getMetricKey(slaId: string, scope: any): string {
    return `${slaId}_${JSON.stringify(scope)}`;
  }

  /**
   * Calculate percentile
   */
  private percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Start cleanup task
   */
  private startCleanupTask(): void {
    setInterval(() => {
      const cutoff = Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000;

      // Clean up old violations
      for (const [id, violation] of this.violations.entries()) {
        if (violation.timestamp < cutoff) {
          this.violations.delete(id);
        }
      }

      // Clean up old metrics
      for (const [key, values] of this.metrics.entries()) {
        const filtered = values.filter(v => v.timestamp >= cutoff);
        if (filtered.length === 0) {
          this.metrics.delete(key);
        } else {
          this.metrics.set(key, filtered);
        }
      }
    }, 60 * 60 * 1000); // Run every hour
  }

  /**
   * Generate SLA ID
   */
  private generateSLAId(): string {
    return `sla_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate violation ID
   */
  private generateViolationId(): string {
    return `violation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default AgentSLAMonitor;
