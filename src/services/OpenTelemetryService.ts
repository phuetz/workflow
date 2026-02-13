/**
 * OpenTelemetry Service
 * Distributed tracing and observability with OpenTelemetry
 *
 * Note: This service requires OpenTelemetry packages to be installed.
 * Install with: npm install @opentelemetry/sdk-node @opentelemetry/resources
 * @opentelemetry/semantic-conventions @opentelemetry/auto-instrumentations-node
 * @opentelemetry/exporter-jaeger @opentelemetry/exporter-prometheus
 * @opentelemetry/sdk-metrics @opentelemetry/sdk-trace-node @opentelemetry/api
 */

// Type definitions for when packages are not installed
type NodeSDK = any;
type Resource = any;
type SemanticResourceAttributes = any;
type JaegerExporter = any;
type PrometheusExporter = any;
type PeriodicExportingMetricReader = any;
type ConsoleSpanExporter = any;

// Stub for SpanStatusCode when package not available
const SpanStatusCode = {
  OK: 0,
  ERROR: 2,
  UNSET: 1
};

// Stub for SpanKind when package not available
const SpanKind = {
  INTERNAL: 0,
  SERVER: 1,
  CLIENT: 2,
  PRODUCER: 3,
  CONSUMER: 4
};

import { logger } from './SimpleLogger';
import { config } from '../config/environment';

// Helper to dynamically import OpenTelemetry modules
let openTelemetryAvailable = false;
let NodeSDKClass: any;
let ResourceClass: any;
let SemanticResourceAttributesObj: any;
let getNodeAutoInstrumentationsFunc: any;
let JaegerExporterClass: any;
let PrometheusExporterClass: any;
let PeriodicExportingMetricReaderClass: any;
let ConsoleSpanExporterClass: any;
let traceAPI: any;
let metricsAPI: any;
let contextAPI: any;
let propagationAPI: any;
let SpanStatusCodeObj: any;
let SpanKindObj: any;

// Try to load OpenTelemetry packages
async function loadOpenTelemetryPackages(): Promise<void> {
  try {
    // @ts-ignore - Dynamic import for optional dependency
    const sdkNode = await import('@opentelemetry/sdk-node').catch(() => null);
    // @ts-ignore - Dynamic import for optional dependency
    const resources = await import('@opentelemetry/resources').catch(() => null);
    // @ts-ignore - Dynamic import for optional dependency
    const semanticConventions = await import('@opentelemetry/semantic-conventions').catch(() => null);
    // @ts-ignore - Dynamic import for optional dependency
    const autoInstrumentations = await import('@opentelemetry/auto-instrumentations-node').catch(() => null);
    // @ts-ignore - Dynamic import for optional dependency
    const jaegerExporter = await import('@opentelemetry/exporter-jaeger').catch(() => null);
    // @ts-ignore - Dynamic import for optional dependency
    const prometheusExporter = await import('@opentelemetry/exporter-prometheus').catch(() => null);
    // @ts-ignore - Dynamic import for optional dependency
    const sdkMetrics = await import('@opentelemetry/sdk-metrics').catch(() => null);
    // @ts-ignore - Dynamic import for optional dependency
    const sdkTraceNode = await import('@opentelemetry/sdk-trace-node').catch(() => null);
    // @ts-ignore - Dynamic import for optional dependency
    const api = await import('@opentelemetry/api').catch(() => null);

    if (!sdkNode || !resources || !semanticConventions || !autoInstrumentations ||
        !jaegerExporter || !prometheusExporter || !sdkMetrics || !sdkTraceNode || !api) {
      throw new Error('One or more OpenTelemetry packages not available');
    }

    NodeSDKClass = sdkNode.NodeSDK;
    ResourceClass = resources.Resource;
    SemanticResourceAttributesObj = semanticConventions.SemanticResourceAttributes;
    getNodeAutoInstrumentationsFunc = autoInstrumentations.getNodeAutoInstrumentations;
    JaegerExporterClass = jaegerExporter.JaegerExporter;
    PrometheusExporterClass = prometheusExporter.PrometheusExporter;
    PeriodicExportingMetricReaderClass = sdkMetrics.PeriodicExportingMetricReader;
    ConsoleSpanExporterClass = sdkTraceNode.ConsoleSpanExporter;
    traceAPI = api.trace;
    metricsAPI = api.metrics;
    contextAPI = api.context;
    propagationAPI = api.propagation;
    SpanStatusCodeObj = api.SpanStatusCode;
    SpanKindObj = api.SpanKind;

    openTelemetryAvailable = true;
  } catch (error) {
    logger.warn('OpenTelemetry packages not available. Telemetry will be disabled.');
    openTelemetryAvailable = false;
  }
}

interface TraceOptions {
  operationName: string;
  tags?: Record<string, unknown>;
  kind?: number;
  parentContext?: unknown;
}

interface CustomMetric {
  name: string;
  description: string;
  unit?: string;
  type: 'counter' | 'histogram' | 'gauge' | 'updowncounter';
}

export class OpenTelemetryService {
  private static instance: OpenTelemetryService;
  private sdk: NodeSDK | null = null;
  private tracer: unknown;
  private meter: unknown;
  private isInitialized = false;
  private customMetrics: Map<string, unknown> = new Map();

  private constructor() {}

  public static getInstance(): OpenTelemetryService {
    if (!OpenTelemetryService.instance) {
      OpenTelemetryService.instance = new OpenTelemetryService();
    }
    return OpenTelemetryService.instance;
  }

  /**
   * Initialize OpenTelemetry
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('OpenTelemetry already initialized');
      return;
    }

    // Load OpenTelemetry packages first
    await loadOpenTelemetryPackages();

    if (!openTelemetryAvailable) {
      logger.warn('OpenTelemetry packages not available - telemetry disabled');
      return;
    }

    try {
      // Create resource
      const resource = new ResourceClass({
        [SemanticResourceAttributesObj.SERVICE_NAME]: 'workflow-automation-platform',
        [SemanticResourceAttributesObj.SERVICE_VERSION]: config.version || '1.0.0',
        [SemanticResourceAttributesObj.SERVICE_INSTANCE_ID]: process.env.HOSTNAME || 'localhost',
        [SemanticResourceAttributesObj.DEPLOYMENT_ENVIRONMENT]: config.env || 'development',
      });

      // Configure exporters
      const traceExporters = this.configureTraceExporters();
      const metricExporters = this.configureMetricExporters();

      // Initialize SDK
      this.sdk = new NodeSDKClass({
        resource,
        traceExporter: traceExporters.length > 0 ? traceExporters[0] : new ConsoleSpanExporterClass(),
        metricReader: metricExporters.length > 0 ? metricExporters[0] : undefined,
        instrumentations: [
          getNodeAutoInstrumentationsFunc({
            // Disable some instrumentations if needed
            '@opentelemetry/instrumentation-fs': {
              enabled: false,
            },
          }),
        ],
      });

      // Start the SDK
      await this.sdk.start();

      // Get tracer and meter instances
      this.tracer = traceAPI.getTracer('workflow-automation-platform', config.version || '1.0.0');
      this.meter = metricsAPI.getMeter('workflow-automation-platform', config.version || '1.0.0');

      // Initialize custom metrics
      this.initializeCustomMetrics();

      this.isInitialized = true;
      logger.info('🔍 OpenTelemetry initialized successfully');
    } catch (error) {
      logger.error('❌ Failed to initialize OpenTelemetry:', error);
      throw error;
    }
  }

  private configureTraceExporters(): unknown[] {
    const exporters: unknown[] = [];

    if (!openTelemetryAvailable) {
      return exporters;
    }

    // Jaeger exporter
    if (process.env.JAEGER_ENDPOINT && JaegerExporterClass) {
      exporters.push(new JaegerExporterClass({
        endpoint: process.env.JAEGER_ENDPOINT,
      }));
    }

    // Console exporter for development
    if (config.env === 'development' && ConsoleSpanExporterClass) {
      exporters.push(new ConsoleSpanExporterClass());
    }

    return exporters;
  }

  private configureMetricExporters(): unknown[] {
    const exporters: unknown[] = [];

    if (!openTelemetryAvailable) {
      return exporters;
    }

    // Prometheus exporter
    try {
      if (PrometheusExporterClass && PeriodicExportingMetricReaderClass) {
        const prometheusExporter = new PrometheusExporterClass({
          port: parseInt(process.env.PROMETHEUS_PORT || '9464', 10),
        });
        exporters.push(new PeriodicExportingMetricReaderClass({
          exporter: prometheusExporter,
          exportIntervalMillis: 10000, // 10 seconds
        }));
      }
    } catch (error) {
      logger.warn('Failed to initialize Prometheus exporter:', error);
    }

    return exporters;
  }

  private initializeCustomMetrics(): void {
    const customMetrics: CustomMetric[] = [
      {
        name: 'workflow_executions_total',
        description: 'Total number of workflow executions',
        type: 'counter'
      },
      {
        name: 'workflow_execution_duration',
        description: 'Duration of workflow executions',
        unit: 'ms',
        type: 'histogram'
      },
      {
        name: 'active_workflows',
        description: 'Number of active workflows',
        type: 'gauge'
      },
      {
        name: 'api_requests_total',
        description: 'Total number of API requests',
        type: 'counter'
      },
      {
        name: 'api_request_duration',
        description: 'Duration of API requests',
        unit: 'ms',
        type: 'histogram'
      },
      {
        name: 'database_connections',
        description: 'Number of database connections',
        type: 'updowncounter'
      },
      {
        name: 'memory_usage',
        description: 'Memory usage in bytes',
        unit: 'bytes',
        type: 'gauge'
      },
      {
        name: 'cpu_usage',
        description: 'CPU usage percentage',
        unit: '%',
        type: 'gauge'
      }
    ];

    for (const metricDef of customMetrics) {
      try {
        let metric: any;
        const meter = this.meter as any;

        switch (metricDef.type) {
          case 'counter':
            metric = meter.createCounter(metricDef.name, {
              description: metricDef.description,
              unit: metricDef.unit
            });
            break;

          case 'histogram':
            metric = meter.createHistogram(metricDef.name, {
              description: metricDef.description,
              unit: metricDef.unit
            });
            break;

          case 'gauge':
            metric = meter.createGauge(metricDef.name, {
              description: metricDef.description,
              unit: metricDef.unit
            });
            break;

          case 'updowncounter':
            metric = meter.createUpDownCounter(metricDef.name, {
              description: metricDef.description,
              unit: metricDef.unit
            });
            break;
        }

        if (metric) {
          this.customMetrics.set(metricDef.name, metric);
        }
      } catch (error) {
        logger.error(`Failed to create metric ${metricDef.name}:`, error);
      }
    }

    logger.info(`📊 Initialized ${this.customMetrics.size} custom metrics`);
  }

  /**
   * Start a new trace span
   */
  public startSpan(options: TraceOptions): unknown {
    if (!this.tracer || !openTelemetryAvailable) {
      logger.warn('Tracer not initialized');
      return null;
    }

    const tracer = this.tracer as any;
    const statusCode = SpanKindObj || SpanKind;
    const span = tracer.startSpan(options.operationName, {
      kind: options.kind || statusCode.INTERNAL,
      attributes: options.tags || {}
    }, options.parentContext);

    return span;
  }

  /**
   * Wrap function with tracing
   */
  public traceFunction<T extends (...args: unknown[]) => unknown>(
    fn: T,
    operationName: string,
    options?: Partial<TraceOptions>
  ): T {
    if (!this.tracer || !openTelemetryAvailable) {
      return fn;
    }

    return ((...args: unknown[]) => {
      const span = this.startSpan({
        operationName,
        ...options
      }) as any;

      const statusCode = SpanStatusCodeObj || SpanStatusCode;

      try {
        const result = fn(...args);

        // Handle async functions
        if (result && typeof (result as any).then === 'function') {
          return (result as Promise<any>)
            .then((value: unknown) => {
              span?.setStatus({ code: statusCode.OK });
              span?.end();
              return value;
            })
            .catch((error: unknown) => {
              const errorMessage = error instanceof Error ? error.message : String(error);
              span?.setStatus({
                code: statusCode.ERROR,
                message: errorMessage
              });
              span?.recordException(error as Error);
              span?.end();
              throw error;
            });
        }

        // Handle sync functions
        span?.setStatus({ code: statusCode.OK });
        span?.end();
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        span?.setStatus({
          code: statusCode.ERROR,
          message: errorMessage
        });
        span?.recordException(error as Error);
        span?.end();
        throw error;
      }
    }) as T;
  }

  /**
   * Trace async function
   */
  public async traceAsync<T>(
    operationName: string,
    fn: () => Promise<T>,
    options?: Partial<TraceOptions>
  ): Promise<T> {
    const span = this.startSpan({
      operationName,
      ...options
    }) as any;

    const statusCode = SpanStatusCodeObj || SpanStatusCode;

    try {
      const result = await fn();
      span?.setStatus({ code: statusCode.OK });
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      span?.setStatus({
        code: statusCode.ERROR,
        message: errorMessage
      });
      span?.recordException(error as Error);
      throw error;
    } finally {
      span?.end();
    }
  }

  /**
   * Add span event
   */
  public addSpanEvent(span: unknown, name: string, attributes?: Record<string, unknown>): void {
    (span as any)?.addEvent(name, attributes);
  }

  /**
   * Set span attributes
   */
  public setSpanAttributes(span: unknown, attributes: Record<string, unknown>): void {
    (span as any)?.setAttributes(attributes);
  }

  /**
   * Record metric
   */
  public recordMetric(name: string, value: number, attributes?: Record<string, unknown>): void {
    const metric = this.customMetrics.get(name) as any;
    if (!metric) {
      logger.warn(`Metric ${name} not found`);
      return;
    }

    try {
      if (metric.add) {
        // Counter or UpDownCounter
        metric.add(value, attributes);
      } else if (metric.record) {
        // Histogram or Gauge
        metric.record(value, attributes);
      }
    } catch (error) {
      logger.error(`Failed to record metric ${name}:`, error);
    }
  }

  /**
   * Create workflow execution trace
   */
  public traceWorkflowExecution(
    workflowId: string,
    executionId: string
  ): {
    span: unknown;
    addNodeExecution: (nodeId: string, nodeName: string) => unknown;
    recordResult: (success: boolean, duration: number, error?: Error) => void;
  } {
    const statusCode = SpanStatusCodeObj || SpanStatusCode;
    const spanKind = SpanKindObj || SpanKind;

    const span = this.startSpan({
      operationName: 'workflow.execution',
      tags: {
        'workflow.id': workflowId,
        'execution.id': executionId
      },
      kind: spanKind.SERVER
    }) as any;

    return {
      span,
      addNodeExecution: (nodeId: string, nodeName: string) => {
        const tracer = this.tracer as any;
        const nodeSpan = tracer?.startSpan('workflow.node', {
          parent: span,
          attributes: {
            'node.id': nodeId,
            'node.name': nodeName,
            'workflow.id': workflowId,
            'execution.id': executionId
          }
        });

        return {
          span: nodeSpan,
          recordResult: (success: boolean, duration: number, error?: Error) => {
            nodeSpan?.setAttributes({
              'node.success': success,
              'node.duration': duration
            });

            if (error) {
              nodeSpan?.setStatus({
                code: statusCode.ERROR,
                message: error.message
              });
              nodeSpan?.recordException(error);
            } else {
              nodeSpan?.setStatus({ code: statusCode.OK });
            }

            nodeSpan?.end();
          }
        };
      },
      recordResult: (success: boolean, duration: number, error?: Error) => {
        span?.setAttributes({
          'workflow.success': success,
          'workflow.duration': duration
        });

        // Record metrics
        this.recordMetric('workflow_executions_total', 1, {
          workflow_id: workflowId,
          success: success.toString()
        });

        this.recordMetric('workflow_execution_duration', duration, {
          workflow_id: workflowId
        });

        if (error) {
          span?.setStatus({
            code: statusCode.ERROR,
            message: error.message
          });
          span?.recordException(error);
        } else {
          span?.setStatus({ code: statusCode.OK });
        }

        span?.end();
      }
    };
  }

  /**
   * Trace API request
   */
  public traceAPIRequest(method: string, path: string, userId?: string): {
    span: unknown;
    recordResponse: (statusCode: number, duration: number, error?: Error) => void;
  } {
    const statusCode = SpanStatusCodeObj || SpanStatusCode;
    const spanKind = SpanKindObj || SpanKind;

    const span = this.startSpan({
      operationName: 'http.request',
      tags: {
        'http.method': method,
        'http.path': path,
        'user.id': userId
      },
      kind: spanKind.SERVER
    }) as any;

    return {
      span,
      recordResponse: (code: number, duration: number, error?: Error) => {
        span?.setAttributes({
          'http.status_code': code,
          'http.duration': duration
        });

        // Record metrics
        this.recordMetric('api_requests_total', 1, {
          method,
          path,
          status_code: code.toString()
        });

        this.recordMetric('api_request_duration', duration, {
          method,
          path
        });

        if (error || code >= 400) {
          span?.setStatus({
            code: statusCode.ERROR,
            message: error?.message || `HTTP ${code}`
          });

          if (error) {
            span?.recordException(error);
          }
        } else {
          span?.setStatus({ code: statusCode.OK });
        }

        span?.end();
      }
    };
  }

  /**
   * Get current trace context
   */
  public getCurrentContext(): unknown {
    if (!openTelemetryAvailable || !contextAPI) {
      return null;
    }
    return contextAPI.active();
  }

  /**
   * Set current trace context
   */
  public setContext(ctx: unknown): void {
    if (!openTelemetryAvailable || !contextAPI) {
      return;
    }
    contextAPI.with(ctx as any, () => {});
  }

  /**
   * Extract trace context from headers
   */
  public extractContext(headers: Record<string, string>): unknown {
    if (!openTelemetryAvailable || !propagationAPI || !contextAPI) {
      return null;
    }
    return propagationAPI.extract(contextAPI.active(), headers);
  }

  /**
   * Inject trace context into headers
   */
  public injectContext(headers: Record<string, string>): void {
    if (!openTelemetryAvailable || !propagationAPI || !contextAPI) {
      return;
    }
    propagationAPI.inject(contextAPI.active(), headers);
  }

  /**
   * Record system metrics
   */
  public recordSystemMetrics(metrics: {
    memoryUsage: number;
    cpuUsage: number;
    activeConnections: number;
  }): void {
    this.recordMetric('memory_usage', metrics.memoryUsage);
    this.recordMetric('cpu_usage', metrics.cpuUsage);
    this.recordMetric('database_connections', metrics.activeConnections);
  }

  /**
   * Get telemetry statistics
   */
  public getStats(): {
    initialized: boolean;
    customMetrics: number;
    tracerName: string;
    meterName: string;
  } {
    const tracer = this.tracer as any;
    const meter = this.meter as any;

    return {
      initialized: this.isInitialized,
      customMetrics: this.customMetrics.size,
      tracerName: tracer?.instrumentationLibrary?.name || 'unknown',
      meterName: meter?.instrumentationLibrary?.name || 'unknown'
    };
  }

  /**
   * Shutdown OpenTelemetry
   */
  public async shutdown(): Promise<void> {
    if (!this.sdk) {
      return;
    }

    try {
      await this.sdk.shutdown();
      logger.info('🔍 OpenTelemetry shutdown complete');
    } catch (error) {
      logger.error('❌ Failed to shutdown OpenTelemetry:', error);
      throw error;
    }
  }
}

export const telemetryService = OpenTelemetryService.getInstance();