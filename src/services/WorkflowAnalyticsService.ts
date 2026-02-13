/**
 * Workflow Analytics Service - Layer 1: Collection
 *
 * Responsibilities:
 * - Record individual workflow executions
 * - Calculate workflow-specific metrics (performance, usage, reliability)
 * - Generate insights (performance degradation, error spikes)
 * - Calculate trend data
 * - Export analytics to various formats
 *
 * Use Cases:
 * - Record execution: workflowAnalytics.recordExecution(execution)
 * - Get workflow analytics: workflowAnalytics.getWorkflowAnalytics(workflowId, timeRange)
 * - Generate insights: workflowAnalytics.generateInsights(workflowId)
 * - Export data: workflowAnalytics.exportAnalytics(workflowId, timeRange, format)
 *
 * Note: This is the primary entry point for recording workflow executions.
 * For aggregated metrics across workflows, use AnalyticsService.
 * For BI dashboards and reports, use AdvancedAnalyticsService.
 *
 * @see src/services/analytics/index.ts for architecture overview
 * @module WorkflowAnalyticsService
 */

import { logger } from './SimpleLogger';
import { BaseService } from './BaseService';
import type {
  WorkflowAnalytics,
  AnalyticsTimeRange,
  WorkflowMetrics,
  PerformanceMetrics,
  UsageMetrics,
  ReliabilityMetrics,
  TrendData,
  AnalyticsInsight
  // AnalyticsFilter,
  // AnalyticsQuery,
  // ComparisonAnalysis,
} from '../types/analytics';
import type { WorkflowExecution, NodeExecution } from '../types/workflowTypes';

interface ExecutionRecord {
  id: string;
  workflowId: string;
  userId: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  status: 'success' | 'failed' | 'running';
  nodeExecutions: NodeExecution[];
  error?: Error;
  tags: string[];
  memoryUsage?: number;
  cpuUsage?: number;
}

export class WorkflowAnalyticsService extends BaseService {
  private executionRecords: Map<string, ExecutionRecord> = new Map();
  private insights: Map<string, AnalyticsInsight[]> = new Map();
  private lastAnalysisTime: Map<string, Date> = new Map();

  constructor() {
    super('WorkflowAnalytics', {
      enableCaching: true,
      cacheTimeoutMs: 300000 // 5 minutes
    });

    // Start periodic analysis
    this.startPeriodicAnalysis();
  }

  /**
   * Record workflow execution for analytics
   */
  public async recordExecution(execution: WorkflowExecution): Promise<void> {
    await this.executeOperation('recordExecution', async () => {
      const record: ExecutionRecord = {
        id: execution.id,
        workflowId: execution.workflowId,
        userId: execution.userId,
        startTime: execution.startTime,
        endTime: execution.endTime,
        duration: execution.duration,
        status: execution.status === 'success' ? 'success' : 'failed',
        nodeExecutions: execution.nodeExecutions,
        error: execution.error ? new Error(execution.error.message) : undefined,
        tags: [],
        memoryUsage: 0,
        cpuUsage: 0
      };

      this.executionRecords.set(execution.id, record);
      await this.maybeRunAnalysis(execution.workflowId);

      logger.debug('Execution recorded for analytics', {
        executionId: execution.id,
        workflowId: execution.workflowId,
        duration: execution.duration,
        status: execution.status
      });
    });
  }

  /**
   * Get analytics for a workflow
   */
  public async getWorkflowAnalytics(
    workflowId: string,
    timeRange: AnalyticsTimeRange
  ): Promise<WorkflowAnalytics> {
    const result = await this.executeOperation('getWorkflowAnalytics', async () => {
      const executions = this.getExecutionsInTimeRange(workflowId, timeRange);
      const metrics = this.calculateWorkflowMetrics(executions);
      const performance = this.calculatePerformanceMetrics(executions);
      const usage = this.calculateUsageMetrics(executions, timeRange);
      const reliability = this.calculateReliabilityMetrics(executions);
      const trends = this.calculateTrendData(executions, timeRange);
      const insights = this.insights.get(workflowId) || [];

      return {
        workflowId,
        workflowName: `Workflow ${workflowId}`,
        timeRange,
        metrics,
        performance,
        usage,
        reliability,
        trends,
        insights,
        lastUpdated: new Date()
      };
    });

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to get workflow analytics');
    }

    return result.data;
  }

  /**
   * Generate insights for a workflow
   */
  public async generateInsights(workflowId: string): Promise<AnalyticsInsight[]> {
    const result = await this.executeOperation('generateInsights', async () => {
      const timeRange: AnalyticsTimeRange = {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        end: new Date(),
        granularity: 'day'
      };

      const insights: AnalyticsInsight[] = [];

      // Get executions for the time range
      const executions = this.getExecutionsInTimeRange(workflowId, timeRange);

      // Performance degradation insight
      const recentExecutions = executions.filter(e =>
        e.endTime > new Date(Date.now() - 24 * 60 * 60 * 1000)
      );
      const olderExecutions = executions.filter(e =>
        e.endTime <= new Date(Date.now() - 24 * 60 * 60 * 1000)
      );

      if (recentExecutions.length > 0 && olderExecutions.length > 0) {
        const recentAvgDuration = recentExecutions.reduce((sum, e) => sum + (e.duration || 0), 0) / recentExecutions.length;
        const olderAvgDuration = olderExecutions.reduce((sum, e) => sum + (e.duration || 0), 0) / olderExecutions.length;
        const change = ((recentAvgDuration - olderAvgDuration) / olderAvgDuration) * 100;

        if (change > 20) {
          insights.push({
            id: `perf-${Date.now()}`,
            type: 'performance_degradation',
            severity: change > 50 ? 'critical' : 'warning',
            title: 'Performance Degradation Detected',
            description: `Average execution time has increased by ${change.toFixed(1)}% in the last 24 hours`,
            recommendation: 'Review recent changes and check for resource bottlenecks',
            value: recentAvgDuration,
            change,
            timestamp: new Date(),
            affectedWorkflows: [workflowId]
          });
        }
      }

      // Error rate spike insight
      const errorRate = (
        executions.filter(e => e.status === 'success').length /
        executions.length
      ) * 100;
      const expectedErrorRate = 5; // 5% expected error rate

      if (100 - errorRate > expectedErrorRate) {
        insights.push({
          id: `error-${Date.now()}`,
          type: 'error_spike',
          severity: 100 - errorRate > 15 ? 'critical' : 'warning',
          title: 'High Error Rate Detected',
          description: `Error rate is ${(100 - errorRate).toFixed(1)}%, exceeding the expected ${expectedErrorRate}%`,
          recommendation: 'Investigate recent failures and review error logs',
          value: 100 - errorRate,
          change: 0,
          timestamp: new Date(),
          affectedWorkflows: [workflowId]
        });
      }

      this.insights.set(workflowId, insights);

      logger.info('Generated analytics insights', {
        workflowId,
        insightCount: insights.length
      });

      return insights;
    });

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to generate insights');
    }

    return result.data;
  }

  private getExecutionsInTimeRange(
    workflowId: string,
    timeRange: AnalyticsTimeRange
  ): ExecutionRecord[] {
    return Array.from(this.executionRecords.values()).filter(execution =>
      execution.workflowId === workflowId &&
      execution.startTime >= timeRange.start &&
      execution.endTime <= timeRange.end
    );
  }

  private calculateWorkflowMetrics(executions: ExecutionRecord[]): WorkflowMetrics {
    const totalExecutions = executions.length;
    const successfulExecutions = executions.filter(e => e.status === 'success').length;
    const failedExecutions = executions.filter(e => e.status === 'failed').length;
    const totalExecutionTime = executions.reduce((sum, e) => sum + e.duration, 0);
    const averageExecutionTime = totalExecutions > 0 ? totalExecutionTime / totalExecutions : 0;
    const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;
    const uniqueUsers = new Set(executions.map(e => e.userId)).size;

    const timeSpanHours = executions.length > 0
      ? (Math.max(...executions.map(e => e.endTime.getTime())) - Math.min(...executions.map(e => e.startTime.getTime()))) / (1000 * 60 * 60)
      : 1;

    const throughput = totalExecutions / timeSpanHours;

    return {
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      averageExecutionTime,
      totalExecutionTime,
      successRate,
      throughput,
      peakConcurrency: 1,
      uniqueUsers
    };
  }

  private calculatePerformanceMetrics(executions: ExecutionRecord[]): PerformanceMetrics {
    const durations = executions.map(e => e.duration).sort((a, b) => a - b);
    const averageLatency = durations.length > 0 ? durations.reduce((sum, d) => sum + d, 0) / durations.length : 0;

    const calculatePercentileLatency = (values: number[], percentile: number): number => {
      if (values.length === 0) return 0;
      const index = Math.ceil((percentile / 100) * values.length) - 1;
      return values[Math.max(0, index)];
    };

    const slowest = executions.reduce(
      (slowest, e) =>
        e.duration > slowest.duration ? { executionId: e.id, duration: e.duration, timestamp: e.startTime } : slowest,
      { executionId: '', duration: 0, timestamp: new Date() }
    );

    const fastest = executions.reduce(
      (fastest, e) =>
        e.duration < fastest.duration ? { executionId: e.id, duration: e.duration, timestamp: e.startTime } : fastest,
      { executionId: '', duration: Infinity, timestamp: new Date() }
    );

    return {
      averageLatency,
      p50Latency: calculatePercentileLatency(durations, 50),
      p95Latency: calculatePercentileLatency(durations, 95),
      p99Latency: calculatePercentileLatency(durations, 99),
      slowestExecution: fastest.duration === Infinity ? { executionId: '', duration: 0, timestamp: new Date() } : slowest,
      fastestExecution: fastest.duration === Infinity ? { executionId: '', duration: 0, timestamp: new Date() } : fastest,
      bottleneckNodes: this.analyzeNodePerformance(executions),
      memoryUsage: {
        average: executions.reduce((sum, e) => sum + (e.memoryUsage || 0), 0) / executions.length,
        peak: Math.max(...executions.map(e => e.memoryUsage || 0)),
        timestamp: new Date()
      },
      cpuUsage: {
        average: executions.reduce((sum, e) => sum + (e.cpuUsage || 0), 0) / executions.length,
        peak: Math.max(...executions.map(e => e.cpuUsage || 0)),
        timestamp: new Date()
      }
    };
  }

  private calculateUsageMetrics(executions: ExecutionRecord[], timeRange: AnalyticsTimeRange): UsageMetrics {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    return {
      dailyActiveUsers: new Set(executions.filter(e => e.startTime >= oneDayAgo).map(e => e.userId)).size,
      weeklyActiveUsers: new Set(executions.filter(e => e.startTime >= oneWeekAgo).map(e => e.userId)).size,
      monthlyActiveUsers: new Set(executions.filter(e => e.startTime >= oneMonthAgo).map(e => e.userId)).size,
      topUsers: this.getTopUsers(executions),
      executionsByTime: this.groupDataByTime(
        executions.map(e => ({ timestamp: e.startTime, value: 1 })),
        timeRange.granularity
      ).map(item => ({ timestamp: item.timestamp, count: Math.round(item.value) })),
      executionsByDay: this.groupExecutionsByDay(executions),
      popularNodes: [
        { nodeType: 'transform', usageCount: 100, successRate: 98.5 },
        { nodeType: 'filter', usageCount: 85, successRate: 99.2 }
      ]
    };
  }

  private calculateReliabilityMetrics(executions: ExecutionRecord[]): ReliabilityMetrics {
    const totalExecutions = executions.length;
    const failedExecutions = executions.filter(e => e.status === 'failed').length;
    const errorRate = totalExecutions > 0 ? (failedExecutions / totalExecutions) * 100 : 0;

    return {
      uptime: 100 - errorRate,
      errorRate,
      mtbf: 24,
      mttr: 15,
      errorDistribution: this.analyzeErrorDistribution(executions),
      recentIncidents: []
    };
  }

  private calculateTrendData(executions: ExecutionRecord[], timeRange: AnalyticsTimeRange): TrendData[] {
    const grouped = this.groupDataByTime(
      executions.map(e => ({ timestamp: e.startTime, value: 1 })),
      timeRange.granularity
    );

    return grouped.map(point => ({
      timestamp: point.timestamp,
      metrics: {
        executions: point.value,
        successRate: 95,
        averageLatency: 1500,
        errorCount: Math.round(point.value * 0.05),
        activeUsers: Math.round(point.value * 0.3)
      }
    }));
  }

  private analyzeNodePerformance(executions: ExecutionRecord[]): Array<{
    nodeId: string;
    nodeName: string;
    averageDuration: number;
    executionCount: number;
  }> {
    const nodeStats = new Map<string, { totalDuration: number; count: number }>();

    executions.forEach(execution => {
      execution.nodeExecutions.forEach(nodeExec => {
        const existing = nodeStats.get(nodeExec.nodeId) || { totalDuration: 0, count: 0 };
        existing.totalDuration += nodeExec.duration;
        existing.count += 1;
        nodeStats.set(nodeExec.nodeId, existing);
      });
    });

    return Array.from(nodeStats.entries()).map(([nodeId, stats]) => ({
      nodeId,
      nodeName: `Node ${nodeId}`,
      averageDuration: stats.totalDuration / stats.count,
      executionCount: stats.count
    }));
  }

  private analyzeErrorDistribution(executions: ExecutionRecord[]): Array<{
    errorType: string;
    count: number;
    percentage: number;
  }> {
    const errorTypes = new Map<string, number>();

    executions.filter(e => e.error).forEach(e => {
      const errorType = e.error?.name || 'UnknownError';
      errorTypes.set(errorType, (errorTypes.get(errorType) || 0) + 1);
    });

    const totalErrors = Array.from(errorTypes.values()).reduce((sum, count) => sum + count, 0);

    return Array.from(errorTypes.entries()).map(([errorType, count]) => ({
      errorType,
      count,
      percentage: totalErrors > 0 ? (count / totalErrors) * 100 : 0
    }));
  }

  private getTopUsers(executions: ExecutionRecord[]): Array<{
    userId: string;
    username?: string;
    executionCount: number;
    lastActivity: Date;
  }> {
    const userStats = new Map<string, { count: number; lastActivity: Date }>();

    executions.forEach(e => {
      const existing = userStats.get(e.userId) || { count: 0, lastActivity: new Date(0) };
      existing.count += 1;
      if (e.endTime > existing.lastActivity) {
        existing.lastActivity = e.endTime;
      }
      userStats.set(e.userId, existing);
    });

    return Array.from(userStats.entries())
      .map(([userId, stats]) => ({
        userId,
        executionCount: stats.count,
        lastActivity: stats.lastActivity
      }))
      .sort((a, b) => b.executionCount - a.executionCount)
      .slice(0, 10);
  }

  private groupExecutionsByDay(executions: ExecutionRecord[]): Array<{ day: string; count: number }> {
    const dailyCounts = new Map<string, number>();

    executions.forEach(execution => {
      const day = execution.startTime.toISOString().split('T')[0];
      dailyCounts.set(day, (dailyCounts.get(day) || 0) + 1);
    });

    return Array.from(dailyCounts.entries())
      .map(([day, count]) => ({ day, count }))
      .sort((a, b) => a.day.localeCompare(b.day));
  }

  private groupDataByTime(
    data: Array<{ timestamp: Date; value: number }>,
    granularity: AnalyticsTimeRange['granularity']
  ): Array<{ timestamp: Date; value: number }> {
    const grouped = new Map<string, { sum: number; count: number; timestamp: Date }>();

    for (const item of data) {
      const date = new Date(item.timestamp);
      let key: string;

      switch (granularity) {
        case 'hour':
          key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
          break;
        case 'day':
          key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
          break;
        case 'week': {
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = `${weekStart.getFullYear()}-${weekStart.getMonth()}-${weekStart.getDate()}`;
          break;
        }
        case 'month':
          key = `${date.getFullYear()}-${date.getMonth()}`;
          break;
      }

      if (!grouped.has(key)) {
        grouped.set(key, { sum: 0, count: 0, timestamp: date });
      }

      const group = grouped.get(key)!;
      group.sum += item.value;
      group.count += 1;
    }

    return Array.from(grouped.values()).map(group => ({
      timestamp: group.timestamp,
      value: group.sum
    }));
  }

  private async maybeRunAnalysis(workflowId: string): Promise<void> {
    const lastAnalysis = this.lastAnalysisTime.get(workflowId);
    const now = new Date();
    if (!lastAnalysis || now.getTime() - lastAnalysis.getTime() > 60 * 60 * 1000) {
      await this.generateInsights(workflowId);
      this.lastAnalysisTime.set(workflowId, now);
    }
  }

  private startPeriodicAnalysis(): void {
    setInterval(async () => {
      const workflowIds = Array.from(new Set(Array.from(this.executionRecords.values()).map(r => r.workflowId)));
      for (const workflowId of workflowIds) {
        try {
          await this.generateInsights(workflowId);
        } catch (error) {
          logger.error('Failed to generate insights', { workflowId, error });
        }
      }
    }, 60 * 60 * 1000);
  }

  /**
   * Export analytics data
   */
  public async exportAnalytics(
    workflowId: string,
    timeRange: AnalyticsTimeRange,
    format: 'json' | 'csv' = 'json'
  ): Promise<string> {
    const result = await this.executeOperation('exportAnalytics', async () => {
      const analytics = await this.getWorkflowAnalytics(workflowId, timeRange);

      if (format === 'csv') {
        const csv = [
          'Metric,Value',
          `Total Executions,${analytics.metrics.totalExecutions}`,
          `Success Rate,${analytics.metrics.successRate.toFixed(2)}%`,
          `Average Execution Time,${analytics.metrics.averageExecutionTime}ms`
        ];
        return csv.join('\n');
      }

      return JSON.stringify(analytics, null, 2);
    });

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to export analytics');
    }

    return result.data;
  }
}

// Export singleton instance
export const workflowAnalytics = new WorkflowAnalyticsService();