# SOC Operations Guide - Week 24

**Security Operations Center (SOC) Platform for Workflow Automation**

Version: 1.0.0
Last Updated: November 2025
Classification: Internal Use Only

---

## Table of Contents

1. [Overview](#1-overview)
2. [SOCOperationsCenter Usage](#2-socoperationscenter-usage)
3. [ThreatIntelligencePlatform Usage](#3-threatintelligenceplatform-usage)
4. [SecurityOrchestrationHub Usage](#4-securityorchestrationhub-usage)
5. [Alert Prioritization and ML Scoring](#5-alert-prioritization-and-ml-scoring)
6. [Shift Management and Handoff](#6-shift-management-and-handoff)
7. [SLA Tracking and Escalation](#7-sla-tracking-and-escalation)
8. [Threat Feed Integration](#8-threat-feed-integration)
9. [Automated Response Playbooks](#9-automated-response-playbooks)
10. [Metrics and Reporting](#10-metrics-and-reporting)
11. [Best Practices](#11-best-practices)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Overview

### 1.1 Platform Architecture

The SOC Platform provides enterprise-grade security operations capabilities for the workflow automation platform. It consists of three core components:

```
+------------------------------------------------------------------+
|                    SOC Platform Architecture                      |
+------------------------------------------------------------------+
|                                                                   |
|  +-------------------+  +----------------------+  +--------------+|
|  | SOCOperations     |  | ThreatIntelligence   |  | Security     ||
|  | Center            |  | Platform             |  | Orchestration||
|  |                   |  |                      |  | Hub          ||
|  | - Alert Triage    |  | - Threat Feeds       |  | - Playbooks  ||
|  | - Case Management |  | - IOC Management     |  | - Containment||
|  | - SLA Tracking    |  | - Actor Tracking     |  | - Remediation||
|  | - Shift Mgmt      |  | - Campaign Analysis  |  | - Rollback   ||
|  +-------------------+  +----------------------+  +--------------+|
|                              |                                    |
|                              v                                    |
|  +-----------------------------------------------------------+   |
|  |                    Shared Services                         |   |
|  | - Event Bus | - Audit Logging | - External Integrations   |   |
|  +-----------------------------------------------------------+   |
+------------------------------------------------------------------+
```

### 1.2 Key Features

| Component | Features |
|-----------|----------|
| **SOCOperationsCenter** | Alert triage, case management, shift handoff, SLA monitoring, analyst workload balancing |
| **ThreatIntelligencePlatform** | 10+ threat feeds, IOC enrichment, threat actor profiling, STIX/TAXII support |
| **SecurityOrchestrationHub** | 50+ playbook actions, multi-tool integration, containment automation, rollback capability |

### 1.3 Quick Start

```typescript
import { SOCOperationsCenter, getSOCOperationsCenter } from '@/soc/SOCOperationsCenter';
import { ThreatIntelligencePlatform } from '@/soc/ThreatIntelligencePlatform';
import { SecurityOrchestrationHub } from '@/soc/SecurityOrchestrationHub';

// Initialize the SOC platform
const soc = getSOCOperationsCenter({
  autoTriageEnabled: true,
  mlScoringEnabled: true,
  autoAssignmentEnabled: true
});

const tip = ThreatIntelligencePlatform.getInstance();
const soar = SecurityOrchestrationHub.getInstance();

// Start operations
await tip.initialize();
console.log('SOC Platform initialized and ready');
```

---

## 2. SOCOperationsCenter Usage

### 2.1 Alert Triage

The SOCOperationsCenter provides comprehensive alert management with automatic triage scoring.

#### 2.1.1 Ingesting Alerts

```typescript
import { getSOCOperationsCenter, AlertSeverity } from '@/soc/SOCOperationsCenter';

const soc = getSOCOperationsCenter();

// Ingest a new security alert
const alert = await soc.ingestAlert({
  severity: 'critical',
  title: 'Suspicious Process Execution',
  description: 'powershell.exe launched with encoded command',
  source: 'CrowdStrike EDR',
  sourceType: 'edr',
  indicators: [
    {
      type: 'process',
      value: 'powershell.exe -enc',
      confidence: 95,
      context: 'Command line obfuscation detected'
    },
    {
      type: 'ip',
      value: '185.220.101.42',
      confidence: 80,
      context: 'Known C2 IP address'
    }
  ],
  affectedAssets: ['WORKSTATION-001', 'user.john.doe'],
  tags: ['encoded-powershell', 'living-off-the-land']
});

console.log(`Alert ingested: ${alert.id}`);
console.log(`Triage Score: ${alert.triageScore}`);
console.log(`ML Score: ${alert.mlScore}`);
```

#### 2.1.2 Filtering and Retrieving Alerts

```typescript
// Get critical and high severity alerts from the last 24 hours
const criticalAlerts = soc.getAlerts({
  severity: ['critical', 'high'],
  status: ['new', 'triaged'],
  dateRange: {
    start: new Date(Date.now() - 24 * 60 * 60 * 1000),
    end: new Date()
  },
  limit: 50
});

// Get alerts assigned to a specific analyst
const myAlerts = soc.getAlerts({
  assignedTo: 'analyst-001',
  status: ['triaged', 'investigating']
});

// Display alert summary
criticalAlerts.forEach(alert => {
  console.log(`[${alert.severity.toUpperCase()}] ${alert.title}`);
  console.log(`  ID: ${alert.id}`);
  console.log(`  Source: ${alert.source}`);
  console.log(`  Triage Score: ${alert.triageScore}`);
  console.log(`  Status: ${alert.status}`);
  console.log('---');
});
```

#### 2.1.3 Manual Triage

```typescript
// Manually triage an alert with analyst assignment
const triagedAlert = await soc.triageAlert('ALT-123456789', 'analyst-001');

console.log(`Alert triaged with score: ${triagedAlert.triageScore}`);
console.log(`Assigned to: ${triagedAlert.assignedTo}`);
```

### 2.2 Case Management

#### 2.2.1 Creating Cases

```typescript
// Create a new case from related alerts
const newCase = await soc.createCase({
  title: 'Potential APT Activity - Finance Department',
  description: 'Multiple indicators suggest targeted attack against finance systems',
  priority: 'P1',
  relatedAlerts: ['ALT-001', 'ALT-002', 'ALT-003'],
  assignedTo: 'senior-analyst-001',
  tags: ['apt', 'finance', 'data-exfiltration']
}, 'soc-manager-001');

console.log(`Case created: ${newCase.id}`);
console.log(`Priority: ${newCase.priority}`);
console.log(`SLA Deadline: ${newCase.slaDeadline}`);
```

#### 2.2.2 Managing Case Lifecycle

```typescript
// Assign an analyst to a case
const assignedCase = await soc.assignAnalyst(
  'CASE-123456789',
  'senior-analyst-002',
  'soc-manager-001'
);

// Escalate a case
const escalatedCase = await soc.escalateCase(
  'CASE-123456789',
  'incident-response-team',
  'Possible nation-state actor involvement',
  'senior-analyst-002'
);

// Get cases by filter
const openCases = soc.getCases({
  status: ['open', 'investigating'],
  priority: ['P1', 'P2'],
  limit: 20
});
```

#### 2.2.3 Adding Evidence to Cases

```typescript
// Evidence is managed through the case timeline
const caseDetails = soc.getCases({ status: ['investigating'] })[0];

// Timeline entries track all case activities
caseDetails.timeline.forEach(entry => {
  console.log(`[${entry.timestamp}] ${entry.type}: ${entry.content}`);
  if (entry.attachments) {
    console.log(`  Attachments: ${entry.attachments.join(', ')}`);
  }
});
```

### 2.3 Dashboard Views

```typescript
// Create a custom dashboard view
const dashboardView = soc.createDashboardView({
  name: 'Critical Alerts Dashboard',
  userId: 'analyst-001',
  isDefault: true,
  layout: [
    {
      id: 'widget-1',
      type: 'alerts',
      position: { x: 0, y: 0, w: 6, h: 4 },
      config: { severity: ['critical', 'high'], status: ['new'] }
    },
    {
      id: 'widget-2',
      type: 'metrics',
      position: { x: 6, y: 0, w: 6, h: 4 },
      config: { metrics: ['mttd', 'mttr', 'slaCompliance'] }
    },
    {
      id: 'widget-3',
      type: 'sla',
      position: { x: 0, y: 4, w: 12, h: 3 },
      config: { showBreaches: true }
    }
  ],
  filters: [
    { field: 'severity', operator: 'in', value: ['critical', 'high'] }
  ],
  refreshInterval: 30000
});

// Get user's dashboard views
const myDashboards = soc.getDashboardViews('analyst-001');
```

---

## 3. ThreatIntelligencePlatform Usage

### 3.1 Threat Feed Management

#### 3.1.1 Available Feeds

The platform includes 10+ pre-configured threat feeds:

| Feed ID | Name | Type | Default Interval |
|---------|------|------|------------------|
| `alienvault-otx` | AlienVault OTX | JSON | 1 hour |
| `abuse-ch-urlhaus` | URLhaus | JSON | 5 minutes |
| `abuse-ch-feodo` | Feodo Tracker | JSON | 1 hour |
| `abuse-ch-malwarebazaar` | Malware Bazaar | JSON | 15 minutes |
| `abuse-ch-threatfox` | ThreatFox | JSON | 15 minutes |
| `emerging-threats` | Emerging Threats | TXT | 1 hour |
| `phishtank` | PhishTank | JSON | 1 hour |
| `spamhaus-drop` | Spamhaus DROP | TXT | 24 hours |
| `dshield` | DShield | TXT | 24 hours |
| `tor-exit-nodes` | TOR Exit Nodes | TXT | 1 hour |

#### 3.1.2 Ingesting Feeds

```typescript
import { ThreatIntelligencePlatform } from '@/soc/ThreatIntelligencePlatform';

const tip = ThreatIntelligencePlatform.getInstance();
await tip.initialize();

// Ingest a specific feed
const result = await tip.ingestFeed('abuse-ch-urlhaus');

console.log(`Feed ingestion: ${result.success ? 'Success' : 'Failed'}`);
console.log(`IOCs added: ${result.iocCount}`);
if (result.errors.length > 0) {
  console.log(`Errors: ${result.errors.join(', ')}`);
}

// Get all available feeds
const feeds = tip.getAllFeeds();
feeds.forEach(feed => {
  console.log(`${feed.name}: ${feed.enabled ? 'Enabled' : 'Disabled'}`);
  console.log(`  Last refresh: ${feed.lastRefresh || 'Never'}`);
  console.log(`  IOC count: ${feed.iocCount}`);
});
```

### 3.2 IOC Management

#### 3.2.1 Adding and Enriching IOCs

```typescript
// Add a new IOC manually
const ioc = await tip.addIOC({
  type: 'ip-dst',
  value: '185.220.101.42',
  confidence: 90,
  severity: 'critical',
  categories: ['c2', 'botnet'],
  sources: ['internal-investigation'],
  tags: ['emotet', 'banking-trojan'],
  context: {
    description: 'Known Emotet C2 server',
    malwareFamily: 'Emotet',
    killChainPhases: ['command-and-control'],
    mitreAttackIds: ['T1071.001', 'T1573.001']
  }
});

console.log(`IOC added: ${ioc.id}`);

// Manually trigger enrichment
const enrichedIOC = await tip.enrichIOC(ioc.id);

console.log('Enrichment results:');
if (enrichedIOC?.enrichment) {
  const e = enrichedIOC.enrichment;
  if (e.geoLocation) {
    console.log(`  Location: ${e.geoLocation.country} (${e.geoLocation.countryCode})`);
    console.log(`  ASN: ${e.geoLocation.asn} - ${e.geoLocation.asnOrg}`);
  }
  if (e.reputation) {
    console.log(`  Reputation Score: ${e.reputation.score}`);
  }
  if (e.virusTotal) {
    console.log(`  VirusTotal: ${e.virusTotal.positives}/${e.virusTotal.total} detections`);
  }
}
```

#### 3.2.2 Searching IOCs

```typescript
// Get all IOCs
const allIOCs = tip.getAllIOCs();

// Filter by type
const maliciousIPs = allIOCs.filter(ioc =>
  ioc.type === 'ip-dst' &&
  ioc.severity === 'critical'
);

// Search by value pattern
const domainIOCs = allIOCs.filter(ioc =>
  ioc.type === 'domain' &&
  ioc.value.includes('.xyz')
);

// Get IOC by ID
const specificIOC = tip.getIOC('ioc_123456789');
```

### 3.3 Threat Actor Tracking

```typescript
// Track a new threat actor
const actor = tip.trackThreatActor({
  name: 'APT29',
  aliases: ['Cozy Bear', 'The Dukes', 'YTTRIUM'],
  description: 'Russian state-sponsored threat group targeting government entities',
  motivation: ['espionage'],
  sophistication: 'expert',
  targetedSectors: ['government', 'defense', 'healthcare'],
  targetedCountries: ['US', 'EU', 'UK'],
  ttps: [
    { id: 'ttp-001', name: 'Spearphishing', mitreId: 'T1566', tactic: 'initial-access' },
    { id: 'ttp-002', name: 'Valid Accounts', mitreId: 'T1078', tactic: 'persistence' },
    { id: 'ttp-003', name: 'Remote Services', mitreId: 'T1021', tactic: 'lateral-movement' }
  ],
  sources: ['CISA', 'FireEye', 'CrowdStrike']
});

console.log(`Threat actor tracked: ${actor.id}`);
console.log(`Name: ${actor.name}`);
console.log(`Aliases: ${actor.aliases.join(', ')}`);

// Get threat actor details
const actorDetails = tip.getThreatActor(actor.id);
```

### 3.4 Campaign Analysis

```typescript
// Create a campaign
const campaign = tip.createCampaign({
  name: 'SolarWinds Supply Chain Attack',
  description: 'Supply chain compromise targeting SolarWinds Orion platform',
  threatActorIds: [actor.id],
  status: 'historic',
  objectives: ['espionage', 'persistent-access'],
  targetedSectors: ['government', 'technology', 'telecommunications'],
  targetedCountries: ['US', 'EU'],
  ttps: [
    { id: 'ttp-004', name: 'Supply Chain Compromise', mitreId: 'T1195.002' },
    { id: 'ttp-005', name: 'Trusted Relationship', mitreId: 'T1199' }
  ],
  sources: ['CISA', 'Microsoft DART']
});

console.log(`Campaign created: ${campaign.id}`);

// Get all campaigns
const allCampaigns = tip.getAllCampaigns();
allCampaigns.forEach(c => {
  console.log(`${c.name} (${c.status})`);
  console.log(`  Actors: ${c.threatActorIds.length}`);
  console.log(`  IOCs: ${c.iocIds.length}`);
});
```

### 3.5 Hunt Query Generation

```typescript
// Generate hunt queries for different platforms
const splunkQuery = tip.generateHuntQuery({
  platform: 'splunk',
  iocIds: ['ioc-001', 'ioc-002'],
  threatActorIds: [actor.id],
  name: 'APT29 Hunt - Splunk'
});

console.log('Splunk Query:');
console.log(splunkQuery.query);

// Generate Sigma rule
const sigmaRule = tip.generateHuntQuery({
  platform: 'sigma',
  campaignIds: [campaign.id],
  name: 'SolarWinds Detection Rule'
});

console.log('\nSigma Rule:');
console.log(sigmaRule.query);

// Generate YARA rule
const yaraRule = tip.generateHuntQuery({
  platform: 'yara',
  iocIds: allIOCs.slice(0, 10).map(i => i.id),
  name: 'IOC Detection YARA'
});

console.log('\nYARA Rule:');
console.log(yaraRule.query);
```

### 3.6 Intelligence Sharing (STIX/TAXII)

```typescript
// Share intelligence to external platforms
const shareResult = await tip.shareIntelligence({
  iocIds: ['ioc-001', 'ioc-002'],
  threatActorIds: [actor.id],
  campaignIds: [campaign.id],
  destination: 'misp'
});

console.log(`Share result: ${shareResult.success ? 'Success' : 'Failed'}`);
console.log(`Objects shared: ${shareResult.objectsShared}`);

// Generate an intelligence report
const report = tip.generateReport({
  title: 'APT29 Activity Report - Q4 2024',
  reportType: 'actor-profile',
  tlp: 'amber',
  threatActorIds: [actor.id],
  campaignIds: [campaign.id],
  iocIds: allIOCs.slice(0, 20).map(i => i.id)
});

console.log(`Report generated: ${report.id}`);
console.log(`Summary: ${report.summary}`);
console.log('\nRecommendations:');
report.recommendations.forEach((rec, i) => {
  console.log(`  ${i + 1}. ${rec}`);
});
```

---

## 4. SecurityOrchestrationHub Usage

### 4.1 Playbook Management

#### 4.1.1 Registering Playbooks

```typescript
import {
  SecurityOrchestrationHub,
  ThreatSeverity,
  PlaybookActionCategory,
  IntegrationSystem
} from '@/soc/SecurityOrchestrationHub';

const soar = SecurityOrchestrationHub.getInstance();

// Register a ransomware response playbook
const ransomwarePlaybook = soar.registerPlaybook({
  id: 'playbook-ransomware-001',
  name: 'Ransomware Incident Response',
  description: 'Automated response playbook for ransomware incidents',
  version: '2.0.0',
  threatTypes: ['ransomware', 'malware'],
  severity: [ThreatSeverity.CRITICAL, ThreatSeverity.HIGH],
  autoExecute: false,
  approvalRequired: true,
  approvers: ['security_manager', 'ciso'],
  maxDuration: 3600000, // 1 hour
  tags: ['ransomware', 'critical', 'automated'],
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: 'soc-lead',
  actions: [
    {
      id: 'action-001',
      name: 'Isolate Affected Hosts',
      description: 'Network isolation of compromised endpoints',
      category: PlaybookActionCategory.CONTAINMENT,
      automated: true,
      requiresApproval: false,
      timeout: 300000,
      retryCount: 3,
      rollbackEnabled: true,
      rollbackAction: 'action-001-rollback',
      dependencies: [],
      parameters: { isolationType: 'full' },
      integrations: [IntegrationSystem.EDR_CROWDSTRIKE]
    },
    {
      id: 'action-002',
      name: 'Block C2 IPs',
      description: 'Block known C2 infrastructure at perimeter',
      category: PlaybookActionCategory.CONTAINMENT,
      automated: true,
      requiresApproval: false,
      timeout: 60000,
      retryCount: 2,
      rollbackEnabled: true,
      dependencies: [],
      parameters: {},
      integrations: [IntegrationSystem.FIREWALL_PALO_ALTO]
    },
    {
      id: 'action-003',
      name: 'Disable Compromised Accounts',
      description: 'Disable user accounts with evidence of compromise',
      category: PlaybookActionCategory.CONTAINMENT,
      automated: false,
      requiresApproval: true,
      approvalRoles: ['security_manager'],
      timeout: 300000,
      retryCount: 1,
      rollbackEnabled: true,
      dependencies: ['action-001'],
      parameters: {},
      integrations: [IntegrationSystem.IAM_OKTA]
    },
    {
      id: 'action-004',
      name: 'Collect Forensic Evidence',
      description: 'Memory dump and disk imaging',
      category: PlaybookActionCategory.EVIDENCE_COLLECTION,
      automated: true,
      requiresApproval: false,
      timeout: 1800000,
      retryCount: 1,
      rollbackEnabled: false,
      dependencies: ['action-001'],
      parameters: { collectMemory: true, collectDisk: true },
      integrations: [IntegrationSystem.EDR_CROWDSTRIKE]
    },
    {
      id: 'action-005',
      name: 'Create ServiceNow Incident',
      description: 'Create incident ticket in ServiceNow',
      category: PlaybookActionCategory.NOTIFICATION,
      automated: true,
      requiresApproval: false,
      timeout: 30000,
      retryCount: 3,
      rollbackEnabled: false,
      dependencies: [],
      parameters: { priority: 1, category: 'Security' },
      integrations: [IntegrationSystem.TICKETING_SERVICENOW]
    }
  ]
});

console.log(`Playbook registered: ${ransomwarePlaybook.id}`);
```

#### 4.1.2 Finding and Executing Playbooks

```typescript
// Find playbooks matching a threat
const matchingPlaybooks = soar.findMatchingPlaybooks('ransomware', ThreatSeverity.CRITICAL);

console.log(`Found ${matchingPlaybooks.length} matching playbook(s)`);
matchingPlaybooks.forEach(pb => {
  console.log(`  - ${pb.name} (v${pb.version})`);
});

// Execute a playbook for an incident
const execution = await soar.executePlaybook(
  'playbook-ransomware-001',
  'INC-20241122-001',
  'analyst-001',
  {
    affectedHosts: ['HOST-001', 'HOST-002'],
    c2Indicators: ['185.220.101.42', '192.168.100.50']
  }
);

console.log(`Playbook execution: ${execution.id}`);
console.log(`Status: ${execution.status}`);
console.log(`Actions completed: ${execution.metrics.completedActions}/${execution.metrics.totalActions}`);
```

### 4.2 Containment Actions

#### 4.2.1 Available Containment Types

| Type | Description | Rollbackable |
|------|-------------|--------------|
| `ISOLATE_HOST` | Network isolate endpoint | Yes |
| `BLOCK_IP` | Block IP at perimeter | Yes |
| `BLOCK_DOMAIN` | Block domain at DNS/proxy | Yes |
| `DISABLE_USER` | Disable user account | Yes |
| `REVOKE_SESSIONS` | Terminate all user sessions | Yes |
| `QUARANTINE_FILE` | Quarantine malicious file | Yes |
| `BLOCK_NETWORK_SEGMENT` | Block network segment | Yes |
| `DISABLE_SERVICE` | Stop/disable a service | Yes |
| `REVOKE_API_KEYS` | Revoke compromised API keys | No |
| `LOCK_ACCOUNT` | Lock user account | Yes |
| `RESTRICT_PERMISSIONS` | Remove elevated permissions | Yes |

#### 4.2.2 Applying Containment

```typescript
import { ContainmentType } from '@/soc/SecurityOrchestrationHub';

// Contain threats for an incident
const containmentResults = await soar.containThreat(
  'INC-20241122-001',
  [
    {
      type: ContainmentType.ISOLATE_HOST,
      target: 'WORKSTATION-001',
      targetType: 'host',
      automated: true
    },
    {
      type: ContainmentType.BLOCK_IP,
      target: '185.220.101.42',
      targetType: 'ip',
      automated: true
    },
    {
      type: ContainmentType.DISABLE_USER,
      target: 'john.doe@company.com',
      targetType: 'user',
      automated: false
    }
  ],
  'analyst-001'
);

// Check containment status
containmentResults.forEach(action => {
  console.log(`${action.type}: ${action.status}`);
  console.log(`  Target: ${action.target}`);
  console.log(`  Rollbackable: ${action.rollbackable}`);
});
```

#### 4.2.3 Releasing Containment

```typescript
// Release containment when threat is eradicated
const releasedAction = await soar.releaseContainment(
  'cont-123456789',
  'analyst-001',
  'Threat eradicated and system verified clean'
);

console.log(`Containment released: ${releasedAction.id}`);
console.log(`Duration: ${releasedAction.duration}ms`);
```

### 4.3 Remediation Workflows

#### 4.3.1 Available Remediation Types

| Type | Description | Approval Required |
|------|-------------|-------------------|
| `PATCH_SYSTEM` | Apply security patches | Yes |
| `UPDATE_SIGNATURES` | Update AV/IDS signatures | No |
| `ROTATE_CREDENTIALS` | Rotate compromised credentials | Yes |
| `RESTORE_BACKUP` | Restore from backup | Yes |
| `REBUILD_SYSTEM` | Full system rebuild | Yes |
| `UPDATE_FIREWALL_RULES` | Modify firewall rules | Yes |
| `REVOKE_CERTIFICATES` | Revoke compromised certs | Yes |
| `UPDATE_ACCESS_POLICIES` | Update IAM policies | Yes |
| `RESET_PASSWORD` | Force password reset | No |
| `UPDATE_WAF_RULES` | Update WAF configuration | Yes |

#### 4.3.2 Initiating Remediation

```typescript
import { RemediationType } from '@/soc/SecurityOrchestrationHub';

// Initiate remediation actions
const remediationResults = await soar.remediateIncident(
  'INC-20241122-001',
  [
    {
      type: RemediationType.ROTATE_CREDENTIALS,
      target: 'john.doe@company.com',
      requiresApproval: true
    },
    {
      type: RemediationType.UPDATE_SIGNATURES,
      target: 'all-endpoints',
      requiresApproval: false
    },
    {
      type: RemediationType.PATCH_SYSTEM,
      target: 'WORKSTATION-001',
      requiresApproval: true
    }
  ],
  'analyst-001'
);

// Check remediation status
remediationResults.forEach(action => {
  console.log(`${action.type}: ${action.status}`);
  if (action.status === 'awaiting_approval') {
    console.log(`  Approvers: ${action.approvers.join(', ')}`);
  }
});
```

#### 4.3.3 Approving Remediation

```typescript
// Approve a pending remediation action
const approvedAction = await soar.approveRemediation(
  'rem-123456789',
  'security_manager'
);

console.log(`Remediation approved: ${approvedAction.id}`);
console.log(`Status: ${approvedAction.status}`);
console.log(`Approved by: ${approvedAction.approvedBy}`);
```

### 4.4 Integration Management

```typescript
// Configure an EDR integration
soar.integrateSystem({
  system: IntegrationSystem.EDR_CROWDSTRIKE,
  name: 'CrowdStrike Falcon',
  baseUrl: 'https://api.crowdstrike.com',
  clientId: process.env.CROWDSTRIKE_CLIENT_ID,
  clientSecret: process.env.CROWDSTRIKE_CLIENT_SECRET,
  timeout: 30000,
  retryCount: 3,
  rateLimitPerSecond: 10,
  enabled: true,
  healthCheckEndpoint: '/sensors/queries/sensors/v1',
  healthStatus: 'unknown'
});

// Configure a firewall integration
soar.integrateSystem({
  system: IntegrationSystem.FIREWALL_PALO_ALTO,
  name: 'Palo Alto Networks',
  baseUrl: 'https://firewall.company.com/api',
  apiKey: process.env.PALO_ALTO_API_KEY,
  timeout: 30000,
  retryCount: 2,
  rateLimitPerSecond: 5,
  enabled: true,
  healthStatus: 'unknown'
});

// Check health of all integrations
const healthResults = await soar.checkHealth();
healthResults.forEach((health, system) => {
  console.log(`${system}: ${health.status}`);
  console.log(`  Latency: ${health.latency}ms`);
  console.log(`  Success Rate: ${health.successRate}%`);
});
```

### 4.5 Rollback Capabilities

```typescript
// Rollback a playbook execution
const rollbackResult = await soar.rollbackAction({
  executionId: 'exec-123456789',
  reason: 'False positive - legitimate admin activity',
  requestedBy: 'analyst-001',
  approvalRequired: false
});

console.log(`Rollback success: ${rollbackResult.success}`);
console.log(`Actions rolled back: ${rollbackResult.rolledBackActions.join(', ')}`);
if (rollbackResult.failedActions.length > 0) {
  console.log(`Failed actions: ${rollbackResult.failedActions.join(', ')}`);
}
```

---

## 5. Alert Prioritization and ML Scoring

### 5.1 Triage Score Calculation

The SOC platform calculates triage scores using multiple factors:

```typescript
/*
 * Triage Score Components (0-100 scale):
 *
 * 1. Severity Weight (max 100 points):
 *    - Critical: 100
 *    - High: 80
 *    - Medium: 50
 *    - Low: 25
 *    - Info: 10
 *
 * 2. Indicator Count (max 50 points):
 *    - 5 points per indicator
 *
 * 3. Affected Assets (max 30 points):
 *    - 10 points per asset
 *
 * 4. ML Score Bonus (max 20 points):
 *    - Applied when ML score > threshold (0.7)
 */

// Example triage score breakdown
const alert = await soc.ingestAlert({
  severity: 'high',          // 80 points
  indicators: [              // 3 indicators * 5 = 15 points
    { type: 'ip', value: '1.2.3.4', confidence: 90 },
    { type: 'domain', value: 'evil.com', confidence: 85 },
    { type: 'hash', value: 'abc123...', confidence: 95 }
  ],
  affectedAssets: ['HOST-001', 'HOST-002'], // 2 assets * 10 = 20 points
  // Total base: 80 + 15 + 20 = 115 (capped at 100)
  // ML bonus: +20 if ML score > 0.7
});
```

### 5.2 ML Scoring Configuration

```typescript
// Configure ML scoring
const soc = getSOCOperationsCenter({
  mlScoringEnabled: true,
  mlScoringThreshold: 0.7,
  autoTriageEnabled: true
});

// ML score factors (simulated in current implementation):
// - Severity weight: critical=0.9, high=0.75, medium=0.5, low=0.25, info=0.1
// - Indicator bonus: 0.05 per indicator (max 0.3)
// - Historical pattern matching: adds variance based on patterns
```

### 5.3 Priority Matrix

| Severity | Triage Score | ML Score | Priority |
|----------|--------------|----------|----------|
| Critical | 80-100 | > 0.8 | P1 - Immediate |
| Critical | 60-79 | > 0.6 | P1 - Immediate |
| High | 70-100 | > 0.7 | P1 - Immediate |
| High | 50-69 | > 0.5 | P2 - High |
| Medium | 60-100 | > 0.6 | P2 - High |
| Medium | 40-59 | any | P3 - Medium |
| Low | any | any | P4 - Low |

---

## 6. Shift Management and Handoff

### 6.1 Shift Configuration

```typescript
// Default shift schedule configuration
const socConfig = {
  shiftSchedule: {
    dayShift: { start: '06:00', end: '14:00' },
    swingShift: { start: '14:00', end: '22:00' },
    nightShift: { start: '22:00', end: '06:00' },
    timezone: 'UTC'
  }
};

const soc = getSOCOperationsCenter(socConfig);
```

### 6.2 Analyst Registration

```typescript
// Register SOC analysts
soc.registerAnalyst({
  id: 'analyst-001',
  name: 'John Smith',
  email: 'john.smith@company.com',
  role: 'senior_analyst',
  shift: 'day',
  skills: ['malware-analysis', 'forensics', 'threat-hunting'],
  currentCaseload: 0,
  maxCaseload: 5,
  available: true,
  performanceMetrics: {
    casesHandled: 150,
    avgResolutionTime: 240,
    falsePositiveRate: 5,
    escalationRate: 12,
    slaCompliance: 98
  }
});

soc.registerAnalyst({
  id: 'analyst-002',
  name: 'Jane Doe',
  email: 'jane.doe@company.com',
  role: 'analyst',
  shift: 'swing',
  skills: ['phishing', 'email-security', 'user-behavior'],
  currentCaseload: 2,
  maxCaseload: 6,
  available: true
});

// Get available analysts for current shift
const availableAnalysts = soc.getAvailableAnalysts('day');
availableAnalysts.forEach(analyst => {
  console.log(`${analyst.name} (${analyst.role})`);
  console.log(`  Caseload: ${analyst.currentCaseload}/${analyst.maxCaseload}`);
  console.log(`  Skills: ${analyst.skills.join(', ')}`);
});
```

### 6.3 Shift Handoff Process

```typescript
// Perform shift handoff
const handoffResult = await soc.handoffShift(
  'shift-day-20241122',
  'shift-swing-20241122',
  `
Shift Handoff Notes - Day to Swing (2024-11-22):

ACTIVE CASES:
- CASE-001: Ransomware incident - HOST-001 isolated, awaiting forensics
- CASE-002: Phishing campaign - 15 users impacted, credentials being rotated

PENDING ALERTS (High Priority):
- ALT-005: Suspicious PowerShell on FINANCE-SERVER
- ALT-007: Lateral movement detected - needs investigation

RUNBOOKS IN PROGRESS:
- Ransomware playbook at 60% completion for CASE-001

NOTABLE EVENTS:
- CrowdStrike integration had brief outage (15 minutes)
- New IOCs added for Emotet campaign

ACTION ITEMS FOR SWING SHIFT:
1. Follow up on CASE-001 forensics
2. Complete user notifications for CASE-002
3. Investigate ALT-005 - may be admin activity
  `
);

console.log('Shift handoff complete:');
console.log(`  Open cases transferred: ${handoffResult.openCases.length}`);
console.log(`  Pending alerts: ${handoffResult.pendingAlerts}`);
console.log(`  Shift metrics:`);
console.log(`    Alerts processed: ${handoffResult.metrics.alertsProcessed}`);
console.log(`    Cases opened: ${handoffResult.metrics.casesOpened}`);
console.log(`    Cases closed: ${handoffResult.metrics.casesClosed}`);
console.log(`    Avg triage time: ${handoffResult.metrics.avgTriageTime}min`);
```

---

## 7. SLA Tracking and Escalation

### 7.1 SLA Configuration

```typescript
// Default SLA configuration by severity
const slaConfigs = [
  {
    severity: 'critical',
    responseTimeMinutes: 15,
    resolutionTimeMinutes: 60,
    escalationThresholdMinutes: 30,
    notificationChannels: ['pagerduty', 'slack']
  },
  {
    severity: 'high',
    responseTimeMinutes: 30,
    resolutionTimeMinutes: 240,
    escalationThresholdMinutes: 60,
    notificationChannels: ['slack', 'email']
  },
  {
    severity: 'medium',
    responseTimeMinutes: 120,
    resolutionTimeMinutes: 480,
    escalationThresholdMinutes: 180,
    notificationChannels: ['email']
  },
  {
    severity: 'low',
    responseTimeMinutes: 480,
    resolutionTimeMinutes: 1440,
    escalationThresholdMinutes: 720,
    notificationChannels: ['email']
  },
  {
    severity: 'info',
    responseTimeMinutes: 1440,
    resolutionTimeMinutes: 2880,
    escalationThresholdMinutes: 1440,
    notificationChannels: []
  }
];
```

### 7.2 SLA Status Tracking

```typescript
// Track SLA for an alert
const slaStatus = soc.trackSLA('ALT-123456789');

if (slaStatus) {
  console.log('SLA Status:');
  console.log(`  Severity: ${slaStatus.severity}`);
  console.log(`  Created: ${slaStatus.createdAt}`);
  console.log(`  Response deadline: ${slaStatus.responseDeadline}`);
  console.log(`  Resolution deadline: ${slaStatus.resolutionDeadline}`);

  if (slaStatus.respondedAt) {
    console.log(`  Response time: ${slaStatus.timeToResponse} minutes`);
  }

  console.log(`  Response breached: ${slaStatus.responseBreached}`);
  console.log(`  Resolution breached: ${slaStatus.resolutionBreached}`);
  console.log(`  Escalation triggered: ${slaStatus.escalationTriggered}`);
}
```

### 7.3 SLA Breach Events

```typescript
// Listen for SLA breach events
soc.on('sla:response_breached', ({ id, sla }) => {
  console.log(`ALERT: SLA Response Breach - ${id}`);
  console.log(`  Severity: ${sla.severity}`);
  console.log(`  Deadline was: ${sla.responseDeadline}`);

  // Trigger notification
  sendSlackAlert(`SLA Response breach for ${id} (${sla.severity})`);
});

soc.on('sla:resolution_breached', ({ id, sla }) => {
  console.log(`ALERT: SLA Resolution Breach - ${id}`);
  sendPagerDutyAlert(`SLA Resolution breach for ${id}`);
});
```

### 7.4 Escalation Rules

```typescript
// Configure escalation rules
const soc = getSOCOperationsCenter({
  escalationRules: [
    {
      id: 'esc-001',
      name: 'Critical Alert Escalation',
      conditions: [
        { field: 'severity', operator: 'equals', value: 'critical' },
        { field: 'status', operator: 'equals', value: 'new' }
      ],
      escalateTo: 'soc-manager',
      notifyChannels: ['pagerduty', 'slack'],
      waitMinutes: 15,
      enabled: true
    },
    {
      id: 'esc-002',
      name: 'SLA Breach Escalation',
      conditions: [
        { field: 'slaBreached', operator: 'equals', value: true }
      ],
      escalateTo: 'incident-response-team',
      notifyChannels: ['email', 'slack'],
      waitMinutes: 0,
      enabled: true
    }
  ]
});
```

---

## 8. Threat Feed Integration

### 8.1 Feed Configuration

```typescript
const tip = ThreatIntelligencePlatform.getInstance({
  autoEnrichment: true,
  enrichmentProviders: ['virustotal', 'shodan', 'whois', 'geoip'],
  defaultConfidence: 50,
  iocRetentionDays: 90,
  deduplicationEnabled: true,
  correlationEnabled: true,
  mispUrl: process.env.MISP_URL,
  mispApiKey: process.env.MISP_API_KEY,
  openCTIUrl: process.env.OPENCTI_URL,
  openCTIApiKey: process.env.OPENCTI_API_KEY
});

await tip.initialize();
```

### 8.2 Custom Feed Addition

```typescript
// Add a custom threat feed (conceptual - requires feed management API)
// The platform supports these feed formats:
// - STIX 2.1 bundles
// - TAXII servers
// - CSV files
// - JSON feeds
// - Plain text (IP lists)

// Example: Parsing STIX data
const stixBundle = {
  type: 'bundle',
  id: 'bundle--12345',
  spec_version: '2.1',
  objects: [
    {
      type: 'indicator',
      spec_version: '2.1',
      id: 'indicator--abc123',
      created: '2024-11-22T00:00:00Z',
      modified: '2024-11-22T00:00:00Z',
      pattern: "[ipv4-addr:value = '185.220.101.42']",
      pattern_type: 'stix',
      valid_from: '2024-11-22T00:00:00Z',
      confidence: 90,
      description: 'Known C2 server'
    }
  ]
};

// IOCs from STIX are automatically parsed and added
```

### 8.3 Feed Quality Metrics

```typescript
// Get feed statistics
const stats = tip.getStats();

console.log('Threat Intelligence Statistics:');
console.log(`  Total IOCs: ${stats.totalIOCs}`);
console.log(`  Threat Actors: ${stats.threatActors}`);
console.log(`  Campaigns: ${stats.campaigns}`);
console.log(`  Active Feeds: ${stats.feeds}`);
console.log(`  Last Updated: ${stats.lastUpdated}`);

// Check individual feed health
const feeds = tip.getAllFeeds();
feeds.forEach(feed => {
  const healthStatus = feed.errorCount > 5 ? 'UNHEALTHY' :
                       feed.errorCount > 0 ? 'DEGRADED' : 'HEALTHY';
  console.log(`${feed.name}: ${healthStatus}`);
  console.log(`  IOCs: ${feed.iocCount}`);
  console.log(`  Errors: ${feed.errorCount}`);
  if (feed.lastError) {
    console.log(`  Last error: ${feed.lastError}`);
  }
});
```

---

## 9. Automated Response Playbooks

### 9.1 Playbook Categories

| Category | Purpose | Example Actions |
|----------|---------|-----------------|
| **Containment** | Stop threat spread | Isolate host, block IP, disable user |
| **Eradication** | Remove threat | Delete malware, clean registry |
| **Recovery** | Restore systems | Restore backup, rebuild system |
| **Investigation** | Gather intelligence | Collect logs, analyze samples |
| **Notification** | Alert stakeholders | Create ticket, send email |
| **Evidence Collection** | Forensics | Memory dump, disk image |
| **Remediation** | Fix vulnerabilities | Patch system, rotate credentials |
| **Validation** | Verify success | Scan system, test connectivity |

### 9.2 Pre-Built Playbooks

```typescript
// Phishing Response Playbook
const phishingPlaybook = {
  id: 'playbook-phishing-001',
  name: 'Phishing Incident Response',
  threatTypes: ['phishing', 'credential-theft'],
  severity: [ThreatSeverity.HIGH, ThreatSeverity.MEDIUM],
  actions: [
    { name: 'Block sender domain', category: 'containment' },
    { name: 'Quarantine emails', category: 'containment' },
    { name: 'Reset affected passwords', category: 'remediation' },
    { name: 'Scan for credential use', category: 'investigation' },
    { name: 'Notify affected users', category: 'notification' },
    { name: 'Update email filters', category: 'eradication' }
  ]
};

// Malware Response Playbook
const malwarePlaybook = {
  id: 'playbook-malware-001',
  name: 'Malware Incident Response',
  threatTypes: ['malware', 'trojan', 'backdoor'],
  severity: [ThreatSeverity.CRITICAL, ThreatSeverity.HIGH],
  actions: [
    { name: 'Isolate infected host', category: 'containment' },
    { name: 'Block C2 communications', category: 'containment' },
    { name: 'Collect memory dump', category: 'evidence' },
    { name: 'Analyze malware sample', category: 'investigation' },
    { name: 'Clean infected systems', category: 'eradication' },
    { name: 'Scan lateral movement', category: 'investigation' },
    { name: 'Update AV signatures', category: 'remediation' }
  ]
};

// Data Exfiltration Response Playbook
const exfilPlaybook = {
  id: 'playbook-exfil-001',
  name: 'Data Exfiltration Response',
  threatTypes: ['data-theft', 'insider-threat', 'exfiltration'],
  severity: [ThreatSeverity.CRITICAL],
  actions: [
    { name: 'Block egress to destination', category: 'containment' },
    { name: 'Disable suspect user', category: 'containment' },
    { name: 'Preserve network logs', category: 'evidence' },
    { name: 'Identify data accessed', category: 'investigation' },
    { name: 'Assess data sensitivity', category: 'investigation' },
    { name: 'Legal/compliance notification', category: 'notification' }
  ]
};
```

### 9.3 Conditional Actions

```typescript
// Playbook with conditional actions
const conditionalPlaybook = {
  id: 'playbook-conditional-001',
  name: 'Adaptive Response Playbook',
  actions: [
    {
      id: 'action-001',
      name: 'Check Asset Criticality',
      conditions: [] // Always execute
    },
    {
      id: 'action-002',
      name: 'Full Isolation (Critical Assets)',
      conditions: [
        { field: 'assetCriticality', operator: 'equals', value: 'critical' }
      ]
    },
    {
      id: 'action-003',
      name: 'Partial Isolation (Non-Critical)',
      conditions: [
        { field: 'assetCriticality', operator: 'not_equals', value: 'critical' }
      ]
    },
    {
      id: 'action-004',
      name: 'Executive Notification',
      conditions: [
        { field: 'affectedUsers', operator: 'greater_than', value: 100 }
      ]
    }
  ]
};
```

---

## 10. Metrics and Reporting

### 10.1 SOC Metrics Generation

```typescript
// Generate SOC metrics for a time period
const metrics = soc.generateMetrics({
  start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
  end: new Date()
});

console.log('SOC Performance Metrics (Last 7 Days):');
console.log('========================================');

// Key Performance Indicators
console.log('\nKey Performance Indicators:');
console.log(`  MTTD (Mean Time to Detect): ${metrics.mttd.toFixed(2)} minutes`);
console.log(`  MTTR (Mean Time to Respond): ${metrics.mttr.toFixed(2)} minutes`);
console.log(`  MTTC (Mean Time to Contain): ${metrics.mttc.toFixed(2)} minutes`);
console.log(`  False Positive Rate: ${metrics.falsePositiveRate.toFixed(1)}%`);

// Alert Volume
console.log('\nAlert Volume:');
console.log(`  Total Alerts: ${metrics.alertVolume.total}`);
console.log(`  By Severity:`);
Object.entries(metrics.alertVolume.bySeverity).forEach(([severity, count]) => {
  console.log(`    ${severity}: ${count}`);
});
console.log(`  Average per Hour: ${metrics.alertVolume.avgPerHour.toFixed(1)}`);

// Case Metrics
console.log('\nCase Metrics:');
console.log(`  Total Cases: ${metrics.caseMetrics.total}`);
console.log(`  Open: ${metrics.caseMetrics.open}`);
console.log(`  Closed: ${metrics.caseMetrics.closed}`);
console.log(`  Escalated: ${metrics.caseMetrics.escalated}`);
console.log(`  By Priority:`);
Object.entries(metrics.caseMetrics.byPriority).forEach(([priority, count]) => {
  console.log(`    ${priority}: ${count}`);
});

// SLA Compliance
console.log('\nSLA Compliance:');
console.log(`  Total Tracked: ${metrics.slaMetrics.totalTracked}`);
console.log(`  Response Compliance: ${metrics.slaMetrics.responseCompliance.toFixed(1)}%`);
console.log(`  Resolution Compliance: ${metrics.slaMetrics.resolutionCompliance.toFixed(1)}%`);
console.log(`  Breaches by Severity:`);
Object.entries(metrics.slaMetrics.breachesBySeverity).forEach(([severity, count]) => {
  console.log(`    ${severity}: ${count}`);
});
```

### 10.2 Analyst Performance

```typescript
// Analyst performance metrics
console.log('\nAnalyst Performance:');
Object.entries(metrics.analystMetrics).forEach(([analystId, perf]) => {
  console.log(`\n  ${analystId}:`);
  console.log(`    Cases Handled: ${perf.casesHandled}`);
  console.log(`    Avg Resolution Time: ${perf.avgResolutionTime} minutes`);
  console.log(`    False Positive Rate: ${perf.falsePositiveRate}%`);
  console.log(`    Escalation Rate: ${perf.escalationRate}%`);
  console.log(`    SLA Compliance: ${perf.slaCompliance}%`);
});
```

### 10.3 Trend Analysis

```typescript
// Analyze trends over time
console.log('\nTrend Data (Hourly):');
metrics.trendData.forEach(point => {
  console.log(`  ${point.timestamp.toISOString()}`);
  console.log(`    Alerts: ${point.alertCount}`);
  console.log(`    Cases: ${point.caseCount}`);
  console.log(`    MTTR: ${point.mttr}`);
  console.log(`    SLA Compliance: ${point.slaCompliance}%`);
});
```

### 10.4 Event Listeners for Real-Time Reporting

```typescript
// Set up event listeners for real-time metrics
soc.on('alert:ingested', (alert) => {
  updateDashboard('newAlert', alert);
});

soc.on('alert:triaged', ({ alert, triageScore }) => {
  updateDashboard('alertTriaged', { alert, triageScore });
});

soc.on('case:created', (socCase) => {
  updateDashboard('newCase', socCase);
  notifyTeam(`New case created: ${socCase.title}`);
});

soc.on('case:escalated', ({ case: socCase, escalateTo, reason }) => {
  updateDashboard('caseEscalated', socCase);
  notifyManagement(`Case ${socCase.id} escalated to ${escalateTo}: ${reason}`);
});

soc.on('sla:response_breached', ({ id, sla }) => {
  updateDashboard('slaBreach', { id, sla, type: 'response' });
});

soc.on('sla:resolution_breached', ({ id, sla }) => {
  updateDashboard('slaBreach', { id, sla, type: 'resolution' });
});

soc.on('shift:handoff', ({ outgoing, incoming, openCases, pendingAlerts }) => {
  generateShiftReport(outgoing);
  notifyTeam(`Shift handoff complete: ${openCases} cases, ${pendingAlerts} alerts transferred`);
});
```

---

## 11. Best Practices

### 11.1 Alert Management

1. **Prioritize by Triage Score**: Always address alerts with the highest triage scores first
2. **Use ML Scoring**: Enable ML scoring to improve prioritization accuracy over time
3. **Document False Positives**: Mark false positives to improve detection tuning
4. **Correlate Related Alerts**: Group related alerts into cases for efficient handling

```typescript
// Best practice: Auto-correlate alerts
async function correlateAlerts(newAlert) {
  const recentAlerts = soc.getAlerts({
    dateRange: {
      start: new Date(Date.now() - 60 * 60 * 1000),
      end: new Date()
    },
    status: ['new', 'triaged']
  });

  const related = recentAlerts.filter(a =>
    a.affectedAssets.some(asset => newAlert.affectedAssets.includes(asset)) ||
    a.indicators.some(i => newAlert.indicators.some(ni => ni.value === i.value))
  );

  if (related.length > 2) {
    // Create case for correlated alerts
    await soc.createCase({
      title: `Correlated Activity: ${newAlert.title}`,
      relatedAlerts: [newAlert.id, ...related.map(a => a.id)],
      priority: 'P2'
    }, 'system');
  }
}
```

### 11.2 Case Management

1. **Assign Based on Skills**: Match cases to analysts with relevant expertise
2. **Document Thoroughly**: Add timeline entries for all significant actions
3. **Track Evidence Chain**: Maintain chain of custody for all evidence
4. **Review Before Closing**: Ensure all actions are completed before closure

```typescript
// Best practice: Case assignment based on skills
function assignCaseBySkills(caseData) {
  const availableAnalysts = soc.getAvailableAnalysts();

  const skillMap = {
    'ransomware': ['malware-analysis', 'forensics'],
    'phishing': ['email-security', 'phishing'],
    'insider-threat': ['user-behavior', 'dlp'],
    'apt': ['threat-hunting', 'forensics', 'malware-analysis']
  };

  const requiredSkills = skillMap[caseData.threatType] || [];

  const scoredAnalysts = availableAnalysts.map(analyst => ({
    analyst,
    score: requiredSkills.filter(skill =>
      analyst.skills.includes(skill)
    ).length
  }));

  scoredAnalysts.sort((a, b) => b.score - a.score);

  return scoredAnalysts[0]?.analyst;
}
```

### 11.3 Playbook Design

1. **Start with Containment**: Always contain threats before investigation
2. **Include Rollback Actions**: Design for reversibility when possible
3. **Set Appropriate Timeouts**: Balance speed with reliability
4. **Require Approval for High Impact**: Protect against automation errors

```typescript
// Best practice: Playbook with safeguards
const safePlaybook = {
  actions: [
    {
      name: 'Verify Threat Confidence',
      category: 'validation',
      conditions: [
        { field: 'mlScore', operator: 'greater_than', value: 0.8 }
      ]
    },
    {
      name: 'Isolate Host',
      category: 'containment',
      requiresApproval: true, // Require approval for containment
      rollbackEnabled: true,
      timeout: 300000,
      retryCount: 2
    },
    {
      name: 'Verify Isolation',
      category: 'validation',
      dependencies: ['Isolate Host']
    }
  ]
};
```

### 11.4 Shift Handoff

1. **Document Everything**: Include all open items in handoff notes
2. **Highlight Urgencies**: Call out time-sensitive items clearly
3. **Transfer Knowledge**: Share context that isn't in tickets
4. **Verify Receipt**: Confirm incoming shift has received handoff

```typescript
// Best practice: Structured handoff template
function generateHandoffNotes(shiftMetrics, openCases, pendingAlerts) {
  return `
SHIFT HANDOFF - ${new Date().toISOString()}

SHIFT METRICS:
- Alerts Processed: ${shiftMetrics.alertsProcessed}
- Cases Opened: ${shiftMetrics.casesOpened}
- Cases Closed: ${shiftMetrics.casesClosed}
- SLA Breaches: ${shiftMetrics.slaBreaches}

ACTIVE CASES (by priority):
${openCases.map(c => `- [${c.priority}] ${c.id}: ${c.title}`).join('\n')}

PENDING ALERTS (top 5):
${pendingAlerts.slice(0, 5).map(a =>
  `- [${a.severity}] ${a.id}: ${a.title}`
).join('\n')}

IMPORTANT CONTEXT:
[Add shift-specific notes here]

ACTION ITEMS:
[Add urgent items for next shift]
  `;
}
```

### 11.5 SLA Management

1. **Set Realistic SLAs**: Base on historical performance data
2. **Monitor Proactively**: Alert before breaches, not after
3. **Escalate Early**: Don't wait for breaches to escalate
4. **Review Regularly**: Adjust SLAs based on team capacity

---

## 12. Troubleshooting

### 12.1 Common Issues

#### Alert Ingestion Failures

```typescript
// Problem: Alerts not being ingested
// Solution: Check event listeners and logging

soc.on('alert:ingested', (alert) => {
  console.log(`Alert ingested successfully: ${alert.id}`);
});

// Enable debug logging
process.env.SOC_DEBUG = 'true';

// Verify alert data structure
try {
  const alert = await soc.ingestAlert({
    severity: 'high',
    title: 'Test Alert',
    description: 'Testing ingestion',
    source: 'test',
    sourceType: 'manual',
    indicators: [],
    affectedAssets: [],
    tags: []
  });
} catch (error) {
  console.error('Ingestion error:', error.message);
}
```

#### SLA Tracking Issues

```typescript
// Problem: SLA not tracking properly
// Solution: Verify SLA configuration and alert severity mapping

// Check if SLA is being tracked
const slaStatus = soc.trackSLA('ALT-123');
if (!slaStatus) {
  console.log('SLA not initialized - check severity configuration');

  // Verify severity has SLA config
  const config = soc.config.slaConfigs.find(c => c.severity === 'high');
  console.log('SLA config for high severity:', config);
}
```

#### Playbook Execution Failures

```typescript
// Problem: Playbook actions failing
// Solution: Check integration health and action configuration

soar.on('playbook:execution_started', ({ executionId }) => {
  console.log(`Execution started: ${executionId}`);
});

soar.on('containment:executing', ({ action }) => {
  console.log(`Executing containment: ${action.type} on ${action.target}`);
});

soar.on('integration:unhealthy', ({ system, health }) => {
  console.log(`ALERT: Integration ${system} unhealthy!`);
  console.log(`  Status: ${health.status}`);
  console.log(`  Error count: ${health.errorCount}`);
});

// Check integration health before execution
const health = await soar.checkHealth();
health.forEach((status, system) => {
  if (status.status !== 'healthy') {
    console.warn(`Integration ${system} is ${status.status}`);
  }
});
```

### 12.2 Performance Optimization

```typescript
// Optimize alert queries for large datasets
const recentCritical = soc.getAlerts({
  severity: ['critical'],
  status: ['new', 'triaged'],
  dateRange: {
    start: new Date(Date.now() - 24 * 60 * 60 * 1000),
    end: new Date()
  },
  limit: 100 // Always use limits
});

// Use metrics caching
const metrics = soc.generateMetrics(); // Cached for 1 minute
```

### 12.3 Integration Debugging

```typescript
// Debug integration issues
soar.integrateSystem({
  system: IntegrationSystem.EDR_CROWDSTRIKE,
  name: 'CrowdStrike Falcon',
  baseUrl: process.env.CROWDSTRIKE_URL,
  timeout: 30000,
  retryCount: 3,
  enabled: true,
  healthStatus: 'unknown'
});

// Force health check
const health = await soar.checkHealth();
const csHealth = health.get(IntegrationSystem.EDR_CROWDSTRIKE);

if (csHealth?.status !== 'healthy') {
  console.log('CrowdStrike integration issues:');
  console.log(`  Status: ${csHealth?.status}`);
  console.log(`  Latency: ${csHealth?.latency}ms`);
  console.log(`  Error count: ${csHealth?.errorCount}`);
  console.log(`  Success rate: ${csHealth?.successRate}%`);
}
```

### 12.4 Event Debugging

```typescript
// Comprehensive event logging for debugging
const eventTypes = [
  'alert:ingested', 'alert:triaged',
  'case:created', 'case:assigned', 'case:escalated',
  'sla:response_breached', 'sla:resolution_breached',
  'playbook:execution_started', 'playbook:execution_completed',
  'containment:executing', 'containment:executed',
  'remediation:awaiting_approval', 'remediation:approved',
  'integration:unhealthy'
];

eventTypes.forEach(eventType => {
  soc.on(eventType, (data) => {
    console.log(`[${new Date().toISOString()}] ${eventType}:`, JSON.stringify(data, null, 2));
  });
});
```

### 12.5 Recovery Procedures

```typescript
// Recover from stuck playbook execution
async function recoverStuckExecution(executionId) {
  // 1. Check execution status
  const execution = soar.executions.get(executionId);

  if (!execution) {
    console.log('Execution not found');
    return;
  }

  // 2. If stuck, attempt rollback
  if (execution.status === 'running' && execution.rollbackAvailable) {
    try {
      await soar.rollbackAction({
        executionId,
        reason: 'Recovery from stuck execution',
        requestedBy: 'system-recovery',
        approvalRequired: false
      });
      console.log('Rollback successful');
    } catch (error) {
      console.error('Rollback failed:', error.message);
    }
  }

  // 3. Clean up active playbooks set
  soar.activePlaybooks.delete(executionId);

  // 4. Update execution status
  execution.status = 'cancelled';
  execution.completedAt = new Date();

  console.log(`Execution ${executionId} recovered`);
}
```

---

## Appendix A: Quick Reference

### Alert Severity Levels

| Level | Response Time | Resolution Time | Auto-Contain |
|-------|---------------|-----------------|--------------|
| Critical | 15 min | 60 min | Yes |
| High | 30 min | 4 hours | Optional |
| Medium | 2 hours | 8 hours | No |
| Low | 8 hours | 24 hours | No |
| Info | 24 hours | 48 hours | No |

### Case Priorities

| Priority | Description | SLA |
|----------|-------------|-----|
| P1 | Critical business impact | 4 hours |
| P2 | Significant impact | 8 hours |
| P3 | Moderate impact | 24 hours |
| P4 | Low impact | 72 hours |

### Key Events

| Event | Description |
|-------|-------------|
| `alert:ingested` | New alert received |
| `alert:triaged` | Alert triage completed |
| `case:created` | New case opened |
| `case:escalated` | Case escalated |
| `sla:response_breached` | Response SLA missed |
| `sla:resolution_breached` | Resolution SLA missed |
| `playbook:execution_completed` | Playbook finished |
| `containment:executed` | Containment action applied |
| `shift:handoff` | Shift handoff completed |

---

## Appendix B: File Locations

| Component | Path |
|-----------|------|
| SOCOperationsCenter | `/src/soc/SOCOperationsCenter.ts` |
| ThreatIntelligencePlatform | `/src/soc/ThreatIntelligencePlatform.ts` |
| SecurityOrchestrationHub | `/src/soc/SecurityOrchestrationHub.ts` |

---

**Document Version**: 1.0.0
**Last Updated**: November 2025
**Author**: Security Operations Team
