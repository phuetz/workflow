/**
 * Metrics Aggregator
 * Handles aggregation of execution, performance, and cost metrics
 */

import type { DateRange } from '../../types/advanced-analytics';
import type { TopWorkflow, SlowestNode } from '../../types/advanced-analytics';
import { prisma } from '../../backend/database/prisma';
import { dataWarehouse } from '../DataWarehouse';
import { logger } from '../../services/SimpleLogger';
import { statisticsCalculator } from './StatisticsCalculator';
import type {
  ExecutionMetricsSummary,
  PerformanceMetricsSummary,
  CostMetricsSummary,
  TopWorkflowMetric,
} from './types';
import { getCostConfig } from './types';

export class MetricsAggregator {
  /**
   * Get execution metrics from database (async)
   */
  async getExecutionMetricsAsync(dateRange: DateRange): Promise<ExecutionMetricsSummary> {
    try {
      const statusCounts = await prisma.workflowExecution.groupBy({
        by: ['status'],
        where: {
          startedAt: { gte: dateRange.start, lte: dateRange.end },
        },
        _count: { id: true },
      });

      const counts = new Map(statusCounts.map(s => [s.status, s._count.id]));

      const successful = counts.get('SUCCESS') || 0;
      const failed = counts.get('FAILED') || 0;
      const running = counts.get('RUNNING') || 0;
      const pending = counts.get('PENDING') || 0;
      const cancelled = counts.get('CANCELLED') || 0;
      const timeout = counts.get('TIMEOUT') || 0;

      const total = successful + failed + running + pending + cancelled + timeout;
      const successRate = total > 0 ? (successful / total) * 100 : 0;

      return {
        total,
        successful,
        failed,
        running: running + pending,
        successRate,
      };
    } catch (error) {
      logger.error('Failed to get execution metrics from database:', error);
      return this.getEmptyExecutionMetrics();
    }
  }

  /**
   * Get execution metrics (sync version uses DataWarehouse cache)
   */
  getExecutionMetrics(dateRange: DateRange): ExecutionMetricsSummary {
    const startedSeries = dataWarehouse.getTimeSeries(
      'workflow.started.count',
      dateRange,
      '1h',
      'sum'
    );

    const completedSeries = dataWarehouse.getTimeSeries(
      'workflow.completed.count',
      dateRange,
      '1h',
      'sum'
    );

    const failedSeries = dataWarehouse.getTimeSeries(
      'workflow.failed.count',
      dateRange,
      '1h',
      'sum'
    );

    const total = startedSeries?.dataPoints.reduce((sum, dp) => sum + dp.value, 0) || 0;
    const successful = completedSeries?.dataPoints.reduce((sum, dp) => sum + dp.value, 0) || 0;
    const failed = failedSeries?.dataPoints.reduce((sum, dp) => sum + dp.value, 0) || 0;
    const running = Math.max(0, total - successful - failed);
    const successRate = total > 0 ? (successful / total) * 100 : 0;

    return { total, successful, failed, running, successRate };
  }

  /**
   * Get performance metrics from database (async)
   */
  async getPerformanceMetricsAsync(dateRange: DateRange): Promise<PerformanceMetricsSummary> {
    try {
      const executions = await prisma.workflowExecution.findMany({
        where: {
          startedAt: { gte: dateRange.start, lte: dateRange.end },
          status: 'SUCCESS',
          duration: { not: null },
        },
        select: { duration: true },
      });

      const durations = executions
        .map(e => e.duration as number)
        .filter(d => d !== null)
        .sort((a, b) => a - b);

      const avgLatency = durations.length > 0
        ? durations.reduce((sum, d) => sum + d, 0) / durations.length
        : 0;

      const p50Latency = statisticsCalculator.calculatePercentile(durations, 50);
      const p95Latency = statisticsCalculator.calculatePercentile(durations, 95);
      const p99Latency = statisticsCalculator.calculatePercentile(durations, 99);

      const hoursDiff = (dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60);
      const throughput = hoursDiff > 0 ? durations.length / hoursDiff : 0;

      return { avgLatency, p50Latency, p95Latency, p99Latency, throughput };
    } catch (error) {
      logger.error('Failed to get performance metrics from database:', error);
      return this.getEmptyPerformanceMetrics();
    }
  }

  /**
   * Get performance metrics (sync version uses DataWarehouse cache)
   */
  getPerformanceMetrics(dateRange: DateRange): PerformanceMetricsSummary {
    const avgSeries = dataWarehouse.getTimeSeries('workflow.duration', dateRange, '1h', 'avg');
    const p50Series = dataWarehouse.getTimeSeries('workflow.duration', dateRange, '1h', 'p50');
    const p95Series = dataWarehouse.getTimeSeries('workflow.duration', dateRange, '1h', 'p95');
    const p99Series = dataWarehouse.getTimeSeries('workflow.duration', dateRange, '1h', 'p99');
    const executionsSeries = dataWarehouse.getTimeSeries(
      'workflow.completed.count',
      dateRange,
      '1h',
      'sum'
    );

    const avgLatency = statisticsCalculator.calculateAverage(
      avgSeries?.dataPoints.map(dp => dp.value) || []
    );
    const p50Latency = statisticsCalculator.calculateAverage(
      p50Series?.dataPoints.map(dp => dp.value) || []
    );
    const p95Latency = statisticsCalculator.calculateAverage(
      p95Series?.dataPoints.map(dp => dp.value) || []
    );
    const p99Latency = statisticsCalculator.calculateAverage(
      p99Series?.dataPoints.map(dp => dp.value) || []
    );

    const totalExecutions =
      executionsSeries?.dataPoints.reduce((sum, dp) => sum + dp.value, 0) || 0;
    const hoursDiff = (dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60);
    const throughput = hoursDiff > 0 ? totalExecutions / hoursDiff : 0;

    return { avgLatency, p50Latency, p95Latency, p99Latency, throughput };
  }

  /**
   * Get cost metrics from database (async)
   */
  async getCostMetricsAsync(dateRange: DateRange): Promise<CostMetricsSummary> {
    try {
      const costConfig = getCostConfig();

      const executions = await prisma.workflowExecution.findMany({
        where: { startedAt: { gte: dateRange.start, lte: dateRange.end } },
        select: { id: true, duration: true, status: true, metadata: true },
      });

      const totalDuration = executions.reduce((sum, e) => sum + (e.duration || 0), 0);
      const estimatedComputeCost = (totalDuration / 60000) * costConfig.costPerMinute;

      // Query node executions for granular cost breakdown
      const nodeExecutions = await prisma.nodeExecution.findMany({
        where: {
          execution: { startedAt: { gte: dateRange.start, lte: dateRange.end } },
        },
        select: { nodeType: true, duration: true, metadata: true },
      });

      // Calculate API call costs
      const apiCallNodes = ['httpRequest', 'webhook', 'graphql', 'rest', 'soap'];
      const apiCalls = nodeExecutions.filter(n => apiCallNodes.includes(n.nodeType));
      const apiCallCost = apiCalls.length * costConfig.costPerApiCall;

      // Calculate LLM token costs
      const llmNodes = ['openai', 'anthropic', 'googleAi', 'azureOpenai', 'llm', 'chatgpt'];
      const llmExecutions = nodeExecutions.filter(n => llmNodes.includes(n.nodeType));
      let llmTokensCost = 0;
      llmExecutions.forEach(exec => {
        const metadata = exec.metadata as Record<string, unknown> | null;
        const tokens = typeof metadata?.tokens === 'number' ? metadata.tokens : 100;
        llmTokensCost += tokens * costConfig.costPerToken;
      });

      // Calculate storage costs
      const storageCost = executions.length * costConfig.costPerExecutionStorage;
      const totalCost = estimatedComputeCost + apiCallCost + llmTokensCost + storageCost;

      // Calculate trend
      const trend = await this.calculateCostTrend(dateRange, totalCost, costConfig.costPerMinute);

      return {
        total: totalCost,
        byCategory: {
          apiCalls: apiCallCost,
          llmTokens: llmTokensCost,
          compute: estimatedComputeCost,
          storage: storageCost,
        },
        trend,
      };
    } catch (error) {
      logger.error('Failed to get cost metrics from database:', error);
      return this.getEmptyCostMetrics();
    }
  }

  /**
   * Get cost metrics (sync wrapper for backward compatibility)
   */
  getCostMetrics(_dateRange: DateRange): CostMetricsSummary {
    return this.getEmptyCostMetrics();
  }

  /**
   * Get top workflows by metric from database
   */
  async getTopWorkflowsAsync(
    dateRange: DateRange,
    limit: number = 10,
    metric: TopWorkflowMetric = 'executions'
  ): Promise<TopWorkflow[]> {
    try {
      const stats = await prisma.workflowExecution.groupBy({
        by: ['workflowId'],
        where: { startedAt: { gte: dateRange.start, lte: dateRange.end } },
        _count: { id: true },
        _avg: { duration: true },
        _sum: { duration: true },
        orderBy:
          metric === 'executions'
            ? { _count: { id: 'desc' } }
            : metric === 'latency'
              ? { _avg: { duration: 'desc' } }
              : { _sum: { duration: 'desc' } },
        take: limit,
      });

      if (stats.length === 0) return [];

      const workflowIds = stats.map(s => s.workflowId);
      const workflows = await prisma.workflow.findMany({
        where: { id: { in: workflowIds } },
        select: { id: true, name: true },
      });

      const workflowMap = new Map(workflows.map(w => [w.id, w.name]));
      const costConfig = getCostConfig();

      return stats.map((s, index) => {
        let value: number;
        let metricLabel: string;

        switch (metric) {
          case 'executions':
            value = s._count.id;
            metricLabel = 'executions';
            break;
          case 'latency':
            value = s._avg.duration || 0;
            metricLabel = 'avgLatency';
            break;
          case 'cost':
            const totalDuration = s._sum.duration || 0;
            value = (totalDuration / 60000) * costConfig.costPerMinute;
            metricLabel = 'estimatedCost';
            break;
          default:
            value = s._count.id;
            metricLabel = 'executions';
        }

        return {
          workflowId: s.workflowId,
          workflowName: workflowMap.get(s.workflowId) || 'Unknown Workflow',
          metric: metricLabel,
          value,
          rank: index + 1,
        };
      });
    } catch (error) {
      logger.error('Failed to get top workflows from database:', error);
      return [];
    }
  }

  /**
   * Get top workflows (sync wrapper)
   */
  getTopWorkflows(
    _dateRange: DateRange,
    _limit: number = 10,
    _metric: TopWorkflowMetric = 'executions'
  ): TopWorkflow[] {
    return [];
  }

  /**
   * Get slowest nodes from database
   */
  async getSlowestNodesAsync(dateRange: DateRange, limit: number = 10): Promise<SlowestNode[]> {
    try {
      const nodeStats = await prisma.nodeExecution.groupBy({
        by: ['nodeType'],
        where: {
          execution: { startedAt: { gte: dateRange.start, lte: dateRange.end } },
          status: 'SUCCESS',
        },
        _avg: { duration: true },
        _count: { id: true },
        _sum: { duration: true },
        orderBy: { _avg: { duration: 'desc' } },
        take: limit,
      });

      return nodeStats.map(stat => ({
        nodeType: stat.nodeType,
        avgDuration: stat._avg.duration || 0,
        executionCount: stat._count.id,
        totalDuration: stat._sum.duration || 0,
      }));
    } catch (error) {
      logger.error('Failed to get slowest nodes from database:', error);
      return [];
    }
  }

  /**
   * Get slowest nodes (sync wrapper)
   */
  getSlowestNodes(_dateRange: DateRange, _limit: number = 10): SlowestNode[] {
    return [];
  }

  // Private helper methods

  private async calculateCostTrend(
    dateRange: DateRange,
    totalCost: number,
    costPerMinute: number
  ): Promise<number> {
    const periodDuration = dateRange.end.getTime() - dateRange.start.getTime();
    const previousStart = new Date(dateRange.start.getTime() - periodDuration);
    const previousEnd = new Date(dateRange.start.getTime());

    const previousExecutions = await prisma.workflowExecution.findMany({
      where: { startedAt: { gte: previousStart, lte: previousEnd } },
      select: { duration: true },
    });

    const previousDuration = previousExecutions.reduce((sum, e) => sum + (e.duration || 0), 0);
    const previousCost = (previousDuration / 60000) * costPerMinute;

    return previousCost > 0 ? ((totalCost - previousCost) / previousCost) * 100 : 0;
  }

  private getEmptyExecutionMetrics(): ExecutionMetricsSummary {
    return { total: 0, successful: 0, failed: 0, running: 0, successRate: 0 };
  }

  private getEmptyPerformanceMetrics(): PerformanceMetricsSummary {
    return { avgLatency: 0, p50Latency: 0, p95Latency: 0, p99Latency: 0, throughput: 0 };
  }

  private getEmptyCostMetrics(): CostMetricsSummary {
    return {
      total: 0,
      byCategory: { apiCalls: 0, llmTokens: 0, compute: 0, storage: 0 },
      trend: 0,
    };
  }
}

// Singleton instance
export const metricsAggregator = new MetricsAggregator();
