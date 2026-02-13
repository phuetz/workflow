/**
 * Advanced Analytics & Business Intelligence Service
 * Comprehensive analytics, reporting, and business intelligence platform
 */

import { EventEmitter } from 'events';
import { logger } from './LoggingService';
import { cachingService } from './CachingService';
import { monitoringService } from './MonitoringService';

interface AnalyticsEvent {
  id: string;
  type: string;
  category: string;
  action: string;
  label?: string;
  value?: number;
  userId?: string;
  sessionId?: string;
  workflowId?: string;
  nodeId?: string;
  timestamp: Date;
  properties: Record<string, unknown>;
  metadata: {
    userAgent?: string;
    ip?: string;
    country?: string;
    device?: string;
    referrer?: string;
  };
}

interface MetricDefinition {
  id: string;
  name: string;
  description: string;
  type: 'counter' | 'gauge' | 'histogram' | 'distribution';
  aggregation: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'percentile';
  dimensions: string[];
  filters?: Record<string, unknown>;
  calculation?: string; // Custom calculation formula
}

interface Dashboard {
  id: string;
  name: string;
  description: string;
  category: 'executive' | 'operational' | 'user' | 'technical';
  widgets: Widget[];
  filters: DashboardFilter[];
  permissions: {
    viewers: string[];
    editors: string[];
    public: boolean;
  };
  refreshInterval: number;
  created: Date;
  updated: Date;
}

interface Widget {
  id: string;
  type: 'chart' | 'table' | 'metric' | 'map' | 'funnel' | 'heatmap';
  title: string;
  position: { x: number; y: number; width: number; height: number };
  config: WidgetConfig;
  dataSource: DataSource;
  filters: Record<string, unknown>;
}

interface WidgetConfig {
  chartType?: 'line' | 'bar' | 'pie' | 'area' | 'scatter' | 'gauge';
  xAxis?: string;
  yAxis?: string | string[];
  groupBy?: string;
  aggregation?: string;
  timeRange?: string;
  limit?: number;
  colors?: string[];
  showLegend?: boolean;
  showTooltip?: boolean;
}

interface DataSource {
  type: 'events' | 'metrics' | 'custom';
  query: string;
  parameters: Record<string, unknown>;
  cacheKey?: string;
  cacheTtl?: number;
}

interface DashboardFilter {
  id: string;
  name: string;
  type: 'select' | 'multiselect' | 'date' | 'daterange' | 'text' | 'number';
  options?: Array<{ label: string; value: unknown }>;
  defaultValue?: unknown;
  required?: boolean;
}

interface Report {
  id: string;
  name: string;
  description: string;
  type: 'scheduled' | 'ad-hoc' | 'alert';
  schedule?: {
    frequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
    time: string;
    days?: number[];
    timezone: string;
  };
  recipients: string[];
  format: 'pdf' | 'excel' | 'csv' | 'json';
  dashboardId?: string;
  queries: ReportQuery[];
  created: Date;
  lastRun?: Date;
  nextRun?: Date;
}

interface ReportQuery {
  name: string;
  query: string;
  parameters: Record<string, unknown>;
}

interface AnalyticsQuery {
  metrics: string[];
  dimensions: string[];
  filters: QueryFilter[];
  timeRange: TimeRange;
  groupBy?: string[];
  orderBy?: Array<{ field: string; direction: 'asc' | 'desc' }>;
  limit?: number;
  offset?: number;
}

interface QueryFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains' | 'regex';
  value: unknown;
}

interface TimeRange {
  start: Date;
  end: Date;
  granularity?: 'minute' | 'hour' | 'day' | 'week' | 'month';
}

interface AnalyticsResult {
  data: Array<Record<string, unknown>>;
  metadata: {
    total: number;
    filtered: number;
    timeRange: TimeRange;
    executionTime: number;
    cached: boolean;
  };
  aggregations?: Record<string, unknown>;
}

interface Funnel {
  id: string;
  name: string;
  description: string;
  steps: FunnelStep[];
  timeWindow: number; // milliseconds
  filters: QueryFilter[];
}

interface FunnelStep {
  name: string;
  eventType: string;
  conditions: QueryFilter[];
  required: boolean;
}

interface FunnelResult {
  totalUsers: number;
  steps: Array<{
    name: string;
    users: number;
    percentage: number;
    dropoff: number;
    dropoffPercentage: number;
  }>;
  conversionRate: number;
}

interface Cohort {
  id: string;
  name: string;
  definition: {
    eventType: string;
    conditions: QueryFilter[];
    timeRange: TimeRange;
  };
  analysis: {
    metric: string;
    periods: number;
    periodType: 'day' | 'week' | 'month';
  };
}

interface CohortResult {
  cohorts: Array<{
    period: string;
    size: number;
    retention: number[];
  }>;
  averageRetention: number[];
}

export class AdvancedAnalyticsService extends EventEmitter {
  private static instance: AdvancedAnalyticsService;
  private events: AnalyticsEvent[] = [];
  private metrics: Map<string, MetricDefinition> = new Map();
  private dashboards: Map<string, Dashboard> = new Map();
  private reports: Map<string, Report> = new Map();
  private funnels: Map<string, Funnel> = new Map();
  private cohorts: Map<string, Cohort> = new Map();
  private eventBuffer: AnalyticsEvent[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private reportScheduler: NodeJS.Timeout | null = null;

  private constructor() {
    super();
    this.initializeDefaultMetrics();
    this.initializeDefaultDashboards();
    this.startEventProcessing();
    this.startReportScheduler();
  }

  public static getInstance(): AdvancedAnalyticsService {
    if (!AdvancedAnalyticsService.instance) {
      AdvancedAnalyticsService.instance = new AdvancedAnalyticsService();
    }
    return AdvancedAnalyticsService.instance;
  }

  private initializeDefaultMetrics(): void {
    const defaultMetrics: MetricDefinition[] = [
      {
        id: 'workflow_executions',
        name: 'Workflow Executions',
        description: 'Total number of workflow executions',
        type: 'counter',
        aggregation: 'sum',
        dimensions: ['workflowId', 'userId', 'status']
      },
      {
        id: 'execution_duration',
        name: 'Execution Duration',
        description: 'Average execution duration in milliseconds',
        type: 'histogram',
        aggregation: 'avg',
        dimensions: ['workflowId', 'nodeType']
      },
      {
        id: 'active_users',
        name: 'Active Users',
        description: 'Number of active users',
        type: 'gauge',
        aggregation: 'count',
        dimensions: ['timeframe']
      },
      {
        id: 'error_rate',
        name: 'Error Rate',
        description: 'Percentage of failed executions',
        type: 'gauge',
        aggregation: 'avg',
        dimensions: ['workflowId', 'errorType'],
        calculation: '(failed_executions / total_executions) * 100'
      },
      {
        id: 'user_engagement',
        name: 'User Engagement',
        description: 'User engagement score',
        type: 'distribution',
        aggregation: 'avg',
        dimensions: ['userId', 'feature']
      }
    ];

    defaultMetrics.forEach(metric => {
      this.metrics.set(metric.id, metric);
    });

    logger.info(`📊 Initialized ${defaultMetrics.length} default metrics`);
  }

  private initializeDefaultDashboards(): void {
    const executiveDashboard: Dashboard = {
      id: 'executive_overview',
      name: 'Executive Overview',
      description: 'High-level business metrics and KPIs',
      category: 'executive',
      widgets: [
        {
          id: 'total_workflows',
          type: 'metric',
          title: 'Total Workflows',
          position: { x: 0, y: 0, width: 3, height: 2 },
          config: { chartType: 'gauge' },
          dataSource: {
            type: 'metrics',
            query: 'SELECT COUNT(DISTINCT workflowId) FROM events WHERE type = "workflow_created"',
            parameters: {}
          },
          filters: {}
        },
        {
          id: 'monthly_executions',
          type: 'chart',
          title: 'Monthly Executions Trend',
          position: { x: 3, y: 0, width: 6, height: 4 },
          config: {
            chartType: 'line',
            xAxis: 'month',
            yAxis: ['executions'],
            timeRange: '12months'
          },
          dataSource: {
            type: 'events',
            query: 'SELECT DATE_TRUNC(month, timestamp) as month, COUNT(*) as executions FROM events WHERE type = "workflow_executed" GROUP BY month ORDER BY month',
            parameters: {}
          },
          filters: {}
        },
        {
          id: 'success_rate',
          type: 'metric',
          title: 'Success Rate',
          position: { x: 9, y: 0, width: 3, height: 2 },
          config: { chartType: 'gauge' },
          dataSource: {
            type: 'metrics',
            query: 'SELECT (SUM(CASE WHEN status = "success" THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) as rate FROM events WHERE type = "workflow_executed"',
            parameters: {}
          },
          filters: {}
        }
      ],
      filters: [
        {
          id: 'date_range',
          name: 'Date Range',
          type: 'daterange',
          defaultValue: { start: '30d', end: 'now' },
          required: true
        }
      ],
      permissions: {
        viewers: ['admin', 'manager'],
        editors: ['admin'],
        public: false
      },
      refreshInterval: 300000, // 5 minutes
      created: new Date(),
      updated: new Date()
    };

    this.dashboards.set(executiveDashboard.id, executiveDashboard);

    logger.info(`📈 Initialized default dashboards`);
  }

  /**
   * Track analytics event
   */
  public track(
    type: string,
    properties: Record<string, unknown> = {},
    metadata: Partial<AnalyticsEvent['metadata']> = {}
  ): void {
    const event: AnalyticsEvent = {
      id: this.generateEventId(),
      type,
      category: this.getCategoryFromType(type),
      action: this.getActionFromType(type),
      label: properties.label,
      value: properties.value,
      userId: properties.userId,
      sessionId: properties.sessionId,
      workflowId: properties.workflowId,
      nodeId: properties.nodeId,
      timestamp: new Date(),
      properties: { ...properties },
      metadata: {
        userAgent: metadata.userAgent,
        ip: metadata.ip,
        country: metadata.country,
        device: metadata.device,
        referrer: metadata.referrer
      }
    };

    this.eventBuffer.push(event);
    this.emit('event_tracked', event);
  }

  /**
   * Track workflow events
   */
  public trackWorkflowEvent(
    workflowId: string,
    eventType: 'created' | 'updated' | 'executed' | 'deleted' | 'shared',
    properties: Record<string, unknown> = {}
  ): void {
    this.track(`workflow_${eventType}`, {
      workflowId,
      ...properties
    });
  }

  /**
   * Track user events
   */
  public trackUserEvent(
    userId: string,
    eventType: 'login' | 'logout' | 'signup' | 'profile_update' | 'feature_used',
    properties: Record<string, unknown> = {}
  ): void {
    this.track(`user_${eventType}`, {
      userId,
      ...properties
    });
  }

  /**
   * Execute analytics query
   */
  public async query(query: AnalyticsQuery): Promise<AnalyticsResult> {

    try {
      // Check cache first
      if (cached) {
        return {
          ...cached,
          metadata: {
            ...cached.metadata,
            executionTime: Date.now() - startTime,
            cached: true
          }
        };
      }

      // Execute query
      
      // Cache result
      await cachingService.set(cacheKey, result, {
        ttl: 300, // 5 minutes
        tags: ['analytics', 'query']
      });

      return {
        ...result,
        metadata: {
          ...result.metadata,
          executionTime: Date.now() - startTime,
          cached: false
        }
      };

    } catch (error) {
      logger.error('❌ Analytics query failed:', error);
      throw error;
    }
  }

  private async executeQuery(query: AnalyticsQuery): Promise<AnalyticsResult> {
    // Filter events based on query filters and time range
      // Time range filter
      if (event.timestamp < query.timeRange.start || event.timestamp > query.timeRange.end) {
        return false;
      }

      // Apply filters
      return query.filters.every(filter => this.applyFilter(event, filter));
    });

    // Group by dimensions if specified

    // Calculate metrics

    // Apply ordering
    if (query.orderBy) {
      data.sort((a, b) => {
        for (const orderBy of query.orderBy!) {
          if (comparison !== 0) {
            return orderBy.direction === 'desc' ? -comparison : comparison;
          }
        }
        return 0;
      });
    }

    // Apply pagination

    return {
      data: paginatedData,
      metadata: {
        total: data.length,
        filtered: filteredEvents.length,
        timeRange: query.timeRange,
        executionTime: 0 // Will be set by caller
      }
    };
  }

  /**
   * Create or update dashboard
   */
  public async saveDashboard(dashboard: Dashboard): Promise<void> {
    dashboard.updated = new Date();
    this.dashboards.set(dashboard.id, dashboard);
    
    // Invalidate related caches
    await cachingService.invalidateByTags([`dashboard:${dashboard.id}`]);
    
    this.emit('dashboard_saved', dashboard);
    logger.info(`📊 Dashboard saved: ${dashboard.name}`);
  }

  /**
   * Get dashboard data
   */
  public async getDashboardData(
    dashboardId: string,
    filters: Record<string, unknown> = {}
  ): Promise<{
    dashboard: Dashboard;
    data: Record<string, unknown>;
  }> {
    if (!dashboard) {
      throw new Error(`Dashboard ${dashboardId} not found`);
    }

    const data: Record<string, unknown> = {};

    // Load data for each widget
    for (const widget of dashboard.widgets) {
      try {
        data[widget.id] = widgetData;
      } catch (error) {
        logger.error(`❌ Failed to load widget data for ${widget.id}:`, error);
        data[widget.id] = { error: error.message };
      }
    }

    return { dashboard, data };
  }

  private async getWidgetData(widget: Widget, globalFilters: Record<string, unknown>): Promise<unknown> {
    
    // Check cache
    if (cached) {
      return cached;
    }

    // Execute widget query
    let result;
    
    switch (widget.dataSource.type) {
      case 'events':
        result = await this.executeRawQuery(widget.dataSource.query, {
          ...widget.dataSource.parameters,
          ...widget.filters,
          ...globalFilters
        });
        break;
      
      case 'metrics':
        result = await this.executeMetricQuery(widget.dataSource.query, {
          ...widget.dataSource.parameters,
          ...widget.filters,
          ...globalFilters
        });
        break;
      
      case 'custom':
        result = await this.executeCustomQuery(widget.dataSource.query, {
          ...widget.dataSource.parameters,
          ...widget.filters,
          ...globalFilters
        });
        break;
    }

    // Cache result
    await cachingService.set(cacheKey, result, {
      ttl: widget.dataSource.cacheTtl || 300,
      tags: [`widget:${widget.id}`, `dashboard`]
    });

    return result;
  }

  /**
   * Create funnel analysis
   */
  public async createFunnel(funnel: Funnel): Promise<FunnelResult> {
    this.funnels.set(funnel.id, funnel);
    return this.analyzeFunnel(funnel.id);
  }

  public async analyzeFunnel(funnelId: string): Promise<FunnelResult> {
    if (!funnel) {
      throw new Error(`Funnel ${funnelId} not found`);
    }

    // Get users who completed each step
    const stepResults: Array<{ name: string; users: Set<string> }> = [];
    
    for (const step of funnel.steps) {
      
      // Find events matching this step
        if (event.type !== step.eventType) return false;
        
        // Apply step conditions
        return step.conditions.every(condition => this.applyFilter(event, condition));
      });

      // Apply global funnel filters
        funnel.filters.every(filter => this.applyFilter(event, filter))
      );

      filteredEvents.forEach(event => {
        if (event.userId) users.add(event.userId);
      });

      stepResults.push({
        name: step.name,
        users
      });
    }

    // Calculate funnel metrics
        ? (dropoff / stepResults[index - 1].users.size) * 100 
        : 0;

      return {
        name: step.name,
        users,
        percentage,
        dropoff,
        dropoffPercentage
      };
    });

      ? (stepResults[stepResults.length - 1].users.size / totalUsers) * 100 
      : 0;

    return {
      totalUsers,
      steps,
      conversionRate
    };
  }

  /**
   * Create cohort analysis
   */
  public async createCohort(cohort: Cohort): Promise<CohortResult> {
    this.cohorts.set(cohort.id, cohort);
    return this.analyzeCohort(cohort.id);
  }

  public async analyzeCohort(cohortId: string): Promise<CohortResult> {
    if (!cohort) {
      throw new Error(`Cohort ${cohortId} not found`);
    }

    // Group users by their first event (cohort definition)
    
      if (event.type !== cohort.definition.eventType) return false;
      if (event.timestamp < cohort.definition.timeRange.start || event.timestamp > cohort.definition.timeRange.end) return false;
      return cohort.definition.conditions.every(condition => this.applyFilter(event, condition));
    });

    // Group by period
    definitionEvents.forEach(event => {
      if (!event.userId) return;
      
      if (!cohortGroups.has(period)) {
        cohortGroups.set(period, new Set());
      }
      cohortGroups.get(period)!.add(event.userId);
    });

    // Analyze retention for each cohort
    const cohorts: CohortResult['cohorts'] = [];

    for (const [period, users] of cohortGroups.entries()) {
      const retention: number[] = [];

      for (let __i = 0; i < maxPeriods; i++) {
        
        // Count users who performed the metric event in this period
        
        this.events.forEach(event => {
          if (!event.userId || !users.has(event.userId)) return;
          if (event.type !== cohort.analysis.metric) return;
          
          
          if (eventPeriod === targetPeriodKey) {
            activeUsers.add(event.userId);
          }
        });

        retention.push(retentionRate);
      }

      cohorts.push({
        period,
        size: cohortSize,
        retention
      });
    }

    // Calculate average retention
    const averageRetention: number[] = [];
    for (let __i = 0; i < maxPeriods; i++) {
      averageRetention.push(average);
    }

    return {
      cohorts,
      averageRetention
    };
  }

  /**
   * Generate report
   */
  public async generateReport(reportId: string): Promise<{
    report: Report;
    data: unknown[];
    generatedAt: Date;
  }> {
    if (!report) {
      throw new Error(`Report ${reportId} not found`);
    }

    const data: unknown[] = [];

    // Execute each query in the report
    for (const query of report.queries) {
      try {
        data.push({
          name: query.name,
          data: result
        });
      } catch (error) {
        logger.error(`❌ Report query failed for ${query.name}:`, error);
        data.push({
          name: query.name,
          error: error.message
        });
      }
    }

    // Update report metadata
    report.lastRun = new Date();
    if (report.schedule) {
      report.nextRun = this.calculateNextRun(report.schedule);
    }

    logger.info(`📋 Generated report: ${report.name}`);

    return {
      report,
      data,
      generatedAt: new Date()
    };
  }

  /**
   * Real-time analytics
   */
  public getRealtimeMetrics(): {
    activeUsers: number;
    executionsPerMinute: number;
    errorRate: number;
    averageExecutionTime: number;
  } {


    // Active users (unique users in last 5 minutes)
      recentEvents
        .filter(event => event.userId)
        .map(event => event.userId!)
    ).size;

    // Executions per minute
      event => event.type === 'workflow_executed'
    ).length;

    // Error rate (last 5 minutes)

    // Average execution time (last 5 minutes)
      .filter(event => event.properties.duration)
      .map(event => event.properties.duration);
      ? executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length 
      : 0;

    return {
      activeUsers,
      executionsPerMinute,
      errorRate,
      averageExecutionTime
    };
  }

  /**
   * Helper methods
   */

  private startEventProcessing(): void {
    this.flushInterval = setInterval(() => {
      this.flushEventBuffer();
    }, 5000); // Flush every 5 seconds
  }

  private flushEventBuffer(): void {
    if (this.eventBuffer.length === 0) return;

    // Move events from buffer to main storage
    this.events.push(...this.eventBuffer);
    this.eventBuffer = [];

    // Keep only recent events in memory (last 7 days)
    this.events = this.events.filter(event => event.timestamp > sevenDaysAgo);

    // Record metrics
    monitoringService.recordMetric('analytics.events.processed', this.events.length);
  }

  private startReportScheduler(): void {
    this.reportScheduler = setInterval(() => {
      this.processScheduledReports();
    }, 60000); // Check every minute
  }

  private async processScheduledReports(): Promise<void> {
    
    for (const report of this.reports.values()) {
      if (report.type === 'scheduled' && report.nextRun && report.nextRun <= now) {
        try {
          await this.deliverReport(report, result);
        } catch (error) {
          logger.error(`❌ Scheduled report failed: ${report.name}`, error);
        }
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async deliverReport(report: Report, result: unknown): Promise<void> {
    // Implementation would send report to recipients
    logger.info(`📧 Delivered report: ${report.name} to ${report.recipients.length} recipients`);
  }

  private applyFilter(event: AnalyticsEvent, filter: QueryFilter): boolean {
    
    switch (filter.operator) {
      case 'eq': return fieldValue === filter.value;
      case 'ne': return fieldValue !== filter.value;
      case 'gt': return fieldValue > filter.value;
      case 'gte': return fieldValue >= filter.value;
      case 'lt': return fieldValue < filter.value;
      case 'lte': return fieldValue <= filter.value;
      case 'in': return Array.isArray(filter.value) && filter.value.includes(fieldValue);
      case 'nin': return Array.isArray(filter.value) && !filter.value.includes(fieldValue);
      case 'contains': return String(fieldValue).includes(String(filter.value));
      case 'regex': return new RegExp(filter.value).test(String(fieldValue));
      default: return true;
    }
  }

  private getFieldValue(event: AnalyticsEvent, field: string): unknown {
    let value: unknown = event;
    
    for (const part of parts) {
      value = value?.[part];
      if (value === undefined) break;
    }
    
    return value;
  }

  private groupEventsByDimensions(events: AnalyticsEvent[], dimensions: string[]): Map<string, AnalyticsEvent[]> {
    
    for (const event of events) {
      
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(event);
    }
    
    return groups;
  }

  private calculateMetrics(groupedData: Map<string, AnalyticsEvent[]>, metrics: string[]): Array<Record<string, unknown>> {
    const results: Array<Record<string, unknown>> = [];
    
    for (const [key, events] of groupedData.entries()) {
      const result: Record<string, unknown> = {};
      
      // Parse dimension values from key
      keyParts.forEach((part, index) => {
        result[`dim_${index}`] = part;
      });
      
      // Calculate metrics
      for (const metricId of metrics) {
        if (!metric) continue;
        
        result[metricId] = this.calculateMetricValue(events, metric);
      }
      
      results.push(result);
    }
    
    return results;
  }

  private calculateMetricValue(events: AnalyticsEvent[], metric: MetricDefinition): number {
    switch (metric.aggregation) {
      case 'count':
        return events.length;
      case 'sum':
        return events.reduce((sum, event) => sum + (event.value || 0), 0);
      case 'avg': {
        return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
      }
      case 'min':
        return Math.min(...events.map(event => event.value || 0));
      case 'max':
        return Math.max(...events.map(event => event.value || 0));
      default:
        return 0;
    }
  }

  private async executeRawQuery(query: string, parameters: Record<string, unknown>): Promise<unknown[]> {
    // Simplified query execution - in practice this would use a proper query engine
    logger.debug(`Executing raw query: ${query}`, parameters);
    return [];
  }

  private async executeMetricQuery(query: string, parameters: Record<string, unknown>): Promise<unknown[]> {
    // Simplified metric query execution
    logger.debug(`Executing metric query: ${query}`, parameters);
    return [];
  }

  private async executeCustomQuery(query: string, parameters: Record<string, unknown>): Promise<unknown[]> {
    // Simplified custom query execution
    logger.debug(`Executing custom query: ${query}`, parameters);
    return [];
  }

  private getCategoryFromType(type: string): string {
    if (type.startsWith('user_')) return 'user';
    if (type.startsWith('workflow_')) return 'workflow';
    if (type.startsWith('system_')) return 'system';
    return 'general';
  }

  private getActionFromType(type: string): string {
    return parts[parts.length - 1] || 'unknown';
  }

  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getPeriodKey(date: Date, periodType: 'day' | 'week' | 'month'): string {
    switch (periodType) {
      case 'day':
        return date.toISOString().split('T')[0];
      case 'week': {
        startOfWeek.setDate(date.getDate() - date.getDay());
        return startOfWeek.toISOString().split('T')[0];
      }
      case 'month':
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      default:
        return date.toISOString();
    }
  }

  private addPeriods(date: Date, periods: number, periodType: 'day' | 'week' | 'month'): Date {
    
    switch (periodType) {
      case 'day':
        result.setDate(result.getDate() + periods);
        break;
      case 'week':
        result.setDate(result.getDate() + (periods * 7));
        break;
      case 'month':
        result.setMonth(result.getMonth() + periods);
        break;
    }
    
    return result;
  }

  private calculateNextRun(schedule: Report['schedule']): Date {
    if (!schedule) return new Date();
    
    
    switch (schedule.frequency) {
      case 'hourly':
        nextRun.setHours(nextRun.getHours() + 1);
        break;
      case 'daily':
        nextRun.setDate(nextRun.getDate() + 1);
        break;
      case 'weekly':
        nextRun.setDate(nextRun.getDate() + 7);
        break;
      case 'monthly':
        nextRun.setMonth(nextRun.getMonth() + 1);
        break;
    }
    
    return nextRun;
  }

  /**
   * Public API methods
   */

  public getDashboard(id: string): Dashboard | undefined {
    return this.dashboards.get(id);
  }

  public getAllDashboards(): Dashboard[] {
    return Array.from(this.dashboards.values());
  }

  public getReport(id: string): Report | undefined {
    return this.reports.get(id);
  }

  public getAllReports(): Report[] {
    return Array.from(this.reports.values());
  }

  public saveReport(report: Report): void {
    this.reports.set(report.id, report);
    logger.info(`📋 Report saved: ${report.name}`);
  }

  public getFunnel(id: string): Funnel | undefined {
    return this.funnels.get(id);
  }

  public getCohort(id: string): Cohort | undefined {
    return this.cohorts.get(id);
  }

  public getEventCount(): number {
    return this.events.length;
  }

  public getMetrics(): MetricDefinition[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Shutdown service
   */
  public async shutdown(): Promise<void> {
    logger.info('🛑 Shutting down advanced analytics service...');

    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }

    if (this.reportScheduler) {
      clearInterval(this.reportScheduler);
    }

    // Final flush of event buffer
    this.flushEventBuffer();

    this.removeAllListeners();

    logger.info('✅ Advanced analytics service shutdown complete');
  }
}

export const advancedAnalyticsService = AdvancedAnalyticsService.getInstance();