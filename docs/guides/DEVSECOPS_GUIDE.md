# DevSecOps Guide

## Overview

DevSecOps integrates security practices throughout the software development lifecycle, ensuring that security is not an afterthought but a fundamental requirement. This guide provides comprehensive instructions for implementing DevSecOps practices in workflow automation platforms.

### What is DevSecOps?

DevSecOps (Development, Security, and Operations) is an approach that combines development, security, and operations into an integrated workflow. It emphasizes:

- **Shift-Left Security**: Move security testing earlier in the development cycle
- **Automation**: Automate security scanning and policy enforcement
- **Continuous Monitoring**: Real-time security monitoring throughout the pipeline
- **Infrastructure as Code**: Secure configuration management for infrastructure
- **Secrets Management**: Encrypted storage and rotation of sensitive credentials

### DevSecOps Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CI/CD Pipeline                           │
├─────────────────────────────────────────────────────────────┤
│  Source Code → SAST Scan → SCA Scan → Build → IaC Scan     │
│       ↓           ↓          ↓         ↓       ↓            │
│  Commit  → Secrets Check → Dependencies → Container Scan    │
│       ↓           ↓          ↓         ↓       ↓            │
│    Code      Secret       Vulnerability   Image          Artifacts
│   Review     Scanning      Analysis      Security              │
└─────────────────────────────────────────────────────────────┘
         ↓              ↓              ↓              ↓
   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
   │ Quality  │  │ Security │  │ Secrets  │  │ Compliance
   │  Gates   │  │  Gates   │  │  Gates   │  │  Gates
   └──────────┘  └──────────┘  └──────────┘  └──────────┘
         ↓
   Deploy to Production

┌──────────────────────────────────────────────────────────┐
│            Runtime Security Monitoring                   │
├──────────────────────────────────────────────────────────┤
│  • Real-time threat detection (SIEM integration)        │
│  • Vulnerability scanning in running containers         │
│  • Secret rotation and breach detection                 │
│  • Compliance monitoring and audit logging              │
└──────────────────────────────────────────────────────────┘
```

### Key Components

#### 1. CI/CD Security Scanner
- Pipeline security analysis
- Code security (SAST - Static Application Security Testing)
- Build artifact security
- Supply chain risk assessment
- Support for GitHub Actions, GitLab CI, Jenkins, Azure DevOps, CircleCI

#### 2. IaC (Infrastructure as Code) Scanner
- Terraform, CloudFormation, Kubernetes scanning
- Policy-based enforcement (OPA/Rego)
- CIS Benchmarks compliance
- Automated remediation suggestions

#### 3. Secrets Management System
- Encrypted secret storage with versioning
- Multi-provider integration (HashiCorp Vault, AWS Secrets Manager, Azure Key Vault, Google Secret Manager, Kubernetes Secrets)
- Automated secret rotation
- Just-In-Time (JIT) access control
- Breach detection and remediation

### Benefits

| Benefit | Description |
|---------|-------------|
| **Shift-Left Security** | Find vulnerabilities early before code is merged or deployed |
| **Automation** | Reduce manual security reviews with automated scanning |
| **Compliance** | Continuous compliance monitoring for regulated industries |
| **Risk Reduction** | Prevent vulnerabilities in production environments |
| **Developer Experience** | Provide clear feedback for developers to fix issues |
| **Audit Trail** | Complete audit logging for compliance reporting |

---

## Quick Start (5-minute setup)

### Prerequisites

- Node.js >= 20.0.0
- npm >= 9.0.0
- Git
- Docker (for container scanning)
- PostgreSQL 15+ (for audit logs)

### Step 1: Install DevSecOps Tools

```bash
npm install --save-dev @workflow/devsecops
npm install @workflow/security
npm install @workflow/compliance
```

### Step 2: Initialize DevSecOps Configuration

```bash
# Create .devsecops.config.json
cat > .devsecops.config.json << 'EOF'
{
  "cicd": {
    "enabled": true,
    "platforms": ["github", "gitlab", "jenkins"],
    "scanInterval": 3600,
    "criticalFailThreshold": 0,
    "highFailThreshold": 5
  },
  "secrets": {
    "enabled": true,
    "provider": "vault",
    "rotationIntervalDays": 30,
    "breachCheckEnabled": true
  },
  "iac": {
    "enabled": true,
    "platforms": ["terraform", "kubernetes"],
    "policyEngine": "opa",
    "cisBenchmarks": true
  },
  "compliance": {
    "frameworks": ["SOC2", "GDPR"],
    "auditLogRetentionDays": 365
  }
}
EOF
```

### Step 3: Run First Pipeline Scan

```typescript
import { CICDSecurityScanner } from '@workflow/devsecops';

const scanner = new CICDSecurityScanner();

// Scan GitHub Actions workflow
const result = await scanner.scanPipeline({
  pipelineId: 'my-workflow',
  platform: 'github',
  workflowPath: '.github/workflows/main.yml'
});

console.log(`Security Score: ${result.score}/100`);
console.log(`Vulnerabilities Found: ${result.credentialExposures.length}`);
```

### Step 4: Verify Configuration

```bash
# Test secrets manager connection
npm run test:secrets

# Test IaC scanner
npm run test:iac

# Run full DevSecOps validation
npm run validate:devsecops
```

---

## CI/CD Security Scanner Guide

### Overview

The CI/CD Security Scanner provides comprehensive analysis of your CI/CD pipelines for security vulnerabilities, misconfigurations, and supply chain risks.

### Features

#### 1. Pipeline Security Analysis

Analyzes CI/CD pipeline configurations for:
- Credential exposure in logs and environment variables
- Privilege escalation attempts
- Unsafe command execution
- Secrets in git history
- Untrusted dependencies

**Example: Scan GitHub Actions Workflow**

```typescript
import { CICDSecurityScanner } from '@workflow/security/devsecops/CICDSecurityScanner';

const scanner = new CICDSecurityScanner();

const pipelineResult = await scanner.analyzePipeline({
  pipelineId: 'github-main',
  platform: 'github',
  content: `
    name: CI/CD Pipeline
    on: [push, pull_request]

    jobs:
      build:
        runs-on: ubuntu-latest
        steps:
          - uses: actions/checkout@v3
          - name: Install dependencies
            run: npm install
          - name: Run tests
            run: npm test
          - name: Deploy
            env:
              AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET }}
            run: npm run deploy
  `
});

console.log('Pipeline Security Report:');
console.log(`Score: ${pipelineResult.score}/100`);
console.log(`Credential Exposures: ${pipelineResult.credentialExposures.length}`);
pipelineResult.credentialExposures.forEach(exp => {
  console.log(`  - ${exp.type}: ${exp.location} (${exp.severity})`);
  console.log(`    Fix: ${exp.suggested_fix}`);
});
```

#### 2. Code Security (SAST)

Static Application Security Testing detects:
- SQL Injection vulnerabilities
- Cross-Site Scripting (XSS)
- Insecure cryptography
- Buffer overflows
- Hardcoded credentials

**Example: Run SAST Scan**

```typescript
const codeSecurityResult = await scanner.scanCodeSecurity({
  repositoryPath: './src',
  language: 'typescript',
  includePatterns: ['**/*.ts', '**/*.tsx'],
  excludePatterns: ['**/*.test.ts', '**/node_modules/**']
});

console.log('SAST Results:');
console.log(`Critical Issues: ${codeSecurityResult.sast.criticalCount}`);
console.log(`High Issues: ${codeSecurityResult.sast.highCount}`);

codeSecurityResult.sast.issues.forEach(issue => {
  console.log(`\n${issue.rule}`);
  console.log(`  Severity: ${issue.severity}`);
  console.log(`  File: ${issue.file}:${issue.line}`);
  console.log(`  Message: ${issue.message}`);
  console.log(`  Recommendation: ${issue.recommendation}`);
});
```

#### 3. Build Security

Analyzes build artifacts for:
- Malware signatures
- Suspicious code patterns
- Unsigned binaries
- Artifact tampering

**Example: Scan Build Artifacts**

```typescript
const buildSecurityResult = await scanner.analyzeBuildArtifacts({
  artifactPath: './dist',
  checkSignatures: true,
  scanMalware: true,
  verifySBOM: true
});

if (buildSecurityResult.malwareDetected) {
  console.error('Malware detected in build artifacts!');
  buildSecurityResult.malwareFindings.forEach(finding => {
    console.error(`  - ${finding.file}: ${finding.signature}`);
  });
}

console.log(`SBOM Status: ${buildSecurityResult.sbomValid ? 'Valid' : 'Invalid'}`);
console.log(`Unsigned Artifacts: ${buildSecurityResult.unsignedArtifacts.length}`);
```

#### 4. Dependency Vulnerability Scanning

Detects known vulnerabilities in dependencies:

**Example: Check Dependencies**

```typescript
const depResult = await scanner.scanDependencies({
  lockfileContent: fs.readFileSync('./package-lock.json', 'utf-8'),
  includeTransitive: true,
  allowedLicenses: ['MIT', 'Apache-2.0', 'BSD-3-Clause'],
  blockOnCritical: true
});

console.log('Dependency Vulnerabilities:');
depResult.dependencies.forEach(dep => {
  if (dep.vulnerabilities.length > 0) {
    console.log(`\n${dep.name}@${dep.version}`);
    dep.vulnerabilities.forEach(vuln => {
      console.log(`  - ${vuln.id}: ${vuln.title}`);
      console.log(`    CVE: ${vuln.cvss}`);
      console.log(`    Fix: Update to ${vuln.patchVersion}`);
    });
  }
});
```

#### 5. Quality Gates

Enforce security policies at build time:

**Example: Configure Quality Gates**

```typescript
const qualityGates = {
  security: {
    maxCriticalIssues: 0,
    maxHighIssues: 5,
    maxMediumIssues: 20,
    blockOnSecurityFail: true
  },
  coverage: {
    minCodeCoverage: 80,
    minSecurityCoverage: 90,
    blockOnLowCoverage: true
  },
  compliance: {
    requiresApproval: ['critical', 'high'],
    allowWaivers: false
  },
  secrets: {
    blockOnSecretDetection: true,
    maxAllowedSecrets: 0
  }
};

const gateResult = await scanner.validateQualityGates(qualityGates);

if (!gateResult.passed) {
  console.error('Quality gates failed:');
  gateResult.failures.forEach(failure => {
    console.error(`  - ${failure.gate}: ${failure.reason}`);
  });
  process.exit(1);
}

console.log('All quality gates passed!');
```

#### 6. Platform Integration

Supports 5 major CI/CD platforms:

**GitHub Actions Integration**

```yaml
name: DevSecOps Scan
on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Run DevSecOps Scan
        uses: ./actions/devsecops-scan
        with:
          scan-type: 'all'
          fail-on-critical: true

      - name: Upload Results
        if: always()
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: './devsecops-report.sarif'
```

**GitLab CI Integration**

```yaml
devsecops_scan:
  stage: security
  image: node:20
  script:
    - npm install @workflow/devsecops
    - npm run scan:devsecops
  artifacts:
    reports:
      sast: devsecops-report.json
    paths:
      - devsecops-*.json
  allow_failure: false
```

**Jenkins Integration**

```groovy
pipeline {
  agent any

  stages {
    stage('DevSecOps Scan') {
      steps {
        script {
          sh '''
            npm install @workflow/devsecops
            npm run scan:devsecops -- --output=devsecops-report.json
          '''
        }
      }
    }

    stage('Quality Gates') {
      steps {
        script {
          def report = readJSON file: 'devsecops-report.json'
          if (report.score < 70) {
            error "Security score below threshold: ${report.score}"
          }
        }
      }
    }
  }

  post {
    always {
      publishHTML([
        reportDir: '.',
        reportFiles: 'devsecops-report.html',
        reportName: 'DevSecOps Report'
      ])
    }
  }
}
```

**Azure DevOps Integration**

```yaml
trigger:
  - main

pool:
  vmImage: 'ubuntu-latest'

stages:
  - stage: Security
    jobs:
      - job: DevSecOpsScan
        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: '20'

          - script: |
              npm install @workflow/devsecops
              npm run scan:devsecops
            displayName: 'Run DevSecOps Scan'

          - task: PublishBuildArtifacts@1
            inputs:
              PathtoPublish: 'devsecops-report.json'
              ArtifactName: 'security-reports'
```

**CircleCI Integration**

```yaml
version: 2.1

jobs:
  security-scan:
    docker:
      - image: node:20
    steps:
      - checkout
      - run:
          name: Install dependencies
          command: npm install @workflow/devsecops
      - run:
          name: Run DevSecOps scan
          command: npm run scan:devsecops
      - store_artifacts:
          path: devsecops-report.json
          destination: security-reports
      - run:
          name: Check gates
          command: npm run validate:gates
```

---

## IaC Security Scanner Guide

### Overview

The Infrastructure as Code (IaC) Scanner identifies misconfigurations, security issues, and compliance violations in infrastructure definitions.

### Platform Support

The scanner supports 5 major IaC platforms:

| Platform | File Types | Checks |
|----------|-----------|--------|
| **Terraform** | .tf, .tfvars | 150+ checks |
| **CloudFormation** | .json, .yaml | 120+ checks |
| **Kubernetes** | .yaml, .yml | 140+ checks |
| **Helm** | values.yaml, .yaml | 100+ checks |
| **Ansible** | .yml, .yaml | 110+ checks |

### Security Checks

**Categories of Checks:**
- Misconfiguration Detection
- Secrets in IaC
- Insecure Defaults
- Encryption Settings
- Public Exposure
- Privilege Escalation
- Network Security
- Compliance (SOC2, PCI-DSS, HIPAA, GDPR)

**Example: Scan Terraform Configuration**

```typescript
import { IaCSecurityScanner, IaCPlatform, ScanMode } from '@workflow/security/devsecops/IaCSecurityScanner';

const iacScanner = new IaCSecurityScanner();

const terraformResult = await iacScanner.scanTerraform({
  filePath: './infrastructure/main.tf',
  scanMode: ScanMode.PR_MR,
  enableAutoFix: true,
  policies: ['CIS_BENCHMARK', 'SOC2', 'PCI_DSS']
});

console.log('Terraform Security Findings:');
console.log(`Total Findings: ${terraformResult.findings.length}`);

terraformResult.findings.forEach(finding => {
  console.log(`\n[${finding.severity.toUpperCase()}] ${finding.title}`);
  console.log(`  Category: ${finding.category}`);
  console.log(`  Resource: ${finding.resource}`);
  console.log(`  Description: ${finding.description}`);

  if (finding.remediation) {
    console.log(`  Remediation:\n${finding.remediation.codeSnippet}`);
  }
});
```

**Example: Scan Kubernetes Manifests**

```typescript
const kubeResult = await iacScanner.scanKubernetes({
  manifestPath: './k8s/deployment.yaml',
  namespace: 'production',
  enforceNetworkPolicies: true,
  requireResourceLimits: true,
  blockPrivilegedContainers: true,
  policies: ['CIS_BENCHMARK']
});

console.log('Kubernetes Configuration Issues:');
kubeResult.findings.forEach(finding => {
  console.log(`\n${finding.title}`);
  console.log(`  Issue: ${finding.description}`);
  console.log(`  Fix: ${finding.remediation?.description}`);
});

// Auto-remediate if enabled
if (kubeResult.autoFixable) {
  const fixed = await iacScanner.autoRemediateKubernetes(kubeResult);
  console.log(`\nAuto-remediated ${fixed.remediatedCount} issues`);
}
```

### Policy Engine

Configure custom policies using OPA/Rego:

**Example: Define Custom Policy**

```typescript
const customPolicy = `
package workflow.security

deny[msg] {
  input.resource.type == "aws_s3_bucket"
  input.resource.properties.versioning.enabled == false
  msg := sprintf("S3 bucket %s must have versioning enabled", [input.resource.name])
}

deny[msg] {
  input.resource.type == "aws_security_group"
  input.resource.properties.ingress[_].cidr_blocks[_] == "0.0.0.0/0"
  msg := sprintf("Security group %s allows unrestricted ingress", [input.resource.name])
}

deny[msg] {
  input.resource.type == "kubernetes_deployment"
  input.resource.properties.spec.template.spec.containers[_].securityContext.privileged == true
  msg := sprintf("Pod %s should not run in privileged mode", [input.resource.name])
}
`;

const policyResult = await iacScanner.applyCustomPolicy({
  policy: customPolicy,
  targetFiles: ['./infrastructure/**/*.tf', './k8s/**/*.yaml']
});

console.log(`Policy violations: ${policyResult.violations.length}`);
```

### Scanning Modes

```typescript
enum ScanMode {
  PRECOMMIT = 'precommit',      // Local dev environment
  PR_MR = 'pr_mr',              // Pull/Merge request validation
  SCHEDULED = 'scheduled',       // Daily/Weekly scans
  ONDEMAND = 'ondemand'         // Manual trigger
}

// Example: Scheduled scan
const scheduleResult = await iacScanner.scheduleScan({
  mode: ScanMode.SCHEDULED,
  frequency: 'daily',
  time: '02:00 UTC',
  targets: ['./infrastructure/**/*.tf'],
  notifyOnFindings: ['security-team@company.com']
});
```

### Remediation

**Example: Auto-Remediation**

```typescript
const remediationPlan = await iacScanner.createRemediationPlan({
  findings: terraformResult.findings,
  autoFixable: true,
  createPullRequest: true,
  assignees: ['security@company.com']
});

console.log('Remediation Plan:');
remediationPlan.actions.forEach(action => {
  console.log(`\n${action.finding.title}`);
  console.log(`  File: ${action.file}`);
  console.log(`  Change: ${action.change}`);
  console.log(`  Before: ${action.before}`);
  console.log(`  After: ${action.after}`);
});

// Execute remediation
if (remediationPlan.safe) {
  await iacScanner.executeRemediation(remediationPlan);
  console.log('Remediation applied successfully');
}
```

---

## Secrets Management Guide

### Overview

Enterprise-grade secrets management with encryption, rotation, and compliance.

### Secret Storage

**Example: Store and Retrieve Secrets**

```typescript
import { SecretsManagement, SecretType, AccessLevel } from '@workflow/security/devsecops/SecretsManagement';

const secretsManager = new SecretsManagement({
  provider: 'vault',
  vaultUrl: 'https://vault.company.com',
  vaultToken: process.env.VAULT_TOKEN,
  encryptionAlgorithm: 'aes-256-gcm'
});

// Store a secret
const storedSecret = await secretsManager.storeSecret({
  name: 'database-password',
  type: SecretType.DATABASE_CREDENTIAL,
  value: 'super-secret-password',
  description: 'Production database password',
  tags: { environment: 'production', component: 'database' },
  expiresIn: 90 * 24 * 60 * 60 * 1000 // 90 days
});

console.log(`Secret stored with ID: ${storedSecret.id}`);

// Retrieve a secret
const retrieved = await secretsManager.getSecret({
  name: 'database-password',
  accessLevel: AccessLevel.ADMIN,
  reason: 'Deploying to production',
  approvalRequired: true
});

console.log(`Secret value: ${retrieved.value}`);
console.log(`Last rotated: ${retrieved.lastRotatedAt}`);
```

### Secret Rotation

**Example: Configure Rotation Policy**

```typescript
const rotationPolicy = {
  enabled: true,
  rotationIntervalDays: 30,
  strategy: 'automatic', // or 'manual'
  retainOldVersions: 5,
  notifyBefore: 7, // days
  testRotation: true, // verify rotated secret works
  rollbackOnFailure: true,

  // Custom rotation hook
  rotationHook: async (oldSecret, newSecret) => {
    // Update dependent services
    await updateDatabasePassword(newSecret.value);
    await notifyApplicationServers();
  }
};

await secretsManager.setRotationPolicy('database-password', rotationPolicy);

// Manual rotation
const rotatedSecret = await secretsManager.rotateSecret({
  name: 'database-password',
  newValue: 'new-secret-password',
  reason: 'Quarterly rotation'
});

console.log(`Secret rotated. New version: ${rotatedSecret.version}`);
```

### Access Control

**Example: JIT (Just-In-Time) Access**

```typescript
// Request temporary access
const accessRequest = await secretsManager.requestAccess({
  secretName: 'api-key-stripe',
  accessLevel: AccessLevel.DEVELOPER,
  duration: 1 * 60 * 60 * 1000, // 1 hour
  reason: 'Debugging payment issue',
  justification: 'Customer reported transaction failure'
});

console.log(`Access request ID: ${accessRequest.id}`);
console.log(`Status: ${accessRequest.status}`); // pending, approved, denied

// Approver reviews and approves
const approval = await secretsManager.approveAccessRequest({
  requestId: accessRequest.id,
  approvedBy: 'security-team@company.com',
  comment: 'Approved for debugging'
});

// Retrieve secret with temporary access
const secret = await secretsManager.getSecret({
  name: 'api-key-stripe',
  accessRequestId: accessRequest.id
});

// Access automatically revokes after duration
setTimeout(() => {
  console.log('Access revoked after duration expired');
}, 1 * 60 * 60 * 1000);
```

### Provider Integration

**Example: Multi-Provider Setup**

```typescript
const secretsConfig = {
  providers: {
    vault: {
      type: 'hashicorp-vault',
      url: 'https://vault.company.com',
      token: process.env.VAULT_TOKEN,
      namespace: 'workflow-automation',
      mount: 'secret'
    },
    aws: {
      type: 'aws-secrets-manager',
      region: 'us-east-1',
      roleArn: 'arn:aws:iam::123456789:role/SecretsAccess'
    },
    azure: {
      type: 'azure-key-vault',
      vaultName: 'workflow-keyvault',
      tenantId: process.env.AZURE_TENANT_ID,
      clientId: process.env.AZURE_CLIENT_ID,
      clientSecret: process.env.AZURE_CLIENT_SECRET
    },
    gcp: {
      type: 'google-secret-manager',
      projectId: 'workflow-automation-prod',
      keyFile: '/etc/gcp/service-account-key.json'
    },
    k8s: {
      type: 'kubernetes-secrets',
      namespace: 'workflow-system',
      kubeconfig: process.env.KUBECONFIG
    }
  },

  // Primary provider with fallback
  routing: {
    default: 'vault',
    fallback: ['aws', 'azure'],
    priorityByType: {
      'api_key': 'vault',
      'database_credential': 'aws',
      'ssh_key': 'gcp'
    }
  }
};

const manager = new SecretsManagement(secretsConfig);
```

### Breach Detection

**Example: Detect Compromised Secrets**

```typescript
// Enable breach detection
await secretsManager.enableBreachDetection({
  scanInterval: 24 * 60 * 60 * 1000, // daily
  services: ['haveibeenpwned', 'leakdb', 'databaseleaks'],
  notifyOnBreach: true
});

// Monitor for breaches
secretsManager.on('breach-detected', async (event) => {
  console.error(`Secret compromised: ${event.secretName}`);

  // Automatic remediation
  const newSecret = await secretsManager.rotateSecret({
    name: event.secretName,
    reason: 'Breach detected'
  });

  // Notify team
  await notifySecurityTeam({
    subject: `Security Alert: Secret Compromised`,
    body: `The secret "${event.secretName}" was detected in public breach databases.\nAutomatic rotation completed. New secret version: ${newSecret.version}`,
    severity: 'critical'
  });
});
```

---

## Integration Examples

### GitHub Actions Workflow

```yaml
name: DevSecOps Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  secrets-scan:
    name: Scan for Secrets
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0

      - name: TruffleHog Scan
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: ${{ github.event.repository.default_branch }}
          head: HEAD
          extra_args: --debug --json

  sast-scan:
    name: SAST Security Scan
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run SonarQube Scan
        uses: SonarSource/sonarcloud-github-action@master
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}

  dependency-check:
    name: Dependency Vulnerability Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - name: Run npm audit
        run: npm audit --audit-level=moderate

      - name: Run Snyk Scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high

  iac-scan:
    name: IaC Security Scan
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Run Terraform validation
        run: |
          terraform init -backend=false
          terraform validate

      - name: Run Checkov
        uses: bridgecrewio/checkov-action@master
        with:
          directory: infrastructure/
          framework: terraform,kubernetes
          quiet: false
          soft_fail: false

  container-scan:
    name: Container Image Scan
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - uses: docker/setup-buildx-action@v2

      - name: Build Docker image
        uses: docker/build-push-action@v4
        with:
          context: .
          push: false
          load: true
          tags: workflow-automation:${{ github.sha }}

      - name: Run Trivy Scan
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: workflow-automation:${{ github.sha }}
          format: 'sarif'
          output: 'trivy-results.sarif'

      - name: Upload Trivy results
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'

  quality-gates:
    name: Security Quality Gates
    runs-on: ubuntu-latest
    needs: [secrets-scan, sast-scan, dependency-check, iac-scan]
    if: always()
    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - name: Validate security gates
        run: npm run validate:gates

      - name: Comment PR with results
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const report = JSON.parse(fs.readFileSync('devsecops-report.json', 'utf8'));
            const comment = `## Security Scan Results
            - **Score**: ${report.score}/100
            - **Issues**: ${report.totalIssues}
            - **Status**: ${report.passed ? '✅ PASSED' : '❌ FAILED'}`;
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: comment
            });
```

### GitLab CI Pipeline

```yaml
stages:
  - scan
  - build
  - deploy

variables:
  SECURE_ANALYZERS_PREFIX: registry.gitlab.com/gitlab-org/security-products/analyzers
  SAST_IMAGE_SUFFIX: latest
  SAST_EXCLUDED_PATHS: spec, test, tests, tmp, vendor

secret-scanning:
  stage: scan
  image: ${SECURE_ANALYZERS_PREFIX}/secrets/${SAST_IMAGE_SUFFIX}
  services: []
  allow_failure: true
  artifacts:
    reports:
      secret_detection: gl-secret-detection-report.json

sast-scanning:
  stage: scan
  image: ${SECURE_ANALYZERS_PREFIX}/sast:${SAST_IMAGE_SUFFIX}
  allow_failure: true
  artifacts:
    reports:
      sast: gl-sast-report.json
  variables:
    SAST_EXCLUDED_PATHS: "${SAST_EXCLUDED_PATHS}"

dependency-check:
  stage: scan
  image: ${SECURE_ANALYZERS_PREFIX}/dependency-scanning:${SAST_IMAGE_SUFFIX}
  allow_failure: true
  artifacts:
    reports:
      dependency_scanning: gl-dependency-scanning-report.json

container-scanning:
  stage: build
  image: ${SECURE_ANALYZERS_PREFIX}/container-scanning:${SAST_IMAGE_SUFFIX}
  variables:
    CS_IMAGE: $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
  allow_failure: true
  artifacts:
    reports:
      container_scanning: gl-container-scanning-report.json
  only:
    - branches
    - tags

iac-scanning:
  stage: scan
  image: node:20
  script:
    - npm install @workflow/devsecops
    - npm run scan:iac -- infrastructure/
  artifacts:
    reports:
      sast: iac-scanning-report.json
  allow_failure: true

quality-gates:
  stage: scan
  image: node:20
  script:
    - npm install @workflow/devsecops
    - npm run validate:gates
  only:
    - merge_requests
  allow_failure: false
```

### Jenkins Pipeline

```groovy
@Library('shared-pipeline-library') _

pipeline {
  agent any

  options {
    timestamps()
    timeout(time: 1, unit: 'HOURS')
    buildDiscarder(logRotator(numToKeepStr: '10'))
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Install Dependencies') {
      steps {
        sh '''
          node --version
          npm --version
          npm ci
        '''
      }
    }

    stage('Secrets Scan') {
      steps {
        sh '''
          npm install truffleHog
          npm run scan:secrets
        '''
      }
      post {
        always {
          archiveArtifacts artifacts: '**/secrets-report.json'
        }
      }
    }

    stage('SAST Scan') {
      steps {
        sh '''
          npm install sonarqube-scanner
          npm run scan:sast
        '''
      }
      post {
        always {
          junit '**/sast-report.xml'
        }
      }
    }

    stage('Dependency Check') {
      steps {
        sh '''
          npm audit --json > npm-audit.json || true
          npm run scan:dependencies
        '''
      }
      post {
        always {
          publishHTML([
            reportDir: '.',
            reportFiles: 'dependency-report.html',
            reportName: 'Dependency Report'
          ])
        }
      }
    }

    stage('IaC Scan') {
      steps {
        sh '''
          npm install checkov
          npm run scan:iac -- infrastructure/
        '''
      }
      post {
        always {
          publishHTML([
            reportDir: 'iac-reports',
            reportFiles: 'index.html',
            reportName: 'IaC Scan Report'
          ])
        }
      }
    }

    stage('Container Scan') {
      steps {
        script {
          sh '''
            docker build -t workflow-automation:${BUILD_NUMBER} .
            docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
              aquasec/trivy:latest image workflow-automation:${BUILD_NUMBER} \
              --severity HIGH,CRITICAL \
              --exit-code 0 \
              --format json > trivy-report.json
          '''
        }
      }
    }

    stage('Quality Gates') {
      steps {
        sh '''
          npm run validate:gates
        '''
      }
    }

    stage('Build') {
      steps {
        sh 'npm run build'
      }
    }

    stage('Deploy') {
      when {
        branch 'main'
      }
      steps {
        sh 'npm run deploy'
      }
    }
  }

  post {
    always {
      cleanWs()
    }
    failure {
      emailext(
        subject: "DevSecOps Pipeline Failed: ${env.JOB_NAME} #${env.BUILD_NUMBER}",
        body: "Pipeline failed. Check console output at ${env.BUILD_URL}",
        to: '${DEFAULT_RECIPIENTS}',
        attachmentsPattern: '**/reports/*.json'
      )
    }
  }
}
```

---

## Best Practices

### 1. Shift-Left Security

Move security testing as early as possible in development:

```
Traditional Approach:
Code → Build → Test → Deploy → (Security issues found in production)

Shift-Left Approach:
Design → Code (+ inline security) → Build (+ SAST) → Test (+ DAST) → Deploy
  ↓        ↓                          ↓               ↓
Security Security scans daily         Security testing   Pre-production
review    in pre-commit                during dev       validation
```

**Implementation:**

```typescript
// Pre-commit hook for secret scanning
import { execSync } from 'child_process';

const hooks = {
  'pre-commit': async () => {
    const changed = execSync('git diff --cached --name-only').toString().split('\n');

    for (const file of changed) {
      // Scan for secrets
      const secretResult = await secretsManager.scanFile(file);
      if (secretResult.found) {
        throw new Error(`Secrets detected in ${file}`);
      }

      // Quick SAST check
      const sastResult = await scanner.quickScan(file);
      if (sastResult.critical) {
        throw new Error(`Critical issues in ${file}`);
      }
    }
  }
};
```

### 2. Pipeline Hardening

Secure your CI/CD pipelines:

**Best Practices:**
- Use dedicated service accounts for CI/CD
- Rotate CI/CD tokens regularly
- Implement branch protection rules
- Require code review for main branch
- Use signed commits and tags
- Limit who can approve deployments
- Audit all pipeline changes

**Example: Protected Branch Rules**

```typescript
const protectionRules = {
  main: {
    requireCodeReview: 2,
    dismissStaleReviews: true,
    requireStatusChecks: [
      'security-scan',
      'sast-scan',
      'dependency-check',
      'iac-scan',
      'unit-tests',
      'integration-tests'
    ],
    requireBranchUpToDate: true,
    requireSignedCommits: true,
    includeAdministrators: true,
    restrictDismissals: true,
    dismissalActors: ['security-team']
  }
};
```

### 3. Secret Hygiene

Never store secrets in code or logs:

**Good:**
```typescript
// Use environment variables or secrets managers
const apiKey = process.env.API_KEY;
const dbPassword = await secretsManager.getSecret('db-password');
```

**Bad:**
```typescript
// Never hardcode secrets
const apiKey = 'sk-1234567890abcdef';
const dbPassword = 'super-secret-password';
```

**Rotation Strategy:**
- Rotate all secrets quarterly
- Rotate immediately after staff departure
- Rotate after detected breaches
- Rotate before major deployments
- Monitor for leaked secrets

### 4. Continuous Monitoring

Implement real-time security monitoring:

```typescript
// Real-time threat detection
const monitor = new SecurityMonitor();

monitor.on('vulnerability-detected', (event) => {
  console.error(`Vulnerability detected: ${event.id}`);
  // Automatically remediate or alert
  alertSecurityTeam(event);
});

monitor.on('policy-violation', (event) => {
  console.warn(`Policy violation: ${event.policy}`);
  // Block deployment or request approval
});

// Periodic compliance checks
setInterval(async () => {
  const compliance = await monitor.checkCompliance();
  if (!compliance.passed) {
    console.error('Compliance check failed');
    reportToAudit(compliance);
  }
}, 24 * 60 * 60 * 1000);
```

### 5. Compliance Reporting

Generate automated compliance reports:

```typescript
// Quarterly compliance report
const report = await complianceManager.generateReport({
  period: 'Q1-2025',
  frameworks: ['SOC2', 'ISO27001', 'HIPAA', 'GDPR'],
  includeExecutiveSummary: true,
  includeDetailedFindings: true,
  includeAuditTrail: true,
  format: 'pdf'
});

console.log(`Compliance Report: ${report.filename}`);
console.log(`SOC2 Score: ${report.soc2Score}/100`);
console.log(`Open Issues: ${report.openIssuesCount}`);
```

---

## API Reference

### CICDSecurityScanner

```typescript
class CICDSecurityScanner {
  // Analyze pipeline configuration
  async analyzePipeline(config: PipelineConfig): Promise<PipelineSecurityResult>

  // Scan code for vulnerabilities (SAST)
  async scanCodeSecurity(config: ScanConfig): Promise<CodeSecurityResult>

  // Analyze build artifacts
  async analyzeBuildArtifacts(config: ArtifactConfig): Promise<BuildSecurityResult>

  // Check dependencies for vulnerabilities
  async scanDependencies(config: DepConfig): Promise<DependencyResult>

  // Validate quality gates
  async validateQualityGates(gates: QualityGates): Promise<GateResult>
}
```

### IaCSecurityScanner

```typescript
class IaCSecurityScanner {
  // Scan Terraform files
  async scanTerraform(config: TfScanConfig): Promise<IaCResult>

  // Scan Kubernetes manifests
  async scanKubernetes(config: K8sScanConfig): Promise<IaCResult>

  // Scan CloudFormation templates
  async scanCloudFormation(config: CFScanConfig): Promise<IaCResult>

  // Apply custom OPA policies
  async applyCustomPolicy(config: PolicyConfig): Promise<PolicyResult>

  // Create remediation plan
  async createRemediationPlan(config: RemediationConfig): Promise<RemediationPlan>

  // Execute remediation
  async executeRemediation(plan: RemediationPlan): Promise<RemediationResult>
}
```

### SecretsManagement

```typescript
class SecretsManagement {
  // Store a secret
  async storeSecret(config: StoreSecretConfig): Promise<Secret>

  // Retrieve a secret
  async getSecret(config: GetSecretConfig): Promise<SecretValue>

  // Rotate secret
  async rotateSecret(config: RotateConfig): Promise<RotatedSecret>

  // Set rotation policy
  async setRotationPolicy(name: string, policy: RotationPolicy): Promise<void>

  // Request temporary access
  async requestAccess(config: AccessConfig): Promise<AccessRequest>

  // Approve access request
  async approveAccessRequest(config: ApprovalConfig): Promise<Approval>

  // Scan for breaches
  async enableBreachDetection(config: BreachConfig): Promise<void>

  // Scan file for secrets
  async scanFile(filePath: string): Promise<SecretFinding[]>
}
```

---

## Conclusion

DevSecOps is a continuous journey of improving security practices throughout your development lifecycle. By implementing the patterns and tools described in this guide, you can:

- Detect vulnerabilities early
- Enforce security policies automatically
- Maintain compliance with regulatory requirements
- Reduce risk of breaches
- Improve developer productivity

Start with the Quick Start section and gradually adopt more advanced practices as your team's security maturity grows.

For support, documentation, and community discussions, visit: https://github.com/workflow-automation/devsecops
