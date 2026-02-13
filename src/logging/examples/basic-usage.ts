/**
 * Basic Usage Examples for Log Streaming System
 */

import { LogStreamer } from '../LogStreamer';
import { StructuredLogger } from '../StructuredLogger';
import { LogRetention, createDefaultPolicies } from '../LogRetention';
import { LogFilter } from '../LogFilter';
import { LogContext, runWithContextAsync } from '../LogContext';

/**
 * Example 1: Basic Setup
 */
async function basicSetup() {
  // Create logger
  const logger = new StructuredLogger({
    service: 'my-service',
    environment: 'production',
    version: '1.0.0',
  });

  // Create streamer
  const streamer = new LogStreamer();

  // Add Datadog stream
  streamer.addStream({
    type: 'datadog',
    config: {
      apiKey: process.env.DATADOG_API_KEY!,
      site: 'datadoghq.com',
      service: 'my-service',
    },
    enabled: true,
  });

  // Connect logger to streamer
  logger.on('log', async (log) => {
    await streamer.stream(log);
  });

  // Start logging
  logger.info('Application started');
  logger.error('Something went wrong', new Error('Test error'));

  // Cleanup
  await streamer.shutdown();
}

/**
 * Example 2: Multiple Destinations
 */
async function multipleDestinations() {
  const logger = new StructuredLogger();
  const streamer = new LogStreamer();

  // Add multiple streams
  streamer.addStream({
    type: 'datadog',
    config: {
      apiKey: process.env.DATADOG_API_KEY!,
    },
    enabled: true,
  });

  streamer.addStream({
    type: 'elasticsearch',
    config: {
      url: process.env.ELASTIC_URL!,
      index: 'app-logs',
      apiKey: process.env.ELASTIC_API_KEY!,
    },
    enabled: true,
  });

  streamer.addStream({
    type: 'cloudwatch',
    config: {
      region: 'us-east-1',
      logGroupName: '/aws/my-app',
      logStreamName: 'production',
    },
    enabled: true,
  });

  // Connect
  logger.on('log', async (log) => {
    await streamer.stream(log);
  });

  logger.info('Logging to multiple destinations');

  await streamer.shutdown();
}

/**
 * Example 3: With Filtering and Sampling
 */
async function withFiltering() {
  const logger = new StructuredLogger();
  const streamer = new LogStreamer();
  const filter = new LogFilter();

  // Add sampling for debug logs
  filter.addRule({
    name: 'Sample Debug Logs',
    type: 'sample',
    action: 'include',
    config: {
      sampleRate: 0.1, // 10%
      sampleLevels: ['debug'],
    },
    enabled: true,
  });

  // Always keep errors
  filter.addRule({
    name: 'Always Keep Errors',
    type: 'level',
    action: 'include',
    config: {
      levels: ['error', 'fatal'],
    },
    enabled: true,
    priority: 100,
  });

  // Add stream
  streamer.addStream({
    type: 'datadog',
    config: { apiKey: process.env.DATADOG_API_KEY! },
    enabled: true,
  });

  // Connect with filtering
  logger.on('log', async (log) => {
    if (filter.filter(log)) {
      await streamer.stream(log);
    }
  });

  // Log various levels
  for (let i = 0; i < 100; i++) {
    logger.debug(`Debug log ${i}`);
  }

  logger.error('This error will always be logged');

  await streamer.shutdown();
  filter.shutdown();
}

/**
 * Example 4: With Retention Policies
 */
async function withRetention() {
  const logger = new StructuredLogger();
  const retention = new LogRetention();

  // Add default policies
  createDefaultPolicies().forEach(p => retention.addPolicy(p));

  // Add custom policy
  retention.addPolicy({
    name: 'Critical Errors - Forever',
    period: 'forever',
    levels: ['fatal'],
    enabled: true,
    priority: 100,
  });

  // Connect
  logger.on('log', (log) => {
    retention.addLog(log);
  });

  logger.info('Info log - 7 days retention');
  logger.error('Error log - 90 days retention');
  logger.fatal('Fatal error - kept forever');

  // Check retention
  const stats = retention.getStats();
  logger.debug('Retention stats:', { metadata: stats });

  retention.shutdown();
}

/**
 * Example 5: With Context and Trace IDs
 */
async function withContext() {
  const logger = new StructuredLogger();

  async function handleRequest(userId: string) {
    const context = new LogContext({
      userId,
    });

    context.generateTraceId();
    context.generateRequestId();

    await runWithContextAsync(context, async () => {
      logger.info('Request started', {
        context: context.toJSON(),
      });

      context.startSpan();
      logger.info('Processing step 1', {
        context: context.toJSON(),
      });

      context.startSpan();
      logger.info('Processing step 2', {
        context: context.toJSON(),
      });

      context.endSpan();
      context.endSpan();

      logger.info('Request completed', {
        context: context.toJSON(),
      });
    });
  }

  await handleRequest('user-123');
}

/**
 * Example 6: Performance Tracking
 */
async function performanceTracking() {
  const logger = new StructuredLogger();

  // Using timer
  const endTimer = logger.startTimer('database-query');
  await new Promise(resolve => setTimeout(resolve, 100));
  endTimer();

  // Manual performance metrics
  logger.info('Workflow executed', {
    performance: {
      duration: 5000,
      memory: 1024 * 1024,
      cpu: 45,
    },
  });

  // Metrics
  logger.metric('api.requests', 100, 'count', {
    endpoint: '/api/users',
    method: 'GET',
    status: '200',
  });
}

/**
 * Example 7: HTTP Request Logging
 */
async function httpRequestLogging() {
  const logger = new StructuredLogger();

  logger.httpRequest('GET', '/api/users', 200, 150, {
    userId: 'user-123',
    requestId: 'req-456',
    ip: '192.168.1.1',
    userAgent: 'Mozilla/5.0...',
  });

  logger.httpRequest('POST', '/api/orders', 201, 250, {
    userId: 'user-123',
  });
}

/**
 * Example 8: Workflow Execution Logging
 */
async function workflowLogging() {
  const logger = new StructuredLogger();

  logger.workflowExecution('wf-123', 'exec-456', 'started');

  // Simulate workflow execution
  await new Promise(resolve => setTimeout(resolve, 100));

  logger.workflowExecution('wf-123', 'exec-456', 'completed', {
    duration: 100,
  });
}

/**
 * Example 9: Database Query Logging
 */
async function databaseLogging() {
  const logger = new StructuredLogger();

  logger.dbQuery('SELECT * FROM users WHERE id = ?', 45, {
    database: 'main',
    table: 'users',
    rowCount: 1,
  });

  logger.dbQuery('INSERT INTO orders VALUES (?, ?, ?)', 150, {
    database: 'main',
    table: 'orders',
    rowCount: 1,
  });
}

/**
 * Example 10: API Call Logging
 */
async function apiCallLogging() {
  const logger = new StructuredLogger();

  logger.apiCall('stripe', '/v1/charges', 200, {
    statusCode: 200,
  });

  logger.apiCall('sendgrid', '/v3/mail/send', 502, {
    statusCode: 502,
    error: new Error('Service unavailable'),
  });
}

/**
 * Example 11: Child Loggers
 */
async function childLoggers() {
  const rootLogger = new StructuredLogger({
    service: 'api-gateway',
  });

  // Create child logger for specific module
  const authLogger = rootLogger.child({
    workflowId: 'authentication',
  });

  // Create child logger for specific request
  const requestLogger = authLogger.child({
    requestId: 'req-123',
    userId: 'user-456',
  });

  rootLogger.info('Gateway started');
  authLogger.info('Auth module initialized');
  requestLogger.info('Processing authentication request');
  requestLogger.info('Authentication successful');
}

/**
 * Example 12: Health Monitoring
 */
async function healthMonitoring() {
  const logger = new StructuredLogger();
  const streamer = new LogStreamer();

  streamer.addStream({
    type: 'datadog',
    config: { apiKey: 'test-key' },
    enabled: true,
  });

  // Monitor health periodically
  setInterval(async () => {
    const health = await streamer.getHealth();
    const healthArray = Array.isArray(health) ? health : [health];
    const unhealthy = healthArray.filter(h => !h.healthy);

    if (unhealthy.length > 0) {
      logger.error('Unhealthy streams detected', undefined, { metadata: { unhealthy } });
    }
  }, 60000);

  // Monitor metrics
  setInterval(() => {
    const metrics = streamer.getMetrics();
    const metricsArray = Array.isArray(metrics) ? metrics : [metrics];
    metricsArray.forEach(m => {
      logger.debug(`Stream ${m.streamId}:`);
      logger.debug(`  Logs streamed: ${m.logsStreamed}`);
      logger.debug(`  Success rate: ${m.successRate}%`);
      logger.debug(`  Avg latency: ${m.avgLatency}ms`);
    });
  }, 60000);
}

/**
 * Example 13: Graceful Shutdown
 */
async function gracefulShutdown() {
  const logger = new StructuredLogger();
  const streamer = new LogStreamer();
  const retention = new LogRetention();
  const filter = new LogFilter();

  // Setup...

  // Handle shutdown
  process.on('SIGTERM', async () => {
    logger.info('Shutting down gracefully...');

    // Flush all buffered logs
    await streamer.flushAll();

    // Shutdown components
    await streamer.shutdown();
    retention.shutdown();
    filter.shutdown();

    logger.info('Shutdown complete');
    process.exit(0);
  });
}

// Export examples
export {
  basicSetup,
  multipleDestinations,
  withFiltering,
  withRetention,
  withContext,
  performanceTracking,
  httpRequestLogging,
  workflowLogging,
  databaseLogging,
  apiCallLogging,
  childLoggers,
  healthMonitoring,
  gracefulShutdown,
};
