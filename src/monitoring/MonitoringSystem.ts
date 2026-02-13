/**
 * Monitoring System
 * Comprehensive monitoring, metrics, and observability
 */

import { EventEmitter } from 'events';
import { logger } from '../services/SimpleLogger';

export interface Metric {
  name: string;
  value: number;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  timestamp: Date;
  tags?: Record<string, string>;
  unit?: string;
}

export interface HealthCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  latency?: number;
  lastCheck: Date;
}

export interface PerformanceMetrics {
  cpu: {
    usage: number;
    load: number[];
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  disk: {
    used: number;
    total: number;
    percentage: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
    errors: number;
  };
}

export interface WorkflowMetrics {
  executionsTotal: number;
  executionsSuccess: number;
  executionsFailed: number;
  executionsInProgress: number;
  avgExecutionTime: number;
  p95ExecutionTime: number;
  p99ExecutionTime: number;
  nodeExecutions: Map<string, number>;
  errorRate: number;
  throughput: number;
}

export interface AlertRule {
  id: string;
  name: string;
  condition: string;
  threshold: number;
  comparison: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  duration?: number; // How long condition must be true
  severity: 'info' | 'warning' | 'error' | 'critical';
  actions: AlertAction[];
}

export interface AlertAction {
  type: 'email' | 'slack' | 'webhook' | 'pagerduty' | 'log';
  config: any;
}

export interface Alert {
  id: string;
  ruleId: string;
  triggered: Date;
  resolved?: Date;
  message: string;
  severity: string;
  value: number;
  metadata?: any;
}

export class MonitoringSystem extends EventEmitter {
  private metrics: Map<string, Metric[]> = new Map();
  private healthChecks: Map<string, HealthCheck> = new Map();
  private alertRules: Map<string, AlertRule> = new Map();
  private activeAlerts: Map<string, Alert> = new Map();
  private workflowMetrics: WorkflowMetrics;
  private performanceInterval?: NodeJS.Timeout;
  private metricsBuffer: Metric[] = [];
  private maxBufferSize = 10000;
  private flushInterval = 5000; // 5 seconds

  constructor() {
    super();
    this.workflowMetrics = this.initializeWorkflowMetrics();
    this.startPerformanceMonitoring();
    this.startMetricsFlush();
    this.setupDefaultAlertRules();
  }

  /**
   * Initialize workflow metrics
   */
  private initializeWorkflowMetrics(): WorkflowMetrics {
    return {
      executionsTotal: 0,
      executionsSuccess: 0,
      executionsFailed: 0,
      executionsInProgress: 0,
      avgExecutionTime: 0,
      p95ExecutionTime: 0,
      p99ExecutionTime: 0,
      nodeExecutions: new Map(),
      errorRate: 0,
      throughput: 0
    };
  }

  /**
   * Record a metric
   */
  recordMetric(metric: Omit<Metric, 'timestamp'>): void {
    const fullMetric: Metric = {
      ...metric,
      timestamp: new Date()
    };

    // Add to buffer
    this.metricsBuffer.push(fullMetric);

    // Store in memory
    if (!this.metrics.has(metric.name)) {
      this.metrics.set(metric.name, []);
    }
    
    const metricArray = this.metrics.get(metric.name)!;
    metricArray.push(fullMetric);

    // Trim old metrics (keep last hour)
    const oneHourAgo = new Date(Date.now() - 3600000);
    const filtered = metricArray.filter(m => m.timestamp > oneHourAgo);
    this.metrics.set(metric.name, filtered);

    // Check alert rules
    this.checkAlertRules(fullMetric);

    // Emit metric event
    this.emit('metric', fullMetric);
  }

  /**
   * Record workflow execution start
   */
  recordExecutionStart(executionId: string, workflowId: string): void {
    this.workflowMetrics.executionsInProgress++;
    this.workflowMetrics.executionsTotal++;
    
    this.recordMetric({
      name: 'workflow.execution.started',
      type: 'counter',
      value: 1,
      tags: { workflowId, executionId }
    });
  }

  /**
   * Record workflow execution end
   */
  recordExecutionEnd(
    executionId: string,
    workflowId: string,
    success: boolean,
    duration: number
  ): void {
    this.workflowMetrics.executionsInProgress--;
    
    if (success) {
      this.workflowMetrics.executionsSuccess++;
    } else {
      this.workflowMetrics.executionsFailed++;
    }

    // Update average execution time
    this.updateExecutionTimeMetrics(duration);

    // Update error rate
    this.workflowMetrics.errorRate = 
      this.workflowMetrics.executionsFailed / this.workflowMetrics.executionsTotal;

    this.recordMetric({
      name: 'workflow.execution.completed',
      type: 'counter',
      value: 1,
      tags: { 
        workflowId, 
        executionId, 
        status: success ? 'success' : 'failure' 
      }
    });

    this.recordMetric({
      name: 'workflow.execution.duration',
      type: 'histogram',
      value: duration,
      unit: 'ms',
      tags: { workflowId }
    });
  }

  /**
   * Record node execution
   */
  recordNodeExecution(
    nodeId: string,
    nodeType: string,
    duration: number,
    success: boolean
  ): void {
    const count = this.workflowMetrics.nodeExecutions.get(nodeType) || 0;
    this.workflowMetrics.nodeExecutions.set(nodeType, count + 1);

    this.recordMetric({
      name: 'node.execution',
      type: 'counter',
      value: 1,
      tags: { 
        nodeId, 
        nodeType, 
        status: success ? 'success' : 'failure' 
      }
    });

    this.recordMetric({
      name: 'node.execution.duration',
      type: 'histogram',
      value: duration,
      unit: 'ms',
      tags: { nodeType }
    });
  }

  /**
   * Update execution time metrics
   */
  private updateExecutionTimeMetrics(duration: number): void {
    // Simple moving average
    const total = this.workflowMetrics.executionsTotal;
    const currentAvg = this.workflowMetrics.avgExecutionTime;
    this.workflowMetrics.avgExecutionTime = 
      (currentAvg * (total - 1) + duration) / total;

    // Update percentiles (simplified - in production use proper percentile calculation)
    const executions = this.metrics.get('workflow.execution.duration') || [];
    const durations = executions.map(m => m.value).sort((a, b) => a - b);
    
    if (durations.length > 0) {
      const p95Index = Math.floor(durations.length * 0.95);
      const p99Index = Math.floor(durations.length * 0.99);
      
      this.workflowMetrics.p95ExecutionTime = durations[p95Index] || duration;
      this.workflowMetrics.p99ExecutionTime = durations[p99Index] || duration;
    }
  }

  /**
   * Register health check
   */
  registerHealthCheck(
    name: string,
    check: () => Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; message?: string }>
  ): void {
    const performCheck = async () => {
      const start = Date.now();
      try {
        const result = await check();
        const latency = Date.now() - start;
        
        this.healthChecks.set(name, {
          name,
          status: result.status,
          message: result.message,
          latency,
          lastCheck: new Date()
        });

        this.recordMetric({
          name: 'health.check',
          type: 'gauge',
          value: result.status === 'healthy' ? 1 : 0,
          tags: { check: name }
        });

        this.recordMetric({
          name: 'health.check.latency',
          type: 'gauge',
          value: latency,
          unit: 'ms',
          tags: { check: name }
        });

      } catch (error) {
        this.healthChecks.set(name, {
          name,
          status: 'unhealthy',
          message: (error as Error).message,
          lastCheck: new Date()
        });
      }
    };

    // Perform initial check
    performCheck();

    // Schedule periodic checks
    setInterval(performCheck, 30000); // Every 30 seconds
  }

  /**
   * Get overall health status
   */
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: HealthCheck[];
  } {
    const checks = Array.from(this.healthChecks.values());
    
    const unhealthyCount = checks.filter(c => c.status === 'unhealthy').length;
    const degradedCount = checks.filter(c => c.status === 'degraded').length;

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (unhealthyCount > 0) {
      status = 'unhealthy';
    } else if (degradedCount > 0) {
      status = 'degraded';
    }

    return { status, checks };
  }

  /**
   * Start performance monitoring
   */
  private startPerformanceMonitoring(): void {
    this.performanceInterval = setInterval(() => {
      const perf = this.collectPerformanceMetrics();
      
      this.recordMetric({
        name: 'system.cpu.usage',
        type: 'gauge',
        value: perf.cpu.usage,
        unit: 'percent'
      });

      this.recordMetric({
        name: 'system.memory.usage',
        type: 'gauge',
        value: perf.memory.percentage,
        unit: 'percent'
      });

      this.recordMetric({
        name: 'system.disk.usage',
        type: 'gauge',
        value: perf.disk.percentage,
        unit: 'percent'
      });

    }, 10000); // Every 10 seconds
  }

  /**
   * Collect performance metrics
   */
  private collectPerformanceMetrics(): PerformanceMetrics {
    // Mock implementation - in production, use actual system metrics
    return {
      cpu: {
        usage: Math.random() * 100,
        load: [1.5, 1.2, 0.8]
      },
      memory: {
        used: 4 * 1024 * 1024 * 1024, // 4GB
        total: 8 * 1024 * 1024 * 1024, // 8GB
        percentage: 50
      },
      disk: {
        used: 50 * 1024 * 1024 * 1024, // 50GB
        total: 100 * 1024 * 1024 * 1024, // 100GB
        percentage: 50
      },
      network: {
        bytesIn: Math.floor(Math.random() * 1000000),
        bytesOut: Math.floor(Math.random() * 1000000),
        errors: Math.floor(Math.random() * 10)
      }
    };
  }

  /**
   * Setup default alert rules
   */
  private setupDefaultAlertRules(): void {
    // High error rate
    this.addAlertRule({
      id: 'high-error-rate',
      name: 'High Error Rate',
      condition: 'workflow.error.rate',
      threshold: 0.1, // 10%
      comparison: 'gt',
      duration: 300000, // 5 minutes
      severity: 'warning',
      actions: [
        { type: 'log', config: {} },
        { type: 'slack', config: { channel: '#alerts' } }
      ]
    });

    // High CPU usage
    this.addAlertRule({
      id: 'high-cpu',
      name: 'High CPU Usage',
      condition: 'system.cpu.usage',
      threshold: 80,
      comparison: 'gt',
      duration: 600000, // 10 minutes
      severity: 'warning',
      actions: [
        { type: 'log', config: {} }
      ]
    });

    // Low disk space
    this.addAlertRule({
      id: 'low-disk',
      name: 'Low Disk Space',
      condition: 'system.disk.usage',
      threshold: 90,
      comparison: 'gt',
      severity: 'critical',
      actions: [
        { type: 'log', config: {} },
        { type: 'pagerduty', config: { serviceKey: 'xxx' } }
      ]
    });
  }

  /**
   * Add alert rule
   */
  addAlertRule(rule: AlertRule): void {
    this.alertRules.set(rule.id, rule);
  }

  /**
   * Check alert rules against metric
   */
  private checkAlertRules(metric: Metric): void {
    for (const rule of this.alertRules.values()) {
      if (this.matchesCondition(metric, rule.condition)) {
        this.evaluateAlert(rule, metric);
      }
    }
  }

  /**
   * Check if metric matches condition
   */
  private matchesCondition(metric: Metric, condition: string): boolean {
    // Simple pattern matching - in production, use more sophisticated matching
    return metric.name === condition || 
           metric.name.includes(condition) ||
           condition.includes(metric.name);
  }

  /**
   * Evaluate alert
   */
  private evaluateAlert(rule: AlertRule, metric: Metric): void {
    const shouldTrigger = this.compareValue(metric.value, rule.threshold, rule.comparison);

    if (shouldTrigger) {
      const existingAlert = this.activeAlerts.get(rule.id);
      
      if (!existingAlert) {
        // Create new alert
        const alert: Alert = {
          id: `alert_${Date.now()}`,
          ruleId: rule.id,
          triggered: new Date(),
          message: `${rule.name}: ${metric.value} ${rule.comparison} ${rule.threshold}`,
          severity: rule.severity,
          value: metric.value,
          metadata: metric.tags
        };

        this.activeAlerts.set(rule.id, alert);
        this.triggerAlertActions(rule, alert);
        this.emit('alert', alert);
      }
    } else {
      // Check if alert should be resolved
      const existingAlert = this.activeAlerts.get(rule.id);
      if (existingAlert && !existingAlert.resolved) {
        existingAlert.resolved = new Date();
        this.emit('alert-resolved', existingAlert);
        this.activeAlerts.delete(rule.id);
      }
    }
  }

  /**
   * Compare values
   */
  private compareValue(value: number, threshold: number, comparison: string): boolean {
    switch (comparison) {
      case 'gt': return value > threshold;
      case 'lt': return value < threshold;
      case 'gte': return value >= threshold;
      case 'lte': return value <= threshold;
      case 'eq': return value === threshold;
      default: return false;
    }
  }

  /**
   * Trigger alert actions
   */
  private triggerAlertActions(rule: AlertRule, alert: Alert): void {
    for (const action of rule.actions) {
      try {
        switch (action.type) {
          case 'log':
            logger.error(`Alert: ${alert.message}`, { alert });
            break;
          
          case 'slack':
            // Send to Slack (mock)
            logger.info(`Would send Slack alert to ${action.config.channel}: ${alert.message}`);
            break;
          
          case 'email':
            // Send email (mock)
            logger.info(`Would send email alert to ${action.config.to}: ${alert.message}`);
            break;
          
          case 'webhook':
            // Call webhook (mock)
            logger.info(`Would call webhook ${action.config.url} with alert`);
            break;
          
          case 'pagerduty':
            // Trigger PagerDuty (mock)
            logger.info(`Would trigger PagerDuty with severity ${alert.severity}`);
            break;
        }
      } catch (error) {
        logger.error(`Failed to trigger alert action ${action.type}:`, error);
      }
    }
  }

  /**
   * Start metrics flush
   */
  private startMetricsFlush(): void {
    setInterval(() => {
      if (this.metricsBuffer.length > 0) {
        this.flushMetrics();
      }
    }, this.flushInterval);
  }

  /**
   * Flush metrics buffer
   */
  private flushMetrics(): void {
    const metrics = [...this.metricsBuffer];
    this.metricsBuffer = [];

    // In production, send to metrics backend
    this.emit('metrics-flush', metrics);
    
    logger.debug(`Flushed ${metrics.length} metrics`);
  }

  /**
   * Get metrics summary
   */
  getMetricsSummary(): any {
    const summary: any = {
      workflow: this.workflowMetrics,
      metrics: {},
      health: this.getHealthStatus(),
      alerts: {
        active: Array.from(this.activeAlerts.values()),
        total: this.activeAlerts.size
      }
    };

    // Aggregate metrics
    for (const [name, values] of this.metrics.entries()) {
      if (values.length > 0) {
        const sorted = values.map(v => v.value).sort((a, b) => a - b);
        summary.metrics[name] = {
          count: values.length,
          min: Math.min(...sorted),
          max: Math.max(...sorted),
          avg: sorted.reduce((a, b) => a + b, 0) / sorted.length,
          p50: sorted[Math.floor(sorted.length * 0.5)],
          p95: sorted[Math.floor(sorted.length * 0.95)],
          p99: sorted[Math.floor(sorted.length * 0.99)]
        };
      }
    }

    return summary;
  }

  /**
   * Export metrics in Prometheus format
   */
  exportPrometheus(): string {
    const lines: string[] = [];

    for (const [name, values] of this.metrics.entries()) {
      if (values.length > 0) {
        const latest = values[values.length - 1];
        const metricName = name.replace(/\./g, '_');
        
        // Add help text
        lines.push(`# HELP ${metricName} ${latest.type} metric`);
        lines.push(`# TYPE ${metricName} ${latest.type}`);
        
        // Add metric value
        const tags = latest.tags 
          ? '{' + Object.entries(latest.tags).map(([k, v]) => `${k}="${v}"`).join(',') + '}'
          : '';
        
        lines.push(`${metricName}${tags} ${latest.value}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Clean up
   */
  destroy(): void {
    if (this.performanceInterval) {
      clearInterval(this.performanceInterval);
    }
    this.removeAllListeners();
  }
}

// Export singleton instance
export const monitoringSystem = new MonitoringSystem();