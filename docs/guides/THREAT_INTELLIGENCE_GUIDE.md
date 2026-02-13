# Threat Intelligence System Guide

## Overview

### What is Threat Intelligence

Threat Intelligence (TI) is the practice of collecting, analyzing, and sharing information about cybersecurity threats to enable proactive defense and informed decision-making. The Threat Intelligence system in Workflow automates the collection, enrichment, and scoring of threat data to enable rapid identification and response to security threats.

**Key Benefits**:
- **Proactive Defense**: Identify threats before they impact systems
- **Faster Response**: Automated enrichment and scoring accelerates incident response
- **Informed Decisions**: Data-driven threat assessment with multiple intelligence sources
- **Risk Prioritization**: Intelligent scoring helps prioritize limited security resources
- **Integration Ready**: Seamless integration with SIEM, SOC, and incident response tools

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    THREAT INTELLIGENCE SYSTEM                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │ THREAT FEEDS     │  │  IOC MANAGER     │  │   ENRICHER   │  │
│  │                  │  │                  │  │              │  │
│  │ • AlienVault OTX │  │ • Indicators     │  │ • IP Geo     │  │
│  │ • VirusTotal     │  │ • Matching       │  │ • Domain DNS │  │
│  │ • AbuseIPDB      │  │ • Lifecycle      │  │ • Hash VT    │  │
│  │ • ThreatFox      │  │ • Search         │  │ • URL Safe   │  │
│  │ • MISP           │  │                  │  │              │  │
│  │ • OpenCTI        │  └──────────────────┘  └──────────────┘  │
│  └──────────────────┘           │                    │          │
│           │                      │                    │          │
│           └──────────┬───────────┴────────────────────┘          │
│                      │                                           │
│                ┌─────▼──────────┐                               │
│                │ SCORING ENGINE │                               │
│                │                │                               │
│                │ • Weighted Avg │                               │
│                │ • Risk Levels  │                               │
│                │ • Alerts       │                               │
│                └─────┬──────────┘                               │
│                      │                                           │
│            ┌─────────▼──────────────┐                           │
│            │   INTEGRATION LAYER    │                           │
│            │                        │                           │
│            │ • SIEM Integration     │                           │
│            │ • Dashboard & API      │                           │
│            │ • Automated Response   │                           │
│            └────────────────────────┘                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Key Components

**1. Feed Manager**
- Manages connections to multiple threat intelligence feeds
- Handles API authentication and rate limiting
- Schedules periodic feed updates
- Validates and normalizes threat data

**2. IOC Manager**
- Stores and manages Indicators of Compromise (IOCs)
- Supports 13 IOC types (IPs, domains, hashes, etc.)
- Provides fast matching engine with multiple strategies
- Handles bulk import/export operations

**3. Enrichment Engine**
- Enriches IOCs with contextual threat data
- Integrates with 5+ enrichment sources
- Supports parallel enrichment for performance
- Implements intelligent caching

**4. Threat Scoring Engine**
- Calculates threat scores from multiple dimensions
- Assigns risk levels (Critical, High, Medium, Low, Info)
- Supports custom scoring rules
- Integrates with alerting systems

---

## Quick Start (5-Minute Setup)

### Prerequisites

- Node.js 20+ and npm 9+
- Running Workflow instance (`npm run dev`)
- API keys for at least one threat feed (free options available)
- Workflow admin access

### Basic Configuration

1. **Create threat intelligence configuration file**:

```bash
cat > .env.threats << 'EOF'
# AlienVault OTX (free account available)
ALIENVAULT_API_KEY=your_api_key_here

# Optional feeds
# VIRUSTOTAL_API_KEY=your_api_key_here
# ABUSEIPDB_API_KEY=your_api_key_here
EOF
```

2. **Initialize the threat intelligence system**:

```typescript
import { ThreatIntelligenceManager } from './src/security/ThreatIntelligence'

const tiManager = new ThreatIntelligenceManager({
  environment: process.env,
  cacheConfig: {
    enableCache: true,
    ttlSeconds: 3600
  }
})

await tiManager.initialize()
console.log('Threat Intelligence System Ready')
```

3. **Add your first threat feed**:

```typescript
await tiManager.addFeed({
  name: 'AlienVault OTX',
  type: 'otx',
  apiKey: process.env.ALIENVAULT_API_KEY,
  refreshIntervalMinutes: 60,
  enabled: true
})
```

4. **Verify system health**:

```bash
curl http://localhost:8080/api/threat-intelligence/health
# Response: { status: 'healthy', feeds: 1, iocCount: 15234 }
```

### First Threat Feed Integration

```typescript
// Subscribe to a pulse (collection of IOCs)
const pulse = await tiManager.subscribeToPulse('AlienVault OTX', {
  pulseId: 'malware-c2-botnet',
  autoUpdate: true
})

// View imported IOCs
const iocs = await tiManager.searchIOCs({
  source: 'AlienVault OTX',
  limit: 10
})

console.log(`Imported ${iocs.length} indicators from pulse`)
```

---

## Threat Feed Integration Guide

### AlienVault OTX

**Setup**:
1. Create free account at https://otx.alienvault.com
2. Generate API key in account settings
3. Start with public pulses (no API key needed for reading)

**Configuration**:

```typescript
const otxConfig = {
  name: 'AlienVault OTX',
  type: 'otx',
  apiKey: process.env.ALIENVAULT_API_KEY,
  apiEndpoint: 'https://otx.alienvault.com/api/v1',
  refreshIntervalMinutes: 60,
  enabled: true,
  settings: {
    subscribeToPulses: [
      'malware-c2-servers',
      'phishing-urls',
      'botnet-ips'
    ],
    trustLevel: 'high', // Filter by trust level
    limit: 10000 // Max IOCs per pulse
  }
}

await tiManager.addFeed(otxConfig)
```

**Example Code**:

```typescript
// Search for IOCs from OTX
const otxIOCs = await tiManager.searchIOCs({
  source: 'AlienVault OTX',
  type: 'IPv4',
  trustLevel: 'high'
})

// Monitor for new pulses
tiManager.on('pulseUpdated', (pulse) => {
  console.log(`New pulse: ${pulse.name} (${pulse.indicatorCount} indicators)`)
})

// Get threat details
const ioc = await tiManager.getIOCDetails(ipAddress)
console.log(`Threat Score: ${ioc.score}`)
console.log(`Last Seen: ${ioc.lastSeen}`)
console.log(`Sources: ${ioc.sources.join(', ')}`)
```

**Advantages**:
- Free tier available
- 70,000+ active pulses
- Real-time malware analysis
- Community-driven intelligence

---

### VirusTotal

**Setup**:
1. Register at https://www.virustotal.com
2. Get API key from account settings
3. Note: Free tier has 4 requests/minute limit

**Configuration**:

```typescript
const vtConfig = {
  name: 'VirusTotal',
  type: 'virustotal',
  apiKey: process.env.VIRUSTOTAL_API_KEY,
  apiEndpoint: 'https://www.virustotal.com/api/v3',
  refreshIntervalMinutes: 240, // 4 hours for rate limit
  enabled: true,
  settings: {
    rateLimit: {
      requests: 4,
      interval: 60000 // 1 minute
    },
    enrich: ['files', 'urls', 'domains'],
    minDetections: 5 // Only include items detected by 5+ vendors
  }
}

await tiManager.addFeed(vtConfig)
```

**Example Code**:

```typescript
// Check file hash reputation
const fileReputation = await tiManager.enrichIOC({
  type: 'FileHash',
  value: 'abc123def456',
  service: 'virustotal'
})

console.log(`Detection Ratio: ${fileReputation.detectionRatio}`)
// Output: "Detection Ratio: 45/70"

// Get detailed vendor analysis
if (fileReputation.vendorDetails) {
  for (const [vendor, result] of Object.entries(fileReputation.vendorDetails)) {
    console.log(`${vendor}: ${result.category}`)
  }
}

// Batch enrichment with rate limit handling
const hashes = ['hash1', 'hash2', 'hash3']
const results = await tiManager.batchEnrichIOCs(hashes, 'virustotal')
```

**Best Practices**:
- Use for hash reputation and URL scanning
- Implement queue to respect rate limits
- Cache results for 24 hours to minimize API calls

---

### AbuseIPDB

**Setup**:
1. Register at https://www.abuseipdb.com
2. Navigate to Account > API to get your key
3. Free tier: 1,000 requests/day

**Configuration**:

```typescript
const abuseConfig = {
  name: 'AbuseIPDB',
  type: 'abuseipdb',
  apiKey: process.env.ABUSEIPDB_API_KEY,
  apiEndpoint: 'https://api.abuseipdb.com/api/v2',
  refreshIntervalMinutes: 120,
  enabled: true,
  settings: {
    minAbuseScore: 25, // Only include IPs with score >= 25
    maxAgeInDays: 90,  // Only include reports from last 90 days
    limits: {
      requests: 1000,
      period: 86400000 // 24 hours
    },
    categories: [
      'Hacking',
      'Proxy',
      'VPN',
      'Botnet',
      'Malware'
    ]
  }
}

await tiManager.addFeed(abuseConfig)
```

**Example Code**:

```typescript
// Check IP reputation with confidence scores
const ipReputation = await tiManager.enrichIOC({
  type: 'IPv4',
  value: '192.168.1.1',
  service: 'abuseipdb'
})

console.log(`Abuse Score: ${ipReputation.abuseScore}/100`)
console.log(`Confidence: ${ipReputation.usageType}`)
console.log(`Total Reports: ${ipReputation.totalReports}`)

// Get specific report details
if (ipReputation.reports && ipReputation.reports.length > 0) {
  for (const report of ipReputation.reports.slice(0, 5)) {
    console.log(`- ${report.comment} (${report.category})`)
  }
}

// Bulk IP checking with automatic rate limiting
const ips = ['1.1.1.1', '8.8.8.8', '192.168.1.1']
const results = await tiManager.batchEnrichIOCs(ips, 'abuseipdb')
for (const result of results) {
  if (result.abuseScore > 50) {
    console.log(`HIGH RISK: ${result.ipAddress}`)
  }
}
```

**Confidence Scores**:
- **95-100**: Confirmed malicious
- **75-94**: Very likely malicious
- **50-74**: Suspicious
- **25-49**: Possibly malicious
- **1-24**: Unlikely malicious

---

### ThreatFox

**Setup**:
- No authentication required!
- Free, community-driven malware IOC feed
- Ideal for malware families and malicious URLs

**Configuration**:

```typescript
const threatfoxConfig = {
  name: 'ThreatFox',
  type: 'threatfox',
  apiEndpoint: 'https://threatfox.abuse.ch/api/v1',
  refreshIntervalMinutes: 60,
  enabled: true,
  settings: {
    malwareFamilies: [
      'Emotet',
      'Qakbot',
      'IcedID',
      'TrickBot'
    ],
    iocTypes: ['url', 'ipv4', 'domain', 'sha256']
  }
}

await tiManager.addFeed(threatfoxConfig)
```

**Example Code**:

```typescript
// Search for IOCs by malware family
const emotetIOCs = await tiManager.searchIOCs({
  source: 'ThreatFox',
  malwareFamily: 'Emotet'
})

console.log(`Found ${emotetIOCs.length} Emotet indicators`)

// Get recent malicious URLs
const recentUrls = await tiManager.searchIOCs({
  source: 'ThreatFox',
  type: 'URL',
  days: 7
})

// Subscribe to malware family updates
tiManager.on('malwareFamilyDetected', (data) => {
  console.log(`New ${data.malwareFamily} detected: ${data.indicators.length} IOCs`)
  // Trigger automated response
  await tiManager.triggerResponse('block_malware', data)
})
```

**Advantages**:
- No API key required
- Real-time malware tracking
- Abuse.ch reputation
- Free tier unlimited access

---

### MISP (Malware Information Sharing Platform)

**Setup**:
1. Deploy MISP instance (Docker or self-hosted)
2. Create API user and generate authentication key
3. Configure organization and sharing groups

**Configuration**:

```typescript
const mispConfig = {
  name: 'MISP Instance',
  type: 'misp',
  apiKey: process.env.MISP_API_KEY,
  apiEndpoint: 'https://misp.example.com/api/v1',
  refreshIntervalMinutes: 120,
  enabled: true,
  settings: {
    organisationId: 1,
    sharingGroups: ['TLP:WHITE', 'TLP:GREEN'],
    includeEventTypes: [
      'ransomware',
      'malware',
      'phishing',
      'botnet'
    ],
    threatLevel: {
      min: 2,  // Exclude low severity
      max: 4   // Include all levels
    }
  }
}

await tiManager.addFeed(mispConfig)
```

**Example Code**:

```typescript
// Query MISP events
const events = await tiManager.searchIOCs({
  source: 'MISP Instance',
  eventType: 'ransomware',
  days: 30
})

// Create new MISP event
const newEvent = await tiManager.createMISPEvent({
  title: 'Detected Malware Campaign',
  description: 'C2 communication detected',
  threatLevel: 2,
  analysis: 'Ongoing',
  distribution: 1,
  sharingGroup: 'TLP:GREEN',
  attributes: [
    { type: 'ip-src', value: '192.168.1.1' },
    { type: 'domain', value: 'malicious.com' }
  ]
})

// Share indicators with MISP community
await tiManager.pushIndicatorsToMISP(indicators, {
  sharingGroup: 'TLP:GREEN',
  distribution: 'community'
})

// Get MISP galaxy data (MITRE ATT&CK, threat actors, etc.)
const galaxyData = await tiManager.getMISPGalaxy({
  galaxyName: 'mitre-attack-pattern'
})
```

**Enterprise Features**:
- Multi-organization support
- Advanced sharing controls
- STIX export/import
- Event correlation engine

---

### OpenCTI

**Setup**:
1. Deploy OpenCTI Docker container
2. Generate API token from admin interface
3. Configure connectors for automated feeds

**Configuration**:

```typescript
const openctiConfig = {
  name: 'OpenCTI Instance',
  type: 'opencti',
  apiToken: process.env.OPENCTI_API_TOKEN,
  apiEndpoint: 'https://opencti.example.com/graphql',
  refreshIntervalMinutes: 180,
  enabled: true,
  settings: {
    workspace: 'default',
    markingDefinitions: [
      'TLP:WHITE',
      'TLP:GREEN'
    ],
    entityTypes: [
      'Malware',
      'Campaign',
      'Attack-Pattern',
      'Identity',
      'Indicator'
    ],
    stixVersion: '2.1'
  }
}

await tiManager.addFeed(openctiConfig)
```

**Example Code**:

```typescript
// Query OpenCTI via GraphQL API
const malwareIndicators = await tiManager.queryOpenCTI(`
  query {
    malwares(first: 50) {
      edges {
        node {
          id
          name
          aliases
          indicators {
            pattern
            validFrom
          }
        }
      }
    }
  }
`)

// Get threat actor information
const threatActors = await tiManager.searchIOCs({
  source: 'OpenCTI Instance',
  entityType: 'Threat-Actor',
  pattern: 'APT*'
})

// Import STIX bundle
const stixBundle = {
  type: 'bundle',
  objects: [
    // STIX 2.1 objects
  ]
}
await tiManager.importSTIXBundle(stixBundle)

// Create knowledge graph relationships
await tiManager.createRelationship({
  sourceId: 'malware-id',
  targetId: 'campaign-id',
  relationType: 'used-in'
})
```

**Advanced Features**:
- STIX 2.1 support
- Knowledge graph visualization
- Connector ecosystem
- AI-powered correlation

---

### Feed Comparison Table

| Feature | OTX | VirusTotal | AbuseIPDB | ThreatFox | MISP | OpenCTI |
|---------|-----|------------|-----------|-----------|------|---------|
| **Cost** | Free | Free/Paid | Free/Paid | Free | Free/Enterprise | Free/Enterprise |
| **Auth** | API Key | API Key | API Key | None | API Key | Token |
| **Update Rate** | Real-time | Real-time | Daily | Real-time | Variable | Variable |
| **IOC Types** | All | Hash, URL | IP | URL, IP, Domain, Hash | STIX | STIX |
| **Rate Limits** | Unlimited | 4 req/min | 1000/day | 50 req/hour | Configurable | Configurable |
| **Community** | Large | Large | Medium | Large | Enterprise | Enterprise |
| **API Quality** | Excellent | Excellent | Good | Good | Excellent | Excellent |
| **Best For** | General TI | File Reputation | IP Reputation | Malware | Enterprise | Enterprise |

---

## IOC Management Guide

### IOC Types Reference (13 Types)

```typescript
enum IOCType {
  // Network Indicators
  IPv4 = 'ipv4',           // IP address (4.3.2.1)
  IPv6 = 'ipv6',           // IP address (2001:db8::1)
  Domain = 'domain',       // Domain name (example.com)
  URL = 'url',             // Full URL (https://example.com/path)

  // File Indicators
  FileHash_MD5 = 'hash_md5',       // MD5 (32 hex chars)
  FileHash_SHA1 = 'hash_sha1',     // SHA-1 (40 hex chars)
  FileHash_SHA256 = 'hash_sha256', // SHA-256 (64 hex chars)

  // Email Indicators
  EmailAddress = 'email',          // Email (user@example.com)
  EmailSubject = 'email_subject',  // Email subject line

  // Other Indicators
  CIDR = 'cidr',           // CIDR range (192.168.0.0/16)
  Mutex = 'mutex',         // Windows mutex
  Registry = 'registry',   // Registry path
  Filename = 'filename'    // Filename (file.exe)
}
```

### Creating and Managing IOCs

```typescript
// Create individual IOC
const ioc = await tiManager.createIOC({
  type: 'IPv4',
  value: '192.168.1.1',
  source: 'AlienVault OTX',
  severity: 'high',
  description: 'Known C2 server',
  tags: ['malware', 'botnet', 'trojan'],
  tlpLevel: 'green',
  confidence: 95,
  metadata: {
    discoveredAt: new Date(),
    attribution: 'APT28',
    malwareFamily: 'Emotet'
  }
})

// Update IOC
await tiManager.updateIOC(ioc.id, {
  severity: 'critical',
  tags: ['malware', 'botnet', 'trojan', 'active-exploitation']
})

// Get IOC details
const iocDetails = await tiManager.getIOC(ioc.id)
console.log(`Value: ${iocDetails.value}`)
console.log(`Score: ${iocDetails.threatScore}`)
console.log(`Sources: ${iocDetails.sources.join(', ')}`)

// Delete IOC
await tiManager.deleteIOC(ioc.id)

// Expire IOC automatically
await tiManager.setIOCExpiration(ioc.id, {
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  autoDelete: true
})
```

### Matching Engine Usage

**1. Exact Matching**:

```typescript
// Find exact match
const match = await tiManager.findExactMatch({
  type: 'IPv4',
  value: '192.168.1.1'
})

if (match) {
  console.log(`THREAT FOUND: ${match.severity}`)
}

// Batch exact matching
const values = ['192.168.1.1', '10.0.0.1', '8.8.8.8']
const matches = await tiManager.findExactMatches({
  type: 'IPv4',
  values
})

for (const match of matches) {
  console.log(`${match.value}: ${match.threatScore}`)
}
```

**2. CIDR Range Matching**:

```typescript
// Check if IP falls within known malicious ranges
const rangeMatcher = new CIDRMatcher()

// Add ranges from feeds
for (const cidr of ['192.168.0.0/16', '10.0.0.0/8']) {
  rangeMatcher.add(cidr, { severity: 'high' })
}

// Test IP against ranges
const result = rangeMatcher.match('192.168.1.1')
if (result) {
  console.log(`IP ${result.ip} matches range ${result.cidr}`)
}

// Advanced range matching
const matches = await tiManager.findCIDRMatches({
  ip: '192.168.1.1',
  ranges: await tiManager.getCIDRRanges({ type: 'IPv4', severity: 'high' })
})
```

**3. Wildcard Domain Matching**:

```typescript
// Match subdomains
const wildcardMatcher = new WildcardDomainMatcher()

// Add patterns
wildcardMatcher.add('*.malicious.com')
wildcardMatcher.add('evil.*.net')

// Test domain
if (wildcardMatcher.match('admin.malicious.com')) {
  console.log('THREAT: Malicious domain detected')
}

// Subdomain matching
const result = await tiManager.findDomainMatches({
  domain: 'api.staging.internal.evil.com',
  includeSubdomains: true
})
```

**4. Regex Patterns**:

```typescript
// Create regex-based detector
const regexDetector = new RegexIOCDetector()

// Add malware naming patterns
regexDetector.add('filename', /^(emotet|qakbot|trickbot)_.*\.exe$/i)
regexDetector.add('registry', /HKLM\\SOFTWARE\\Microsoft\\Windows\\Run/)

// Test value
const matches = regexDetector.match('emotet_malware_sample.exe')
if (matches) {
  console.log(`Matched pattern: ${matches.pattern}`)
}
```

### Bulk Operations

```typescript
// Bulk import IOCs from CSV
const csvData = `type,value,severity,source
ipv4,192.168.1.1,high,custom
domain,evil.com,critical,custom
hash_sha256,abc123def456,high,custom`

const imported = await tiManager.bulkImportIOCs({
  format: 'csv',
  data: csvData,
  source: 'custom',
  updateExisting: true
})

console.log(`Imported ${imported.success} IOCs, ${imported.failed} failed`)

// Bulk export IOCs
const exported = await tiManager.bulkExportIOCs({
  format: 'json',
  filters: {
    severity: ['critical', 'high'],
    source: 'AlienVault OTX'
  }
})

fs.writeFileSync('threat_indicators.json', JSON.stringify(exported, null, 2))

// Bulk update with conditions
const updated = await tiManager.bulkUpdateIOCs({
  query: { severity: 'low', sourceCount: { $lt: 3 } },
  updates: { status: 'deprecated' }
})

console.log(`Updated ${updated.modifiedCount} IOCs`)

// Bulk delete with safety checks
const deleted = await tiManager.bulkDeleteIOCs({
  query: { status: 'deprecated', lastSeen: { $lt: Date.now() - 180 * 24 * 60 * 60 * 1000 } },
  requireConfirmation: true
})
```

### IOC Lifecycle Management

```typescript
// IOC lifecycle states
enum IOCStatus {
  ACTIVE = 'active',           // Currently observed threat
  DORMANT = 'dormant',         // Not recently observed
  DEPRECATED = 'deprecated',   // Superseded or false positive
  ARCHIVED = 'archived',       // Removed from active monitoring
  STAGED = 'staged'            // Pending confirmation
}

// Set IOC status
await tiManager.setIOCStatus(ioc.id, {
  status: 'active',
  reason: 'Confirmed by multiple sources',
  validFrom: new Date(),
  validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
})

// Archive old IOCs
const archived = await tiManager.archiveOldIOCs({
  beforeDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
  reason: 'Age-based archival'
})

// Bulk status transition
await tiManager.transitionIOCStatus({
  fromStatus: 'active',
  toStatus: 'dormant',
  conditions: {
    lastSeen: { $lt: Date.now() - 60 * 24 * 60 * 60 * 1000 } // 60 days
  }
})
```

### Search and Filtering

```typescript
// Advanced search
const results = await tiManager.searchIOCs({
  // Filter criteria
  type: 'IPv4',
  severity: ['critical', 'high'],
  source: ['AlienVault OTX', 'VirusTotal'],
  status: 'active',

  // Temporal filters
  discoveredAfter: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
  discoveredBefore: new Date(),

  // Advanced filters
  tags: { $all: ['malware', 'botnet'] }, // All tags
  threatScore: { $gte: 80 },             // High risk
  sourceCount: { $gte: 3 },              // Multiple sources

  // Pagination
  skip: 0,
  limit: 100,
  sortBy: 'threatScore',
  sortOrder: 'desc'
})

console.log(`Found ${results.total} IOCs`)
for (const ioc of results.items) {
  console.log(`${ioc.value} (${ioc.threatScore}/100)`)
}

// Free-text search
const textResults = await tiManager.searchIOCsByText('malware emotet botnet')

// Saved searches
await tiManager.createSavedSearch({
  name: 'Active High-Risk Indicators',
  query: {
    severity: 'critical',
    status: 'active',
    threatScore: { $gte: 90 }
  }
})

const saved = await tiManager.getSavedSearch('Active High-Risk Indicators')
```

---

## Enrichment Pipeline Guide

### Enrichment Sources Configuration

```typescript
const enrichmentConfig = {
  // IP enrichment sources
  ipEnrichment: [
    { name: 'MaxMind GeoIP', enabled: true, priority: 1 },
    { name: 'WHOIS', enabled: true, priority: 2 },
    { name: 'ASN Lookup', enabled: true, priority: 3 },
    { name: 'Proxy Detection', enabled: true, priority: 4 },
    { name: 'VirusTotal', enabled: true, priority: 5 }
  ],

  // Domain enrichment sources
  domainEnrichment: [
    { name: 'DNS Resolution', enabled: true, priority: 1 },
    { name: 'SSL Certificate', enabled: true, priority: 2 },
    { name: 'WHOIS', enabled: true, priority: 3 },
    { name: 'Registrar', enabled: true, priority: 4 },
    { name: 'Safe Browsing', enabled: true, priority: 5 }
  ],

  // Hash enrichment sources
  hashEnrichment: [
    { name: 'VirusTotal', enabled: true, priority: 1 },
    { name: 'Malware Family', enabled: true, priority: 2 },
    { name: 'YARA Rules', enabled: true, priority: 3 }
  ],

  // URL enrichment sources
  urlEnrichment: [
    { name: 'Safe Browsing', enabled: true, priority: 1 },
    { name: 'URL Redirect Analysis', enabled: true, priority: 2 },
    { name: 'VirusTotal', enabled: true, priority: 3 }
  ]
}

const enricher = new EnrichmentPipeline(enrichmentConfig)
```

### IP Enrichment

```typescript
// Basic IP enrichment
const ipEnrichment = await enricher.enrichIP('192.168.1.1', {
  includeGeo: true,
  includeWhois: true,
  includeASN: true,
  includeProxyCheck: true
})

console.log(`Location: ${ipEnrichment.geo.country} (${ipEnrichment.geo.city})`)
console.log(`ISP: ${ipEnrichment.asn.organization}`)
console.log(`Is Proxy: ${ipEnrichment.proxy.isProxy}`)

// Detailed enrichment with caching
const detailed = await enricher.enrichIP('8.8.8.8', {
  useCache: true,
  cacheTTL: 86400, // 24 hours
  timeout: 5000
})

if (detailed.whois) {
  console.log(`Organization: ${detailed.whois.organization}`)
  console.log(`Registered: ${detailed.whois.registrationDate}`)
  console.log(`Last Updated: ${detailed.whois.updatedDate}`)
}

// Batch IP enrichment
const ips = ['1.1.1.1', '8.8.8.8', '192.168.1.1']
const enriched = await enricher.batchEnrichIPs(ips, {
  parallel: true,
  parallelLimit: 5,
  useCache: true
})

for (const result of enriched) {
  console.log(`${result.ip}: ${result.geo.country}`)
}
```

### Domain Enrichment

```typescript
// DNS resolution and reputation
const domainEnrichment = await enricher.enrichDomain('example.com', {
  resolveDNS: true,
  checkSSL: true,
  includeWHOIS: true,
  checkReputation: true
})

// DNS records
for (const record of domainEnrichment.dns.records) {
  console.log(`${record.type}: ${record.value}`)
}

// SSL certificate details
if (domainEnrichment.ssl) {
  console.log(`Issuer: ${domainEnrichment.ssl.issuer}`)
  console.log(`Valid Until: ${domainEnrichment.ssl.validUntil}`)
  console.log(`CN: ${domainEnrichment.ssl.commonName}`)
}

// Registrar information
if (domainEnrichment.whois) {
  console.log(`Registrar: ${domainEnrichment.whois.registrar}`)
  console.log(`Created: ${domainEnrichment.whois.creationDate}`)
  console.log(`Expires: ${domainEnrichment.whois.expirationDate}`)
}

// Passive DNS (historical resolution)
const passiveDNS = await enricher.getPassiveDNS('example.com')
for (const resolution of passiveDNS) {
  console.log(`${resolution.ip} (${resolution.firstSeen} - ${resolution.lastSeen})`)
}
```

### Hash Enrichment

```typescript
// File hash reputation
const hashRep = await enricher.enrichHash('abc123def456', {
  hashType: 'sha256',
  includeVendors: true,
  includeMalwareFamilies: true,
  includeYARA: true
})

console.log(`Detection Ratio: ${hashRep.detectionRatio}`)
console.log(`First Submission: ${hashRep.firstSubmitted}`)

// Malware family identification
if (hashRep.malwareFamilies) {
  console.log('Malware Families:')
  for (const family of hashRep.malwareFamilies) {
    console.log(`- ${family.name} (confidence: ${family.confidence}%)`)
  }
}

// YARA rule matches
if (hashRep.yaraMatches) {
  console.log('YARA Matches:')
  for (const match of hashRep.yaraMatches) {
    console.log(`- ${match.ruleName} (${match.ruleSource})`)
  }
}

// Batch hash enrichment
const hashes = ['hash1', 'hash2', 'hash3']
const results = await enricher.batchEnrichHashes(hashes, {
  hashType: 'sha256',
  parallel: true
})
```

### URL Enrichment

```typescript
// Safe browsing check
const urlCheck = await enricher.enrichURL('https://malicious-site.com/payload', {
  checkSafeBrowsing: true,
  analyzeRedirects: true,
  checkReputation: true
})

console.log(`Safe Browsing Category: ${urlCheck.safeBrowsingCategory}`)
console.log(`Threat Type: ${urlCheck.threatType}`)

// Redirect chain analysis
if (urlCheck.redirectChain) {
  console.log('Redirect Chain:')
  for (const url of urlCheck.redirectChain) {
    console.log(`  -> ${url}`)
  }
}

// VirusTotal URL scan
const vtScan = await enricher.scanURL('https://example.com', {
  rescan: false,
  useCache: true
})

console.log(`VirusTotal Detection: ${vtScan.detectionRatio}`)
```

### Threat Context Enrichment

```typescript
// APT/Threat actor attribution
const context = await enricher.enrichThreatContext('192.168.1.1', {
  includeAPTGroups: true,
  includeCampaigns: true,
  includeMITRE: true,
  includeTools: true
})

if (context.aptGroups) {
  console.log('Associated APT Groups:')
  for (const group of context.aptGroups) {
    console.log(`- ${group.name} (confidence: ${group.confidence}%)`)
  }
}

// MITRE ATT&CK tactics
if (context.mitre) {
  console.log('MITRE ATT&CK Techniques:')
  for (const tactic of context.mitre.tactics) {
    console.log(`- ${tactic.name}: ${tactic.techniques.join(', ')}`)
  }
}

// Active campaigns
if (context.campaigns) {
  console.log('Active Campaigns:')
  for (const campaign of context.campaigns) {
    console.log(`- ${campaign.name} (${campaign.status})`)
  }
}
```

### Parallel Enrichment

```typescript
// Enrich multiple indicators in parallel
const indicators = [
  { type: 'IPv4', value: '192.168.1.1' },
  { type: 'domain', value: 'evil.com' },
  { type: 'hash_sha256', value: 'abc123' }
]

const enriched = await enricher.enrichParallel(indicators, {
  parallelLimit: 10,
  timeout: 10000,
  useCache: true,
  retryOnFailure: true,
  retryAttempts: 3
})

for (const result of enriched) {
  console.log(`${result.type}:${result.value} - Score: ${result.threatScore}`)
}
```

### Caching Configuration

```typescript
const cacheConfig = {
  // Redis-based caching
  backend: 'redis',
  host: 'localhost',
  port: 6379,
  db: 1,

  // TTL per indicator type
  ttl: {
    ip: 86400,        // 24 hours
    domain: 86400,    // 24 hours
    hash: 604800,     // 7 days
    url: 3600,        // 1 hour
    default: 3600
  },

  // Cache invalidation
  invalidateOn: [
    'feed-update',    // Invalidate on feed refresh
    'score-change'    // Invalidate on threat score change
  ],

  // Statistics
  enableStats: true
}

enricher.configureCache(cacheConfig)

// Monitor cache performance
const stats = enricher.getCacheStats()
console.log(`Hit Rate: ${(stats.hits / (stats.hits + stats.misses) * 100).toFixed(2)}%`)
```

---

## Threat Scoring Guide

### Scoring Dimensions Explained

The threat score is calculated across multiple dimensions:

```typescript
interface ThreatScoringDimensions {
  // Confidence: How certain is the threat intelligence
  confidence: number // 0-100

  // Source Reputation: Quality of sources reporting the indicator
  sourceReputation: number // 0-100

  // Temporal Relevance: How recent is the threat data
  temporalRelevance: number // 0-100

  // Severity: Potential impact if exploited
  severity: number // 0-100

  // Prevalence: How widespread is this indicator
  prevalence: number // 0-100
}
```

### Scoring Models

**1. Weighted Average Model**:

```typescript
const scoring = new WeightedAverageScoringModel({
  weights: {
    confidence: 0.25,
    sourceReputation: 0.20,
    temporalRelevance: 0.15,
    severity: 0.25,
    prevalence: 0.15
  },
  minSources: 2  // Require at least 2 sources
})

const score = scoring.calculateScore({
  confidence: 95,
  sourceReputation: 90,
  temporalRelevance: 85,
  severity: 95,
  prevalence: 70
})

console.log(`Threat Score: ${score.overallScore}/100`)
```

**2. Rule-Based Model**:

```typescript
const ruleScoring = new RuleBasedScoringModel()

// Add scoring rules
ruleScoring.addRule({
  name: 'CriticalMalware',
  condition: (ioc) => ioc.tags.includes('ransomware') && ioc.sourceCount >= 5,
  score: 95
})

ruleScoring.addRule({
  name: 'KnownBotnet',
  condition: (ioc) => ioc.tags.includes('botnet') && ioc.sourceCount >= 3,
  score: 85
})

ruleScoring.addRule({
  name: 'SingleSource',
  condition: (ioc) => ioc.sourceCount === 1,
  score: 40
})

const score = ruleScoring.calculateScore(ioc)
```

### Risk Levels

```typescript
enum RiskLevel {
  CRITICAL = 'critical', // 90-100: Immediate action required
  HIGH = 'high',         // 70-89: Close monitoring, prepare response
  MEDIUM = 'medium',     // 50-69: Monitor, implement controls
  LOW = 'low',          // 25-49: Track for context
  INFO = 'info'         // 0-24: Informational only
}

// Risk level assignment
function assignRiskLevel(score: number): RiskLevel {
  if (score >= 90) return RiskLevel.CRITICAL
  if (score >= 70) return RiskLevel.HIGH
  if (score >= 50) return RiskLevel.MEDIUM
  if (score >= 25) return RiskLevel.LOW
  return RiskLevel.INFO
}
```

### Custom Scoring Rules

```typescript
// Create custom scoring rules
const customRules = [
  {
    name: 'OrganizationSpecificRisk',
    priority: 100,
    evaluate: (ioc, context) => {
      // Higher risk for indicators targeting this organization
      if (context.organizationTargeted) return { modifier: 1.5 }
      return { modifier: 1.0 }
    }
  },
  {
    name: 'GeographicContext',
    priority: 50,
    evaluate: (ioc, context) => {
      // Risk varies by geographic source
      const riskByRegion = {
        'US': 0.8,
        'CN': 1.5,
        'RU': 1.3,
        'default': 1.0
      }
      const modifier = riskByRegion[ioc.sourceGeo] || riskByRegion.default
      return { modifier }
    }
  }
]

const scorer = new CustomScoringEngine(customRules)
const score = scorer.calculateScore(ioc, contextData)
```

### Score Calibration and Tuning

```typescript
// Calibrate scoring based on historical data
const calibration = await scorer.calibrate({
  historicalData: executionHistoryData,
  metrics: {
    falsePositiveRate: 0.05,  // Target 5% FP rate
    detectionRate: 0.95,      // Target 95% detection
    averageResponseTime: 300  // seconds
  },
  optimize: 'f1-score'  // Optimize F1 score
})

console.log(`Calibrated weights: ${JSON.stringify(calibration.weights, null, 2)}`)

// A/B test scoring models
const modelA = new ScoringModel('weighted-average', weightsA)
const modelB = new ScoringModel('machine-learning', modelB)

const comparison = await scorer.compareModels({
  modelA,
  modelB,
  testData: iocSamples,
  metrics: ['precision', 'recall', 'f1-score', 'auditPerfectScore']
})

console.log(`Model A F1-Score: ${comparison.modelA.f1Score}`)
console.log(`Model B F1-Score: ${comparison.modelB.f1Score}`)
```

### Alert Integration

```typescript
// Configure alerting based on threat scores
const alertConfig = {
  thresholds: {
    critical: { score: 90, action: 'immediate-block' },
    high: { score: 70, action: 'review-and-block' },
    medium: { score: 50, action: 'monitor' },
    low: { score: 25, action: 'track' }
  },

  channels: {
    critical: ['slack', 'email', 'sms', 'pagerduty'],
    high: ['slack', 'email'],
    medium: ['slack'],
    low: ['log']
  },

  escalation: {
    enableEscalation: true,
    levels: [
      { after: 300, notify: 'team-lead' },
      { after: 900, notify: 'ciso' },
      { after: 1800, notify: 'cto' }
    ]
  }
}

await scorer.configureAlerts(alertConfig)

// Scoring change alerts
scorer.on('scoreIncreased', (data) => {
  console.log(`ALERT: ${data.ioc.value} score increased from ${data.oldScore} to ${data.newScore}`)
})

scorer.on('riskLevelChanged', (data) => {
  console.log(`ALERT: ${data.ioc.value} risk level changed from ${data.oldLevel} to ${data.newLevel}`)
})
```

---

## Integration Examples

### End-to-End Threat Detection Workflow

```typescript
// 1. Initialize system
const tiManager = new ThreatIntelligenceManager()
await tiManager.initialize()

// 2. Add threat feeds
await tiManager.addFeed({ /* OTX config */ })
await tiManager.addFeed({ /* VirusTotal config */ })
await tiManager.addFeed({ /* AbuseIPDB config */ })

// 3. Monitor incoming traffic
async function analyzeTrafficEvent(event) {
  const { sourceIP, destinationDomain, fileHash } = event

  // Check each indicator
  const ipMatch = await tiManager.findExactMatch({
    type: 'IPv4',
    value: sourceIP
  })

  const domainMatch = await tiManager.findExactMatch({
    type: 'domain',
    value: destinationDomain
  })

  const hashMatch = await tiManager.findExactMatch({
    type: 'hash_sha256',
    value: fileHash
  })

  // Calculate combined threat score
  const threatScore = calculateCombinedScore([ipMatch, domainMatch, hashMatch])

  // Take action based on risk level
  if (threatScore >= 90) {
    await blockTraffic(event)
    await createIncident(event, threatScore)
  } else if (threatScore >= 70) {
    await quarantineFile(event)
    await createAlert(event, threatScore)
  }
}

// 4. Enrich alerts with context
async function enrichAlert(alert) {
  const enrichment = await tiManager.enrich(alert.indicator)

  return {
    ...alert,
    geo: enrichment.geo,
    whois: enrichment.whois,
    reputation: enrichment.reputation,
    threatActors: enrichment.threatActors,
    campaigns: enrichment.campaigns
  }
}
```

### SIEM Integration

```typescript
// Send threat indicators to SIEM
const siemConnector = new SIEMConnector({
  type: 'splunk',
  endpoint: process.env.SPLUNK_ENDPOINT,
  token: process.env.SPLUNK_HEC_TOKEN
})

// Send new IOCs as they're discovered
tiManager.on('iocCreated', async (ioc) => {
  await siemConnector.sendEvent({
    event: 'threat_indicator',
    data: {
      type: ioc.type,
      value: ioc.value,
      score: ioc.threatScore,
      source: ioc.source,
      timestamp: new Date().toISOString()
    }
  })
})

// Send enrichment updates
tiManager.on('iocEnriched', async (data) => {
  await siemConnector.sendEvent({
    event: 'enrichment_update',
    data: {
      ioc: data.ioc.value,
      enrichment: data.enrichmentData,
      timestamp: new Date().toISOString()
    }
  })
})

// Send scoring updates
tiManager.on('scoreChanged', async (data) => {
  await siemConnector.sendEvent({
    event: 'threat_score_update',
    data: {
      ioc: data.ioc.value,
      oldScore: data.oldScore,
      newScore: data.newScore,
      reason: data.reason,
      timestamp: new Date().toISOString()
    }
  })
})
```

### Automated Response

```typescript
// Configure automated response actions
const responseEngine = new AutomatedResponseEngine()

responseEngine.registerAction('critical', async (ioc) => {
  // Block in firewall
  await firewall.addBlockRule({
    type: ioc.type,
    value: ioc.value,
    reason: 'Automated threat response',
    duration: '24h'
  })

  // Quarantine related files
  if (ioc.type === 'hash_sha256') {
    await fileSystem.quarantine({
      hash: ioc.value,
      reason: 'Malware detected'
    })
  }

  // Create incident ticket
  await ticketSystem.create({
    title: `Critical Threat: ${ioc.value}`,
    priority: 'critical',
    description: `Detected critical threat indicator: ${ioc.value}`,
    tags: ioc.tags
  })
})

responseEngine.registerAction('high', async (ioc) => {
  // Add to monitoring list
  await monitoring.addToWatchlist({
    indicator: ioc.value,
    alert: true,
    alertThreshold: 'any'
  })

  // Create low-priority ticket
  await ticketSystem.create({
    title: `High-Risk Threat: ${ioc.value}`,
    priority: 'high'
  })
})

// Execute response
tiManager.on('threatDetected', async (detection) => {
  const riskLevel = assignRiskLevel(detection.score)
  await responseEngine.executeAction(riskLevel, detection.ioc)
})
```

---

## Best Practices

### Feed Selection and Prioritization

1. **Start with high-quality feeds**: OTX and ThreatFox for broad coverage
2. **Add specialized feeds**: VirusTotal for file reputation, AbuseIPDB for IP analysis
3. **Prioritize by use case**: Financial sector → payment card fraud feeds
4. **Monitor feed quality**: Track false positive rates and adjust weights
5. **Update regularly**: Most feeds update hourly or daily

### IOC Lifecycle Management

- **Creation**: Add IOCs within 4 hours of discovery
- **Enrichment**: Enrich within 24 hours
- **Monitoring**: Active monitoring for 30-90 days
- **Deprecation**: Mark as dormant after 90 days without sightings
- **Archival**: Archive after 6 months

### False Positive Reduction

```typescript
// Implement false positive detection
const fpDetector = new FalsePositiveDetector()

fpDetector.addRule({
  name: 'InternalNetwork',
  condition: (ioc) => ioc.type === 'IPv4' && isInternalNetwork(ioc.value),
  action: 'mark-internal'
})

fpDetector.addRule({
  name: 'LegitimateService',
  condition: (ioc) => ioc.type === 'domain' && isLegitimateService(ioc.value),
  action: 'whitelist'
})

// Review and tune FP rules based on feedback
const fpRate = await calculateFPRate()
if (fpRate > 0.1) { // > 10% FP rate
  console.warn('High false positive rate detected')
  await optimizeRules()
}
```

### Performance Optimization

- Use caching with 24-hour TTL for stable indicators
- Batch enrichment requests
- Implement rate limiting awareness
- Parallelize operations where possible
- Use approximate matching for large datasets

### Security Considerations

- Encrypt sensitive IOCs at rest
- Restrict IOC access by role
- Audit IOC modifications
- Implement TLS for feed connections
- Validate feed signatures

---

## Troubleshooting

### Common Issues and Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Feed sync failures | API rate limits | Implement exponential backoff, reduce refresh rate |
| High false positive rate | Poor scoring calibration | Retrain models with historical data |
| Slow enrichment | Missing cache | Enable Redis caching, increase TTL |
| IOC deduplication issues | Duplicate detection broken | Review matching logic, rebuild index |
| Memory usage spike | Large batch operations | Implement streaming, reduce batch size |
| Feed authentication errors | Invalid credentials | Verify API keys, check token expiration |
| Scoring inconsistencies | Rule conflicts | Review custom rules, test rule precedence |
| Missing enrichment data | Source unavailable | Add fallback source, implement retry |

### Debug Logging

```typescript
// Enable comprehensive debug logging
import { logger } from './logging'

logger.setLevel('debug')
logger.enableModule('threat-intelligence')

// Monitor specific operations
tiManager.on('feedUpdate', (data) => {
  logger.debug('Feed update:', {
    feed: data.feedName,
    iocCount: data.iocCount,
    duration: data.duration
  })
})

tiManager.on('enrichment', (data) => {
  logger.debug('Enrichment result:', {
    ioc: data.ioc.value,
    sources: data.sources,
    duration: data.duration
  })
})
```

### Feed Health Monitoring

```typescript
// Monitor feed health
const healthMonitor = new FeedHealthMonitor()

healthMonitor.addMetric('update-frequency', {
  expected: 'hourly',
  tolerance: 30 // minutes
})

healthMonitor.addMetric('data-quality', {
  expectedValidation: 0.95,
  tolerance: 0.05
})

const health = await healthMonitor.getHealth()
if (health.status !== 'healthy') {
  console.warn(`Feed health issues: ${health.issues.join(', ')}`)
}
```

---

## API Reference

### Core Classes

**ThreatIntelligenceManager**

```typescript
class ThreatIntelligenceManager {
  // Feed management
  addFeed(config: FeedConfig): Promise<void>
  removeFeed(feedName: string): Promise<void>
  getFeed(feedName: string): Promise<Feed>
  listFeeds(): Promise<Feed[]>

  // IOC management
  createIOC(data: IOCData): Promise<IOC>
  updateIOC(iocId: string, updates: Partial<IOC>): Promise<IOC>
  deleteIOC(iocId: string): Promise<void>
  getIOC(iocId: string): Promise<IOC>

  // Searching and matching
  searchIOCs(query: SearchQuery): Promise<SearchResults>
  findExactMatch(criteria: MatchCriteria): Promise<IOC | null>
  findExactMatches(criteria: BatchMatchCriteria): Promise<IOC[]>
  findCIDRMatches(ip: string, ranges: string[]): Promise<IOC[]>
  findDomainMatches(domain: string, options?: MatchOptions): Promise<IOC[]>

  // Enrichment
  enrichIOC(ioc: IOC, options?: EnrichmentOptions): Promise<EnrichedIOC>
  batchEnrichIOCs(iocs: IOC[]): Promise<EnrichedIOC[]>
  enrichParallel(iocs: IOC[], options?: ParallelOptions): Promise<EnrichedIOC[]>

  // Scoring
  calculateScore(ioc: IOC): Promise<number>
  assignRiskLevel(score: number): RiskLevel

  // Lifecycle
  setIOCExpiration(iocId: string, expiration: ExpirationConfig): Promise<void>
  archiveOldIOCs(criteria: ArchiveCriteria): Promise<void>

  // Bulk operations
  bulkImportIOCs(data: BulkImportData): Promise<BulkImportResult>
  bulkExportIOCs(filters: ExportFilters): Promise<IOC[]>
  bulkUpdateIOCs(updates: BulkUpdateData): Promise<BulkUpdateResult>
}
```

**EnrichmentPipeline**

```typescript
class EnrichmentPipeline {
  enrichIP(ip: string, options?: EnrichmentOptions): Promise<IPEnrichment>
  enrichDomain(domain: string, options?: EnrichmentOptions): Promise<DomainEnrichment>
  enrichHash(hash: string, options?: EnrichmentOptions): Promise<HashEnrichment>
  enrichURL(url: string, options?: EnrichmentOptions): Promise<URLEnrichment>
  enrichThreatContext(ioc: string, options?: EnrichmentOptions): Promise<ThreatContext>
}
```

**ThreatScoringEngine**

```typescript
class ThreatScoringEngine {
  calculateScore(ioc: IOC, context?: ScoringContext): Promise<number>
  calculateDetailedScore(ioc: IOC): Promise<ScoringResult>
  configureAlerts(config: AlertConfig): Promise<void>
  compareModels(modelA: ScoringModel, modelB: ScoringModel): Promise<ComparisonResult>
}
```

---

## Configuration Options

All configuration is environment-based with sensible defaults:

```typescript
interface ThreatIntelligenceConfig {
  // Feed configuration
  feeds: FeedConfig[]
  feedRefreshInterval: number // minutes
  feedCacheTTL: number // seconds

  // Enrichment configuration
  enrichmentSources: EnrichmentSourceConfig[]
  enrichmentTimeout: number // milliseconds
  enableParallelEnrichment: boolean
  enrichmentCacheConfig: CacheConfig

  // Scoring configuration
  scoringModel: 'weighted-average' | 'rule-based' | 'machine-learning'
  customRules: ScoringRule[]
  minSourcesForScore: number

  // Alert configuration
  alertingEnabled: boolean
  alertChannels: AlertChannel[]
  escalationRules: EscalationRule[]
}
```

---

**Total Documentation Lines**: ~2,500

This comprehensive guide covers all aspects of the Threat Intelligence system with production-ready examples, configuration patterns, and best practices for enterprise deployment.
