import { Agent, AgentTask, AgentOutput } from '../../types/agents';
import { AgentBase } from '../agents/AgentBase';
import { logger } from '../../services/SimpleLogger';

/**
 * PerformanceMonitor - Tracks and analyzes agent performance metrics
 * Monitors latency, success rate, cost, and identifies performance bottlenecks
 */
export class PerformanceMonitor {
  private metrics: Map<string, AgentMetrics> = new Map();
  private taskMetrics: TaskMetric[] = [];
  private maxTaskHistory = 10000;
  private config: PerformanceMonitorConfig;
  private alerts: PerformanceAlert[] = [];

  constructor(config: Partial<PerformanceMonitorConfig> = {}) {
    this.config = {
      trackTaskHistory: config.trackTaskHistory ?? true,
      alertThresholds: {
        latency: config.alertThresholds?.latency || 5000, // 5s
        errorRate: config.alertThresholds?.errorRate || 0.2, // 20%
        costPerTask: config.alertThresholds?.costPerTask || 1.0,
      },
      enableAlerts: config.enableAlerts ?? true,
    };

    logger.info('PerformanceMonitor initialized', this.config);
  }

  /**
   * Record task execution
   */
  recordExecution(
    agent: AgentBase,
    task: AgentTask,
    output: AgentOutput,
    executionTime: number,
    error?: Error
  ): void {
    const agentId = agent.id;

    // Update agent metrics
    let metrics = this.metrics.get(agentId);
    if (!metrics) {
      metrics = this.initializeMetrics(agent);
      this.metrics.set(agentId, metrics);
    }

    this.updateMetrics(metrics, task, output, executionTime, error);

    // Record task metric
    if (this.config.trackTaskHistory) {
      this.recordTaskMetric(agent, task, output, executionTime, error);
    }

    // Check for alerts
    if (this.config.enableAlerts) {
      this.checkAlerts(metrics, agentId);
    }
  }

  /**
   * Get performance metrics for an agent
   */
  getMetrics(agentId: string): AgentMetrics | undefined {
    return this.metrics.get(agentId);
  }

  /**
   * Get metrics for all agents
   */
  getAllMetrics(): Map<string, AgentMetrics> {
    return new Map(this.metrics);
  }

  /**
   * Get performance report
   */
  getReport(): PerformanceReport {
    const allMetrics = Array.from(this.metrics.values());

    const totalTasks = allMetrics.reduce((sum, m) => sum + m.totalTasks, 0);
    const totalErrors = allMetrics.reduce((sum, m) => sum + m.errorCount, 0);
    const totalCost = allMetrics.reduce((sum, m) => sum + m.totalCost, 0);

    const avgLatency = allMetrics.length > 0
      ? allMetrics.reduce((sum, m) => sum + m.averageLatency, 0) / allMetrics.length
      : 0;

    const errorRate = totalTasks > 0 ? totalErrors / totalTasks : 0;

    // Find bottlenecks
    const bottlenecks = this.identifyBottlenecks(allMetrics);

    return {
      totalAgents: allMetrics.length,
      totalTasks,
      totalErrors,
      totalCost,
      averageLatency: avgLatency,
      errorRate,
      bottlenecks,
      topPerformers: this.getTopPerformers(allMetrics, 5),
      alerts: this.alerts.slice(-10), // Last 10 alerts
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get task history
   */
  getTaskHistory(limit = 100): TaskMetric[] {
    return this.taskMetrics.slice(-limit);
  }

  /**
   * Get alerts
   */
  getAlerts(limit = 50): PerformanceAlert[] {
    return this.alerts.slice(-limit);
  }

  /**
   * Clear alerts
   */
  clearAlerts(): void {
    this.alerts = [];
  }

  /**
   * Reset metrics for an agent
   */
  resetMetrics(agentId: string): void {
    this.metrics.delete(agentId);
  }

  /**
   * Reset all metrics
   */
  resetAll(): void {
    this.metrics.clear();
    this.taskMetrics = [];
    this.alerts = [];
  }

  // Private methods

  private initializeMetrics(agent: Agent): AgentMetrics {
    return {
      agentId: agent.id,
      agentName: agent.name,
      totalTasks: 0,
      successfulTasks: 0,
      errorCount: 0,
      averageLatency: 0,
      minLatency: Infinity,
      maxLatency: 0,
      p50Latency: 0,
      p95Latency: 0,
      p99Latency: 0,
      totalCost: 0,
      averageCost: 0,
      latencies: [],
    };
  }

  private updateMetrics(
    metrics: AgentMetrics,
    task: AgentTask,
    output: AgentOutput,
    executionTime: number,
    error?: Error
  ): void {
    metrics.totalTasks++;

    if (error) {
      metrics.errorCount++;
    } else {
      metrics.successfulTasks++;
    }

    // Update latency
    metrics.latencies.push(executionTime);
    if (metrics.latencies.length > 1000) {
      metrics.latencies.shift(); // Keep last 1000
    }

    metrics.minLatency = Math.min(metrics.minLatency, executionTime);
    metrics.maxLatency = Math.max(metrics.maxLatency, executionTime);

    const total = metrics.averageLatency * (metrics.totalTasks - 1);
    metrics.averageLatency = (total + executionTime) / metrics.totalTasks;

    // Calculate percentiles
    const sorted = [...metrics.latencies].sort((a, b) => a - b);
    metrics.p50Latency = sorted[Math.floor(sorted.length * 0.5)] || 0;
    metrics.p95Latency = sorted[Math.floor(sorted.length * 0.95)] || 0;
    metrics.p99Latency = sorted[Math.floor(sorted.length * 0.99)] || 0;

    // Update cost
    const taskCost = this.calculateTaskCost(output);
    metrics.totalCost += taskCost;
    metrics.averageCost = metrics.totalCost / metrics.totalTasks;
  }

  private recordTaskMetric(
    agent: AgentBase,
    task: AgentTask,
    output: AgentOutput,
    executionTime: number,
    error?: Error
  ): void {
    const metric: TaskMetric = {
      taskId: task.id,
      agentId: agent.id,
      agentName: agent.name,
      taskType: task.type,
      executionTime,
      success: !error,
      cost: this.calculateTaskCost(output),
      timestamp: new Date().toISOString(),
      error: error?.message,
    };

    this.taskMetrics.push(metric);

    // Trim history
    if (this.taskMetrics.length > this.maxTaskHistory) {
      this.taskMetrics.shift();
    }
  }

  private calculateTaskCost(output: AgentOutput): number {
    let cost = 0;

    if (output.toolCalls) {
      cost += output.toolCalls.reduce((sum, call) => sum + (call.cost || 0), 0);
    }

    if (output.metadata.cost) {
      cost += output.metadata.cost as number;
    }

    return cost;
  }

  private checkAlerts(metrics: AgentMetrics, agentId: string): void {
    const thresholds = this.config.alertThresholds;

    // Check latency
    if (metrics.averageLatency > thresholds.latency) {
      this.addAlert({
        type: 'high-latency',
        agentId,
        agentName: metrics.agentName,
        severity: 'warning',
        message: `High average latency: ${metrics.averageLatency.toFixed(0)}ms (threshold: ${thresholds.latency}ms)`,
        value: metrics.averageLatency,
        threshold: thresholds.latency,
        timestamp: new Date().toISOString(),
      });
    }

    // Check error rate
    const errorRate = metrics.totalTasks > 0 ? metrics.errorCount / metrics.totalTasks : 0;
    if (errorRate > thresholds.errorRate) {
      this.addAlert({
        type: 'high-error-rate',
        agentId,
        agentName: metrics.agentName,
        severity: 'error',
        message: `High error rate: ${(errorRate * 100).toFixed(1)}% (threshold: ${(thresholds.errorRate * 100).toFixed(1)}%)`,
        value: errorRate,
        threshold: thresholds.errorRate,
        timestamp: new Date().toISOString(),
      });
    }

    // Check cost
    if (metrics.averageCost > thresholds.costPerTask) {
      this.addAlert({
        type: 'high-cost',
        agentId,
        agentName: metrics.agentName,
        severity: 'warning',
        message: `High average cost: $${metrics.averageCost.toFixed(3)} (threshold: $${thresholds.costPerTask})`,
        value: metrics.averageCost,
        threshold: thresholds.costPerTask,
        timestamp: new Date().toISOString(),
      });
    }
  }

  private addAlert(alert: PerformanceAlert): void {
    this.alerts.push(alert);

    // Keep last 1000 alerts
    if (this.alerts.length > 1000) {
      this.alerts.shift();
    }

    logger.warn('Performance alert', alert);
  }

  private identifyBottlenecks(metrics: AgentMetrics[]): Bottleneck[] {
    const bottlenecks: Bottleneck[] = [];

    metrics.forEach(m => {
      // High latency bottleneck
      if (m.averageLatency > this.config.alertThresholds.latency) {
        bottlenecks.push({
          type: 'latency',
          agentId: m.agentId,
          agentName: m.agentName,
          severity: m.averageLatency > this.config.alertThresholds.latency * 2 ? 'high' : 'medium',
          impact: m.totalTasks,
          description: `Average latency: ${m.averageLatency.toFixed(0)}ms`,
        });
      }

      // High error rate bottleneck
      const errorRate = m.totalTasks > 0 ? m.errorCount / m.totalTasks : 0;
      if (errorRate > this.config.alertThresholds.errorRate) {
        bottlenecks.push({
          type: 'error-rate',
          agentId: m.agentId,
          agentName: m.agentName,
          severity: errorRate > 0.5 ? 'high' : 'medium',
          impact: m.errorCount,
          description: `Error rate: ${(errorRate * 100).toFixed(1)}%`,
        });
      }
    });

    return bottlenecks.sort((a, b) => {
      const severityOrder = { high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  private getTopPerformers(metrics: AgentMetrics[], limit: number): TopPerformer[] {
    return metrics
      .map(m => {
        const successRate = m.totalTasks > 0 ? m.successfulTasks / m.totalTasks : 0;
        const score = successRate * 1000 - m.averageLatency;

        return {
          agentId: m.agentId,
          agentName: m.agentName,
          successRate,
          averageLatency: m.averageLatency,
          totalTasks: m.totalTasks,
          score,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}

// Types

export interface PerformanceMonitorConfig {
  trackTaskHistory: boolean;
  alertThresholds: {
    latency: number;
    errorRate: number;
    costPerTask: number;
  };
  enableAlerts: boolean;
}

export interface AgentMetrics {
  agentId: string;
  agentName: string;
  totalTasks: number;
  successfulTasks: number;
  errorCount: number;
  averageLatency: number;
  minLatency: number;
  maxLatency: number;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
  totalCost: number;
  averageCost: number;
  latencies: number[];
}

export interface TaskMetric {
  taskId: string;
  agentId: string;
  agentName: string;
  taskType: string;
  executionTime: number;
  success: boolean;
  cost: number;
  timestamp: string;
  error?: string;
}

export interface PerformanceAlert {
  type: 'high-latency' | 'high-error-rate' | 'high-cost';
  agentId: string;
  agentName: string;
  severity: 'warning' | 'error';
  message: string;
  value: number;
  threshold: number;
  timestamp: string;
}

export interface Bottleneck {
  type: 'latency' | 'error-rate' | 'cost';
  agentId: string;
  agentName: string;
  severity: 'low' | 'medium' | 'high';
  impact: number;
  description: string;
}

export interface TopPerformer {
  agentId: string;
  agentName: string;
  successRate: number;
  averageLatency: number;
  totalTasks: number;
  score: number;
}

export interface PerformanceReport {
  totalAgents: number;
  totalTasks: number;
  totalErrors: number;
  totalCost: number;
  averageLatency: number;
  errorRate: number;
  bottlenecks: Bottleneck[];
  topPerformers: TopPerformer[];
  alerts: PerformanceAlert[];
  timestamp: string;
}
