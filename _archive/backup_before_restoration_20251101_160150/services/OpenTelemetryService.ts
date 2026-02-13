/**
 * OpenTelemetry Service
 * Distributed tracing and observability with OpenTelemetry
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-node';
import { trace, metrics, context, propagation, SpanStatusCode, SpanKind } from '@opentelemetry/api';
import { logger } from './LoggingService';
import { config } from '../config/environment';

interface TraceOptions {
  operationName: string;
  tags?: Record<string, unknown>;
  kind?: SpanKind;
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

    try {
      // Create resource
        [SemanticResourceAttributes.SERVICE_NAME]: 'workflow-automation-platform',
        [SemanticResourceAttributes.SERVICE_VERSION]: config.version,
        [SemanticResourceAttributes.SERVICE_INSTANCE_ID]: process.env.HOSTNAME || 'localhost',
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: config.env,
      });

      // Configure exporters

      // Initialize SDK
      this.sdk = new NodeSDK({
        resource,
        traceExporter: traceExporters.length > 0 ? traceExporters[0] : new ConsoleSpanExporter(),
        metricReader: metricExporters.length > 0 ? metricExporters[0] : undefined,
        instrumentations: [
          getNodeAutoInstrumentations({
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
      this.tracer = trace.getTracer('workflow-automation-platform', config.version);
      this.meter = metrics.getMeter('workflow-automation-platform', config.version);

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

    // Jaeger exporter
    if (process.env.JAEGER_ENDPOINT) {
      exporters.push(new JaegerExporter({
        endpoint: process.env.JAEGER_ENDPOINT,
      }));
    }

    // Console exporter for development
    if (config.env === 'development') {
      exporters.push(new ConsoleSpanExporter());
    }

    return exporters;
  }

  private configureMetricExporters(): unknown[] {

    // Prometheus exporter
    try {
        port: parseInt(process.env.PROMETHEUS_PORT || '9464', 10),
      });
      exporters.push(new PeriodicExportingMetricReader({
        exporter: prometheusExporter,
        exportIntervalMillis: 10000, // 10 seconds
      }));
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
        let metric;
        
        switch (metricDef.type) {
          case 'counter':
            metric = this.meter.createCounter(metricDef.name, {
              description: metricDef.description,
              unit: metricDef.unit
            });
            break;
          
          case 'histogram':
            metric = this.meter.createHistogram(metricDef.name, {
              description: metricDef.description,
              unit: metricDef.unit
            });
            break;
          
          case 'gauge':
            metric = this.meter.createGauge(metricDef.name, {
              description: metricDef.description,
              unit: metricDef.unit
            });
            break;
          
          case 'updowncounter':
            metric = this.meter.createUpDownCounter(metricDef.name, {
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
    if (!this.tracer) {
      logger.warn('Tracer not initialized');
      return null;
    }

      kind: options.kind || SpanKind.INTERNAL,
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
    if (!this.tracer) {
      return fn;
    }

    return ((...args: unknown[]) => {
        operationName,
        ...options
      });

      try {
        
        // Handle async functions
        if (result && typeof result.then === 'function') {
          return result
            .then((value: unknown) => {
              span?.setStatus({ code: SpanStatusCode.OK });
              span?.end();
              return value;
            })
            .catch((error: unknown) => {
              span?.setStatus({ 
                code: SpanStatusCode.ERROR, 
                message: error.message 
              });
              span?.recordException(error);
              span?.end();
              throw error;
            });
        }

        // Handle sync functions
        span?.setStatus({ code: SpanStatusCode.OK });
        span?.end();
        return result;
      } catch (error) {
        span?.setStatus({ 
          code: SpanStatusCode.ERROR, 
          message: error.message 
        });
        span?.recordException(error);
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
      operationName,
      ...options
    });

    try {
      span?.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span?.setStatus({ 
        code: SpanStatusCode.ERROR, 
        message: error.message 
      });
      span?.recordException(error);
      throw error;
    } finally {
      span?.end();
    }
  }

  /**
   * Add span event
   */
  public addSpanEvent(span: unknown, name: string, attributes?: Record<string, unknown>): void {
    span?.addEvent(name, attributes);
  }

  /**
   * Set span attributes
   */
  public setSpanAttributes(span: unknown, attributes: Record<string, unknown>): void {
    span?.setAttributes(attributes);
  }

  /**
   * Record metric
   */
  public recordMetric(name: string, value: number, attributes?: Record<string, unknown>): void {
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
      operationName: 'workflow.execution',
      tags: {
        'workflow.id': workflowId,
        'execution.id': executionId
      },
      kind: SpanKind.SERVER
    });

    return {
      span,
      addNodeExecution: (nodeId: string, nodeName: string) => {
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
            nodeSpan.setAttributes({
              'node.success': success,
              'node.duration': duration
            });

            if (error) {
              nodeSpan.setStatus({
                code: SpanStatusCode.ERROR,
                message: error.message
              });
              nodeSpan.recordException(error);
            } else {
              nodeSpan.setStatus({ code: SpanStatusCode.OK });
            }

            nodeSpan.end();
          }
        };
      },
      recordResult: (success: boolean, duration: number, error?: Error) => {
        span.setAttributes({
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
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error.message
          });
          span.recordException(error);
        } else {
          span.setStatus({ code: SpanStatusCode.OK });
        }

        span.end();
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
      operationName: 'http.request',
      tags: {
        'http.method': method,
        'http.path': path,
        'user.id': userId
      },
      kind: SpanKind.SERVER
    });

    return {
      span,
      recordResponse: (statusCode: number, duration: number, error?: Error) => {
        span.setAttributes({
          'http.status_code': statusCode,
          'http.duration': duration
        });

        // Record metrics
        this.recordMetric('api_requests_total', 1, {
          method,
          path,
          status_code: statusCode.toString()
        });

        this.recordMetric('api_request_duration', duration, {
          method,
          path
        });

        if (error || statusCode >= 400) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error?.message || `HTTP ${statusCode}`
          });
          
          if (error) {
            span.recordException(error);
          }
        } else {
          span.setStatus({ code: SpanStatusCode.OK });
        }

        span.end();
      }
    };
  }

  /**
   * Get current trace context
   */
  public getCurrentContext(): unknown {
    return context.active();
  }

  /**
   * Set current trace context
   */
  public setContext(ctx: unknown): void {
    context.with(ctx, () => {});
  }

  /**
   * Extract trace context from headers
   */
  public extractContext(headers: Record<string, string>): unknown {
    return propagation.extract(context.active(), headers);
  }

  /**
   * Inject trace context into headers
   */
  public injectContext(headers: Record<string, string>): void {
    propagation.inject(context.active(), headers);
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
    return {
      initialized: this.isInitialized,
      customMetrics: this.customMetrics.size,
      tracerName: this.tracer?.instrumentationLibrary?.name || 'unknown',
      meterName: this.meter?.instrumentationLibrary?.name || 'unknown'
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