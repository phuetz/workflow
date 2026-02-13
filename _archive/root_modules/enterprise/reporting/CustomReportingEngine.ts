import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import * as cron from 'node-cron';

export interface ReportDefinition {
  id: string;
  name: string;
  description?: string;
  type: 'operational' | 'analytical' | 'executive' | 'compliance' | 'custom';
  dataSource: DataSource;
  query: QueryDefinition;
  visualization?: VisualizationConfig;
  schedule?: ScheduleConfig;
  distribution?: DistributionConfig;
  parameters?: ParameterDefinition[];
  filters?: FilterDefinition[];
  aggregations?: AggregationDefinition[];
  format: ReportFormat[];
  metadata: {
    createdAt: Date;
    createdBy: string;
    updatedAt: Date;
    updatedBy: string;
    version: number;
    tags?: string[];
    category?: string;
  };
}

export interface DataSource {
  type: 'database' | 'api' | 'file' | 'stream' | 'workflow' | 'custom';
  connection: ConnectionConfig;
  schema?: string;
  table?: string;
  endpoint?: string;
  authentication?: Record<string, unknown>;
  cache?: CacheConfig;
}

export interface ConnectionConfig {
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  url?: string;
  options?: Record<string, unknown>;
}

export interface CacheConfig {
  enabled: boolean;
  ttl: number; // seconds
  key?: string;
  invalidation?: 'time-based' | 'event-based' | 'manual';
}

export interface QueryDefinition {
  type: 'sql' | 'nosql' | 'graphql' | 'rest' | 'custom';
  query: string;
  bindings?: Record<string, unknown>;
  timeout?: number;
  maxRows?: number;
  pagination?: {
    enabled: boolean;
    pageSize: number;
    strategy: 'offset' | 'cursor' | 'keyset';
  };
}

export interface VisualizationConfig {
  charts: ChartConfig[];
  layout: LayoutConfig;
  theme?: ThemeConfig;
  interactive?: boolean;
  exportable?: boolean;
}

export interface ChartConfig {
  id: string;
  type: 'line' | 'bar' | 'pie' | 'donut' | 'area' | 'scatter' | 'heatmap' | 'gauge' | 'table' | 'metric' | 'map' | 'custom';
  title: string;
  dataMapping: {
    x?: string | string[];
    y?: string | string[];
    series?: string;
    value?: string;
    label?: string;
    color?: string;
    size?: string;
    [key: string]: unknown;
  };
  options?: {
    legend?: boolean;
    grid?: boolean;
    animation?: boolean;
    responsive?: boolean;
    [key: string]: unknown;
  };
  position?: { x: number; y: number; width: number; height: number };
}

export interface LayoutConfig {
  type: 'grid' | 'flex' | 'absolute' | 'dashboard';
  columns?: number;
  rows?: number;
  gap?: number;
  responsive?: boolean;
}

export interface ThemeConfig {
  colors?: string[];
  font?: {
    family?: string;
    size?: number;
  };
  background?: string;
  dark?: boolean;
}

export interface ScheduleConfig {
  enabled: boolean;
  frequency: 'once' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
  cron?: string;
  timezone?: string;
  startDate?: Date;
  endDate?: Date;
  retryOnFailure?: boolean;
  maxRetries?: number;
}

export interface DistributionConfig {
  enabled: boolean;
  recipients: Recipient[];
  channels: DistributionChannel[];
  conditions?: DistributionCondition[];
  template?: EmailTemplate;
}

export interface Recipient {
  type: 'user' | 'group' | 'role' | 'email' | 'webhook';
  id?: string;
  email?: string;
  name?: string;
  metadata?: Record<string, unknown>;
}

export interface DistributionChannel {
  type: 'email' | 'slack' | 'teams' | 'webhook' | 'sftp' | 's3' | 'api';
  config: Record<string, unknown>;
  format?: ReportFormat;
}

export interface DistributionCondition {
  field: string;
  operator: 'equals' | 'not-equals' | 'greater' | 'less' | 'contains' | 'threshold';
  value: unknown;
  action: 'send' | 'skip' | 'alert';
}

export interface EmailTemplate {
  subject: string;
  body: string;
  attachReport: boolean;
  embedCharts?: boolean;
  includeLink?: boolean;
}

export interface ParameterDefinition {
  name: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'datetime' | 'boolean' | 'select' | 'multiselect';
  required?: boolean;
  defaultValue?: unknown;
  options?: Array<{ label: string; value: unknown }>;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    custom?: (value: unknown) => boolean;
  };
}

export interface FilterDefinition {
  field: string;
  operator: 'equals' | 'not-equals' | 'in' | 'not-in' | 'between' | 'greater' | 'less' | 'like' | 'not-like';
  value: unknown;
  dataType?: 'string' | 'number' | 'date' | 'boolean';
  caseSensitive?: boolean;
}

export interface AggregationDefinition {
  field: string;
  function: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'distinct' | 'percentile' | 'stddev' | 'variance';
  alias?: string;
  groupBy?: string[];
  having?: FilterDefinition;
}

export type ReportFormat = 'pdf' | 'excel' | 'csv' | 'json' | 'xml' | 'html' | 'png' | 'svg';

export interface ReportExecution {
  id: string;
  reportId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  parameters?: Record<string, unknown>;
  result?: ReportResult;
  error?: string;
  retries?: number;
}

export interface ReportResult {
  data: unknown[];
  metadata: {
    rowCount: number;
    executionTime: number;
    query?: string;
    parameters?: Record<string, unknown>;
  };
  visualizations?: GeneratedVisualization[];
  files?: GeneratedFile[];
}

export interface GeneratedVisualization {
  chartId: string;
  type: string;
  data: unknown;
  image?: string; // base64
  interactive?: Record<string, unknown>; // JSON for interactive charts
}

export interface GeneratedFile {
  format: ReportFormat;
  path?: string;
  content?: Buffer | string;
  size: number;
  checksum?: string;
}

export interface ReportTemplate {
  id: string;
  name: string;
  category: string;
  description?: string;
  thumbnail?: string;
  definition: Partial<ReportDefinition>;
  sample?: {
    data?: unknown;
    preview?: string;
  };
  tags?: string[];
  popularity?: number;
}

export class CustomReportingEngine extends EventEmitter {
  private reports: Map<string, ReportDefinition> = new Map();
  private executions: Map<string, ReportExecution> = new Map();
  private schedules: Map<string, cron.ScheduledTask> = new Map();
  private templates: Map<string, ReportTemplate> = new Map();
  private dataConnections: Map<string, unknown> = new Map();
  private cache: Map<string, { data: unknown; expires: Date }> = new Map();

  constructor() {
    super();
    this.initializeTemplates();
    this.startCacheCleanup();
  }

  private initializeTemplates(): void {
    // Initialize built-in report templates
    const templates: ReportTemplate[] = [
      {
        id: 'workflow-performance',
        name: 'Workflow Performance Report',
        category: 'operational',
        description: 'Analyze workflow execution performance and bottlenecks',
        definition: {
          type: 'operational',
          query: {
            type: 'sql',
            query: `
              SELECT 
                w.name as workflow_name,
                COUNT(e.id) as execution_count,
                AVG(e.duration) as avg_duration,
                MIN(e.duration) as min_duration,
                MAX(e.duration) as max_duration,
                SUM(CASE WHEN e.status = 'failed' THEN 1 ELSE 0 END) as failed_count
              FROM workflows w
              JOIN executions e ON w.id = e.workflow_id
              WHERE e.created_at BETWEEN :start_date AND :end_date
              GROUP BY w.id, w.name
              ORDER BY execution_count DESC
            `
          },
          visualization: {
            charts: [
              {
                id: 'execution-trend',
                type: 'line',
                title: 'Execution Trend',
                dataMapping: {
                  x: 'date',
                  y: 'count',
                  series: 'workflow_name'
                }
              },
              {
                id: 'performance-metrics',
                type: 'bar',
                title: 'Average Duration by Workflow',
                dataMapping: {
                  x: 'workflow_name',
                  y: 'avg_duration'
                }
              }
            ],
            layout: { type: 'grid', columns: 2 }
          }
        },
        tags: ['performance', 'workflow', 'operational']
      },
      {
        id: 'user-activity',
        name: 'User Activity Report',
        category: 'analytical',
        description: 'Track user engagement and activity patterns',
        definition: {
          type: 'analytical',
          query: {
            type: 'sql',
            query: `
              SELECT 
                u.name as user_name,
                COUNT(DISTINCT DATE(a.created_at)) as active_days,
                COUNT(a.id) as total_actions,
                COUNT(DISTINCT a.workflow_id) as workflows_used
              FROM users u
              JOIN audit_logs a ON u.id = a.user_id
              WHERE a.created_at BETWEEN :start_date AND :end_date
              GROUP BY u.id, u.name
            `
          }
        }
      },
      {
        id: 'executive-dashboard',
        name: 'Executive Dashboard',
        category: 'executive',
        description: 'High-level KPIs and business metrics',
        definition: {
          type: 'executive',
          visualization: {
            charts: [
              {
                id: 'kpi-metrics',
                type: 'metric',
                title: 'Key Performance Indicators',
                dataMapping: {
                  value: 'value',
                  label: 'metric'
                }
              }
            ],
            layout: { type: 'dashboard' }
          }
        }
      }
    ];

    for (const template of templates) {
      this.templates.set(template.id, template);
    }
  }

  // Report Management
  public async createReport(definition: Omit<ReportDefinition, 'id'>): Promise<ReportDefinition> {
    const report: ReportDefinition = {
      ...definition,
      id: crypto.randomUUID(),
      metadata: {
        ...definition.metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1
      }
    };

    // Validate report definition
    this.validateReportDefinition(report);

    // Test data source connection
    await this.testDataSource(report.dataSource);

    // Store report
    this.reports.set(report.id, report);

    // Schedule if configured
    if (report.schedule?.enabled) {
      this.scheduleReport(report);
    }

    this.emit('report:created', report);
    return report;
  }

  private validateReportDefinition(report: ReportDefinition): void {
    // Validate required fields
    if (!report.name) {
      throw new Error('Report name is required');
    }

    if (!report.dataSource) {
      throw new Error('Data source is required');
    }

    if (!report.query) {
      throw new Error('Query definition is required');
    }

    // Validate query syntax
    this.validateQuery(report.query);

    // Validate parameters
    if (report.parameters) {
      for (const param of report.parameters) {
        if (!param.name || !param.type) {
          throw new Error(`Invalid parameter definition: ${JSON.stringify(param)}`);
        }
      }
    }

    // Validate visualization
    if (report.visualization) {
      for (const chart of report.visualization.charts) {
        if (!chart.type || !chart.dataMapping) {
          throw new Error(`Invalid chart configuration: ${chart.id}`);
        }
      }
    }
  }

  private validateQuery(query: QueryDefinition): void {
    // Basic SQL injection prevention
    if (query.type === 'sql') {
      const dangerousPatterns = [
        /;\s*DROP/i,
        /;\s*DELETE/i,
        /;\s*UPDATE/i,
        /;\s*INSERT/i,
        /;\s*CREATE/i,
        /;\s*ALTER/i
      ];

      for (const pattern of dangerousPatterns) {
        if (pattern.test(query.query)) {
          throw new Error('Potentially dangerous SQL detected');
        }
      }
    }
  }

  private async testDataSource(dataSource: DataSource): Promise<void> {
    try {
      const connection = await this.getConnection(dataSource);
      
      // Test connection based on type
      switch (dataSource.type) {
        case 'database':
          await this.testDatabaseConnection(connection);
          break;
        case 'api':
          await this.testAPIConnection(dataSource);
          break;
        case 'file':
          await this.testFileAccess(dataSource);
          break;
      }
    } catch (error) {
      throw new Error(`Data source connection failed: ${error.message}`);
    }
  }

  private async getConnection(dataSource: DataSource): Promise<unknown> {
    const key = this.getConnectionKey(dataSource);
    
    if (this.dataConnections.has(key)) {
      return this.dataConnections.get(key);
    }

    // Create new connection based on type
    let connection: unknown;
    
    switch (dataSource.type) {
      case 'database':
        connection = await this.createDatabaseConnection(dataSource.connection);
        break;
      case 'api':
        connection = this.createAPIClient(dataSource);
        break;
      default:
        connection = null;
    }

    if (connection) {
      this.dataConnections.set(key, connection);
    }

    return connection;
  }

  private getConnectionKey(dataSource: DataSource): string {
    return crypto.createHash('md5')
      .update(JSON.stringify(dataSource.connection))
      .digest('hex');
  }

  private async createDatabaseConnection(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    config: ConnectionConfig): Promise<unknown> {
    // In a real implementation, create actual database connection
    // This is a placeholder
    return {
      query: async (// eslint-disable-next-line @typescript-eslint/no-unused-vars
        sql: string,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        params?: unknown[]) => {
        // Execute query
        return [];
      }
    };
  }

  private createAPIClient(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    dataSource: DataSource): unknown {
    // Create API client based on configuration
    return {
      request: async (
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        endpoint: string,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        options?: unknown) => {
        // Make API request
        return {};
      }
    };
  }

  private async testDatabaseConnection(connection: unknown): Promise<void> {
    await connection.query('SELECT 1');
  }

  private async testAPIConnection(dataSource: DataSource): Promise<void> {
    const response = await fetch(dataSource.endpoint || dataSource.connection.url!);
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }
  }

  private async testFileAccess(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    dataSource: DataSource): Promise<void> {
    // Test file access
  }

  // Report Execution
  public async executeReport(
    reportId: string,
    parameters?: Record<string, unknown>
  ): Promise<ReportExecution> {
    const report = this.reports.get(reportId);
    if (!report) {
      throw new Error(`Report not found: ${reportId}`);
    }

    // Validate parameters
    if (report.parameters) {
      this.validateParameters(report.parameters, parameters || {});
    }

    const execution: ReportExecution = {
      id: crypto.randomUUID(),
      reportId,
      status: 'pending',
      startTime: new Date(),
      parameters
    };

    this.executions.set(execution.id, execution);
    this.emit('execution:started', execution);

    // Execute asynchronously
    this.runExecution(report, execution).catch(error => {
      execution.status = 'failed';
      execution.error = error.message;
      this.emit('execution:failed', execution);
    });

    return execution;
  }

  private validateParameters(
    definitions: ParameterDefinition[],
    values: Record<string, unknown>
  ): void {
    for (const def of definitions) {
      const value = values[def.name];

      // Check required
      if (def.required && value === undefined) {
        throw new Error(`Required parameter missing: ${def.name}`);
      }

      // Skip validation if not provided and not required
      if (value === undefined) continue;

      // Type validation
      switch (def.type) {
        case 'number':
          if (typeof value !== 'number') {
            throw new Error(`Parameter ${def.name} must be a number`);
          }
          if (def.validation?.min !== undefined && value < def.validation.min) {
            throw new Error(`Parameter ${def.name} must be >= ${def.validation.min}`);
          }
          if (def.validation?.max !== undefined && value > def.validation.max) {
            throw new Error(`Parameter ${def.name} must be <= ${def.validation.max}`);
          }
          break;

        case 'string':
          if (typeof value !== 'string') {
            throw new Error(`Parameter ${def.name} must be a string`);
          }
          if (def.validation?.pattern) {
            const regex = new RegExp(def.validation.pattern);
            if (!regex.test(value)) {
              throw new Error(`Parameter ${def.name} does not match pattern`);
            }
          }
          break;

        case 'date':
        case 'datetime':
          if (!(value instanceof Date) && !Date.parse(value)) {
            throw new Error(`Parameter ${def.name} must be a valid date`);
          }
          break;
      }

      // Custom validation
      if (def.validation?.custom && !def.validation.custom(value)) {
        throw new Error(`Parameter ${def.name} failed custom validation`);
      }
    }
  }

  private async runExecution(
    report: ReportDefinition,
    execution: ReportExecution
  ): Promise<void> {
    execution.status = 'running';

    try {
      // Check cache
      const cacheKey = this.getCacheKey(report, execution.parameters);
      const cached = this.getFromCache(cacheKey);
      
      if (cached && report.dataSource.cache?.enabled) {
        execution.result = cached;
        execution.status = 'completed';
        execution.endTime = new Date();
        execution.duration = execution.endTime.getTime() - execution.startTime.getTime();
        this.emit('execution:completed', execution);
        return;
      }

      // Execute query
      const data = await this.executeQuery(report, execution.parameters);

      // Apply filters
      let filteredData = data;
      if (report.filters) {
        filteredData = this.applyFilters(data, report.filters);
      }

      // Apply aggregations
      if (report.aggregations) {
        filteredData = this.applyAggregations(filteredData, report.aggregations);
      }

      // Generate visualizations
      let visualizations: GeneratedVisualization[] = [];
      if (report.visualization) {
        visualizations = await this.generateVisualizations(
          filteredData,
          report.visualization
        );
      }

      // Generate output files
      const files = await this.generateOutputFiles(
        report,
        filteredData,
        visualizations
      );

      // Create result
      execution.result = {
        data: filteredData,
        metadata: {
          rowCount: filteredData.length,
          executionTime: Date.now() - execution.startTime.getTime(),
          query: report.query.query,
          parameters: execution.parameters
        },
        visualizations,
        files
      };

      // Cache result
      if (report.dataSource.cache?.enabled) {
        this.addToCache(cacheKey, execution.result, report.dataSource.cache.ttl);
      }

      execution.status = 'completed';
      execution.endTime = new Date();
      execution.duration = execution.endTime.getTime() - execution.startTime.getTime();

      // Distribute if configured
      if (report.distribution?.enabled) {
        await this.distributeReport(report, execution);
      }

      this.emit('execution:completed', execution);

    } catch (error) {
      execution.status = 'failed';
      execution.error = error.message;
      execution.endTime = new Date();
      execution.duration = execution.endTime.getTime() - execution.startTime.getTime();
      
      throw error;
    }
  }

  private async executeQuery(
    report: ReportDefinition,
    parameters?: Record<string, unknown>
  ): Promise<unknown[]> {
    const connection = await this.getConnection(report.dataSource);
    
    switch (report.query.type) {
      case 'sql':
        return this.executeSQLQuery(connection, report.query, parameters);
      case 'nosql':
        return this.executeNoSQLQuery(connection, report.query, parameters);
      case 'graphql':
        return this.executeGraphQLQuery(connection, report.query, parameters);
      case 'rest':
        return this.executeRESTQuery(connection, report.query, parameters);
      default:
        throw new Error(`Unsupported query type: ${report.query.type}`);
    }
  }

  private async executeSQLQuery(
    connection: unknown,
    query: QueryDefinition,
    parameters?: Record<string, unknown>
  ): Promise<unknown[]> {
    // Replace parameters in query
    let sql = query.query;
    const bindings: unknown[] = [];

    if (parameters) {
      // Replace named parameters
      sql = sql.replace(/:(\w+)/g, (match, name) => {
        if (parameters[name] !== undefined) {
          bindings.push(parameters[name]);
          return '?';
        }
        return match;
      });
    }

    // Execute query
    const result = await connection.query(sql, bindings);
    
    // Apply pagination if needed
    if (query.pagination?.enabled) {
      // Handle pagination
    }

    return result;
  }

  private async executeNoSQLQuery(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    connection: unknown,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    query: QueryDefinition,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    parameters?: Record<string, unknown>
  ): Promise<unknown[]> {
    // Execute NoSQL query
    return [];
  }

  private async executeGraphQLQuery(
    connection: unknown,
    query: QueryDefinition,
    parameters?: Record<string, unknown>
  ): Promise<unknown[]> {
    // Execute GraphQL query
    const response = await connection.request(query.query, parameters);
    return response.data;
  }

  private async executeRESTQuery(
    connection: unknown,
    query: QueryDefinition,
    parameters?: Record<string, unknown>
  ): Promise<unknown[]> {
    // Execute REST API call
    const response = await connection.request(query.query, {
      params: parameters
    });
    return response.data;
  }

  private applyFilters(data: unknown[], filters: FilterDefinition[]): unknown[] {
    return data.filter(row => {
      for (const filter of filters) {
        const value = row[filter.field];
        
        switch (filter.operator) {
          case 'equals':
            if (value !== filter.value) return false;
            break;
          case 'not-equals':
            if (value === filter.value) return false;
            break;
          case 'in':
            if (!filter.value.includes(value)) return false;
            break;
          case 'not-in':
            if (filter.value.includes(value)) return false;
            break;
          case 'between':
            if (value < filter.value[0] || value > filter.value[1]) return false;
            break;
          case 'greater':
            if (value <= filter.value) return false;
            break;
          case 'less':
            if (value >= filter.value) return false;
            break;
          case 'like':
            if (!String(value).includes(filter.value)) return false;
            break;
          case 'not-like':
            if (String(value).includes(filter.value)) return false;
            break;
        }
      }
      
      return true;
    });
  }

  private applyAggregations(
    data: unknown[],
    aggregations: AggregationDefinition[]
  ): unknown[] {
    // Group data if needed
    const groups = new Map<string, unknown[]>();
    
    if (aggregations[0]?.groupBy) {
      for (const row of data) {
        const key = aggregations[0].groupBy
          .map(field => row[field])
          .join('|');
        
        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key)!.push(row);
      }
    } else {
      groups.set('all', data);
    }

    // Apply aggregations
    const results: unknown[] = [];
    
    for (const [key, groupData] of groups.entries()) {
      const result: Record<string, unknown> = {};
      
      // Add group by fields
      if (aggregations[0]?.groupBy) {
        const keyParts = key.split('|');
        aggregations[0].groupBy.forEach((field, index) => {
          result[field] = keyParts[index];
        });
      }

      // Apply aggregation functions
      for (const agg of aggregations) {
        const values = groupData.map(row => row[agg.field]).filter(v => v !== null && v !== undefined);
        const alias = agg.alias || `${agg.function}_${agg.field}`;
        
        switch (agg.function) {
          case 'sum':
            result[alias] = values.reduce((a, b) => a + b, 0);
            break;
          case 'avg':
            result[alias] = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
            break;
          case 'count':
            result[alias] = values.length;
            break;
          case 'min':
            result[alias] = Math.min(...values);
            break;
          case 'max':
            result[alias] = Math.max(...values);
            break;
          case 'distinct':
            result[alias] = new Set(values).size;
            break;
          case 'percentile':
            // Calculate percentile
            break;
          case 'stddev':
            // Calculate standard deviation
            break;
          case 'variance':
            // Calculate variance
            break;
        }
      }

      // Apply having filter
      if (aggregations[0]?.having) {
        // Check having condition
      }

      results.push(result);
    }

    return results;
  }

  // Visualization Generation
  private async generateVisualizations(
    data: unknown[],
    config: VisualizationConfig
  ): Promise<GeneratedVisualization[]> {
    const visualizations: GeneratedVisualization[] = [];

    for (const chartConfig of config.charts) {
      const visualization = await this.generateChart(data, chartConfig);
      visualizations.push(visualization);
    }

    return visualizations;
  }

  private async generateChart(
    data: unknown[],
    config: ChartConfig
  ): Promise<GeneratedVisualization> {
    // Prepare data for chart
    const chartData = this.prepareChartData(data, config);

    // Generate chart based on type
    let chartResult: unknown;
    
    switch (config.type) {
      case 'line':
        chartResult = this.generateLineChart(chartData, config);
        break;
      case 'bar':
        chartResult = this.generateBarChart(chartData, config);
        break;
      case 'pie':
        chartResult = this.generatePieChart(chartData, config);
        break;
      case 'table':
        chartResult = this.generateTable(chartData, config);
        break;
      case 'metric':
        chartResult = this.generateMetricCard(chartData, config);
        break;
      // Add other chart types
      default:
        chartResult = { type: config.type, data: chartData };
    }

    return {
      chartId: config.id,
      type: config.type,
      data: chartResult,
      image: await this.renderChartToImage(chartResult, config)
    };
  }

  private prepareChartData(data: unknown[], config: ChartConfig): unknown {
    const prepared: Record<string, unknown> = {
      labels: [],
      datasets: []
    };

    // Extract data based on mapping
    if (config.dataMapping.x) {
      prepared.labels = data.map(row => row[config.dataMapping.x as string]);
    }

    if (config.dataMapping.y) {
      const yFields = Array.isArray(config.dataMapping.y) 
        ? config.dataMapping.y 
        : [config.dataMapping.y];

      for (const field of yFields) {
        prepared.datasets.push({
          label: field,
          data: data.map(row => row[field])
        });
      }
    }

    if (config.dataMapping.series) {
      // Group by series
      const series = new Map<string, unknown[]>();
      
      for (const row of data) {
        const seriesKey = row[config.dataMapping.series];
        if (!series.has(seriesKey)) {
          series.set(seriesKey, []);
        }
        series.get(seriesKey)!.push(row);
      }

      prepared.datasets = Array.from(series.entries()).map(([key, values]) => ({
        label: key,
        data: values.map(v => v[config.dataMapping.y as string])
      }));
    }

    return prepared;
  }

  private generateLineChart(data: unknown, config: ChartConfig): unknown {
    return {
      type: 'line',
      data,
      options: {
        responsive: config.options?.responsive !== false,
        plugins: {
          legend: {
            display: config.options?.legend !== false
          },
          title: {
            display: true,
            text: config.title
          }
        },
        scales: {
          x: {
            display: true,
            title: {
              display: true,
              text: config.dataMapping.x as string
            }
          },
          y: {
            display: true,
            title: {
              display: true,
              text: config.dataMapping.y as string
            }
          }
        }
      }
    };
  }

  private generateBarChart(data: unknown, config: ChartConfig): unknown {
    return {
      type: 'bar',
      data,
      options: {
        responsive: config.options?.responsive !== false,
        plugins: {
          legend: {
            display: config.options?.legend !== false
          },
          title: {
            display: true,
            text: config.title
          }
        }
      }
    };
  }

  private generatePieChart(data: unknown, config: ChartConfig): unknown {
    return {
      type: 'pie',
      data: {
        labels: data.map((d: Record<string, unknown>) => d[config.dataMapping.label!]),
        datasets: [{
          data: data.map((d: Record<string, unknown>) => d[config.dataMapping.value!])
        }]
      },
      options: {
        responsive: config.options?.responsive !== false,
        plugins: {
          legend: {
            display: config.options?.legend !== false
          },
          title: {
            display: true,
            text: config.title
          }
        }
      }
    };
  }

  private generateTable(data: unknown, config: ChartConfig): unknown {
    return {
      type: 'table',
      headers: Object.keys(data[0] || {}),
      rows: data,
      title: config.title
    };
  }

  private generateMetricCard(data: unknown, config: ChartConfig): unknown {
    const value = data[0]?.[config.dataMapping.value!] || 0;
    const label = data[0]?.[config.dataMapping.label!] || config.title;

    return {
      type: 'metric',
      value,
      label,
      title: config.title,
      format: config.options?.format
    };
  }

  private async renderChartToImage(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    chart: unknown,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    config: ChartConfig
  ): Promise<string> {
    // In a real implementation, use a library like Chart.js with node-canvas
    // or puppeteer to render charts
    return 'data:image/png;base64,iVBORw0KGgoAAAANS...'; // Placeholder
  }

  // Output Generation
  private async generateOutputFiles(
    report: ReportDefinition,
    data: unknown[],
    visualizations: GeneratedVisualization[]
  ): Promise<GeneratedFile[]> {
    const files: GeneratedFile[] = [];

    for (const format of report.format) {
      const file = await this.generateOutputFile(
        report,
        data,
        visualizations,
        format
      );
      files.push(file);
    }

    return files;
  }

  private async generateOutputFile(
    report: ReportDefinition,
    data: unknown[],
    visualizations: GeneratedVisualization[],
    format: ReportFormat
  ): Promise<GeneratedFile> {
    let content: Buffer | string;

    switch (format) {
      case 'pdf':
        content = await this.generatePDF(report, data, visualizations);
        break;
      case 'excel':
        content = await this.generateExcel(report, data, visualizations);
        break;
      case 'csv':
        content = this.generateCSV(data);
        break;
      case 'json':
        content = JSON.stringify({ report, data, visualizations }, null, 2);
        break;
      case 'html':
        content = await this.generateHTML(report, data, visualizations);
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    const size = Buffer.isBuffer(content) ? content.length : Buffer.byteLength(content);
    const checksum = crypto.createHash('md5').update(content).digest('hex');

    return {
      format,
      content,
      size,
      checksum
    };
  }

  private async generatePDF(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    report: ReportDefinition,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    data: unknown[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    visualizations: GeneratedVisualization[]
  ): Promise<Buffer> {
    // Use puppeteer or pdfkit to generate PDF
    return Buffer.from('PDF content');
  }

  private async generateExcel(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    report: ReportDefinition,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    data: unknown[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    visualizations: GeneratedVisualization[]
  ): Promise<Buffer> {
    // Use exceljs to generate Excel file
    return Buffer.from('Excel content');
  }

  private generateCSV(data: unknown[]): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const rows = [
      headers.join(','),
      ...data.map(row => 
        headers.map(h => {
          const value = row[h];
          // Escape values containing commas or quotes
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ];

    return rows.join('\n');
  }

  private async generateHTML(
    report: ReportDefinition,
    data: unknown[],
    visualizations: GeneratedVisualization[]
  ): Promise<string> {
    return `<!DOCTYPE html>
<html>
<head>
    <title>${report.name}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; }
        table { border-collapse: collapse; width: 100%; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; font-weight: bold; }
        .chart { margin: 20px 0; }
        .metric { display: inline-block; margin: 10px; padding: 20px; background: #f0f0f0; border-radius: 5px; }
        .metric-value { font-size: 2em; font-weight: bold; }
        .metric-label { color: #666; }
    </style>
</head>
<body>
    <h1>${report.name}</h1>
    ${report.description ? `<p>${report.description}</p>` : ''}
    
    ${visualizations.map(viz => this.renderVisualizationHTML(viz)).join('')}
    
    <h2>Data</h2>
    ${this.renderTableHTML(data)}
    
    <footer>
        <p>Generated on ${new Date().toLocaleString()}</p>
    </footer>
</body>
</html>`;
  }

  private renderVisualizationHTML(viz: GeneratedVisualization): string {
    if (viz.type === 'table') {
      return `<div class="chart">${this.renderTableHTML(viz.data.rows)}</div>`;
    }
    
    if (viz.type === 'metric') {
      return `
        <div class="metric">
            <div class="metric-value">${viz.data.value}</div>
            <div class="metric-label">${viz.data.label}</div>
        </div>
      `;
    }

    if (viz.image) {
      return `<div class="chart"><img src="${viz.image}" alt="${viz.chartId}" /></div>`;
    }

    return '';
  }

  private renderTableHTML(data: unknown[]): string {
    if (data.length === 0) return '<p>No data available</p>';

    const headers = Object.keys(data[0]);
    
    return `
      <table>
        <thead>
          <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${data.map(row => 
            `<tr>${headers.map(h => `<td>${row[h] || ''}</td>`).join('')}</tr>`
          ).join('')}
        </tbody>
      </table>
    `;
  }

  // Report Distribution
  private async distributeReport(
    report: ReportDefinition,
    execution: ReportExecution
  ): Promise<void> {
    if (!report.distribution || !execution.result) return;

    // Check conditions
    if (report.distribution.conditions) {
      const shouldDistribute = this.checkDistributionConditions(
        execution.result,
        report.distribution.conditions
      );
      
      if (!shouldDistribute) {
        this.emit('distribution:skipped', { reportId: report.id, reason: 'conditions not met' });
        return;
      }
    }

    // Distribute to each channel
    for (const channel of report.distribution.channels) {
      try {
        await this.distributeToChannel(
          report,
          execution,
          channel,
          report.distribution.recipients
        );
        
        this.emit('distribution:sent', { 
          reportId: report.id,
          channel: channel.type,
          recipients: report.distribution.recipients.length
        });
      } catch (error) {
        this.emit('distribution:error', { 
          reportId: report.id,
          channel: channel.type,
          error: error.message
        });
      }
    }
  }

  private checkDistributionConditions(
    result: ReportResult,
    conditions: DistributionCondition[]
  ): boolean {
    for (const condition of conditions) {
      const value = result.data[0]?.[condition.field];
      
      let conditionMet = false;
      switch (condition.operator) {
        case 'equals':
          conditionMet = value === condition.value;
          break;
        case 'not-equals':
          conditionMet = value !== condition.value;
          break;
        case 'greater':
          conditionMet = value > condition.value;
          break;
        case 'less':
          conditionMet = value < condition.value;
          break;
        case 'contains':
          conditionMet = String(value).includes(condition.value);
          break;
        case 'threshold':
          // Check if threshold exceeded
          conditionMet = Math.abs(value - condition.value) > 0.1;
          break;
      }

      if (condition.action === 'skip' && conditionMet) {
        return false;
      }
      
      if (condition.action === 'send' && !conditionMet) {
        return false;
      }
    }
    
    return true;
  }

  private async distributeToChannel(
    report: ReportDefinition,
    execution: ReportExecution,
    channel: DistributionChannel,
    recipients: Recipient[]
  ): Promise<void> {
    switch (channel.type) {
      case 'email':
        await this.sendEmailReport(report, execution, channel, recipients);
        break;
      case 'slack':
        await this.sendSlackReport(report, execution, channel);
        break;
      case 'teams':
        await this.sendTeamsReport(report, execution, channel);
        break;
      case 'webhook':
        await this.sendWebhookReport(report, execution, channel);
        break;
      case 's3':
        await this.uploadToS3(report, execution, channel);
        break;
      case 'sftp':
        await this.uploadToSFTP(report, execution, channel);
        break;
    }
  }

  private async sendEmailReport(
    report: ReportDefinition,
    execution: ReportExecution,
    channel: DistributionChannel,
    recipients: Recipient[]
  ): Promise<void> {
    const emailAddresses = recipients
      .filter(r => r.type === 'email' || r.email)
      .map(r => r.email!);

    if (emailAddresses.length === 0) return;

    const template = report.distribution?.template;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const subject = template?.subject || `Report: ${report.name}`;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const body = template?.body || `Please find the attached report: ${report.name}`;

    // Prepare attachments
    const attachments: unknown[] = [];
    
    if (template?.attachReport && execution.result?.files) {
      const format = channel.format || report.format[0];
      const file = execution.result.files.find(f => f.format === format);
      
      if (file) {
        attachments.push({
          filename: `${report.name}.${format}`,
          content: file.content
        });
      }
    }

    // Send email
    // In a real implementation, use an email service
  }

  private async sendSlackReport(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    report: ReportDefinition,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    execution: ReportExecution,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    channel: DistributionChannel
  ): Promise<void> {
    // Send to Slack webhook
  }

  private async sendTeamsReport(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    report: ReportDefinition,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    execution: ReportExecution,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    channel: DistributionChannel
  ): Promise<void> {
    // Send to Microsoft Teams
  }

  private async sendWebhookReport(
    report: ReportDefinition,
    execution: ReportExecution,
    channel: DistributionChannel
  ): Promise<void> {
    await fetch(channel.config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...channel.config.headers
      },
      body: JSON.stringify({
        report: {
          id: report.id,
          name: report.name,
          executionId: execution.id
        },
        result: execution.result
      })
    });
  }

  private async uploadToS3(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    report: ReportDefinition,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    execution: ReportExecution,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    channel: DistributionChannel
  ): Promise<void> {
    // Upload to S3
  }

  private async uploadToSFTP(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    report: ReportDefinition,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    execution: ReportExecution,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    channel: DistributionChannel
  ): Promise<void> {
    // Upload to SFTP
  }

  // Scheduling
  private scheduleReport(report: ReportDefinition): void {
    if (!report.schedule || !report.schedule.enabled) return;

    const cronExpression = this.getCronExpression(report.schedule);
    
    const task = cron.schedule(cronExpression, async () => {
      try {
        await this.executeReport(report.id);
      } catch (error) {
        this.emit('schedule:error', { reportId: report.id, error });
      }
    }, {
      scheduled: true,
      timezone: report.schedule.timezone || 'UTC'
    });

    this.schedules.set(report.id, task);
  }

  private getCronExpression(schedule: ScheduleConfig): string {
    if (schedule.cron) return schedule.cron;

    const expressions: Record<string, string> = {
      hourly: '0 * * * *',
      daily: '0 0 * * *',
      weekly: '0 0 * * 0',
      monthly: '0 0 1 * *',
      quarterly: '0 0 1 */3 *',
      yearly: '0 0 1 1 *'
    };

    return expressions[schedule.frequency] || '0 * * * *';
  }

  public unscheduleReport(reportId: string): void {
    const task = this.schedules.get(reportId);
    if (task) {
      task.stop();
      this.schedules.delete(reportId);
    }
  }

  // Cache Management
  private getCacheKey(report: ReportDefinition, parameters?: Record<string, unknown>): string {
    const key = report.dataSource.cache?.key || 
      `${report.id}:${JSON.stringify(parameters || {})}`;
    
    return crypto.createHash('md5').update(key).digest('hex');
  }

  private getFromCache(key: string): unknown | null {
    const cached = this.cache.get(key);
    
    if (cached && cached.expires > new Date()) {
      return cached.data;
    }
    
    this.cache.delete(key);
    return null;
  }

  private addToCache(key: string, data: unknown, ttl: number): void {
    this.cache.set(key, {
      data,
      expires: new Date(Date.now() + ttl * 1000)
    });
  }

  private startCacheCleanup(): void {
    setInterval(() => {
      const now = new Date();
      
      for (const [key, entry] of this.cache.entries()) {
        if (entry.expires < now) {
          this.cache.delete(key);
        }
      }
    }, 60000); // Every minute
  }

  // Public API
  public getReport(reportId: string): ReportDefinition | undefined {
    return this.reports.get(reportId);
  }

  public getAllReports(): ReportDefinition[] {
    return Array.from(this.reports.values());
  }

  public getExecution(executionId: string): ReportExecution | undefined {
    return this.executions.get(executionId);
  }

  public getReportExecutions(reportId: string): ReportExecution[] {
    return Array.from(this.executions.values())
      .filter(e => e.reportId === reportId);
  }

  public getTemplates(): ReportTemplate[] {
    return Array.from(this.templates.values());
  }

  public async updateReport(
    reportId: string,
    updates: Partial<ReportDefinition>
  ): Promise<ReportDefinition> {
    const report = this.reports.get(reportId);
    if (!report) {
      throw new Error(`Report not found: ${reportId}`);
    }

    const updated: ReportDefinition = {
      ...report,
      ...updates,
      metadata: {
        ...report.metadata,
        ...updates.metadata,
        updatedAt: new Date(),
        version: report.metadata.version + 1
      }
    };

    this.validateReportDefinition(updated);
    this.reports.set(reportId, updated);

    // Reschedule if schedule changed
    if (updates.schedule) {
      this.unscheduleReport(reportId);
      if (updated.schedule?.enabled) {
        this.scheduleReport(updated);
      }
    }

    this.emit('report:updated', updated);
    return updated;
  }

  public async deleteReport(reportId: string): Promise<void> {
    const report = this.reports.get(reportId);
    if (!report) {
      throw new Error(`Report not found: ${reportId}`);
    }

    // Unschedule
    this.unscheduleReport(reportId);

    // Delete report
    this.reports.delete(reportId);

    // Delete related executions
    for (const [id, execution] of this.executions.entries()) {
      if (execution.reportId === reportId) {
        this.executions.delete(id);
      }
    }

    this.emit('report:deleted', { reportId });
  }

  public async cloneReport(
    reportId: string,
    name: string
  ): Promise<ReportDefinition> {
    const report = this.reports.get(reportId);
    if (!report) {
      throw new Error(`Report not found: ${reportId}`);
    }

    const cloned = await this.createReport({
      ...report,
      name,
      schedule: { ...report.schedule, enabled: false }, // Disable schedule for clone
      metadata: {
        ...report.metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1
      }
    });

    return cloned;
  }
}

export default CustomReportingEngine;