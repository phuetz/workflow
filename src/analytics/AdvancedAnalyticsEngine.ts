/**
 * Advanced Analytics Engine
 * Main orchestrator for the analytics system
 */

import type {
  ExecutionMetrics,
  AggregatedMetrics,
  WorkflowAnalytics,
  DateRange,
  TimeInterval,
  AnalyticsQuery,
  AnalyticsInsight,
  PerformanceAnomaly,
  NodePerformanceProfile,
  WorkflowHealthScore,
} from '../types/advanced-analytics';
import { metricsCollector } from '../services/metrics';
import { dataWarehouse } from './DataWarehouse';
import { aggregationService } from './AggregationService';
import { logger } from '../services/SimpleLogger';

export class AdvancedAnalyticsEngine {
  private initialized = false;
  private aggregationInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize the analytics engine
   */
  private initialize(): void {
    if (this.initialized) return;

    // Subscribe to metrics events
    metricsCollector.on('workflow.completed', event => {
      this.processWorkflowCompletion(event);
    });

    metricsCollector.on('workflow.failed', event => {
      this.processWorkflowFailure(event);
    });

    // Start background tasks
    this.startAggregation();
    this.startCleanup();

    this.initialized = true;
    logger.debug('Advanced Analytics Engine initialized');
  }

  /**
   * Track workflow execution
   */
  trackWorkflowExecution(
    workflowId: string,
    executionId: string,
    status: 'start' | 'complete' | 'failed',
    data?: {
      duration?: number;
      error?: string;
    }
  ): void {
    // Emit events that will be picked up by event listeners
    if (status === 'start') {
      metricsCollector.emit('workflow.started', {
        type: 'workflow.started' as const,
        timestamp: new Date(),
        data: { workflowId, executionId },
      });
    } else if (status === 'complete') {
      metricsCollector.emit('workflow.completed', {
        type: 'workflow.completed' as const,
        timestamp: new Date(),
        data: { workflowId, executionId, status: 'success', duration: data?.duration },
      });
    } else if (status === 'failed') {
      metricsCollector.emit('workflow.failed', {
        type: 'workflow.failed' as const,
        timestamp: new Date(),
        data: { workflowId, executionId, status: 'failed', error: data?.error },
      });
    }
  }

  /**
   * Track node execution
   */
  trackNodeExecution(
    executionId: string,
    nodeId: string,
    nodeType: string,
    status: 'start' | 'complete' | 'failed',
    data?: {
      apiCalls?: number;
      dataSize?: number;
      error?: string;
    }
  ): void {
    // Emit events that will be picked up by event listeners
    if (status === 'start') {
      metricsCollector.emit('node.started', {
        type: 'node.started' as const,
        timestamp: new Date(),
        data: { executionId, nodeId, nodeType },
      });
    } else {
      metricsCollector.emit('node.completed', {
        type: 'node.completed' as const,
        timestamp: new Date(),
        data: {
          executionId,
          nodeId,
          nodeType,
          status: status === 'complete' ? 'success' : 'failed',
          apiCalls: data?.apiCalls,
          dataSize: data?.dataSize,
          error: data?.error,
        },
      });
    }
  }

  /**
   * Get aggregated metrics
   */
  getAggregatedMetrics(
    dateRange?: DateRange,
    interval: TimeInterval = '1h'
  ): AggregatedMetrics {
    const range = dateRange || this.getDefaultDateRange();
    return aggregationService.getAggregatedMetrics(range, interval);
  }

  /**
   * Get workflow analytics
   */
  getWorkflowAnalytics(
    workflowId: string,
    dateRange?: DateRange
  ): WorkflowAnalytics | null {
    const range = dateRange || this.getDefaultDateRange();
    return aggregationService.getWorkflowAnalytics(workflowId, range);
  }

  /**
   * Query analytics data
   */
  query(query: AnalyticsQuery): unknown {
    const timeSeries = dataWarehouse.getTimeSeries(
      query.metric,
      query.dateRange,
      query.interval || '1h',
      query.aggregation || 'avg'
    );

    if (!timeSeries) return null;

    let dataPoints = timeSeries.dataPoints;

    // Apply filters
    if (query.filters) {
      dataPoints = this.applyFilters(dataPoints, query.filters);
    }

    // Apply limit
    if (query.limit) {
      dataPoints = dataPoints.slice(0, query.limit);
    }

    return {
      metric: query.metric,
      data: dataPoints,
      count: dataPoints.length,
    };
  }

  /**
   * Get insights
   */
  getInsights(dateRange?: DateRange): AnalyticsInsight[] {
    const range = dateRange || this.getDefaultDateRange();
    const insights: AnalyticsInsight[] = [];

    // Analyze performance
    insights.push(...this.analyzePerformance(range));

    // Analyze costs
    insights.push(...this.analyzeCosts(range));

    // Analyze reliability
    insights.push(...this.analyzeReliability(range));

    // Detect anomalies
    insights.push(...this.detectAnomalies(range));

    return insights.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  /**
   * Analyze performance
   */
  private analyzePerformance(dateRange: DateRange): AnalyticsInsight[] {
    const insights: AnalyticsInsight[] = [];

    // Get performance metrics
    const metrics = aggregationService.getAggregatedMetrics(dateRange);

    // Check for slow workflows
    if (metrics.metrics.performance.avgLatency > 30000) {
      insights.push({
        id: this.generateId(),
        type: 'performance',
        severity: 'warning',
        title: 'High Average Latency Detected',
        description: `Average workflow execution time is ${(metrics.metrics.performance.avgLatency / 1000).toFixed(2)}s, which is above the recommended threshold of 30s.`,
        impact: {
          metric: 'avg_latency',
          current: metrics.metrics.performance.avgLatency,
          potential: 15000,
          improvement: 50,
        },
        recommendations: [
          {
            action: 'Parallelize Independent Nodes',
            description: 'Identify nodes that can run in parallel and configure them accordingly.',
            effort: 'medium',
            impact: 'high',
            implementation: 'Use parallel execution branches in your workflow.',
          },
          {
            action: 'Optimize Database Queries',
            description: 'Review and optimize slow database queries.',
            effort: 'medium',
            impact: 'medium',
          },
        ],
        createdAt: new Date(),
      });
    }

    return insights;
  }

  /**
   * Analyze costs
   */
  private analyzeCosts(dateRange: DateRange): AnalyticsInsight[] {
    const insights: AnalyticsInsight[] = [];

    // Mock cost analysis - in production would analyze actual costs
    insights.push({
      id: this.generateId(),
      type: 'cost',
      severity: 'info',
      title: 'Potential Cost Optimization',
      description: 'Some workflows are using expensive LLM models where cheaper alternatives might work.',
      impact: {
        metric: 'monthly_cost',
        current: 100,
        potential: 50,
        improvement: 50,
        estimatedSavings: 50,
      },
      recommendations: [
        {
          action: 'Use GPT-3.5-Turbo Instead of GPT-4',
          description: 'For simple tasks, GPT-3.5-turbo can save up to 90% in cost.',
          effort: 'low',
          impact: 'high',
          implementation: 'Update LLM node configuration to use gpt-3.5-turbo model.',
        },
      ],
      createdAt: new Date(),
    });

    return insights;
  }

  /**
   * Analyze reliability
   */
  private analyzeReliability(dateRange: DateRange): AnalyticsInsight[] {
    const insights: AnalyticsInsight[] = [];

    const metrics = aggregationService.getAggregatedMetrics(dateRange);

    // Check for low success rate
    if (metrics.metrics.executions.successRate < 95) {
      insights.push({
        id: this.generateId(),
        type: 'reliability',
        severity: 'warning',
        title: 'Low Success Rate',
        description: `Workflow success rate is ${metrics.metrics.executions.successRate.toFixed(1)}%, below the recommended 95% threshold.`,
        impact: {
          metric: 'success_rate',
          current: metrics.metrics.executions.successRate,
          potential: 98,
          improvement: (98 - metrics.metrics.executions.successRate) / metrics.metrics.executions.successRate * 100,
        },
        recommendations: [
          {
            action: 'Add Retry Logic',
            description: 'Implement retry mechanisms for transient failures.',
            effort: 'low',
            impact: 'high',
            implementation: 'Add retry configuration to nodes that interact with external services.',
          },
          {
            action: 'Add Error Handling',
            description: 'Add proper error handling and fallback paths.',
            effort: 'medium',
            impact: 'high',
          },
        ],
        createdAt: new Date(),
      });
    }

    return insights;
  }

  /**
   * Detect anomalies
   */
  private detectAnomalies(dateRange: DateRange): AnalyticsInsight[] {
    const insights: AnalyticsInsight[] = [];

    // Get latency time series
    const latencySeries = dataWarehouse.getTimeSeries(
      'workflow.duration',
      dateRange,
      '1h',
      'avg'
    );

    if (latencySeries) {
      const values = latencySeries.dataPoints.map(dp => dp.value);
      const anomalies = aggregationService.detectAnomalies(values, 2);

      if (anomalies.length > 0) {
        insights.push({
          id: this.generateId(),
          type: 'anomaly',
          severity: 'warning',
          title: 'Performance Anomaly Detected',
          description: `Detected ${anomalies.length} unusual performance spikes in the selected period.`,
          impact: {
            metric: 'latency_anomalies',
            current: anomalies.length,
            potential: 0,
            improvement: 100,
          },
          recommendations: [
            {
              action: 'Investigate Performance Spikes',
              description: 'Review logs and metrics during anomaly periods to identify root cause.',
              effort: 'medium',
              impact: 'medium',
            },
          ],
          createdAt: new Date(),
        });
      }
    }

    return insights;
  }

  /**
   * Get node performance profiles
   */
  getNodePerformanceProfiles(): NodePerformanceProfile[] {
    // Mock implementation - in production would aggregate actual node data
    return [];
  }

  /**
   * Get workflow health score
   */
  getWorkflowHealthScore(workflowId: string): WorkflowHealthScore {
    // Mock implementation - in production would calculate actual health score
    return {
      workflowId,
      score: 85,
      factors: {
        reliability: 90,
        performance: 85,
        cost: 80,
        efficiency: 85,
      },
      issues: [],
    };
  }

  /**
   * Get performance anomalies
   */
  getPerformanceAnomalies(dateRange?: DateRange): PerformanceAnomaly[] {
    const range = dateRange || this.getDefaultDateRange();

    const latencySeries = dataWarehouse.getTimeSeries(
      'workflow.duration',
      range,
      '1h',
      'avg'
    );

    if (!latencySeries) return [];

    const values = latencySeries.dataPoints.map(dp => dp.value);
    const anomalies = aggregationService.detectAnomalies(values, 2);

    return anomalies.map(anomaly => ({
      id: this.generateId(),
      detectedAt: latencySeries.dataPoints[anomaly.index].timestamp,
      metric: 'workflow.duration',
      expected: aggregationService['calculateAverage'](values),
      actual: anomaly.value,
      deviation: anomaly.deviation * 100,
      severity: anomaly.deviation > 3 ? 'high' : anomaly.deviation > 2 ? 'medium' : 'low',
      possibleCauses: [
        'Increased load on external services',
        'Database performance degradation',
        'Network latency',
      ],
    }));
  }

  /**
   * Export analytics data
   */
  export(format: 'json' | 'csv'): string {
    const stats = dataWarehouse.getStatistics();
    const data = dataWarehouse.export();

    if (format === 'json') {
      return JSON.stringify(
        {
          exportedAt: new Date(),
          statistics: stats,
          data,
        },
        null,
        2
      );
    }

    // CSV format
    return 'Export to CSV not implemented yet';
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    collector: {
      current: ReturnType<typeof metricsCollector.getCurrentMetrics>;
      average: ReturnType<typeof metricsCollector.getAverageMetrics>;
    };
    warehouse: ReturnType<typeof dataWarehouse.getStatistics>;
  } {
    return {
      collector: {
        current: metricsCollector.getCurrentMetrics(),
        average: metricsCollector.getAverageMetrics(),
      },
      warehouse: dataWarehouse.getStatistics(),
    };
  }

  /**
   * Stop the engine
   */
  stop(): void {
    if (this.aggregationInterval) {
      clearInterval(this.aggregationInterval);
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    metricsCollector.stop();
    this.initialized = false;
  }

  // Private methods

  private processWorkflowCompletion(event: import('../types/advanced-analytics').AnalyticsEvent): void {
    // Process completion event
    dataWarehouse.processEvents([event]);
  }

  private processWorkflowFailure(event: import('../types/advanced-analytics').AnalyticsEvent): void {
    // Process failure event
    dataWarehouse.processEvents([event]);
  }

  private startAggregation(): void {
    // Pre-aggregate data every 5 minutes
    this.aggregationInterval = setInterval(() => {
      dataWarehouse.preAggregate();
    }, 5 * 60 * 1000);
  }

  private startCleanup(): void {
    // Cleanup old data every day
    this.cleanupInterval = setInterval(() => {
      dataWarehouse.cleanup();
      // MetricsCollector automatically cleans up metrics older than 1 hour
      // No additional cleanup needed
    }, 24 * 60 * 60 * 1000);
  }

  private getDefaultDateRange(): DateRange {
    const end = new Date();
    const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000); // Last 7 days
    return { start, end };
  }

  private applyFilters(
    dataPoints: import('../types/advanced-analytics').MetricDataPoint[],
    filters: import('../types/advanced-analytics').AnalyticsFilter[]
  ): import('../types/advanced-analytics').MetricDataPoint[] {
    return dataPoints.filter(dp => {
      return filters.every(filter => {
        const value = dp.metadata?.[filter.field] ?? dp.value;
        switch (filter.operator) {
          case 'eq':
            return value === filter.value;
          case 'ne':
            return value !== filter.value;
          case 'gt':
            return Number(value) > Number(filter.value);
          case 'lt':
            return Number(value) < Number(filter.value);
          case 'gte':
            return Number(value) >= Number(filter.value);
          case 'lte':
            return Number(value) <= Number(filter.value);
          case 'in':
            return Array.isArray(filter.value) && filter.value.includes(value);
          case 'nin':
            return Array.isArray(filter.value) && !filter.value.includes(value);
          default:
            return true;
        }
      });
    });
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton instance
export const analyticsEngine = new AdvancedAnalyticsEngine();
