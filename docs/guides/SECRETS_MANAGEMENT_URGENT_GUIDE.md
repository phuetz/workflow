# 🚨 URGENT: Secrets Management Migration Guide

## ⚠️ CRITICAL SECURITY ISSUE

**Hardcoded secrets have been committed to version control!**

This guide will help you:
1. Remove secrets from git history (2-4 hours)
2. Set up proper secrets management
3. Rotate all exposed credentials
4. Implement secure practices going forward

---

## 📋 Table of Contents

1. [Immediate Actions (DO THIS NOW)](#1-immediate-actions-do-this-now)
2. [Remove Secrets from Git History](#2-remove-secrets-from-git-history)
3. [Choose a Secrets Manager](#3-choose-a-secrets-manager)
4. [Implementation Guide](#4-implementation-guide)
5. [Code Changes Required](#5-code-changes-required)
6. [Testing & Validation](#6-testing--validation)
7. [Security Checklist](#7-security-checklist)

---

## 1. Immediate Actions (DO THIS NOW)

### Step 1.1: Document Current Secrets (5 minutes)

Create a temporary secure file to track what needs rotation:

```bash
# Create a temporary secure file (NOT in git)
touch /tmp/secrets-to-rotate.txt
chmod 600 /tmp/secrets-to-rotate.txt

# List all exposed secrets
cat > /tmp/secrets-to-rotate.txt << 'EOF'
EXPOSED SECRETS - REQUIRES ROTATION:

From .env.example:
- JWT_SECRET: your-super-secret-jwt-key-change-in-production
- JWT_REFRESH_SECRET: your-super-secret-refresh-key-change-in-production
- SESSION_SECRET: your-super-secret-session-key-change-in-production
- ENCRYPTION_MASTER_KEY: your-super-secret-256-bit-encryption-master-key-change-in-production
- DATABASE_URL: postgresql://workflow_user:workflow_password@localhost:5432/workflow_db
- REDIS_PASSWORD: redis_password

From .env.test:
- JWT_SECRET: test-jwt-secret
- JWT_REFRESH_SECRET: test-refresh-secret
- SESSION_SECRET: test-session-secret
- DATABASE_URL: postgresql://postgres:postgres@localhost:5432/workflow_test

From .env.transformation:
- JWT_SECRET: change-this-secret-in-production
- DATABASE_URL: postgresql://user:password@localhost:5432/workflow

ROTATION PRIORITY:
1. Production database credentials (CRITICAL)
2. Production JWT secrets (CRITICAL)
3. Production encryption keys (CRITICAL)
4. Production session secrets (HIGH)
5. API keys for external services (MEDIUM)
EOF

echo "✅ Secrets documented in /tmp/secrets-to-rotate.txt"
```

### Step 1.2: Check Git Status (2 minutes)

```bash
cd /home/patrice/claude/workflow

# Check if these files are in git history
git log --all --full-history -- .env.example
git log --all --full-history -- .env.test
git log --all --full-history -- .env.transformation

# Count how many commits have these files
echo "Commits with .env files:"
git log --all --oneline -- .env* | wc -l
```

### Step 1.3: Verify .gitignore (2 minutes)

```bash
# Check current .gitignore
cat .gitignore | grep -E "^\.env"

# Verify it's working (should show nothing)
git status --ignored | grep -E "\.env$|\.env\.local|\.env\.production"
```

**CURRENT STATUS**: Your `.gitignore` has:
```
.env
.env.local
.env.production
```

**PROBLEM**: `.env.test`, `.env.transformation`, and `.env.example` are NOT ignored and ARE in git!

### Step 1.4: Stop Using Exposed Secrets (IMMEDIATE)

**If you have production systems running:**

```bash
# Generate new secrets immediately
node -e "console.log('NEW_JWT_SECRET=' + require('crypto').randomBytes(64).toString('base64'))"
node -e "console.log('NEW_REFRESH_SECRET=' + require('crypto').randomBytes(64).toString('base64'))"
node -e "console.log('NEW_SESSION_SECRET=' + require('crypto').randomBytes(64).toString('base64'))"
node -e "console.log('NEW_ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('base64'))"

# IMMEDIATELY update production:
# 1. Change database passwords
# 2. Update JWT secrets
# 3. Restart all services
# 4. Invalidate all existing sessions/tokens
```

⚠️ **WARNING**: Rotating secrets will:
- Log out all users
- Invalidate all API tokens
- Require users to re-authenticate
- May cause temporary downtime

---

## 2. Remove Secrets from Git History

### Option A: Using BFG Repo-Cleaner (RECOMMENDED - Faster)

#### Step 2.1: Install BFG

```bash
# Download BFG
cd /tmp
wget https://repo1.maven.org/maven2/com/madgag/bfg/1.14.0/bfg-1.14.0.jar
alias bfg='java -jar /tmp/bfg-1.14.0.jar'

# Or install via package manager
# Ubuntu/Debian:
# sudo apt-get install bfg
# macOS:
# brew install bfg
```

#### Step 2.2: Create Fresh Clone

```bash
# Create a fresh clone for cleaning
cd /tmp
git clone --mirror /home/patrice/claude/workflow workflow-cleanup.git
cd workflow-cleanup.git
```

#### Step 2.3: Clean Secrets

```bash
# Create a file with secrets to remove
cat > /tmp/secrets-pattern.txt << 'EOF'
your-super-secret-jwt-key-change-in-production
your-super-secret-refresh-key-change-in-production
your-super-secret-session-key-change-in-production
your-super-secret-256-bit-encryption-master-key-change-in-production
workflow_password
redis_password
test-jwt-secret
test-refresh-secret
test-session-secret
change-this-secret-in-production
EOF

# Run BFG to replace secrets with REDACTED
bfg --replace-text /tmp/secrets-pattern.txt workflow-cleanup.git

# Clean up
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Push the cleaned history (DANGEROUS - READ WARNING BELOW)
# git push --force
```

⚠️ **CRITICAL WARNING BEFORE FORCE PUSH**:
- This will rewrite git history
- ALL collaborators must re-clone the repo
- Open pull requests will break
- CI/CD pipelines may need updates
- Notify your team BEFORE doing this

### Option B: Using git-filter-repo (More Control)

#### Step 2.1: Install git-filter-repo

```bash
# Install
pip3 install git-filter-repo

# Or download directly
cd /tmp
wget https://raw.githubusercontent.com/newren/git-filter-repo/main/git-filter-repo
chmod +x git-filter-repo
sudo mv git-filter-repo /usr/local/bin/
```

#### Step 2.2: Create Replacements File

```bash
cd /home/patrice/claude/workflow

# Create replacements
cat > /tmp/secrets-replacements.txt << 'EOF'
your-super-secret-jwt-key-change-in-production==>REDACTED_JWT_SECRET
your-super-secret-refresh-key-change-in-production==>REDACTED_REFRESH_SECRET
your-super-secret-session-key-change-in-production==>REDACTED_SESSION_SECRET
workflow_password==>REDACTED_DB_PASSWORD
postgres:postgres==>REDACTED_DB_CREDENTIALS
redis_password==>REDACTED_REDIS_PASSWORD
test-jwt-secret==>REDACTED_TEST_JWT
test-refresh-secret==>REDACTED_TEST_REFRESH
change-this-secret-in-production==>REDACTED_PRODUCTION_SECRET
EOF
```

#### Step 2.3: Run Filter

```bash
# BACKUP FIRST!
cp -r /home/patrice/claude/workflow /tmp/workflow-backup-$(date +%Y%m%d_%H%M%S)

# Run filter-repo
cd /home/patrice/claude/workflow
git filter-repo --replace-text /tmp/secrets-replacements.txt --force

# Note: This removes remote tracking - you'll need to re-add it
git remote add origin YOUR_REMOTE_URL
```

### Option C: Nuclear Option - Delete Files from History

```bash
cd /home/patrice/claude/workflow

# Remove files completely from history
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env.test .env.transformation" \
  --prune-empty --tag-name-filter cat -- --all

# Clean up
rm -rf .git/refs/original/
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

### Step 2.4: Verify Cleanup

```bash
# Search for any remaining secrets
git log --all -S "workflow_password" --source --all
git log --all -S "test-jwt-secret" --source --all
git log --all -S "your-super-secret" --source --all

# Should return nothing if cleaned properly
```

---

## 3. Choose a Secrets Manager

### Comparison Table

| Solution | Setup Time | Cost | Ease of Use | Features | Best For |
|----------|-----------|------|-------------|----------|----------|
| **Doppler** | 15 min | Free tier | ⭐⭐⭐⭐⭐ | Dashboard, CLI, syncing | Startups, quick setup |
| **AWS Secrets Manager** | 30 min | $0.40/secret/month | ⭐⭐⭐⭐ | Auto-rotation, AWS integration | AWS-heavy infrastructure |
| **HashiCorp Vault** | 2-4 hours | Free (self-hosted) | ⭐⭐⭐ | Most powerful, enterprise | Large teams, compliance |
| **Azure Key Vault** | 30 min | $0.03/10k operations | ⭐⭐⭐⭐ | Azure integration | Azure users |
| **Google Secret Manager** | 30 min | $0.06/10k operations | ⭐⭐⭐⭐ | GCP integration | GCP users |
| **.env + encryption** | 10 min | Free | ⭐⭐⭐ | Simple, local | Solo dev, small projects |

**Recommendation**:
- **Quick Start (2 hours)**: Doppler
- **AWS Users**: AWS Secrets Manager
- **Enterprise/Compliance**: HashiCorp Vault
- **Small Team**: Encrypted .env with git-crypt

---

## 4. Implementation Guide

### Option 1: Doppler (RECOMMENDED for Quick Setup)

#### Step 4.1.1: Install Doppler CLI

```bash
# Install Doppler CLI
# macOS
brew install dopplerhq/cli/doppler

# Linux
curl -Ls --tlsv1.2 --proto "=https" --retry 3 https://cli.doppler.com/install.sh | sh

# Verify installation
doppler --version
```

#### Step 4.1.2: Sign Up and Login

```bash
# Create account at https://dashboard.doppler.com/register
# Then login
doppler login
```

#### Step 4.1.3: Setup Project

```bash
cd /home/patrice/claude/workflow

# Initialize Doppler
doppler setup

# Select or create project: "workflow-automation"
# Select environment: "development"

# Create environments
doppler environments create development
doppler environments create staging
doppler environments create production
```

#### Step 4.1.4: Upload Secrets

```bash
# Switch to development environment
doppler setup --config development

# Upload secrets from .env.example (will prompt for each)
doppler secrets upload .env.example

# Or add secrets individually
doppler secrets set JWT_SECRET "$(openssl rand -base64 64)"
doppler secrets set JWT_REFRESH_SECRET "$(openssl rand -base64 64)"
doppler secrets set SESSION_SECRET "$(openssl rand -base64 64)"
doppler secrets set ENCRYPTION_MASTER_KEY "$(openssl rand -base64 32)"
doppler secrets set DATABASE_URL "postgresql://user:pass@host:5432/db"

# Repeat for staging and production
doppler setup --config production
doppler secrets set JWT_SECRET "$(openssl rand -base64 64)"
# ... etc
```

#### Step 4.1.5: Update Application Code

```typescript
// src/config/secrets.ts
import { config } from 'dotenv';
import { execSync } from 'child_process';

let secretsLoaded = false;

export async function loadSecrets() {
  if (secretsLoaded) return;

  if (process.env.NODE_ENV === 'production') {
    // In production, secrets should be injected by Doppler
    // Verify they exist
    const requiredSecrets = [
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
      'DATABASE_URL',
      'ENCRYPTION_MASTER_KEY'
    ];

    const missing = requiredSecrets.filter(key => !process.env[key]);
    if (missing.length > 0) {
      throw new Error(`Missing required secrets: ${missing.join(', ')}`);
    }
  } else {
    // Development: Load from Doppler or .env.local
    if (process.env.USE_DOPPLER === 'true') {
      try {
        // Doppler will inject secrets
        console.log('Using Doppler for secrets management');
      } catch (error) {
        console.warn('Doppler not available, falling back to .env.local');
        config({ path: '.env.local' });
      }
    } else {
      // Load from .env.local (not committed to git)
      config({ path: '.env.local' });
    }
  }

  secretsLoaded = true;
}

export function getSecret(key: string, required = true): string {
  const value = process.env[key];
  if (required && !value) {
    throw new Error(`Secret ${key} is not set`);
  }
  return value || '';
}
```

#### Step 4.1.6: Update package.json

```json
{
  "scripts": {
    "dev": "doppler run -- concurrently \"npm run dev:frontend\" \"npm run dev:backend\"",
    "dev:frontend": "doppler run --config development -- vite --host 0.0.0.0 --port 3000",
    "dev:backend": "doppler run --config development -- nodemon --watch src --ext ts,tsx --exec \"tsx --tsconfig tsconfig.dev.json src/backend/api/server.ts\"",
    "build": "tsc -p tsconfig.build.json && vite build",
    "start:prod": "doppler run --config production -- node dist/src/backend/api/server.js"
  }
}
```

#### Step 4.1.7: CI/CD Integration

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install Doppler CLI
        run: |
          curl -Ls https://cli.doppler.com/install.sh | sh

      - name: Deploy
        env:
          DOPPLER_TOKEN: ${{ secrets.DOPPLER_TOKEN_PRODUCTION }}
        run: |
          doppler run -- npm run build
          doppler run -- npm run deploy
```

### Option 2: AWS Secrets Manager

#### Step 4.2.1: Install AWS CLI

```bash
# Install AWS CLI v2
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure
aws configure
# Enter: Access Key ID, Secret Access Key, Region (us-east-1), Output (json)
```

#### Step 4.2.2: Create Secrets in AWS

```bash
# Create secrets
aws secretsmanager create-secret \
  --name workflow/production/jwt-secret \
  --secret-string "$(openssl rand -base64 64)" \
  --description "Production JWT Secret"

aws secretsmanager create-secret \
  --name workflow/production/database-url \
  --secret-string "postgresql://user:$(openssl rand -base64 32)@rds-endpoint:5432/workflow" \
  --description "Production Database URL"

aws secretsmanager create-secret \
  --name workflow/production/encryption-key \
  --secret-string "$(openssl rand -base64 32)" \
  --description "Production Encryption Master Key"

# Enable automatic rotation (optional)
aws secretsmanager rotate-secret \
  --secret-id workflow/production/jwt-secret \
  --rotation-lambda-arn arn:aws:lambda:us-east-1:123456789:function:rotate-secret \
  --rotation-rules AutomaticallyAfterDays=30
```

#### Step 4.2.3: Create IAM Policy

```bash
# Create policy file
cat > /tmp/secrets-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": "arn:aws:secretsmanager:us-east-1:*:secret:workflow/*"
    }
  ]
}
EOF

# Create policy
aws iam create-policy \
  --policy-name WorkflowSecretsReadOnly \
  --policy-document file:///tmp/secrets-policy.json

# Attach to role (for EC2/ECS)
aws iam attach-role-policy \
  --role-name workflow-app-role \
  --policy-arn arn:aws:iam::123456789:policy/WorkflowSecretsReadOnly
```

#### Step 4.2.4: Install AWS SDK

```bash
npm install @aws-sdk/client-secrets-manager
```

#### Step 4.2.5: Create Secrets Loader

```typescript
// src/config/aws-secrets.ts
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';

const client = new SecretsManagerClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

interface SecretCache {
  [key: string]: {
    value: string;
    expiresAt: number;
  };
}

const cache: SecretCache = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getSecret(secretName: string): Promise<string> {
  // Check cache first
  const cached = cache[secretName];
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  try {
    const command = new GetSecretValueCommand({
      SecretId: secretName,
    });

    const response = await client.send(command);
    const secretValue = response.SecretString;

    if (!secretValue) {
      throw new Error(`Secret ${secretName} is empty`);
    }

    // Cache the secret
    cache[secretName] = {
      value: secretValue,
      expiresAt: Date.now() + CACHE_TTL,
    };

    return secretValue;
  } catch (error) {
    console.error(`Error fetching secret ${secretName}:`, error);
    throw error;
  }
}

export async function loadAWSSecrets() {
  const env = process.env.NODE_ENV || 'development';
  const prefix = `workflow/${env}`;

  try {
    // Load all required secrets
    const secrets = await Promise.all([
      getSecret(`${prefix}/jwt-secret`),
      getSecret(`${prefix}/jwt-refresh-secret`),
      getSecret(`${prefix}/database-url`),
      getSecret(`${prefix}/encryption-key`),
      getSecret(`${prefix}/session-secret`),
    ]);

    // Set environment variables
    process.env.JWT_SECRET = secrets[0];
    process.env.JWT_REFRESH_SECRET = secrets[1];
    process.env.DATABASE_URL = secrets[2];
    process.env.ENCRYPTION_MASTER_KEY = secrets[3];
    process.env.SESSION_SECRET = secrets[4];

    console.log('✅ AWS Secrets loaded successfully');
  } catch (error) {
    console.error('❌ Failed to load AWS secrets:', error);
    throw error;
  }
}
```

#### Step 4.2.6: Update Server Startup

```typescript
// src/backend/api/server.ts
import { loadAWSSecrets } from '../../config/aws-secrets';

async function startServer() {
  try {
    // Load secrets first
    if (process.env.NODE_ENV === 'production') {
      await loadAWSSecrets();
    } else {
      // Development: use .env.local
      require('dotenv').config({ path: '.env.local' });
    }

    // Now start the server
    const app = require('./app').default;
    const port = process.env.API_PORT || 3001;

    app.listen(port, () => {
      console.log(`✅ Server running on port ${port}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
```

### Option 3: HashiCorp Vault

#### Step 4.3.1: Install Vault

```bash
# Download and install Vault
wget https://releases.hashicorp.com/vault/1.15.0/vault_1.15.0_linux_amd64.zip
unzip vault_1.15.0_linux_amd64.zip
sudo mv vault /usr/local/bin/

# Verify
vault --version
```

#### Step 4.3.2: Start Vault Server (Development)

```bash
# Start dev server (NOT for production!)
vault server -dev

# In another terminal, set environment variables
export VAULT_ADDR='http://127.0.0.1:8200'
export VAULT_TOKEN='root'  # Use the token from server output

# Verify connection
vault status
```

#### Step 4.3.3: Enable Secrets Engine

```bash
# Enable KV v2 secrets engine
vault secrets enable -path=workflow kv-v2

# Create secrets
vault kv put workflow/production \
  jwt_secret="$(openssl rand -base64 64)" \
  jwt_refresh_secret="$(openssl rand -base64 64)" \
  database_url="postgresql://user:pass@localhost:5432/workflow" \
  encryption_key="$(openssl rand -base64 32)" \
  session_secret="$(openssl rand -base64 64)"

# Verify
vault kv get workflow/production
```

#### Step 4.3.4: Create Vault Policy

```bash
# Create policy file
cat > /tmp/workflow-policy.hcl << 'EOF'
path "workflow/data/production" {
  capabilities = ["read"]
}

path "workflow/data/development" {
  capabilities = ["read", "list"]
}

path "workflow/data/staging" {
  capabilities = ["read", "list"]
}
EOF

# Apply policy
vault policy write workflow-app /tmp/workflow-policy.hcl

# Create app token
vault token create -policy=workflow-app -ttl=720h
# Save this token securely!
```

#### Step 4.3.5: Install Vault Client

```bash
npm install node-vault
```

#### Step 4.3.6: Create Vault Loader

```typescript
// src/config/vault-secrets.ts
import vault from 'node-vault';

let vaultClient: any;

export async function initVault() {
  vaultClient = vault({
    apiVersion: 'v1',
    endpoint: process.env.VAULT_ADDR || 'http://127.0.0.1:8200',
    token: process.env.VAULT_TOKEN,
  });

  // Verify connection
  try {
    await vaultClient.health();
    console.log('✅ Connected to Vault');
  } catch (error) {
    console.error('❌ Failed to connect to Vault:', error);
    throw error;
  }
}

export async function loadVaultSecrets() {
  if (!vaultClient) {
    await initVault();
  }

  const env = process.env.NODE_ENV || 'development';

  try {
    const result = await vaultClient.read(`workflow/data/${env}`);
    const secrets = result.data.data;

    // Set environment variables
    process.env.JWT_SECRET = secrets.jwt_secret;
    process.env.JWT_REFRESH_SECRET = secrets.jwt_refresh_secret;
    process.env.DATABASE_URL = secrets.database_url;
    process.env.ENCRYPTION_MASTER_KEY = secrets.encryption_key;
    process.env.SESSION_SECRET = secrets.session_secret;

    console.log('✅ Vault secrets loaded successfully');
  } catch (error) {
    console.error('❌ Failed to load Vault secrets:', error);
    throw error;
  }
}

export async function rotateSecret(key: string, newValue: string) {
  const env = process.env.NODE_ENV || 'development';

  try {
    // Read current secrets
    const result = await vaultClient.read(`workflow/data/${env}`);
    const secrets = result.data.data;

    // Update the specific secret
    secrets[key] = newValue;

    // Write back
    await vaultClient.write(`workflow/data/${env}`, secrets);

    console.log(`✅ Secret ${key} rotated successfully`);
  } catch (error) {
    console.error(`❌ Failed to rotate secret ${key}:`, error);
    throw error;
  }
}
```

### Option 4: Simple Encrypted .env (Fallback)

#### Step 4.4.1: Install git-crypt

```bash
# Install git-crypt
# Ubuntu/Debian
sudo apt-get install git-crypt

# macOS
brew install git-crypt

# Initialize in repo
cd /home/patrice/claude/workflow
git-crypt init
```

#### Step 4.4.2: Configure Encryption

```bash
# Create .gitattributes
cat > .gitattributes << 'EOF'
.env.local filter=git-crypt diff=git-crypt
.env.production filter=git-crypt diff=git-crypt
secrets/** filter=git-crypt diff=git-crypt
EOF

git add .gitattributes
git commit -m "Configure git-crypt for secrets"
```

#### Step 4.4.3: Export Keys for Team

```bash
# Export key for yourself
git-crypt export-key /tmp/workflow-secrets.key
chmod 600 /tmp/workflow-secrets.key

# Share with team members (SECURELY!)
# Each team member unlocks with:
# git-crypt unlock /path/to/workflow-secrets.key
```

---

## 5. Code Changes Required

### Update Backend Server Entry Point

```typescript
// src/backend/api/server.ts
import { config } from 'dotenv';
import { validateEnv } from '../../utils/validateEnv';

// Choose your secrets management solution:
// import { loadSecrets } from '../../config/secrets'; // Doppler
// import { loadAWSSecrets } from '../../config/aws-secrets'; // AWS
// import { loadVaultSecrets } from '../../config/vault-secrets'; // Vault

async function bootstrap() {
  try {
    // 1. Load secrets based on environment
    if (process.env.NODE_ENV === 'production') {
      // Production: Use secrets manager
      // await loadAWSSecrets();
      // OR
      // await loadVaultSecrets();
      // Doppler injects automatically via CLI
      console.log('Production: Secrets loaded from secrets manager');
    } else if (process.env.NODE_ENV === 'test') {
      // Test: Use test config
      config({ path: '.env.test' });
      console.log('Test: Loaded .env.test');
    } else {
      // Development: Use .env.local (not committed)
      config({ path: '.env.local' });
      console.log('Development: Loaded .env.local');
    }

    // 2. Validate environment variables
    validateEnv(process.env.NODE_ENV === 'production');

    // 3. Start the application
    const app = (await import('./app')).default;
    const port = parseInt(process.env.API_PORT || '3001', 10);

    const server = app.listen(port, '0.0.0.0', () => {
      console.log(`✅ Server running on port ${port}`);
      console.log(`   Environment: ${process.env.NODE_ENV}`);
      console.log(`   Database: ${process.env.DATABASE_URL?.split('@')[1] || 'Not configured'}`);
    });

    // Graceful shutdown
    const shutdown = async () => {
      console.log('Shutting down gracefully...');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();
```

### Update Environment Validation

```typescript
// src/utils/validateEnv.ts - Add to existing file

export function validateProductionSecrets(): void {
  const requiredSecrets = [
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'DATABASE_URL',
    'ENCRYPTION_MASTER_KEY',
    'SESSION_SECRET',
  ];

  const missing: string[] = [];
  const weak: string[] = [];

  for (const secret of requiredSecrets) {
    const value = process.env[secret];

    if (!value) {
      missing.push(secret);
      continue;
    }

    // Check for weak/default values
    const weakPatterns = [
      'your-',
      'change-',
      'secret',
      'password',
      'test',
      '123456',
      'default',
    ];

    if (weakPatterns.some(pattern => value.toLowerCase().includes(pattern))) {
      weak.push(secret);
    }

    // Check minimum length
    if (value.length < 32) {
      weak.push(secret);
    }
  }

  if (missing.length > 0) {
    throw new Error(`Missing required secrets: ${missing.join(', ')}`);
  }

  if (weak.length > 0) {
    throw new Error(`Weak or default secrets detected: ${weak.join(', ')}`);
  }

  console.log('✅ All production secrets validated');
}
```

### Docker Integration

```dockerfile
# Dockerfile
FROM node:20-alpine AS base

# For Doppler
RUN apk add --no-cache curl && \
    curl -Ls https://cli.doppler.com/install.sh | sh

FROM base AS production

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist
COPY public ./public

# Don't copy .env files!
# Secrets will be injected at runtime

EXPOSE 3000 3001

# Use Doppler to inject secrets
CMD ["doppler", "run", "--", "node", "dist/src/backend/api/server.js"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    environment:
      # For Doppler
      - DOPPLER_TOKEN=${DOPPLER_TOKEN}
      # Or for AWS Secrets Manager
      # - AWS_REGION=${AWS_REGION}
      # - AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
      # - AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
    ports:
      - "3000:3000"
      - "3001:3001"
    depends_on:
      - db
      - redis

  db:
    image: postgres:15-alpine
    environment:
      # Load from secrets manager, not hardcoded!
      - POSTGRES_PASSWORD_FILE=/run/secrets/db_password
    secrets:
      - db_password
    volumes:
      - postgres_data:/var/lib/postgresql/data

secrets:
  db_password:
    external: true
```

### Kubernetes Integration

```yaml
# k8s/secret-provider.yaml
apiVersion: secrets-store.csi.x-k8s.io/v1
kind: SecretProviderClass
metadata:
  name: workflow-secrets
spec:
  provider: aws # or vault, azure
  parameters:
    objects: |
      - objectName: "workflow/production/jwt-secret"
        objectType: "secretsmanager"
        objectAlias: "jwt-secret"
      - objectName: "workflow/production/database-url"
        objectType: "secretsmanager"
        objectAlias: "database-url"
  secretObjects:
  - secretName: workflow-app-secrets
    type: Opaque
    data:
    - objectName: jwt-secret
      key: JWT_SECRET
    - objectName: database-url
      key: DATABASE_URL
```

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: workflow-app
spec:
  template:
    spec:
      serviceAccountName: workflow-app-sa
      containers:
      - name: app
        image: workflow-app:latest
        envFrom:
        - secretRef:
            name: workflow-app-secrets
        volumeMounts:
        - name: secrets-store
          mountPath: "/mnt/secrets"
          readOnly: true
      volumes:
      - name: secrets-store
        csi:
          driver: secrets-store.csi.k8s.io
          readOnly: true
          volumeAttributes:
            secretProviderClass: "workflow-secrets"
```

---

## 6. Testing & Validation

### Step 6.1: Create Test Scripts

```bash
# test-secrets.sh
#!/bin/bash

echo "🧪 Testing Secrets Management"

# Test 1: Verify secrets are loaded
echo "Test 1: Checking environment variables..."
node -e "
const required = ['JWT_SECRET', 'DATABASE_URL', 'ENCRYPTION_MASTER_KEY'];
const missing = required.filter(k => !process.env[k]);
if (missing.length > 0) {
  console.error('❌ Missing secrets:', missing);
  process.exit(1);
}
console.log('✅ All secrets present');
"

# Test 2: Verify no hardcoded secrets
echo "Test 2: Checking for hardcoded secrets..."
if git grep -E "your-super-secret|workflow_password|test-jwt-secret" -- '*.ts' '*.tsx' '*.js' '*.json'; then
  echo "❌ Found hardcoded secrets!"
  exit 1
else
  echo "✅ No hardcoded secrets found"
fi

# Test 3: Verify .env files are ignored
echo "Test 3: Checking .gitignore..."
if git ls-files | grep -E "^\.env$|^\.env\.local$|^\.env\.production$"; then
  echo "❌ .env files are tracked by git!"
  exit 1
else
  echo "✅ .env files properly ignored"
fi

# Test 4: Test database connection
echo "Test 4: Testing database connection..."
node -e "
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect()
  .then(() => {
    console.log('✅ Database connection successful');
    client.end();
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  });
"

echo "✅ All tests passed!"
```

### Step 6.2: Local Testing

```bash
cd /home/patrice/claude/workflow

# Test with Doppler
doppler run --config development -- npm run test

# Test without Doppler (should fail gracefully)
npm run test

# Test server startup
doppler run --config development -- npm run dev:backend
```

### Step 6.3: CI/CD Testing

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test_password
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Install Doppler CLI
        run: |
          curl -Ls https://cli.doppler.com/install.sh | sh

      - name: Run tests with Doppler
        env:
          DOPPLER_TOKEN: ${{ secrets.DOPPLER_TOKEN_DEVELOPMENT }}
        run: |
          doppler run -- npm run test:coverage

      - name: Verify no secrets in code
        run: |
          if git grep -E "your-super-secret|workflow_password" -- '*.ts' '*.js'; then
            echo "Found hardcoded secrets!"
            exit 1
          fi
```

---

## 7. Security Checklist

### Pre-Migration Checklist

- [ ] **Documented all exposed secrets** in secure temporary file
- [ ] **Backed up repository** before modifying git history
- [ ] **Notified team** about upcoming git history rewrite
- [ ] **Identified production systems** that will need secret rotation
- [ ] **Planned maintenance window** for secret rotation

### Migration Checklist

- [ ] **Removed secrets from git history** using BFG or git-filter-repo
- [ ] **Verified cleanup** by searching git history for old secrets
- [ ] **Updated .gitignore** to include all .env variants
- [ ] **Created .env.example** with placeholder values only
- [ ] **Chose secrets management solution** (Doppler, AWS, Vault, etc.)
- [ ] **Set up secrets manager** and uploaded all secrets
- [ ] **Updated application code** to load secrets from manager
- [ ] **Tested locally** with new secrets management
- [ ] **Updated CI/CD pipelines** to use secrets manager

### Post-Migration Checklist

- [ ] **Rotated all exposed secrets**:
  - [ ] JWT secrets (will invalidate all sessions)
  - [ ] Database passwords
  - [ ] Encryption keys (will break existing encrypted data!)
  - [ ] Session secrets
  - [ ] API keys (OpenAI, Anthropic, etc.)
  - [ ] OAuth client secrets

- [ ] **Updated production systems**:
  - [ ] Redeployed with new secret loading mechanism
  - [ ] Verified services can access secrets
  - [ ] Checked logs for secret loading errors
  - [ ] Tested authentication and encryption

- [ ] **Verified security**:
  - [ ] No secrets in git history (`git log -S "secret_value"`)
  - [ ] No secrets in .env files committed to git
  - [ ] .gitignore properly configured
  - [ ] Secrets manager access controls configured
  - [ ] Audit logging enabled

- [ ] **Documentation**:
  - [ ] Updated README with secrets setup instructions
  - [ ] Documented secret rotation procedure
  - [ ] Created runbook for emergency secret rotation
  - [ ] Trained team on new secrets workflow

### Ongoing Security Practices

- [ ] **Enable automatic rotation** for secrets (30-90 days)
- [ ] **Set up alerts** for secret access/failures
- [ ] **Implement secret scanning** in CI/CD (GitGuardian, TruffleHog)
- [ ] **Regular security audits** of secrets usage
- [ ] **Use different secrets** per environment (dev/staging/prod)
- [ ] **Monitor audit logs** in secrets manager
- [ ] **Implement break-glass procedures** for emergency access
- [ ] **Document secret recovery procedures**

---

## 8. Emergency Procedures

### If Secrets Are Actively Compromised

```bash
# 1. IMMEDIATELY rotate all production secrets
# Database
psql -c "ALTER USER workflow_user PASSWORD '$(openssl rand -base64 32)';"

# AWS Secrets Manager
aws secretsmanager rotate-secret --secret-id workflow/production/jwt-secret

# 2. Invalidate all sessions
redis-cli FLUSHDB

# 3. Force logout all users
curl -X POST https://api.yourapp.com/admin/invalidate-all-sessions \
  -H "Authorization: Bearer ADMIN_TOKEN"

# 4. Check access logs for unauthorized access
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=ResourceName,AttributeValue=workflow/production/jwt-secret \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S)

# 5. Notify security team and users
```

### Secret Rotation Script

```bash
#!/bin/bash
# rotate-secrets.sh

set -e

echo "🔄 Starting secret rotation..."

# Backup current secrets
doppler secrets download --config production --format json > /tmp/secrets-backup-$(date +%Y%m%d_%H%M%S).json
chmod 600 /tmp/secrets-backup-*.json

# Generate new secrets
NEW_JWT_SECRET=$(openssl rand -base64 64)
NEW_REFRESH_SECRET=$(openssl rand -base64 64)
NEW_SESSION_SECRET=$(openssl rand -base64 64)

# Update in secrets manager
doppler secrets set JWT_SECRET "$NEW_JWT_SECRET" --config production
doppler secrets set JWT_REFRESH_SECRET "$NEW_REFRESH_SECRET" --config production
doppler secrets set SESSION_SECRET "$NEW_SESSION_SECRET" --config production

# Trigger rolling restart
kubectl rollout restart deployment/workflow-app

# Verify deployment
kubectl rollout status deployment/workflow-app

echo "✅ Secret rotation complete!"
echo "⚠️  All users will need to re-authenticate"
```

---

## 9. Quick Reference

### Generate Strong Secrets

```bash
# 32-byte encryption key (base64)
openssl rand -base64 32

# 64-byte secret (base64)
openssl rand -base64 64

# 32-byte hex string
openssl rand -hex 32

# UUID
uuidgen

# Using Node.js crypto
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Common Commands

```bash
# Doppler
doppler secrets                          # List all secrets
doppler secrets set KEY value            # Set a secret
doppler secrets delete KEY               # Delete a secret
doppler run -- npm start                 # Run with secrets injected

# AWS Secrets Manager
aws secretsmanager get-secret-value --secret-id NAME
aws secretsmanager update-secret --secret-id NAME --secret-string VALUE
aws secretsmanager rotate-secret --secret-id NAME

# HashiCorp Vault
vault kv get workflow/production
vault kv put workflow/production key=value
vault kv delete workflow/production
```

### Troubleshooting

```bash
# Check if secret is set
echo $JWT_SECRET

# Test database connection
psql $DATABASE_URL -c "SELECT 1"

# Test Doppler connection
doppler secrets --config development

# Check git for secrets
git log --all -S "secret_value" --source --all

# Find .env files
find . -name ".env*" -type f
```

---

## 10. Next Steps

1. **Complete the migration** following this guide (2-4 hours)
2. **Force push cleaned repository** (after team notification)
3. **Rotate all exposed secrets** in production
4. **Set up automated secret scanning** in CI/CD
5. **Create incident response plan** for future leaks
6. **Schedule quarterly secret rotations**
7. **Train team** on new secrets workflow

---

## Support Resources

- **Doppler**: https://docs.doppler.com/
- **AWS Secrets Manager**: https://docs.aws.amazon.com/secretsmanager/
- **HashiCorp Vault**: https://developer.hashicorp.com/vault
- **BFG Repo-Cleaner**: https://rtyley.github.io/bfg-repo-cleaner/
- **git-filter-repo**: https://github.com/newren/git-filter-repo
- **git-crypt**: https://github.com/AGWA/git-crypt

---

## ⚠️ FINAL WARNINGS

1. **DO NOT** commit .env files to git
2. **DO NOT** share secrets via Slack, email, or other unsecured channels
3. **DO NOT** use weak or default secrets in production
4. **DO NOT** skip rotating exposed secrets
5. **DO NOT** force push without notifying your team
6. **DO** test thoroughly before deploying to production
7. **DO** have a rollback plan
8. **DO** monitor logs after deployment

---

**This guide is URGENT. Start immediately.**

**Estimated time: 2-4 hours for complete migration**

**Questions? Check the troubleshooting section or consult your security team.**
