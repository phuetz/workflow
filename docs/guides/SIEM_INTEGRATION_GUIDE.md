# SIEM Integration Guide

Complete guide to integrating your workflow automation platform with enterprise SIEM systems for centralized security monitoring, threat detection, and compliance.

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start-5-minute-setup)
3. [Supported Platforms](#supported-siem-platforms)
4. [Architecture & Data Flow](#architecture--data-flow)
5. [SIEM Connectors Guide](#siem-connectors-guide)
6. [Event Normalization](#event-normalization-guide)
7. [Stream Manager](#stream-manager-guide)
8. [Query Builder](#query-builder-guide)
9. [Correlation Engine](#correlation-engine-guide)
10. [Best Practices](#best-practices)
11. [Troubleshooting](#troubleshooting)
12. [API Reference](#api-reference)

---

## Overview

### What is SIEM Integration?

Security Information and Event Management (SIEM) integration enables real-time monitoring, analysis, and response to security events across your workflow automation platform. It centralizes logs and security events from your workflows into enterprise-grade SIEM systems for:

- **Centralized Logging**: All workflow events streamed to a single security console
- **Threat Detection**: Real-time correlation rules detecting attack patterns and anomalies
- **Compliance Reporting**: Automated evidence collection for SOC2, HIPAA, PCI DSS, GDPR
- **Incident Investigation**: Historical analysis with powerful query capabilities
- **User Behavior Analytics**: Anomaly detection on user and entity activities

### Key Benefits

| Benefit | Description |
|---------|-------------|
| **Real-time Visibility** | Stream events <100ms latency to SIEM platforms |
| **Multi-format Support** | Automatic normalization to CEF, LEEF, ECS, or Syslog |
| **Attack Detection** | 15+ built-in correlation rules + custom rule engine |
| **Zero Data Loss** | Batch buffering with circuit breaker and dead letter queue |
| **Cost Optimization** | Sampling, compression, and smart batching |
| **Enterprise Ready** | Supports Splunk, Elasticsearch, QRadar, LogRhythm, Datadog |

### Supported SIEM Platforms

| Platform | Version | Authentication | Event Format |
|----------|---------|-----------------|--------------|
| **Splunk** | 8.0+ | HEC Token | JSON, CEF, LEEF |
| **Elasticsearch** | 7.0+ | API Key | Bulk API, JSON |
| **IBM QRadar** | 7.3+ | API Key | QRadar Events API |
| **LogRhythm** | 7.0+ | REST Token | CEF, REST API |
| **Datadog** | Current | API Key + App Key | Datadog Events API |

---

## Architecture & Data Flow

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│          Workflow Automation Platform                        │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Workflows   │  │  Executions  │  │  Audit Logs  │      │
│  └────────┬─────┘  └────────┬─────┘  └────────┬─────┘      │
│           │                 │                  │             │
│           └─────────────────┼──────────────────┘             │
│                             │                               │
│                    ┌────────▼─────────┐                     │
│                    │  EventNormalizer  │                     │
│                    │  (CEF/LEEF/ECS)   │                     │
│                    └────────┬──────────┘                     │
│                             │                               │
│                    ┌────────▼──────────┐                    │
│                    │  StreamManager     │                    │
│                    │  (Buffer/Batch)    │                    │
│                    └────────┬───────────┘                    │
│                             │                               │
│                    ┌────────▼──────────────┐                │
│                    │  SIEMConnectorManager  │                │
│                    └────────┬───────────────┘                │
└─────────────────────────────┼──────────────────────────────┘
                              │
        ┌─────────────────────┼──────────────────────┐
        │                     │                      │
   ┌────▼────────┐   ┌────────▼────────┐   ┌────────▼──────┐
   │   Splunk    │   │  Elasticsearch  │   │    QRadar     │
   │   HEC API   │   │   Bulk API      │   │  Events API   │
   └─────────────┘   └─────────────────┘   └───────────────┘

        Real-time Event Streaming with Automatic Retry & Batching
```

### Data Flow Sequence

1. **Event Generation**: Workflows generate security/audit/performance events
2. **Normalization**: EventNormalizer converts to SIEM-compatible format
3. **Buffering**: StreamManager buffers events with smart batching
4. **Correlation**: CorrelationEngine detects patterns and anomalies
5. **Delivery**: SIEMConnectorManager routes to configured platforms
6. **Persistence**: Events stored in SIEM for querying and alerting

### Key Components

| Component | Purpose | Location |
|-----------|---------|----------|
| **SIEMConnectors** | Connect to 5 SIEM platforms with pooling & circuit breaker | `src/integrations/siem/SIEMConnectors.ts` |
| **EventNormalizer** | Convert workflow events to CEF/LEEF/ECS/Syslog formats | `src/integrations/siem/EventNormalizer.ts` |
| **StreamManager** | Buffer, batch, filter, sample, and compress events | `src/integrations/siem/StreamManager.ts` |
| **SIEMQueryBuilder** | Fluent API for building cross-platform queries | `src/integrations/siem/SIEMQueryBuilder.ts` |
| **CorrelationEngine** | Real-time pattern matching and anomaly detection | `src/integrations/siem/CorrelationEngine.ts` |

---

## Quick Start (5-minute Setup)

### Prerequisites

- Node.js 20+
- npm 9+
- SIEM platform account with API credentials
- `npm install` completed

### 1. Install Dependencies

```bash
npm install axios zlib @types/node
```

### 2. Configure SIEM Connector

Create a configuration file `config/siem.json`:

```json
{
  "connectors": [
    {
      "name": "splunk-prod",
      "type": "splunk",
      "enabled": true,
      "hecUrl": "splunk.company.com:8088",
      "hecToken": "your-hec-token-here",
      "index": "workflow_security",
      "sourcetype": "workflow:event",
      "batchSize": 100,
      "batchIntervalMs": 5000,
      "maxRetries": 3,
      "timeout": 30000
    }
  ]
}
```

### 3. Initialize in Your Application

```typescript
import {
  SplunkConnector,
  SIEMConnectorManager,
  SIEMEvent
} from './src/integrations/siem/SIEMConnectors';

// Create connector
const splunk = new SplunkConnector({
  name: 'splunk-prod',
  type: 'splunk',
  enabled: true,
  hecUrl: 'splunk.company.com:8088',
  hecToken: process.env.SPLUNK_HEC_TOKEN,
  index: 'workflow_security',
  batchSize: 100,
  batchIntervalMs: 5000,
  maxRetries: 3
});

// Initialize manager
const manager = new SIEMConnectorManager();
manager.registerConnector('splunk-prod', splunk);

// Connect
await splunk.connect();
```

### 4. Send Your First Event

```typescript
const event: SIEMEvent = {
  timestamp: Date.now(),
  source: 'workflow-engine',
  eventType: 'workflow_execution',
  severity: 'medium',
  message: 'Workflow executed successfully',
  userId: 'user@company.com',
  workflowId: 'wf_123',
  executionId: 'exec_456',
  metadata: {
    nodes: 5,
    duration: 1234,
    status: 'success'
  }
};

await manager.sendEventToAll(event);
console.log('✓ Event sent to SIEM');
```

### 5. Verify Connection

```typescript
const statuses = await manager.getAllConnectorStatus();
console.log('SIEM Status:', statuses);
// Output:
// [
//   {
//     name: 'splunk-prod',
//     connected: true,
//     healthy: true,
//     circuitBreaker: { state: 'closed', failures: 0, ... }
//   }
// ]
```

---

## SIEM Connectors Guide

### Splunk Configuration

#### HEC Token Setup

1. **Access Splunk Web** → Settings → Data Inputs
2. **Create New HEC Token**:
   - Name: `workflow-automation`
   - Index: `main` (or custom)
   - Source Type: `_json` or custom `workflow:event`
   - Default Host: `workflow-engine`
3. **Enable and Copy Token**
4. **Configure Indexer Acknowledgment** (optional but recommended)

#### Cloud vs Enterprise Differences

| Aspect | Cloud | Enterprise |
|--------|-------|-----------|
| **HEC Port** | 8088 (fixed) | 8088 (configurable) |
| **SSL/TLS** | Always enabled | Optional |
| **Load Balancing** | Automatic | Configure manually |
| **Authentication** | HEC Token only | HEC Token + mTLS options |
| **Index Configuration** | Cloud-managed | Full control |

#### Example: Splunk Configuration

```typescript
import { SplunkConnector, SplunkConfig } from './src/integrations/siem/SIEMConnectors';

// Splunk Cloud Configuration
const splunkCloudConfig: SplunkConfig = {
  name: 'splunk-cloud',
  type: 'splunk',
  enabled: true,
  hecUrl: 'input-xxxxx.cloud.splunk.com:8088',
  hecToken: process.env.SPLUNK_HEC_TOKEN,
  index: 'workflow_security',
  sourcetype: 'workflow:event',
  source: 'workflow-engine',
  useSsl: true, // Always true for Cloud
  batchSize: 100,
  batchIntervalMs: 5000,
  maxRetries: 3,
  timeout: 30000,
  compression: true, // Reduce bandwidth
  rateLimit: 5000 // 5000 events/second
};

const splunk = new SplunkConnector(splunkCloudConfig);
await splunk.connect();

// Send event
await splunk.sendEvent({
  timestamp: Date.now(),
  source: 'workflow-engine',
  eventType: 'authentication',
  severity: 'high',
  message: 'Multiple failed login attempts detected',
  userId: 'admin@company.com',
  metadata: {
    attempts: 5,
    duration: 300,
    sourceIp: '192.168.1.100'
  }
});
```

#### SPL Queries for Workflow Events

```spl
# List all workflow executions
index=workflow_security eventType=workflow_execution
| stats count, avg(duration), max(duration) by source

# Failed workflows
index=workflow_security severity=high OR severity=critical
| where status="failed"
| timechart count by eventType

# User activity
index=workflow_security userId=*
| stats count, dc(workflowId) by userId
| where count > 100
```

---

### Elasticsearch Configuration

#### API Key Creation

1. **Kibana Console** → Stack Management → API Keys
2. **Create API Key**:
   - Name: `workflow-automation`
   - Restrict privileges:
     ```json
     {
       "cluster": ["manage_index_templates", "manage_ilm"],
       "indices": [
         {
           "names": ["workflow-security-*"],
           "privileges": ["write", "create_index", "manage"]
         }
       ]
     }
     ```
3. **Copy Base64-encoded Key**

#### Index Template Setup

```json
PUT _index_template/workflow-security
{
  "index_patterns": ["workflow-security-*"],
  "template": {
    "settings": {
      "number_of_shards": 2,
      "number_of_replicas": 1,
      "index.lifecycle.name": "workflow-security-policy"
    },
    "mappings": {
      "properties": {
        "@timestamp": { "type": "date" },
        "source": { "type": "keyword" },
        "event_type": { "type": "keyword" },
        "severity": { "type": "keyword" },
        "message": { "type": "text" },
        "user_id": { "type": "keyword" },
        "workflow_id": { "type": "keyword" },
        "execution_id": { "type": "keyword" },
        "metadata": { "type": "object", "enabled": true }
      }
    }
  }
}
```

#### Example: Elasticsearch Configuration

```typescript
import { ElasticsearchConnector, ElasticsearchConfig } from './src/integrations/siem/SIEMConnectors';

const elasticConfig: ElasticsearchConfig = {
  name: 'elasticsearch-prod',
  type: 'elasticsearch',
  enabled: true,
  nodes: [
    'https://elasticsearch.company.com:9200',
    'https://elasticsearch-2.company.com:9200'
  ],
  apiKey: Buffer.from('id:api_key').toString('base64'),
  indexPattern: 'workflow-security-{now/d}', // Daily indices
  pipelines: ['workflow-enrichment'], // Optional ingest pipelines
  useSsl: true,
  batchSize: 500, // Elasticsearch handles larger batches
  batchIntervalMs: 2000,
  maxRetries: 3,
  timeout: 30000,
  compression: true,
  rateLimit: 10000
};

const elasticsearch = new ElasticsearchConnector(elasticConfig);
await elasticsearch.connect();

// Send events (bulk API)
await elasticsearch.sendBatch([
  {
    timestamp: Date.now(),
    source: 'workflow-engine',
    eventType: 'execution_started',
    severity: 'low',
    message: 'Workflow execution started',
    workflowId: 'wf_123',
    executionId: 'exec_456'
  },
  {
    timestamp: Date.now() + 5000,
    source: 'workflow-engine',
    eventType: 'execution_completed',
    severity: 'low',
    message: 'Workflow execution completed',
    workflowId: 'wf_123',
    executionId: 'exec_456',
    metadata: { duration: 5000, status: 'success' }
  }
]);
```

#### Elasticsearch Queries

```json
// Failed executions
POST workflow-security-*/_search
{
  "query": {
    "bool": {
      "must": [
        { "term": { "severity": "high" } },
        { "range": { "@timestamp": { "gte": "now-24h" } } }
      ]
    }
  },
  "aggs": {
    "by_workflow": {
      "terms": { "field": "workflow_id", "size": 10 }
    }
  }
}
```

---

### IBM QRadar Configuration

#### API Key Setup

1. **QRadar Admin Console** → System Configuration → Authorized Services
2. **Create New API Key**:
   - Token Name: `workflow-automation`
   - Security Profile: Allow Event insertion
3. **Copy SEC token**

#### Log Source Configuration

1. **QRadar Admin** → Data Sources → Log Sources
2. **Create New Log Source**:
   - Type: `Custom`
   - Protocol: `HTTPS`
   - Log Source Name: `Workflow Engine`
   - Timezone: Your timezone
3. **Configure Event Mapping**:
   - Map workflow fields to QRadar fields
   - Set severity transformation

#### Custom Event Mapping

```typescript
const customEventMapping = {
  'workflow_execution': 'Workflow Execution',
  'authentication_failure': 'Authentication Failed',
  'unauthorized_access': 'Unauthorized Access',
  'data_modification': 'Data Modified',
  'configuration_change': 'Configuration Changed'
};
```

#### Example: QRadar Configuration

```typescript
import { QRadarConnector, QRadarConfig } from './src/integrations/siem/SIEMConnectors';

const qradarConfig: QRadarConfig = {
  name: 'qradar-prod',
  type: 'qradar',
  enabled: true,
  host: 'qradar.company.com',
  apiKey: process.env.QRADAR_API_KEY,
  port: 443,
  useSsl: true,
  customEventMapping: {
    'workflow_error': 'Workflow Execution Error',
    'unauthorized': 'Unauthorized Access Attempt',
    'data_breach': 'Data Breach Detected'
  },
  batchSize: 50,
  batchIntervalMs: 3000,
  maxRetries: 3,
  timeout: 30000
};

const qradar = new QRadarConnector(qradarConfig);
await qradar.connect();

// Send high-priority security event
await qradar.sendEvent({
  timestamp: Date.now(),
  source: 'workflow-engine',
  eventType: 'unauthorized_access',
  severity: 'critical',
  message: 'Unauthorized workflow access attempt detected',
  userId: 'unknown@external.com',
  metadata: {
    sourceIp: '203.0.113.45',
    targetWorkflow: 'sensitive-workflow',
    attemptCount: 10
  }
});
```

#### QRadar AQL Examples

```aql
# Failed authentication events
SELECT sourceip, COUNT(*) FROM events
WHERE eventtype='authentication' AND result='failure'
GROUP BY sourceip
ORDER BY COUNT(*) DESC

# Events by severity (last 24h)
SELECT severity, COUNT(*) FROM events
START '2024-01-01 00:00:00' STOP '2024-01-02 00:00:00'
GROUP BY severity
```

---

### LogRhythm Configuration

#### Token Authentication

1. **LogRhythm Web Console** → Administration → Users & Roles
2. **Generate API Token**:
   - User: `workflow-automation`
   - Role: `API User` (custom role with log submission permission)
3. **Copy Bearer Token**

#### Entity Mapping

Map your workflow entities to LogRhythm entities:

```typescript
const entityMapping = {
  'workflow-engine': 'LogRhythm Host',
  'audit-service': 'LogRhythm Host',
  'integration-service': 'LogRhythm Service'
};
```

#### CEF Format Usage

```typescript
// CEF format: CEF:0|Vendor|Product|Version|SignatureID|Name|Severity|Extension
const cefMessage = `CEF:0|Workflow|Engine|1.0|workflow_error|Workflow Execution Failed|8|` +
  `src=192.168.1.100 dst=workflow.company.com ` +
  `workflowId=wf_123 executionId=exec_456 userId=admin@company.com`;
```

#### Example: LogRhythm Configuration

```typescript
import { LogRhythmConnector, LogRhythmConfig } from './src/integrations/siem/SIEMConnectors';

const logrhythmConfig: LogRhythmConfig = {
  name: 'logrhythm-prod',
  type: 'logrhythm',
  enabled: true,
  caseApiUrl: 'https://logrhythm.company.com/lr-case-api',
  token: process.env.LOGRHYTHM_API_TOKEN,
  entityMapping: {
    'workflow-engine': 'workflow-server-01',
    'backup-service': 'backup-server-01'
  },
  useSsl: true,
  batchSize: 75,
  batchIntervalMs: 4000,
  maxRetries: 3,
  timeout: 30000
};

const logrhythm = new LogRhythmConnector(logrhythmConfig);
await logrhythm.connect();

// Send CEF-formatted event
await logrhythm.sendEvent({
  timestamp: Date.now(),
  source: 'workflow-engine',
  eventType: 'unauthorized_access',
  severity: 'high',
  message: 'Unauthorized workflow access',
  userId: 'attacker@external.com',
  metadata: {
    sourceIp: '203.0.113.100',
    port: 443,
    action: 'read'
  }
});
```

---

### Datadog Security Configuration

#### API Key + App Key Setup

1. **Datadog Dashboard** → Organization Settings → API Keys
2. **Create API Key**:
   - Name: `workflow-automation-logs`
   - Copy the key
3. **Create Application Key**:
   - Settings → Application Keys
   - Name: `workflow-automation`
   - Copy the key

#### Region Selection

```typescript
// Datadog regional endpoints
const datadogRegions = {
  'us1': 'api.datadoghq.com',      // US (N. Virginia)
  'us3': 'api.us3.datadoghq.com',  // US (Ohio)
  'us5': 'api.us5.datadoghq.com',  // US (AWS GovCloud)
  'eu1': 'api.datadoghq.eu',       // EU (Ireland)
  'ap1': 'api.ap1.datadoghq.com'   // Asia Pacific (Tokyo)
};
```

#### Tag Organization

```typescript
const tagOrganization = {
  'env': 'production',
  'service': 'workflow-automation',
  'team': 'platform-engineering',
  'version': '1.0.0',
  'region': 'us-east-1'
};
```

#### Example: Datadog Configuration

```typescript
import { DatadogSecurityConnector, DatadogConfig } from './src/integrations/siem/SIEMConnectors';

const datadogConfig: DatadogConfig = {
  name: 'datadog-prod',
  type: 'datadog',
  enabled: true,
  apiKey: process.env.DATADOG_API_KEY,
  applicationKey: process.env.DATADOG_APP_KEY,
  site: 'us1', // or 'eu1', 'us3', etc.
  service: 'workflow-automation',
  env: 'production',
  batchSize: 200,
  batchIntervalMs: 3000,
  maxRetries: 3,
  timeout: 30000,
  compression: true,
  rateLimit: 5000
};

const datadog = new DatadogSecurityConnector(datadogConfig);
await datadog.connect();

// Send security event
await datadog.sendEvent({
  timestamp: Date.now(),
  source: 'workflow-engine',
  eventType: 'threat_detected',
  severity: 'critical',
  message: 'Potential attack detected: Multiple failed authentications',
  userId: 'attacker@external.com',
  tags: [
    'security:threat',
    'workflow:critical',
    'alert:true',
    'mitigation:enabled'
  ],
  metadata: {
    attackType: 'brute_force',
    targetCount: 5,
    sourceIp: '203.0.113.1',
    mitigationApplied: 'ip_blocked'
  }
});
```

---

## Event Normalization Guide

### Format Comparison

| Aspect | CEF | LEEF | ECS | Syslog |
|--------|-----|------|-----|--------|
| **Vendor** | ArcSight | IBM QRadar | Elastic | Standard |
| **Complexity** | High | High | High | Low |
| **Use Case** | Enterprise SIEM | QRadar-specific | Elasticsearch | All systems |
| **Field Support** | 700+ | 500+ | 400+ | Basic |
| **Enrichment** | Excellent | Good | Excellent | Limited |
| **Performance** | Fast parsing | Fast parsing | Excellent | Variable |

### When to Use Each Format

```
┌─────────────────────────────────────────────┐
│        Choose Your Event Format              │
├─────────────────────────────────────────────┤
│                                             │
│  → CEF:   Multi-vendor SIEM environments   │
│           (best portability)                │
│                                             │
│  → LEEF:  IBM QRadar exclusively           │
│           (optimal parsing)                 │
│                                             │
│  → ECS:   Elasticsearch / Elastic Cloud    │
│           (native format)                   │
│                                             │
│  → Syslog: Legacy systems / simplicity      │
│           (universal compatibility)         │
│                                             │
└─────────────────────────────────────────────┘
```

### Custom Field Mapping

#### Define Custom Mappings

```typescript
import EventNormalizer, { WorkflowEvent } from './src/integrations/siem/EventNormalizer';

const customFieldMappings = {
  // Map workflow fields to SIEM field names
  'workflow_duration': 'duration_ms',
  'node_count': 'flow_nodes',
  'execution_status': 'outcome_status'
};

const normalizer = new EventNormalizer({
  customFieldMappings,
  enrichmentEnabled: true,
  geoIpEnabled: true
});

// Workflow event
const event: WorkflowEvent = {
  id: 'evt_12345',
  timestamp: Date.now(),
  type: 'execution',
  severity: 'high',
  source: 'workflow-engine',
  message: 'Workflow execution failed',
  userId: 'admin@company.com',
  workflowId: 'wf_123',
  nodeId: 'node_456',
  metadata: {
    workflow_duration: 5000,
    node_count: 15,
    execution_status: 'failed'
  }
};

// Convert to different formats
const cef = normalizer.toCEF(event);
const ecs = normalizer.toECS(event);
const leef = normalizer.toLEEF(event);
const syslog = normalizer.toSyslog(event);

console.log('CEF:', cef);
// Output: CEF:0|Workflow|Engine|1.0|workflow_execution|Workflow execution failed|7|...
```

### Enrichment Configuration

#### Geo-IP Enrichment

```typescript
const normalizer = new EventNormalizer({
  enrichmentEnabled: true,
  geoIpEnabled: true,
  geoIpProvider: 'maxmind', // or 'ipstack'
  maxmindDbPath: '/usr/share/GeoIP/GeoLite2-City.mmdb'
});

// Events automatically enriched with:
// - src_country, src_city, src_region
// - dst_country, dst_city, dst_region
// - src_latitude, src_longitude
```

#### Threat Intelligence Integration

```typescript
const threatIntelConfig = {
  enabled: true,
  providers: [
    {
      type: 'alienvault', // OTX
      apiKey: process.env.OTX_API_KEY
    },
    {
      type: 'virustotal',
      apiKey: process.env.VT_API_KEY
    }
  ],
  cacheTtl: 3600 // 1 hour
};

// Events automatically enriched with threat scores
```

### CEF Format Example (20+ lines)

```
CEF:0|Workflow|AutomationEngine|1.0|EXEC_FAILED|Workflow Execution Error|8|
src=192.168.1.100 spt=443 dst=workflow.company.com dpt=8080
act=execute rt=1704067200000 fname=user_data_processor.json
msg=Critical error during workflow execution
cn1=5000 cn1Label=durationMs cs1=FAILED cs1Label=status
cs2=data_processing cs2Label=workflowType cs3=60afb9c4-8e51-4c9d-b8e7-2a1d5f6e9a3b cs3Label=executionId
cs4=admin@company.com cs4Label=userId cs5=3.14.159.26 cs5Label=sourceIp
externalId=EVT_EXC_001 cat=Workflow/Execution
```

### LEEF Format Example (15+ lines)

```
LEEF:2.0|Workflow|AutomationEngine|1.0|EXEC_FAILED|
src=192.168.1.100 spt=443 dst=workflow.company.com dpt=8080
msg=Critical error during workflow execution
duration=5000 status=FAILED workflowType=data_processing
executionId=60afb9c4-8e51-4c9d-b8e7-2a1d5f6e9a3b
userId=admin@company.com sourceIp=3.14.159.26
timestamp=1704067200000 eventId=EVT_EXC_001
category=Workflow/Execution severity=8
```

### ECS Format Example (JSON, 30+ lines)

```json
{
  "@timestamp": "2024-01-01T12:00:00.000Z",
  "event": {
    "category": "process",
    "type": "execution",
    "action": "workflow-execute",
    "outcome": "failure",
    "severity": 8,
    "duration": 5000000000,
    "id": "EVT_EXC_001"
  },
  "source": {
    "ip": "192.168.1.100",
    "port": 443,
    "address": "192.168.1.100",
    "geo": {
      "country_iso_code": "US",
      "city_name": "Sunnyvale",
      "location": { "lat": 37.37, "lon": -122.04 }
    }
  },
  "destination": {
    "ip": "10.0.1.50",
    "port": 8080,
    "address": "workflow.company.com"
  },
  "process": {
    "name": "workflow-engine",
    "pid": 12345
  },
  "user": {
    "id": "admin@company.com",
    "name": "admin"
  },
  "error": {
    "type": "ExecutionError",
    "message": "Critical error during workflow execution",
    "code": "ERR_EXEC_FAILED"
  },
  "workflow": {
    "id": "wf_123",
    "name": "user_data_processor",
    "version": "2.1.0",
    "nodes": 15,
    "type": "data_processing"
  },
  "execution": {
    "id": "60afb9c4-8e51-4c9d-b8e7-2a1d5f6e9a3b",
    "status": "failed",
    "duration_ms": 5000,
    "start_time": "2024-01-01T12:00:00.000Z",
    "end_time": "2024-01-01T12:00:05.000Z"
  },
  "threat": {
    "indicator": { "ip": "203.0.113.45" },
    "severity": "high"
  }
}
```

### Syslog Format Example (RFC5424)

```
<134>1 2024-01-01T12:00:00.000Z workflow.company.com workflow-engine 12345 - [workflow@12345 executionId="60afb9c4-8e51-4c9d-b8e7-2a1d5f6e9a3b" workflowId="wf_123" userId="admin@company.com" severity="8" duration="5000"] Critical error during workflow execution
```

---

## Stream Manager Guide

### Multi-Destination Setup

#### Configure Multiple Destinations

```typescript
import { StreamManager, StreamDestination } from './src/integrations/siem/StreamManager';

const destinations: StreamDestination[] = [
  // Primary: Splunk
  {
    id: 'splunk-primary',
    name: 'Splunk Production',
    type: 'splunk',
    enabled: true,
    config: {
      endpoint: 'https://splunk.company.com:8088/services/collector',
      apiKey: process.env.SPLUNK_HEC_TOKEN,
      format: 'json',
      batchSize: 100,
      flushIntervalMs: 5000,
      compressionEnabled: true,
      samplingRate: 1.0 // 100% sampling
    },
    priority: 10
  },
  // Secondary: Elasticsearch
  {
    id: 'elasticsearch-secondary',
    name: 'Elasticsearch Backup',
    type: 'elastic',
    enabled: true,
    config: {
      endpoint: 'https://elasticsearch.company.com:9200/_bulk',
      apiKey: process.env.ELASTICSEARCH_API_KEY,
      format: 'ecs',
      batchSize: 500,
      flushIntervalMs: 3000,
      compressionEnabled: true,
      samplingRate: 0.5 // 50% sampling for cost control
    },
    priority: 5
  },
  // Datadog (low priority)
  {
    id: 'datadog-analytics',
    name: 'Datadog Analytics',
    type: 'datadog',
    enabled: true,
    config: {
      endpoint: 'https://api.datadoghq.com/v1/input',
      apiKey: process.env.DATADOG_API_KEY,
      format: 'ecs',
      batchSize: 200,
      flushIntervalMs: 10000,
      compressionEnabled: true,
      samplingRate: 0.1 // 10% sampling
    },
    priority: 1
  }
];

const streamManager = new StreamManager(destinations);
await streamManager.initialize();
```

### Buffer Configuration

#### Advanced Buffer Settings

```typescript
const bufferConfig = {
  // Memory management
  maxBufferSizeBytes: 100 * 1024 * 1024, // 100 MB
  maxEventsInMemory: 50000,

  // Flushing strategy
  flushInterval: 5000, // ms
  flushOnSize: 1000, // events
  flushOnMemoryPressure: true,

  // Persistence (optional)
  persistenceEnabled: true,
  persistencePath: '/var/lib/workflow/siem-buffer',

  // Dead letter queue
  deadLetterEnabled: true,
  deadLetterPath: '/var/lib/workflow/siem-dlq',
  deadLetterMaxSize: 1000
};

streamManager.configureBuffer(bufferConfig);
```

### Filtering and Sampling

#### Event Filtering

```typescript
// Apply filter rules to specific destination
const filterRules = [
  // Include only critical events
  {
    field: 'severity',
    operator: 'equals',
    value: 'critical'
  },
  // Exclude debug logs
  {
    field: 'level',
    operator: 'equals',
    value: 'debug',
    negate: true
  },
  // Include specific workflow types
  {
    field: 'workflowType',
    operator: 'in',
    value: ['data_processing', 'authentication', 'security']
  }
];

streamManager.setFilterRules('splunk-primary', filterRules);
```

#### Sampling Configuration

```typescript
// 10% sampling for cost optimization
streamManager.setSamplingRate('datadog-analytics', 0.1);

// Stratified sampling (important events always included)
const stratifiedSampling = {
  'critical': 1.0,    // 100% of critical
  'high': 0.5,        // 50% of high
  'medium': 0.1,      // 10% of medium
  'low': 0.01         // 1% of low
};

streamManager.setStratifiedSampling('elasticsearch-secondary', stratifiedSampling);
```

### Performance Tuning

#### Throughput Optimization

```typescript
// High-throughput configuration
const perfConfig = {
  // Batch settings
  batchSize: 1000,
  batchIntervalMs: 1000,

  // Parallel sending
  parallelStreams: 5,

  // Compression
  compressionEnabled: true,
  compressionLevel: 6,

  // Connection pooling
  poolSize: 10,

  // Rate limiting
  rateLimit: 10000 // events/sec
};

streamManager.configurePerformance(perfConfig);
```

### Health Monitoring

#### Monitor Stream Health

```typescript
// Get real-time health metrics
const health = await streamManager.getHealth();
console.log('Stream Health:', {
  allHealthy: health.all,
  byDestination: health.destinations.map(d => ({
    id: d.id,
    status: d.status,
    bufferedEvents: d.bufferedEvents,
    failureCount: d.failureCount,
    lastError: d.lastError
  }))
});

// Subscribe to health events
streamManager.on('health', (event) => {
  if (event.status === 'degraded') {
    console.warn('Stream degradation detected:', event.destination);
  }
});

// Handle circuit breaker state changes
streamManager.on('circuit-breaker', (event) => {
  console.log(`Circuit breaker ${event.state} for ${event.destination}`);
  if (event.state === 'open') {
    // Failover to backup SIEM
    await streamManager.enableDestination('elasticsearch-secondary');
  }
});
```

---

## Query Builder Guide

### Fluent API Tutorial

#### Basic Query Construction

```typescript
import { SIEMQueryBuilder, SIEMPlatform, ComparisonOperator, SortOrder } from './src/integrations/siem/SIEMQueryBuilder';

// Build a Splunk query
const query = new SIEMQueryBuilder(SIEMPlatform.SPLUNK)
  .where('event_type', ComparisonOperator.EQUALS, 'authentication')
  .and('result', ComparisonOperator.EQUALS, 'failure')
  .relativeTime('last_24_hours')
  .count('failed_attempts')
  .groupBy('username', 'source_ip')
  .orderBy('failed_attempts', SortOrder.DESCENDING)
  .limit(100);

const result = query.build();
console.log('SPL Query:', result.query);
// Output: index=main event_type="authentication" AND result="failure"
//         earliest=last_24_hours latest=now
//         | stats count as failed_attempts by username, source_ip
//         | sort - failed_attempts | head 100
```

#### Platform-Specific Example

```typescript
// Build same query for Elasticsearch
const esQuery = new SIEMQueryBuilder(SIEMPlatform.ELASTICSEARCH)
  .where('event_type', ComparisonOperator.EQUALS, 'authentication')
  .and('result', ComparisonOperator.EQUALS, 'failure')
  .relativeTime('last_24_hours')
  .count('failed_attempts')
  .groupBy('username', 'source_ip')
  .orderBy('failed_attempts', SortOrder.DESCENDING)
  .limit(100);

const esResult = esQuery.build();
console.log('ES DSL Query:', esResult.query);
// Output: JSON DSL with bool query, aggregations, and sort
```

### Query Templates (Pre-built Security Scenarios)

#### Failed Authentication Pattern (SPL Example)

```typescript
import { QUERY_TEMPLATES, SIEMPlatform } from './src/integrations/siem/SIEMQueryBuilder';

// Failed authentication attempts per user
const failedAuthQuery = QUERY_TEMPLATES.failedAuth();
const splunkResult = failedAuthQuery.setPlatform(SIEMPlatform.SPLUNK).build();
console.log(splunkResult.query);
// Output:
// event_type="authentication" AND result="failure"
// | stats count as failed_count by username, source_ip
// | head 100
```

**Query Template Reference**:

| Template | Purpose | Output |
|----------|---------|--------|
| `failedAuth()` | Authentication failures by user | Failed login counts |
| `bruteForce()` | Detect brute force attacks | Users with 5+ failures/hour |
| `suspiciousNetwork()` | Unusual network activity | High-port connections |
| `dataExfiltration()` | Large data transfers | Users exfiltrating >1GB |
| `privilegeEscalation()` | Privilege changes | Accounts gaining privileges |
| `malwareIndicators()` | Malware detection | Threats by confidence >80% |
| `databaseAnomalies()` | DB DROP/DELETE/TRUNCATE | DDL commands detected |
| `sslCertificateIssues()` | Expired/revoked certs | SSL problems in 7 days |
| `dnsExfiltration()` | DNS tunneling | Large DNS queries |

### Splunk SPL Examples (5 Complete Queries)

#### 1. Failed Authentication Spike Detection

```spl
# Detect authentication failures exceeding baseline
index=security sourcetype=auth authentication failure
| stats count as failure_count by username, source_ip
| eventstats avg(failure_count) as baseline, stdev(failure_count) as stddev by username
| where failure_count > (baseline + 3*stddev)
| table username, source_ip, failure_count, baseline
```

#### 2. Privilege Escalation Analysis

```spl
# Track privilege level changes
index=security sourcetype=audit action=privilege_change
| stats values(privilege_before) as old_priv, values(privilege_after) as new_priv by user
| where old_priv < 3 AND new_priv >= 3
| search user!="system" user!="admin"
| table user, old_priv, new_priv, _time
```

#### 3. Lateral Movement Detection

```spl
# Detect unusual host-to-host connections
index=network sourcetype=firewall action=allow protocol=tcp
| stats values(dest_ip) as destinations by src_ip
| search destinations>10
| convert ctime(_time)
| table src_ip, destinations, _time
```

#### 4. Data Exfiltration Monitoring

```spl
# Monitor large outbound data transfers
index=network sourcetype=proxy
| search bytes_out>1073741824
| stats sum(bytes_out) as total_transferred, count as request_count by user, dest_domain
| where total_transferred>5368709120
| convert ctime(_time)
```

#### 5. Workflow Error Pattern

```spl
# Correlate workflow failures
index=workflow sourcetype=workflow_logs status=error
| stats count as error_count, values(error_message) as errors by workflow_id, node_type
| eval error_rate=error_count/total_executions
| search error_rate>0.1
| sort - error_count
```

### Elasticsearch DSL Examples (5 Complete Queries)

#### 1. Failed Login Aggregation

```json
POST security-*/_search
{
  "size": 0,
  "query": {
    "bool": {
      "must": [
        { "term": { "event.action": "authentication" } },
        { "term": { "event.outcome": "failure" } },
        { "range": { "@timestamp": { "gte": "now-24h" } } }
      ]
    }
  },
  "aggs": {
    "by_user": {
      "terms": { "field": "user.id", "size": 100 },
      "aggs": {
        "by_source": {
          "terms": { "field": "source.ip", "size": 100 }
        },
        "failure_count": { "value_count": { "field": "event.id" } }
      }
    }
  }
}
```

#### 2. Anomaly Detection via Percentiles

```json
POST network-*/_search
{
  "size": 0,
  "query": {
    "range": { "@timestamp": { "gte": "now-7d" } }
  },
  "aggs": {
    "percentile_bytes": {
      "percentiles": {
        "field": "network.bytes.out",
        "percents": [50, 95, 99]
      }
    },
    "by_user": {
      "terms": { "field": "user.id", "size": 50 },
      "aggs": {
        "outliers": {
          "bucket_sort": {
            "sort": [{ "total_bytes": { "order": "desc" } }],
            "size": 10
          }
        },
        "total_bytes": { "sum": { "field": "network.bytes.out" } }
      }
    }
  }
}
```

#### 3. Privilege Escalation Timeline

```json
GET security-*/_search
{
  "query": {
    "bool": {
      "must": [
        { "term": { "event.type": "privilege_change" } },
        { "range": {
          "user.privilege_level_before": { "lt": 3 },
          "user.privilege_level_after": { "gte": 3 }
        } }
      ]
    }
  },
  "sort": [{ "@timestamp": { "order": "desc" } }],
  "highlight": {
    "fields": { "user.id": {} }
  }
}
```

#### 4. Cardinality-based Anomalies

```json
POST network-*/_search
{
  "size": 0,
  "aggs": {
    "src_ips": {
      "terms": { "field": "source.ip", "size": 1000 },
      "aggs": {
        "unique_dests": {
          "cardinality": { "field": "destination.ip" }
        },
        "unique_ports": {
          "cardinality": { "field": "destination.port" }
        }
      }
    }
  },
  "post_filter": {
    "range": {
      "unique_dests": { "gte": 50 }
    }
  }
}
```

#### 5. Threat Intelligence Correlation

```json
POST security-*/_search
{
  "query": {
    "bool": {
      "must": [
        { "term": { "threat.indicator.type": "ip" } },
        { "exists": { "field": "threat.severity" } }
      ],
      "filter": [
        { "term": { "threat.severity": "high" } }
      ]
    }
  },
  "aggs": {
    "threats_by_severity": {
      "terms": { "field": "threat.severity" }
    },
    "top_indicators": {
      "top_hits": {
        "size": 10,
        "sort": [{ "threat.score": { "order": "desc" } }]
      }
    }
  }
}
```

### QRadar AQL Examples (5 Queries)

```aql
# 1. Failed login attempts by source IP (24h)
SELECT sourceip, destinationip, COUNT(*) as failure_count
FROM events
WHERE eventtype='authentication' AND result='failure'
START '2024-01-01 00:00:00' STOP '2024-01-02 00:00:00'
GROUP BY sourceip, destinationip
ORDER BY failure_count DESC
LIMIT 100

# 2. Protocol analysis
SELECT protocol, SUM(payloadsize) as total_bytes, COUNT(*) as event_count
FROM events
WHERE protocol IN ('SMTP', 'SSH', 'RDP', 'HTTP', 'HTTPS')
GROUP BY protocol
ORDER BY total_bytes DESC

# 3. Privilege escalation
SELECT username, eventtime, eventtype, severity
FROM events
WHERE eventtype LIKE 'privilege%'
ORDER BY eventtime DESC

# 4. Anomalous bandwidth usage
SELECT sourceip, destinationip, SUM(payloadsize) as data_transferred
FROM events
WHERE payloadsize > 1073741824
GROUP BY sourceip, destinationip

# 5. Event rate baseline
SELECT eventtype, AVG(event_count) as baseline
FROM (
  SELECT eventtype, COUNT(*) as event_count, DATEPART(hour, eventtime) as hour_bucket
  FROM events
  GROUP BY eventtype, hour_bucket
)
GROUP BY eventtype
```

### Saved Searches Management

```typescript
import { SavedSearchRepository } from './src/integrations/siem/SIEMQueryBuilder';

const repository = new SavedSearchRepository();

// Save a query
const brute_force_search = repository.save(
  'Brute Force Detection',
  'Detects brute force attacks with 5+ failures in 1 hour',
  `event_type="authentication" AND result="failure"
   earliest="-1h" latest="now"
   | stats count as failed_attempts by username, source_ip
   | where failed_attempts > 5`,
  SIEMPlatform.SPLUNK
);

// Retrieve saved search
const saved = repository.get(brute_force_search.id);
console.log('Query:', saved.query);

// List all searches for a platform
const splunkSearches = repository.listByPlatform(SIEMPlatform.SPLUNK);

// Update
repository.update(brute_force_search.id, {
  description: 'Updated: now includes velocity analysis'
});

// Delete
repository.delete(brute_force_search.id);
```

---

## Correlation Engine Guide

### How Correlation Works

The correlation engine analyzes events in real-time using four techniques:

1. **Temporal Correlation**: Events occurring within time windows
2. **Entity Correlation**: Related events grouped by user/IP/host
3. **Pattern Correlation**: Sequences matching known attack patterns
4. **Statistical Correlation**: Anomalies detected via outlier analysis

### Built-in Rules (15+ References)

#### Rule 1: Brute Force Attack Detection

```typescript
/**
 * Rule: Brute Force Attack Detection
 * Priority: HIGH
 * Window: 1 hour
 * Threshold: 5+ failures
 */
export const BRUTE_FORCE_RULE = {
  id: 'rule_brute_force_001',
  name: 'Brute Force Attack Detection',
  description: 'Detects repeated authentication failures',
  priority: CorrelationPriority.HIGH,

  // Temporal correlation: failures within 1 hour
  temporal: {
    windowType: '1h' as TimeWindow,
    eventSequence: ['authentication_failure', 'authentication_failure'],
    frequencyThreshold: 5
  },

  // Entity correlation: same user
  entity: {
    groupByType: 'user' as const,
    anomalyIndicators: ['failed_count > 5', 'source_ip_variance > 2']
  },

  // Pattern: repeated denials
  pattern: {
    patterns: [
      { name: 'rapid_failures', regex: /failure.*failure.*failure/ }
    ]
  },

  // Action on detection
  action: (alert: CorrelationAlert) => {
    console.warn('BRUTE_FORCE detected:', alert);
    // Block user IP, notify admins
  }
};
```

#### Rule 2: Privilege Escalation Detection

```typescript
export const PRIVILEGE_ESCALATION_RULE = {
  id: 'rule_priv_escalation_001',
  name: 'Privilege Escalation Attempt',
  description: 'Detects unauthorized privilege elevation',
  priority: CorrelationPriority.CRITICAL,

  temporal: {
    windowType: '5m' as TimeWindow,
    eventSequence: ['login_success', 'privilege_change']
  },

  entity: { groupByType: 'user' as const },

  pattern: {
    patterns: [
      {
        name: 'admin_access',
        regex: /privilege.*admin|uid.*0|group.*wheel/
      }
    ]
  }
};
```

#### Rule 3: Data Exfiltration Pattern

```typescript
export const DATA_EXFILTRATION_RULE = {
  id: 'rule_data_exfil_001',
  name: 'Data Exfiltration Detected',
  description: 'Detects large data transfers to external IPs',
  priority: CorrelationPriority.CRITICAL,

  temporal: {
    windowType: '1h' as TimeWindow,
    frequencyThreshold: 1
  },

  statistical: {
    baselineWindow: 604800, // 7 days
    deviationMultiplier: 3,
    rareEventThreshold: 95
  }
};
```

#### Rule 4: Lateral Movement Detection

```typescript
/**
 * Rule: Lateral Movement Detection
 * Detects suspicious host-to-host connections
 */
export const LATERAL_MOVEMENT_RULE = {
  id: 'rule_lateral_movement_001',
  name: 'Lateral Movement Pattern',
  description: 'Detects unusual host connectivity',
  priority: CorrelationPriority.HIGH,

  entity: {
    groupByType: 'ip' as const,
    velocityWindow: 300, // 5 minutes
    velocityThreshold: 10 // 10+ hosts accessed
  }
};
```

#### Rule 5: Insider Threat Detection

```typescript
export const INSIDER_THREAT_RULE = {
  id: 'rule_insider_threat_001',
  name: 'Insider Threat Pattern',
  description: 'Detects behavioral anomalies from privileged users',
  priority: CorrelationPriority.HIGH,

  temporal: { windowType: '24h' as TimeWindow },

  pattern: {
    patterns: [
      {
        name: 'bulk_download',
        regex: /download.*10\d{9}|bytes.*>.*10\d{9}/
      },
      {
        name: 'access_restricted',
        regex: /denied|forbidden|unauthorized/
      }
    ]
  }
};
```

#### Rule 6: Malware Execution Detection

```typescript
export const MALWARE_EXECUTION_RULE = {
  id: 'rule_malware_001',
  name: 'Malware Execution Detected',
  description: 'Correlates threat intel with endpoint events',
  priority: CorrelationPriority.CRITICAL,

  pattern: {
    patterns: [
      {
        name: 'known_malware',
        regex: /emotet|trickbot|wannacry|ransomware/i
      }
    ]
  }
};
```

#### Rule 7: Command Injection Attempt

```typescript
export const COMMAND_INJECTION_RULE = {
  id: 'rule_cmd_injection_001',
  name: 'Command Injection Attempt',
  description: 'Detects command injection patterns',
  priority: CorrelationPriority.HIGH,

  pattern: {
    patterns: [
      {
        name: 'shell_metacharacters',
        regex: /[;|&$`'"<>\\()]/
      },
      {
        name: 'dangerous_commands',
        regex: /rm\s+-rf|dd\s+if=|cat\s+\/etc\/passwd/
      }
    ]
  }
};
```

#### Rule 8: SQL Injection Detection

```typescript
export const SQL_INJECTION_RULE = {
  id: 'rule_sql_injection_001',
  name: 'SQL Injection Pattern',
  description: 'Detects SQL injection attempts',
  priority: CorrelationPriority.CRITICAL,

  pattern: {
    patterns: [
      {
        name: 'sql_keywords',
        regex: /union|select|insert|delete|drop|exec|script/i
      },
      {
        name: 'sql_comments',
        regex: /--|\/\*|\*\/|#/
      }
    ]
  }
};
```

#### Rule 9: Certificate Anomaly

```typescript
export const CERT_ANOMALY_RULE = {
  id: 'rule_cert_anomaly_001',
  name: 'SSL/TLS Certificate Anomaly',
  description: 'Detects certificate issues and anomalies',
  priority: CorrelationPriority.HIGH,

  temporal: { windowType: '24h' as TimeWindow },

  pattern: {
    patterns: [
      {
        name: 'cert_expired',
        regex: /expired|revoked|untrusted|self-signed/i
      }
    ]
  }
};
```

#### Rule 10: DGA Activity

```typescript
export const DGA_ACTIVITY_RULE = {
  id: 'rule_dga_001',
  name: 'Domain Generation Algorithm Activity',
  description: 'Detects DGA-generated domain access',
  priority: CorrelationPriority.CRITICAL,

  entity: {
    groupByType: 'ip' as const,
    velocityWindow: 3600,
    velocityThreshold: 100 // 100+ unique domains
  }
};
```

#### Rule 11: Account Enumeration

```typescript
export const ACCOUNT_ENUMERATION_RULE = {
  id: 'rule_acct_enum_001',
  name: 'Account Enumeration Pattern',
  description: 'Detects attempts to enumerate valid accounts',
  priority: CorrelationPriority.MEDIUM,

  entity: {
    groupByType: 'ip' as const,
    velocityWindow: 300,
    velocityThreshold: 50 // 50+ login attempts
  }
};
```

#### Rule 12: Credential Stuffing

```typescript
export const CREDENTIAL_STUFFING_RULE = {
  id: 'rule_cred_stuffing_001',
  name: 'Credential Stuffing Attack',
  description: 'Detects rapid authentication attempts with different credentials',
  priority: CorrelationPriority.HIGH,

  temporal: {
    windowType: '5m' as TimeWindow,
    frequencyThreshold: 20
  }
};
```

#### Rule 13: Webhook Manipulation

```typescript
export const WEBHOOK_MANIPULATION_RULE = {
  id: 'rule_webhook_manip_001',
  name: 'Webhook Configuration Tampering',
  description: 'Detects unauthorized webhook changes',
  priority: CorrelationPriority.HIGH,

  pattern: {
    patterns: [
      {
        name: 'webhook_modify',
        regex: /webhook.*(update|modify|change|delete)/i
      }
    ]
  }
};
```

#### Rule 14: Credential Exposure

```typescript
export const CREDENTIAL_EXPOSURE_RULE = {
  id: 'rule_cred_exposure_001',
  name: 'Credential Exposure Detection',
  description: 'Detects credentials in logs/output',
  priority: CorrelationPriority.CRITICAL,

  pattern: {
    patterns: [
      {
        name: 'exposed_api_keys',
        regex: /api[_-]?key|secret[_-]?key|password|token/i
      }
    ]
  }
};
```

#### Rule 15: Workflow Tampering

```typescript
export const WORKFLOW_TAMPERING_RULE = {
  id: 'rule_workflow_tampering_001',
  name: 'Workflow Configuration Tampering',
  description: 'Detects unauthorized workflow modifications',
  priority: CorrelationPriority.HIGH,

  pattern: {
    patterns: [
      {
        name: 'workflow_modify',
        regex: /workflow.*(update|deploy|modify|delete)/i
      }
    ]
  }
};
```

### Custom Rule Creation

```typescript
import { CorrelationEngine, CorrelationPriority, TimeWindow } from './src/integrations/siem/CorrelationEngine';

const engine = new CorrelationEngine();

// Create custom rule
const customRule = {
  id: 'rule_custom_001',
  name: 'Custom: Finance API Abuse',
  description: 'Detect unusual access patterns to finance APIs',
  priority: CorrelationPriority.CRITICAL,

  // Temporal: within 1 hour
  temporal: {
    windowType: '1h' as TimeWindow,
    frequencyThreshold: 10 // 10+ API calls to finance endpoints
  },

  // Entity: group by user
  entity: {
    groupByType: 'user' as const,
    anomalyIndicators: [
      'request_rate > 100/min',
      'error_rate > 0.2',
      'unique_endpoints > 5'
    ],
    velocityWindow: 300,
    velocityThreshold: 20
  },

  // Pattern: finance API calls
  pattern: {
    patterns: [
      {
        name: 'finance_api_access',
        regex: /\/api\/finance|\/api\/payments|\/api\/transactions/
      }
    ]
  },

  // Action callback
  action: (alert) => {
    console.error('CUSTOM_FINANCE_ABUSE:', alert);
    // Trigger incident, block user, notify SOC
  }
};

// Register and enable rule
engine.registerRule(customRule);
await engine.enableRule(customRule.id);
```

### MITRE ATT&CK Mapping

```typescript
// Map rules to MITRE ATT&CK framework
const mitreMappings = {
  'rule_brute_force_001': {
    technique: 'T1110', // Brute Force
    tactic: 'Credential Access',
    subtechniques: ['T1110.001', 'T1110.003']
  },
  'rule_priv_escalation_001': {
    technique: 'T1548', // Abuse Elevation Control Mechanism
    tactic: 'Privilege Escalation'
  },
  'rule_data_exfil_001': {
    technique: 'T1041', // Exfiltration Over C2 Channel
    tactic: 'Exfiltration'
  },
  'rule_lateral_movement_001': {
    technique: 'T1021', // Remote Services
    tactic: 'Lateral Movement'
  }
};

// Query alerts by MITRE technique
const t1110Alerts = engine.getAlertsByMitreTechnique('T1110');
console.log('Brute Force Alerts:', t1110Alerts.length);
```

### Attack Chain Detection

```typescript
/**
 * Detect multi-stage attack chains
 * Example: Reconnaissance → Exploitation → Lateral Movement → Data Exfiltration
 */

const attackChainDetector = engine.createChainDetector({
  name: 'Full Attack Chain',
  stages: [
    {
      order: 1,
      name: 'Reconnaissance',
      rules: ['rule_port_scan', 'rule_service_enumeration'],
      timeToNext: 3600 // 1 hour
    },
    {
      order: 2,
      name: 'Exploitation',
      rules: ['rule_sql_injection_001', 'rule_cmd_injection_001'],
      timeToNext: 300 // 5 minutes
    },
    {
      order: 3,
      name: 'Lateral Movement',
      rules: ['rule_lateral_movement_001'],
      timeToNext: 1800 // 30 minutes
    },
    {
      order: 4,
      name: 'Data Exfiltration',
      rules: ['rule_data_exfil_001'],
      timeToNext: null
    }
  ],
  onDetection: (chain) => {
    console.error('ATTACK CHAIN DETECTED:', chain);
    // Highest severity - immediate incident response
  }
};

engine.registerChainDetector(attackChainDetector);
```

---

## Best Practices

### Performance Optimization

#### Batch Size Tuning

```
┌─────────────────────────────────────────┐
│   Recommended Batch Sizes               │
├──────────────┬──────────────┬───────────┤
│ SIEM         │ Batch Size   │ Interval  │
├──────────────┼──────────────┼───────────┤
│ Splunk       │ 100-500      │ 5 sec     │
│ Elasticsearch│ 500-1000     │ 3 sec     │
│ QRadar       │ 50-200       │ 3 sec     │
│ LogRhythm    │ 75-300       │ 4 sec     │
│ Datadog      │ 200-1000     │ 5 sec     │
└──────────────┴──────────────┴───────────┘
```

#### Compression Benefits

```typescript
// Enable compression for high-volume environments
const compressionConfig = {
  enabled: true,
  level: 6, // 1-9, higher = more compression
  minSizeBytes: 1024 // Only compress if >1KB
};

// Typical compression ratios:
// JSON events: 80-90% reduction
// CEF events: 70-85% reduction
// Syslog: 60-75% reduction
```

#### Connection Pooling

```typescript
// Configure connection pools for concurrency
const poolConfig = {
  minSize: 5,      // Pre-allocated connections
  maxSize: 20,     // Maximum concurrent
  acquireTimeoutMs: 5000,
  idleTimeoutMs: 30000
};

// Monitor pool health
connector.on('pool:event', (event) => {
  console.log(`Pool: ${event.type}`, {
    active: event.active,
    waiting: event.waiting,
    available: event.available
  });
});
```

### Security Considerations

#### Credential Management

```typescript
// NEVER hardcode credentials
const WRONG = {
  hecToken: 'your-hec-token-here' // DON'T DO THIS
};

// USE environment variables
const CORRECT = {
  hecToken: process.env.SPLUNK_HEC_TOKEN
};

// Or use secret management system
const SECRET_MANAGER = {
  hecToken: await secretManager.getSecret('splunk/hec-token')
};

// Rotate credentials regularly
setInterval(async () => {
  const newToken = await secretManager.rotateSecret('splunk/hec-token');
  connector.updateToken(newToken);
}, 86400000); // Daily
```

#### Encryption in Transit

```typescript
// Always use TLS/SSL for SIEM connections
const tlsConfig = {
  useSsl: true,        // Force HTTPS/TLS
  rejectUnauthorized: true, // Verify certificates
  minVersion: 'TLSv1.2',
  ciphers: 'HIGH:!aNULL:!eNULL:!EXPORT:!DES:!MD5:!PSK:!RC4'
};

// Optional: mTLS authentication
const mtlsConfig = {
  cert: fs.readFileSync('/path/to/client-cert.pem'),
  key: fs.readFileSync('/path/to/client-key.pem'),
  ca: fs.readFileSync('/path/to/ca-cert.pem')
};
```

#### Input Validation

```typescript
// Validate all events before sending
const validateEvent = (event: SIEMEvent): boolean => {
  if (!event.timestamp || event.timestamp > Date.now() + 60000) {
    return false; // Invalid future timestamp
  }

  if (!event.source || event.source.length > 255) {
    return false; // Invalid source
  }

  if (event.severity !== 'low' && event.severity !== 'medium' &&
      event.severity !== 'high' && event.severity !== 'critical') {
    return false; // Invalid severity
  }

  return true;
};

// Filter before sending
const validEvents = events.filter(validateEvent);
```

### High Availability Setup

#### Multi-Region Deployment

```typescript
const regions = [
  {
    name: 'us-east-1',
    primary: true,
    connector: new SplunkConnector(usEastConfig),
    weight: 70 // 70% traffic
  },
  {
    name: 'us-west-2',
    primary: false,
    connector: new SplunkConnector(usWestConfig),
    weight: 30 // 30% failover
  }
];

// Implement regional failover
const sendWithFailover = async (event: SIEMEvent) => {
  for (const region of regions) {
    try {
      await region.connector.sendEvent(event);
      return;
    } catch (error) {
      console.warn(`Region ${region.name} failed, trying next...`);
      continue;
    }
  }
  throw new Error('All regions failed');
};
```

#### Dead Letter Queue Processing

```typescript
// Monitor and reprocess failed events
setInterval(async () => {
  const dlq = connector.getDeadLetterQueue();

  for (const item of dlq) {
    if (item.retries < 3) {
      try {
        await connector.sendEvent(item.event);
        connector.clearDeadLetterQueue(); // Remove on success
      } catch (error) {
        item.retries++;
      }
    }
  }
}, 60000); // Every minute
```

### Monitoring and Alerting

#### Key Metrics to Monitor

```typescript
const criticalMetrics = {
  // Throughput
  'events_per_second': { threshold: 1000, alert: 'high' },
  'events_buffered': { threshold: 50000, alert: 'memory' },

  // Errors
  'send_failures_rate': { threshold: 0.01, alert: 'error_rate' },
  'circuit_breaker_state': { threshold: 'open', alert: 'breaker' },

  // Latency
  'end_to_end_latency_ms': { threshold: 5000, alert: 'slow' },
  'batch_processing_time_ms': { threshold: 10000, alert: 'slow' }
};

// Alert on critical conditions
connector.on('metric', (metric) => {
  if (metric.value > criticalMetrics[metric.name].threshold) {
    notificationService.alert({
      severity: 'critical',
      message: `SIEM: ${metric.name} exceeded threshold`,
      metric: metric
    });
  }
});
```

### Compliance Requirements

#### SOC2 Requirements

- [ ] Encrypt all credentials at rest
- [ ] Audit all SIEM API calls
- [ ] Maintain 90-day audit logs
- [ ] Monthly access reviews
- [ ] Incident response procedures

#### PCI DSS Requirements

- [ ] Encrypt cardholder data in transit
- [ ] No plaintext passwords in logs
- [ ] Firewall rules for SIEM connections
- [ ] Regular security assessments
- [ ] Change management for rules/queries

#### HIPAA Requirements

- [ ] De-identify PHI before sending
- [ ] Encrypt all data in transit (TLS 1.2+)
- [ ] Access controls by role
- [ ] Audit logs for 6 years
- [ ] Business Associate Agreement

---

## Troubleshooting

### Common Issues and Solutions

#### 1. Connection Refused

**Symptom**: `Error: connect ECONNREFUSED`

**Solutions**:
```bash
# Check SIEM endpoint is accessible
curl -v https://splunk.company.com:8088/services/collector/health

# Verify firewall rules
netstat -an | grep 8088

# Check credentials
echo "token=YOUR_TOKEN" | curl -k https://splunk.company.com:8088/services/collector -d @-
```

#### 2. Authentication Failures

**Symptom**: `401 Unauthorized` or `403 Forbidden`

**Solutions**:
```typescript
// Verify token format
const tokenIsValid = (token: string): boolean => {
  return token.length > 20 && !token.includes('\n');
};

// Check token expiration
const token = process.env.SPLUNK_HEC_TOKEN;
console.log('Token expiration:', new Date(tokenExpirationDate));

// Regenerate token if needed
// In Splunk: Settings → Data Inputs → HTTP Event Collector
```

#### 3. High Memory Usage

**Symptom**: Node process growing to GB+ memory

**Solutions**:
```typescript
// Reduce buffer size
streamManager.configureBuffer({
  maxBufferSizeBytes: 50 * 1024 * 1024, // 50 MB
  maxEventsInMemory: 10000
});

// Enable persistence
streamManager.configureBuffer({
  persistenceEnabled: true,
  persistencePath: '/var/lib/siem-buffer'
});

// Increase flush frequency
streamManager.configurePerformance({
  batchIntervalMs: 1000 // 1 second
});
```

#### 4. Events Not Appearing in SIEM

**Symptom**: Logs sent but not visible in SIEM console

**Solutions**:
```bash
# Check SIEM index/source configuration
# Splunk: search index=main sourcetype=workflow*

# Verify timestamp format
# Should be epoch (seconds) or ISO8601

# Check log level filters
# May be filtering out 'info' level events

# Monitor stream status
curl http://localhost:3000/api/siem/status
# Returns: { connected: true, buffered: 42, failures: 0 }
```

#### 5. Batching Delays

**Symptom**: High latency from event generation to SIEM

**Solutions**:
```typescript
// Reduce batch interval
connector.config.batchIntervalMs = 1000; // 1 second

// Reduce batch size
connector.config.batchSize = 50; // Smaller batches = more frequent sends

// Monitor latency
connector.on('metric', (m) => {
  if (m.name === 'batch_latency') {
    console.log(`Batch latency: ${m.value}ms`);
  }
});
```

### Debug Logging

#### Enable Verbose Logging

```typescript
// Set environment variable
process.env.DEBUG = 'siem:*';

// Or programmatically
import debug from 'debug';
const log = debug('siem:*');

// Logs all SIEM operations
// Output:
// siem:connector:splunk connect attempt to splunk.company.com:8088
// siem:stream:buffer flushing 150 events
// siem:stream:send batch sent successfully: 150 events, 234ms
```

#### Health Check Interpretation

```typescript
const health = await connector.healthCheck();
console.log('Health Check:', {
  connected: health.connected,      // true = connected
  healthy: health.healthy,          // true = no recent errors
  circuitBreaker: health.circuitBreaker,
  lastError: health.lastError,
  metrics: {
    sent: health.eventsSent,
    failed: health.eventsFailed,
    buffered: health.eventsBuffered,
    dlq: health.deadLetterQueueSize
  }
});

// Interpreting states:
// connected=true, healthy=true, cb=closed: ✓ All good
// connected=true, healthy=false, cb=closed: ⚠ Recent errors, recovering
// connected=true, healthy=false, cb=half-open: ⚠ Testing after failure
// connected=false, cb=open: ✗ Circuit open, queuing events
```

#### Circuit Breaker Recovery

```typescript
// Monitor circuit breaker state changes
connector.on('circuitBreakerStateChange', (event) => {
  console.log('Circuit breaker state:', {
    state: event.state,         // 'closed' | 'open' | 'half-open'
    failures: event.failures,   // consecutive failures
    timestamp: new Date()
  });

  if (event.state === 'open') {
    // Enable failover SIEM
    primaryConnector.disconnect();
    secondaryConnector.connect();
    notifyOps('Primary SIEM unavailable, switched to secondary');
  }

  if (event.state === 'half-open') {
    // Testing recovery
    console.log('Testing recovery...');
  }

  if (event.state === 'closed') {
    // Back to normal
    notifyOps('Primary SIEM recovered');
  }
});
```

---

## API Reference

### SIEMConnectorManager

```typescript
// Main manager for coordinating multiple SIEM connectors

class SIEMConnectorManager {
  // Register a connector
  registerConnector(name: string, connector: ISIEMConnector): void

  // Send event to all registered connectors
  async sendEventToAll(event: SIEMEvent): Promise<void>

  // Send event to specific connector
  async sendEventTo(connectorName: string, event: SIEMEvent): Promise<void>

  // Get status of single connector
  async getConnectorStatus(name: string): Promise<ConnectorStatus | null>

  // Get status of all connectors
  async getAllConnectorStatus(): Promise<ConnectorStatus[]>

  // Disconnect all connectors
  async disconnectAll(): Promise<void>

  // Event listeners
  on(event: string, listener: Function): void
  off(event: string, listener: Function): void
}

// Available events: 'error', 'connected', 'disconnected', 'batchSent'
```

### SIEMEvent Interface

```typescript
interface SIEMEvent {
  timestamp: number                    // Milliseconds since epoch
  source: string                       // Source system (e.g., 'workflow-engine')
  eventType: string                    // Event type (e.g., 'authentication')
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string                      // Human-readable message
  userId?: string                      // Associated user
  workflowId?: string                  // Associated workflow
  executionId?: string                 // Associated execution
  metadata?: Record<string, unknown>   // Additional data
  tags?: string[]                      // Arbitrary tags
}
```

### SIEMQueryBuilder

```typescript
class SIEMQueryBuilder {
  // Set target platform
  setPlatform(platform: SIEMPlatform): this

  // Add WHERE conditions
  where(field: string, operator: ComparisonOperator, value: unknown): this
  and(field: string, operator: ComparisonOperator, value: unknown): this
  or(field: string, operator: ComparisonOperator, value: unknown): this
  not(field: string, operator: ComparisonOperator, value: unknown): this

  // Special operators
  in(field: string, values: unknown[]): this
  between(field: string, min: unknown, max: unknown): this

  // Time filters
  timeRange(from: Date | string, to: Date | string): this
  relativeTime(relative: string): this // e.g., 'last_24_hours'

  // Field selection
  select(...fields: string[]): this

  // Aggregations
  count(alias?: string): this
  sum(field: string, alias?: string): this
  avg(field: string, alias?: string): this
  min(field: string, alias?: string): this
  max(field: string, alias?: string): this
  distinct(field: string, alias?: string): this
  percentile(field: string, percentile: number, alias?: string): this

  // Grouping and sorting
  groupBy(...fields: string[]): this
  orderBy(field: string, order?: SortOrder): this

  // Configuration
  limit(maxResults: number): this
  timeout(seconds: number): this
  optimize(): this

  // Build and validate
  build(): QueryResult
  validate(): { valid: boolean; errors: string[] }

  // Utility
  clear(): this
  clone(): SIEMQueryBuilder
}
```

### StreamManager

```typescript
class StreamManager {
  // Initialize with destinations
  constructor(destinations: StreamDestination[])

  // Lifecycle
  async initialize(): Promise<void>
  async shutdown(): Promise<void>

  // Send events
  async send(event: WorkflowEvent): Promise<void>
  async sendBatch(events: WorkflowEvent[]): Promise<void>

  // Configuration
  configureBuffer(config: BufferConfig): void
  configurePerformance(config: PerformanceConfig): void
  setFilterRules(destinationId: string, rules: FilterRule[]): void
  setSamplingRate(destinationId: string, rate: number): void

  // Monitoring
  async getHealth(): Promise<StreamHealth>
  async getMetrics(): Promise<StreamMetrics>

  // Destination management
  enableDestination(id: string): Promise<void>
  disableDestination(id: string): Promise<void>

  // Event listeners
  on(event: string, listener: Function): void
  off(event: string, listener: Function): void
}
```

### CorrelationEngine

```typescript
class CorrelationEngine extends EventEmitter {
  // Rule management
  registerRule(rule: CorrelationRule): void
  enableRule(ruleId: string): Promise<void>
  disableRule(ruleId: string): Promise<void>
  deleteRule(ruleId: string): void

  // Process events
  async analyze(event: SecurityEvent): Promise<CorrelationAlert[]>
  async analyzeBatch(events: SecurityEvent[]): Promise<CorrelationAlert[]>

  // Query alerts
  getAlerts(filter?: AlertFilter): CorrelationAlert[]
  getAlertsByRule(ruleId: string): CorrelationAlert[]
  getAlertsBySeverity(severity: string): CorrelationAlert[]
  getAlertsByMitreTechnique(technique: string): CorrelationAlert[]

  // Alert management
  acknowledgeAlert(alertId: string): void
  closeAlert(alertId: string, reason: string): void
  updateAlertSeverity(alertId: string, severity: number): void

  // Chain detection
  createChainDetector(config: ChainDetectorConfig): ChainDetector
  registerChainDetector(detector: ChainDetector): void

  // Lifecycle
  async start(): Promise<void>
  async stop(): Promise<void>
}
```

### Configuration Interfaces

```typescript
interface SplunkConfig extends SIEMConnectorConfig {
  hecUrl: string
  hecToken: string
  index?: string
  sourcetype?: string
  source?: string
  useSsl?: boolean
}

interface ElasticsearchConfig extends SIEMConnectorConfig {
  nodes: string[]
  apiKey: string
  indexPattern?: string
  pipelines?: string[]
  useSsl?: boolean
}

interface QRadarConfig extends SIEMConnectorConfig {
  host: string
  apiKey: string
  port?: number
  useSsl?: boolean
  customEventMapping?: Record<string, string>
}

interface LogRhythmConfig extends SIEMConnectorConfig {
  caseApiUrl: string
  token: string
  entityMapping?: Record<string, string>
  useSsl?: boolean
}

interface DatadogConfig extends SIEMConnectorConfig {
  apiKey: string
  applicationKey: string
  site: 'us1' | 'us3' | 'us5' | 'eu1' | 'ap1'
  service?: string
  env?: string
}
```

---

## Summary

This comprehensive guide covers:

- **Architecture**: Event flow from workflows to SIEM platforms
- **Setup**: 5-minute quick start for all 5 supported platforms
- **Connectors**: Detailed configuration for Splunk, Elasticsearch, QRadar, LogRhythm, Datadog
- **Normalization**: CEF, LEEF, ECS, and Syslog format support
- **Streaming**: Multi-destination buffering with 0 data loss
- **Querying**: Fluent API with 15+ query templates
- **Correlation**: 15+ built-in security rules + custom rule engine
- **Best Practices**: Performance, security, HA, compliance
- **Troubleshooting**: Common issues and solutions
- **API Reference**: Complete class and interface documentation

For additional help, refer to individual platform documentation or contact your SIEM provider's support team.

