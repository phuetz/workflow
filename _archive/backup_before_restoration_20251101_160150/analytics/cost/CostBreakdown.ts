/**
 * Cost Breakdown
 * Analyze costs by workflow, node type, and time period
 */

import type {
  ExecutionMetrics,
  DateRange,
  TimeInterval,
  CostBreakdownItem,
} from '../../types/advanced-analytics';
import { costCalculator } from './CostCalculator';

export interface WorkflowCostBreakdown {
  workflowId: string;
  workflowName: string;
  totalCost: number;
  executionCount: number;
  avgCostPerExecution: number;
  byCategory: Record<string, number>;
  topExpensiveExecutions: Array<{
    executionId: string;
    cost: number;
    timestamp: Date;
  }>;
  trend: number; // percentage change
}

export interface NodeTypeCostBreakdown {
  nodeType: string;
  totalCost: number;
  executionCount: number;
  avgCostPerExecution: number;
  byCategory: Record<string, number>;
  topExpensiveNodes: Array<{
    nodeId: string;
    workflowId: string;
    cost: number;
  }>;
}

export interface TimePeriodCostBreakdown {
  period: DateRange;
  interval: TimeInterval;
  totalCost: number;
  byWorkflow: Record<string, number>;
  byNodeType: Record<string, number>;
  byCategory: Record<string, number>;
  timeSeries: Array<{
    timestamp: Date;
    cost: number;
  }>;
}

export class CostBreakdown {
  private executionCosts: Map<string, ExecutionMetrics> = new Map();

  /**
   * Store execution metrics for cost analysis
   */
  storeExecutionMetrics(metrics: ExecutionMetrics): void {
    this.executionCosts.set(metrics.executionId, metrics);
  }

  /**
   * Get cost breakdown by workflow
   */
  getWorkflowCostBreakdown(
    workflowId: string,
    dateRange: DateRange
  ): WorkflowCostBreakdown {
    const executions = this.getExecutionsInRange(workflowId, dateRange);

    let totalCost = 0;
    const byCategory: Record<string, number> = {};
    const expensiveExecutions: Array<{
      executionId: string;
      cost: number;
      timestamp: Date;
    }> = [];

    executions.forEach(metrics => {
      const cost = costCalculator.calculateExecutionCost(metrics);
      totalCost += cost.total;

      // Aggregate by category
      cost.breakdown.forEach(item => {
        const category = item.category;
        byCategory[category] = (byCategory[category] || 0) + item.totalCost;
      });

      expensiveExecutions.push({
        executionId: metrics.executionId,
        cost: cost.total,
        timestamp: metrics.startTime,
      });
    });

    // Sort and limit to top 10 expensive executions
    expensiveExecutions.sort((a, b) => b.cost - a.cost);
    const topExpensiveExecutions = expensiveExecutions.slice(0, 10);

    const avgCostPerExecution =
      executions.length > 0 ? totalCost / executions.length : 0;

    // Calculate trend (compare with previous period)
    const trend = this.calculateCostTrend(workflowId, dateRange);

    return {
      workflowId,
      workflowName: 'Workflow Name', // Would be fetched from workflow store
      totalCost,
      executionCount: executions.length,
      avgCostPerExecution,
      byCategory,
      topExpensiveExecutions,
      trend,
    };
  }

  /**
   * Get cost breakdown by node type
   */
  getNodeTypeCostBreakdown(
    nodeType: string,
    dateRange: DateRange
  ): NodeTypeCostBreakdown {
    const executions = this.getExecutionsInRange(undefined, dateRange);

    let totalCost = 0;
    let executionCount = 0;
    const byCategory: Record<string, number> = {};
    const expensiveNodes: Array<{
      nodeId: string;
      workflowId: string;
      cost: number;
    }> = [];

    executions.forEach(metrics => {
      metrics.nodeExecutions
        .filter(node => node.nodeType === nodeType)
        .forEach(node => {
          executionCount++;
          const cost = costCalculator.calculateNodeCost(node);
          totalCost += cost.total;

          // Aggregate by category
          cost.breakdown.forEach(item => {
            const category = item.category;
            byCategory[category] = (byCategory[category] || 0) + item.totalCost;
          });

          expensiveNodes.push({
            nodeId: node.nodeId,
            workflowId: metrics.workflowId,
            cost: cost.total,
          });
        });
    });

    // Sort and limit to top 10 expensive nodes
    expensiveNodes.sort((a, b) => b.cost - a.cost);
    const topExpensiveNodes = expensiveNodes.slice(0, 10);

    const avgCostPerExecution =
      executionCount > 0 ? totalCost / executionCount : 0;

    return {
      nodeType,
      totalCost,
      executionCount,
      avgCostPerExecution,
      byCategory,
      topExpensiveNodes,
    };
  }

  /**
   * Get cost breakdown by time period
   */
  getTimePeriodCostBreakdown(
    dateRange: DateRange,
    interval: TimeInterval = '1d'
  ): TimePeriodCostBreakdown {
    const executions = this.getExecutionsInRange(undefined, dateRange);

    let totalCost = 0;
    const byWorkflow: Record<string, number> = {};
    const byNodeType: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    const timeSeriesMap = new Map<number, number>();

    executions.forEach(metrics => {
      const cost = costCalculator.calculateExecutionCost(metrics);
      totalCost += cost.total;

      // By workflow
      byWorkflow[metrics.workflowId] =
        (byWorkflow[metrics.workflowId] || 0) + cost.total;

      // By node type
      metrics.nodeExecutions.forEach(node => {
        const nodeCost = costCalculator.calculateNodeCost(node);
        byNodeType[node.nodeType] =
          (byNodeType[node.nodeType] || 0) + nodeCost.total;
      });

      // By category
      cost.breakdown.forEach(item => {
        byCategory[item.category] =
          (byCategory[item.category] || 0) + item.totalCost;
      });

      // Time series
      const bucket = this.getTimeBucket(metrics.startTime, interval);
      timeSeriesMap.set(bucket, (timeSeriesMap.get(bucket) || 0) + cost.total);
    });

    // Convert time series map to array
    const timeSeries = Array.from(timeSeriesMap.entries())
      .map(([timestamp, cost]) => ({
        timestamp: new Date(timestamp),
        cost,
      }))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return {
      period: dateRange,
      interval,
      totalCost,
      byWorkflow,
      byNodeType,
      byCategory,
      timeSeries,
    };
  }

  /**
   * Get most expensive workflows
   */
  getMostExpensiveWorkflows(
    dateRange: DateRange,
    limit: number = 10
  ): Array<{
    workflowId: string;
    totalCost: number;
    executionCount: number;
    avgCost: number;
  }> {
    const executions = this.getExecutionsInRange(undefined, dateRange);
    const workflowCosts = new Map<
      string,
      { totalCost: number; count: number }
    >();

    executions.forEach(metrics => {
      const cost = costCalculator.calculateExecutionCost(metrics);
      const current = workflowCosts.get(metrics.workflowId) || {
        totalCost: 0,
        count: 0,
      };

      workflowCosts.set(metrics.workflowId, {
        totalCost: current.totalCost + cost.total,
        count: current.count + 1,
      });
    });

    return Array.from(workflowCosts.entries())
      .map(([workflowId, data]) => ({
        workflowId,
        totalCost: data.totalCost,
        executionCount: data.count,
        avgCost: data.totalCost / data.count,
      }))
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, limit);
  }

  /**
   * Get most expensive node types
   */
  getMostExpensiveNodeTypes(
    dateRange: DateRange,
    limit: number = 10
  ): Array<{
    nodeType: string;
    totalCost: number;
    executionCount: number;
    avgCost: number;
  }> {
    const executions = this.getExecutionsInRange(undefined, dateRange);
    const nodeTypeCosts = new Map<
      string,
      { totalCost: number; count: number }
    >();

    executions.forEach(metrics => {
      metrics.nodeExecutions.forEach(node => {
        const cost = costCalculator.calculateNodeCost(node);
        const current = nodeTypeCosts.get(node.nodeType) || {
          totalCost: 0,
          count: 0,
        };

        nodeTypeCosts.set(node.nodeType, {
          totalCost: current.totalCost + cost.total,
          count: current.count + 1,
        });
      });
    });

    return Array.from(nodeTypeCosts.entries())
      .map(([nodeType, data]) => ({
        nodeType,
        totalCost: data.totalCost,
        executionCount: data.count,
        avgCost: data.totalCost / data.count,
      }))
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, limit);
  }

  /**
   * Get cost summary
   */
  getCostSummary(dateRange: DateRange): {
    totalCost: number;
    byCategory: Record<string, number>;
    avgCostPerExecution: number;
    mostExpensiveCategory: string;
    trend: number;
  } {
    const executions = this.getExecutionsInRange(undefined, dateRange);
    const byCategory: Record<string, number> = {};
    let totalCost = 0;

    executions.forEach(metrics => {
      const cost = costCalculator.calculateExecutionCost(metrics);
      totalCost += cost.total;

      cost.breakdown.forEach(item => {
        byCategory[item.category] =
          (byCategory[item.category] || 0) + item.totalCost;
      });
    });

    const avgCostPerExecution =
      executions.length > 0 ? totalCost / executions.length : 0;

    // Find most expensive category
    let mostExpensiveCategory = 'none';
    let maxCost = 0;
    Object.entries(byCategory).forEach(([category, cost]) => {
      if (cost > maxCost) {
        maxCost = cost;
        mostExpensiveCategory = category;
      }
    });

    // Calculate trend
    const trend = this.calculateCostTrend(undefined, dateRange);

    return {
      totalCost,
      byCategory,
      avgCostPerExecution,
      mostExpensiveCategory,
      trend,
    };
  }

  // Private methods

  private getExecutionsInRange(
    workflowId: string | undefined,
    dateRange: DateRange
  ): ExecutionMetrics[] {
    return Array.from(this.executionCosts.values()).filter(metrics => {
      const inRange =
        metrics.startTime >= dateRange.start &&
        metrics.startTime <= dateRange.end;
      const matchesWorkflow = !workflowId || metrics.workflowId === workflowId;
      return inRange && matchesWorkflow;
    });
  }

  private calculateCostTrend(
    workflowId: string | undefined,
    dateRange: DateRange
  ): number {
    const periodDuration = dateRange.end.getTime() - dateRange.start.getTime();

    // Get current period cost
    const currentCost = this.getTotalCost(workflowId, dateRange);

    // Get previous period cost
    const previousPeriod: DateRange = {
      start: new Date(dateRange.start.getTime() - periodDuration),
      end: dateRange.start,
    };
    const previousCost = this.getTotalCost(workflowId, previousPeriod);

    // Calculate percentage change
    if (previousCost === 0) {
      return currentCost > 0 ? 100 : 0;
    }

    return ((currentCost - previousCost) / previousCost) * 100;
  }

  private getTotalCost(
    workflowId: string | undefined,
    dateRange: DateRange
  ): number {
    const executions = this.getExecutionsInRange(workflowId, dateRange);
    return executions.reduce((total, metrics) => {
      const cost = costCalculator.calculateExecutionCost(metrics);
      return total + cost.total;
    }, 0);
  }

  private getTimeBucket(date: Date, interval: TimeInterval): number {
    const intervalMs = this.getIntervalMs(interval);
    return Math.floor(date.getTime() / intervalMs) * intervalMs;
  }

  private getIntervalMs(interval: TimeInterval): number {
    const intervals: Record<TimeInterval, number> = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
      '1w': 7 * 24 * 60 * 60 * 1000,
      '1M': 30 * 24 * 60 * 60 * 1000,
    };
    return intervals[interval];
  }
}

// Singleton instance
export const costBreakdown = new CostBreakdown();
