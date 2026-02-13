# Compliance Automation Guide

## Week 21: Enterprise Compliance Automation System

This comprehensive guide covers the Workflow Automation Platform's enterprise-grade compliance automation system, designed to help organizations achieve and maintain compliance with major regulatory frameworks.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Supported Frameworks](#2-supported-frameworks)
3. [ComplianceAutomationEngine](#3-complianceautomationengine)
4. [RegulatoryFrameworkManager](#4-regulatoryframeworkmanager)
5. [ComplianceReportGenerator](#5-compliancereportgenerator)
6. [Control Assessment Workflow](#6-control-assessment-workflow)
7. [Evidence Collection Process](#7-evidence-collection-process)
8. [Gap Analysis and Remediation](#8-gap-analysis-and-remediation)
9. [Policy Enforcement Configuration](#9-policy-enforcement-configuration)
10. [Report Generation and Scheduling](#10-report-generation-and-scheduling)
11. [GRC Platform Integration](#11-grc-platform-integration)
12. [Best Practices and Troubleshooting](#12-best-practices-and-troubleshooting)

---

## 1. Overview

The Compliance Automation System provides enterprise-grade compliance management capabilities, enabling organizations to:

- **Automate control assessments** across 10+ regulatory frameworks
- **Continuously monitor** compliance status with real-time alerts
- **Collect and manage evidence** with automated and manual collection methods
- **Perform gap analysis** with prioritized remediation recommendations
- **Generate executive and audit reports** in multiple formats
- **Integrate with GRC platforms** like ServiceNow, RSA Archer, and MetricStream
- **Enforce policies** with automatic remediation capabilities

### Architecture Overview

```
+-------------------------------------------+
|        Compliance Automation System        |
+-------------------------------------------+
|                                           |
|  +----------------+  +------------------+ |
|  | Automation     |  | Framework        | |
|  | Engine         |  | Manager          | |
|  +-------+--------+  +--------+---------+ |
|          |                    |           |
|          v                    v           |
|  +-------+--------------------+---------+ |
|  |     Unified Control Library          | |
|  +-------+--------------------+---------+ |
|          |                    |           |
|  +-------v--------+  +--------v---------+ |
|  | Evidence       |  | Report           | |
|  | Collection     |  | Generator        | |
|  +----------------+  +------------------+ |
|                                           |
|  +----------------+  +------------------+ |
|  | Policy         |  | GRC Platform     | |
|  | Enforcement    |  | Integration      | |
|  +----------------+  +------------------+ |
+-------------------------------------------+
```

### Key Components

| Component | Description | Location |
|-----------|-------------|----------|
| `ComplianceAutomationEngine` | Core automation engine for control assessment | `src/compliance/automation/ComplianceAutomationEngine.ts` |
| `RegulatoryFrameworkManager` | Framework definitions and control mappings | `src/compliance/automation/RegulatoryFrameworkManager.ts` |
| `ComplianceReportGenerator` | Report generation and scheduling | `src/compliance/automation/ComplianceReportGenerator.ts` |
| `ComplianceManager` | High-level compliance orchestration | `src/compliance/ComplianceManager.ts` |

---

## 2. Supported Frameworks

The platform supports 10 major compliance frameworks out of the box:

### Primary Frameworks

| Framework | Full Name | Controls | Industries |
|-----------|-----------|----------|------------|
| **SOC2** | Service Organization Control 2 | 64 | SaaS, Cloud Services, Technology |
| **ISO27001** | Information Security Management System | 114 | All Industries |
| **HIPAA** | Health Insurance Portability and Accountability Act | 45 | Healthcare, Medical |
| **GDPR** | General Data Protection Regulation | 99 | All Industries (EU/EEA) |
| **PCI-DSS** | Payment Card Industry Data Security Standard | 12 | Financial, Retail |

### Additional Frameworks

| Framework | Full Name | Controls | Industries |
|-----------|-----------|----------|------------|
| **NIST CSF** | NIST Cybersecurity Framework | 80 | All Industries, Critical Infrastructure |
| **FedRAMP** | Federal Risk and Authorization Management | 325 | Government, Defense |
| **CCPA** | California Consumer Privacy Act | 6 | All Industries (California) |
| **SOX** | Sarbanes-Oxley Act | 6 | Public Companies |
| **GLBA** | Gramm-Leach-Bliley Act | 9 | Financial Institutions |

### Framework Types and Enums

```typescript
import { ComplianceFrameworkType } from './ComplianceAutomationEngine';

// Available framework types
enum ComplianceFrameworkType {
  SOC2 = 'SOC2',
  ISO27001 = 'ISO27001',
  HIPAA = 'HIPAA',
  GDPR = 'GDPR',
  PCI_DSS = 'PCI_DSS',
  NIST = 'NIST',
  FEDRAMP = 'FEDRAMP',
  CCPA = 'CCPA',
  SOX = 'SOX',
  GLBA = 'GLBA',
}
```

### Framework-Specific Features

#### SOC2 Trust Service Principles
- **CC** - Common Criteria (Security)
- **A** - Availability
- **C** - Confidentiality
- **I** - Processing Integrity
- **P** - Privacy

#### HIPAA Safeguard Categories
- Administrative Safeguards
- Physical Safeguards
- Technical Safeguards
- Organizational Requirements

#### GDPR Data Subject Rights
- Right to Access
- Right to Rectification
- Right to Erasure
- Right to Data Portability
- Right to Restriction
- Right to Object

---

## 3. ComplianceAutomationEngine

The `ComplianceAutomationEngine` is the core component that automates control assessments, evidence collection, and compliance monitoring.

### Initialization

```typescript
import ComplianceAutomationEngine from './src/compliance/automation/ComplianceAutomationEngine';

// Get singleton instance
const engine = ComplianceAutomationEngine.getInstance();

// Start continuous monitoring
engine.startMonitoring();

// Listen to events
engine.on('control:assessed', ({ assessment, control }) => {
  console.log(`Control ${control.name} assessed with score ${assessment.score}`);
});

engine.on('gap:created', ({ gap }) => {
  console.log(`New gap identified: ${gap.gapDescription}`);
});

engine.on('alert:created', ({ alert }) => {
  console.log(`Alert: ${alert.title} - ${alert.severity}`);
});
```

### Control Assessment

```typescript
// Assess a specific control
const assessment = await engine.assessControl(
  'soc2_cc1.1',  // Control ID
  'auditor@company.com',  // Assessor
  {
    collectEvidence: true,
    runAutomation: true,
    notes: 'Quarterly assessment'
  }
);

console.log(`Assessment result:
  Status: ${assessment.status}
  Score: ${assessment.score}
  Findings: ${assessment.findings.length}
  Remediation Required: ${assessment.remediationRequired}
`);
```

### Running Full Compliance Checks

```typescript
// Run comprehensive compliance check for a framework
const result = await engine.runComplianceCheck(
  ComplianceFrameworkType.SOC2,
  {
    fullAssessment: true,
    collectEvidence: true,
    assessedBy: 'compliance-system'
  }
);

console.log(`
Framework: ${result.framework}
Overall Score: ${result.score.overallScore}
Trend: ${result.score.trend}
Critical Gaps: ${result.score.criticalGaps}
High Gaps: ${result.score.highGaps}
`);

// Access individual assessments
result.assessments.forEach(assessment => {
  console.log(`  Control: ${assessment.controlId}, Score: ${assessment.score}`);
});
```

### Compliance Scoring

```typescript
// Get compliance score for a framework
const score = await engine.getComplianceScore(ComplianceFrameworkType.ISO27001);

console.log(`
ISO 27001 Compliance:
  Overall Score: ${score.overallScore.toFixed(2)}%
  Weighted Score: ${score.weightedScore.toFixed(2)}%
  Trend: ${score.trend}
  Last Assessed: ${score.lastAssessed.toISOString()}
  Next Due: ${score.nextAssessmentDue.toISOString()}
`);

// Access scores by category
score.categoryScores.forEach((categoryScore, category) => {
  console.log(`  ${category}: ${categoryScore.toFixed(2)}%`);
});

// Historical trend data
score.historicalScores.forEach(point => {
  console.log(`  ${point.date.toISOString()}: ${point.score}%`);
});
```

### Control Mapping Across Frameworks

```typescript
// Get unified control library
const unifiedControls = engine.mapControlsAcrossFrameworks();

// View mappings for a specific unified control
unifiedControls.forEach((control, id) => {
  console.log(`\nUnified Control: ${control.name}`);
  console.log(`Category: ${control.category}`);

  control.frameworkMappings.forEach((controlIds, framework) => {
    console.log(`  ${framework}: ${controlIds.join(', ')}`);
  });
});

// Get specific framework-to-framework mappings
const mappings = engine.getControlMappings(
  ComplianceFrameworkType.SOC2,
  ComplianceFrameworkType.ISO27001
);

mappings.forEach(mapping => {
  console.log(`${mapping.sourceControlId} -> ${mapping.targetControlId} (${mapping.mappingStrength})`);
});
```

### Control Status Types

```typescript
enum ControlStatus {
  COMPLIANT = 'compliant',
  NON_COMPLIANT = 'non_compliant',
  PARTIALLY_COMPLIANT = 'partially_compliant',
  NOT_ASSESSED = 'not_assessed',
  IN_PROGRESS = 'in_progress',
  NOT_APPLICABLE = 'not_applicable',
  EXCEPTION_GRANTED = 'exception_granted',
}
```

### Assessment Types

```typescript
enum AssessmentType {
  AUTOMATED = 'automated',      // Fully automated assessment
  MANUAL = 'manual',            // Human-performed assessment
  HYBRID = 'hybrid',            // Combination of automated and manual
  CONTINUOUS = 'continuous',    // Real-time monitoring
}
```

---

## 4. RegulatoryFrameworkManager

The `RegulatoryFrameworkManager` provides comprehensive framework definitions, control libraries, and applicability assessments.

### Loading Frameworks

```typescript
import RegulatoryFrameworkManager from './src/compliance/automation/RegulatoryFrameworkManager';

const frameworkManager = RegulatoryFrameworkManager.getInstance();

// Load a specific framework
const soc2 = await frameworkManager.loadFramework('soc2');

console.log(`
Framework: ${soc2.fullName}
Version: ${soc2.version}
Controls: ${soc2.controls.length}
Industries: ${soc2.applicableIndustries.join(', ')}
`);

// Access framework sections
soc2.sections?.forEach(section => {
  console.log(`Section: ${section.name}`);
  console.log(`  Controls: ${section.controlIds.length}`);
});

// Access trust principles (SOC2 specific)
soc2.principles?.forEach(principle => {
  console.log(`Principle: ${principle.name} - ${principle.trustComponent}`);
});
```

### Getting Control Details

```typescript
// Get detailed control information
const control = frameworkManager.getControlDetails('soc2', 'cc1.1');

console.log(`
Control: ${control.title}
Description: ${control.description}
Category: ${control.controlCategory}
Type: ${control.controlType}
Implementation Level: ${control.implementationLevel}
Frequency: ${control.frequency}
Priority: ${control.priority}

Requirements:
${control.requirements?.map(r => `  - ${r}`).join('\n')}

Evidence Needed:
${control.evidence?.map(e => `  - ${e}`).join('\n')}

Testing Requirements:
${control.testingRequirements?.map(t => `  - ${t.name} (${t.frequency})`).join('\n')}
`);
```

### Assessing Framework Applicability

```typescript
// Define organization profile
const orgProfile = {
  industry: 'Healthcare',
  geography: ['United States', 'EU'],
  dataTypes: ['PHI', 'PII', 'Financial'],
  regulations: ['HIPAA', 'GDPR'],
  organizationSize: 'Large Enterprise',
  businessModel: 'B2B SaaS',
  dataProcessingAreas: ['Medical Records', 'Billing', 'Claims']
};

// Get applicable frameworks
const applicableFrameworks = frameworkManager.assessApplicability(orgProfile);

applicableFrameworks.forEach(framework => {
  console.log(`
Framework: ${framework.frameworkName}
Applicability Score: ${framework.applicabilityScore}
Reasoning:
${framework.reasoning.map(r => `  - ${r}`).join('\n')}

Mandatory Controls: ${framework.mandatoryControls.length}
Optional Controls: ${framework.optionalControls.length}
Est. Implementation Effort: ${framework.estimatedImplementationEffort} hours
`);
});
```

### Creating Custom Frameworks

```typescript
// Create organization-specific framework
const customFramework = frameworkManager.createCustomFramework({
  name: 'Company Security Standard',
  description: 'Internal security controls combining SOC2 and ISO27001',
  baseFrameworks: ['soc2', 'iso27001'],
  customControls: [
    {
      id: 'custom_1',
      title: 'Vendor Security Assessment',
      description: 'All vendors must complete security assessment',
      controlCategory: 'vendor-management',
      controlType: 'preventive',
      implementationLevel: 'advanced',
      frequency: 'annually',
      testingRequirements: [{
        name: 'Vendor Assessment Review',
        frequency: 'annually',
        methodology: 'questionnaire review',
        documentationNeeded: ['assessment responses'],
        acceptanceCriteria: ['Score > 80%'],
        estimatedHours: 8
      }],
      evidence: ['vendor assessments', 'risk ratings'],
      priority: 8,
      riskMitigation: ['Reduces third-party risk'],
      relatedControls: [],
      auditSteps: ['Review vendor list', 'Verify assessments complete']
    }
  ],
  organizationId: 'org_123'
});

console.log(`Custom framework created: ${customFramework.id}`);
```

### Tracking Regulatory Changes

```typescript
// Add regulatory update notification
frameworkManager.addRegulatoryUpdate({
  id: 'update_gdpr_2024',
  frameworkId: 'gdpr',
  date: new Date('2024-06-01'),
  updateType: 'amended_control',
  controlId: 'gdpr_45',
  description: 'Updated data transfer requirements',
  effectiveDate: new Date('2024-09-01'),
  impactLevel: 'high',
  affectedIndustries: ['All'],
  migrationPath: 'Review and update data transfer agreements'
});

// Track changes for a framework
const gdprFramework = await frameworkManager.loadFramework('gdpr');
const updates = frameworkManager.trackRegulatoryChanges(gdprFramework);

updates.forEach(update => {
  console.log(`
Update: ${update.description}
Effective: ${update.effectiveDate.toISOString()}
Impact: ${update.impactLevel}
Migration: ${update.migrationPath}
`);
});
```

### Control Coverage Calculation

```typescript
// Calculate control coverage across frameworks
const coverage = frameworkManager.calculateControlCoverage(['soc2', 'iso27001']);

console.log(`
Coverage Report for ${coverage.frameworkId}:
  Total Controls: ${coverage.totalControls}
  Implemented: ${coverage.implementedControls} (${coverage.coveragePercentage.toFixed(1)}%)
  Partially Implemented: ${coverage.partiallyImplementedControls}
  Not Implemented: ${coverage.notImplementedControls}

Implementation by Category:
${Object.entries(coverage.implementationByCategory)
  .map(([cat, count]) => `  ${cat}: ${count} controls`)
  .join('\n')}

Recommendations:
${coverage.recommendations.map(r => `  - ${r}`).join('\n')}

Est. Completion: ${coverage.estimatedCompletionDate.toISOString()}
`);
```

---

## 5. ComplianceReportGenerator

The `ComplianceReportGenerator` creates comprehensive compliance reports with scheduling and multi-channel distribution.

### Generating Reports

```typescript
import ComplianceReportGenerator, {
  ReportType,
  ReportFormat,
  StakeholderView
} from './src/compliance/automation/ComplianceReportGenerator';

const reportGenerator = ComplianceReportGenerator.getInstance();

// Generate executive summary report
const report = await reportGenerator.generateReport({
  reportType: ReportType.EXECUTIVE_SUMMARY,
  frameworks: [ComplianceFramework.SOC2, ComplianceFramework.ISO27001],
  format: ReportFormat.PDF,
  period: {
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-03-31'),
    label: 'Q1 2024'
  },
  stakeholderView: StakeholderView.BOARD,
  generatedBy: 'compliance-team',
  includeEvidence: false,
  includeRecommendations: true
});

console.log(`
Report Generated:
  ID: ${report.id}
  Title: ${report.content.title}
  Format: ${report.format}
  Status: ${report.status}
  Download: ${report.downloadUrl}
  Expires: ${report.expiresAt?.toISOString()}
`);

// Access executive summary
const summary = report.content.executiveSummary;
if (summary) {
  console.log(`
Executive Summary:
  Overall Score: ${summary.overallScore.toFixed(1)}%
  Risk Level: ${summary.riskLevel}
  Critical Issues: ${summary.criticalIssues}

Key Findings:
${summary.keyFindings.map(f => `  - ${f}`).join('\n')}

Recommendations:
${summary.recommendations.map(r => `  - ${r}`).join('\n')}
`);
}
```

### Report Types

```typescript
enum ReportType {
  EXECUTIVE_SUMMARY = 'executive_summary',     // High-level overview
  DETAILED_ASSESSMENT = 'detailed_assessment', // Full control details
  GAP_ANALYSIS = 'gap_analysis',               // Gap identification
  AUDIT_REPORT = 'audit_report',               // Auditor-ready report
  CERTIFICATION_PACKAGE = 'certification_package', // Certification docs
  EVIDENCE_PACKAGE = 'evidence_package',       // Evidence collection
  REMEDIATION_REPORT = 'remediation_report',   // Remediation plans
  TREND_ANALYSIS = 'trend_analysis',           // Historical trends
}
```

### Report Formats

```typescript
enum ReportFormat {
  PDF = 'pdf',     // Formatted PDF document
  HTML = 'html',   // Web-viewable HTML
  JSON = 'json',   // Machine-readable JSON
  CSV = 'csv',     // Spreadsheet-compatible
  XLSX = 'xlsx',   // Excel workbook
  WORD = 'docx',   // Microsoft Word
}
```

### Stakeholder Views

```typescript
enum StakeholderView {
  BOARD = 'board',           // Board of Directors
  AUDITORS = 'auditors',     // External Auditors
  IT = 'it',                 // IT Team
  LEGAL = 'legal',           // Legal/Compliance
  EXECUTIVE = 'executive',   // C-Suite
  OPERATIONS = 'operations', // Operations Team
  SECURITY = 'security',     // Security Team
}
```

### Creating Report Templates

```typescript
// Create custom report template
const template = await reportGenerator.createTemplate({
  name: 'Monthly Security Report',
  description: 'Monthly security compliance overview for CISO',
  reportType: ReportType.EXECUTIVE_SUMMARY,
  stakeholderView: StakeholderView.SECURITY,
  branding: {
    primaryColor: '#1a365d',
    secondaryColor: '#2b6cb0',
    fontFamily: 'Inter, sans-serif',
    companyName: 'Acme Corporation',
    confidentialityNotice: 'CONFIDENTIAL - Internal Use Only',
    logoUrl: 'https://company.com/logo.png',
    headerText: 'Security Compliance Report',
    footerText: 'Generated by Compliance Automation System'
  },
  sections: [
    {
      id: 'summary',
      name: 'Executive Summary',
      type: 'summary',
      order: 1,
      visible: true,
      config: {}
    },
    {
      id: 'metrics',
      name: 'Key Metrics',
      type: 'metrics',
      order: 2,
      visible: true,
      config: { showTrends: true }
    },
    {
      id: 'gaps',
      name: 'Critical Gaps',
      type: 'findings',
      order: 3,
      visible: true,
      config: { severityFilter: ['critical', 'high'] }
    },
    {
      id: 'heatmap',
      name: 'Risk Heat Map',
      type: 'chart',
      order: 4,
      visible: true,
      config: { chartType: 'heatmap' }
    },
    {
      id: 'recommendations',
      name: 'Action Items',
      type: 'recommendations',
      order: 5,
      visible: true,
      config: { limit: 10 }
    }
  ],
  filters: [
    { field: 'severity', operator: 'in', value: ['critical', 'high', 'medium'] }
  ],
  createdBy: 'admin',
  isDefault: false
});

console.log(`Template created: ${template.id}`);
```

### Generating Gap Analysis Reports

```typescript
// Generate comprehensive gap analysis
const gapReport = await reportGenerator.generateReport({
  reportType: ReportType.GAP_ANALYSIS,
  frameworks: [ComplianceFramework.HIPAA],
  format: ReportFormat.PDF,
  period: {
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31')
  },
  generatedBy: 'compliance-officer',
  includeRecommendations: true
});

// Access gap analysis details
const gapAnalysis = gapReport.content.gapAnalysis;
if (gapAnalysis) {
  console.log(`
Gap Analysis Summary:
  Total Gaps: ${gapAnalysis.totalGaps}
  Critical: ${gapAnalysis.criticalGaps}
  High: ${gapAnalysis.highGaps}
  Medium: ${gapAnalysis.mediumGaps}
  Low: ${gapAnalysis.lowGaps}

Gaps by Framework:
${Object.entries(gapAnalysis.gapsByFramework)
  .map(([fw, summary]) =>
    `  ${fw}: ${summary.totalGaps} gaps (${summary.estimatedRemediationEffort})`
  ).join('\n')}

Prioritized Gaps:
${gapAnalysis.prioritizedGaps.slice(0, 5).map((pg, i) =>
  `  ${i + 1}. ${pg.gap.gapDescription} (Risk: ${pg.riskScore})`
).join('\n')}

Remediation Timeline:
${gapAnalysis.remediationTimeline.map(phase =>
  `  ${phase.phase}: ${phase.startDate.toLocaleDateString()} - ${phase.endDate.toLocaleDateString()}`
).join('\n')}
`);
}
```

### Generating Trend Analysis

```typescript
// Generate trend analysis report
const trendReport = await reportGenerator.generateReport({
  reportType: ReportType.TREND_ANALYSIS,
  frameworks: [
    ComplianceFramework.SOC2,
    ComplianceFramework.ISO27001,
    ComplianceFramework.GDPR
  ],
  format: ReportFormat.HTML,
  period: {
    startDate: new Date('2023-01-01'),
    endDate: new Date('2024-01-01'),
    label: 'Year 2023'
  },
  generatedBy: 'analytics-team'
});

// Access trend data
const trends = trendReport.content.trends;
if (trends) {
  console.log(`
Trend Analysis:
  Periods Analyzed: ${trends.periods.length}

Compliance Score Trend:
${trends.complianceTrend.map(point =>
  `  ${point.date.toLocaleDateString()}: ${point.value.toFixed(1)}%`
).join('\n')}

Framework Trends:
${Object.entries(trends.frameworkTrends).map(([framework, points]) => {
  const latest = points[points.length - 1];
  const first = points[0];
  const change = latest.value - first.value;
  return `  ${framework}: ${change >= 0 ? '+' : ''}${change.toFixed(1)}%`;
}).join('\n')}

Key Insights:
${trends.insights.map(insight =>
  `  [${insight.type.toUpperCase()}] ${insight.message}`
).join('\n')}
`);
}
```

### Historical Report Comparison

```typescript
// Compare two reports
const comparison = await reportGenerator.compareReports(
  'report_2023_q4',
  'report_2024_q1'
);

console.log(`
Report Comparison:
  Total Changes: ${comparison.summary.totalChanges}
  Improvements: ${comparison.summary.improvements}
  Declines: ${comparison.summary.declines}
  Overall Trend: ${comparison.summary.overallTrend}

Key Changes:
${comparison.summary.keyChanges.map(c => `  - ${c}`).join('\n')}

Detailed Differences:
${comparison.differences.filter(d => d.significance === 'high').map(d =>
  `  ${d.field}: ${d.baseValue} -> ${d.compareValue} (${d.changeType})`
).join('\n')}

Insights:
${comparison.insights.map(i => `  - ${i}`).join('\n')}
`);
```

---

## 6. Control Assessment Workflow

### Complete Assessment Workflow

```typescript
import ComplianceAutomationEngine, {
  ComplianceFrameworkType,
  AssessmentType,
  ControlStatus
} from './src/compliance/automation/ComplianceAutomationEngine';

const engine = ComplianceAutomationEngine.getInstance();

// Step 1: Get controls requiring assessment
const controls = engine.getControlsByFramework(ComplianceFrameworkType.SOC2);
const dueForAssessment = controls.filter(ctrl => {
  if (!ctrl.nextAssessmentDue) return true;
  return ctrl.nextAssessmentDue <= new Date();
});

console.log(`Controls due for assessment: ${dueForAssessment.length}`);

// Step 2: Assess each control
for (const control of dueForAssessment) {
  try {
    // Collect evidence first
    const evidence = await engine.collectEvidence(
      control.id,
      'assessor@company.com',
      {
        automated: control.assessmentType === AssessmentType.AUTOMATED,
        types: ['configuration', 'log', 'report']
      }
    );

    console.log(`Collected ${evidence.length} evidence items for ${control.id}`);

    // Perform assessment
    const assessment = await engine.assessControl(
      control.id,
      'assessor@company.com',
      {
        collectEvidence: false, // Already collected
        runAutomation: true,
        notes: 'Quarterly review'
      }
    );

    console.log(`
Assessment Complete:
  Control: ${control.name}
  Status: ${assessment.status}
  Score: ${assessment.score}
  Findings: ${assessment.findings.length}
  Next Review: ${assessment.nextReviewDate.toISOString()}
`);

    // Handle non-compliant controls
    if (assessment.status === ControlStatus.NON_COMPLIANT) {
      console.log(`
  !! NON-COMPLIANT !!
  Remediation Plan: ${assessment.remediationPlan?.id}
  Priority: ${assessment.remediationPlan?.priority}
  Steps: ${assessment.remediationPlan?.steps.length}
`);
    }

  } catch (error) {
    console.error(`Failed to assess ${control.id}: ${error.message}`);
  }
}

// Step 3: Update compliance score
const score = await engine.getComplianceScore(ComplianceFrameworkType.SOC2);
console.log(`
Updated SOC2 Score: ${score.overallScore.toFixed(2)}%
Trend: ${score.trend}
`);
```

### Assessment Frequency Management

```typescript
// Control frequency types
type AssessmentFrequency =
  | 'continuous'  // Real-time monitoring
  | 'daily'       // Daily checks
  | 'weekly'      // Weekly reviews
  | 'monthly'     // Monthly assessments
  | 'quarterly'   // Quarterly reviews
  | 'annual';     // Annual audits

// Get controls by frequency
const continuousControls = controls.filter(c => c.frequency === 'continuous');
const quarterlyControls = controls.filter(c => c.frequency === 'quarterly');
const annualControls = controls.filter(c => c.frequency === 'annual');

// Schedule automated assessments
continuousControls.forEach(control => {
  // These run every minute via startMonitoring()
  console.log(`Continuous: ${control.name}`);
});

quarterlyControls.forEach(control => {
  const nextDue = control.nextAssessmentDue;
  console.log(`Quarterly: ${control.name} - Next: ${nextDue?.toISOString()}`);
});
```

### Manual Assessment Override

```typescript
// Force manual assessment with specific findings
const manualAssessment = await engine.assessControl(
  'soc2_cc3.1',
  'senior-auditor@company.com',
  {
    collectEvidence: true,
    runAutomation: false, // Skip automation
    notes: `
      Manual review performed on-site.
      Findings:
      - Policy document version outdated
      - Training records incomplete for 3 employees
      - Approval workflow not consistently followed
    `
  }
);

// Add custom findings
const customFindings = [
  {
    id: 'finding_001',
    severity: 'medium',
    title: 'Policy version control',
    description: 'Information security policy is 6 months out of date',
    affectedResources: ['policy-001'],
    recommendation: 'Update policy and re-approve through governance process',
    references: ['ISO27001 A.5.1']
  }
];
```

---

## 7. Evidence Collection Process

### Automated Evidence Collection

```typescript
import ComplianceAutomationEngine, { EvidenceType } from './src/compliance/automation/ComplianceAutomationEngine';

const engine = ComplianceAutomationEngine.getInstance();

// Collect evidence automatically
const evidence = await engine.collectEvidence(
  'soc2_cc5.1',
  'automation-system',
  {
    automated: true,
    types: [
      EvidenceType.CONFIGURATION,
      EvidenceType.LOG,
      EvidenceType.SCAN_RESULT,
      EvidenceType.API_RESPONSE
    ]
  }
);

evidence.forEach(ev => {
  console.log(`
Evidence Collected:
  ID: ${ev.id}
  Type: ${ev.type}
  Title: ${ev.title}
  Method: ${ev.collectionMethod}
  Valid Until: ${ev.validUntil?.toISOString()}
  Checksum: ${ev.checksum}
  Storage: ${ev.storageLocation}
`);
});
```

### Evidence Types

```typescript
enum EvidenceType {
  DOCUMENT = 'document',           // Policy documents, procedures
  SCREENSHOT = 'screenshot',       // Screenshots of configurations
  LOG = 'log',                     // Audit logs, system logs
  CONFIGURATION = 'configuration', // System configurations
  REPORT = 'report',               // Generated reports, assessments
  ATTESTATION = 'attestation',     // Signed attestations
  API_RESPONSE = 'api_response',   // API verification responses
  SCAN_RESULT = 'scan_result',     // Security scan results
}
```

### Manual Evidence Upload

```typescript
// Get evidence for a control
const controlEvidence = engine.getControlEvidence('soc2_cc5.1');

console.log(`
Evidence for control:
  Total items: ${controlEvidence.length}

By Type:
  Documents: ${controlEvidence.filter(e => e.type === EvidenceType.DOCUMENT).length}
  Logs: ${controlEvidence.filter(e => e.type === EvidenceType.LOG).length}
  Screenshots: ${controlEvidence.filter(e => e.type === EvidenceType.SCREENSHOT).length}
  Configurations: ${controlEvidence.filter(e => e.type === EvidenceType.CONFIGURATION).length}
`);

// Check evidence validity
const now = new Date();
const validEvidence = controlEvidence.filter(e => !e.validUntil || e.validUntil > now);
const expiredEvidence = controlEvidence.filter(e => e.validUntil && e.validUntil <= now);
const expiringEvidence = controlEvidence.filter(e => {
  if (!e.validUntil) return false;
  const daysUntilExpiry = (e.validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
});

console.log(`
Evidence Status:
  Valid: ${validEvidence.length}
  Expired: ${expiredEvidence.length}
  Expiring Soon (30 days): ${expiringEvidence.length}
`);
```

### Evidence Integrity Verification

```typescript
// Evidence includes cryptographic checksums for integrity
const verifyEvidence = (evidence) => {
  // Checksum is SHA-256 hash of content
  const crypto = require('crypto');
  const calculatedChecksum = crypto
    .createHash('sha256')
    .update(JSON.stringify(evidence.content))
    .digest('hex');

  return calculatedChecksum === evidence.checksum;
};

// Verify all evidence
controlEvidence.forEach(ev => {
  const isValid = verifyEvidence(ev);
  console.log(`${ev.id}: ${isValid ? 'VALID' : 'TAMPERED'}`);
});
```

---

## 8. Gap Analysis and Remediation

### Identifying Gaps

```typescript
const engine = ComplianceAutomationEngine.getInstance();

// Identify all gaps for a framework
const gapAnalysis = await engine.identifyGaps(
  ComplianceFrameworkType.HIPAA,
  {
    includeRemediation: true,
    prioritize: true
  }
);

console.log(`
Gap Analysis Results:
  Total Gaps: ${gapAnalysis.summary.totalGaps}
  Critical: ${gapAnalysis.summary.criticalGaps}
  High: ${gapAnalysis.summary.highGaps}
  Medium: ${gapAnalysis.summary.mediumGaps}
  Low: ${gapAnalysis.summary.lowGaps}
  Est. Remediation: ${gapAnalysis.summary.estimatedRemediationEffort}

Top Priority Gaps:
${gapAnalysis.gaps.slice(0, 5).map((gap, i) => `
  ${i + 1}. ${gap.controlName}
     Severity: ${gap.severity}
     Risk Score: ${gap.riskScore}
     Description: ${gap.gapDescription}
     Impact: ${gap.impact}
     Current: ${gap.currentState}
     Required: ${gap.requiredState}
     Due: ${gap.dueDate?.toISOString()}
`).join('\n')}

Recommendations:
${gapAnalysis.recommendations.map(r => `  - ${r}`).join('\n')}
`);
```

### Generating Remediation Plans

```typescript
// Generate remediation plan for specific gap
const remediationPlan = await engine.generateRemediationPlan(
  gapAnalysis.gaps[0].id,
  {
    assignTo: 'security-team@company.com',
    dueDate: new Date('2024-06-30'),
    priority: 1
  }
);

console.log(`
Remediation Plan:
  ID: ${remediationPlan.id}
  Control: ${remediationPlan.controlId}
  Framework: ${remediationPlan.framework}
  Title: ${remediationPlan.title}
  Priority: ${remediationPlan.priority}
  Status: ${remediationPlan.status}
  Assigned To: ${remediationPlan.assignedTo}
  Due Date: ${remediationPlan.dueDate.toISOString()}
  Est. Effort: ${remediationPlan.estimatedEffort}
  Est. Cost: $${remediationPlan.estimatedCost || 'TBD'}

Steps:
${remediationPlan.steps.map((step, i) => `
  ${i + 1}. ${step.title}
     Type: ${step.type}
     Description: ${step.description}
     Effort: ${step.estimatedEffort}
     Status: ${step.status}
`).join('\n')}
`);
```

### Remediation Types

```typescript
enum RemediationType {
  AUTOMATIC = 'automatic',       // Can be auto-remediated
  SEMI_AUTOMATIC = 'semi_automatic', // Requires approval before auto-fix
  MANUAL = 'manual',             // Requires human intervention
  EXCEPTION = 'exception',       // Accept risk with exception
}
```

### Tracking Remediation Progress

```typescript
// Get all gaps and their status
const allGaps = engine.getGaps({
  framework: ComplianceFrameworkType.SOC2,
  status: 'in_progress'
});

allGaps.forEach(gap => {
  const plan = gap.remediationPlan;
  if (plan) {
    const completedSteps = plan.steps.filter(s => s.status === 'completed').length;
    const totalSteps = plan.steps.length;
    const progress = (completedSteps / totalSteps) * 100;

    console.log(`
Gap: ${gap.controlName}
  Progress: ${progress.toFixed(0)}% (${completedSteps}/${totalSteps} steps)
  Due: ${gap.dueDate?.toISOString()}
  Overdue: ${gap.dueDate && gap.dueDate < new Date() ? 'YES' : 'No'}
`);
  }
});
```

---

## 9. Policy Enforcement Configuration

### Defining Policies

```typescript
const engine = ComplianceAutomationEngine.getInstance();

// Register a compliance policy
engine.registerPolicy({
  id: 'policy_encryption',
  name: 'Data Encryption Policy',
  description: 'Ensures all sensitive data is encrypted at rest and in transit',
  frameworks: [
    ComplianceFrameworkType.SOC2,
    ComplianceFrameworkType.HIPAA,
    ComplianceFrameworkType.PCI_DSS
  ],
  rules: [
    {
      id: 'rule_encryption_rest',
      condition: 'encryptionAtRest == "false"',
      action: 'alert',
      severity: 'critical',
      message: 'Data storage without encryption detected'
    },
    {
      id: 'rule_encryption_transit',
      condition: 'tlsVersion < "1.2"',
      action: 'block',
      severity: 'high',
      message: 'Weak TLS version in use',
      remediationScript: 'upgrade_tls_config'
    },
    {
      id: 'rule_key_rotation',
      condition: 'keyAge > 365',
      action: 'remediate',
      severity: 'medium',
      message: 'Encryption keys older than 1 year',
      remediationScript: 'rotate_encryption_keys'
    }
  ],
  enforcementLevel: 'strict',
  autoRemediation: true,
  enabled: true,
  createdAt: new Date(),
  createdBy: 'security-admin'
});
```

### Policy Enforcement Levels

```typescript
// Enforcement levels determine how strictly policies are applied
type EnforcementLevel = 'strict' | 'moderate' | 'advisory';

// Strict: Block operations that violate policy
// Moderate: Allow with warnings and alerts
// Advisory: Log only, no blocking
```

### Enforcing Policies

```typescript
// Enforce policy against a context
const enforcementResult = await engine.enforcePolicy('policy_encryption', {
  encryptionAtRest: 'false',
  tlsVersion: '1.1',
  keyAge: 400
});

console.log(`
Policy Enforcement:
  Policy: ${enforcementResult.policyId}
  Violations Found: ${enforcementResult.violations.length}

Violations:
${enforcementResult.violations.map(v => `
  Rule: ${v.ruleId}
  Severity: ${v.severity}
  Description: ${v.description}
  Auto-Remediated: ${v.autoRemediated}
  Status: ${v.remediationStatus}
`).join('\n')}

Actions Taken:
${enforcementResult.remediationsTaken.map(r =>
  `  ${r.ruleId}: ${r.action} (${r.success ? 'success' : 'failed'})`
).join('\n')}
`);
```

### Monitoring Policy Violations

```typescript
// Listen for policy violations
engine.on('policy:enforced', ({ policyId, violations, remediationsTaken }) => {
  if (violations.length > 0) {
    // Send alerts
    violations.forEach(violation => {
      if (violation.severity === 'critical') {
        // Immediate notification
        console.log(`CRITICAL VIOLATION: ${violation.description}`);
      }
    });

    // Log to audit trail
    console.log(`Policy ${policyId} enforced with ${violations.length} violations`);
  }
});

// Get all policies
const policies = engine.getPolicies();
console.log(`Active Policies: ${policies.filter(p => p.enabled).length}`);
```

---

## 10. Report Generation and Scheduling

### Scheduling Automated Reports

```typescript
import ComplianceReportGenerator, {
  ReportType,
  ReportFormat,
  ScheduleFrequency,
  DistributionChannel
} from './src/compliance/automation/ComplianceReportGenerator';

const generator = ComplianceReportGenerator.getInstance();

// Schedule weekly executive report
const schedule = await generator.scheduleReport({
  name: 'Weekly Executive Compliance Summary',
  templateId: 'template_exec_summary',
  frequency: ScheduleFrequency.WEEKLY,
  recipients: [
    {
      channel: DistributionChannel.EMAIL,
      destination: 'ciso@company.com',
      config: {
        emailSubject: 'Weekly Compliance Report - {{date}}',
        emailBody: 'Please find attached the weekly compliance summary.',
        ccRecipients: ['security-team@company.com']
      },
      enabled: true
    },
    {
      channel: DistributionChannel.SLACK,
      destination: '#compliance-alerts',
      config: {
        slackWebhookUrl: process.env.SLACK_WEBHOOK_URL,
        slackMention: ['@ciso', '@compliance-team']
      },
      enabled: true
    },
    {
      channel: DistributionChannel.S3,
      destination: 'compliance-reports-bucket',
      config: {
        s3Bucket: 'compliance-reports',
        s3Prefix: 'weekly/',
        s3Region: 'us-east-1'
      },
      enabled: true
    }
  ],
  frameworks: [
    ComplianceFramework.SOC2,
    ComplianceFramework.ISO27001
  ],
  formats: [ReportFormat.PDF, ReportFormat.JSON],
  retentionDays: 365,
  createdBy: 'admin',
  startDate: new Date() // Start immediately
});

console.log(`
Schedule Created:
  ID: ${schedule.id}
  Name: ${schedule.name}
  Frequency: ${schedule.frequency}
  Next Run: ${schedule.nextRunAt.toISOString()}
  Recipients: ${schedule.recipients.length}
  Formats: ${schedule.formats.join(', ')}
`);
```

### Schedule Frequencies

```typescript
enum ScheduleFrequency {
  DAILY = 'daily',       // Every day
  WEEKLY = 'weekly',     // Every week
  MONTHLY = 'monthly',   // Every month
  QUARTERLY = 'quarterly', // Every 3 months
  ANNUALLY = 'annually', // Every year
  ON_DEMAND = 'on_demand', // Manual trigger only
}
```

### Distribution Channels

```typescript
enum DistributionChannel {
  EMAIL = 'email',     // Email with attachment
  SLACK = 'slack',     // Slack message
  TEAMS = 'teams',     // Microsoft Teams
  S3 = 's3',           // AWS S3 upload
  WEBHOOK = 'webhook', // Custom webhook
  SFTP = 'sftp',       // SFTP upload
}
```

### Managing Schedules

```typescript
// Get all schedules
const schedules = generator.getSchedules();

schedules.forEach(schedule => {
  console.log(`
Schedule: ${schedule.name}
  ID: ${schedule.id}
  Enabled: ${schedule.enabled}
  Frequency: ${schedule.frequency}
  Last Run: ${schedule.lastRunAt?.toISOString() || 'Never'}
  Last Status: ${schedule.lastRunStatus || 'N/A'}
  Next Run: ${schedule.nextRunAt.toISOString()}
`);
});

// Update schedule
await generator.updateSchedule(schedule.id, {
  enabled: false,
  recipients: [
    ...schedule.recipients,
    {
      channel: DistributionChannel.WEBHOOK,
      destination: 'https://api.company.com/compliance-webhook',
      config: {
        webhookUrl: 'https://api.company.com/compliance-webhook',
        webhookHeaders: {
          'Authorization': 'Bearer {{API_KEY}}',
          'Content-Type': 'application/json'
        }
      },
      enabled: true
    }
  ]
});

// Delete schedule
await generator.deleteSchedule(schedule.id);
```

### Distributing Reports Manually

```typescript
// Generate and distribute report immediately
const report = await generator.generateReport({
  reportType: ReportType.AUDIT_REPORT,
  frameworks: [ComplianceFramework.HIPAA],
  format: ReportFormat.PDF,
  period: {
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-03-31')
  },
  stakeholderView: StakeholderView.AUDITORS,
  generatedBy: 'compliance-team'
});

// Distribute to specific recipients
const results = await generator.distributeReport(report, [
  {
    channel: DistributionChannel.EMAIL,
    destination: 'external-auditor@auditfirm.com',
    config: {
      emailSubject: 'HIPAA Audit Report - Q1 2024',
      emailBody: 'Please find the requested audit report attached.'
    },
    enabled: true
  }
]);

console.log(`
Distribution Results:
  Successful: ${results.success.join(', ')}
  Failed: ${results.failed.join(', ')}
`);
```

---

## 11. GRC Platform Integration

The Compliance Automation System integrates with major GRC (Governance, Risk, and Compliance) platforms.

### Supported Platforms

```typescript
enum GRCPlatform {
  SERVICENOW_GRC = 'servicenow_grc',  // ServiceNow GRC
  RSA_ARCHER = 'rsa_archer',          // RSA Archer
  METRICSTREAM = 'metricstream',      // MetricStream
  QUALYS = 'qualys',                  // Qualys
  RAPID7 = 'rapid7',                  // Rapid7
}
```

### Configuring ServiceNow GRC Integration

```typescript
const engine = ComplianceAutomationEngine.getInstance();

// Configure ServiceNow GRC integration
engine.configureGRCIntegration({
  platform: GRCPlatform.SERVICENOW_GRC,
  enabled: true,
  apiEndpoint: 'https://company.service-now.com/api/now/table/',
  username: process.env.SERVICENOW_USER,
  clientId: process.env.SERVICENOW_CLIENT_ID,
  clientSecret: process.env.SERVICENOW_CLIENT_SECRET,
  syncFrequency: 'hourly',
  syncDirection: 'bidirectional',
  mappings: [
    {
      localField: 'control.id',
      remoteField: 'control_id',
      transformation: 'uppercase'
    },
    {
      localField: 'assessment.status',
      remoteField: 'compliance_status',
      transformation: 'mapStatus'
    },
    {
      localField: 'gap.severity',
      remoteField: 'risk_rating'
    },
    {
      localField: 'evidence.url',
      remoteField: 'evidence_attachment'
    }
  ]
});
```

### Configuring RSA Archer Integration

```typescript
engine.configureGRCIntegration({
  platform: GRCPlatform.RSA_ARCHER,
  enabled: true,
  apiEndpoint: 'https://archer.company.com/api/',
  apiKey: process.env.RSA_ARCHER_API_KEY,
  syncFrequency: 'daily',
  syncDirection: 'push',
  mappings: [
    {
      localField: 'control.id',
      remoteField: 'ControlID'
    },
    {
      localField: 'control.name',
      remoteField: 'ControlName'
    },
    {
      localField: 'assessment.score',
      remoteField: 'ComplianceScore'
    }
  ]
});
```

### Configuring MetricStream Integration

```typescript
engine.configureGRCIntegration({
  platform: GRCPlatform.METRICSTREAM,
  enabled: true,
  apiEndpoint: 'https://metricstream.company.com/api/v2/',
  clientId: process.env.METRICSTREAM_CLIENT_ID,
  clientSecret: process.env.METRICSTREAM_CLIENT_SECRET,
  syncFrequency: 'weekly',
  syncDirection: 'bidirectional',
  mappings: [
    {
      localField: 'framework',
      remoteField: 'RegulationName'
    },
    {
      localField: 'control.category',
      remoteField: 'ControlDomain'
    }
  ]
});
```

### Syncing with GRC Platforms

```typescript
// Sync with ServiceNow
const syncResult = await engine.syncWithGRCPlatform(GRCPlatform.SERVICENOW_GRC);

console.log(`
Sync Results:
  Platform: ${syncResult.platform}
  Success: ${syncResult.success}
  Items Synced: ${syncResult.syncedItems}
  Errors: ${syncResult.errors.length > 0 ? syncResult.errors.join(', ') : 'None'}
`);

// Listen for sync events
engine.on('grc:synced', ({ platform, syncedItems, errors }) => {
  console.log(`GRC sync completed for ${platform}: ${syncedItems} items`);
  if (errors.length > 0) {
    console.error(`Sync errors: ${errors.join(', ')}`);
  }
});
```

### Sync Frequencies

```typescript
type SyncFrequency = 'realtime' | 'hourly' | 'daily' | 'weekly';

type SyncDirection =
  | 'bidirectional'  // Two-way sync
  | 'push'           // Local to remote only
  | 'pull';          // Remote to local only
```

---

## 12. Best Practices and Troubleshooting

### Best Practices

#### 1. Framework Selection

```typescript
// Start with frameworks relevant to your industry
const healthcareFrameworks = [
  ComplianceFrameworkType.HIPAA,
  ComplianceFrameworkType.SOC2,
  ComplianceFrameworkType.ISO27001
];

const financialFrameworks = [
  ComplianceFrameworkType.PCI_DSS,
  ComplianceFrameworkType.SOX,
  ComplianceFrameworkType.GLBA,
  ComplianceFrameworkType.SOC2
];

const euCompanyFrameworks = [
  ComplianceFrameworkType.GDPR,
  ComplianceFrameworkType.ISO27001,
  ComplianceFrameworkType.SOC2
];
```

#### 2. Assessment Scheduling

```typescript
// Prioritize continuous monitoring for critical controls
const criticalControls = controls.filter(c => c.weight >= 8);
criticalControls.forEach(c => {
  // These should be assessed continuously
  console.log(`Critical: ${c.name} - Enable continuous monitoring`);
});

// Schedule quarterly reviews for standard controls
const standardControls = controls.filter(c => c.weight >= 5 && c.weight < 8);
// These can be assessed quarterly

// Annual reviews for low-risk controls
const lowRiskControls = controls.filter(c => c.weight < 5);
// These can be assessed annually
```

#### 3. Evidence Management

```typescript
// Set appropriate evidence retention
const evidenceRetention = {
  [ComplianceFrameworkType.SOC2]: 7 * 365,      // 7 years
  [ComplianceFrameworkType.HIPAA]: 6 * 365,     // 6 years
  [ComplianceFrameworkType.GDPR]: 3 * 365,      // 3 years (varies)
  [ComplianceFrameworkType.PCI_DSS]: 1 * 365,   // 1 year minimum
  [ComplianceFrameworkType.SOX]: 7 * 365,       // 7 years
};

// Collect evidence proactively
engine.on('control:assessed', async ({ control }) => {
  // Ensure evidence is collected after each assessment
  const evidence = engine.getControlEvidence(control.id);
  const required = control.evidenceRequirements.length;
  const collected = evidence.length;

  if (collected < required) {
    console.warn(`Warning: ${control.id} missing ${required - collected} evidence items`);
  }
});
```

#### 4. Gap Remediation

```typescript
// Prioritize gaps by risk score
const prioritizeGaps = (gaps) => {
  return gaps.sort((a, b) => {
    // Critical gaps first
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (severityDiff !== 0) return severityDiff;

    // Then by risk score
    return b.riskScore - a.riskScore;
  });
};

// Set realistic remediation timelines
const remediationTimelines = {
  critical: 7,   // 7 days
  high: 14,      // 14 days
  medium: 30,    // 30 days
  low: 60        // 60 days
};
```

#### 5. Reporting Strategy

```typescript
// Different reports for different stakeholders
const reportingStrategy = {
  board: {
    frequency: 'quarterly',
    type: ReportType.EXECUTIVE_SUMMARY,
    format: ReportFormat.PDF
  },
  auditors: {
    frequency: 'annually',
    type: ReportType.AUDIT_REPORT,
    format: ReportFormat.PDF
  },
  securityTeam: {
    frequency: 'weekly',
    type: ReportType.GAP_ANALYSIS,
    format: ReportFormat.JSON
  },
  operations: {
    frequency: 'daily',
    type: ReportType.DETAILED_ASSESSMENT,
    format: ReportFormat.HTML
  }
};
```

### Troubleshooting

#### Issue: Controls Not Being Assessed

```typescript
// Check control configuration
const control = engine.getControl('soc2_cc1.1');

if (!control) {
  console.error('Control not found - ensure framework is initialized');
}

if (control.assessmentType === 'manual' && !control.lastAssessedAt) {
  console.warn('Manual control requires human assessment');
}

if (control.nextAssessmentDue && control.nextAssessmentDue > new Date()) {
  console.log('Control not yet due for assessment');
}
```

#### Issue: Evidence Collection Failing

```typescript
// Debug evidence collection
engine.on('evidence:collected', ({ controlId, evidence }) => {
  console.log(`Success: ${evidence.length} items collected for ${controlId}`);
});

engine.on('error', (error) => {
  console.error('Evidence collection error:', error.message);

  // Common issues:
  // - Missing API credentials for automated collection
  // - Network connectivity issues
  // - Invalid control configuration
});

// Verify evidence requirements
const control = engine.getControl(controlId);
console.log('Required evidence:', control.evidenceRequirements);
```

#### Issue: GRC Sync Failures

```typescript
// Debug GRC integration
engine.on('grc:synced', ({ platform, success, errors }) => {
  if (!success) {
    errors.forEach(error => {
      console.error(`GRC Sync Error (${platform}): ${error}`);
    });

    // Common issues:
    // - API credentials expired
    // - Rate limiting
    // - Field mapping mismatches
    // - Network connectivity
  }
});

// Verify configuration
const config = engine.grcIntegrations.get(GRCPlatform.SERVICENOW_GRC);
if (!config?.enabled) {
  console.warn('GRC integration is disabled');
}
if (!config?.apiEndpoint) {
  console.error('Missing API endpoint');
}
```

#### Issue: Reports Not Generating

```typescript
// Debug report generation
generator.on('report:generation_started', ({ reportId }) => {
  console.log(`Starting report: ${reportId}`);
});

generator.on('report:generation_failed', ({ reportId, error }) => {
  console.error(`Report failed: ${reportId}`, error);

  // Common issues:
  // - Insufficient data for report period
  // - Missing framework controls
  // - Template not found
});

generator.on('report:formatted', ({ format, filePath, fileSize }) => {
  console.log(`Report formatted: ${format} (${fileSize} bytes)`);
});
```

#### Issue: Alerts Not Triggering

```typescript
// Verify monitoring is active
if (!engine.monitoringConfig.enabled) {
  console.warn('Monitoring is disabled - call startMonitoring()');
  engine.startMonitoring();
}

// Check alert thresholds
console.log('Alert thresholds:', engine.monitoringConfig.alertThresholds);

// Verify notification channels
console.log('Notification channels:',
  engine.monitoringConfig.notificationChannels.filter(c => c.enabled)
);

// Listen for alerts
engine.on('alert:created', ({ alert }) => {
  console.log(`Alert created: ${alert.title} (${alert.severity})`);
});
```

### Performance Optimization

```typescript
// Batch assessments for better performance
const batchAssessControls = async (controlIds, batchSize = 10) => {
  const batches = [];
  for (let i = 0; i < controlIds.length; i += batchSize) {
    batches.push(controlIds.slice(i, i + batchSize));
  }

  for (const batch of batches) {
    await Promise.all(batch.map(id =>
      engine.assessControl(id, 'system', { collectEvidence: true })
    ));
  }
};

// Cache compliance scores
const scoreCache = new Map();
const getCachedScore = async (framework) => {
  const cacheKey = `${framework}_${new Date().toDateString()}`;
  if (!scoreCache.has(cacheKey)) {
    scoreCache.set(cacheKey, await engine.getComplianceScore(framework));
  }
  return scoreCache.get(cacheKey);
};
```

---

## Appendix A: Event Reference

### ComplianceAutomationEngine Events

| Event | Description | Payload |
|-------|-------------|---------|
| `control:assessed` | Control assessment completed | `{ assessment, control }` |
| `gap:created` | New compliance gap identified | `{ gap }` |
| `alert:created` | New compliance alert created | `{ alert }` |
| `evidence:collected` | Evidence collection completed | `{ controlId, evidence }` |
| `score:updated` | Compliance score updated | `{ framework, score }` |
| `policy:enforced` | Policy enforcement completed | `{ policyId, violations, remediationsTaken }` |
| `monitoring:started` | Continuous monitoring started | `{}` |
| `monitoring:stopped` | Continuous monitoring stopped | `{}` |
| `grc:configured` | GRC integration configured | `{ platform }` |
| `grc:synced` | GRC sync completed | `{ platform, syncedItems, errors }` |

### ComplianceReportGenerator Events

| Event | Description | Payload |
|-------|-------------|---------|
| `report:generation_started` | Report generation started | `{ reportId, options }` |
| `report:generation_completed` | Report generation completed | `{ reportId, generationTime, format }` |
| `report:generation_failed` | Report generation failed | `{ reportId, error }` |
| `schedule:created` | Report schedule created | `{ scheduleId, schedule }` |
| `schedule:executing` | Scheduled report executing | `{ scheduleId }` |
| `schedule:completed` | Scheduled report completed | `{ scheduleId }` |
| `distribution:success` | Report distribution succeeded | `{ reportId, channel, destination }` |
| `distribution:failed` | Report distribution failed | `{ reportId, channel, destination, error }` |

---

## Appendix B: Type Definitions

For complete type definitions, refer to:

- `/src/compliance/automation/ComplianceAutomationEngine.ts`
- `/src/compliance/automation/RegulatoryFrameworkManager.ts`
- `/src/compliance/automation/ComplianceReportGenerator.ts`
- `/src/types/compliance.ts`

---

## Related Documentation

- [COMPLIANCE_FRAMEWORK_GUIDE.md](./COMPLIANCE_FRAMEWORK_GUIDE.md) - Framework-specific details
- [AUDIT_LOGGING_GUIDE.md](./AUDIT_LOGGING_GUIDE.md) - Audit trail configuration
- [SECURITY_MONITORING_GUIDE.md](./SECURITY_MONITORING_GUIDE.md) - Security event monitoring
- [API_REFERENCE.md](./API_REFERENCE.md) - REST API endpoints

---

*Last Updated: November 2025*
*Version: 1.0.0*
