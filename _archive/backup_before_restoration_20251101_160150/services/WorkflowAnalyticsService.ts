/**
 * Workflow Analytics Service
 * Collects, analyzes, and provides insights on workflow execution data
 */

import { logger } from './LoggingService';
import { BaseService } from './BaseService';
import type {
  WorkflowAnalytics,
  AnalyticsTimeRange,
  WorkflowMetrics,
  PerformanceMetrics,
  UsageMetrics,
  ReliabilityMetrics,
  TrendData,
  AnalyticsInsight,
  // AnalyticsFilter,
  // AnalyticsQuery,
  // ComparisonAnalysis,
  calculateSuccessRate,
  calculateThroughput,
  calculatePercentileLatency,
  groupDataByTime
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
    return this.executeOperation('recordExecution', async () => {
      const record: ExecutionRecord = {
        id: execution.id,
        workflowId: execution.workflowId,
        userId: execution.userId,
        startTime: execution.startTime,
        endTime: execution.endTime,
        duration: execution.duration,
        status: execution.status === 'success' ? 'success' : 'failed',
        nodeExecutions: execution.nodeExecutions,
        error: execution.error,
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
    return this.executeOperation('getWorkflowAnalytics', async () => {
      

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
  }

  /**
   * Generate insights for a workflow
   */
  public async generateInsights(workflowId: string): Promise<AnalyticsInsight[]> {
    return this.executeOperation('generateInsights', async () => {
      const timeRange: AnalyticsTimeRange = {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        end: new Date(),
        granularity: 'day'
      };

      const insights: AnalyticsInsight[] = [];

      // Performance degradation insight
        e.endTime > new Date(Date.now() - 24 * 60 * 60 * 1000)
      );
        e.endTime <= new Date(Date.now() - 24 * 60 * 60 * 1000)
      );

      if (recentExecutions.length > 0 && olderExecutions.length > 0) {

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
        executions.filter(e => e.status === 'success').length,
        executions.length
      );

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
    
      ? (Math.max(...executions.map(e => e.endTime.getTime())) - Math.min(...executions.map(e => e.startTime.getTime()))) / (1000 * 60 * 60)
      : 1;
    

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
    
      e.duration > slowest.duration ? { executionId: e.id, duration: e.duration, timestamp: e.startTime } : slowest,
      { executionId: '', duration: 0, timestamp: new Date() }
    );

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

    return {
      dailyActiveUsers: new Set(executions.filter(e => e.startTime >= oneDayAgo).map(e => e.userId)).size,
      weeklyActiveUsers: new Set(executions.filter(e => e.startTime >= oneWeekAgo).map(e => e.userId)).size,
      monthlyActiveUsers: new Set(executions.filter(e => e.startTime >= oneMonthAgo).map(e => e.userId)).size,
      topUsers: this.getTopUsers(executions),
      executionsByTime: groupDataByTime(
        executions.map(e => ({ timestamp: e.startTime, value: 1 })),
        timeRange.granularity
      ),
      executionsByDay: this.groupExecutionsByDay(executions),
      popularNodes: [
        { nodeType: 'transform', usageCount: 100, successRate: 98.5 },
        { nodeType: 'filter', usageCount: 85, successRate: 99.2 }
      ]
    };
  }

  private calculateReliabilityMetrics(executions: ExecutionRecord[]): ReliabilityMetrics {

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

    executions.forEach(execution => {
      execution.nodeExecutions.forEach(nodeExec => {
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

    executions.filter(e => e.error).forEach(e => {
      errorTypes.set(errorType, (errorTypes.get(errorType) || 0) + 1);
    });

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

    executions.forEach(e => {
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

    executions.forEach(execution => {
      dailyCounts.set(day, (dailyCounts.get(day) || 0) + 1);
    });

    return Array.from(dailyCounts.entries())
      .map(([day, count]) => ({ day, count }))
      .sort((a, b) => a.day.localeCompare(b.day));
  }

  private async maybeRunAnalysis(workflowId: string): Promise<void> {
    
    if (!lastAnalysis || now.getTime() - lastAnalysis.getTime() > 60 * 60 * 1000) {
      await this.generateInsights(workflowId);
      this.lastAnalysisTime.set(workflowId, now);
    }
  }

  private startPeriodicAnalysis(): void {
    setInterval(async () => {
      
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
    return this.executeOperation('exportAnalytics', async () => {

      if (format === 'csv') {
          'Metric,Value',
          `Total Executions,${analytics.metrics.totalExecutions}`,
          `Success Rate,${analytics.metrics.successRate.toFixed(2)}%`,
          `Average Execution Time,${analytics.metrics.averageExecutionTime}ms`
        ];
        return csv.join('\n');
      }

      return JSON.stringify(analytics, null, 2);
    });
  }
}

// Export singleton instance
export const workflowAnalytics = new WorkflowAnalyticsService();