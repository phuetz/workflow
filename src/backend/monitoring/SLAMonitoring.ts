/**
 * SLA Monitoring and Uptime Tracking System
 * Track SLOs, SLIs, and error budgets for production monitoring
 */

import { EventEmitter } from 'events';
import { getLogger } from './EnhancedLogger';

const logger = getLogger('sla-monitoring');

export interface SLO {
  id: string;
  name: string;
  description?: string;
  target: number; // Target percentage (e.g., 99.9 for 99.9%)
  window: 'hour' | 'day' | 'week' | 'month';
  metric: 'availability' | 'latency' | 'error_rate' | 'custom';
  threshold?: number; // For latency or custom metrics
  enabled: boolean;
}

export interface SLI {
  sloId: string;
  timestamp: Date;
  value: number; // Actual performance (percentage or value)
  target: number; // Target performance
  met: boolean; // Whether SLO was met
}

export interface ErrorBudget {
  sloId: string;
  period: 'current' | 'previous';
  windowStart: Date;
  windowEnd: Date;
  totalRequests: number;
  allowedErrors: number;
  actualErrors: number;
  remaining: number;
  remainingPercent: number;
  exhausted: boolean;
  burnRate: number; // How fast the budget is being consumed
}

export interface UptimeRecord {
  timestamp: Date;
  status: 'up' | 'down' | 'degraded';
  responseTime?: number;
  errorRate?: number;
  details?: any;
}

export interface UptimeStats {
  period: 'hour' | 'day' | 'week' | 'month' | 'year';
  startTime: Date;
  endTime: Date;
  totalTime: number;
  uptime: number;
  downtime: number;
  availability: number; // Percentage
  incidents: number;
  meanTimeToRecover?: number;
  meanTimeBetweenFailures?: number;
}

/**
 * SLA Monitoring System
 */
export class SLAMonitoring extends EventEmitter {
  private static instance: SLAMonitoring;
  private slos: Map<string, SLO> = new Map();
  private slis: Map<string, SLI[]> = new Map(); // SLO ID -> SLI history
  private errorBudgets: Map<string, ErrorBudget> = new Map();
  private uptimeRecords: UptimeRecord[] = [];
  private maxRecords: number = 10000;
  private monitoringInterval?: NodeJS.Timeout;

  private constructor() {
    super();
    this.initializeDefaultSLOs();
    this.startMonitoring();
  }

  public static getInstance(): SLAMonitoring {
    if (!SLAMonitoring.instance) {
      SLAMonitoring.instance = new SLAMonitoring();
    }
    return SLAMonitoring.instance;
  }

  /**
   * Initialize default SLOs
   */
  private initializeDefaultSLOs(): void {
    // Availability SLO: 99.9% uptime
    this.createSLO({
      name: 'System Availability',
      description: 'Overall system uptime',
      target: 99.9,
      window: 'month',
      metric: 'availability',
      enabled: true,
    });

    // Latency SLO: 95% of requests under 1 second
    this.createSLO({
      name: 'API Response Time',
      description: '95% of requests complete within 1 second',
      target: 95.0,
      window: 'day',
      metric: 'latency',
      threshold: 1000, // milliseconds
      enabled: true,
    });

    // Error Rate SLO: Less than 1% error rate
    this.createSLO({
      name: 'Error Rate',
      description: 'Error rate below 1%',
      target: 99.0,
      window: 'day',
      metric: 'error_rate',
      enabled: true,
    });

    // Workflow Success Rate SLO
    this.createSLO({
      name: 'Workflow Success Rate',
      description: '99% of workflows complete successfully',
      target: 99.0,
      window: 'week',
      metric: 'custom',
      enabled: true,
    });

    logger.info('Default SLOs initialized', {
      count: this.slos.size,
    });
  }

  /**
   * Create a new SLO
   */
  createSLO(params: Omit<SLO, 'id'>): SLO {
    const slo: SLO = {
      id: this.generateSLOId(),
      ...params,
    };

    this.slos.set(slo.id, slo);
    this.slis.set(slo.id, []);

    // Initialize error budget
    this.calculateErrorBudget(slo.id, 'current');

    logger.info('SLO created', {
      sloId: slo.id,
      name: slo.name,
      target: slo.target,
    });

    return slo;
  }

  /**
   * Update an SLO
   */
  updateSLO(sloId: string, updates: Partial<SLO>): boolean {
    const slo = this.slos.get(sloId);
    if (!slo) {
      return false;
    }

    Object.assign(slo, updates);

    logger.info('SLO updated', { sloId, updates });

    return true;
  }

  /**
   * Delete an SLO
   */
  deleteSLO(sloId: string): boolean {
    const deleted = this.slos.delete(sloId);
    if (deleted) {
      this.slis.delete(sloId);
      this.errorBudgets.delete(sloId);

      logger.info('SLO deleted', { sloId });
    }

    return deleted;
  }

  /**
   * Record an SLI measurement
   */
  recordSLI(sloId: string, value: number, met?: boolean): void {
    const slo = this.slos.get(sloId);
    if (!slo || !slo.enabled) {
      return;
    }

    const sli: SLI = {
      sloId,
      timestamp: new Date(),
      value,
      target: slo.target,
      met: met !== undefined ? met : value >= slo.target,
    };

    const history = this.slis.get(sloId) || [];
    history.push(sli);

    // Trim history
    if (history.length > this.maxRecords) {
      history.shift();
    }

    this.slis.set(sloId, history);

    if (!sli.met) {
      this.emit('sli-violation', { slo, sli });
    }

    // Update error budget
    this.calculateErrorBudget(sloId, 'current');
  }

  /**
   * Record uptime status
   */
  recordUptime(
    status: 'up' | 'down' | 'degraded',
    responseTime?: number,
    errorRate?: number,
    details?: any
  ): void {
    const record: UptimeRecord = {
      timestamp: new Date(),
      status,
      responseTime,
      errorRate,
      details,
    };

    this.uptimeRecords.push(record);

    // Trim records
    if (this.uptimeRecords.length > this.maxRecords) {
      this.uptimeRecords.shift();
    }

    // Update availability SLO
    const availabilitySLO = Array.from(this.slos.values()).find(
      (slo) => slo.metric === 'availability'
    );

    if (availabilitySLO) {
      const isAvailable = status === 'up';
      this.recordSLI(availabilitySLO.id, isAvailable ? 100 : 0, isAvailable);
    }

    if (status === 'down') {
      this.emit('system-down', record);
      logger.error('System down detected', details);
    } else if (status === 'degraded') {
      this.emit('system-degraded', record);
      logger.warn('System degraded', details);
    }
  }

  /**
   * Calculate error budget
   */
  private calculateErrorBudget(sloId: string, period: 'current' | 'previous'): ErrorBudget {
    const slo = this.slos.get(sloId);
    if (!slo) {
      throw new Error(`SLO not found: ${sloId}`);
    }

    const { windowStart, windowEnd } = this.getWindowDates(slo.window, period);

    const slis = this.getSLIsInWindow(sloId, windowStart, windowEnd);

    const totalRequests = slis.length;
    const allowedErrors = Math.floor(
      (totalRequests * (100 - slo.target)) / 100
    );
    const actualErrors = slis.filter((sli) => !sli.met).length;
    const remaining = allowedErrors - actualErrors;
    const remainingPercent = (remaining / allowedErrors) * 100;
    const exhausted = remaining <= 0;

    // Calculate burn rate (errors per hour)
    const windowHours =
      (windowEnd.getTime() - windowStart.getTime()) / (1000 * 60 * 60);
    const burnRate = actualErrors / windowHours;

    const budget: ErrorBudget = {
      sloId,
      period,
      windowStart,
      windowEnd,
      totalRequests,
      allowedErrors,
      actualErrors,
      remaining,
      remainingPercent: Math.max(0, remainingPercent),
      exhausted,
      burnRate,
    };

    this.errorBudgets.set(`${sloId}_${period}`, budget);

    if (exhausted && period === 'current') {
      this.emit('error-budget-exhausted', { slo, budget });
      logger.warn('Error budget exhausted', {
        sloId,
        sloName: slo.name,
        actualErrors,
        allowedErrors,
      });
    } else if (remainingPercent < 20 && period === 'current') {
      this.emit('error-budget-warning', { slo, budget });
      logger.warn('Error budget running low', {
        sloId,
        sloName: slo.name,
        remainingPercent: remainingPercent.toFixed(2),
      });
    }

    return budget;
  }

  /**
   * Get SLIs within a time window
   */
  private getSLIsInWindow(
    sloId: string,
    start: Date,
    end: Date
  ): SLI[] {
    const history = this.slis.get(sloId) || [];
    return history.filter(
      (sli) => sli.timestamp >= start && sli.timestamp <= end
    );
  }

  /**
   * Get window date range
   */
  private getWindowDates(
    window: 'hour' | 'day' | 'week' | 'month',
    period: 'current' | 'previous'
  ): { windowStart: Date; windowEnd: Date } {
    const now = new Date();
    let windowStart: Date;
    let windowEnd: Date;

    switch (window) {
      case 'hour':
        windowEnd = period === 'current' ? now : new Date(now.getTime() - 3600000);
        windowStart = new Date(windowEnd.getTime() - 3600000);
        break;

      case 'day':
        windowEnd =
          period === 'current'
            ? now
            : new Date(now.getTime() - 86400000);
        windowStart = new Date(windowEnd.getTime() - 86400000);
        break;

      case 'week':
        windowEnd =
          period === 'current'
            ? now
            : new Date(now.getTime() - 604800000);
        windowStart = new Date(windowEnd.getTime() - 604800000);
        break;

      case 'month':
        if (period === 'current') {
          windowEnd = now;
          windowStart = new Date(now.getFullYear(), now.getMonth(), 1);
        } else {
          windowEnd = new Date(now.getFullYear(), now.getMonth(), 0);
          windowStart = new Date(
            now.getFullYear(),
            now.getMonth() - 1,
            1
          );
        }
        break;
    }

    return { windowStart, windowEnd };
  }

  /**
   * Get current error budget
   */
  getErrorBudget(sloId: string, period: 'current' | 'previous' = 'current'): ErrorBudget | undefined {
    return this.errorBudgets.get(`${sloId}_${period}`);
  }

  /**
   * Get all error budgets
   */
  getAllErrorBudgets(): ErrorBudget[] {
    return Array.from(this.errorBudgets.values()).filter(
      (budget) => budget.period === 'current'
    );
  }

  /**
   * Get uptime statistics
   */
  getUptimeStats(period: 'hour' | 'day' | 'week' | 'month' | 'year'): UptimeStats {
    const { windowStart, windowEnd } = this.getWindowDates(
      period === 'year' ? 'month' : period,
      'current'
    );

    // Adjust for year
    if (period === 'year') {
      windowStart.setFullYear(windowStart.getFullYear() - 1);
    }

    const records = this.uptimeRecords.filter(
      (r) => r.timestamp >= windowStart && r.timestamp <= windowEnd
    );

    const totalTime = windowEnd.getTime() - windowStart.getTime();

    // Calculate uptime (assuming records are at regular intervals)
    const upRecords = records.filter((r) => r.status === 'up').length;
    const downRecords = records.filter((r) => r.status === 'down').length;

    const uptime = (upRecords / records.length) * totalTime;
    const downtime = (downRecords / records.length) * totalTime;

    // Calculate incidents (transitions from up to down)
    let incidents = 0;
    for (let i = 1; i < records.length; i++) {
      if (records[i].status === 'down' && records[i - 1].status === 'up') {
        incidents++;
      }
    }

    return {
      period,
      startTime: windowStart,
      endTime: windowEnd,
      totalTime,
      uptime,
      downtime,
      availability: (uptime / totalTime) * 100,
      incidents,
      meanTimeToRecover: incidents > 0 ? downtime / incidents : undefined,
      meanTimeBetweenFailures: incidents > 0 ? uptime / incidents : undefined,
    };
  }

  /**
   * Get SLO compliance
   */
  getSLOCompliance(sloId: string, period: 'current' | 'previous' = 'current'): {
    slo: SLO;
    compliance: number;
    met: boolean;
    sliCount: number;
    violationCount: number;
  } | undefined {
    const slo = this.slos.get(sloId);
    if (!slo) {
      return undefined;
    }

    const { windowStart, windowEnd } = this.getWindowDates(slo.window, period);
    const slis = this.getSLIsInWindow(sloId, windowStart, windowEnd);

    const metCount = slis.filter((sli) => sli.met).length;
    const compliance = slis.length > 0 ? (metCount / slis.length) * 100 : 100;

    return {
      slo,
      compliance,
      met: compliance >= slo.target,
      sliCount: slis.length,
      violationCount: slis.length - metCount,
    };
  }

  /**
   * Start monitoring
   */
  private startMonitoring(): void {
    // Check error budgets every 5 minutes
    this.monitoringInterval = setInterval(() => {
      for (const slo of this.slos.values()) {
        if (slo.enabled) {
          this.calculateErrorBudget(slo.id, 'current');
        }
      }
    }, 300000);

    logger.info('SLA monitoring started');
  }

  /**
   * Stop monitoring
   */
  shutdown(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    logger.info('SLA monitoring shutdown');
  }

  /**
   * Generate SLO ID
   */
  private generateSLOId(): string {
    return `slo_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Export SLA data
   */
  exportData(): any {
    return {
      slos: Array.from(this.slos.values()),
      errorBudgets: this.getAllErrorBudgets(),
      uptimeStats: {
        hour: this.getUptimeStats('hour'),
        day: this.getUptimeStats('day'),
        week: this.getUptimeStats('week'),
        month: this.getUptimeStats('month'),
      },
      compliance: Array.from(this.slos.keys()).map((sloId) =>
        this.getSLOCompliance(sloId)
      ),
    };
  }
}

export function getSLAMonitoring(): SLAMonitoring {
  return SLAMonitoring.getInstance();
}

export default SLAMonitoring;
