# Workflow Platform - Monitoring & Observability Guide

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Components](#components)
4. [Getting Started](#getting-started)
5. [Metrics](#metrics)
6. [Logging](#logging)
7. [Distributed Tracing](#distributed-tracing)
8. [Alerting](#alerting)
9. [Health Checks](#health-checks)
10. [SLA Monitoring](#sla-monitoring)
11. [Debugging](#debugging)
12. [Dashboards](#dashboards)
13. [Runbooks](#runbooks)
14. [Troubleshooting](#troubleshooting)

## Overview

This document describes the comprehensive monitoring and observability infrastructure for the Workflow Automation Platform. Our observability stack provides:

- **Real-time Metrics**: Prometheus-based metrics collection with pre-aggregated recording rules
- **Structured Logging**: Winston-based logging with correlation IDs and distributed tracing
- **Distributed Tracing**: OpenTelemetry integration for request tracing across services
- **Multi-Channel Alerting**: Email, Slack, PagerDuty, Teams, SMS, and webhook notifications
- **Deep Health Checks**: Circuit breaker pattern for dependency health monitoring
- **SLA Monitoring**: Service Level Objectives (SLO) tracking with error budget management
- **Workflow Debugging**: Step-by-step execution inspection with performance profiling

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Application Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  Frontend    │  │   Backend    │  │   Workers    │         │
│  │              │  │     API      │  │              │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                 │                  │                  │
│         └─────────────────┴──────────────────┘                  │
│                           │                                     │
└───────────────────────────┼─────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                │                       │
        ┌───────▼──────┐        ┌──────▼───────┐
        │   Metrics    │        │   Logging    │
        │ (Prometheus) │        │  (Winston)   │
        └───────┬──────┘        └──────┬───────┘
                │                      │
        ┌───────▼──────┐        ┌──────▼───────┐
        │   Grafana    │        │ ElasticSearch│
        │  Dashboards  │        │   / Kibana   │
        └──────────────┘        └──────────────┘
                │                      │
        ┌───────▼──────────────────────▼───────┐
        │      Alerting & Notification          │
        │  (Email, Slack, PagerDuty, Teams)    │
        └───────────────────────────────────────┘
```

## Components

### 1. Enhanced Logger (`EnhancedLogger.ts`)

Production-grade structured logging with:
- Correlation ID tracking across requests
- Multiple output transports (console, file, remote)
- Automatic context injection
- Request/response logging middleware
- Performance timing utilities

**Usage:**

```typescript
import { getLogger } from '@/backend/monitoring/EnhancedLogger';

const logger = getLogger('my-service');

// Simple logging
logger.info('User logged in', { userId: '123' });
logger.error('Database error', error, { query: 'SELECT * ...' });

// With correlation context
await logger.withContext({ correlationId: 'abc-123' }, async () => {
  logger.info('Processing request'); // Automatically includes correlationId
});

// Performance timing
const endTimer = logger.startTimer('database-query');
await database.query(...);
endTimer(); // Logs: "database-query completed (duration: 145ms)"
```

### 2. OpenTelemetry Tracing (`OpenTelemetryTracing.ts`)

Distributed tracing for request flows:
- Automatic instrumentation for HTTP, database, and external calls
- Custom span creation for workflow/node execution
- Jaeger and OTLP exporter support
- W3C trace context propagation

**Usage:**

```typescript
import { getTracing } from '@/backend/monitoring/OpenTelemetryTracing';

const tracing = getTracing();

// Initialize (call once at startup)
await tracing.initialize();

// Trace an async operation
const result = await tracing.traceAsync(
  'process-workflow',
  async (span) => {
    span.setAttribute('workflow.id', workflowId);
    return await processWorkflow(workflowId);
  },
  { userId: '123' }
);

// Workflow-specific tracing
const span = tracing.startWorkflowSpan(workflowId, executionId, userId);
// ... execute workflow ...
tracing.endWorkflowSpan(executionId, 'success');
```

### 3. Prometheus Monitoring (`PrometheusMonitoring.ts`)

Metrics collection and exposure:
- Counter, Gauge, Histogram, and Summary metrics
- Default Node.js process metrics
- Custom application metrics
- Express middleware for /metrics endpoint

**Usage:**

```typescript
import PrometheusMonitoring from '@/monitoring/PrometheusMonitoring';

const prometheus = PrometheusMonitoring.getInstance();

// Increment a counter
prometheus.incCounter('workflow_workflow_executions_total', {
  status: 'success',
  workflow_id: 'wf_123'
});

// Set a gauge
prometheus.setGauge('workflow_workflow_active_executions', 5);

// Observe a histogram (timing)
const duration = Date.now() - startTime;
prometheus.observeHistogram(
  'workflow_workflow_execution_duration_seconds',
  duration / 1000,
  { workflow_id: 'wf_123' }
);

// Time an operation
const result = await prometheus.timeOperation(
  'workflow_http_request_duration_seconds',
  async () => {
    return await fetch(...);
  },
  { method: 'GET', route: '/api/workflows' }
);
```

### 4. Alerting System (`AlertingSystem.ts`)

Multi-channel alerting with deduplication and escalation:
- Email, Slack, PagerDuty, Microsoft Teams, SMS, webhooks
- Alert deduplication (same alert within time window)
- Rate limiting to prevent alert fatigue
- Escalation after configurable delay
- Alert acknowledgment and resolution

**Usage:**

```typescript
import { getAlertingSystem } from '@/backend/monitoring/AlertingSystem';

const alerting = getAlertingSystem({
  enabled: true,
  emailConfig: { /* ... */ },
  slackConfig: { webhookUrl: '...' },
  deduplicationWindow: 5, // minutes
  maxAlertsPerHour: 100
});

// Register an alert rule
alerting.registerRule({
  id: 'high-error-rate',
  name: 'High Error Rate',
  condition: (metrics) => metrics.errorRate > 0.05,
  severity: 'high',
  channels: ['email', 'slack'],
  throttle: 15, // minutes
  escalationDelay: 30, // minutes
  escalationChannels: ['pagerduty']
});

// Send an alert
await alerting.alert({
  name: 'Database Connection Failed',
  severity: 'critical',
  message: 'Unable to connect to PostgreSQL',
  source: 'database-healthcheck',
  labels: { component: 'database', host: 'db-01' },
  channels: ['email', 'slack', 'pagerduty']
});

// Acknowledge an alert
alerting.acknowledgeAlert(alertId, 'user@example.com');

// Resolve an alert
alerting.resolveAlert(alertId, 'user@example.com');
```

### 5. Health Check System (`HealthCheckSystem.ts`)

Deep health checks with circuit breaker pattern:
- Database, Redis, memory, event loop, disk space checks
- Custom health check registration
- Circuit breaker to prevent cascading failures
- Kubernetes-compatible endpoints (liveness, readiness, startup)

**Usage:**

```typescript
import { getHealthCheckSystem } from '@/backend/monitoring/HealthCheckSystem';

const healthCheck = getHealthCheckSystem();

// Register a custom health check
healthCheck.registerCheck({
  name: 'external-api',
  check: async () => {
    try {
      const response = await fetch('https://api.example.com/health');
      if (response.ok) {
        return {
          status: 'healthy',
          message: 'External API reachable',
          timestamp: new Date()
        };
      }
      return {
        status: 'unhealthy',
        message: 'External API returned error',
        timestamp: new Date()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error.message,
        timestamp: new Date()
      };
    }
  },
  critical: false,
  timeout: 5000,
  interval: 30000 // Check every 30 seconds
});

// Get system health
const health = await healthCheck.runAllChecks();
console.log(health.status); // 'healthy' | 'degraded' | 'unhealthy'

// Use as Express middleware
app.get('/health', healthCheck.healthEndpoint());
app.get('/health/ready', healthCheck.readinessEndpoint());
app.get('/health/live', healthCheck.livenessEndpoint());
```

### 6. SLA Monitoring (`SLAMonitoring.ts`)

Service Level Objective tracking and error budget management:
- Define SLOs for availability, latency, error rate
- Track Service Level Indicators (SLIs)
- Calculate error budgets
- Uptime tracking with incident analysis

**Usage:**

```typescript
import { getSLAMonitoring } from '@/backend/monitoring/SLAMonitoring';

const sla = getSLAMonitoring();

// Create an SLO
const slo = sla.createSLO({
  name: 'API Availability',
  description: '99.9% uptime',
  target: 99.9,
  window: 'month',
  metric: 'availability',
  enabled: true
});

// Record SLI measurements
sla.recordSLI(slo.id, 100); // 100% = success
sla.recordSLI(slo.id, 0);   // 0% = failure

// Record uptime
sla.recordUptime('up', 150); // Response time: 150ms
sla.recordUptime('down');
sla.recordUptime('degraded', 5000); // Slow response: 5s

// Get error budget
const budget = sla.getErrorBudget(slo.id);
console.log(`Remaining budget: ${budget.remainingPercent.toFixed(2)}%`);
console.log(`Burn rate: ${budget.burnRate.toFixed(2)} errors/hour`);

// Get uptime statistics
const stats = sla.getUptimeStats('month');
console.log(`Availability: ${stats.availability.toFixed(3)}%`);
console.log(`Incidents: ${stats.incidents}`);
console.log(`MTTR: ${stats.meanTimeToRecover}ms`);
```

### 7. Workflow Debugger (`WorkflowDebugger.ts`)

Step-by-step execution inspection and performance profiling:
- Breakpoints (node, error, conditional)
- Call stack inspection
- Variable watching
- Performance profiling
- Execution history

**Usage:**

```typescript
import { getWorkflowDebugger } from '@/backend/monitoring/WorkflowDebugger';

const debugger = getWorkflowDebugger();

// Start a debug session
const session = debugger.startSession(executionId, workflowId, userId);

// Add breakpoints
debugger.addBreakpoint({
  type: 'node',
  nodeId: 'http_request_1',
  enabled: true,
  logMessage: 'Paused at HTTP Request node'
});

debugger.addBreakpoint({
  type: 'condition',
  condition: 'variables.count > 100',
  enabled: true
});

// Step into node execution
await debugger.stepInto(
  session.id,
  'http_request_1',
  'HTTP Request',
  'http',
  { url: 'https://api.example.com', method: 'GET' }
);

// Set variables
debugger.setVariable(session.id, 'count', 150);

// Step out (when node completes)
debugger.stepOut(session.id, 'http_request_1', { statusCode: 200 });

// Get performance profile
const profile = debugger.getPerformanceProfile(session.id);
console.log('Bottlenecks:', profile.bottlenecks);

// End session
debugger.endSession(session.id, true);

// Export for analysis
const data = debugger.exportSession(session.id);
```

## Metrics

### HTTP Metrics
- `workflow_http_requests_total` - Total HTTP requests (counter)
- `workflow_http_request_duration_seconds` - Request duration (histogram)
- `workflow_http_errors_total` - HTTP errors (counter)

### Workflow Metrics
- `workflow_workflow_executions_total` - Workflow executions (counter)
- `workflow_workflow_execution_duration_seconds` - Execution duration (histogram)
- `workflow_workflow_active_executions` - Active executions (gauge)

### Node Metrics
- `workflow_node_executions_total` - Node executions (counter)
- `workflow_node_execution_duration_seconds` - Node execution duration (histogram)

### Queue Metrics
- `workflow_queue_size` - Queue depth (gauge)
- `workflow_queue_processing_rate` - Processing rate (gauge)

### Database Metrics
- `workflow_database_query_duration_seconds` - Query duration (histogram)
- `workflow_database_connections_active` - Active connections (gauge)
- `workflow_database_connections_idle` - Idle connections (gauge)

### System Metrics
- `workflow_nodejs_process_memory_heap_used_bytes` - Heap memory used (gauge)
- `workflow_nodejs_process_memory_heap_total_bytes` - Total heap memory (gauge)
- `workflow_nodejs_process_cpu_usage` - CPU usage (gauge)
- `workflow_nodejs_event_loop_lag_seconds` - Event loop lag (gauge)

## Dashboards

### Comprehensive Monitoring Dashboard

Access at: `http://localhost:3003` (Grafana)

Panels:
1. **System Overview**
   - Request Rate
   - Error Rate
   - Response Time (P95)

2. **Workflow Execution**
   - Execution Rate
   - Success Rate (gauge)
   - Active Workflows

3. **Resource Utilization**
   - Memory Usage
   - CPU Usage
   - Event Loop Lag

4. **Database Performance**
   - Query Duration (P50, P95, P99)
   - Connection Pool Usage
   - Slow Queries

5. **SLA Metrics**
   - Availability
   - Error Budget Remaining
   - Success Rate Trend

## Runbooks

### High Error Rate Alert

**Severity**: Critical

**Symptoms**:
- Error rate > 5% for 2+ minutes
- Multiple 5xx responses
- Users reporting failures

**Investigation**:
1. Check Grafana dashboard for error patterns
2. Review logs: `kubectl logs -f deployment/workflow-app --tail=100`
3. Check health endpoint: `curl http://app:3001/health/ready`
4. Verify database connection: Check PostgreSQL metrics
5. Check Redis connection: Verify cache availability

**Resolution**:
1. If database issue: Scale database or restart connections
2. If memory leak: Restart application pods
3. If external API: Enable circuit breaker or use fallback
4. If code bug: Deploy hotfix or rollback

**Escalation**: Escalate to on-call engineer after 15 minutes

### Database Connection Failed

**Severity**: Critical

**Symptoms**:
- Health check failing
- Database queries timing out
- Connection pool exhausted

**Investigation**:
1. Check database status: `pg_isready -h db-host`
2. Check connection count: Query `pg_stat_activity`
3. Review database logs
4. Check network connectivity

**Resolution**:
1. Restart PostgreSQL if hung
2. Kill long-running queries
3. Increase connection pool size (if needed)
4. Scale database vertically

### Memory Leak Detected

**Severity**: High

**Symptoms**:
- Memory usage continuously increasing
- Heap usage > 90%
- OOM kills

**Investigation**:
1. Take heap snapshot: Use Node.js inspector
2. Analyze memory profile in Chrome DevTools
3. Check for:
   - Unclosed database connections
   - Event listeners not removed
   - Large caches not being pruned
   - Circular references

**Resolution**:
1. Immediate: Restart affected pods
2. Short-term: Increase memory limit
3. Long-term: Fix memory leak in code

## Troubleshooting

### Metrics Not Appearing

**Problem**: Prometheus not scraping metrics

**Solution**:
1. Check Prometheus targets: `http://localhost:9090/targets`
2. Verify /metrics endpoint: `curl http://app:3001/metrics`
3. Check Prometheus config: `monitoring/prometheus.yml`
4. Restart Prometheus: `docker-compose restart prometheus`

### Alerts Not Sending

**Problem**: Alerts not reaching channels

**Solution**:
1. Check alerting config in code
2. Verify webhook URLs / API keys
3. Check logs for delivery errors
4. Test individual channels manually

### Tracing Not Working

**Problem**: Traces not appearing in Jaeger

**Solution**:
1. Verify OpenTelemetry initialization
2. Check Jaeger endpoint configuration
3. Ensure OTLP exporter is configured
4. Check Jaeger UI: `http://localhost:16686`

### Health Checks Failing

**Problem**: Health endpoint returns 503

**Solution**:
1. Check individual check results in response
2. Review circuit breaker states
3. Verify dependency availability
4. Check timeout configurations

## Best Practices

1. **Always use correlation IDs** for request tracing
2. **Set appropriate log levels** (debug in dev, info in prod)
3. **Define SLOs** for critical user journeys
4. **Monitor error budgets** to avoid SLA breaches
5. **Use structured logging** for better searchability
6. **Set up alerting** for all critical metrics
7. **Create runbooks** for common incidents
8. **Review dashboards** regularly for trends
9. **Test alerting** channels periodically
10. **Archive old debug sessions** to prevent memory bloat

## Configuration

### Environment Variables

```bash
# Logging
LOG_LEVEL=info                  # debug, info, warn, error
LOG_FORMAT=json                 # json, text, structured

# Tracing
JAEGER_ENDPOINT=http://jaeger:14268/api/traces
OTLP_ENDPOINT=http://otel-collector:4317
ENABLE_TRACING=true

# Metrics
PROMETHEUS_PORT=9464
ENABLE_METRICS=true

# Alerting
ALERT_EMAIL_HOST=smtp.gmail.com
ALERT_EMAIL_PORT=587
ALERT_SLACK_WEBHOOK=https://hooks.slack.com/...
ALERT_PAGERDUTY_API_KEY=...

# Health Checks
HEALTH_CHECK_INTERVAL=30000     # milliseconds
CIRCUIT_BREAKER_THRESHOLD=5
CIRCUIT_BREAKER_TIMEOUT=60000   # milliseconds
```

## Maintenance

### Regular Tasks

**Daily**:
- Review error budgets
- Check for critical alerts
- Monitor system health

**Weekly**:
- Analyze slow queries
- Review incident reports
- Update dashboards

**Monthly**:
- Review SLA compliance
- Archive old debug sessions
- Update runbooks
- Test disaster recovery

## Support

For issues or questions:
- Create an issue in the repository
- Contact: monitoring-team@workflow-platform.com
- Slack: #monitoring-alerts

## References

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [Winston Logger](https://github.com/winstonjs/winston)
- [SRE Book - Monitoring Distributed Systems](https://sre.google/sre-book/monitoring-distributed-systems/)
