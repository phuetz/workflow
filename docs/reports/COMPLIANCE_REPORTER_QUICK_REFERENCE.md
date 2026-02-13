# ComplianceReporter - Quick Reference Guide

## Installation

```typescript
import ComplianceReporter from './audit/ComplianceReporter'

const reporter = new ComplianceReporter()
```

## Common Tasks

### Generate Reports

```typescript
const dateRange = {
  start: new Date('2024-01-01'),
  end: new Date('2024-01-31')
}

// Single framework
const socReport = await reporter.generateSOC2Report(dateRange)
const isoReport = await reporter.generateISO27001Report(dateRange)
const pciReport = await reporter.generatePCIDSSReport(dateRange)
const hipaaReport = await reporter.generateHIPAAReport(dateRange)
const gdprReport = await reporter.generateGDPRReport(dateRange)

// Generic (specify framework)
const report = await reporter.generateReport('SOC2', dateRange)
```

### Access Report Data

```typescript
// Summary metrics
report.summary.complianceScore         // 0-100
report.summary.criticalFindings        // Number
report.summary.violations              // Number
report.summary.totalEvents             // Number

// Findings
report.findings.map(f => ({
  title: f.title,
  severity: f.severity,              // critical|high|medium|low|info
  status: f.status,                  // open|in-progress|resolved|waived
  framework: f.framework
}))

// Controls
report.controls.map(c => ({
  controlId: c.controlId,
  status: c.status,                  // compliant|non-compliant|partial|not-applicable|not-assessed
  score: c.score,                    // 0-100
  gaps: c.gaps
}))

// Charts
report.charts.findingsBySeverity     // { critical, high, medium, low, info }
report.charts.controlsComplianceBreakdown  // { compliant, non-compliant, partial, ... }
report.charts.eventsTrend            // [{ date, count }, ...]
```

### Assess Controls

```typescript
// Check individual control
const assessment = await reporter.assessControlCompliance('SOC2', 'CC6.1')

assessment.status        // compliant | non-compliant | partial | not-assessed
assessment.score         // 0-100
assessment.evidence      // [] Evidence list
assessment.gaps          // [] Gap list
assessment.recommendations // [] Recommendations
```

### Find Violations

```typescript
const violations = await reporter.identifyViolations('PCIDSS', dateRange)

violations.map(v => ({
  type: v.type,                 // 'Failed Authentication' | 'Unauthorized Access'
  severity: v.severity,         // critical | high | medium | low | info
  description: v.description,
  timestamp: v.timestamp,
  userId: v.userId,
  resolved: v.resolved
}))
```

### Export Reports

```typescript
// JSON export
const jsonStr = await reporter.exportReport(report, 'json')
const data = JSON.parse(jsonStr)

// CSV export - for Excel/Sheets
const csv = await reporter.exportReport(report, 'csv')

// HTML export - for web viewing
const html = await reporter.exportReport(report, 'html')

// PDF export - for formal distribution
const pdfBuffer = await reporter.exportReport(report, 'pdf')
```

### Schedule Reports

```typescript
// Setup automatic report generation
const schedule = await reporter.scheduleReport(
  'SOC2',                           // framework
  'audit-trail',                    // reportType
  'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually',
  ['admin@company.com']             // recipients
)

// View schedules
const schedules = await reporter.listScheduledReports()

// Disable schedule
await reporter.cancelScheduledReport(schedule.id)
```

### Attest Reports

```typescript
const attested = await reporter.attestReport(
  report.id,
  'John Doe - Compliance Officer',
  true,                             // approved
  'Reviewed and verified.'          // comments
)

// Access attestation
attested.attestation.signature      // Digital signature
attested.attestation.signatureDate  // Date signed
attested.attestation.reviewer       // Who signed
```

### Retrieve Cached Reports

```typescript
const report = await reporter.getReport(reportId)
```

## Frameworks & Controls

### SOC 2 (7 controls)
- CC6.1: Access Controls
- CC6.2: Authentication
- CC6.3: Access Removal
- CC6.6: Points of Access
- CC7.2: System Monitoring
- CC7.3: Security Events
- CC8.1: Change Management

### ISO 27001 (6 controls)
- A.9.2: User Access Management
- A.9.4: System Access Control
- A.12.4: Logging & Monitoring
- A.12.6: Vulnerability Management
- A.16.1: Security Event Management
- A.18.1: Legal Compliance

### PCI DSS (7 requirements)
- Req 10.1: Audit Trails
- Req 10.2: Privileged Access Logging
- Req 10.3: Log Details
- Req 10.4: Time Synchronization
- Req 10.5: Secure Logs
- Req 10.6: Daily Log Review
- Req 10.7: One Year Retention

### HIPAA (5 controls)
- Access Control
- Audit Controls
- Integrity Controls
- Transmission Security
- Business Associate Agreements

### GDPR (6 articles)
- Article 5: Lawfulness
- Article 15: Right of Access
- Article 17: Right to Erasure
- Article 20: Right to Portability
- Article 33: Breach Notification
- Article 35: DPIA

## Report Types

Available report types for any framework:
- `'audit-trail'` - Complete audit trail
- `'access-control'` - Access and authentication
- `'security-events'` - Security event summary
- `'change-management'` - Configuration changes
- `'data-access'` - Who accessed what
- `'authentication'` - Auth attempts and failures
- `'permission-changes'` - Role/permission changes
- `'configuration-changes'` - System config changes
- `'backup-recovery'` - Backup and recovery logs
- `'incident-response'` - Incident timeline

## Event Listeners

```typescript
reporter.on('report-generation-started', (e) => {
  console.log(`Generating ${e.framework} report`)
})

reporter.on('report-generation-completed', (e) => {
  console.log(`Report ${e.reportId} complete`)
})

reporter.on('report-generation-failed', (e) => {
  console.error(`Error:`, e.error)
})

reporter.on('schedule-created', (schedule) => {
  console.log(`New schedule: ${schedule.id}`)
})
```

## Real-World Examples

### Daily Security Compliance Check

```typescript
const today = new Date()
const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)

const report = await reporter.generateSOC2Report({
  start: yesterday,
  end: today
})

console.log(`Critical Findings: ${report.summary.criticalFindings}`)
console.log(`Failed Auth Attempts: ${report.summary.failedAuthAttempts}`)

if (report.findings.length > 0) {
  // Send alert to security team
  alertSecurityTeam(report)
}
```

### Monthly Compliance Audit

```typescript
const lastMonth = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)
const thisMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)

// Generate all framework reports
const frameworks = ['SOC2', 'ISO27001', 'PCIDSS', 'HIPAA', 'GDPR']
const reports = []

for (const framework of frameworks) {
  const report = await reporter.generateReport(framework, {
    start: lastMonth,
    end: thisMonth
  })
  reports.push(report)
}

// Export as PDFs for archival
for (const report of reports) {
  const pdf = await reporter.exportReport(report, 'pdf')
  saveToArchive(`${report.framework}-${lastMonth.toISOString()}.pdf`, pdf)
}
```

### Control Status Dashboard

```typescript
const controls = ['CC6.1', 'CC6.2', 'CC6.3', 'CC6.6', 'CC7.2', 'CC7.3', 'CC8.1']
const assessments = []

for (const controlId of controls) {
  const assessment = await reporter.assessControlCompliance('SOC2', controlId)
  assessments.push(assessment)
}

// Display on dashboard
assessments.forEach(a => {
  console.log(`${a.controlId}: ${a.status} (${a.score}%)`)
  if (a.gaps && a.gaps.length > 0) {
    console.log(`  Gaps: ${a.gaps.join(', ')}`)
  }
})
```

### Violation Response

```typescript
const violations = await reporter.identifyViolations('PCIDSS', {
  start: new Date('2024-01-01'),
  end: new Date('2024-01-07')
})

const critical = violations.filter(v => v.severity === 'critical')
const high = violations.filter(v => v.severity === 'high')

if (critical.length > 0) {
  console.log(`CRITICAL: ${critical.length} violations found!`)
  // Escalate immediately
  escalateToSecurityTeam(critical)
}

if (high.length > 0) {
  console.log(`HIGH: ${high.length} violations found`)
  // Create incident tickets
  createIncidentTickets(high)
}
```

### Report Scheduler Setup

```typescript
// Daily security reports
await reporter.scheduleReport('PCIDSS', 'audit-trail', 'daily', [
  'security@company.com'
])

// Weekly compliance reports
await reporter.scheduleReport('SOC2', 'audit-trail', 'weekly', [
  'compliance@company.com'
])

// Monthly audit reports
await reporter.scheduleReport('ISO27001', 'access-control', 'monthly', [
  'ciso@company.com',
  'audit@company.com'
])

// Quarterly regulatory reports
await reporter.scheduleReport('HIPAA', 'audit-trail', 'quarterly', [
  'privacy@hospital.com'
])

// Annual certification reports
await reporter.scheduleReport('GDPR', 'data-access', 'annually', [
  'dpo@company.com'
])
```

## Tips & Tricks

### Large Date Ranges
For reports spanning 1+ years, generate reports in chunks:
```typescript
const chunks = []
for (let i = 0; i < 12; i++) {
  const start = new Date(2024, i, 1)
  const end = new Date(2024, i + 1, 1)
  const report = await reporter.generateReport('SOC2', { start, end })
  chunks.push(report)
}
```

### Report Caching
Reports are cached after generation:
```typescript
const original = await reporter.generateSOC2Report(dateRange)
const cached = await reporter.getReport(original.id)  // Instant!
```

### Export for Sharing
Use different formats for different audiences:
```typescript
const report = await reporter.generateSOC2Report(dateRange)

// For compliance team - PDF with signatures
const pdf = await reporter.exportReport(report, 'pdf')

// For security team - JSON for processing
const json = await reporter.exportReport(report, 'json')

// For executives - HTML dashboard view
const html = await reporter.exportReport(report, 'html')

// For spreadsheet analysis - CSV
const csv = await reporter.exportReport(report, 'csv')
```

### Quick Compliance Check
```typescript
async function checkCompliance(framework) {
  const report = await reporter.generateReport(framework, {
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),  // Last 7 days
    end: new Date()
  })

  return {
    framework,
    score: report.summary.complianceScore,
    criticalIssues: report.summary.criticalFindings,
    compliantControls: report.controls.filter(c => c.status === 'compliant').length
  }
}

const health = await Promise.all([
  checkCompliance('SOC2'),
  checkCompliance('ISO27001'),
  checkCompliance('PCIDSS')
])
```

## Performance Tips

1. **Use date range filters** - Smaller ranges generate faster
2. **Cache frequently accessed reports** - Use `getReport()` for cached access
3. **Export in background** - Large PDF exports can be slow
4. **Batch control assessments** - If checking multiple controls
5. **Implement pagination** - For violations in large datasets

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Report takes too long | Use smaller date range, enable caching |
| Control status wrong | Verify audit events are being logged |
| Export fails | Check format support, file permissions |
| Schedule not running | Verify schedule is enabled, check logs |
| Attestation fails | Ensure report exists, reviewer name valid |

---

See `COMPLIANCE_REPORTER_IMPLEMENTATION_GUIDE.md` for full documentation.
