# Advanced Monitoring & Analytics

This module provides comprehensive monitoring, observability, and analytics capabilities for the workflow automation platform, including APM, distributed tracing, log aggregation, metrics visualization, and alerting systems.

## Components

### 1. Real-Time Analytics Engine (`analytics/RealTimeAnalyticsEngine.ts`)
Advanced real-time analytics system for monitoring and processing metrics:

#### Features
- **Stream Processing**: Real-time data ingestion with configurable sampling
- **Time-Series Aggregation**: Multiple aggregation functions (sum, avg, min, max, percentiles)
- **Anomaly Detection**: Statistical anomaly detection using z-score analysis
- **Alert Management**: Configurable alerting with multiple notification channels
- **Multi-Backend Storage**: Support for InfluxDB, Elasticsearch, TimescaleDB, Redis
- **Dashboard Creation**: Dynamic dashboard generation and rendering
- **Query Engine**: Flexible metric querying with filters and aggregations

#### Usage
```typescript
const analyticsEngine = new RealTimeAnalyticsEngine({
  sampling: { rate: 1.0, maxPointsPerSecond: 10000 },
  aggregation: {
    windows: [
      { size: 60000, functions: ['avg', 'sum', 'p95'] },
      { size: 300000, functions: ['avg', 'max'] }
    ]
  },
  anomalyDetection: {
    enabled: true,
    algorithm: 'zscore',
    threshold: 2.5,
    minSamples: 30
  },
  storage: {
    backends: [
      {
        type: 'influxdb',
        config: {
          url: 'http://localhost:8086',
          database: 'workflow_metrics',
          retention: '30d'
        }
      }
    ]
  }
});

// Ingest data points
await analyticsEngine.ingestDataPoint({
  metric: 'workflow.execution.duration',
  value: 1250,
  timestamp: Date.now(),
  dimensions: {
    workflowId: 'wf-123',
    environment: 'production',
    region: 'us-east-1'
  }
});

// Query metrics
const result = await analyticsEngine.queryMetric({
  metric: 'workflow.execution.duration',
  aggregation: 'avg',
  timeRange: { from: Date.now() - 3600000, to: Date.now() },
  groupBy: ['environment'],
  filters: { workflowId: 'wf-123' }
});

// Create dashboard
const dashboard = analyticsEngine.createDashboard({
  name: 'Workflow Performance',
  widgets: [
    {
      type: 'timeseries',
      title: 'Execution Duration',
      query: {
        metric: 'workflow.execution.duration',
        aggregation: 'avg',
        groupBy: ['environment']
      }
    }
  ]
});
```

### 2. APM (Application Performance Monitoring) System (`apm/APMSystem.ts`)
Comprehensive application performance monitoring with transaction tracing:

#### Features
- **Transaction Tracking**: Full request lifecycle monitoring
- **Span Management**: Distributed operation tracking with parent-child relationships
- **Error Reporting**: Automatic error capture with stack traces and context
- **Real-time Metrics**: System, process, and Node.js runtime metrics
- **Alert Rules**: Configurable performance and error alerting
- **Multi-channel Notifications**: Email, Slack, webhook, PagerDuty integration
- **Transport Layer**: Batch processing and multiple backend support

#### Usage
```typescript
const apmSystem = new APMSystem({
  serviceName: 'workflow-api',
  serviceVersion: '1.0.0',
  environment: 'production',
  sampling: {
    transactionSampleRate: 0.1,
    errorSampleRate: 1.0,
    spanCompressionEnabled: true
  },
  transport: {
    endpoint: 'http://apm-server:8200',
    batchSize: 100,
    batchInterval: 5000
  },
  alerting: {
    enabled: true,
    rules: [
      {
        id: 'high-error-rate',
        name: 'High Error Rate',
        enabled: true,
        conditions: {
          metric: 'error_rate',
          aggregation: 'rate',
          operator: 'gt',
          threshold: 0.05,
          duration: 300000
        },
        actions: {
          severity: 'critical',
          channels: ['email', 'pagerduty']
        }
      }
    ]
  }
});

// Start transaction
const transaction = apmSystem.startTransaction('GET /api/workflows', 'server');

// Add context
apmSystem.addTransactionContext(transaction.id, {
  request: {
    url: '/api/workflows',
    method: 'GET',
    headers: { 'user-agent': 'curl/7.68.0' }
  },
  user: { id: 'user123', email: 'user@example.com' }
});

// Create span
const span = apmSystem.startSpan(transaction.id, 'db.query', 'db');
apmSystem.addSpanContext(span.id, {
  database: {
    type: 'postgresql',
    statement: 'SELECT * FROM workflows WHERE user_id = $1',
    name: 'workflows_db'
  }
});

// End span and transaction
apmSystem.endSpan(span.id, 'completed');
apmSystem.endTransaction(transaction.id, 'completed');

// Report error
apmSystem.reportError(new Error('Database connection failed'), {
  custom: { queryId: 'q123', retries: 3 }
}, transaction.id, span.id);
```

### 3. Log Aggregation Service (`logging/LogAggregationService.ts`)
Centralized log collection, processing, and analysis system:

#### Features
- **Multi-Source Ingestion**: File, syslog, HTTP, TCP, UDP, Kafka support
- **Processing Pipelines**: Configurable filters and transformations
- **Log Parsing**: JSON, regex, grok, CSV, and custom parsers
- **Query Engine**: Elasticsearch-like query capabilities
- **Stream Management**: Real-time log stream monitoring
- **Alert System**: Log-based alerting with complex conditions
- **Dashboard Support**: Log visualization and analytics dashboards

#### Usage
```typescript
const logService = new LogAggregationService({
  storage: {
    backend: 'elasticsearch',
    connection: {
      hosts: ['http://elasticsearch:9200'],
      maxRetries: 3,
      requestTimeout: 30000
    },
    indices: [
      {
        name: 'workflow-logs',
        pattern: 'workflow-logs-*',
        settings: {
          shards: 3,
          replicas: 1,
          refreshInterval: '5s'
        }
      }
    ]
  },
  processing: {
    enableEnrichment: true,
    pipelines: [
      {
        id: 'workflow-enrichment',
        name: 'Workflow Log Enrichment',
        enabled: true,
        filters: [
          {
            type: 'json',
            config: { source: 'message', target: 'parsed' }
          },
          {
            type: 'mutate',
            config: {
              fields: ['parsed.workflowId'],
              target: 'context.workflow.id'
            }
          }
        ],
        order: 1
      }
    ]
  }
});

// Ingest log entry
logService.ingest({
  level: 'info',
  message: '{"workflowId":"wf-123","status":"completed","duration":1250}',
  service: 'workflow-engine',
  environment: 'production',
  context: {
    tenant: 'acme-corp',
    user: 'user123'
  }
});

// Query logs
const result = await logService.query({
  from: Date.now() - 3600000,
  to: Date.now(),
  levels: ['error', 'warn'],
  services: ['workflow-engine'],
  search: 'failed',
  context: { tenant: 'acme-corp' },
  limit: 100,
  sortBy: 'timestamp',
  sortOrder: 'desc'
});

// Create log stream
const stream = logService.createStream({
  name: 'Application Logs',
  type: 'file',
  config: {
    path: '/var/log/workflow/*.log',
    format: 'json',
    multiline: {
      pattern: '^\\d{4}-\\d{2}-\\d{2}',
      negate: true,
      match: 'after'
    }
  }
});

await logService.startStream(stream.id);
```

### 4. Distributed Tracing System (`tracing/DistributedTracingSystem.ts`)
OpenTelemetry-compatible distributed tracing implementation:

#### Features
- **Trace Context Propagation**: W3C TraceContext, B3, Jaeger format support
- **Span Management**: Hierarchical span relationships with detailed context
- **Sampling Strategies**: Probabilistic and rule-based sampling
- **Auto-Instrumentation**: HTTP, database, messaging system instrumentation
- **Trace Analytics**: Service maps, dependency analysis, performance insights
- **Export Support**: Jaeger, Zipkin, OTLP exporter compatibility

#### Usage
```typescript
const tracingSystem = new DistributedTracingSystem({
  serviceName: 'workflow-api',
  environment: 'production',
  sampling: {
    defaultSampleRate: 0.1,
    rules: [
      {
        service: 'workflow-api',
        operation: 'GET /health',
        sampleRate: 0.0,
        priority: 1
      },
      {
        operation: 'execute_workflow',
        sampleRate: 1.0,
        priority: 2
      }
    ]
  },
  propagation: {
    formats: ['tracecontext', 'b3', 'jaeger'],
    extractors: {
      'tracecontext': new W3CTraceContextExtractor(),
      'b3': new B3Extractor()
    }
  },
  exporters: [
    new OTLPTraceExporter({
      endpoint: 'http://jaeger:14268/api/traces'
    })
  ]
});

// Extract trace context from headers
const context = tracingSystem.extractTraceContext(request.headers);

// Start span
const span = tracingSystem.startSpan('execute_workflow', {
  parent: context,
  kind: 'server',
  tags: {
    'workflow.id': 'wf-123',
    'workflow.name': 'Data Processing',
    'http.method': 'POST'
  }
});

// Set span context
tracingSystem.setSpanContext(span.spanId, {
  workflow: {
    id: 'wf-123',
    name: 'Data Processing',
    executionId: 'exec-456'
  },
  http: {
    method: 'POST',
    url: '/api/workflows/execute',
    statusCode: 200
  }
});

// Add log event
tracingSystem.addSpanLog(span.spanId, {
  level: 'info',
  message: 'Starting workflow execution',
  'workflow.step': 'initialization'
});

// Finish span
tracingSystem.finishSpan(span.spanId, {
  status: { code: 'ok' },
  tags: { 'workflow.result': 'success' }
});

// Query traces
const traces = await tracingSystem.queryTraces({
  services: ['workflow-api'],
  operations: ['execute_workflow'],
  duration: { min: 1000 },
  hasError: false,
  limit: 100
});
```

### 5. Metrics Visualization (`visualization/MetricsVisualization.tsx`)
Rich React components for metrics visualization and dashboards:

#### Components
- **TimeSeriesChart**: Interactive time-series with multiple Y-axes, brushing, and zooming
- **PieChartVisualization**: Pie charts with customizable colors and labels
- **GaugeChart**: Gauge charts with threshold indicators
- **SingleStat**: Single value displays with change indicators and sparklines
- **MetricTable**: Sortable tables with various data type formatting

#### Features
- **Interactive Charts**: Zoom, pan, brush selection, and tooltip interactions
- **Threshold Support**: Visual threshold lines and color coding
- **Responsive Design**: Auto-scaling for different screen sizes
- **Custom Formatting**: Number, date, duration, and byte formatting
- **Export Capabilities**: PNG, SVG, and PDF export support

#### Usage
```typescript
import { TimeSeriesChart, GaugeChart, SingleStat } from './MetricsVisualization';

// Time series chart
<TimeSeriesChart
  series={[
    {
      name: 'Response Time',
      color: '#1f77b4',
      data: timeSeriesData,
      unit: 'ms',
      type: 'line'
    },
    {
      name: 'Error Rate',
      color: '#d62728',
      data: errorRateData,
      unit: '%',
      type: 'area',
      yAxis: 'right'
    }
  ]}
  config={{
    type: 'timeseries',
    title: 'API Performance',
    timeRange: { from: Date.now() - 3600000, to: Date.now() },
    thresholds: [
      { value: 1000, color: '#ff9800', label: 'Warning' },
      { value: 2000, color: '#f44336', label: 'Critical' }
    ],
    axes: {
      y: { label: 'Response Time (ms)', unit: 'ms' },
      yRight: { label: 'Error Rate (%)', unit: '%' }
    }
  }}
  onPointClick={(point, series) => {
    console.log('Point clicked:', point, series);
  }}
/>

// Gauge chart
<GaugeChart
  value={85}
  min={0}
  max={100}
  thresholds={[
    { value: 70, color: '#4caf50', label: 'Good' },
    { value: 85, color: '#ff9800', label: 'Warning' },
    { value: 95, color: '#f44336', label: 'Critical' }
  ]}
  config={{
    type: 'gauge',
    title: 'System Health Score',
    description: 'Overall system health based on multiple metrics'
  }}
/>

// Single stat
<SingleStat
  value={1250}
  previousValue={980}
  config={{
    type: 'singlestat',
    title: 'Average Response Time',
    axes: { y: { unit: 'ms' } },
    thresholds: [
      { value: 1000, color: '#ff9800', operator: 'gt' },
      { value: 2000, color: '#f44336', operator: 'gt' }
    ]
  }}
  sparklineData={sparklineData}
/>
```

### 6. Alerting & Notification System (`alerting/AlertingNotificationSystem.ts`)
Comprehensive alerting system with multi-channel notifications:

#### Features
- **Alert Rules**: Flexible rule definition with complex conditions
- **Multi-source Alerts**: Metric, log, trace, and external alert sources
- **Escalation Policies**: Multi-level escalation with customizable delays
- **Notification Channels**: Email, Slack, webhook, PagerDuty, OpsGenie, SMS
- **Alert Grouping**: Intelligent alert grouping and deduplication
- **Suppression Rules**: Time-based, dependency, and maintenance suppression
- **Recovery Conditions**: Auto-resolution based on recovery criteria

#### Usage
```typescript
const alertingSystem = new AlertingNotificationSystem();

// Create notification channel
const slackChannel = alertingSystem.createNotificationChannel({
  name: 'DevOps Slack',
  type: 'slack',
  enabled: true,
  config: {
    webhookUrl: 'https://hooks.slack.com/services/...',
    channel: '#alerts',
    username: 'AlertBot'
  },
  filters: [
    {
      type: 'severity',
      condition: { operator: 'in', value: ['warning', 'critical'] },
      enabled: true
    }
  ],
  formatting: {
    titleTemplate: '[{{severity}}] {{name}}',
    bodyTemplate: 'Alert: {{name}}\nSeverity: {{severity}}\nValue: {{metadata.actualValue}}\nThreshold: {{metadata.threshold}}'
  }
});

// Create alert rule
const alertRule = alertingSystem.createAlertRule({
  name: 'High Error Rate',
  enabled: true,
  query: {
    type: 'metric',
    datasource: 'prometheus',
    query: 'rate(http_requests_total{status=~"5.."}[5m])',
    timeRange: { from: 'now-5m', to: 'now' }
  },
  conditions: [
    {
      id: 'error-rate-condition',
      type: 'threshold',
      operator: 'gt',
      value: 0.05,
      aggregation: 'avg',
      timeWindow: 300000
    }
  ],
  evaluation: {
    interval: 60000,
    for: 300000
  },
  severity: 'critical',
  notificationChannels: [slackChannel.id],
  escalation: {
    enabled: true,
    levels: [
      {
        level: 1,
        delay: 300000,
        channels: [slackChannel.id]
      },
      {
        level: 2,
        delay: 900000,
        channels: ['pagerduty-channel-id']
      }
    ]
  }
});

// Manual alert creation
const alert = alertingSystem.createAlert({
  name: 'Database Connection Failed',
  severity: 'critical',
  status: 'open',
  source: 'workflow-engine',
  sourceType: 'external',
  tags: {
    service: 'workflow-engine',
    environment: 'production',
    database: 'postgres'
  },
  context: {
    service: 'workflow-engine',
    environment: 'production',
    custom: {
      connectionString: 'postgres://...',
      errorCode: 'ECONNREFUSED'
    }
  },
  metadata: {
    ruleId: 'manual',
    ruleName: 'Manual Alert',
    fireCount: 1,
    lastFired: Date.now(),
    evaluationDuration: 0
  }
});

// Acknowledge alert
alertingSystem.acknowledgeAlert(alert.id, 'john.doe@company.com', 'Investigating the issue');

// Resolve alert
alertingSystem.resolveAlert(alert.id, 'Database connection restored');
```

## Architecture

### Data Flow
1. **Ingestion**: Metrics, logs, and traces are ingested from various sources
2. **Processing**: Data is processed through configurable pipelines
3. **Storage**: Processed data is stored in appropriate backends
4. **Analysis**: Real-time analysis and anomaly detection
5. **Alerting**: Alert evaluation and notification delivery
6. **Visualization**: Interactive dashboards and charts

### Storage Backends
- **Metrics**: InfluxDB, Prometheus, TimescaleDB
- **Logs**: Elasticsearch, OpenSearch, Loki
- **Traces**: Jaeger, Zipkin, Elastic APM
- **Configuration**: PostgreSQL, MongoDB

### Integration Points
- **OpenTelemetry**: Standard observability data collection
- **Prometheus**: Metrics collection and alerting
- **Grafana**: Visualization and dashboards
- **ELK Stack**: Log aggregation and search
- **Jaeger**: Distributed tracing

## Configuration

### Environment Variables
```bash
# Analytics
ANALYTICS_STORAGE_BACKEND=influxdb
ANALYTICS_INFLUXDB_URL=http://localhost:8086
ANALYTICS_INFLUXDB_DATABASE=workflow_metrics

# APM
APM_SERVICE_NAME=workflow-platform
APM_ENVIRONMENT=production
APM_SERVER_URL=http://apm-server:8200
APM_SAMPLING_RATE=0.1

# Logging
LOG_STORAGE_BACKEND=elasticsearch
LOG_ELASTICSEARCH_HOSTS=http://elasticsearch:9200
LOG_INDEX_PREFIX=workflow-logs

# Tracing
TRACING_ENDPOINT=http://jaeger:14268/api/traces
TRACING_SAMPLING_RATE=0.1
TRACING_SERVICE_NAME=workflow-platform

# Alerting
ALERTING_ENABLED=true
ALERTING_SMTP_HOST=smtp.company.com
ALERTING_SLACK_WEBHOOK=https://hooks.slack.com/services/...
```

### Service Configuration
```typescript
const monitoringConfig = {
  analytics: {
    enabled: true,
    retention: '30d',
    aggregationWindows: ['1m', '5m', '1h', '1d']
  },
  apm: {
    enabled: true,
    sampling: { rate: 0.1 },
    instrumentation: ['http', 'database', 'messaging']
  },
  logging: {
    enabled: true,
    level: 'info',
    structured: true,
    retention: '90d'
  },
  tracing: {
    enabled: true,
    sampling: { rate: 0.1 },
    exporters: ['jaeger', 'otlp']
  },
  alerting: {
    enabled: true,
    evaluationInterval: 60000,
    notificationChannels: ['email', 'slack', 'pagerduty']
  }
};
```

## Performance Considerations

### Scalability
- **Horizontal Scaling**: All components support horizontal scaling
- **Load Balancing**: Built-in load balancing for high availability
- **Partitioning**: Time-based and hash-based data partitioning
- **Caching**: Multi-tier caching for query performance

### Resource Management
- **Memory Usage**: Configurable buffer sizes and cache limits
- **CPU Usage**: Efficient data processing with worker pools
- **Storage**: Automatic data retention and cleanup policies
- **Network**: Batch processing and compression for efficiency

### Monitoring Best Practices
- **Sampling**: Use appropriate sampling rates to balance detail and performance
- **Indexing**: Proper index design for query performance
- **Retention**: Configure appropriate retention policies
- **Alerting**: Avoid alert fatigue with proper filtering and grouping

## Security Features

### Data Protection
- **Encryption**: Data encryption at rest and in transit
- **Authentication**: API key and JWT-based authentication
- **Authorization**: Role-based access control
- **Audit Logging**: Comprehensive audit trails

### Privacy Compliance
- **Data Masking**: Automatic PII detection and masking
- **GDPR Compliance**: Right to be forgotten implementation
- **Data Residency**: Configurable data location and residency

## Troubleshooting

### Common Issues

1. **High Memory Usage**
   - Reduce buffer sizes and sampling rates
   - Implement data retention policies
   - Use appropriate aggregation windows

2. **Query Performance**
   - Optimize index configuration
   - Use proper time range filters
   - Implement query result caching

3. **Alert Fatigue**
   - Configure proper alert grouping
   - Implement suppression rules
   - Use escalation policies effectively

4. **Missing Data**
   - Check sampling configuration
   - Verify network connectivity
   - Review processing pipeline filters

### Debugging Tools
- Built-in health check endpoints
- Detailed logging and metrics
- Performance profiling capabilities
- Configuration validation tools

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for development setup and contribution guidelines.

## License

This monitoring system is part of the workflow automation platform and is available under the same license terms.