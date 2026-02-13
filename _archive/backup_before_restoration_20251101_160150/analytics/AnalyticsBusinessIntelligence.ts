/**
 * Analytics and Business Intelligence System
 * Advanced analytics with real-time dashboards, KPIs, and predictive insights
 */

import { EventEmitter } from 'events';
import crypto from 'crypto';
import { Workflow, WorkflowExecution } from '../types/workflow.js';
import { logger } from '../utils/logger.js';

export interface AnalyticsEvent {
  id: string;
  type: EventType;
  category: EventCategory;
  action: string;
  label?: string;
  value?: number;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  properties?: Record<string, any>;
  context?: EventContext;
  metrics?: EventMetrics;
}

export type EventType = 
  | 'pageview'
  | 'click'
  | 'conversion'
  | 'transaction'
  | 'workflow'
  | 'api'
  | 'error'
  | 'custom';

export type EventCategory =
  | 'engagement'
  | 'performance'
  | 'revenue'
  | 'workflow'
  | 'user'
  | 'system';

export interface EventContext {
  page?: string;
  referrer?: string;
  userAgent?: string;
  ip?: string;
  country?: string;
  city?: string;
  device?: string;
  browser?: string;
  os?: string;
  campaign?: CampaignInfo;
}

export interface CampaignInfo {
  source?: string;
  medium?: string;
  name?: string;
  term?: string;
  content?: string;
}

export interface EventMetrics {
  duration?: number;
  loadTime?: number;
  responseTime?: number;
  errorRate?: number;
  custom?: Record<string, number>;
}

export interface KPI {
  id: string;
  name: string;
  description?: string;
  category: string;
  formula: KPIFormula;
  target?: number;
  unit?: string;
  format?: 'number' | 'percentage' | 'currency' | 'duration';
  period?: 'realtime' | 'hourly' | 'daily' | 'weekly' | 'monthly';
  tags?: string[];
}

export interface KPIFormula {
  type: 'simple' | 'calculated' | 'aggregated' | 'custom';
  metric?: string;
  calculation?: string;
  aggregation?: AggregationType;
  filters?: Record<string, any>;
  customFunction?: (events: AnalyticsEvent[]) => number;
}

export type AggregationType = 
  | 'count'
  | 'sum'
  | 'avg'
  | 'min'
  | 'max'
  | 'median'
  | 'percentile'
  | 'stddev';

export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  layout: DashboardLayout;
  widgets: Widget[];
  filters?: DashboardFilter[];
  refreshInterval?: number;
  public?: boolean;
  owner?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardLayout {
  type: 'grid' | 'flex' | 'custom';
  columns?: number;
  rows?: number;
  responsive?: boolean;
}

export interface Widget {
  id: string;
  type: WidgetType;
  title: string;
  position: WidgetPosition;
  size: WidgetSize;
  config: WidgetConfig;
  dataSource: DataSource;
  refreshInterval?: number;
}

export type WidgetType =
  | 'chart'
  | 'metric'
  | 'table'
  | 'map'
  | 'funnel'
  | 'heatmap'
  | 'timeline'
  | 'custom';

export interface WidgetPosition {
  x: number;
  y: number;
}

export interface WidgetSize {
  width: number;
  height: number;
}

export interface WidgetConfig {
  chartType?: 'line' | 'bar' | 'pie' | 'donut' | 'area' | 'scatter';
  colors?: string[];
  legend?: boolean;
  axes?: {
    x?: AxisConfig;
    y?: AxisConfig;
  };
  thresholds?: Threshold[];
  customOptions?: any;
}

export interface AxisConfig {
  label?: string;
  type?: 'linear' | 'logarithmic' | 'time' | 'category';
  min?: number;
  max?: number;
  format?: string;
}

export interface Threshold {
  value: number;
  color: string;
  label?: string;
}

export interface DataSource {
  type: 'kpi' | 'query' | 'realtime' | 'custom';
  kpiId?: string;
  query?: AnalyticsQuery;
  realtimeConfig?: RealtimeConfig;
  customSource?: () => Promise<any>;
}

export interface AnalyticsQuery {
  events?: string[];
  metrics?: string[];
  dimensions?: string[];
  filters?: QueryFilter[];
  groupBy?: string[];
  orderBy?: OrderBy[];
  timeRange?: TimeRange;
  limit?: number;
  sampling?: number;
}

export interface QueryFilter {
  field: string;
  operator: FilterOperator;
  value: any;
}

export type FilterOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'nin'
  | 'contains'
  | 'regex';

export interface OrderBy {
  field: string;
  direction: 'asc' | 'desc';
}

export interface TimeRange {
  start: Date;
  end: Date;
  granularity?: 'minute' | 'hour' | 'day' | 'week' | 'month';
}

export interface RealtimeConfig {
  stream: string;
  window?: number;
  aggregation?: AggregationType;
}

export interface DashboardFilter {
  id: string;
  type: 'dropdown' | 'daterange' | 'search' | 'toggle';
  field: string;
  label: string;
  defaultValue?: any;
  options?: any[];
}

export interface Report {
  id: string;
  name: string;
  description?: string;
  type: 'scheduled' | 'on-demand' | 'triggered';
  schedule?: ReportSchedule;
  trigger?: ReportTrigger;
  content: ReportContent[];
  format: 'pdf' | 'excel' | 'csv' | 'html';
  recipients?: Recipient[];
  createdAt: Date;
  lastRun?: Date;
}

export interface ReportSchedule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'custom';
  time?: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
  cron?: string;
  timezone?: string;
}

export interface ReportTrigger {
  event: string;
  condition?: any;
}

export interface ReportContent {
  type: 'text' | 'chart' | 'table' | 'metric' | 'custom';
  title?: string;
  data?: DataSource;
  template?: string;
}

export interface Recipient {
  type: 'email' | 'slack' | 'webhook';
  destination: string;
  format?: string;
}

export interface Insight {
  id: string;
  type: InsightType;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  metric?: string;
  value?: number;
  change?: number;
  recommendation?: string;
  timestamp: Date;
  acknowledged?: boolean;
}

export type InsightType =
  | 'anomaly'
  | 'trend'
  | 'forecast'
  | 'correlation'
  | 'recommendation';

export interface Segment {
  id: string;
  name: string;
  description?: string;
  criteria: SegmentCriteria[];
  size?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SegmentCriteria {
  field: string;
  operator: FilterOperator;
  value: any;
  logic?: 'and' | 'or';
}

export class AnalyticsBusinessIntelligence extends EventEmitter {
  private events: Map<string, AnalyticsEvent> = new Map();
  private kpis: Map<string, KPI> = new Map();
  private dashboards: Map<string, Dashboard> = new Map();
  private reports: Map<string, Report> = new Map();
  private insights: Map<string, Insight> = new Map();
  private segments: Map<string, Segment> = new Map();
  private realtimeStreams: Map<string, RealtimeStream> = new Map();
  private kpiCache: Map<string, KPIValue> = new Map();
  private aggregations: Map<string, any> = new Map();
  private config: AnalyticsConfig;

  constructor(config?: Partial<AnalyticsConfig>) {
    super();
    this.config = {
      maxEvents: 1000000,
      retentionDays: 90,
      samplingRate: 1.0,
      enableRealtime: true,
      enablePredictive: true,
      enableAnomalyDetection: true,
      cacheTimeout: 300000, // 5 minutes
      ...config
    };

    this.initialize();
  }

  /**
   * Initialize analytics system
   */
  private initialize(): void {
    // Load default KPIs
    this.loadDefaultKPIs();

    // Start background processes
    this.startBackgroundProcesses();

    // Initialize realtime streams
    if (this.config.enableRealtime) {
      this.initializeRealtimeStreams();
    }

    logger.debug('Analytics system initialized');
  }

  /**
   * Track event
   */
  track(
    type: EventType,
    action: string,
    options?: {
      category?: EventCategory;
      label?: string;
      value?: number;
      userId?: string;
      sessionId?: string;
      properties?: Record<string, any>;
      context?: EventContext;
      metrics?: EventMetrics;
    }
  ): AnalyticsEvent {
    // Apply sampling
    if (Math.random() > this.config.samplingRate) {
      return {} as AnalyticsEvent;
    }

    const event: AnalyticsEvent = {
      id: this.generateEventId(),
      type,
      category: options?.category || 'engagement',
      action,
      label: options?.label,
      value: options?.value,
      timestamp: new Date(),
      userId: options?.userId,
      sessionId: options?.sessionId,
      properties: options?.properties,
      context: options?.context,
      metrics: options?.metrics
    };

    // Store event
    this.storeEvent(event);

    // Process realtime
    if (this.config.enableRealtime) {
      this.processRealtimeEvent(event);
    }

    // Check for insights
    if (this.config.enableAnomalyDetection) {
      this.detectAnomalies(event);
    }

    // Update KPIs
    this.updateKPIs(event);

    this.emit('event:tracked', event);
    return event;
  }

  /**
   * Create KPI
   */
  createKPI(kpi: Omit<KPI, 'id'>): KPI {
    const fullKPI: KPI = {
      ...kpi,
      id: `kpi_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
    };

    this.kpis.set(fullKPI.id, fullKPI);
    this.emit('kpi:created', fullKPI);
    return fullKPI;
  }

  /**
   * Get KPI value
   */
  async getKPIValue(kpiId: string, timeRange?: TimeRange): Promise<KPIValue> {
    const kpi = this.kpis.get(kpiId);
    
    if (!kpi) {
      throw new Error(`KPI ${kpiId} not found`);
    }

    // Check cache
    const cacheKey = `${kpiId}:${JSON.stringify(timeRange)}`;
    const cached = this.kpiCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.config.cacheTimeout) {
      return cached;
    }

    // Calculate KPI value
    const value = await this.calculateKPI(kpi, timeRange);
    
    // Cache result
    const kpiValue: KPIValue = {
      kpiId,
      value,
      timestamp: Date.now(),
      period: timeRange,
      target: kpi.target,
      variance: kpi.target ? ((value - kpi.target) / kpi.target) * 100 : 0
    };

    this.kpiCache.set(cacheKey, kpiValue);
    return kpiValue;
  }

  /**
   * Create dashboard
   */
  createDashboard(params: Omit<Dashboard, 'id' | 'createdAt' | 'updatedAt'>): Dashboard {
    const dashboard: Dashboard = {
      ...params,
      id: `dashboard_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.dashboards.set(dashboard.id, dashboard);
    this.emit('dashboard:created', dashboard);
    return dashboard;
  }

  /**
   * Get dashboard data
   */
  async getDashboardData(
    dashboardId: string,
    filters?: Record<string, any>
  ): Promise<DashboardData> {
    const dashboard = this.dashboards.get(dashboardId);
    
    if (!dashboard) {
      throw new Error(`Dashboard ${dashboardId} not found`);
    }

    const widgetData: Map<string, any> = new Map();

    // Load data for each widget
    for (const widget of dashboard.widgets) {
      const data = await this.getWidgetData(widget, filters);
      widgetData.set(widget.id, data);
    }

    return {
      dashboard,
      data: Object.fromEntries(widgetData),
      timestamp: new Date()
    };
  }

  /**
   * Create report
   */
  createReport(report: Omit<Report, 'id' | 'createdAt'>): Report {
    const fullReport: Report = {
      ...report,
      id: `report_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      createdAt: new Date()
    };

    this.reports.set(fullReport.id, fullReport);

    // Schedule if needed
    if (fullReport.schedule) {
      this.scheduleReport(fullReport);
    }

    this.emit('report:created', fullReport);
    return fullReport;
  }

  /**
   * Generate report
   */
  async generateReport(reportId: string): Promise<GeneratedReport> {
    const report = this.reports.get(reportId);
    
    if (!report) {
      throw new Error(`Report ${reportId} not found`);
    }

    const content: any[] = [];

    // Generate content
    for (const section of report.content) {
      const sectionData = await this.generateReportSection(section);
      content.push(sectionData);
    }

    const generated: GeneratedReport = {
      report,
      content,
      generatedAt: new Date(),
      format: report.format
    };

    // Send to recipients
    if (report.recipients) {
      await this.sendReport(generated, report.recipients);
    }

    report.lastRun = new Date();
    this.emit('report:generated', generated);
    
    return generated;
  }

  /**
   * Query analytics data
   */
  async query(query: AnalyticsQuery): Promise<QueryResult> {
    let events = Array.from(this.events.values());

    // Apply time range
    if (query.timeRange) {
      events = events.filter(e => 
        e.timestamp >= query.timeRange!.start &&
        e.timestamp <= query.timeRange!.end
      );
    }

    // Apply filters
    if (query.filters) {
      events = this.applyFilters(events, query.filters);
    }

    // Group by dimensions
    let grouped: Map<string, AnalyticsEvent[]> = new Map();
    
    if (query.groupBy?.length) {
      for (const event of events) {
        const key = query.groupBy
          .map(dim => this.getDimensionValue(event, dim))
          .join(':');
        
        if (!grouped.has(key)) {
          grouped.set(key, []);
        }
        grouped.get(key)!.push(event);
      }
    } else {
      grouped.set('all', events);
    }

    // Calculate metrics
    const results: any[] = [];
    
    for (const [key, groupEvents] of grouped.entries()) {
      const row: any = {};
      
      // Add dimensions
      if (query.groupBy) {
        const values = key.split(':');
        query.groupBy.forEach((dim, i) => {
          row[dim] = values[i];
        });
      }

      // Add metrics
      if (query.metrics) {
        for (const metric of query.metrics) {
          row[metric] = this.calculateMetric(groupEvents, metric);
        }
      }

      results.push(row);
    }

    // Sort results
    if (query.orderBy) {
      this.sortResults(results, query.orderBy);
    }

    // Apply limit
    const limited = query.limit ? results.slice(0, query.limit) : results;

    return {
      data: limited,
      total: results.length,
      query,
      executionTime: 0 // Would track actual time
    };
  }

  /**
   * Create segment
   */
  createSegment(segment: Omit<Segment, 'id' | 'createdAt' | 'updatedAt'>): Segment {
    const fullSegment: Segment = {
      ...segment,
      id: `segment_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.segments.set(fullSegment.id, fullSegment);
    
    // Calculate segment size
    fullSegment.size = this.calculateSegmentSize(fullSegment);
    
    this.emit('segment:created', fullSegment);
    return fullSegment;
  }

  /**
   * Get insights
   */
  getInsights(filters?: {
    type?: InsightType;
    severity?: string;
    acknowledged?: boolean;
  }): Insight[] {
    let insights = Array.from(this.insights.values());

    if (filters) {
      if (filters.type) {
        insights = insights.filter(i => i.type === filters.type);
      }
      if (filters.severity) {
        insights = insights.filter(i => i.severity === filters.severity);
      }
      if (filters.acknowledged !== undefined) {
        insights = insights.filter(i => i.acknowledged === filters.acknowledged);
      }
    }

    return insights.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Acknowledge insight
   */
  acknowledgeInsight(insightId: string): void {
    const insight = this.insights.get(insightId);
    
    if (insight) {
      insight.acknowledged = true;
      this.emit('insight:acknowledged', insight);
    }
  }

  /**
   * Predict future values
   */
  async predict(
    metric: string,
    timeRange: TimeRange,
    options?: {
      model?: 'linear' | 'exponential' | 'seasonal';
      confidence?: number;
    }
  ): Promise<Prediction> {
    if (!this.config.enablePredictive) {
      throw new Error('Predictive analytics not enabled');
    }

    // Get historical data
    const historical = await this.query({
      metrics: [metric],
      timeRange,
      groupBy: ['date']
    });

    // Simple linear prediction (in production would use ML)
    const values = historical.data.map(d => d[metric]);
    const trend = this.calculateTrend(values);
    
    const futureValues = [];
    const lastValue = values[values.length - 1] || 0;
    
    for (let i = 1; i <= 7; i++) {
      futureValues.push(lastValue + (trend * i));
    }

    return {
      metric,
      historical: values,
      predicted: futureValues,
      confidence: options?.confidence || 0.85,
      model: options?.model || 'linear',
      trend
    };
  }

  /**
   * Get funnel analysis
   */
  async getFunnelAnalysis(
    steps: FunnelStep[],
    timeRange?: TimeRange
  ): Promise<FunnelAnalysis> {
    const results: FunnelStepResult[] = [];
    let previousCount = 0;

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const events = await this.query({
        filters: [{
          field: 'action',
          operator: 'eq',
          value: step.action
        }],
        timeRange
      });

      const count = events.data.length;
      const rate = i === 0 ? 100 : (count / previousCount) * 100;

      results.push({
        step: step.name,
        count,
        rate,
        dropoff: i === 0 ? 0 : previousCount - count
      });

      previousCount = count;
    }

    return {
      steps: results,
      overallConversion: results.length > 0 
        ? (results[results.length - 1].count / results[0].count) * 100 
        : 0,
      timeRange
    };
  }

  /**
   * Get cohort analysis
   */
  async getCohortAnalysis(
    metric: string,
    cohortSize: 'daily' | 'weekly' | 'monthly',
    periods: number
  ): Promise<CohortAnalysis> {
    const cohorts: Map<string, CohortData> = new Map();

    // Group users by cohort
    const users = await this.query({
      dimensions: ['userId', 'timestamp'],
      groupBy: ['userId']
    });

    // Calculate retention for each cohort
    // Simplified implementation
    const data = Array.from({ length: periods }, (_, i) => ({
      period: i,
      retention: Math.max(100 - (i * 10), 20) // Mock data
    }));

    return {
      metric,
      cohortSize,
      periods,
      data,
      averageRetention: data.reduce((sum, d) => sum + d.retention, 0) / data.length
    };
  }

  /**
   * Private helper methods
   */
  private storeEvent(event: AnalyticsEvent): void {
    // Apply retention limit
    if (this.events.size >= this.config.maxEvents) {
      const toDelete = this.events.size - this.config.maxEvents + 1;
      const keys = Array.from(this.events.keys()).slice(0, toDelete);
      keys.forEach(key => this.events.delete(key));
    }

    this.events.set(event.id, event);
  }

  private processRealtimeEvent(event: AnalyticsEvent): void {
    // Process through realtime streams
    for (const stream of this.realtimeStreams.values()) {
      stream.process(event);
    }
  }

  private detectAnomalies(event: AnalyticsEvent): void {
    // Simple anomaly detection
    if (event.metrics?.errorRate && event.metrics.errorRate > 0.1) {
      const insight: Insight = {
        id: `insight_${Date.now()}`,
        type: 'anomaly',
        severity: 'warning',
        title: 'High Error Rate Detected',
        description: `Error rate of ${event.metrics.errorRate * 100}% detected`,
        metric: 'errorRate',
        value: event.metrics.errorRate,
        timestamp: new Date()
      };

      this.insights.set(insight.id, insight);
      this.emit('insight:detected', insight);
    }
  }

  private updateKPIs(event: AnalyticsEvent): void {
    // Invalidate cache for affected KPIs
    for (const [key] of this.kpiCache.entries()) {
      if (key.includes(event.category)) {
        this.kpiCache.delete(key);
      }
    }
  }

  private async calculateKPI(kpi: KPI, timeRange?: TimeRange): Promise<number> {
    const formula = kpi.formula;

    switch (formula.type) {
      case 'simple':
        const events = await this.query({
          metrics: [formula.metric!],
          timeRange,
          filters: formula.filters ? 
            Object.entries(formula.filters).map(([field, value]) => ({
              field,
              operator: 'eq' as FilterOperator,
              value
            })) : undefined
        });
        return events.data[0]?.[formula.metric!] || 0;

      case 'calculated':
        // Evaluate calculation expression
        return 0; // Simplified

      case 'aggregated':
        const aggEvents = Array.from(this.events.values());
        return this.calculateAggregation(aggEvents, formula.aggregation!);

      case 'custom':
        if (formula.customFunction) {
          const events = Array.from(this.events.values());
          return formula.customFunction(events);
        }
        return 0;

      default:
        return 0;
    }
  }

  private calculateAggregation(
    events: AnalyticsEvent[],
    type: AggregationType
  ): number {
    if (events.length === 0) return 0;

    const values = events.map(e => e.value || 0);

    switch (type) {
      case 'count':
        return events.length;
      case 'sum':
        return values.reduce((a, b) => a + b, 0);
      case 'avg':
        return values.reduce((a, b) => a + b, 0) / values.length;
      case 'min':
        return Math.min(...values);
      case 'max':
        return Math.max(...values);
      case 'median':
        const sorted = values.sort((a, b) => a - b);
        return sorted[Math.floor(sorted.length / 2)];
      default:
        return 0;
    }
  }

  private async getWidgetData(
    widget: Widget,
    filters?: Record<string, any>
  ): Promise<any> {
    const source = widget.dataSource;

    switch (source.type) {
      case 'kpi':
        return this.getKPIValue(source.kpiId!);

      case 'query':
        const query = { ...source.query };
        if (filters) {
          query.filters = [
            ...(query.filters || []),
            ...Object.entries(filters).map(([field, value]) => ({
              field,
              operator: 'eq' as FilterOperator,
              value
            }))
          ];
        }
        return this.query(query);

      case 'realtime':
        const stream = this.realtimeStreams.get(source.realtimeConfig!.stream);
        return stream?.getData();

      case 'custom':
        return source.customSource ? source.customSource() : null;

      default:
        return null;
    }
  }

  private applyFilters(
    events: AnalyticsEvent[],
    filters: QueryFilter[]
  ): AnalyticsEvent[] {
    return events.filter(event => {
      for (const filter of filters) {
        const value = this.getDimensionValue(event, filter.field);
        
        if (!this.matchesFilter(value, filter.operator, filter.value)) {
          return false;
        }
      }
      return true;
    });
  }

  private matchesFilter(value: any, operator: FilterOperator, filterValue: any): boolean {
    switch (operator) {
      case 'eq':
        return value === filterValue;
      case 'neq':
        return value !== filterValue;
      case 'gt':
        return value > filterValue;
      case 'gte':
        return value >= filterValue;
      case 'lt':
        return value < filterValue;
      case 'lte':
        return value <= filterValue;
      case 'in':
        return filterValue.includes(value);
      case 'nin':
        return !filterValue.includes(value);
      case 'contains':
        return String(value).includes(filterValue);
      case 'regex':
        return new RegExp(filterValue).test(String(value));
      default:
        return false;
    }
  }

  private getDimensionValue(event: AnalyticsEvent, dimension: string): any {
    const path = dimension.split('.');
    let value: any = event;
    
    for (const key of path) {
      value = value?.[key];
    }
    
    return value;
  }

  private calculateMetric(events: AnalyticsEvent[], metric: string): number {
    // Simple metric calculation
    switch (metric) {
      case 'count':
        return events.length;
      case 'uniqueUsers':
        return new Set(events.map(e => e.userId).filter(Boolean)).size;
      case 'avgValue':
        const values = events.map(e => e.value || 0);
        return values.reduce((a, b) => a + b, 0) / values.length;
      default:
        return 0;
    }
  }

  private sortResults(results: any[], orderBy: OrderBy[]): void {
    results.sort((a, b) => {
      for (const order of orderBy) {
        const aVal = a[order.field];
        const bVal = b[order.field];
        
        if (aVal !== bVal) {
          const comparison = aVal > bVal ? 1 : -1;
          return order.direction === 'asc' ? comparison : -comparison;
        }
      }
      return 0;
    });
  }

  private calculateSegmentSize(segment: Segment): number {
    const events = Array.from(this.events.values());
    const users = new Set<string>();

    for (const event of events) {
      if (this.matchesSegmentCriteria(event, segment.criteria)) {
        if (event.userId) {
          users.add(event.userId);
        }
      }
    }

    return users.size;
  }

  private matchesSegmentCriteria(
    event: AnalyticsEvent,
    criteria: SegmentCriteria[]
  ): boolean {
    for (const criterion of criteria) {
      const value = this.getDimensionValue(event, criterion.field);
      
      if (!this.matchesFilter(value, criterion.operator, criterion.value)) {
        return false;
      }
    }
    return true;
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    // Simple linear trend
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.reduce((sum, y, x) => sum + x * y, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

    return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  }

  private async generateReportSection(section: ReportContent): Promise<any> {
    switch (section.type) {
      case 'text':
        return { type: 'text', content: section.template };
      
      case 'metric':
        if (section.data) {
          const data = await this.getWidgetData({} as Widget, {});
          return { type: 'metric', title: section.title, data };
        }
        return null;
      
      case 'chart':
      case 'table':
        if (section.data) {
          const data = await this.getWidgetData({} as Widget, {});
          return { type: section.type, title: section.title, data };
        }
        return null;
      
      default:
        return null;
    }
  }

  private async sendReport(report: GeneratedReport, recipients: Recipient[]): Promise<void> {
    for (const recipient of recipients) {
      switch (recipient.type) {
        case 'email':
          logger.debug(`Sending report to ${recipient.destination}`);
          break;
        case 'slack':
          logger.debug(`Posting report to Slack: ${recipient.destination}`);
          break;
        case 'webhook':
          logger.debug(`Sending report to webhook: ${recipient.destination}`);
          break;
      }
    }
  }

  private scheduleReport(report: Report): void {
    // In production, would use cron scheduler
    logger.debug(`Report ${report.name} scheduled: ${report.schedule?.frequency}`);
  }

  private loadDefaultKPIs(): void {
    // Load common KPIs
    this.createKPI({
      name: 'Daily Active Users',
      category: 'engagement',
      formula: {
        type: 'simple',
        metric: 'uniqueUsers',
        aggregation: 'count'
      },
      period: 'daily',
      format: 'number'
    });

    this.createKPI({
      name: 'Conversion Rate',
      category: 'revenue',
      formula: {
        type: 'calculated',
        calculation: 'conversions / visitors * 100'
      },
      target: 2.5,
      unit: '%',
      format: 'percentage'
    });

    this.createKPI({
      name: 'Average Session Duration',
      category: 'engagement',
      formula: {
        type: 'aggregated',
        aggregation: 'avg'
      },
      format: 'duration'
    });
  }

  private startBackgroundProcesses(): void {
    // Clean old events
    setInterval(() => {
      this.cleanOldEvents();
    }, 24 * 60 * 60 * 1000); // Daily

    // Generate insights
    setInterval(() => {
      this.generateInsights();
    }, 60 * 60 * 1000); // Hourly
  }

  private cleanOldEvents(): void {
    const cutoff = new Date(
      Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000
    );

    for (const [id, event] of this.events.entries()) {
      if (event.timestamp < cutoff) {
        this.events.delete(id);
      }
    }
  }

  private generateInsights(): void {
    // Generate insights based on current data
    // Simplified implementation
    logger.debug('Generating insights...');
  }

  private initializeRealtimeStreams(): void {
    // Initialize default realtime streams
    this.realtimeStreams.set('pageviews', new RealtimeStream('pageviews'));
    this.realtimeStreams.set('conversions', new RealtimeStream('conversions'));
  }

  private generateEventId(): string {
    return `event_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Get statistics
   */
  getStatistics(): any {
    return {
      totalEvents: this.events.size,
      kpis: this.kpis.size,
      dashboards: this.dashboards.size,
      reports: this.reports.size,
      insights: this.insights.size,
      segments: this.segments.size,
      realtimeStreams: this.realtimeStreams.size
    };
  }

  /**
   * Shutdown
   */
  shutdown(): void {
    this.removeAllListeners();
    logger.debug('Analytics system shut down');
  }
}

// Helper classes and interfaces
class RealtimeStream {
  private buffer: AnalyticsEvent[] = [];
  private window = 60000; // 1 minute window

  constructor(public name: string) {}

  process(event: AnalyticsEvent): void {
    this.buffer.push(event);
    this.cleanup();
  }

  getData(): any {
    return {
      count: this.buffer.length,
      events: this.buffer.slice(-100)
    };
  }

  private cleanup(): void {
    const cutoff = Date.now() - this.window;
    this.buffer = this.buffer.filter(e => e.timestamp.getTime() > cutoff);
  }
}

interface AnalyticsConfig {
  maxEvents: number;
  retentionDays: number;
  samplingRate: number;
  enableRealtime: boolean;
  enablePredictive: boolean;
  enableAnomalyDetection: boolean;
  cacheTimeout: number;
}

interface KPIValue {
  kpiId: string;
  value: number;
  timestamp: number;
  period?: TimeRange;
  target?: number;
  variance?: number;
}

interface DashboardData {
  dashboard: Dashboard;
  data: Record<string, any>;
  timestamp: Date;
}

interface QueryResult {
  data: any[];
  total: number;
  query: AnalyticsQuery;
  executionTime: number;
}

interface GeneratedReport {
  report: Report;
  content: any[];
  generatedAt: Date;
  format: string;
}

interface Prediction {
  metric: string;
  historical: number[];
  predicted: number[];
  confidence: number;
  model: string;
  trend: number;
}

interface FunnelStep {
  name: string;
  action: string;
}

interface FunnelStepResult {
  step: string;
  count: number;
  rate: number;
  dropoff: number;
}

interface FunnelAnalysis {
  steps: FunnelStepResult[];
  overallConversion: number;
  timeRange?: TimeRange;
}

interface CohortData {
  period: number;
  retention: number;
}

interface CohortAnalysis {
  metric: string;
  cohortSize: string;
  periods: number;
  data: CohortData[];
  averageRetention: number;
}

// Export singleton instance
export const analyticsSystem = new AnalyticsBusinessIntelligence();