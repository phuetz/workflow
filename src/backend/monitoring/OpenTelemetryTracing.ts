/**
 * OpenTelemetry Distributed Tracing Integration
 * Production-grade distributed tracing for workflow automation platform
 *
 * Note: Install required packages with:
 * npm install @opentelemetry/api @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node \
 *   @opentelemetry/exporter-jaeger @opentelemetry/exporter-zipkin @opentelemetry/exporter-otlp-grpc \
 *   @opentelemetry/semantic-conventions
 */

import { EventEmitter } from 'events';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../../services/SimpleLogger';

// Types for OpenTelemetry (will be satisfied when packages are installed)
export interface Span {
  end(): void;
  setAttribute(key: string, value: any): void;
  setStatus(status: { code: number; message?: string }): void;
  recordException(exception: Error): void;
  addEvent(name: string, attributes?: Record<string, any>): void;
}

export interface Tracer {
  startSpan(name: string, options?: any): Span;
  startActiveSpan<T>(name: string, fn: (span: Span) => T): T;
}

export interface TracingConfig {
  serviceName: string;
  serviceVersion?: string;
  environment?: string;
  jaegerEndpoint?: string;
  zipkinEndpoint?: string;
  otlpEndpoint?: string;
  samplingRate?: number;
  enableAutoInstrumentation?: boolean;
  enableConsoleExporter?: boolean;
}

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  traceFlags: number;
}

/**
 * OpenTelemetry Tracing Service
 * Provides distributed tracing capabilities across the workflow platform
 */
export class OpenTelemetryTracing extends EventEmitter {
  private static instance: OpenTelemetryTracing;
  private config: TracingConfig;
  private tracer: Tracer | null = null;
  private isInitialized: boolean = false;
  private activeSpans: Map<string, Span> = new Map();

  private constructor(config: TracingConfig) {
    super();
    this.config = {
      samplingRate: 1.0,
      enableAutoInstrumentation: true,
      enableConsoleExporter: false,
      ...config,
    };
  }

  public static getInstance(config?: TracingConfig): OpenTelemetryTracing {
    if (!OpenTelemetryTracing.instance && config) {
      OpenTelemetryTracing.instance = new OpenTelemetryTracing(config);
    }
    return OpenTelemetryTracing.instance;
  }

  /**
   * Initialize OpenTelemetry tracing
   * This method should be called once at application startup
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('OpenTelemetry tracing already initialized');
      return;
    }

    try {
      // Conditional require of OpenTelemetry packages (only if installed)
      // TODO: Install OpenTelemetry packages if tracing is needed:
      // npm install @opentelemetry/api @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node
      //   @opentelemetry/exporter-jaeger @opentelemetry/exporter-trace-otlp-grpc
      //   @opentelemetry/resources @opentelemetry/semantic-conventions @opentelemetry/sdk-trace-base

      let NodeSDK: any = null;
      let getNodeAutoInstrumentations: any = null;
      let JaegerExporter: any = null;
      let OTLPTraceExporter: any = null;
      let Resource: any = null;
      let SemanticResourceAttributes: any = null;
      let trace: any = null;
      let BatchSpanProcessor: any = null;

      try {
        // Using require() with type suppression to avoid TypeScript compile-time module resolution
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        NodeSDK = require('@opentelemetry/sdk-node').NodeSDK;
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        getNodeAutoInstrumentations = require('@opentelemetry/auto-instrumentations-node').getNodeAutoInstrumentations;
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        Resource = require('@opentelemetry/resources').Resource;
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        SemanticResourceAttributes = require('@opentelemetry/semantic-conventions').SemanticResourceAttributes;
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        trace = require('@opentelemetry/api').trace;
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        BatchSpanProcessor = require('@opentelemetry/sdk-trace-base').BatchSpanProcessor;

        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          JaegerExporter = require('@opentelemetry/exporter-jaeger').JaegerExporter;
        } catch {
          // Jaeger exporter optional
        }

        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          OTLPTraceExporter = require('@opentelemetry/exporter-trace-otlp-grpc').OTLPTraceExporter;
        } catch {
          // OTLP exporter optional
        }
      } catch (e) {
        // OpenTelemetry packages not installed - will use mock implementation
        console.warn('OpenTelemetry packages not installed. Tracing will use mock implementation.');
        NodeSDK = null;
      }

      if (!NodeSDK) {
        logger.warn('OpenTelemetry SDK not installed. Tracing will use mock implementation.');
        this.tracer = this.createMockTracer();
        this.isInitialized = true;
        return;
      }

      // Create resource
      const resource = Resource.default().merge(
        new Resource({
          [SemanticResourceAttributes.SERVICE_NAME]: this.config.serviceName,
          [SemanticResourceAttributes.SERVICE_VERSION]: this.config.serviceVersion || '2.0.0',
          [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: this.config.environment || 'production',
        })
      );

      // Configure exporters
      const spanProcessors: any[] = [];

      if (this.config.jaegerEndpoint && JaegerExporter) {
        const jaegerExporter = new JaegerExporter({
          endpoint: this.config.jaegerEndpoint,
        });
        spanProcessors.push(new BatchSpanProcessor(jaegerExporter));
      }

      if (this.config.otlpEndpoint && OTLPTraceExporter) {
        const otlpExporter = new OTLPTraceExporter({
          url: this.config.otlpEndpoint,
        });
        spanProcessors.push(new BatchSpanProcessor(otlpExporter));
      }

      // Initialize SDK
      const sdk = new NodeSDK({
        resource,
        spanProcessors,
        instrumentations: this.config.enableAutoInstrumentation
          ? [getNodeAutoInstrumentations()]
          : [],
      });

      await sdk.start();

      // Get tracer
      this.tracer = trace.getTracer(
        this.config.serviceName,
        this.config.serviceVersion || '2.0.0'
      );

      this.isInitialized = true;
      this.emit('initialized');

      logger.debug('OpenTelemetry tracing initialized', {
        serviceName: this.config.serviceName,
        exporters: spanProcessors.length,
      });
    } catch (error) {
      logger.error('Failed to initialize OpenTelemetry:', error);
      // Fall back to mock tracer
      this.tracer = this.createMockTracer();
      this.isInitialized = true;
    }
  }

  /**
   * Create a mock tracer for development/testing
   */
  private createMockTracer(): Tracer {
    const mockSpan: Span = {
      end: () => {},
      setAttribute: () => {},
      setStatus: () => {},
      recordException: () => {},
      addEvent: () => {},
    };

    return {
      startSpan: () => mockSpan,
      startActiveSpan: (name: string, fn: (span: Span) => any) => fn(mockSpan),
    };
  }

  /**
   * Start a new span
   */
  startSpan(name: string, attributes?: Record<string, any>): Span {
    if (!this.tracer) {
      throw new Error('Tracer not initialized. Call initialize() first.');
    }

    const span = this.tracer.startSpan(name, {
      attributes: attributes || {},
    });

    return span;
  }

  /**
   * Start a workflow execution span
   */
  startWorkflowSpan(workflowId: string, executionId: string, userId?: string): Span {
    const span = this.startSpan('workflow.execution', {
      'workflow.id': workflowId,
      'execution.id': executionId,
      'user.id': userId || 'anonymous',
    });

    this.activeSpans.set(executionId, span);
    return span;
  }

  /**
   * Start a node execution span
   */
  startNodeSpan(
    nodeId: string,
    nodeType: string,
    executionId: string,
    parentSpan?: Span
  ): Span {
    const span = this.startSpan('node.execution', {
      'node.id': nodeId,
      'node.type': nodeType,
      'execution.id': executionId,
    });

    return span;
  }

  /**
   * Start an HTTP request span
   */
  startHttpSpan(method: string, url: string, headers?: Record<string, string>): Span {
    return this.startSpan('http.request', {
      'http.method': method,
      'http.url': url,
      'http.user_agent': headers?.['user-agent'],
    });
  }

  /**
   * Start a database query span
   */
  startDatabaseSpan(operation: string, table: string, query?: string): Span {
    return this.startSpan('db.query', {
      'db.operation': operation,
      'db.table': table,
      'db.statement': query,
    });
  }

  /**
   * End a span
   */
  endSpan(span: Span, error?: Error): void {
    if (error) {
      span.recordException(error);
      span.setStatus({
        code: 2, // ERROR
        message: error.message,
      });
    } else {
      span.setStatus({ code: 1 }); // OK
    }

    span.end();
  }

  /**
   * End a workflow execution span
   */
  endWorkflowSpan(executionId: string, status: 'success' | 'error', error?: Error): void {
    const span = this.activeSpans.get(executionId);
    if (span) {
      span.setAttribute('workflow.status', status);
      this.endSpan(span, error);
      this.activeSpans.delete(executionId);
    }
  }

  /**
   * Trace an async operation
   */
  async traceAsync<T>(
    name: string,
    operation: (span: Span) => Promise<T>,
    attributes?: Record<string, any>
  ): Promise<T> {
    const span = this.startSpan(name, attributes);

    try {
      const result = await operation(span);
      this.endSpan(span);
      return result;
    } catch (error) {
      this.endSpan(span, error as Error);
      throw error;
    }
  }

  /**
   * Trace a synchronous operation
   */
  trace<T>(
    name: string,
    operation: (span: Span) => T,
    attributes?: Record<string, any>
  ): T {
    const span = this.startSpan(name, attributes);

    try {
      const result = operation(span);
      this.endSpan(span);
      return result;
    } catch (error) {
      this.endSpan(span, error as Error);
      throw error;
    }
  }

  /**
   * Express middleware for automatic request tracing
   */
  expressMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const span = this.startHttpSpan(req.method, req.url, req.headers as Record<string, string>);

      // Attach span to request
      (req as any).span = span;
      (req as any).traceId = this.getTraceId(span);

      // Set trace headers
      res.setHeader('x-trace-id', (req as any).traceId);

      // End span when response finishes
      res.on('finish', () => {
        span.setAttribute('http.status_code', res.statusCode);
        span.setAttribute('http.route', req.route?.path || req.url);

        if (res.statusCode >= 500) {
          span.setStatus({
            code: 2,
            message: `HTTP ${res.statusCode}`,
          });
        }

        this.endSpan(span);
      });

      next();
    };
  }

  /**
   * Get trace ID from span (mock implementation)
   */
  private getTraceId(span: Span): string {
    // This would normally extract the trace ID from the span context
    // For now, return a generated ID
    return Math.random().toString(36).substring(2, 15);
  }

  /**
   * Inject trace context into headers
   */
  injectContext(headers: Record<string, string>, span: Span): void {
    // This would normally inject W3C trace context headers
    headers['traceparent'] = `00-${this.getTraceId(span)}-${Math.random().toString(36).substring(2, 10)}-01`;
  }

  /**
   * Extract trace context from headers
   */
  extractContext(headers: Record<string, string>): TraceContext | null {
    const traceparent = headers['traceparent'];
    if (!traceparent) {
      return null;
    }

    const parts = traceparent.split('-');
    if (parts.length < 4) {
      return null;
    }

    return {
      traceId: parts[1],
      spanId: parts[2],
      traceFlags: parseInt(parts[3], 16),
    };
  }

  /**
   * Shutdown tracing
   */
  async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      let trace: any = null;
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        trace = require('@opentelemetry/api').trace;
      } catch {
        // OpenTelemetry API not installed
      }

      if (trace) {
        const provider = trace.getTracerProvider() as any;
        if (provider && typeof provider.shutdown === 'function') {
          await provider.shutdown();
        }
      }

      this.isInitialized = false;
      this.emit('shutdown');
      logger.debug('OpenTelemetry tracing shutdown complete');
    } catch (error) {
      logger.error('Error during OpenTelemetry shutdown:', error);
    }
  }
}

// Export singleton getter
export function getTracing(config?: TracingConfig): OpenTelemetryTracing {
  return OpenTelemetryTracing.getInstance(config);
}

// Initialize default instance
let defaultTracing: OpenTelemetryTracing;

export function initializeTracing(config: TracingConfig): OpenTelemetryTracing {
  if (!defaultTracing) {
    defaultTracing = OpenTelemetryTracing.getInstance(config);
    defaultTracing.initialize().catch((err) => logger.error('Error', err));
  }
  return defaultTracing;
}

export default {
  getTracing,
  initializeTracing,
};
