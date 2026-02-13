# Advanced Forensics Guide - Week 23

## Enterprise Digital Forensics and Incident Response Platform

This guide covers the comprehensive digital forensics capabilities integrated into the workflow automation platform, providing enterprise-grade incident response, evidence collection, and attack reconstruction.

---

## Table of Contents

1. [Overview](#1-overview)
2. [ForensicsEngine Usage](#2-forensicsengine-usage)
3. [EvidenceCollector Usage](#3-evidencecollector-usage)
4. [IncidentReconstructor Usage](#4-incidentreconstructor-usage)
5. [MITRE ATT&CK Integration](#5-mitre-attck-integration)
6. [Evidence Chain of Custody](#6-evidence-chain-of-custody)
7. [Live Response Procedures](#7-live-response-procedures)
8. [Report Generation for Legal](#8-report-generation-for-legal)
9. [Best Practices](#9-best-practices)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Overview

### 1.1 Platform Capabilities

The forensics platform provides comprehensive digital forensics and incident response (DFIR) capabilities:

```
+------------------------------------------------------------------+
|                    FORENSICS PLATFORM ARCHITECTURE                 |
+------------------------------------------------------------------+
|                                                                    |
|  +----------------+    +------------------+    +-----------------+ |
|  | ForensicsEngine|    | EvidenceCollector|    |IncidentRecon-   | |
|  |                |    |                  |    |structor         | |
|  | - Memory       |    | - Endpoint       |    | - Timeline      | |
|  | - Disk         |    | - Cloud          |    | - Kill Chain    | |
|  | - Network      |    | - Legal Hold     |    | - Attack Graph  | |
|  | - Cloud        |    | - Preservation   |    | - Root Cause    | |
|  +----------------+    +------------------+    +-----------------+ |
|         |                      |                      |           |
|         +----------------------+----------------------+           |
|                                |                                  |
|                    +-----------------------+                      |
|                    |   MITRE ATT&CK DB     |                      |
|                    |   14+ Techniques      |                      |
|                    |   Known Threat Actors |                      |
|                    +-----------------------+                      |
|                                |                                  |
|                    +-----------------------+                      |
|                    |   Evidence Storage    |                      |
|                    |   - Local/S3/Azure/GCS|                      |
|                    |   - Encrypted         |                      |
|                    |   - Chain of Custody  |                      |
|                    +-----------------------+                      |
+------------------------------------------------------------------+
```

### 1.2 Key Features

| Feature | Description |
|---------|-------------|
| Memory Analysis | Volatility-style memory forensics with process, injection, and network detection |
| Disk Forensics | File system analysis, deleted file recovery, artifact extraction |
| Network Forensics | PCAP analysis, session reconstruction, anomaly detection |
| Cloud Forensics | AWS, Azure, GCP evidence collection and analysis |
| MITRE ATT&CK | Full kill chain mapping with 14+ phases and 15+ techniques |
| Chain of Custody | Cryptographic integrity verification and audit trail |
| Live Response | Real-time endpoint data collection |
| Legal Reporting | Court-admissible evidence packages |

### 1.3 Getting Started

```typescript
import { ForensicsEngine } from '@/forensics/ForensicsEngine';
import { EvidenceCollector } from '@/forensics/EvidenceCollector';
import { IncidentReconstructor } from '@/forensics/IncidentReconstructor';

// Initialize forensics components
const forensics = ForensicsEngine.getInstance({
  enableMemoryAnalysis: true,
  enableDiskForensics: true,
  enableNetworkForensics: true,
  enableCloudForensics: true,
  mitreAttackVersion: '14.0',
  encryptEvidence: true,
  enableChainOfCustody: true
});

await forensics.initialize();

// Initialize evidence collector
const collector = EvidenceCollector.getInstance({
  storage: {
    backend: 's3',
    s3Config: {
      bucket: 'forensics-evidence',
      region: 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
    }
  },
  defaultHashAlgorithms: ['sha256', 'md5'],
  maxConcurrentJobs: 5,
  retentionDays: 365,
  enableAuditLog: true
});

await collector.initialize();

// Initialize incident reconstructor
const reconstructor = IncidentReconstructor.getInstance({
  enableAutomaticCorrelation: true,
  correlationTimeWindowMs: 300000, // 5 minutes
  enableThreatIntelEnrichment: true,
  confidenceThreshold: 0.6
});

await reconstructor.initialize();
```

---

## 2. ForensicsEngine Usage

### 2.1 Memory Analysis

Memory forensics enables detection of malicious activity that only exists in RAM:

```typescript
// Analyze a memory dump
const memoryResult = await forensics.analyzeMemory(
  '/evidence/memory.dmp',
  'CASE-2025-001',
  {
    profile: 'Win10x64',        // Memory profile
    analyzeProcesses: true,     // Extract process list
    detectInjection: true       // Detect code injection
  }
);

// Review findings
console.log('Processes found:', memoryResult.processes.length);
console.log('Network connections:', memoryResult.networkConnections.length);
console.log('Code injections:', memoryResult.injectedCode.length);

// Check for suspicious processes
for (const process of memoryResult.processes) {
  if (process.suspicious) {
    console.log(`ALERT: Suspicious process detected`);
    console.log(`  PID: ${process.pid}`);
    console.log(`  Name: ${process.name}`);
    console.log(`  Path: ${process.path}`);
    console.log(`  Command: ${process.cmdline}`);
    console.log(`  Reasons: ${process.suspicionReasons.join(', ')}`);
  }
}

// Check for code injection
for (const injection of memoryResult.injectedCode) {
  console.log(`Code Injection Detected:`);
  console.log(`  Type: ${injection.type}`);
  console.log(`  Process: ${injection.processName} (PID: ${injection.pid})`);
  console.log(`  Address: ${injection.address}`);
  console.log(`  Detection: ${injection.detectionMethod}`);
}
```

#### Memory Analysis Results Structure

```typescript
interface MemoryAnalysisResult {
  evidenceId: string;
  processes: ProcessInfo[];
  networkConnections: NetworkConnection[];
  injectedCode: InjectedCode[];
  findings: ForensicFinding[];
  timeline: TimelineEvent[];
}

interface ProcessInfo {
  pid: number;
  ppid: number;
  name: string;
  path: string;
  cmdline: string;
  user: string;
  createTime: Date;
  memoryUsage: number;
  suspicious: boolean;
  suspicionReasons: string[];
}

interface InjectedCode {
  pid: number;
  processName: string;
  type: 'dll_injection' | 'process_hollowing' | 'code_injection' | 'hook' | 'shellcode';
  address: string;
  size: number;
  protection: string;
  detectionMethod: string;
}
```

### 2.2 Disk Forensics

Analyze disk images to recover artifacts and deleted files:

```typescript
// Analyze disk image
const diskResult = await forensics.analyzeDisk(
  '/evidence/disk.E01',
  'CASE-2025-001',
  {
    recoverDeleted: true,      // Attempt deleted file recovery
    extractArtifacts: true     // Extract forensic artifacts
  }
);

// File system information
console.log('File System:', diskResult.fileSystem.type);
console.log('Total Size:', diskResult.fileSystem.totalSize);
console.log('Used Space:', diskResult.fileSystem.usedSpace);

// Deleted files recovery
console.log('\nDeleted Files Found:');
for (const file of diskResult.deletedFiles) {
  console.log(`  ${file.name}`);
  console.log(`    Path: ${file.path}`);
  console.log(`    Deleted: ${file.deletedAt}`);
  console.log(`    Recoverable: ${file.recoverable} (${file.recoveryConfidence}%)`);
  if (file.hashes) {
    console.log(`    SHA256: ${file.hashes.sha256}`);
  }
}

// Forensic artifacts
console.log('\nExtracted Artifacts:');
for (const artifact of diskResult.artifacts) {
  console.log(`  [${artifact.type}] ${artifact.name}`);
  console.log(`    Path: ${artifact.path}`);
  console.log(`    Size: ${artifact.size} bytes`);
}
```

### 2.3 Network Forensics

Analyze network captures for malicious activity:

```typescript
// Analyze PCAP file
const networkResult = await forensics.analyzeNetwork(
  '/evidence/capture.pcap',
  'CASE-2025-001',
  {
    detectAnomalies: true     // Enable anomaly detection
  }
);

// Capture information
console.log('Capture Info:');
console.log(`  File: ${networkResult.captureInfo.fileName}`);
console.log(`  Packets: ${networkResult.captureInfo.packetCount}`);
console.log(`  Duration: ${networkResult.captureInfo.duration}s`);

// Network sessions
console.log('\nNetwork Sessions:');
for (const session of networkResult.sessions) {
  console.log(`  ${session.srcIp}:${session.srcPort} -> ${session.dstIp}:${session.dstPort}`);
  console.log(`    Protocol: ${session.protocol}`);
  console.log(`    Bytes In: ${session.bytesIn}, Out: ${session.bytesOut}`);
}

// DNS queries
console.log('\nSuspicious DNS Queries:');
for (const query of networkResult.dnsQueries.filter(q => q.suspicious)) {
  console.log(`  ${query.queryName} (${query.queryType})`);
  console.log(`    Source: ${query.srcIp}`);
  console.log(`    Response: ${query.response?.join(', ')}`);
}

// Network anomalies
console.log('\nNetwork Anomalies:');
for (const anomaly of networkResult.anomalies) {
  console.log(`  [${anomaly.severity.toUpperCase()}] ${anomaly.type}`);
  console.log(`    ${anomaly.description}`);
  console.log(`    Source: ${anomaly.sourceIp}`);
  console.log(`    Evidence: ${anomaly.evidence.join(', ')}`);
}
```

#### Anomaly Types Detected

| Anomaly Type | Description |
|--------------|-------------|
| `beaconing` | Regular C2 communication patterns |
| `data_exfiltration` | Large outbound data transfers |
| `dns_tunneling` | Data hidden in DNS queries |
| `port_scan` | Network reconnaissance activity |
| `c2_communication` | Command and control traffic |

### 2.4 Artifact Extraction

Extract specific forensic artifacts:

```typescript
// Extract specific artifact types
const artifacts = await forensics.extractArtifacts(
  '/evidence/disk.E01',
  'CASE-2025-001',
  ['registry', 'logs', 'browser', 'email']
);

// Process extracted artifacts
for (const artifact of artifacts) {
  console.log(`Artifact: ${artifact.name}`);
  console.log(`  Type: ${artifact.type}`);
  console.log(`  Path: ${artifact.path}`);
  console.log(`  Hash: ${artifact.hashes.sha256}`);

  // Parse artifact content if available
  if (artifact.content && artifact.type === 'registry') {
    console.log(`  Registry Values:`, artifact.content);
  }
}
```

### 2.5 IOC Extraction and Enrichment

Extract and enrich Indicators of Compromise:

```typescript
// Extract IOCs from case
const iocs = await forensics.extractIOCs('CASE-2025-001', {
  types: ['ip', 'domain', 'url', 'hash'],
  enrich: true    // Enable threat intel enrichment
});

// Review IOCs
console.log(`\nExtracted ${iocs.length} IOCs:\n`);

for (const ioc of iocs) {
  console.log(`[${ioc.type.toUpperCase()}] ${ioc.value}`);
  console.log(`  Confidence: ${ioc.confidence}%`);
  console.log(`  Source: ${ioc.source}`);
  console.log(`  First Seen: ${ioc.firstSeen}`);

  // Enrichment data
  if (ioc.enrichment) {
    console.log(`  Threat Intel:`);
    for (const intel of ioc.enrichment.threatIntel) {
      console.log(`    - ${intel.source}: ${intel.category} (score: ${intel.score})`);
    }
    if (ioc.enrichment.geoLocation) {
      console.log(`  Location: ${ioc.enrichment.geoLocation.city}, ${ioc.enrichment.geoLocation.country}`);
    }
    console.log(`  Reputation: ${ioc.enrichment.reputation}/100`);
    if (ioc.enrichment.malwareFamilies.length > 0) {
      console.log(`  Malware Families: ${ioc.enrichment.malwareFamilies.join(', ')}`);
    }
  }
}
```

### 2.6 YARA Scanning

Scan files and memory with YARA rules:

```typescript
// Get built-in YARA rules
const builtInRules = forensics.getBuiltInYaraRules();
console.log(`Available YARA rules: ${builtInRules.length}`);

// Custom YARA rule
const customRule = {
  id: 'YARA_CUSTOM_001',
  name: 'Custom_Malware_Detector',
  description: 'Detects specific malware variant',
  author: 'Security Team',
  tags: ['malware', 'custom'],
  strings: [
    { identifier: '$str1', value: 'malicious_function', type: 'text' as const },
    { identifier: '$hex1', value: '4D 5A 90 00', type: 'hex' as const }
  ],
  condition: 'all of them'
};

// Scan with YARA
const matches = await forensics.scanWithYara(
  '/evidence/suspicious_file.exe',
  [...builtInRules, customRule]
);

// Process matches
for (const match of matches) {
  console.log(`\nYARA Match: ${match.ruleName}`);
  console.log(`  Rule ID: ${match.ruleId}`);
  console.log(`  Offset: 0x${match.offset.toString(16)}`);
  console.log(`  Matched Strings:`);
  for (const str of match.matchedStrings) {
    console.log(`    ${str.identifier} at 0x${str.offset.toString(16)}: ${str.data}`);
  }
}
```

### 2.7 Sandbox Analysis

Submit suspicious files to sandbox:

```typescript
// Submit file to sandbox
const submission = await forensics.submitToSandbox(
  '/evidence/malware_sample.exe',
  {
    environment: 'win10-x64',
    timeout: 300  // 5 minutes
  }
);

console.log(`Submission ID: ${submission.id}`);
console.log(`Status: ${submission.status}`);

// Poll for results (in production, use webhooks)
const checkResult = async () => {
  const updated = forensics.getSandboxSubmission(submission.id);
  if (updated?.status === 'completed' && updated.result) {
    const result = updated.result;

    console.log(`\nSandbox Analysis Complete:`);
    console.log(`  Score: ${result.score}/100`);
    console.log(`  Verdict: ${result.verdict}`);

    if (result.malwareFamilies.length > 0) {
      console.log(`  Malware Families: ${result.malwareFamilies.join(', ')}`);
    }

    console.log(`\nBehavioral Signatures:`);
    for (const sig of result.signatures) {
      console.log(`  [${sig.severity}] ${sig.name} (${sig.category})`);
    }

    console.log(`\nNetwork Activity:`);
    for (const activity of result.networkActivity) {
      console.log(`  ${activity.type}: ${activity.destination}:${activity.port}`);
    }

    console.log(`\nFile Activity:`);
    for (const file of result.fileActivity) {
      console.log(`  ${file.action}: ${file.path}`);
    }

    console.log(`\nDropped Files:`);
    for (const dropped of result.droppedFiles) {
      console.log(`  ${dropped.name} (malicious: ${dropped.malicious})`);
      console.log(`    SHA256: ${dropped.hashes.sha256}`);
    }

    console.log(`\nMITRE ATT&CK Techniques:`);
    for (const technique of result.mitreAttack) {
      console.log(`  ${technique.id}: ${technique.name} (${technique.tactic})`);
    }
  }
};
```

### 2.8 Threat Actor Attribution

Attempt to attribute attacks to known threat actors:

```typescript
// Perform threat actor attribution
const attribution = await forensics.attributeThreatActor('CASE-2025-001');

console.log(`\nThreat Actor Attribution:`);
console.log(attribution.assessment);

if (attribution.possibleActors.length > 0) {
  console.log(`\nPossible Threat Actors:`);
  for (const match of attribution.possibleActors) {
    console.log(`\n  ${match.actor.name} (${match.actor.aliases.join(', ')})`);
    console.log(`    Confidence: ${match.confidence.toFixed(1)}%`);
    console.log(`    Attribution: ${match.actor.country}`);
    console.log(`    Motivation: ${match.actor.motivation}`);
    console.log(`    Sophistication: ${match.actor.sophistication}`);
    console.log(`    Target Sectors: ${match.actor.targetSectors.join(', ')}`);
    console.log(`    Matching Techniques: ${match.matchingTechniques.join(', ')}`);
  }
}
```

---

## 3. EvidenceCollector Usage

### 3.1 Endpoint Collection

Collect evidence from endpoints:

```typescript
// Define evidence source
const endpointSource: EvidenceSource = {
  id: 'workstation-001',
  type: 'endpoint',
  name: 'Compromised Workstation',
  hostname: 'ws001.company.com',
  ipAddress: '192.168.1.100',
  credentials: {
    type: 'ssh',
    username: 'forensics',
    privateKey: fs.readFileSync('/path/to/key').toString()
  }
};

// Collect evidence
const result = await collector.collectFromEndpoint(
  'CASE-2025-001',
  endpointSource,
  ['disk_image', 'memory_dump', 'log_file', 'registry'],
  {
    writeBlocking: true,        // Enable write blocking
    verifyHashes: true,         // Verify hash integrity
    hashAlgorithms: ['sha256', 'md5'],
    compression: true,          // Compress evidence
    encryption: true,           // Encrypt evidence
    minimalFootprint: true,     // Minimize system impact
    preserveTimestamps: true,   // Preserve file timestamps
    collectDeleted: true        // Collect deleted files
  }
);

// Check collection status
console.log(`Collection Status: ${result.status}`);
console.log(`Duration: ${result.duration}ms`);
console.log(`Bytes Collected: ${result.bytesCollected}`);
console.log(`Items Collected: ${result.evidenceItems.length}`);

// Review collected evidence
for (const item of result.evidenceItems) {
  console.log(`\nEvidence: ${item.name}`);
  console.log(`  Type: ${item.type}`);
  console.log(`  Size: ${item.size} bytes`);
  console.log(`  SHA256: ${item.hashes.sha256}`);
  console.log(`  Storage: ${item.storageBackend}://${item.storagePath}`);
}

// Handle errors
if (result.errors.length > 0) {
  console.log('\nCollection Errors:');
  for (const error of result.errors) {
    console.log(`  [${error.code}] ${error.message}`);
    console.log(`    Recoverable: ${error.recoverable}`);
  }
}
```

### 3.2 Cloud Collection

Collect evidence from cloud providers:

```typescript
// AWS Collection
const awsResult = await collector.collectFromCloud(
  'CASE-2025-001',
  {
    provider: 'aws',
    region: 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    },
    resourceTypes: [
      'ec2_instance',
      'ebs_volume',
      's3_bucket',
      'cloudtrail_logs',
      'vpc_flow_logs'
    ],
    includeSnapshots: true,
    includeLogs: true,
    timeRange: {
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
      end: new Date()
    }
  }
);

// Azure Collection
const azureResult = await collector.collectFromCloud(
  'CASE-2025-001',
  {
    provider: 'azure',
    region: 'eastus',
    credentials: {
      tenantId: process.env.AZURE_TENANT_ID,
      clientId: process.env.AZURE_CLIENT_ID,
      clientSecret: process.env.AZURE_CLIENT_SECRET
    },
    resourceTypes: [
      'azure_vm',
      'azure_disk',
      'azure_blob',
      'azure_activity_logs'
    ],
    includeSnapshots: true,
    includeLogs: true
  }
);

// GCP Collection
const gcpResult = await collector.collectFromCloud(
  'CASE-2025-001',
  {
    provider: 'gcp',
    region: 'us-central1',
    credentials: {
      projectId: process.env.GCP_PROJECT_ID,
      serviceAccountKey: fs.readFileSync('/path/to/sa-key.json').toString()
    },
    resourceTypes: [
      'gce_instance',
      'gce_disk',
      'gcs_bucket',
      'stackdriver_logs'
    ],
    includeSnapshots: true,
    includeLogs: true
  }
);
```

### 3.3 Scheduled Collection

Set up recurring evidence collection:

```typescript
// Schedule automated collection
const scheduledJob = await collector.scheduleCollection(
  'CASE-2025-001',
  'Daily Log Collection',
  [
    {
      id: 'server-001',
      type: 'server',
      name: 'Production Server',
      hostname: 'prod.company.com',
      credentials: { type: 'ssh', username: 'forensics', privateKey: '...' }
    }
  ],
  ['log_file', 'process_list'],
  {
    enabled: true,
    cronExpression: '0 2 * * *',  // Daily at 2 AM
    timezone: 'UTC',
    maxRuns: 30  // Stop after 30 days
  }
);

console.log(`Scheduled Job: ${scheduledJob.id}`);
console.log(`Next Run: ${scheduledJob.schedule?.nextRunAt}`);

// Execute job manually
const executedJob = await collector.executeJob(scheduledJob.id);
console.log(`Execution Status: ${executedJob.status}`);

// Monitor progress
const progress = collector.getCollectionStatus(scheduledJob.id);
if (progress) {
  console.log(`Progress: ${progress.percentComplete}%`);
  console.log(`Current: ${progress.currentItem}`);
  console.log(`Elapsed: ${progress.elapsedMs}ms`);
}

// Cancel if needed
await collector.cancelJob(scheduledJob.id);
```

### 3.4 Evidence Preservation

Preserve evidence with integrity protection:

```typescript
// Preserve evidence with full protection
const preserved = await collector.preserveEvidence(evidenceId, {
  writeBlock: true,           // Apply write blocking
  compress: true,             // Compress for storage
  encrypt: true,              // Encrypt evidence
  encryptionKey: process.env.EVIDENCE_ENCRYPTION_KEY,
  targetStorage: 's3',        // Move to S3
  targetPath: 'preserved/case-001'
});

console.log(`Evidence Preserved:`);
console.log(`  ID: ${preserved.id}`);
console.log(`  Storage: ${preserved.storageBackend}://${preserved.storagePath}`);
console.log(`  Verified: ${preserved.verified}`);
```

### 3.5 Hash Verification

Verify evidence integrity:

```typescript
// Generate hashes
const hashes = await collector.hashEvidence(evidenceId, ['sha256', 'md5', 'sha1']);
console.log(`Evidence Hashes:`);
console.log(`  MD5: ${hashes.md5}`);
console.log(`  SHA1: ${hashes.sha1}`);
console.log(`  SHA256: ${hashes.sha256}`);
console.log(`  Verified At: ${hashes.verifiedAt}`);

// Verify integrity
const verification = await collector.verifyEvidence(evidenceId);
console.log(`\nIntegrity Verification:`);
console.log(`  Valid: ${verification.valid}`);
console.log(`  Original Hash: ${verification.originalHash}`);
console.log(`  Current Hash: ${verification.currentHash}`);
console.log(`  Algorithm: ${verification.algorithm}`);

if (!verification.valid) {
  console.error('WARNING: Evidence has been modified!');
}
```

---

## 4. IncidentReconstructor Usage

### 4.1 Timeline Reconstruction

Build an incident timeline from security events:

```typescript
// Security events from SIEM/EDR
const securityEvents: SecurityEvent[] = [
  {
    id: 'evt-001',
    timestamp: new Date('2025-01-15T10:00:00Z'),
    sourceSystem: 'EDR',
    eventType: 'ProcessCreate',
    severity: 'high',
    sourceHost: 'workstation-001',
    sourceUser: 'DOMAIN\\jsmith',
    processName: 'powershell.exe',
    processId: 7832,
    parentProcessId: 1248,
    commandLine: 'powershell.exe -encodedCommand JABzAD0...',
    outcome: 'success',
    rawData: {},
    tags: ['powershell', 'encoded'],
    indicators: ['suspicious_cmdline']
  },
  {
    id: 'evt-002',
    timestamp: new Date('2025-01-15T10:05:00Z'),
    sourceSystem: 'Network',
    eventType: 'Connection',
    severity: 'high',
    sourceHost: 'workstation-001',
    sourceIp: '192.168.1.100',
    destinationIp: '185.220.101.45',
    networkPort: 443,
    protocol: 'TCP',
    outcome: 'success',
    rawData: {},
    tags: ['c2'],
    indicators: ['known_bad_ip']
  },
  // ... more events
];

// Reconstruct timeline
const timeline = await reconstructor.reconstructTimeline(
  'CASE-2025-001',
  securityEvents,
  {
    startTime: new Date('2025-01-15T00:00:00Z'),
    endTime: new Date('2025-01-16T00:00:00Z'),
    correlate: true,           // Correlate related events
    enrichTechniques: true     // Map to MITRE ATT&CK
  }
);

// Display timeline
console.log(`\nIncident Timeline (${timeline.length} events):\n`);
for (const event of timeline) {
  console.log(`[${event.timestamp.toISOString()}] ${event.phase.toUpperCase()}`);
  console.log(`  ${event.description}`);
  console.log(`  Severity: ${event.severity}, Confidence: ${(event.confidence * 100).toFixed(0)}%`);
  console.log(`  Assets: ${event.assets.join(', ')}`);
  if (event.techniques.length > 0) {
    console.log(`  MITRE ATT&CK: ${event.techniques.map(t => `${t.id} (${t.name})`).join(', ')}`);
  }
  if (event.indicators.length > 0) {
    console.log(`  IOCs: ${event.indicators.join(', ')}`);
  }
  console.log();
}
```

### 4.2 Lateral Movement Tracking

Track attacker movement through the network:

```typescript
// Track lateral movement
const movements = await reconstructor.trackLateralMovement(
  'CASE-2025-001',
  securityEvents,
  {
    detectMethods: true,      // Detect movement methods
    mapCredentials: true      // Map credential usage
  }
);

console.log(`\nLateral Movement Analysis (${movements.length} movements):\n`);
for (const movement of movements) {
  console.log(`[${movement.timestamp.toISOString()}]`);
  console.log(`  From: ${movement.sourceAsset.hostname || movement.sourceAsset.ipAddress}`);
  console.log(`  To: ${movement.destinationAsset.hostname || movement.destinationAsset.ipAddress}`);
  console.log(`  Method: ${movement.method}`);
  console.log(`  Success: ${movement.success}`);
  console.log(`  Confidence: ${(movement.confidence * 100).toFixed(0)}%`);

  if (movement.credentialsUsed) {
    console.log(`  Credentials:`);
    console.log(`    Account: ${movement.credentialsUsed.accountName}`);
    console.log(`    Type: ${movement.credentialsUsed.accountType}`);
    console.log(`    Auth Method: ${movement.credentialsUsed.authMethod}`);
    console.log(`    Privilege: ${movement.credentialsUsed.privilegeLevel}`);
  }

  if (movement.techniques.length > 0) {
    console.log(`  Techniques: ${movement.techniques.map(t => t.id).join(', ')}`);
  }
  console.log();
}
```

#### Movement Methods Detected

| Method | Description |
|--------|-------------|
| `rdp` | Remote Desktop Protocol |
| `ssh` | Secure Shell |
| `smb` | Server Message Block |
| `wmi` | Windows Management Instrumentation |
| `psexec` | PsExec utility |
| `winrm` | Windows Remote Management |
| `pass_the_hash` | Pass-the-Hash attack |
| `pass_the_ticket` | Pass-the-Ticket attack |
| `golden_ticket` | Golden Ticket attack |
| `dcom` | Distributed COM |

### 4.3 Kill Chain Mapping

Map incident to MITRE ATT&CK kill chain:

```typescript
// Map to kill chain
const killChain = await reconstructor.mapToKillChain(
  'CASE-2025-001',
  timeline,
  {
    detectGaps: true,          // Identify visibility gaps
    attributeActor: true       // Attempt attribution
  }
);

console.log(`\nKill Chain Analysis:\n`);
console.log(`Completeness: ${killChain.completeness.toFixed(1)}%`);
console.log(`Attack Vector: ${killChain.attackVector}`);
console.log(`Attack Objective: ${killChain.attackObjective || 'Unknown'}`);
console.log(`Dwell Time: ${Math.round(killChain.dwellTime! / 3600000)} hours`);

console.log(`\nPhases Detected:`);
for (const phase of killChain.phases) {
  const status = phase.detected ? 'DETECTED' : 'GAP';
  console.log(`\n  [${status}] ${phase.phase.replace(/_/g, ' ').toUpperCase()}`);

  if (phase.detected) {
    console.log(`    Start: ${phase.startTime?.toISOString()}`);
    console.log(`    End: ${phase.endTime?.toISOString()}`);
    console.log(`    Confidence: ${(phase.confidence * 100).toFixed(0)}%`);
    console.log(`    Techniques: ${phase.techniques.map(t => t.id).join(', ')}`);
    console.log(`    Events: ${phase.events.length}`);
  }

  if (phase.notes) {
    console.log(`    Note: ${phase.notes}`);
  }
}

// Attribution
if (killChain.attackerProfile) {
  console.log(`\nThreat Actor Attribution:`);
  console.log(`  Name: ${killChain.attackerProfile.name}`);
  console.log(`  Aliases: ${killChain.attackerProfile.aliases.join(', ')}`);
  console.log(`  Motivation: ${killChain.attackerProfile.motivation}`);
  console.log(`  Sophistication: ${killChain.attackerProfile.sophistication}`);
  console.log(`  Confidence: ${(killChain.attackerProfile.confidence * 100).toFixed(0)}%`);
}
```

### 4.4 Root Cause Analysis

Perform root cause analysis:

```typescript
// Define assets
const assets: Asset[] = [
  {
    id: 'ws-001',
    type: 'workstation',
    hostname: 'workstation-001',
    ipAddress: '192.168.1.100',
    criticality: 'medium',
    owner: 'jsmith',
    department: 'Engineering',
    compromisedAt: new Date('2025-01-15T10:00:00Z'),
    services: ['Office', 'Email'],
    vulnerabilities: []
  },
  {
    id: 'dc-001',
    type: 'server',
    hostname: 'domain-controller',
    ipAddress: '192.168.1.10',
    criticality: 'critical',
    services: ['AD', 'DNS', 'LDAP'],
    vulnerabilities: ['CVE-2024-12345']
  }
];

// Perform RCA
const rca = await reconstructor.performRootCauseAnalysis(
  'CASE-2025-001',
  timeline,
  assets,
  {
    depth: 5,
    includeRecommendations: true
  }
);

console.log(`\nRoot Cause Analysis:\n`);
console.log(`Confidence: ${(rca.confidenceLevel * 100).toFixed(0)}%`);

// Entry point
console.log(`\nEntry Point:`);
console.log(`  Type: ${rca.entryPoint.type}`);
console.log(`  Description: ${rca.entryPoint.description}`);
console.log(`  Asset: ${rca.entryPoint.asset.hostname}`);
console.log(`  Timestamp: ${rca.entryPoint.timestamp.toISOString()}`);

// Primary cause
console.log(`\nPrimary Cause:`);
console.log(`  ${rca.primaryCause.description}`);
console.log(`  Category: ${rca.primaryCause.category}`);

// Contributing factors
console.log(`\nContributing Factors:`);
for (const factor of rca.contributingFactors) {
  console.log(`  [${factor.impact.toUpperCase()}] ${factor.description}`);
  console.log(`    Category: ${factor.category}`);
  console.log(`    Remediation: ${factor.remediation}`);
}

// Security gaps
console.log(`\nSecurity Gaps:`);
for (const gap of rca.securityGaps) {
  console.log(`  [${gap.priority.toUpperCase()}] ${gap.category}`);
  console.log(`    ${gap.description}`);
  console.log(`    Current: ${gap.currentState}`);
  console.log(`    Recommended: ${gap.recommendedState}`);
}

// Recommendations
console.log(`\nRecommendations:`);
for (const rec of rca.recommendations) {
  console.log(`  [${rec.priority.toUpperCase()}] ${rec.title}`);
  console.log(`    ${rec.description}`);
  console.log(`    Category: ${rec.category}`);
  console.log(`    Effort: ${rec.effort}, Cost: ${rec.cost}`);
  console.log(`    Frameworks: ${rec.frameworks.join(', ')}`);
}
```

### 4.5 Impact Assessment

Assess incident impact:

```typescript
// Assess impact
const impact = await reconstructor.assessImpact(
  'CASE-2025-001',
  timeline,
  movements,
  {
    includeFinancial: true,
    includeRegulatory: true
  }
);

console.log(`\nImpact Assessment:\n`);
console.log(`Overall Impact: ${impact.overallImpact.toUpperCase()}`);
console.log(`Impact Types: ${impact.impactTypes.join(', ')}`);

// Business Impact
console.log(`\nBusiness Impact:`);
console.log(`  Affected Processes: ${impact.businessImpact.affectedProcesses.join(', ')}`);
console.log(`  Operational Downtime: ${impact.businessImpact.operationalDowntime} hours`);
console.log(`  Productivity Loss: $${impact.businessImpact.productivityLoss.toLocaleString()}`);
console.log(`  Service Disruption: ${impact.businessImpact.serviceDisruption}`);

// Technical Impact
console.log(`\nTechnical Impact:`);
console.log(`  Systems Compromised: ${impact.technicalImpact.systemsCompromised}`);
console.log(`  Accounts Compromised: ${impact.technicalImpact.accountsCompromised}`);
console.log(`  Data Records Affected: ${impact.technicalImpact.dataRecordsAffected.toLocaleString()}`);
console.log(`  CIA Triad:`);
console.log(`    Confidentiality: ${impact.technicalImpact.confidentialityImpacted}`);
console.log(`    Integrity: ${impact.technicalImpact.integrityImpacted}`);
console.log(`    Availability: ${impact.technicalImpact.availabilityImpacted}`);

// Regulatory Impact
console.log(`\nRegulatory Impact:`);
console.log(`  Applicable Regulations: ${impact.regulatoryImpact.applicableRegulations.join(', ')}`);
console.log(`  Notification Required: ${impact.regulatoryImpact.notificationRequired}`);
if (impact.regulatoryImpact.notificationDeadline) {
  console.log(`  Notification Deadline: ${impact.regulatoryImpact.notificationDeadline.toISOString()}`);
}
console.log(`  Potential Fines: $${impact.regulatoryImpact.potentialFines.toLocaleString()}`);

// Financial Impact
console.log(`\nFinancial Impact:`);
console.log(`  Direct Costs: $${impact.financialImpact.directCosts.toLocaleString()}`);
console.log(`  Indirect Costs: $${impact.financialImpact.indirectCosts.toLocaleString()}`);
console.log(`  Recovery Estimate: $${impact.financialImpact.recoveryEstimate.toLocaleString()}`);
console.log(`  Legal Costs: $${impact.financialImpact.legalCosts.toLocaleString()}`);
console.log(`  Regulatory Fines: $${impact.financialImpact.regulatoryFines.toLocaleString()}`);
console.log(`  Insurance Coverage: $${impact.financialImpact.insuranceCoverage.toLocaleString()}`);
console.log(`  TOTAL ESTIMATED LOSS: $${impact.financialImpact.totalEstimatedLoss.toLocaleString()}`);

// Recovery Assessment
console.log(`\nRecovery Assessment:`);
console.log(`  RTO: ${impact.recoveryAssessment.recoveryTimeObjective} hours`);
console.log(`  RPO: ${impact.recoveryAssessment.recoveryPointObjective} hours`);
console.log(`  Estimated Recovery: ${impact.recoveryAssessment.estimatedRecoveryTime} hours`);
console.log(`  Priorities: ${impact.recoveryAssessment.recoveryPriorities.join(', ')}`);
```

### 4.6 Attack Graph Generation

Generate visual attack graph:

```typescript
// Generate attack graph
const graph = await reconstructor.generateAttackGraph(
  'CASE-2025-001',
  timeline,
  movements,
  {
    includeCriticalPaths: true,
    maxNodes: 100
  }
);

console.log(`\nAttack Graph Generated:`);
console.log(`  ID: ${graph.id}`);
console.log(`  Nodes: ${graph.nodes.length}`);
console.log(`  Edges: ${graph.edges.length}`);
console.log(`  Risk Score: ${graph.riskScore}/100`);

// Entry points
console.log(`\nEntry Points: ${graph.entryPoints.join(', ')}`);

// Objectives
console.log(`Objectives: ${graph.objectives.join(', ')}`);

// Critical paths
console.log(`\nCritical Attack Paths:`);
for (let i = 0; i < graph.criticalPaths.length; i++) {
  console.log(`  Path ${i + 1}: ${graph.criticalPaths[i].join(' -> ')}`);
}

// Nodes
console.log(`\nGraph Nodes:`);
for (const node of graph.nodes.slice(0, 10)) {
  const compromised = node.compromised ? 'COMPROMISED' : 'clean';
  console.log(`  [${node.type}] ${node.label} (${compromised})`);
}

// Edges
console.log(`\nGraph Edges (sample):`);
for (const edge of graph.edges.slice(0, 5)) {
  console.log(`  ${edge.source} --[${edge.type}]--> ${edge.target}`);
}
```

---

## 5. MITRE ATT&CK Integration

### 5.1 Technique Database

Access the built-in MITRE ATT&CK database:

```typescript
// Get all techniques
const allTechniques = forensics.getAllMitreAttackTechniques();
console.log(`Total MITRE Techniques: ${allTechniques.length}`);

// Get specific technique
const technique = forensics.getMitreAttackTechnique('T1055');
if (technique) {
  console.log(`\nTechnique: ${technique.id}`);
  console.log(`  Name: ${technique.name}`);
  console.log(`  Tactic: ${technique.tactic}`);
  console.log(`  Description: ${technique.description}`);
  console.log(`  Platforms: ${technique.platforms.join(', ')}`);
  console.log(`  Detection: ${technique.detection}`);
  console.log(`  Mitigation: ${technique.mitigation.join(', ')}`);
  console.log(`  URL: ${technique.url}`);
}

// Also available from IncidentReconstructor
const techniqueFromRecon = reconstructor.getMitreTechnique('T1003.001');
```

### 5.2 Supported Techniques

| ID | Name | Tactic |
|----|------|--------|
| T1566 | Phishing | Initial Access |
| T1566.001 | Spearphishing Attachment | Initial Access |
| T1059 | Command and Scripting Interpreter | Execution |
| T1059.001 | PowerShell | Execution |
| T1078 | Valid Accounts | Defense Evasion |
| T1003 | OS Credential Dumping | Credential Access |
| T1003.001 | LSASS Memory | Credential Access |
| T1021 | Remote Services | Lateral Movement |
| T1021.001 | Remote Desktop Protocol | Lateral Movement |
| T1021.002 | SMB/Windows Admin Shares | Lateral Movement |
| T1055 | Process Injection | Defense Evasion |
| T1547 | Boot or Logon Autostart | Persistence |
| T1071 | Application Layer Protocol | Command and Control |
| T1048 | Exfiltration Over Alternative Protocol | Exfiltration |
| T1486 | Data Encrypted for Impact | Impact |
| T1087 | Account Discovery | Discovery |
| T1083 | File and Directory Discovery | Discovery |
| T1105 | Ingress Tool Transfer | Command and Control |

### 5.3 Threat Actor Database

Known threat actors in the database:

| ID | Name | Aliases | Motivation | Attribution |
|----|------|---------|------------|-------------|
| APT29 | Cozy Bear | The Dukes, YTTRIUM | Espionage | Russia |
| APT28 | Fancy Bear | Sofacy, STRONTIUM | Espionage | Russia |
| FIN7 | Carbanak | GOLD NIAGARA | Financial | Unknown |

```typescript
// Get threat actor
const actor = forensics.getThreatActor('APT29');
if (actor) {
  console.log(`Threat Actor: ${actor.name}`);
  console.log(`  Aliases: ${actor.aliases.join(', ')}`);
  console.log(`  Country: ${actor.country}`);
  console.log(`  Motivation: ${actor.motivation}`);
  console.log(`  Target Sectors: ${actor.targetSectors.join(', ')}`);
  console.log(`  Known Techniques: ${actor.knownTechniques.join(', ')}`);
  console.log(`  Active Since: ${actor.firstSeen}`);
}
```

---

## 6. Evidence Chain of Custody

### 6.1 Automatic Chain of Custody

Chain of custody is automatically maintained:

```typescript
// Every evidence operation adds a custody entry
const evidence = collector.getEvidence(evidenceId);
if (evidence) {
  console.log(`\nChain of Custody for ${evidence.name}:\n`);

  for (const entry of evidence.chainOfCustody) {
    console.log(`[${entry.timestamp.toISOString()}] ${entry.action.toUpperCase()}`);
    console.log(`  Actor: ${entry.actor} (${entry.actorRole || 'N/A'})`);
    console.log(`  Description: ${entry.description}`);
    if (entry.location) {
      console.log(`  Location: ${entry.location}`);
    }
    if (entry.previousHash) {
      console.log(`  Previous Hash: ${entry.previousHash.substring(0, 16)}...`);
    }
    if (entry.newHash) {
      console.log(`  New Hash: ${entry.newHash.substring(0, 16)}...`);
    }
    console.log();
  }
}
```

### 6.2 Manual Custody Entries

Add custom custody entries:

```typescript
// Add custody entry for ForensicsEngine
const entry = forensics.addChainOfCustodyEntry(
  evidenceId,
  'transferred',           // Action type
  'John Smith',            // Actor
  'Lead Investigator',     // Actor role
  'Evidence transferred to secure analysis workstation',  // Description
  'Forensic Lab - Workstation 3'  // Location
);

console.log(`Added custody entry: ${entry.id}`);
```

### 6.3 Custody Verification

Verify chain of custody integrity:

```typescript
// Verify chain of custody (ForensicsEngine)
const verification = await forensics.verifyChainOfCustody(evidenceId);

console.log(`\nChain of Custody Verification:`);
console.log(`  Valid: ${verification.valid}`);
console.log(`  Entries: ${verification.entries.length}`);

if (!verification.valid) {
  console.log(`\nIssues Found:`);
  for (const issue of verification.issues) {
    console.log(`  - ${issue}`);
  }
}
```

### 6.4 Export Custody Report

Export for legal purposes:

```typescript
// Export chain of custody (EvidenceCollector)
const custodyReport = collector.exportChainOfCustody(evidenceId);

console.log(`\nChain of Custody Report`);
console.log(`Generated: ${custodyReport.generatedAt}`);
console.log(`Generated By: ${custodyReport.generatedBy}`);
console.log(`Evidence ID: ${custodyReport.evidence.id}`);
console.log(`Evidence Name: ${custodyReport.evidence.name}`);
console.log(`SHA256: ${custodyReport.evidence.hashes.sha256}`);
console.log(`\nCustody Entries: ${custodyReport.chainOfCustody.length}`);
```

---

## 7. Live Response Procedures

### 7.1 Full Live Response

Collect volatile data from live system:

```typescript
// Perform comprehensive live response
const liveResponse = await collector.performLiveResponse(
  'CASE-2025-001',
  {
    id: 'target-001',
    type: 'endpoint',
    name: 'Compromised Workstation',
    hostname: 'ws001.company.com',
    credentials: { type: 'winrm', username: 'admin', password: '...' }
  },
  {
    collectMemory: true,              // Capture memory dump
    memoryDumpType: 'full',           // Full memory dump
    collectProcesses: true,           // Process list
    collectNetworkConnections: true,  // Network connections
    collectOpenFiles: true,           // Open file handles
    collectLoadedModules: true,       // Loaded DLLs/modules
    collectSystemInfo: true,          // System information
    collectServices: true,            // Running services
    collectScheduledTasks: true,      // Scheduled tasks
    collectUserSessions: true         // Active user sessions
  }
);

// Process results
console.log(`\nLive Response - ${liveResponse.hostname}`);
console.log(`Timestamp: ${liveResponse.timestamp}`);

// Memory dump
if (liveResponse.memoryDump) {
  console.log(`\nMemory Dump:`);
  console.log(`  Path: ${liveResponse.memoryDump.path}`);
  console.log(`  Size: ${(liveResponse.memoryDump.size / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Type: ${liveResponse.memoryDump.dumpType}`);
  console.log(`  Hash: ${liveResponse.memoryDump.hash}`);
  console.log(`  Acquisition Time: ${liveResponse.memoryDump.acquisitionTime}ms`);
}

// Process list
if (liveResponse.processList) {
  console.log(`\nProcesses (${liveResponse.processList.length}):`);
  for (const proc of liveResponse.processList.slice(0, 10)) {
    console.log(`  PID ${proc.pid}: ${proc.name} (${proc.user})`);
    console.log(`    Path: ${proc.path}`);
    console.log(`    CPU: ${proc.cpuPercent}%, Mem: ${proc.memoryPercent}%`);
  }
}

// Network connections
if (liveResponse.networkConnections) {
  console.log(`\nNetwork Connections (${liveResponse.networkConnections.length}):`);
  for (const conn of liveResponse.networkConnections) {
    console.log(`  ${conn.localAddress}:${conn.localPort} -> ${conn.remoteAddress}:${conn.remotePort}`);
    console.log(`    Protocol: ${conn.protocol}, State: ${conn.state}`);
    console.log(`    Process: ${conn.processName} (PID: ${conn.pid})`);
  }
}

// System info
if (liveResponse.systemInfo) {
  console.log(`\nSystem Information:`);
  console.log(`  Hostname: ${liveResponse.systemInfo.hostname}`);
  console.log(`  OS: ${liveResponse.systemInfo.os} ${liveResponse.systemInfo.osVersion}`);
  console.log(`  Architecture: ${liveResponse.systemInfo.architecture}`);
  console.log(`  Kernel: ${liveResponse.systemInfo.kernel}`);
  console.log(`  CPU: ${liveResponse.systemInfo.cpuModel} (${liveResponse.systemInfo.cpuCores} cores)`);
  console.log(`  Memory: ${(liveResponse.systemInfo.totalMemory / 1024 / 1024 / 1024).toFixed(2)} GB`);
  console.log(`  Uptime: ${Math.round(liveResponse.systemInfo.uptime / 3600)} hours`);
  console.log(`  Boot Time: ${liveResponse.systemInfo.bootTime}`);
}

// Running services
if (liveResponse.runningServices) {
  console.log(`\nServices (${liveResponse.runningServices.length}):`);
  for (const svc of liveResponse.runningServices.slice(0, 5)) {
    console.log(`  ${svc.name}: ${svc.status} (${svc.startType})`);
  }
}

// User sessions
if (liveResponse.userSessions) {
  console.log(`\nUser Sessions (${liveResponse.userSessions.length}):`);
  for (const session of liveResponse.userSessions) {
    console.log(`  ${session.username} - ${session.sessionType} (${session.state})`);
    console.log(`    Login: ${session.loginTime}, Idle: ${session.idleTime}s`);
  }
}
```

### 7.2 Process-Specific Memory Dump

Dump memory for specific process:

```typescript
// Target specific process
const processResponse = await collector.performLiveResponse(
  'CASE-2025-001',
  endpointSource,
  {
    collectMemory: true,
    memoryDumpType: 'process',      // Process-specific dump
    targetProcessId: 7832           // Target PID
  }
);
```

### 7.3 Live Response Best Practices

1. **Order of Volatility**: Collect volatile data first
   - Memory
   - Network connections
   - Running processes
   - Open files
   - Disk

2. **Minimize Footprint**: Use `minimalFootprint: true` option

3. **Document Everything**: All actions are logged in chain of custody

4. **Secure Transfer**: Use encrypted channels for evidence transfer

---

## 8. Report Generation for Legal

### 8.1 Generate Forensic Report

Create court-admissible reports:

```typescript
// Generate technical report
const technicalReport = await forensics.generateForensicReport(
  'CASE-2025-001',
  {
    type: 'technical',
    format: 'pdf',
    classification: 'CONFIDENTIAL'
  }
);

// Generate executive report
const executiveReport = await forensics.generateForensicReport(
  'CASE-2025-001',
  {
    type: 'executive',
    format: 'pdf',
    classification: 'CONFIDENTIAL'
  }
);

// Generate legal report
const legalReport = await forensics.generateForensicReport(
  'CASE-2025-001',
  {
    type: 'legal',
    format: 'docx',
    classification: 'CONFIDENTIAL - ATTORNEY-CLIENT PRIVILEGE'
  }
);

console.log(`\nForensic Report Generated:`);
console.log(`  Report ID: ${legalReport.id}`);
console.log(`  Title: ${legalReport.title}`);
console.log(`  Type: ${legalReport.type}`);
console.log(`  Format: ${legalReport.format}`);
console.log(`  Classification: ${legalReport.classification}`);
console.log(`  Created: ${legalReport.createdAt}`);
console.log(`  Created By: ${legalReport.createdBy}`);

console.log(`\nReport Sections:`);
for (const section of legalReport.sections) {
  console.log(`  ${section.order}. ${section.title}`);
}

console.log(`\nEvidence Items: ${legalReport.evidence.length}`);
console.log(`Findings: ${legalReport.findings.length}`);
console.log(`IOCs: ${legalReport.iocs.length}`);
console.log(`Recommendations: ${legalReport.recommendations.length}`);
```

### 8.2 Export Evidence Package

Create exportable evidence package:

```typescript
// Export evidence package for legal
const evidencePackage = await forensics.exportEvidencePackage(
  'CASE-2025-001',
  {
    includeRawData: true,         // Include raw evidence files
    encryptPackage: true,         // Encrypt the package
    format: 'forensic-container'  // Use forensic container format
  }
);

console.log(`\nEvidence Package Exported:`);
console.log(`  Package ID: ${evidencePackage.packageId}`);
console.log(`  Total Size: ${(evidencePackage.totalSize / 1024 / 1024).toFixed(2)} MB`);
console.log(`  Integrity Hash: ${evidencePackage.integrityHash}`);
console.log(`  Exported At: ${evidencePackage.exportedAt}`);

console.log(`\nManifest:`);
for (const file of evidencePackage.manifest) {
  console.log(`  - ${file}`);
}
```

### 8.3 Legal Hold Management

Apply and manage legal holds:

```typescript
// Apply legal hold
const legalHold = await collector.applyLegalHold(
  {
    name: 'HR Investigation Hold',
    caseReference: 'LEGAL-2025-001',
    startDate: new Date(),
    custodians: ['legal@company.com', 'hr@company.com'],
    retentionDays: 365 * 7,  // 7 years
    createdBy: 'General Counsel',
    approvedBy: 'CEO',
    notes: 'Hold in place pending employment litigation'
  },
  [evidenceId1, evidenceId2, evidenceId3]  // Evidence IDs
);

console.log(`\nLegal Hold Applied:`);
console.log(`  Hold ID: ${legalHold.id}`);
console.log(`  Name: ${legalHold.name}`);
console.log(`  Case Reference: ${legalHold.caseReference}`);
console.log(`  Retention: ${legalHold.retentionDays} days`);
console.log(`  Custodians: ${legalHold.custodians.join(', ')}`);

// Check if evidence can be deleted
const canDelete = collector.canDeleteEvidence(evidenceId1);
console.log(`\nCan delete evidence: ${canDelete.canDelete}`);
if (!canDelete.canDelete) {
  console.log(`  Reason: ${canDelete.reason}`);
}

// Get evidence under hold
const heldEvidence = collector.getEvidenceUnderHold(legalHold.id);
console.log(`\nEvidence under hold: ${heldEvidence.length} items`);

// Release hold when case is closed
await collector.releaseLegalHold(legalHold.id, 'General Counsel');
```

### 8.4 Report Types

| Type | Purpose | Audience |
|------|---------|----------|
| `executive` | High-level summary | C-Suite, Board |
| `technical` | Detailed technical analysis | IT Security, SOC |
| `legal` | Court-admissible documentation | Legal counsel, Law enforcement |
| `compliance` | Regulatory compliance | Compliance officers, Auditors |

---

## 9. Best Practices

### 9.1 Evidence Handling

```
+------------------------------------------------------------------+
|                   EVIDENCE HANDLING WORKFLOW                       |
+------------------------------------------------------------------+
|                                                                    |
|  1. IDENTIFICATION                                                 |
|     - Identify potential evidence sources                          |
|     - Document scene/environment                                   |
|     - Establish scope and priorities                               |
|                                                                    |
|  2. PRESERVATION                                                   |
|     - Apply write blocking immediately                             |
|     - Create forensic images                                       |
|     - Calculate and verify hashes                                  |
|     - Enable chain of custody tracking                             |
|                                                                    |
|  3. COLLECTION                                                     |
|     - Use validated forensic tools                                 |
|     - Follow order of volatility                                   |
|     - Document all collection activities                           |
|     - Minimize system impact                                       |
|                                                                    |
|  4. ANALYSIS                                                       |
|     - Work on forensic copies only                                 |
|     - Document all analysis steps                                  |
|     - Correlate across sources                                     |
|     - Map to MITRE ATT&CK framework                                |
|                                                                    |
|  5. REPORTING                                                      |
|     - Generate appropriate report type                             |
|     - Include chain of custody                                     |
|     - Document methodology                                         |
|     - Provide actionable recommendations                           |
|                                                                    |
+------------------------------------------------------------------+
```

### 9.2 Order of Volatility

Collect evidence in order of volatility:

1. **Registers, Cache** (nanoseconds)
2. **Memory** (seconds)
3. **Network State** (seconds)
4. **Running Processes** (seconds)
5. **Disk** (minutes)
6. **Remote Logging** (hours)
7. **Physical Configuration** (days)
8. **Archival Media** (years)

### 9.3 Security Considerations

```typescript
// Secure configuration example
const secureConfig: EvidenceCollectorConfig = {
  storage: {
    backend: 's3',
    s3Config: {
      bucket: 'forensics-evidence',
      region: 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      // Use private endpoint for security
      endpoint: 'https://s3-forensics.company.internal'
    }
  },
  defaultHashAlgorithms: ['sha256', 'sha512'],  // Strong hashes
  maxConcurrentJobs: 3,       // Limit concurrent access
  jobTimeout: 3600000,        // 1 hour timeout
  retentionDays: 2555,        // 7 years for legal
  enableAuditLog: true,       // Always enable audit
  auditLogPath: '/secure/forensics/audit.log'
};
```

### 9.4 Documentation Requirements

Always document:

- **Who**: Investigator name, role, credentials
- **What**: Evidence description, hash values, size
- **When**: Timestamps for all actions
- **Where**: Source system, storage location
- **Why**: Case reference, investigation purpose
- **How**: Tools used, methodology followed

### 9.5 Chain of Custody Checklist

- [ ] Evidence labeled with unique identifier
- [ ] Hash values calculated immediately
- [ ] All transfers documented
- [ ] Secure storage with access controls
- [ ] Custody log maintained
- [ ] Write protection verified
- [ ] Integrity verified before analysis
- [ ] Analysis performed on copies only

---

## 10. Troubleshooting

### 10.1 Common Issues

#### Memory Analysis Fails

```typescript
// Issue: Memory dump too large or corrupted
try {
  const result = await forensics.analyzeMemory(dumpPath, caseId);
} catch (error) {
  if (error.message.includes('Invalid memory dump')) {
    // Verify dump integrity
    const integrity = forensics.verifyFileIntegrity(
      fs.readFileSync(dumpPath),
      { sha256: expectedHash }
    );
    console.log('Integrity check:', integrity.valid);
    console.log('Mismatches:', integrity.mismatches);
  }
}
```

#### Collection Timeout

```typescript
// Increase timeout for large collections
const result = await collector.collectFromEndpoint(
  caseId,
  source,
  evidenceTypes,
  {
    timeout: 7200000,      // 2 hours
    retryAttempts: 5       // More retries
  }
);
```

#### Hash Verification Fails

```typescript
// Re-hash evidence
const hashes = await collector.hashEvidence(evidenceId, ['sha256', 'md5', 'sha1', 'sha512']);

// Compare with original
const evidence = collector.getEvidence(evidenceId);
if (evidence?.hashes.sha256 !== hashes.sha256) {
  console.error('CRITICAL: Evidence has been modified!');
  // Alert security team
  // Document the discrepancy
}
```

### 10.2 Performance Optimization

```typescript
// Optimize for large-scale collection
const optimizedConfig: EvidenceCollectorConfig = {
  // ... other config
  maxConcurrentJobs: 10,           // Increase parallelism
  jobTimeout: 7200000,             // Longer timeout
  defaultHashAlgorithms: ['sha256'], // Single hash for speed
};

// Use streaming for large files
// Enable compression
const result = await collector.collectFromEndpoint(
  caseId,
  source,
  evidenceTypes,
  {
    compression: true,
    maxConcurrent: 5
  }
);
```

### 10.3 Error Codes Reference

| Code | Description | Resolution |
|------|-------------|------------|
| `COLLECTION_FAILED` | Evidence collection error | Check source connectivity |
| `CONNECTION_FAILED` | Cannot connect to source | Verify credentials and network |
| `CLOUD_COLLECTION_FAILED` | Cloud resource error | Check cloud credentials and permissions |
| `CLOUD_INIT_FAILED` | Cloud client init failed | Verify provider configuration |
| `JOB_EXECUTION_FAILED` | Job execution error | Check job configuration |
| `SCHEDULED_JOB_FAILED` | Scheduled job error | Review schedule and permissions |

### 10.4 Logging and Debugging

```typescript
// Enable verbose logging
const forensics = ForensicsEngine.getInstance({
  // ... config
});

// Listen to events for debugging
forensics.on('initializing', (data) => {
  console.log('[ForensicsEngine] Initializing...', data);
});

forensics.on('analysis:started', (data) => {
  console.log('[ForensicsEngine] Analysis started:', data);
});

forensics.on('analysis:completed', (data) => {
  console.log('[ForensicsEngine] Analysis completed:', data);
});

forensics.on('evidence:collected', (evidence) => {
  console.log('[ForensicsEngine] Evidence collected:', evidence.id);
});

// EvidenceCollector events
collector.on('job:started', (job) => {
  console.log('[EvidenceCollector] Job started:', job.id);
});

collector.on('job:progress', (job, progress) => {
  console.log(`[EvidenceCollector] Progress: ${progress.percentComplete}%`);
});

collector.on('error', (error) => {
  console.error('[EvidenceCollector] Error:', error);
});

// IncidentReconstructor events
reconstructor.on('timeline:reconstruction:started', (data) => {
  console.log('[IncidentReconstructor] Timeline reconstruction started:', data);
});

reconstructor.on('killchain:mapping:completed', (data) => {
  console.log('[IncidentReconstructor] Kill chain mapping completed:', data);
});
```

### 10.5 Getting Statistics

```typescript
// ForensicsEngine statistics
const caseStats = forensics.getCaseStatistics('CASE-2025-001');
console.log(`\nCase Statistics:`);
console.log(`  Evidence Count: ${caseStats.evidenceCount}`);
console.log(`  Finding Count: ${caseStats.findingCount}`);
console.log(`  IOC Count: ${caseStats.iocCount}`);
console.log(`  Timeline Events: ${caseStats.timelineEventCount}`);
console.log(`  Analysis Progress: ${caseStats.analysisProgress}%`);
console.log(`  Techniques Covered: ${caseStats.techniquesCovered.join(', ')}`);

// EvidenceCollector statistics
const collectorStats = collector.getStatistics();
console.log(`\nCollector Statistics:`);
console.log(`  Total Evidence: ${collectorStats.totalEvidence}`);
console.log(`  Total Jobs: ${collectorStats.totalJobs}`);
console.log(`  Active Jobs: ${collectorStats.activeJobs}`);
console.log(`  Active Legal Holds: ${collectorStats.activeLegalHolds}`);
console.log(`  Total Bytes: ${(collectorStats.totalBytesCollected / 1024 / 1024).toFixed(2)} MB`);
```

---

## Quick Reference Card

### ForensicsEngine Methods

| Method | Description |
|--------|-------------|
| `analyzeMemory()` | Analyze memory dumps |
| `analyzeDisk()` | Analyze disk images |
| `analyzeNetwork()` | Analyze PCAP files |
| `extractArtifacts()` | Extract forensic artifacts |
| `generateTimeline()` | Generate event timeline |
| `extractIOCs()` | Extract and enrich IOCs |
| `submitToSandbox()` | Submit to malware sandbox |
| `scanWithYara()` | Scan with YARA rules |
| `attributeThreatActor()` | Attribute to threat actors |
| `reconstructAttackPath()` | Reconstruct attack path |
| `generateForensicReport()` | Generate reports |
| `exportEvidencePackage()` | Export evidence package |
| `verifyChainOfCustody()` | Verify custody chain |

### EvidenceCollector Methods

| Method | Description |
|--------|-------------|
| `collectFromEndpoint()` | Collect from endpoints |
| `collectFromCloud()` | Collect from cloud |
| `performLiveResponse()` | Live response collection |
| `preserveEvidence()` | Preserve with protection |
| `hashEvidence()` | Calculate hashes |
| `verifyEvidence()` | Verify integrity |
| `scheduleCollection()` | Schedule collection jobs |
| `applyLegalHold()` | Apply legal hold |
| `releaseLegalHold()` | Release legal hold |

### IncidentReconstructor Methods

| Method | Description |
|--------|-------------|
| `reconstructTimeline()` | Build incident timeline |
| `trackLateralMovement()` | Track lateral movement |
| `mapToKillChain()` | Map to MITRE ATT&CK |
| `performRootCauseAnalysis()` | Perform RCA |
| `assessImpact()` | Assess incident impact |
| `generateAttackGraph()` | Generate attack graph |

---

**Document Version**: 1.0.0
**Last Updated**: Week 23, 2025
**Maintained by**: Security Operations Team
