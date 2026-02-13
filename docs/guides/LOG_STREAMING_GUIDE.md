# Log Streaming & Advanced Monitoring Guide

## Overview

This guide covers the comprehensive log streaming and monitoring system implemented for the workflow automation platform. The system provides real-time log streaming to third-party services with structured logging, retention policies, and advanced filtering capabilities.

## Table of Contents

1. [Architecture](#architecture)
2. [Quick Start](#quick-start)
3. [Supported Integrations](#supported-integrations)
4. [Structured Logging](#structured-logging)
5. [Retention Policies](#retention-policies)
6. [Filtering & Sampling](#filtering--sampling)
7. [Performance & Monitoring](#performance--monitoring)
8. [Configuration Examples](#configuration-examples)
9. [Best Practices](#best-practices)
10. [Troubleshooting](#troubleshooting)

## Architecture

The log streaming system consists of several key components:

### Core Components

1. **LogStreamer** - Main orchestrator that manages multiple stream destinations
2. **StreamBuffer** - Buffering and batching logic for performance
3. **StreamTransport** - Abstract base class for integrations
4. **StructuredLogger** - JSON structured logging with context management
5. **LogContext** - Request-scoped context with trace IDs
6. **LogRetention** - Retention policy engine with auto-cleanup
7. **LogFilter** - Advanced filtering and sampling

### Architecture Diagram

```
┌─────────────────┐
│ Application     │
│ (Your Code)     │
└────────┬────────┘
         │
         ▼
┌─────────────────────┐
│ StructuredLogger    │
│ - Context Management│
│ - Trace IDs         │
│ - Performance       │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│ LogFilter           │
│ - Level Filtering   │
│ - Sampling          │
│ - Rate Limiting     │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│ LogStreamer         │
│ - Multi-destination │
│ - Health Monitoring │
└────────┬────────────┘
         │
         ├──────────────────┬──────────────────┬───────────────┐
         ▼                  ▼                  ▼               ▼
    ┌─────────┐       ┌─────────┐       ┌──────────┐   ┌──────────┐
    │ Datadog │       │ Splunk  │       │Elasticsearch  │CloudWatch│
    └─────────┘       └─────────┘       └──────────┘   └──────────┘
```

## Quick Start

### Basic Setup

```typescript
import { LogStreamer } from './logging/LogStreamer';
import { StructuredLogger } from './logging/StructuredLogger';

// Create logger
const logger = new StructuredLogger({
  service: 'my-service',
  environment: 'production',
  version: '1.0.0',
});

// Create streamer
const streamer = new LogStreamer();

// Add Datadog stream
const datadogStreamId = streamer.addStream({
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
logger.info('Application started', {
  metadata: { version: '1.0.0' },
});

logger.error('Something went wrong', new Error('Test error'));
```

### Multiple Destinations

```typescript
// Add multiple streams
const streams = [
  {
    type: 'datadog' as const,
    config: {
      apiKey: process.env.DATADOG_API_KEY!,
      service: 'workflow-platform',
    },
  },
  {
    type: 'elasticsearch' as const,
    config: {
      url: 'https://elastic.company.com',
      index: 'workflow-logs',
      username: 'elastic',
      password: process.env.ELASTIC_PASSWORD!,
    },
  },
  {
    type: 'cloudwatch' as const,
    config: {
      region: 'us-east-1',
      logGroupName: '/aws/workflow-platform',
      logStreamName: 'production',
    },
  },
];

streams.forEach(stream => {
  streamer.addStream({ ...stream, enabled: true });
});
```

## Supported Integrations

### 1. Datadog Logs

**Features:**
- Real-time log ingestion
- Automatic tagging
- Trace correlation
- Advanced querying

**Configuration:**

```typescript
streamer.addStream({
  type: 'datadog',
  config: {
    apiKey: 'YOUR_API_KEY',
    site: 'datadoghq.com', // or 'datadoghq.eu'
    service: 'workflow-platform',
    source: 'nodejs',
    hostname: 'prod-server-01',
    tags: ['env:production', 'team:platform'],
    ddsource: 'nodejs',
    compression: true,
  },
  enabled: true,
  buffer: {
    size: 100,
    flushInterval: 5000,
  },
  retry: {
    maxRetries: 3,
    backoffMs: 1000,
  },
});
```

**Environment Variables:**
```bash
DATADOG_API_KEY=your_api_key_here
DATADOG_SITE=datadoghq.com
```

### 2. Splunk HTTP Event Collector

**Features:**
- High-volume ingestion
- Flexible indexing
- Custom sourcetypes
- Field extraction

**Configuration:**

```typescript
streamer.addStream({
  type: 'splunk',
  config: {
    url: 'https://splunk.company.com:8088',
    token: 'YOUR_HEC_TOKEN',
    index: 'workflow_logs',
    source: 'workflow-platform',
    sourcetype: 'nodejs:json',
    validateSSL: true,
    compression: false,
  },
  enabled: true,
});
```

**Environment Variables:**
```bash
SPLUNK_HEC_URL=https://splunk.company.com:8088
SPLUNK_HEC_TOKEN=your_hec_token_here
SPLUNK_INDEX=workflow_logs
```

### 3. Elasticsearch

**Features:**
- Full-text search
- Aggregations
- Kibana visualization
- Index lifecycle management

**Configuration:**

```typescript
streamer.addStream({
  type: 'elasticsearch',
  config: {
    url: 'https://elasticsearch.company.com',
    index: 'workflow-logs',
    username: 'elastic',
    password: 'YOUR_PASSWORD',
    // Or use API key
    apiKey: 'YOUR_API_KEY',
    pipeline: 'workflow-pipeline',
    validateSSL: true,
    compression: true,
  },
  enabled: true,
});
```

**Environment Variables:**
```bash
ELASTIC_URL=https://elasticsearch.company.com
ELASTIC_USERNAME=elastic
ELASTIC_PASSWORD=your_password_here
ELASTIC_INDEX=workflow-logs
```

### 4. AWS CloudWatch Logs

**Features:**
- AWS native integration
- CloudWatch Insights
- Alarms and metrics
- Log retention

**Configuration:**

```typescript
streamer.addStream({
  type: 'cloudwatch',
  config: {
    region: 'us-east-1',
    logGroupName: '/aws/workflow-platform',
    logStreamName: 'production',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.AWS_SESSION_TOKEN,
  },
  enabled: true,
});
```

**Environment Variables:**
```bash
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_LOG_GROUP=/aws/workflow-platform
AWS_LOG_STREAM=production
```

### 5. Google Cloud Logging

**Features:**
- Stackdriver integration
- Log-based metrics
- Cloud Trace correlation
- BigQuery export

**Configuration:**

```typescript
streamer.addStream({
  type: 'gcp',
  config: {
    projectId: 'your-project-id',
    logName: 'workflow-platform',
    credentials: {
      client_email: 'service-account@project.iam.gserviceaccount.com',
      private_key: process.env.GCP_PRIVATE_KEY!,
    },
    resource: {
      type: 'gce_instance',
      labels: {
        instance_id: 'prod-01',
        zone: 'us-central1-a',
      },
    },
  },
  enabled: true,
});
```

**Environment Variables:**
```bash
GCP_PROJECT_ID=your-project-id
GCP_SERVICE_ACCOUNT_EMAIL=service-account@project.iam.gserviceaccount.com
GCP_PRIVATE_KEY=your_private_key_here
```

## Structured Logging

### Basic Logging

```typescript
import { StructuredLogger } from './logging/StructuredLogger';

const logger = new StructuredLogger();

// Simple logs
logger.info('User logged in');
logger.warn('High memory usage detected');
logger.error('Database connection failed', new Error('Connection timeout'));

// With metadata
logger.info('Order created', {
  metadata: {
    orderId: 'order-123',
    amount: 99.99,
    currency: 'USD',
  },
});

// With context
logger.info('Payment processed', {
  context: {
    userId: 'user-456',
    sessionId: 'session-789',
  },
  metadata: {
    paymentMethod: 'credit_card',
    amount: 49.99,
  },
});
```

### Performance Tracking

```typescript
// Using timer
const endTimer = logger.startTimer('database-query');
await db.query('SELECT * FROM users');
endTimer(); // Automatically logs duration

// Manual performance metrics
logger.info('Workflow executed', {
  performance: {
    duration: 5000, // ms
    memory: 1024 * 1024, // bytes
    cpu: 45, // percent
  },
});

// Metrics
logger.metric('api.request.count', 1, 'count', {
  endpoint: '/api/users',
  method: 'GET',
  status: '200',
});
```

### Context Management

```typescript
import { LogContext, runWithContext } from './logging/LogContext';

// Create context
const context = new LogContext({
  service: 'api-gateway',
  userId: 'user-123',
});

// Generate trace ID
context.generateTraceId();

// Start a span
const spanId = context.startSpan();

// Run with context
await runWithContextAsync(context, async () => {
  logger.info('Processing request');
  await processRequest();
  logger.info('Request completed');
});

// End span
context.endSpan();
```

### Child Loggers

```typescript
// Create child logger with additional context
const requestLogger = logger.child({
  requestId: 'req-123',
  userId: 'user-456',
});

requestLogger.info('Request started');
requestLogger.info('Request completed');

// All logs from requestLogger include requestId and userId
```

### Specialized Logging

```typescript
// HTTP requests
logger.httpRequest('POST', '/api/orders', 201, 150, {
  userId: 'user-123',
  ip: '192.168.1.1',
  userAgent: 'Mozilla/5.0...',
});

// Workflow executions
logger.workflowExecution('wf-123', 'exec-456', 'completed', {
  duration: 5000,
});

// Database queries
logger.dbQuery('SELECT * FROM users WHERE id = ?', 45, {
  database: 'main',
  table: 'users',
  rowCount: 1,
});

// API calls
logger.apiCall('stripe', '/v1/charges', 200, {
  statusCode: 200,
});
```

## Retention Policies

### Creating Policies

```typescript
import { LogRetention, createDefaultPolicies } from './logging/LogRetention';

const retention = new LogRetention(3600000); // Cleanup every hour

// Add custom policy
retention.addPolicy({
  name: 'Critical Errors - 1 Year',
  period: '1y',
  levels: ['error', 'fatal'],
  enabled: true,
  priority: 10,
});

// Add category-based policy
retention.addPolicy({
  name: 'Audit Logs - Forever',
  period: 'forever',
  categories: ['security', 'audit'],
  enabled: true,
  priority: 20,
});

// Add conditional policy
retention.addPolicy({
  name: 'Failed Workflows - 90 Days',
  period: '90d',
  categories: ['workflow'],
  conditions: [
    {
      field: 'context.status',
      operator: 'eq',
      value: 'failed',
    },
  ],
  enabled: true,
  priority: 15,
});
```

### Default Policies

```typescript
// Use built-in default policies
const policies = createDefaultPolicies();
policies.forEach(policy => {
  retention.addPolicy(policy);
});

// Default policies include:
// - Error Logs: 90 days
// - Warning Logs: 30 days
// - Info Logs: 7 days
// - Debug Logs: 7 days
// - Workflow Executions: 1 year
// - Security & Audit: Forever
```

### Retention Periods

Available retention periods:
- `'7d'` - 7 days
- `'30d'` - 30 days
- `'90d'` - 90 days
- `'1y'` - 1 year
- `'forever'` - Never delete

### Manual Cleanup

```typescript
// Run cleanup manually
const deletedCount = await retention.cleanup();
console.log(`Deleted ${deletedCount} old logs`);

// Get statistics
const stats = retention.getStats();
console.log('Total logs:', stats.totalLogs);
console.log('Retained:', stats.retainedLogs);
console.log('Deleted:', stats.deletedLogs);
console.log('Storage used:', stats.storageUsed, 'bytes');
```

## Filtering & Sampling

### Level Filtering

```typescript
import { LogFilter } from './logging/LogFilter';

const filter = new LogFilter();

// Include only errors and warnings
filter.addRule({
  name: 'Errors and Warnings Only',
  type: 'level',
  action: 'include',
  config: {
    levels: ['error', 'warn'],
  },
  enabled: true,
});

// Exclude debug logs
filter.addRule({
  name: 'No Debug Logs',
  type: 'level',
  action: 'exclude',
  config: {
    levels: ['debug', 'trace'],
  },
  enabled: true,
});

// Minimum level filtering
filter.addRule({
  name: 'Info and Above',
  type: 'level',
  action: 'include',
  config: {
    minLevel: 'info',
  },
  enabled: true,
});
```

### Category Filtering

```typescript
// Include specific categories
filter.addRule({
  name: 'Workflow Logs Only',
  type: 'category',
  action: 'include',
  config: {
    categories: ['workflow', 'execution'],
  },
  enabled: true,
});
```

### Field Filtering

```typescript
// Filter by field value
filter.addRule({
  name: 'Production Only',
  type: 'field',
  action: 'include',
  config: {
    field: 'context.environment',
    operator: 'eq',
    value: 'production',
  },
  enabled: true,
});

// Filter by duration
filter.addRule({
  name: 'Slow Requests',
  type: 'field',
  action: 'include',
  config: {
    field: 'performance.duration',
    operator: 'gt',
    value: 1000, // > 1 second
  },
  enabled: true,
});
```

### Regex Filtering

```typescript
// Filter by message pattern
filter.addRule({
  name: 'Error Pattern',
  type: 'regex',
  action: 'include',
  config: {
    pattern: 'ERROR:\\s+\\d{3}',
    flags: 'i',
  },
  enabled: true,
});
```

### Sampling

```typescript
// Sample 10% of debug logs
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

// Sample all logs at 50%
filter.addRule({
  name: 'Sample All Logs',
  type: 'sample',
  action: 'include',
  config: {
    sampleRate: 0.5, // 50%
  },
  enabled: true,
});
```

### Rate Limiting

```typescript
// Limit to 100 logs per second
filter.addRule({
  name: 'Rate Limit',
  type: 'rate',
  action: 'include',
  config: {
    maxPerSecond: 100,
    maxPerMinute: 5000,
    maxPerHour: 100000,
  },
  enabled: true,
});
```

## Performance & Monitoring

### Stream Metrics

```typescript
// Get metrics for specific stream
const metrics = streamer.getMetrics(streamId);
console.log('Logs streamed:', metrics.logsStreamed);
console.log('Logs failed:', metrics.logsFailed);
console.log('Success rate:', metrics.successRate, '%');
console.log('Average latency:', metrics.avgLatency, 'ms');

// Get metrics for all streams
const allMetrics = streamer.getMetrics();
allMetrics.forEach(m => {
  console.log(`Stream ${m.streamId}:`, m.logsStreamed, 'logs');
});
```

### Health Monitoring

```typescript
// Check health of specific stream
const health = await streamer.getHealth(streamId);
console.log('Healthy:', health.healthy);
console.log('Status:', health.status);
console.log('Latency:', health.latency, 'ms');
console.log('Error rate:', health.errorRate, '%');
console.log('Buffer utilization:', health.bufferUtilization, '%');

if (!health.healthy) {
  console.log('Issues:', health.issues);
}

// Check all streams
const allHealth = await streamer.getHealth();
const unhealthy = allHealth.filter(h => !h.healthy);
if (unhealthy.length > 0) {
  console.warn('Unhealthy streams:', unhealthy);
}
```

### Event Monitoring

```typescript
// Listen to streamer events
streamer.on('stream:added', ({ streamId, type }) => {
  console.log(`Stream ${streamId} (${type}) added`);
});

streamer.on('stream:flushed', ({ streamId, count, latency }) => {
  console.log(`Stream ${streamId} flushed ${count} logs in ${latency}ms`);
});

streamer.on('stream:failed', ({ streamId, count, error }) => {
  console.error(`Stream ${streamId} failed to send ${count} logs:`, error);
});

streamer.on('stream:retry', ({ streamId, attempt, maxRetries, delay }) => {
  console.log(`Stream ${streamId} retry ${attempt}/${maxRetries} after ${delay}ms`);
});

streamer.on('stream:overflow', ({ streamId, log }) => {
  console.warn(`Stream ${streamId} buffer overflow, dropped log:`, log.id);
});

streamer.on('stream:health', (health) => {
  if (!health.healthy) {
    console.warn(`Stream ${health.streamId} unhealthy:`, health.issues);
  }
});
```

### Buffer Statistics

```typescript
// Get buffer stats
const stats = buffer.getStats();
console.log('Current size:', stats.size);
console.log('Utilization:', stats.utilization, '%');
console.log('Total added:', stats.totalAdded);
console.log('Total flushed:', stats.totalFlushed);
console.log('Total dropped:', stats.totalDropped);
console.log('Last flush:', stats.lastFlush);
```

## Configuration Examples

### Development Environment

```typescript
// Minimal logging for development
const logger = new StructuredLogger({
  service: 'workflow-platform',
  environment: 'development',
}, 'debug');

// Console output only
const streamer = new LogStreamer();
const consoleStream = streamer.addStream({
  type: 'datadog', // Use any type, but don't enable
  config: { apiKey: 'dummy' },
  enabled: false, // Disabled for dev
});

// Log to console instead
logger.on('log', (log) => {
  console.log(JSON.stringify(log, null, 2));
});
```

### Production Environment

```typescript
// Full logging for production
const logger = new StructuredLogger({
  service: 'workflow-platform',
  environment: 'production',
  version: process.env.APP_VERSION,
  host: process.env.HOSTNAME,
}, 'info'); // Minimum level: info

const streamer = new LogStreamer({
  maxStreams: 10,
  healthCheckIntervalMs: 30000,
  metricsIntervalMs: 60000,
});

// Multiple destinations
streamer.addStream({
  type: 'datadog',
  config: {
    apiKey: process.env.DATADOG_API_KEY!,
    service: 'workflow-platform',
    tags: ['env:production'],
  },
  enabled: true,
  buffer: {
    size: 100,
    flushInterval: 5000,
  },
  retry: {
    maxRetries: 3,
    backoffMs: 1000,
  },
});

streamer.addStream({
  type: 'elasticsearch',
  config: {
    url: process.env.ELASTIC_URL!,
    index: 'workflow-logs',
    apiKey: process.env.ELASTIC_API_KEY!,
  },
  enabled: true,
});

// Apply filters
const filter = new LogFilter();
filter.addRule({
  name: 'Sample Debug Logs',
  type: 'sample',
  action: 'include',
  config: {
    sampleRate: 0.1,
    sampleLevels: ['debug'],
  },
  enabled: true,
});

// Apply retention
const retention = new LogRetention();
createDefaultPolicies().forEach(p => retention.addPolicy(p));

// Connect components
logger.on('log', async (log) => {
  if (filter.filter(log)) {
    await streamer.stream(log);
    retention.addLog(log);
  }
});
```

### High-Volume Environment

```typescript
// Optimized for high volume
const streamer = new LogStreamer({
  defaultBufferSize: 500, // Larger buffer
  defaultFlushInterval: 2000, // More frequent flushes
});

// Aggressive sampling
const filter = new LogFilter();
filter.addRule({
  name: 'Sample Info Logs',
  type: 'sample',
  action: 'include',
  config: {
    sampleRate: 0.05, // 5%
    sampleLevels: ['info', 'debug'],
  },
  enabled: true,
});

// Rate limiting
filter.addRule({
  name: 'Rate Limit',
  type: 'rate',
  action: 'include',
  config: {
    maxPerSecond: 1000,
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
```

## Best Practices

### 1. Use Structured Logging

✅ **Good:**
```typescript
logger.info('User action completed', {
  metadata: {
    action: 'purchase',
    userId: 'user-123',
    amount: 99.99,
    currency: 'USD',
  },
});
```

❌ **Bad:**
```typescript
logger.info(`User user-123 completed purchase of $99.99 USD`);
```

### 2. Include Context

✅ **Good:**
```typescript
const requestLogger = logger.child({
  requestId: req.id,
  userId: req.user.id,
  sessionId: req.session.id,
});

requestLogger.info('Processing request');
// All subsequent logs include request context
```

❌ **Bad:**
```typescript
logger.info('Processing request');
// Missing context
```

### 3. Use Appropriate Log Levels

- **trace**: Very detailed debugging (usually disabled)
- **debug**: Detailed debugging information
- **info**: General informational messages
- **warn**: Warning messages, potential issues
- **error**: Error messages, recoverable errors
- **fatal**: Fatal errors, unrecoverable

### 4. Add Performance Metrics

✅ **Good:**
```typescript
const timer = logger.startTimer('database-query');
const result = await db.query(...);
timer(); // Logs duration automatically
```

### 5. Use Trace IDs

```typescript
const context = new LogContext();
context.generateTraceId();

// All logs in this request will have the same trace ID
await runWithContextAsync(context, async () => {
  logger.info('Step 1');
  logger.info('Step 2');
  logger.info('Step 3');
});
```

### 6. Handle Sensitive Data

```typescript
// Don't log sensitive data
logger.info('User authenticated', {
  metadata: {
    userId: user.id,
    // ❌ password: user.password,
    // ❌ token: user.authToken,
  },
});
```

### 7. Use Sampling for High-Volume Logs

```typescript
// Sample debug logs to reduce volume
filter.addRule({
  name: 'Sample Debug',
  type: 'sample',
  action: 'include',
  config: {
    sampleRate: 0.1,
    sampleLevels: ['debug'],
  },
  enabled: true,
});
```

### 8. Monitor Stream Health

```typescript
// Regularly check stream health
setInterval(async () => {
  const health = await streamer.getHealth();
  const unhealthy = health.filter(h => !h.healthy);

  if (unhealthy.length > 0) {
    console.error('Unhealthy streams detected:', unhealthy);
    // Alert operations team
  }
}, 60000); // Every minute
```

### 9. Implement Graceful Shutdown

```typescript
process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');

  // Flush all buffered logs
  await streamer.flushAll();

  // Shutdown components
  await streamer.shutdown();
  retention.shutdown();
  filter.shutdown();

  process.exit(0);
});
```

### 10. Test Your Logging

```typescript
// Unit test example
it('should log with correct structure', () => {
  const logs: StreamedLog[] = [];
  logger.on('log', (log) => logs.push(log));

  logger.info('Test message', {
    metadata: { key: 'value' },
  });

  expect(logs[0].message).toBe('Test message');
  expect(logs[0].level).toBe('info');
  expect(logs[0].metadata).toEqual({ key: 'value' });
});
```

## Troubleshooting

### Logs Not Appearing in Destination

1. **Check stream status:**
```typescript
const health = await streamer.getHealth(streamId);
console.log('Status:', health.status);
console.log('Issues:', health.issues);
```

2. **Check metrics:**
```typescript
const metrics = streamer.getMetrics(streamId);
console.log('Failed logs:', metrics.logsFailed);
console.log('Error count:', metrics.errors);
```

3. **Enable debug logging:**
```typescript
streamer.on('stream:failed', ({ streamId, error }) => {
  console.error('Stream failed:', streamId, error);
});

streamer.on('stream:retry', ({ streamId, attempt, error }) => {
  console.log('Stream retry:', streamId, attempt, error);
});
```

### High Latency

1. **Increase buffer size:**
```typescript
streamer.addStream({
  // ...
  buffer: {
    size: 500, // Larger buffer
    flushInterval: 2000, // More frequent flushes
  },
});
```

2. **Enable compression:**
```typescript
streamer.addStream({
  type: 'datadog',
  config: {
    // ...
    compression: true,
  },
});
```

### Buffer Overflows

1. **Check buffer utilization:**
```typescript
const health = await streamer.getHealth(streamId);
console.log('Buffer utilization:', health.bufferUtilization, '%');
```

2. **Increase buffer size or flush interval:**
```typescript
buffer: {
  size: 1000, // Increase size
  flushInterval: 1000, // Flush more frequently
}
```

3. **Apply rate limiting:**
```typescript
filter.addRule({
  type: 'rate',
  config: {
    maxPerSecond: 100,
  },
});
```

### Authentication Errors

**Datadog:**
- Verify API key is correct
- Check if key has write permissions
- Verify site is correct (datadoghq.com vs datadoghq.eu)

**Elasticsearch:**
- Verify username/password or API key
- Check user has index permissions
- Verify SSL certificate if using HTTPS

**CloudWatch:**
- Verify AWS credentials
- Check IAM permissions (logs:PutLogEvents)
- Verify log group and stream exist

**GCP:**
- Verify service account credentials
- Check service account has logging.logWriter role
- Verify project ID is correct

### Performance Issues

1. **Enable sampling:**
```typescript
streamer.addStream({
  // ...
  sampling: {
    rate: 0.1, // Sample 10%
    levels: ['debug', 'info'],
  },
});
```

2. **Monitor metrics:**
```typescript
setInterval(() => {
  const metrics = streamer.getMetrics();
  metrics.forEach(m => {
    console.log(`Stream ${m.streamId}:`);
    console.log('  Latency:', m.avgLatency, 'ms');
    console.log('  Success rate:', m.successRate, '%');
  });
}, 60000);
```

## Support

For issues and questions:
- GitHub Issues: https://github.com/your-org/workflow-automation/issues
- Documentation: https://docs.workflow-platform.com
- Email: support@workflow-platform.com

## License

MIT
