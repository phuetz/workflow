/**
 * Analytics Service
 * Collects and processes workflow execution metrics
 */

import { EventEmitter } from 'events';
import { logger } from '../../services/SimpleLogger';
import { intervalManager } from '../../utils/SimpleIntervalManager';
import { analyticsPersistence } from '../../services/AnalyticsPersistence';

interface MetricEvent {
  type: 'workflow_start' | 'workflow_complete' | 'workflow_error' | 'node_start' | 'node_complete' | 'node_error' | 'workflow_created' | 'workflow_updated' | 'workflow_deleted';
  timestamp: Date;
  workflowId: string;
  nodeId?: string;
  userId: string;
  duration?: number;
  error?: unknown;
  metadata?: Record<string, unknown>;
}

interface WorkflowMetrics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  nodeMetrics: Record<string, {
    executions: number;
    successes: number;
    failures: number;
    averageTime: number;
  }>;
  errorDistribution: Record<string, number>;
  executionsByHour: number[];
  executionsByDay: Record<string, number>;
}

interface UserMetrics {
  userId: string;
  workflowsCreated: number;
  workflowsExecuted: number;
  totalExecutions: number;
  favoriteNodes: Array<{ nodeType: string; count: number }>;
  activityScore: number;
  lastActive: Date;
}

interface ScheduleAnalyticsData {
  metrics: {
    totalExecutions: number;
    reliability: number;
    averageDuration: number;
    onTimePercentage: number;
  };
  patterns: {
    failurePatterns: Array<{
      description: string;
      occurrences: number;
      lastOccurrence: Date;
      recommendations: string[];
    }>;
    peakHours: number[];
    successTrend: string;
  };
  predictions: {
    nextFailureRisk: number;
    estimatedNextDuration: number;
    resourceRequirements: {
      cpu: number;
      memory: number;
    };
  };
}

export class AnalyticsService extends EventEmitter {
  private metrics: Map<string, WorkflowMetrics> = new Map();
  private userMetrics: Map<string, UserMetrics> = new Map();
  private recentEvents: MetricEvent[] = [];
  private maxEventHistory = 10000;
  
  constructor() {
    super();
    this.setupPeriodicCleanup();
  }
  
  /**
   * Track a metric event
   */
  trackEvent(event: MetricEvent): void {
    // Store recent events
    this.recentEvents.push(event);
    if (this.recentEvents.length > this.maxEventHistory) {
      this.recentEvents = this.recentEvents.slice(-this.maxEventHistory);
    }
    
    // Update workflow metrics
    this.updateWorkflowMetrics(event);
    
    // Update user metrics
    this.updateUserMetrics(event);
    
    // Emit event for real-time dashboards
    this.emit('metric', event);
    
    // Persist to time-series database
    this.persistMetric(event);
  }
  
  /**
   * Update workflow-specific metrics
   */
  private updateWorkflowMetrics(event: MetricEvent): void {
    let metrics = this.metrics.get(event.workflowId);
    if (!metrics) {
      metrics = this.initializeWorkflowMetrics();
      this.metrics.set(event.workflowId, metrics);
    }

    const hour = event.timestamp.getHours();
    const day = event.timestamp.toISOString().split('T')[0];

    switch (event.type) {
      case 'workflow_start':
        metrics.totalExecutions++;
        metrics.executionsByHour[hour]++;
        metrics.executionsByDay[day] = (metrics.executionsByDay[day] || 0) + 1;
        break;
        
      case 'workflow_complete':
        metrics.successfulExecutions++;
        if (event.duration) {
          // Update average execution time
          const totalTime = metrics.averageExecutionTime * (metrics.successfulExecutions - 1) + event.duration;
          metrics.averageExecutionTime = totalTime / metrics.successfulExecutions;
        }
        break;
        
      case 'workflow_error': {
        metrics.failedExecutions++;
        const errorType = (event.error && typeof event.error === 'object' && 'type' in event.error)
          ? String(event.error.type)
          : 'unknown';
        metrics.errorDistribution[errorType] = (metrics.errorDistribution[errorType] || 0) + 1;
        break;
      }
        
      case 'node_complete':
        if (event.nodeId) {
          const nodeMetric = metrics.nodeMetrics[event.nodeId] || {
            executions: 0,
            successes: 0,
            failures: 0,
            averageTime: 0
          };
          nodeMetric.executions++;
          nodeMetric.successes++;
          if (event.duration) {
            const totalTime = nodeMetric.averageTime * (nodeMetric.successes - 1) + event.duration;
            nodeMetric.averageTime = totalTime / nodeMetric.successes;
          }
          metrics.nodeMetrics[event.nodeId] = nodeMetric;
        }
        break;
        
      case 'node_error':
        if (event.nodeId) {
          const nodeMetric = metrics.nodeMetrics[event.nodeId] || {
            executions: 0,
            successes: 0,
            failures: 0,
            averageTime: 0
          };
          nodeMetric.executions++;
          nodeMetric.failures++;
          metrics.nodeMetrics[event.nodeId] = nodeMetric;
        }
        break;
        
      case 'workflow_deleted':
        // Archive metrics before deletion
        this.archiveWorkflowMetrics(event.workflowId, metrics);
        
        // Emit event for external systems
        this.emit('workflow_metrics_archived', {
          workflowId: event.workflowId,
          metrics: metrics,
          deletedAt: event.timestamp,
          userId: event.userId
        });
        
        // Remove from active metrics
        this.metrics.delete(event.workflowId);
        
        logger.info('Workflow metrics archived and removed', { 
          workflowId: event.workflowId,
          totalExecutions: metrics.totalExecutions,
          successRate: metrics.totalExecutions > 0 
            ? (metrics.successfulExecutions / metrics.totalExecutions * 100).toFixed(2) + '%'
            : '0%'
        });
        break;
    }
  }
  
  /**
   * Update user-specific metrics
   */
  private updateUserMetrics(event: MetricEvent): void {
    let userMetric = this.userMetrics.get(event.userId);
    if (!userMetric) {
      userMetric = {
        userId: event.userId,
        workflowsCreated: 0,
        workflowsExecuted: 0,
        totalExecutions: 0,
        favoriteNodes: [],
        activityScore: 0,
        lastActive: event.timestamp
      };
      this.userMetrics.set(event.userId, userMetric);
    }
    
    userMetric.lastActive = event.timestamp;
    
    if (event.type === 'workflow_start') {
      userMetric.totalExecutions++;
      userMetric.activityScore = this.calculateActivityScore(userMetric);
    }
    
    if (event.type === 'workflow_created') {
      userMetric.workflowsCreated++;
      userMetric.activityScore = this.calculateActivityScore(userMetric);
    }
    
    if (event.type === 'workflow_deleted') {
      // Track workflow deletion in metadata if needed
      if (event.metadata?.wasOwner) {
        userMetric.workflowsCreated = Math.max(0, userMetric.workflowsCreated - 1);
      }
    }
    
    // Update favorite nodes based on usage
    if (event.nodeId && event.metadata?.nodeType) {
      const nodeType = String(event.metadata.nodeType);
      const favorite = userMetric.favoriteNodes.find(f => f.nodeType === nodeType);
      if (favorite) {
        favorite.count++;
      } else {
        userMetric.favoriteNodes.push({ nodeType, count: 1 });
      }
      // Keep top 10 favorite nodes
      userMetric.favoriteNodes.sort((a, b) => b.count - a.count);
      userMetric.favoriteNodes = userMetric.favoriteNodes.slice(0, 10);
    }
  }
  
  /**
   * Get workflow metrics
   */
  getWorkflowMetrics(workflowId: string): WorkflowMetrics | null {
    return this.metrics.get(workflowId) || null;
  }
  
  /**
   * Get aggregated metrics for all workflows
   */
  getAggregatedMetrics(): WorkflowMetrics {
    const aggregated = this.initializeWorkflowMetrics();

    for (const metrics of Array.from(this.metrics.values())) {
      aggregated.totalExecutions += metrics.totalExecutions;
      aggregated.successfulExecutions += metrics.successfulExecutions;
      aggregated.failedExecutions += metrics.failedExecutions;

      // Aggregate hourly executions
      for (let i = 0; i < 24; i++) {
        aggregated.executionsByHour[i] += metrics.executionsByHour[i];
      }

      // Aggregate daily executions
      for (const [day, count] of Object.entries(metrics.executionsByDay)) {
        aggregated.executionsByDay[day] = (aggregated.executionsByDay[day] || 0) + (count as number);
      }

      // Aggregate error distribution
      for (const [error, count] of Object.entries(metrics.errorDistribution)) {
        aggregated.errorDistribution[error] = (aggregated.errorDistribution[error] || 0) + (count as number);
      }
    }

    // Calculate average execution time
    if (aggregated.successfulExecutions > 0) {
      let totalTime = 0;
      let totalSuccesses = 0;
      for (const metrics of Array.from(this.metrics.values())) {
        totalTime += metrics.averageExecutionTime * metrics.successfulExecutions;
        totalSuccesses += metrics.successfulExecutions;
      }
      aggregated.averageExecutionTime = totalTime / totalSuccesses;
    }

    return aggregated;
  }
  
  /**
   * Get user metrics
   */
  getUserMetrics(userId: string): UserMetrics | null {
    return this.userMetrics.get(userId) || null;
  }

  /**
   * Get user workflow ownership analytics
   */
  getUserWorkflowOwnership(userId: string): {
    ownedWorkflows: number;
    collaboratingWorkflows: number;
    workflowsByStatus: Record<string, number>;
    creationTrend: Array<{ date: string; count: number }>;
    executionStats: {
      totalExecutions: number;
      successfulExecutions: number;
      failedExecutions: number;
      averageExecutionTime: number;
    };
    mostActiveWorkflows: Array<{
      workflowId: string;
      executionCount: number;
      lastExecuted: Date;
    }>;
    nodeUsageStats: Array<{
      nodeType: string;
      count: number;
      category: string;
    }>;
  } {
    const userMetric = this.userMetrics.get(userId);

    // Get creation events for this user
    const creationEvents = this.recentEvents.filter(
      event => event.type === 'workflow_created' && event.userId === userId
    );

    const recentCreations = creationEvents.filter(event => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return event.timestamp >= thirtyDaysAgo;
    });

    // Process creation trend (last 30 days)
    const creationTrend: Record<string, number> = {};
    recentCreations.forEach(event => {
      const date = event.timestamp.toISOString().split('T')[0];
      creationTrend[date] = (creationTrend[date] || 0) + 1;
    });

    // Get execution stats for user's workflows
    const userExecutionEvents = this.recentEvents.filter(
      event => event.userId === userId &&
      (event.type === 'workflow_start' || event.type === 'workflow_complete' || event.type === 'workflow_error')
    );

    const workflowExecutionCounts: Record<string, number> = {};
    const workflowLastExecuted: Record<string, Date> = {};

    let totalExecutions = 0;
    let successfulExecutions = 0;
    let failedExecutions = 0;
    let totalExecutionTime = 0;

    userExecutionEvents.forEach(event => {
      if (event.type === 'workflow_start') {
        totalExecutions++;
        workflowExecutionCounts[event.workflowId] = (workflowExecutionCounts[event.workflowId] || 0) + 1;
        workflowLastExecuted[event.workflowId] = event.timestamp;
      } else if (event.type === 'workflow_complete') {
        successfulExecutions++;
        if (event.duration) {
          totalExecutionTime += event.duration;
        }
      } else if (event.type === 'workflow_error') {
        failedExecutions++;
      }
    });

    // Get most active workflows
    const mostActiveWorkflows = Object.entries(workflowExecutionCounts)
      .map(([workflowId, count]) => ({
        workflowId,
        executionCount: count,
        lastExecuted: workflowLastExecuted[workflowId]
      }))
      .sort((a, b) => b.executionCount - a.executionCount)
      .slice(0, 10);

    // Process workflow status distribution
    const workflowsByStatus: Record<string, number> = {};
    creationEvents.forEach(event => {
      const status = String(event.metadata?.status || 'draft');
      workflowsByStatus[status] = (workflowsByStatus[status] || 0) + 1;
    });

    // Process node usage statistics
    const nodeUsageStatsMap: Record<string, { count: number; category: string }> = {};
    const nodeEvents = this.recentEvents.filter(
      event => event.userId === userId &&
      (event.type === 'node_start' || event.type === 'node_complete') &&
      event.metadata?.nodeType
    );

    nodeEvents.forEach(event => {
      const nodeType = String(event.metadata?.nodeType || 'unknown');
      const category = String(event.metadata?.category || 'general');

      if (!nodeUsageStatsMap[nodeType]) {
        nodeUsageStatsMap[nodeType] = { count: 0, category };
      }
      nodeUsageStatsMap[nodeType].count++;
    });

    return {
      ownedWorkflows: userMetric?.workflowsCreated || 0,
      collaboratingWorkflows: 0, // Would need additional tracking for collaboration
      workflowsByStatus,
      creationTrend: Object.entries(creationTrend)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      executionStats: {
        totalExecutions,
        successfulExecutions,
        failedExecutions,
        averageExecutionTime: successfulExecutions > 0 ? totalExecutionTime / successfulExecutions : 0
      },
      mostActiveWorkflows,
      nodeUsageStats: Object.entries(nodeUsageStatsMap)
        .map(([nodeType, data]) => ({
          nodeType,
          count: data.count,
          category: data.category
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 15)
    };
  }

  /**
   * Get analytics for multiple users (admin function)
   */
  getUsersAnalytics(userIds: string[]): Record<string, {
    totalWorkflows: number;
    totalExecutions: number;
    successRate: number;
    activityScore: number;
    lastActive: Date;
    topNodeTypes: string[];
  }> {
    const results: Record<string, {
      totalWorkflows: number;
      totalExecutions: number;
      successRate: number;
      activityScore: number;
      lastActive: Date;
      topNodeTypes: string[];
    }> = {};

    userIds.forEach(userId => {
      const userMetric = this.userMetrics.get(userId);
      const ownership = this.getUserWorkflowOwnership(userId);

      if (userMetric) {
        results[userId] = {
          totalWorkflows: userMetric.workflowsCreated,
          totalExecutions: userMetric.totalExecutions,
          successRate: ownership.executionStats.totalExecutions > 0
            ? (ownership.executionStats.successfulExecutions / ownership.executionStats.totalExecutions) * 100
            : 0,
          activityScore: userMetric.activityScore,
          lastActive: userMetric.lastActive,
          topNodeTypes: userMetric.favoriteNodes.slice(0, 5).map(n => n.nodeType)
        };
      }
    });

    return results;
  }
  
  /**
   * Get recent events for real-time monitoring
   */
  getRecentEvents(limit: number = 100): MetricEvent[] {
    return this.recentEvents.slice(-limit);
  }
  
  /**
   * Generate analytics report
   */
  generateReport(startDate: Date, endDate: Date): unknown {
    const filteredEvents = this.recentEvents.filter(
      event => event.timestamp >= startDate && event.timestamp <= endDate
    );

    const report = {
      period: { start: startDate, end: endDate },
      summary: {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        uniqueWorkflows: new Set<string>(),
        uniqueUsers: new Set<string>(),
        averageExecutionTime: 0
      },
      topWorkflows: new Map<string, number>(),
      topUsers: new Map<string, number>(),
      errorTrends: new Map<string, number>(),
      performanceMetrics: {
        p50: 0,
        p95: 0,
        p99: 0
      }
    };

    const executionTimes: number[] = [];

    for (const event of filteredEvents) {
      switch (event.type) {
        case 'workflow_start': {
          report.summary.totalExecutions++;
          report.summary.uniqueWorkflows.add(event.workflowId);
          report.summary.uniqueUsers.add(event.userId);

          // Track top workflows
          const workflowCount = report.topWorkflows.get(event.workflowId) || 0;
          report.topWorkflows.set(event.workflowId, workflowCount + 1);

          // Track top users
          const userCount = report.topUsers.get(event.userId) || 0;
          report.topUsers.set(event.userId, userCount + 1);
          break;
        }
          
        case 'workflow_complete':
          report.summary.successfulExecutions++;
          if (event.duration) {
            executionTimes.push(event.duration);
          }
          break;
          
        case 'workflow_error': {
          report.summary.failedExecutions++;
          const errorType = (event.error && typeof event.error === 'object' && 'type' in event.error)
            ? String(event.error.type)
            : 'unknown';
          const errorCount = report.errorTrends.get(errorType) || 0;
          report.errorTrends.set(errorType, errorCount + 1);
          break;
        }
      }
    }
    
    // Calculate percentiles
    if (executionTimes.length > 0) {
      executionTimes.sort((a, b) => a - b);
      report.performanceMetrics.p50 = this.percentile(executionTimes, 50);
      report.performanceMetrics.p95 = this.percentile(executionTimes, 95);
      report.performanceMetrics.p99 = this.percentile(executionTimes, 99);
      report.summary.averageExecutionTime = executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length;
    }
    
    // Convert sets and maps to serializable format
    return {
      ...report,
      summary: {
        ...report.summary,
        uniqueWorkflows: report.summary.uniqueWorkflows.size,
        uniqueUsers: report.summary.uniqueUsers.size
      },
      topWorkflows: Array.from(report.topWorkflows.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10),
      topUsers: Array.from(report.topUsers.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10),
      errorTrends: Array.from(report.errorTrends.entries())
    };
  }
  
  /**
   * Initialize empty workflow metrics
   */
  private initializeWorkflowMetrics(): WorkflowMetrics {
    return {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageExecutionTime: 0,
      nodeMetrics: {},
      errorDistribution: {},
      executionsByHour: new Array(24).fill(0),
      executionsByDay: {}
    };
  }
  
  /**
   * Calculate activity score for a user
   */
  private calculateActivityScore(userMetric: UserMetrics): number {
    const daysSinceLastActive = Math.floor((Date.now() - userMetric.lastActive.getTime()) / (1000 * 60 * 60 * 24));
    const recencyScore = Math.max(0, 100 - daysSinceLastActive * 2);
    const frequencyScore = Math.min(100, userMetric.totalExecutions);
    const diversityScore = Math.min(100, userMetric.favoriteNodes.length * 10);

    return Math.round((recencyScore + frequencyScore + diversityScore) / 3);
  }
  
  /**
   * Calculate percentile
   */
  private percentile(arr: number[], p: number): number {
    const index = (p / 100) * (arr.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    if (lower === upper) {
      return arr[lower];
    }

    return arr[lower] * (1 - weight) + arr[upper] * weight;
  }
  
  /**
   * Archive workflow metrics before deletion
   */
  private archiveWorkflowMetrics(workflowId: string, metrics: WorkflowMetrics): void {
    try {
      // Persist to time-series database with special archive tag
      analyticsPersistence.writeMetric(
        'workflow_archive',
        {
          totalExecutions: metrics.totalExecutions,
          successfulExecutions: metrics.successfulExecutions,
          failedExecutions: metrics.failedExecutions,
          averageExecutionTime: metrics.averageExecutionTime,
          nodeCount: Object.keys(metrics.nodeMetrics).length,
          errorCount: Object.values(metrics.errorDistribution).reduce((a, b) => a + b, 0)
        },
        {
          workflowId,
          archiveType: 'deletion',
          environment: process.env.NODE_ENV || 'development'
        },
        new Date()
      );

      // Store detailed metrics in a separate measurement for historical analysis
      Object.entries(metrics.nodeMetrics).forEach(([nodeId, nodeMetric]) => {
        analyticsPersistence.writeMetric(
          'workflow_node_archive',
          {
            executions: nodeMetric.executions,
            successes: nodeMetric.successes,
            failures: nodeMetric.failures,
            averageTime: nodeMetric.averageTime
          },
          {
            workflowId,
            nodeId,
            archiveType: 'deletion'
          },
          new Date()
        );
      });

      // Archive error distribution
      Object.entries(metrics.errorDistribution).forEach(([errorType, count]) => {
        analyticsPersistence.writeMetric(
          'workflow_error_archive',
          { count },
          {
            workflowId,
            errorType,
            archiveType: 'deletion'
          },
          new Date()
        );
      });

      logger.info('Workflow metrics archived successfully', {
        workflowId,
        totalMetrics: metrics.totalExecutions,
        nodeMetrics: Object.keys(metrics.nodeMetrics).length,
        errorTypes: Object.keys(metrics.errorDistribution).length
      });

    } catch (error) {
      logger.error('Failed to archive workflow metrics', {
        workflowId,
        error
      });
    }
  }

  /**
   * Persist metric to time-series database
   */
  private persistMetric(event: MetricEvent): void {
    try {
      // Prepare tags (dimensions) for the metric
      const tags: Record<string, string> = {
        eventType: event.type,
        workflowId: event.workflowId,
        userId: event.userId,
        environment: process.env.NODE_ENV || 'development'
      };

      // Add node ID tag if present
      if (event.nodeId) {
        tags.nodeId = event.nodeId;
      }

      // Add metadata tags if present
      if (event.metadata) {
        Object.entries(event.metadata).forEach(([key, value]) => {
          if (typeof value === 'string' || typeof value === 'number') {
            tags[`meta_${key}`] = String(value);
          }
        });
      }

      // Prepare fields (measurements) for the metric
      const fields: Record<string, number | string | boolean> = {
        count: 1,
        timestamp_ms: event.timestamp.getTime()
      };

      // Add duration if present
      if (event.duration !== undefined) {
        fields.duration = event.duration;
      }

      // Add error information if present
      if (event.error) {
        fields.hasError = true;
        fields.errorType = typeof event.error === 'object' && event.error !== null && 'type' in event.error
          ? String((event.error as any).type)
          : 'unknown';

        if (typeof event.error === 'object' && event.error !== null && 'message' in event.error) {
          fields.errorMessage = String((event.error as any).message).substring(0, 255); // Limit length
        }
      } else {
        fields.hasError = false;
      }

      // Write to persistence layer
      analyticsPersistence.writeMetric(
        'workflow_events',
        fields,
        tags,
        event.timestamp
      );

      // Also write specific metrics based on event type
      this.writeEventSpecificMetrics(event, tags);

    } catch (error) {
      logger.error('Failed to persist analytics metric', error);
    }
  }

  /**
   * Write event-specific metrics for better querying
   */
  private writeEventSpecificMetrics(event: MetricEvent, baseTags: Record<string, string>): void {
    try {
      switch (event.type) {
        case 'workflow_start':
          analyticsPersistence.writeMetric(
            'workflow_starts',
            { count: 1 },
            baseTags,
            event.timestamp
          );
          break;

        case 'workflow_complete':
          analyticsPersistence.writeMetric(
            'workflow_completions',
            { 
              count: 1,
              duration: event.duration || 0
            },
            baseTags,
            event.timestamp
          );
          break;

        case 'workflow_error':
          const errorTypeFromEvent = typeof event.error === 'object' && event.error !== null && 'type' in event.error
            ? String((event.error as any).type)
            : 'unknown';
          analyticsPersistence.writeMetric(
            'workflow_errors',
            {
              count: 1,
              errorType: errorTypeFromEvent
            },
            {
              ...baseTags,
              errorType: errorTypeFromEvent
            },
            event.timestamp
          );
          break;

        case 'node_start':
        case 'node_complete':
        case 'node_error':
          if (event.nodeId) {
            const measurement = `node_${event.type.split('_')[1]}s`;
            analyticsPersistence.writeMetric(
              measurement,
              {
                count: 1,
                duration: event.duration || 0,
                success: event.type === 'node_complete' ? 1 : 0
              },
              {
                ...baseTags,
                nodeId: event.nodeId,
                nodeType: String(event.metadata?.nodeType || 'unknown')
              },
              event.timestamp
            );
          }
          break;
      }
    } catch (error) {
      logger.error('Failed to write event-specific metrics', error);
    }
  }
  
  /**
   * Setup periodic cleanup to prevent memory leaks
   */
  private setupPeriodicCleanup(): void {
    intervalManager.create(
      'analytics_cleanup',
      () => {
        try {
          const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          const oldEventCount = this.recentEvents.length;

          // Clean up old events
          this.recentEvents = this.recentEvents.filter(
            event => event.timestamp > oneDayAgo
          );

          // Clean up metrics for workflows that haven't been active in 7 days
          const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          let cleanedWorkflows = 0;

          for (const [workflowId] of Array.from(this.metrics.entries())) {
            // Check if workflow has any recent activity
            const hasRecentActivity = this.recentEvents.some(
              event => event.workflowId === workflowId && event.timestamp > sevenDaysAgo
            );

            if (!hasRecentActivity) {
              this.metrics.delete(workflowId);
              cleanedWorkflows++;
            }
          }

          // Clean up user metrics for inactive users (30 days)
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          let cleanedUsers = 0;

          for (const [userId, userMetric] of Array.from(this.userMetrics.entries())) {
            if (userMetric.lastActive < thirtyDaysAgo) {
              this.userMetrics.delete(userId);
              cleanedUsers++;
            }
          }
          
          // Log cleanup results
          if (oldEventCount > this.recentEvents.length || cleanedWorkflows > 0 || cleanedUsers > 0) {
            logger.info('Analytics cleanup completed', {
              eventsRemoved: oldEventCount - this.recentEvents.length,
              workflowsRemoved: cleanedWorkflows,
              usersRemoved: cleanedUsers,
              remainingEvents: this.recentEvents.length,
              remainingWorkflows: this.metrics.size,
              remainingUsers: this.userMetrics.size
            });
          }
        } catch (error) {
          logger.error('Analytics cleanup failed', error);
        }
      },
      60 * 60 * 1000, // Run every hour
      'analytics'
    );
  }

  /**
   * Retrieve archived workflow metrics
   */
  async getArchivedWorkflowMetrics(
    workflowId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      includeNodeMetrics?: boolean;
      includeErrorDistribution?: boolean;
    }
  ): Promise<{
    metrics: WorkflowMetrics | null;
    archivedAt: Date | null;
    nodeMetrics?: Record<string, unknown>;
    errorDistribution?: Record<string, number>;
  }> {
    try {
      const archivedData = await analyticsPersistence.queryMetrics({
        measurement: 'workflow_archive',
        filters: {
          workflowId
        },
        timeRange: {
          start: options?.startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Default 90 days
          end: options?.endDate || new Date()
        },
        orderBy: 'time',
        order: 'desc',
        limit: 1
      });

      if (!archivedData || archivedData.length === 0) {
        logger.info('No archived metrics found for workflow', { workflowId });
        return {
          metrics: null,
          archivedAt: null
        };
      }

      const firstRecord = archivedData[0] as any;
      const metrics: WorkflowMetrics = {
        totalExecutions: firstRecord.fields.totalExecutions,
        successfulExecutions: firstRecord.fields.successfulExecutions,
        failedExecutions: firstRecord.fields.failedExecutions,
        averageExecutionTime: firstRecord.fields.averageExecutionTime,
        nodeMetrics: {},
        errorDistribution: {},
        executionsByHour: new Array(24).fill(0),
        executionsByDay: {}
      };

      const response: {
        metrics: WorkflowMetrics;
        archivedAt: Date;
        nodeMetrics?: Record<string, unknown>;
        errorDistribution?: Record<string, number>;
      } = {
        metrics,
        archivedAt: new Date(firstRecord.time)
      };

      // Retrieve node metrics if requested
      if (options?.includeNodeMetrics) {
        const nodeMetricsResult = await analyticsPersistence.queryMetrics({
          measurement: 'workflow_node_archive',
          filters: {
            workflowId
          },
          timeRange: {
            start: options?.startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
            end: options?.endDate || new Date()
          }
        });

        const nodeMetrics: Record<string, {
          executions: number;
          successes: number;
          failures: number;
          averageTime: number;
        }> = {};
        nodeMetricsResult.forEach((record: any) => {
          const nodeId = String(record.tags.nodeId);
          nodeMetrics[nodeId] = {
            executions: record.fields.executions,
            successes: record.fields.successes,
            failures: record.fields.failures,
            averageTime: record.fields.averageTime
          };
        });

        response.nodeMetrics = nodeMetrics;
        metrics.nodeMetrics = nodeMetrics as any;
      }

      // Retrieve error distribution if requested
      if (options?.includeErrorDistribution) {
        const errorResult = await analyticsPersistence.queryMetrics({
          measurement: 'workflow_error_archive',
          filters: {
            workflowId
          },
          timeRange: {
            start: options?.startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
            end: options?.endDate || new Date()
          }
        });

        const errorDistribution: Record<string, number> = {};
        errorResult.forEach((record: any) => {
          const errorType = record.tags.errorType;
          errorDistribution[errorType] = record.fields.count;
        });
        
        response.errorDistribution = errorDistribution;
        metrics.errorDistribution = errorDistribution;
      }

      logger.info('Retrieved archived workflow metrics', {
        workflowId,
        archivedAt: response.archivedAt,
        nodeMetricsCount: Object.keys(response.nodeMetrics || {}).length,
        errorTypesCount: Object.keys(response.errorDistribution || {}).length
      });

      return response;
    } catch (error) {
      logger.error('Failed to retrieve archived workflow metrics', {
        workflowId,
        error
      });
      return {
        metrics: null,
        archivedAt: null
      };
    }
  }

  /**
   * Get schedule analytics for scheduling dashboard
   */
  getScheduleAnalytics(params: {
    scheduleId: string;
    startDate: Date;
    endDate: Date;
  }): ScheduleAnalyticsData {
    // Return mock analytics data for now
    // This can be extended to calculate from actual execution data
    const { scheduleId } = params;

    // Get executions for this schedule from recent events
    const scheduleEvents = this.recentEvents.filter(
      event => event.metadata?.scheduleId === scheduleId
    );

    const totalExecutions = scheduleEvents.filter(e => e.type === 'workflow_start').length;
    const successfulExecutions = scheduleEvents.filter(e => e.type === 'workflow_complete').length;
    const failedExecutions = scheduleEvents.filter(e => e.type === 'workflow_error').length;

    // Calculate average duration from complete events
    const completeEvents = scheduleEvents.filter(e => e.type === 'workflow_complete' && e.duration);
    const avgDuration = completeEvents.length > 0
      ? completeEvents.reduce((sum, e) => sum + (e.duration || 0), 0) / completeEvents.length
      : 0;

    return {
      metrics: {
        totalExecutions,
        reliability: totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 100,
        averageDuration: avgDuration,
        onTimePercentage: 95 // Mock value, would need actual schedule time comparison
      },
      patterns: {
        failurePatterns: [],
        peakHours: [9, 10, 14, 15], // Mock peak hours
        successTrend: 'stable'
      },
      predictions: {
        nextFailureRisk: failedExecutions > 0 ? Math.min(50, (failedExecutions / totalExecutions) * 100) : 5,
        estimatedNextDuration: avgDuration || 5000,
        resourceRequirements: {
          cpu: 20,
          memory: 128 * 1024 * 1024 // 128MB
        }
      }
    };
  }

  /**
   * Get all archived workflows for a user
   */
  async getArchivedWorkflowsList(
    userId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    }
  ): Promise<Array<{
    workflowId: string;
    archivedAt: Date;
    totalExecutions: number;
    successRate: number;
  }>> {
    try {
      const result = await analyticsPersistence.queryMetrics({
        measurement: 'workflow_archive',
        filters: {
          environment: process.env.NODE_ENV || 'development'
        },
        timeRange: {
          start: options?.startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
          end: options?.endDate || new Date()
        },
        orderBy: 'time',
        order: 'desc',
        limit: options?.limit || 100
      });

      const archivedWorkflows = result
        .filter(() => {
          // Filter by userId if the analytics persistence supports it
          // Otherwise, this would need to be cross-referenced with the workflow repository
          return true; // Placeholder - actual implementation would filter by user
        })
        .map((record: any) => {
          return {
            workflowId: record.tags.workflowId,
            archivedAt: new Date(record.time),
            totalExecutions: record.fields.totalExecutions,
            successRate: record.fields.totalExecutions > 0
              ? (record.fields.successfulExecutions / record.fields.totalExecutions) * 100
              : 0
          };
        });

      logger.info('Retrieved archived workflows list', {
        userId,
        count: archivedWorkflows.length
      });

      return archivedWorkflows;
    } catch (error) {
      logger.error('Failed to retrieve archived workflows list', {
        userId,
        error
      });
      return [];
    }
  }

  /**
   * Cleanup resources and stop intervals
   */
  destroy(): void {
    // Clear the managed interval
    intervalManager.clear('analytics_cleanup');
    
    // Clear all data
    this.metrics.clear();
    this.userMetrics.clear();
    this.recentEvents = [];
    
    // Remove all event listeners
    this.removeAllListeners();
    
    logger.info('AnalyticsService destroyed and cleaned up');
  }
}

// Singleton instance
export const analyticsService = new AnalyticsService();