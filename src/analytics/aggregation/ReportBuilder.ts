/**
 * Report Builder
 * Builds workflow analytics reports from execution data
 */

import type { DateRange, WorkflowAnalytics } from '../../types/advanced-analytics';
import { prisma } from '../../backend/database/prisma';
import { logger } from '../../services/SimpleLogger';
import { statisticsCalculator } from './StatisticsCalculator';
import { timeSeriesAggregator } from './TimeSeriesAggregator';
import type { ExecutionTrendData, WorkflowAnalyticsResponse } from './types';
import { getCostConfig } from './types';

export class ReportBuilder {
  /**
   * Build workflow analytics report from database
   */
  async buildWorkflowAnalyticsAsync(
    workflowId: string,
    dateRange: DateRange
  ): Promise<WorkflowAnalytics | null> {
    try {
      // Get workflow details
      const workflow = await prisma.workflow.findUnique({
        where: { id: workflowId },
        select: { id: true, name: true },
      });

      if (!workflow) {
        return null;
      }

      // Get all executions for this workflow in the date range
      const executions = await prisma.workflowExecution.findMany({
        where: {
          workflowId,
          startedAt: { gte: dateRange.start, lte: dateRange.end },
        },
        select: {
          id: true,
          status: true,
          duration: true,
          startedAt: true,
        },
        orderBy: { startedAt: 'asc' },
      });

      // Build execution statistics
      const executionStats = this.buildExecutionStats(executions);

      // Build performance metrics
      const performanceMetrics = this.buildPerformanceMetrics(executions);

      // Build cost metrics
      const costMetrics = await this.buildCostMetrics(workflowId, dateRange, executions);

      // Generate trends
      const trendData: ExecutionTrendData[] = executions.map(e => ({
        id: e.id,
        status: e.status,
        duration: e.duration,
        startedAt: e.startedAt,
      }));
      const trends = timeSeriesAggregator.generateWorkflowTrends(trendData, dateRange);

      return {
        workflowId,
        workflowName: workflow.name,
        period: dateRange,
        executions: executionStats,
        performance: performanceMetrics,
        cost: costMetrics,
        trends,
      };
    } catch (error) {
      logger.error('Failed to build workflow analytics:', error);
      return null;
    }
  }

  /**
   * Build workflow analytics (sync wrapper for backward compatibility)
   */
  buildWorkflowAnalytics(
    workflowId: string,
    dateRange: DateRange
  ): WorkflowAnalyticsResponse {
    return {
      workflowId,
      workflowName: 'Unknown Workflow',
      period: dateRange,
      executions: {
        total: 0,
        successful: 0,
        failed: 0,
        canceled: 0,
        successRate: 0,
      },
      performance: {
        avgDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        p50Duration: 0,
        p95Duration: 0,
        p99Duration: 0,
      },
      cost: {
        total: 0,
        average: 0,
        trend: 0,
      },
      trends: [],
    };
  }

  // Private helper methods

  private buildExecutionStats(
    executions: Array<{ id: string; status: string; duration: number | null; startedAt: Date }>
  ) {
    const total = executions.length;
    const successful = executions.filter(e => e.status === 'SUCCESS').length;
    const failed = executions.filter(e => e.status === 'FAILED').length;
    const canceled = executions.filter(e => e.status === 'CANCELLED').length;
    const successRate = total > 0 ? (successful / total) * 100 : 0;

    return { total, successful, failed, canceled, successRate };
  }

  private buildPerformanceMetrics(
    executions: Array<{ id: string; status: string; duration: number | null; startedAt: Date }>
  ) {
    const durations = executions
      .filter(e => e.duration !== null)
      .map(e => e.duration as number)
      .sort((a, b) => a - b);

    const avgDuration =
      durations.length > 0
        ? durations.reduce((sum, d) => sum + d, 0) / durations.length
        : 0;
    const minDuration = durations.length > 0 ? durations[0] : 0;
    const maxDuration = durations.length > 0 ? durations[durations.length - 1] : 0;
    const p50Duration = statisticsCalculator.calculatePercentile(durations, 50);
    const p95Duration = statisticsCalculator.calculatePercentile(durations, 95);
    const p99Duration = statisticsCalculator.calculatePercentile(durations, 99);

    return {
      avgDuration,
      minDuration,
      maxDuration,
      p50Duration,
      p95Duration,
      p99Duration,
    };
  }

  private async buildCostMetrics(
    workflowId: string,
    dateRange: DateRange,
    executions: Array<{ id: string; status: string; duration: number | null; startedAt: Date }>
  ) {
    const costConfig = getCostConfig();
    const durations = executions
      .filter(e => e.duration !== null)
      .map(e => e.duration as number);

    const totalDuration = durations.reduce((sum, d) => sum + d, 0);
    const totalCost = (totalDuration / 60000) * costConfig.costPerMinute;
    const averageCost = executions.length > 0 ? totalCost / executions.length : 0;

    // Calculate trend by comparing with previous period
    const periodDuration = dateRange.end.getTime() - dateRange.start.getTime();
    const previousStart = new Date(dateRange.start.getTime() - periodDuration);
    const previousEnd = new Date(dateRange.start.getTime());

    const previousExecutions = await prisma.workflowExecution.findMany({
      where: {
        workflowId,
        startedAt: { gte: previousStart, lte: previousEnd },
      },
      select: { duration: true },
    });

    const previousDuration = previousExecutions.reduce((sum, e) => sum + (e.duration || 0), 0);
    const previousCost = (previousDuration / 60000) * costConfig.costPerMinute;
    const trend = previousCost > 0 ? ((totalCost - previousCost) / previousCost) * 100 : 0;

    return { total: totalCost, average: averageCost, trend };
  }
}

// Singleton instance
export const reportBuilder = new ReportBuilder();
