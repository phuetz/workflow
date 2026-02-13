# Secret Scanning Guide

## 📋 Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Detection Patterns](#detection-patterns)
4. [Pre-Commit Hooks](#pre-commit-hooks)
5. [CI/CD Integration](#cicd-integration)
6. [Dashboard](#dashboard)
7. [Remediation](#remediation)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

---

## Overview

Enterprise-grade secret scanning system that detects and helps remediate exposed secrets in your codebase.

### Key Features

- ✅ **25+ Detection Patterns** - Detects AWS, GitHub, Stripe, Google, Slack, and more
- ✅ **Pre-Commit Hooks** - Block commits containing secrets
- ✅ **CI/CD Integration** - Automated scanning in pipelines
- ✅ **Real-time Dashboard** - Monitor and manage detected secrets
- ✅ **Automated Remediation** - Auto-fix secrets with multiple strategies
- ✅ **False Positive Filtering** - Smart detection reduces noise
- ✅ **SARIF Support** - Integrates with GitHub Code Scanning

### Architecture

```
┌─────────────────┐
│  Developer PC   │
│                 │
│  Pre-commit ───┼──► Block if secrets found
│     Hook        │
└─────────────────┘
        │
        ▼
┌─────────────────┐
│   Git Remote    │
│                 │
│  Push Trigger ──┼──► CI/CD Scan
│                 │
└─────────────────┘
        │
        ▼
┌─────────────────┐
│  GitHub Actions │
│                 │
│  Secret Scan ───┼──► SARIF → Code Scanning
│  Create Issue   │
│  Comment on PR  │
└─────────────────┘
        │
        ▼
┌─────────────────┐
│   Dashboard     │
│                 │
│  View Results ──┼──► Remediation Engine
│  Track Status   │
└─────────────────┘
```

---

## Quick Start

### 1. Install Pre-Commit Hook

```bash
# Run setup script
bash scripts/setup-secret-scanning.sh

# Verify installation
cat .husky/pre-commit
```

### 2. Run Manual Scan

```bash
# Scan entire codebase
tsx scripts/ci-secret-scan.ts

# View results
cat secret-scan-report.json
```

### 3. Access Dashboard

```bash
# Start the application
npm run dev

# Navigate to
http://localhost:3000/security/secret-scanning
```

---

## Detection Patterns

The scanner detects **25+ secret types** across multiple categories:

### AWS Secrets

| Pattern | Example | Severity |
|---------|---------|----------|
| AWS Access Key ID | `AKIAIOSFODNN7EXAMPLE` | Critical |
| AWS Secret Access Key | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` | Critical |

### GitHub Secrets

| Pattern | Example | Severity |
|---------|---------|----------|
| Personal Access Token | `ghp_1234567890abcdefghijklmnopqrstuvwxyz12` | Critical |
| OAuth Access Token | `gho_16C7e42F292c6912E7710c838347Ae178B4a` | Critical |
| App Token | `ghu_16C7e42F292c6912E7710c838347Ae178B4a` | High |

### Cloud Provider Secrets

| Provider | Pattern | Severity |
|----------|---------|----------|
| **Stripe** | `sk_live_...`, `pk_live_...` | Critical |
| **Google** | `AIzaSy...` | High |
| **Slack** | `xoxb-...`, `xoxp-...` | High |
| **OpenAI** | `sk-...` | High |
| **Anthropic** | `sk-ant-...` | High |

### Generic Patterns

- **Private Keys** (RSA, DSA, EC, SSH)
- **Generic API Keys** (32+ hex chars)
- **Database URLs** (PostgreSQL, MySQL, MongoDB)
- **JWT Tokens**
- **Password in code**

### Full Pattern List

See `src/security/SecretScanner.ts` for the complete list of 25+ patterns.

---

## Pre-Commit Hooks

### How It Works

1. Developer runs `git commit`
2. Husky triggers pre-commit hook
3. Scanner scans staged files
4. If secrets found:
   - Block commit
   - Display detailed report
   - Suggest remediation
5. If no secrets: commit proceeds

### Installation

```bash
# Automatic installation
bash scripts/setup-secret-scanning.sh

# Manual installation
npx husky install
cat > .husky/pre-commit << 'EOF'
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"
echo "🔍 Running secret scanner..."
tsx scripts/pre-commit-scan.ts
EOF
chmod +x .husky/pre-commit
```

### Bypass (Emergency Only)

```bash
# Skip pre-commit hook (NOT RECOMMENDED)
git commit --no-verify -m "Emergency commit"

# ⚠️ WARNING: Only use in emergencies
# You MUST rotate any exposed secrets immediately
```

### Example Output

```
🔍 Scanning staged files for secrets...

   Scanning 5 staged file(s)...

=================================================
🚨 SECRETS DETECTED - COMMIT BLOCKED
=================================================

🔴 CRITICAL: 2 issue(s)
🟠 HIGH:     1 issue(s)

Details:

📄 src/config.ts
   🔴 Line 12: AWS Access Key ID
      AKIA***************
   🔴 Line 15: Stripe API Key
      sk_live_***********

📄 src/utils/github.ts
   🟠 Line 8: GitHub Personal Access Token
      ghp_***************

=================================================
⚠️  COMMIT REJECTED - SECRETS MUST BE REMOVED

To fix:
  1. Remove secrets from the code
  2. Use environment variables (.env files)
  3. Never commit .env files (add to .gitignore)
  4. Rotate any exposed credentials
```

---

## CI/CD Integration

### GitHub Actions Workflows

Four workflows are provided:

#### 1. **secret-scanning.yml** - PR and Push Scanning

Runs on every PR and push to main branches.

```yaml
# .github/workflows/secret-scanning.yml
name: Secret Scanning
on:
  pull_request:
    branches: [ main, master, develop ]
  push:
    branches: [ main, master, develop ]
```

**Features:**
- Scans all files in PR
- Comments on PR with results
- Blocks merge if secrets found
- Uploads scan artifacts

#### 2. **scheduled-secret-scan.yml** - Daily Audits

Runs daily at 2 AM UTC.

```yaml
schedule:
  - cron: '0 2 * * *'
```

**Features:**
- Full codebase scan
- Creates/updates GitHub issue if secrets found
- 90-day artifact retention
- Email notifications (optional)

#### 3. **code-scanning.yml** - SARIF Upload

Uploads results to GitHub Code Scanning.

```yaml
- uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: secret-scan-results.sarif
```

**Features:**
- SARIF format export
- GitHub Security tab integration
- Trend analysis
- Compliance reporting

#### 4. **manual-secret-scan.yml** - On-Demand Scanning

Manual trigger with options.

**Options:**
- **Scan Path**: Specific directory to scan
- **Severity Threshold**: Minimum severity to report
- **Fail on Detection**: Whether to fail the workflow
- **Create Issue**: Auto-create GitHub issue

### GitLab CI/CD

```yaml
# .gitlab-ci.yml
secret-scan:
  stage: security
  script:
    - npm ci
    - tsx scripts/ci-secret-scan.ts
  artifacts:
    reports:
      sast: secret-scan-results.sarif
  allow_failure: false
```

### Jenkins Pipeline

```groovy
stage('Secret Scanning') {
  steps {
    sh 'npm ci'
    sh 'tsx scripts/ci-secret-scan.ts'
    publishHTML([
      reportDir: '.',
      reportFiles: 'secret-scan-report.json',
      reportName: 'Secret Scan Report'
    ])
  }
}
```

---

## Dashboard

### Accessing the Dashboard

```
URL: http://localhost:3000/security/secret-scanning
Access: Authenticated users only
Permissions: VIEWER can view, USER can remediate, ADMIN full access
```

### Dashboard Features

#### Statistics Overview

- **Total Scans**: Number of scans performed
- **Active Secrets**: Currently unresolved secrets
- **Resolved Secrets**: Successfully remediated
- **Last Scan**: Most recent scan time

#### Recent Scans

View last 10 scans with:
- Timestamp and trigger (manual, PR, scheduled)
- Files scanned and duration
- Results (passed/failed)
- Issue counts by severity

#### Active Secrets List

Filter and search detected secrets:
- **Filters**: Severity, status, category
- **Search**: By file path or pattern name
- **Actions**: Resolve, mark false positive, remediate

#### Secret Details

Click any secret to view:
- Full file path and line number
- Severity and confidence level
- Detection timestamp
- Masked secret value
- Remediation suggestions

### API Endpoints

```typescript
// Get dashboard stats
GET /api/security/secret-scanning/stats

// Get recent scans
GET /api/security/secret-scanning/recent-scans?limit=10

// Get active secrets
GET /api/security/secret-scanning/active-secrets?status=open

// Trigger manual scan
POST /api/security/secret-scanning/scan
Body: { trigger: 'manual' }

// Update secret status
PATCH /api/security/secret-scanning/secrets/:id
Body: { status: 'resolved', notes: '...' }

// Export report
GET /api/security/secret-scanning/export?format=json|csv|pdf
```

---

## Remediation

### Automated Remediation Strategies

#### 1. **Environment Variables** (Recommended)

Migrates secret to `.env` file.

**Steps:**
1. Creates/updates `.env` with secret
2. Replaces code with `process.env.VAR_NAME`
3. Adds template to `.env.example`
4. Ensures `.env` in `.gitignore`

**Example:**
```typescript
// Before
const apiKey = 'sk_live_FAKE';

// After
const apiKey = process.env.STRIPE_API_KEY;

// .env
STRIPE_API_KEY=sk_live_FAKE

// .env.example
STRIPE_API_KEY=your_stripe_api_key_here
```

#### 2. **Credential Manager**

Uses platform's encrypted credential storage.

**Steps:**
1. Creates credential in Credential Manager
2. Replaces code with credential reference
3. Configures RBAC permissions

**Example:**
```typescript
// Before
const apiKey = 'sk_live_FAKE';

// After
const apiKey = $credentials('stripe-api-key');
```

#### 3. **AWS Secrets Manager**

Migrates to AWS Secrets Manager.

**Steps:**
1. Creates secret in AWS Secrets Manager
2. Updates code to fetch from AWS SDK
3. Configures IAM permissions
4. Removes hardcoded secret

#### 4. **Azure Key Vault**

Migrates to Azure Key Vault.

**Steps:**
1. Creates Azure Key Vault instance
2. Stores secret in Key Vault
3. Updates application to use Key Vault SDK
4. Configures managed identity

#### 5. **Remove Only**

Simply removes the secret (for testing/demo values).

### Remediation Workflow

1. **View Secret in Dashboard**
   - Navigate to Secret Scanning Dashboard
   - Click on detected secret

2. **Get Remediation Suggestions**
   ```typescript
   GET /api/security/remediation/suggestions/:secretId
   ```

3. **Preview Remediation**
   ```typescript
   POST /api/security/remediation/preview
   Body: { secretId, strategy: 'env_variable' }
   ```

4. **Execute Remediation**
   ```typescript
   POST /api/security/remediation/remediate
   Body: {
     secretId,
     strategy: 'env_variable',
     createPR: true
   }
   ```

5. **Rotate Secret**
   - Follow rotation instructions provided
   - Update secret at source
   - Test application
   - Mark as resolved in dashboard

### Batch Remediation

Remediate multiple secrets at once:

```typescript
POST /api/security/remediation/batch
Body: {
  secretIds: ['secret1', 'secret2', 'secret3'],
  strategy: 'env_variable',
  createPR: true
}
```

### Secret Rotation Guides

Platform provides detailed rotation instructions for each secret type:

```typescript
GET /api/security/remediation/rotation-guide/AWS%20Access%20Key
```

**Example Guide:**

1. **Revoke exposed secret** (CRITICAL - Do first)
2. **Generate new secret** with same permissions
3. **Update all applications** using the secret
4. **Test in all environments**
5. **Monitor for unauthorized access**
6. **Document the incident**

---

## Best Practices

### Development Workflow

1. **Never commit secrets** - Use environment variables
2. **Use .env files** - Keep secrets out of code
3. **Add .env to .gitignore** - Prevent accidental commits
4. **Use .env.example** - Document required variables
5. **Rotate regularly** - Change secrets periodically

### Secret Storage

✅ **DO:**
- Use environment variables
- Use credential managers (AWS Secrets Manager, Azure Key Vault)
- Encrypt secrets at rest
- Use RBAC for access control
- Audit secret access

❌ **DON'T:**
- Hardcode secrets in code
- Commit .env files
- Share secrets via email/chat
- Store secrets in version control
- Use same secret across environments

### Handling Exposed Secrets

If a secret is exposed:

1. **Immediately rotate** the secret at source
2. **Review audit logs** for unauthorized access
3. **Document the incident**
4. **Update all applications** with new secret
5. **Test thoroughly** in all environments
6. **Post-mortem** - Prevent future occurrences

### CI/CD Configuration

- **Run scans on every PR** - Catch secrets early
- **Block merges** if secrets detected
- **Schedule daily scans** - Catch missed secrets
- **Upload to Code Scanning** - Track trends
- **Set up notifications** - Alert security team

---

## Troubleshooting

### Pre-Commit Hook Not Running

**Problem:** Hook doesn't execute on commit

**Solutions:**
```bash
# Reinstall Husky
npx husky install

# Check hook file exists
ls -la .husky/pre-commit

# Make executable
chmod +x .husky/pre-commit

# Verify git hooks path
git config core.hooksPath
```

### False Positives

**Problem:** Scanner detects test/example values as secrets

**Solutions:**
1. Use `example` in variable names: `const exampleKey = '...'`
2. Add to `.env.example` instead of `.env`
3. Mark as false positive in dashboard
4. Update scanner patterns if persistent

### Scanner Performance

**Problem:** Scanning takes too long

**Solutions:**
```bash
# Exclude unnecessary directories
# .secret-scanner.config.json
{
  "scanning": {
    "exclude": [
      "node_modules/**",
      "dist/**",
      "build/**",
      "coverage/**"
    ]
  }
}

# Scan specific paths only
tsx scripts/ci-secret-scan.ts --path src/
```

### CI/CD Workflow Failing

**Problem:** GitHub Actions workflow fails

**Check:**
1. Node.js version (requires 20+)
2. Dependencies installed (`npm ci`)
3. Permissions set correctly
4. GitHub token has required scopes

### Remediation Failed

**Problem:** Auto-remediation doesn't work

**Solutions:**
1. Check file permissions
2. Ensure git working directory is clean
3. Verify GitHub CLI installed (`gh --version`)
4. Check RBAC permissions
5. Review error logs in dashboard

---

## Configuration

### Scanner Configuration

`.secret-scanner.config.json`:

```json
{
  "enabled": true,
  "scanOnCommit": true,
  "scanOnPush": true,
  "scanSchedule": "0 2 * * *",

  "scanning": {
    "include": ["**/*"],
    "exclude": [
      "node_modules/**",
      ".git/**",
      "dist/**"
    ],
    "maxFileSize": 1048576,
    "skipBinaryFiles": true
  },

  "reporting": {
    "failBuild": true,
    "createIssue": true,
    "commentOnPR": true
  },

  "severity": {
    "failOn": ["critical", "high"],
    "warnOn": ["medium"]
  }
}
```

### Custom Patterns

Add custom secret patterns:

```json
{
  "customPatterns": [
    {
      "id": "custom-api-key",
      "name": "Custom API Key",
      "pattern": "myapp_[a-f0-9]{32}",
      "severity": "high",
      "confidence": "high",
      "category": "Custom"
    }
  ]
}
```

---

## Statistics

**Phase 1 Week 3 Deliverables:**

- **Files Created**: 15
- **Lines of Code**: ~4,000
- **Tests Written**: 23
- **Detection Patterns**: 25+
- **Remediation Strategies**: 5
- **CI/CD Workflows**: 4
- **API Endpoints**: 12

---

## Support

For secret scanning questions or issues:

- 📧 **Security Team**: security@workflow-platform.com
- 📚 **Documentation**: https://docs.workflow-platform.com/security/secret-scanning
- 🐛 **Report Issues**: https://github.com/yourusername/workflow-platform/issues

---

**Last Updated:** January 2025
**Version:** 1.0.0
**Status:** ✅ Production Ready
