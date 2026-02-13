/**
 * Prometheus Metrics Endpoint
 * Exposes application metrics for Prometheus scraping
 */

import { Router, Request, Response, NextFunction } from 'express';
import { PrometheusMonitoring } from '../../../monitoring/PrometheusMonitoring';
import { logger } from '../../../services/SimpleLogger';

// Type for Prometheus gauge metric
interface GaugeMetric {
  inc: () => void;
  dec: () => void;
}

const router = Router();
const prometheus = PrometheusMonitoring.getInstance({
  prefix: 'workflow_',
  enableDefaultMetrics: true,
  enableCustomMetrics: true
});

// Metrics endpoint for Prometheus scraping
router.get('/metrics', (req: Request, res: Response) => {
  res.set('Content-Type', 'text/plain; version=0.0.4');
  res.send(prometheus.collect());
});

// Health check with metrics
router.get('/health/metrics', (req: Request, res: Response) => {
  const metrics = {
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    timestamp: new Date().toISOString()
  };
  
  res.json({
    status: 'healthy',
    metrics
  });
});

// Middleware to track HTTP metrics
export const trackHttpMetrics = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  // Track request
  prometheus.incCounter('workflow_http_requests_total', {
    method: req.method,
    route: req.route?.path || req.path,
    status: 'in_progress'
  });

  // Override res.end to track response
  const originalEnd = res.end.bind(res);
  res.end = function(chunk?: unknown, encodingOrCallback?: BufferEncoding | (() => void), callback?: () => void) {
    const duration = (Date.now() - startTime) / 1000;

    // Track response metrics
    prometheus.incCounter('workflow_http_requests_total', {
      method: req.method,
      route: req.route?.path || req.path,
      status: res.statusCode.toString()
    });

    prometheus.observeHistogram('workflow_http_request_duration_seconds', duration, {
      method: req.method,
      route: req.route?.path || req.path
    });

    // Call original end with proper typing
    if (typeof encodingOrCallback === 'function') {
      return originalEnd(chunk as string | Buffer, encodingOrCallback);
    }
    return originalEnd(chunk as string | Buffer, encodingOrCallback as BufferEncoding, callback);
  } as typeof res.end;

  next();
};

// Track workflow execution
export const trackWorkflowExecution = (
  workflowId: string,
  status: 'started' | 'completed' | 'failed',
  duration?: number
) => {
  prometheus.incCounter('workflow_workflow_executions_total', {
    workflow_id: workflowId,
    status
  });
  
  if (status === 'started') {
    const gauge = prometheus.getMetric('workflow_workflow_active_executions') as GaugeMetric | undefined;
    if (gauge) gauge.inc();
  } else {
    const gauge = prometheus.getMetric('workflow_workflow_active_executions') as GaugeMetric | undefined;
    if (gauge) gauge.dec();
    
    if (duration) {
      prometheus.observeHistogram('workflow_workflow_execution_duration_seconds', duration / 1000, {
        workflow_id: workflowId
      });
    }
  }
};

// Track node execution
export const trackNodeExecution = (
  nodeType: string,
  status: 'started' | 'completed' | 'failed',
  duration?: number
) => {
  prometheus.incCounter('workflow_node_executions_total', {
    node_type: nodeType,
    status
  });
  
  if (duration) {
    prometheus.observeHistogram('workflow_node_execution_duration_seconds', duration / 1000, {
      node_type: nodeType
    });
  }
};

// Track queue metrics
export const updateQueueMetrics = (
  queueName: string,
  size: number,
  processingRate: number
) => {
  prometheus.setGauge('workflow_queue_size', size, {
    queue_name: queueName
  });
  
  prometheus.setGauge('workflow_queue_processing_rate', processingRate, {
    queue_name: queueName
  });
};

// Track database metrics
export const trackDatabaseQuery = async <T>(
  operation: string,
  table: string,
  queryFn: () => Promise<T>
): Promise<T> => {
  const startTime = Date.now();
  
  try {
    const result = await queryFn();
    const duration = (Date.now() - startTime) / 1000;
    
    prometheus.observeHistogram('workflow_database_query_duration_seconds', duration, {
      operation,
      table
    });
    
    return result;
  } catch (error) {
    const duration = (Date.now() - startTime) / 1000;
    
    prometheus.observeHistogram('workflow_database_query_duration_seconds', duration, {
      operation,
      table
    });
    
    prometheus.incCounter('workflow_errors_total', {
      type: 'database',
      component: table
    });
    
    throw error;
  }
};

// Track errors
export const trackError = (type: string, component: string, error?: Error) => {
  prometheus.incCounter('workflow_errors_total', {
    type,
    component
  });
  
  if (error) {
    logger.error(`Error in ${component}:`, error);
  }
};

// Update database connection metrics
export const updateDatabaseConnectionMetrics = (
  activeConnections: number,
  idleConnections: number
) => {
  prometheus.setGauge('workflow_database_connections_active', activeConnections);
  prometheus.setGauge('workflow_database_connections_idle', idleConnections);
};

export default router;