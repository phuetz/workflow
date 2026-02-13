import { EventEmitter } from 'events';

export interface BIMetric {
  id: string;
  name: string;
  description: string;
  type: 'number' | 'percentage' | 'duration' | 'count' | 'currency';
  category: string;
  formula?: string;
  aggregation: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'distinct';
  dimensions: string[];
  filters?: BIFilter[];
  format?: {
    precision?: number;
    currency?: string;
    suffix?: string;
    prefix?: string;
  };
  thresholds?: {
    warning?: number;
    critical?: number;
    target?: number;
  };
  source: {
    table: string;
    column: string;
    joins?: string[];
  };
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface BIDimension {
  id: string;
  name: string;
  description: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  category: string;
  hierarchy?: string[];
  source: {
    table: string;
    column: string;
  };
  values?: string[];
  isActive: boolean;
}

export interface BIFilter {
  id: string;
  dimension: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'between' | 'in' | 'not_in';
  values: unknown[];
  isRequired: boolean;
}

export interface BIDataSource {
  id: string;
  name: string;
  type: 'sql' | 'api' | 'file' | 'nosql' | 'warehouse';
  connection: {
    host?: string;
    port?: number;
    database?: string;
    username?: string;
    password?: string;
    url?: string;
    apiKey?: string;
    config?: { [key: string]: unknown };
  };
  schema?: {
    tables: Array<{
      name: string;
      columns: Array<{
        name: string;
        type: string;
        nullable: boolean;
      }>;
    }>;
  };
  refreshInterval?: number;
  lastRefresh?: Date;
  isActive: boolean;
}

export interface BIQuery {
  id: string;
  name: string;
  description: string;
  sql: string;
  parameters?: { [key: string]: unknown };
  dataSource: string;
  cacheEnabled: boolean;
  cacheTTL?: number;
  schedule?: {
    enabled: boolean;
    cron: string;
    timezone: string;
  };
  tags: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BIAnalysis {
  id: string;
  name: string;
  description: string;
  type: 'trend' | 'correlation' | 'regression' | 'forecasting' | 'anomaly' | 'clustering' | 'classification';
  config: {
    algorithm?: string;
    parameters?: { [key: string]: unknown };
    features: string[];
    target?: string;
    timeColumn?: string;
    groupBy?: string[];
  };
  dataSource: string;
  query?: string;
  results?: {
    accuracy?: number;
    predictions?: unknown[];
    insights?: string[];
    visualizations?: Array<{
      type: string;
      data: unknown;
      config: unknown;
    }>;
  };
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

export interface BIReport {
  id: string;
  name: string;
  description: string;
  type: 'dashboard' | 'standard' | 'scheduled' | 'adhoc';
  layout: {
    sections: Array<{
      id: string;
      title: string;
      type: 'chart' | 'table' | 'kpi' | 'text' | 'image';
      position: { x: number; y: number; w: number; h: number };
      config: unknown;
      dataSource?: string;
      query?: string;
      filters?: BIFilter[];
    }>;
  };
  permissions: {
    viewers: string[];
    editors: string[];
    isPublic: boolean;
  };
  schedule?: {
    enabled: boolean;
    cron: string;
    timezone: string;
    recipients: string[];
    format: 'pdf' | 'excel' | 'csv' | 'email';
  };
  tags: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface BIEngineConfig {
  dataSources: BIDataSource[];
  caching: {
    enabled: boolean;
    provider: 'memory' | 'redis' | 'file';
    defaultTTL: number;
    maxSize: number;
  };
  analysis: {
    algorithms: {
      regression: string[];
      classification: string[];
      clustering: string[];
      forecasting: string[];
    };
    resources: {
      maxConcurrentAnalyses: number;
      timeoutMs: number;
      memoryLimitMB: number;
    };
  };
  reporting: {
    maxConcurrentReports: number;
    exportFormats: string[];
    templateDirectory: string;
  };
  security: {
    encryptionKey: string;
    allowedOrigins: string[];
    rateLimits: {
      queries: number;
      analyses: number;
      reports: number;
    };
  };
}

export class BIEngine extends EventEmitter {
  private config: BIEngineConfig;
  private dataSources: Map<string, BIDataSource> = new Map();
  private metrics: Map<string, BIMetric> = new Map();
  private dimensions: Map<string, BIDimension> = new Map();
  private queries: Map<string, BIQuery> = new Map();
  private analyses: Map<string, BIAnalysis> = new Map();
  private reports: Map<string, BIReport> = new Map();
  private cache: Map<string, { data: unknown; timestamp: number; ttl: number }> = new Map();
  private analysisQueue: Array<{ id: string; priority: number }> = [];
  private isInitialized = false;

  constructor(config: BIEngineConfig) {
    super();
    this.config = config;
  }

  public async initialize(): Promise<void> {
    try {
      // Initialize data sources
      for (const ds of this.config.dataSources) {
        await this.addDataSource(ds);
      }

      // Load existing configurations
      await this.loadConfigurations();

      this.isInitialized = true;
      this.emit('initialized');
    } catch (error) {
      this.emit('error', { type: 'initialization', error });
      throw error;
    }
  }

  public async addDataSource(dataSource: BIDataSource): Promise<void> {
    try {
      // Test connection
      await this.testDataSourceConnection(dataSource);
      
      // Introspect schema
      if (!dataSource.schema) {
        dataSource.schema = await this.introspectSchema(dataSource);
      }

      this.dataSources.set(dataSource.id, dataSource);
      this.emit('dataSourceAdded', { dataSource });
    } catch (error) {
      this.emit('error', { type: 'dataSource', dataSourceId: dataSource.id, error });
      throw error;
    }
  }

  public async createMetric(metricSpec: Omit<BIMetric, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const metric: BIMetric = {
      ...metricSpec,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.metrics.set(id, metric);
    this.emit('metricCreated', { metric });
    
    return id;
  }

  public async createDimension(dimensionSpec: Omit<BIDimension, 'id'>): Promise<string> {
    const id = `dimension_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const dimension: BIDimension = {
      ...dimensionSpec,
      id
    };

    this.dimensions.set(id, dimension);
    this.emit('dimensionCreated', { dimension });
    
    return id;
  }

  public async executeQuery(
    queryId: string,
    parameters: { [key: string]: unknown } = {},
    options: {
      useCache?: boolean;
      timeout?: number;
    } = {}
  ): Promise<unknown[]> {
    const query = this.queries.get(queryId);
    if (!query) {
      throw new Error(`Query not found: ${queryId}`);
    }

    const cacheKey = `query_${queryId}_${JSON.stringify(parameters)}`;
    
    // Check cache
    if (options.useCache !== false && query.cacheEnabled) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < cached.ttl) {
        this.emit('queryCacheHit', { queryId, parameters });
        return cached.data;
      }
    }

    try {
      const dataSource = this.dataSources.get(query.dataSource);
      if (!dataSource) {
        throw new Error(`Data source not found: ${query.dataSource}`);
      }

      this.emit('queryStarted', { queryId, parameters });
      
      const result = await this.executeQueryOnDataSource(dataSource, query.sql, parameters);
      
      // Cache result
      if (query.cacheEnabled) {
        this.cache.set(cacheKey, {
          data: result,
          timestamp: Date.now(),
          ttl: query.cacheTTL || this.config.caching.defaultTTL
        });
      }

      this.emit('queryCompleted', { queryId, parameters, resultCount: result.length });
      return result;
    } catch (error) {
      this.emit('error', { type: 'query', queryId, parameters, error });
      throw error;
    }
  }

  public async createAnalysis(analysisSpec: Omit<BIAnalysis, 'id' | 'createdAt' | 'status'>): Promise<string> {
    const id = `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const analysis: BIAnalysis = {
      ...analysisSpec,
      id,
      status: 'pending',
      createdAt: new Date()
    };

    this.analyses.set(id, analysis);
    this.analysisQueue.push({ id, priority: 1 });
    
    this.emit('analysisCreated', { analysis });
    this.processAnalysisQueue();
    
    return id;
  }

  public async runAnalysis(analysisId: string): Promise<BIAnalysis> {
    const analysis = this.analyses.get(analysisId);
    if (!analysis) {
      throw new Error(`Analysis not found: ${analysisId}`);
    }

    analysis.status = 'running';
    this.emit('analysisStarted', { analysisId });

    try {
      let data: unknown[];
      
      if (analysis.query) {
        // Execute custom query
        data = await this.executeQueryOnDataSource(
          this.dataSources.get(analysis.dataSource)!,
          analysis.query,
          {}
        );
      } else {
        // Use data source directly
        data = await this.loadDataFromSource(analysis.dataSource);
      }

      const results = await this.performAnalysis(analysis, data);
      
      analysis.results = results;
      analysis.status = 'completed';
      analysis.completedAt = new Date();
      
      this.emit('analysisCompleted', { analysisId, results });
      return analysis;
    } catch (error) {
      analysis.status = 'failed';
      analysis.error = error.message;
      
      this.emit('error', { type: 'analysis', analysisId, error });
      throw error;
    }
  }

  public async createReport(reportSpec: Omit<BIReport, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const report: BIReport = {
      ...reportSpec,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.reports.set(id, report);
    this.emit('reportCreated', { report });
    
    return id;
  }

  public async generateReport(
    reportId: string,
    options: {
      format?: 'html' | 'pdf' | 'excel' | 'json';
      filters?: BIFilter[];
      parameters?: { [key: string]: unknown };
    } = {}
  ): Promise<Buffer | string> {
    const report = this.reports.get(reportId);
    if (!report) {
      throw new Error(`Report not found: ${reportId}`);
    }

    this.emit('reportGenerationStarted', { reportId, options });

    try {
      const reportData = await this.collectReportData(report, options.filters, options.parameters);
      const output = await this.renderReport(report, reportData, options.format || 'html');
      
      this.emit('reportGenerated', { reportId, format: options.format });
      return output;
    } catch (error) {
      this.emit('error', { type: 'report', reportId, error });
      throw error;
    }
  }

  public async getInsights(
    dataSource: string,
    options: {
      type?: 'trends' | 'anomalies' | 'correlations' | 'all';
      timeRange?: { start: Date; end: Date };
      dimensions?: string[];
      metrics?: string[];
    } = {}
  ): Promise<Array<{
    type: string;
    title: string;
    description: string;
    confidence: number;
    data: unknown;
    visualization?: {
      type: string;
      config: unknown;
    };
  }>> {
    const insights: unknown[] = [];

    try {
      const data = await this.loadDataFromSource(dataSource, options);
      
      if (options.type === 'trends' || options.type === 'all') {
        const trends = await this.detectTrends(data, options.metrics);
        insights.push(...trends);
      }

      if (options.type === 'anomalies' || options.type === 'all') {
        const anomalies = await this.detectAnomalies(data, options.metrics);
        insights.push(...anomalies);
      }

      if (options.type === 'correlations' || options.type === 'all') {
        const correlations = await this.findCorrelations(data, options.metrics);
        insights.push(...correlations);
      }

      this.emit('insightsGenerated', { dataSource, insightCount: insights.length });
      return insights;
    } catch (error) {
      this.emit('error', { type: 'insights', dataSource, error });
      throw error;
    }
  }

  public getMetrics(): BIMetric[] {
    return Array.from(this.metrics.values());
  }

  public getDimensions(): BIDimension[] {
    return Array.from(this.dimensions.values());
  }

  public getReports(): BIReport[] {
    return Array.from(this.reports.values());
  }

  public getAnalyses(): BIAnalysis[] {
    return Array.from(this.analyses.values());
  }

  public async shutdown(): Promise<void> {
    this.isInitialized = false;
    this.cache.clear();
    this.analysisQueue.length = 0;
    this.emit('shutdown');
  }

  private async testDataSourceConnection(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    dataSource: BIDataSource
  ): Promise<void> {
    // Mock connection test - in real implementation, would test actual connection
    return new Promise((resolve) => {
      setTimeout(resolve, 100);
    });
  }

  private async introspectSchema(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    dataSource: BIDataSource
  ): Promise<unknown> {
    // Mock schema introspection - in real implementation, would query database metadata
    return {
      tables: [
        {
          name: 'workflows',
          columns: [
            { name: 'id', type: 'string', nullable: false },
            { name: 'name', type: 'string', nullable: false },
            { name: 'created_at', type: 'datetime', nullable: false },
            { name: 'status', type: 'string', nullable: false }
          ]
        },
        {
          name: 'executions',
          columns: [
            { name: 'id', type: 'string', nullable: false },
            { name: 'workflow_id', type: 'string', nullable: false },
            { name: 'status', type: 'string', nullable: false },
            { name: 'duration', type: 'number', nullable: true },
            { name: 'started_at', type: 'datetime', nullable: false }
          ]
        }
      ]
    };
  }

  private async loadConfigurations(): Promise<void> {
    // Mock configuration loading - in real implementation, would load from database
    // Create default metrics and dimensions
    await this.createMetric({
      name: 'Total Executions',
      description: 'Total number of workflow executions',
      type: 'count',
      category: 'Performance',
      aggregation: 'count',
      dimensions: ['workflow_id', 'status'],
      source: { table: 'executions', column: 'id' },
      isActive: true
    });

    await this.createDimension({
      name: 'Execution Status',
      description: 'Status of workflow execution',
      type: 'string',
      category: 'Performance',
      source: { table: 'executions', column: 'status' },
      values: ['success', 'failed', 'running', 'cancelled'],
      isActive: true
    });
  }

  private async executeQueryOnDataSource(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    dataSource: BIDataSource,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    sql: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    parameters: { [key: string]: unknown }
  ): Promise<unknown[]> {
    // Mock query execution - in real implementation, would execute on actual database
    return [
      { id: '1', name: 'Workflow 1', executions: 42, avg_duration: 1500 },
      { id: '2', name: 'Workflow 2', executions: 28, avg_duration: 2300 },
      { id: '3', name: 'Workflow 3', executions: 15, avg_duration: 800 }
    ];
  }

  private async loadDataFromSource(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    dataSourceId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    options?: unknown
  ): Promise<unknown[]> {
    // Mock data loading - in real implementation, would load from actual data source
    return [
      { date: '2024-01-01', executions: 100, avg_duration: 1200 },
      { date: '2024-01-02', executions: 120, avg_duration: 1100 },
      { date: '2024-01-03', executions: 85, avg_duration: 1500 },
      { date: '2024-01-04', executions: 110, avg_duration: 1300 }
    ];
  }

  private async processAnalysisQueue(): Promise<void> {
    if (this.analysisQueue.length === 0) return;

    const { id } = this.analysisQueue.shift()!;
    this.runAnalysis(id).catch(() => {
      // Error already handled in runAnalysis
    });
  }

  private async performAnalysis(
    analysis: BIAnalysis, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    data: unknown[]
  ): Promise<unknown> {
    // Mock analysis - in real implementation, would use ML libraries
    switch (analysis.type) {
      case 'trend':
        return {
          trend: 'increasing',
          slope: 0.05,
          r_squared: 0.85,
          insights: ['Execution count is trending upward', 'Average growth rate is 5% per day']
        };
      
      case 'forecasting':
        return {
          predictions: [
            { date: '2024-01-05', predicted_executions: 115, confidence: 0.9 },
            { date: '2024-01-06', predicted_executions: 125, confidence: 0.85 }
          ],
          model: 'ARIMA',
          accuracy: 0.92
        };
      
      case 'anomaly':
        return {
          anomalies: [
            { date: '2024-01-03', value: 85, expected: 110, deviation: -22.7, severity: 'medium' }
          ],
          algorithm: 'isolation_forest',
          threshold: 0.1
        };
      
      default:
        return { message: 'Analysis completed' };
    }
  }

  private async collectReportData(
    report: BIReport,
    filters?: BIFilter[],
    parameters?: { [key: string]: unknown }
  ): Promise<{ [sectionId: string]: unknown }> {
    const data: { [sectionId: string]: unknown } = {};

    for (const section of report.layout.sections) {
      if (section.dataSource && section.query) {
        data[section.id] = await this.executeQueryOnDataSource(
          this.dataSources.get(section.dataSource)!,
          section.query,
          parameters || {}
        );
      }
    }

    return data;
  }

  private async renderReport(
    report: BIReport,
    data: { [sectionId: string]: unknown },
    format: string
  ): Promise<Buffer | string> {
    // Mock report rendering - in real implementation, would use report templates
    if (format === 'json') {
      return JSON.stringify({ report, data }, null, 2);
    }
    
    return `<html><body><h1>${report.name}</h1><pre>${JSON.stringify(data, null, 2)}</pre></body></html>`;
  }

  private async detectTrends(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    data: unknown[], 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    metrics?: string[]
  ): Promise<unknown[]> {
    return [{
      type: 'trend',
      title: 'Increasing Execution Volume',
      description: 'Workflow executions have increased by 15% over the last week',
      confidence: 0.89,
      data: { change: 0.15, period: '7d' }
    }];
  }

  private async detectAnomalies(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    data: unknown[], 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    metrics?: string[]
  ): Promise<unknown[]> {
    return [{
      type: 'anomaly',
      title: 'Unusual Execution Duration',
      description: 'Average execution duration spiked on 2024-01-03',
      confidence: 0.92,
      data: { date: '2024-01-03', value: 1500, expected: 1200, deviation: 0.25 }
    }];
  }

  private async findCorrelations(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    data: unknown[], 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    metrics?: string[]
  ): Promise<unknown[]> {
    return [{
      type: 'correlation',
      title: 'Negative Correlation: Volume vs Duration',
      description: 'Higher execution volumes correlate with shorter average durations',
      confidence: 0.76,
      data: { correlation: -0.68, metrics: ['executions', 'avg_duration'] }
    }];
  }
}