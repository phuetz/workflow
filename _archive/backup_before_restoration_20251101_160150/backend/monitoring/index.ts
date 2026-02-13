import { logger } from '../../services/LoggingService';
/**
 * Monitoring & Observability Integration
 * Central export point for all monitoring components
 */

// Enhanced Logger
export { EnhancedLogger, getLogger } from './EnhancedLogger';
export type { LogContext } from './EnhancedLogger';

// OpenTelemetry Tracing
export {
  OpenTelemetryTracing,
  getTracing,
  initializeTracing,
} from './OpenTelemetryTracing';
export type {
  Span,
  Tracer,
  TracingConfig,
  TraceContext,
} from './OpenTelemetryTracing';

// Prometheus Monitoring
export { default as PrometheusMonitoring } from '../../monitoring/PrometheusMonitoring';
export type {
  PrometheusConfig,
  MetricOptions,
  MetricValue,
  CollectedMetrics,
} from '../../monitoring/PrometheusMonitoring';
export {
  CounterMetric,
  GaugeMetric,
  HistogramMetric,
  SummaryMetric,
} from '../../monitoring/PrometheusMonitoring';

// Alerting System
export { AlertingSystem, getAlertingSystem } from './AlertingSystem';
export type {
  Alert,
  AlertRule,
  AlertingConfig,
  AlertSeverity,
  AlertStatus,
  AlertChannel,
} from './AlertingSystem';

// Health Check System
export { HealthCheckSystem, getHealthCheckSystem } from './HealthCheckSystem';
export type {
  HealthCheck,
  HealthCheckResult,
  SystemHealth,
  HealthStatus,
  CircuitBreakerState,
} from './HealthCheckSystem';

// SLA Monitoring
export { SLAMonitoring, getSLAMonitoring } from './SLAMonitoring';
export type {
  SLO,
  SLI,
  ErrorBudget,
  UptimeRecord,
  UptimeStats,
} from './SLAMonitoring';

// Workflow Debugger
export { WorkflowDebugger, getWorkflowDebugger } from './WorkflowDebugger';
export type {
  Breakpoint,
  DebugSession,
  StackFrame,
  PerformanceProfile,
  NodePerformance,
  DebuggerEvent,
  InspectionData,
  BreakpointType,
} from './WorkflowDebugger';

/**
 * Initialize all monitoring systems
 * Call this once at application startup
 */
export async function initializeMonitoring(config?: {
  serviceName?: string;
  environment?: string;
  enableTracing?: boolean;
  enableMetrics?: boolean;
  enableAlerting?: boolean;
  tracingConfig?: any;
  alertingConfig?: any;
}): Promise<void> {
  const {
    serviceName = 'workflow-platform',
    environment = process.env.NODE_ENV || 'production',
    enableTracing = true,
    enableMetrics = true,
    enableAlerting = true,
    tracingConfig,
    alertingConfig,
  } = config || {};

  const logger = getLogger(serviceName);

  logger.info('Initializing monitoring systems', {
    serviceName,
    environment,
    enableTracing,
    enableMetrics,
    enableAlerting,
  });

  try {
    // Initialize tracing
    if (enableTracing) {
      const tracing = initializeTracing({
        serviceName,
        serviceVersion: process.env.APP_VERSION || '2.0.0',
        environment,
        jaegerEndpoint: process.env.JAEGER_ENDPOINT,
        otlpEndpoint: process.env.OTLP_ENDPOINT,
        samplingRate: parseFloat(process.env.TRACING_SAMPLING_RATE || '1.0'),
        ...tracingConfig,
      });

      await tracing.initialize();
      logger.info('Tracing initialized');
    }

    // Initialize metrics (Prometheus)
    if (enableMetrics) {
      const prometheus = PrometheusMonitoring.getInstance({
        endpoint: '/metrics',
        interval: 10000,
        enableDefaultMetrics: true,
        enableCustomMetrics: true,
      });

      logger.info('Metrics initialized');
    }

    // Initialize alerting
    if (enableAlerting && alertingConfig) {
      const alerting = getAlertingSystem(alertingConfig);
      logger.info('Alerting initialized');
    }

    // Initialize health checks
    const healthCheck = getHealthCheckSystem();
    logger.info('Health checks initialized');

    // Initialize SLA monitoring
    const sla = getSLAMonitoring();
    logger.info('SLA monitoring initialized');

    // Initialize workflow debugger
    const debugger = getWorkflowDebugger();
    logger.info('Workflow debugger initialized');

    logger.info('All monitoring systems initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize monitoring systems', error);
    throw error;
  }
}

/**
 * Shutdown all monitoring systems
 * Call this during graceful shutdown
 */
export async function shutdownMonitoring(): Promise<void> {
  const logger = getLogger('monitoring');

  logger.info('Shutting down monitoring systems');

  try {
    // Shutdown tracing
    const tracing = getTracing();
    if (tracing) {
      await tracing.shutdown();
    }

    // Shutdown Prometheus
    const prometheus = PrometheusMonitoring.getInstance();
    if (prometheus) {
      prometheus.stop();
    }

    // Shutdown health checks
    const healthCheck = getHealthCheckSystem();
    if (healthCheck) {
      healthCheck.shutdown();
    }

    // Shutdown SLA monitoring
    const sla = getSLAMonitoring();
    if (sla) {
      sla.shutdown();
    }

    // Flush logs
    await logger.flush();

    logger.debug('All monitoring systems shutdown complete');
  } catch (error) {
    logger.error('Error during monitoring shutdown:', error);
  }
}

/**
 * Create Express middleware for monitoring
 */
export function createMonitoringMiddleware() {
  const logger = getLogger('http');
  const tracing = getTracing();
  const prometheus = PrometheusMonitoring.getInstance();

  return {
    // Logging middleware (should be first)
    logging: logger.requestMiddleware(),

    // Tracing middleware
    tracing: tracing.expressMiddleware(),

    // Metrics endpoint
    metrics: prometheus.expressMiddleware(),

    // Error logging middleware (should be last)
    errorLogging: logger.errorMiddleware(),
  };
}

/**
 * Create monitoring routes for health checks
 */
export function createMonitoringRoutes() {
  const healthCheck = getHealthCheckSystem();

  return {
    health: healthCheck.healthEndpoint(),
    ready: healthCheck.readinessEndpoint(),
    live: healthCheck.livenessEndpoint(),
  };
}

// Export singleton instances for convenience
export const monitoring = {
  logger: getLogger('app'),
  tracing: getTracing,
  prometheus: PrometheusMonitoring.getInstance,
  alerting: getAlertingSystem,
  healthCheck: getHealthCheckSystem,
  sla: getSLAMonitoring,
  debugger: getWorkflowDebugger,
};

export default {
  initializeMonitoring,
  shutdownMonitoring,
  createMonitoringMiddleware,
  createMonitoringRoutes,
  monitoring,
};
