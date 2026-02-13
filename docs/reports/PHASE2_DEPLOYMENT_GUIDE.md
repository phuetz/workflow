# Phase 2: Production Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying Phase 2 (Runtime Security & Protection) to production environments. Phase 2 focuses on implementing comprehensive input validation, audit logging, compliance frameworks, and automated security monitoring.

**What's Being Deployed**:
- Input validation and sanitization systems
- Audit logging and compliance tracking
- Security monitoring and real-time alerting
- Automated threat detection and response
- Compliance framework implementation (SOC2, ISO 27001, HIPAA, GDPR, PCI DSS)

**Estimated Deployment Time**: 4-6 hours
**Estimated Post-Deployment Validation**: 2-3 hours

**Success Rate Target**: 99.95% uptime
**Rollback Time SLA**: <15 minutes

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Phase 1: Staging Deployment](#phase-1-staging-deployment)
4. [Phase 2: Production Deployment](#phase-2-production-deployment)
5. [Phase 3: Post-Deployment](#phase-3-post-deployment)
6. [Monitoring & Maintenance](#monitoring--maintenance)
7. [Troubleshooting](#troubleshooting)
8. [Rollback Procedure](#rollback-procedure)
9. [Security Hardening](#security-hardening)
10. [Compliance Verification](#compliance-verification)

---

## Prerequisites

### System Requirements

**Production Server Specifications**:

| Component | Minimum | Recommended | Enterprise |
|-----------|---------|-------------|------------|
| CPU Cores | 4 cores | 8 cores | 16+ cores |
| RAM | 8GB | 16GB | 32GB+ |
| Disk Space | 100GB SSD | 250GB SSD | 500GB+ NVMe |
| Disk Type | SSD | NVMe | NVMe RAID-10 |
| Network | 100Mbps | 1Gbps | 10Gbps |

**Supported Operating Systems**:
- Ubuntu 20.04 LTS (recommended)
- Ubuntu 22.04 LTS
- Debian 11 (Bullseye)
- Debian 12 (Bookworm)
- RHEL 8.x
- RHEL 9.x
- CentOS 8.x Stream

**Required Software Versions**:
- Node.js 20.x or higher (20.12.2 minimum)
- npm 10.x or higher (10.8.2 minimum)
- PostgreSQL 15+ (PostgreSQL 16 recommended)
- Redis 7+ (Redis 7.2+ recommended)
- Git 2.40+
- Docker & Docker Compose (optional, for containerized deployment)

**Network Requirements**:

| Port | Protocol | Purpose | Direction |
|------|----------|---------|-----------|
| 22 | SSH | Server Management | Inbound |
| 80 | HTTP | Web Traffic (Redirect) | Inbound |
| 443 | HTTPS | Secure Web Traffic | Inbound |
| 5432 | PostgreSQL | Database Connection | Internal Only |
| 6379 | Redis | Cache & Queue | Internal Only |
| 587 | SMTP | Email Alerts | Outbound |
| 25 | SMTP | Email Alerts (Alt) | Outbound |
| 443 | HTTPS | Webhook Outbound | Outbound |

### Access Requirements

**Required Credentials**:
- [ ] SSH access to production servers (key-based auth)
- [ ] PostgreSQL superuser credentials
- [ ] Redis access credentials
- [ ] SMTP server credentials
- [ ] DNS provider admin access
- [ ] SSL certificate (Let's Encrypt or commercial)
- [ ] Slack workspace admin access (for webhooks)
- [ ] Microsoft Teams admin access (if using Teams)
- [ ] PagerDuty API key (if using PagerDuty)
- [ ] Twilio credentials (for SMS alerts)
- [ ] DataDog/New Relic API keys (for monitoring)

**Required Permissions**:
- [ ] Sudo access on all servers
- [ ] Database backup access
- [ ] Log file access
- [ ] Certificate renewal permissions
- [ ] Firewall management access

### Pre-Deployment Knowledge

Ensure your team understands:
- [ ] Basic shell scripting
- [ ] Docker container basics
- [ ] PostgreSQL administration
- [ ] Nginx/Reverse proxy configuration
- [ ] SSL/TLS certificate management
- [ ] Linux system administration
- [ ] Process management with PM2

---

## Pre-Deployment Checklist

### Code Quality Verification

Execute these commands to verify code readiness:

```bash
# Navigate to project root
cd /path/to/workflow-automation

# 1. Verify all tests pass
npm run test -- --run
# Expected: All 299+ tests passing
# Success Criteria: ✅ 0 test failures, >95% coverage

# 2. Build backend TypeScript
npm run build:backend
# Expected: Build completes without errors
# Success Criteria: ✅ No TypeScript compilation errors

# 3. Build frontend
npm run build
# Expected: Build completes successfully
# Success Criteria: ✅ dist/ folder created, no warnings

# 4. Run linting check
npm run lint
# Expected: No critical errors (warnings acceptable)
# Success Criteria: ✅ <10 warnings, 0 errors

# 5. Run security audit
npm audit
# Expected: No high/critical vulnerabilities
# Success Criteria: ✅ Audit score: 0 vulnerabilities

# 6. Type checking
npm run typecheck
# Expected: No type errors
# Success Criteria: ✅ All types valid
```

**If any checks fail**: Do not proceed. Address all issues before continuing.

### Configuration Preparation

Create and verify all configuration files:

```bash
# 1. Create production environment file
touch .env.production

# 2. Verify all required variables
cat > /tmp/required_vars.txt << 'EOF'
NODE_ENV
PORT
DATABASE_URL
REDIS_URL
AUDIT_LOG_SECRET
SMTP_HOST
SMTP_PORT
SMTP_SECURE
SMTP_USER
SMTP_PASS
SMTP_FROM
SLACK_WEBHOOK_URL
SLACK_CHANNEL
TEAMS_WEBHOOK_URL
PAGERDUTY_API_KEY
PAGERDUTY_SERVICE_ID
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_FROM_NUMBER
MONITORING_ENABLED
COMPLIANCE_FRAMEWORKS
EOF

# 3. Validate environment variables
npm run validate:env

# Expected output: All variables present and valid
```

### Infrastructure Readiness

Verify all infrastructure is prepared:

```bash
# 1. Database is provisioned
psql -h localhost -U postgres -c "SELECT version();"
# Expected: PostgreSQL 15+ version output

# 2. Redis is running
redis-cli ping
# Expected: PONG

# 3. SMTP is accessible
npm run test:smtp
# Expected: Successfully connected to SMTP server

# 4. DNS is configured
nslookup workflow.company.com
# Expected: Resolves to production server IP

# 5. SSL certificates exist
ls -la /etc/letsencrypt/live/workflow.company.com/
# Expected: fullchain.pem and privkey.pem present

# 6. Firewall is configured
sudo ufw status
# Expected: All required ports open
```

### Approval & Sign-off

- [ ] Security team approved deployment
- [ ] DevOps team reviewed configuration
- [ ] Database team backed up production
- [ ] Network team verified firewall rules
- [ ] Compliance officer reviewed audit logging
- [ ] CTO/Technical lead approved

---

## Phase 1: Staging Deployment

### Step 1: Prepare Staging Environment

Staging deployment allows testing in a production-like environment before production rollout.

```bash
# 1. Create staging directory
mkdir -p /opt/staging/workflow-app
cd /opt/staging/workflow-app

# 2. Clone repository
git clone https://github.com/your-org/workflow-automation.git .

# 3. Install dependencies
npm install
# Verify: node_modules/ created, no errors

# 4. Verify Node version
node --version
# Expected: v20.12.2 or higher

# 5. Verify npm version
npm --version
# Expected: 10.8.2 or higher
```

**Verification**:
```bash
# Confirm installation
npm list | head -20
# Should show react, express, zustand, etc.

# Check build tools
npm list vite webpack typescript
# All should be present
```

### Step 2: Configure Staging Environment Variables

Create comprehensive environment configuration:

```bash
# Create staging environment file
cat > /opt/staging/workflow-app/.env.staging << 'EOF'
# ========================================
# Application Configuration
# ========================================
NODE_ENV=staging
PORT=3001
HOST=0.0.0.0
LOG_LEVEL=debug
LOG_FORMAT=json

# ========================================
# Database Configuration
# ========================================
DATABASE_URL=postgresql://staging_user:staging_pass@localhost:5432/workflow_staging
DATABASE_SSL=false
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10
DATABASE_STATEMENT_TIMEOUT=30000

# ========================================
# Redis Configuration
# ========================================
REDIS_URL=redis://localhost:6380
REDIS_PASSWORD=""
REDIS_DB=1
REDIS_POOL_SIZE=20
REDIS_TIMEOUT=5000

# ========================================
# Audit Logging Configuration
# ========================================
AUDIT_LOG_ENABLED=true
AUDIT_LOG_SECRET=<generate-random-512-bit-key>
AUDIT_LOG_RETENTION_DAYS=90
AUDIT_LOG_LEVEL=all
AUDIT_STORAGE_TYPE=database

# ========================================
# Security Configuration
# ========================================
SECURITY_HEADERS_ENABLED=true
CORS_ENABLED=true
CORS_ORIGIN=http://localhost:3001,https://staging.workflow.company.com
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# ========================================
# Input Validation Configuration
# ========================================
VALIDATION_ENABLED=true
VALIDATION_STRICT=true
SANITIZATION_ENABLED=true
MAX_REQUEST_SIZE=10mb

# ========================================
# Monitoring Configuration
# ========================================
MONITORING_ENABLED=true
MONITORING_INTERVAL=60000
ANOMALY_DETECTION_ENABLED=true
ANOMALY_DETECTION_SENSITIVITY=medium
AUTO_RESPONSE_ENABLED=false
ALERT_RATE_LIMIT_HOUR=100
ALERT_RATE_LIMIT_DAY=500

# ========================================
# Email Alert Configuration
# ========================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=true
SMTP_USER=staging-alerts@company.com
SMTP_PASS=<app-specific-password>
SMTP_FROM=Workflow Staging Alerts <staging-alerts@company.com>
SMTP_TIMEOUT=10000
EMAIL_ALERTS_ENABLED=true

# ========================================
# Slack Integration
# ========================================
SLACK_ENABLED=true
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/STAGING/WEBHOOK
SLACK_CHANNEL=#staging-alerts
SLACK_USERNAME=Workflow Bot - Staging
SLACK_ICON_EMOJI=:warning:

# ========================================
# Microsoft Teams Integration
# ========================================
TEAMS_ENABLED=true
TEAMS_WEBHOOK_URL=https://outlook.office.com/webhook/YOUR/STAGING/WEBHOOK

# ========================================
# PagerDuty Integration (Optional)
# ========================================
PAGERDUTY_ENABLED=false
PAGERDUTY_API_KEY=<your-api-key>
PAGERDUTY_SERVICE_ID=<your-service-id>

# ========================================
# Twilio SMS Integration (Optional)
# ========================================
TWILIO_ENABLED=false
TWILIO_ACCOUNT_SID=<your-account-sid>
TWILIO_AUTH_TOKEN=<your-auth-token>
TWILIO_FROM_NUMBER=+1234567890

# ========================================
# Compliance Framework Configuration
# ========================================
COMPLIANCE_FRAMEWORKS=SOC2,ISO27001,HIPAA,GDPR
COMPLIANCE_REPORT_SCHEDULE=weekly
COMPLIANCE_REPORT_FORMAT=pdf,json
COMPLIANCE_REPORT_RECIPIENT=compliance@company.com
DATA_RESIDENCY=US
DATA_RETENTION_DAYS=90

# ========================================
# Logging Configuration
# ========================================
LOG_STORAGE=file
LOG_DIRECTORY=/var/log/workflow-staging
LOG_MAX_SIZE=100m
LOG_MAX_FILES=30
LOG_COMPRESSION=gzip

# ========================================
# Performance Configuration
# ========================================
ENABLE_QUERY_LOGGING=true
ENABLE_PERFORMANCE_MONITORING=true
PERFORMANCE_THRESHOLD_MS=1000
EOF

# Set appropriate permissions
chmod 600 /opt/staging/workflow-app/.env.staging
```

**Generate Secrets**:
```bash
# Generate random 512-bit key for audit logs
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# Use output in AUDIT_LOG_SECRET

# Generate random session key
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
# Store securely
```

### Step 3: Initialize Staging Database

Set up and prepare the database:

```bash
# 1. Create PostgreSQL user for staging
sudo -u postgres psql << 'SQL'
CREATE ROLE staging_user WITH LOGIN PASSWORD 'staging_pass';
ALTER ROLE staging_user CREATEDB;
CREATE DATABASE workflow_staging OWNER staging_user;
GRANT CONNECT ON DATABASE workflow_staging TO staging_user;
GRANT USAGE ON SCHEMA public TO staging_user;
GRANT CREATE ON SCHEMA public TO staging_user;
SQL

# 2. Install Prisma client
npm install @prisma/client

# 3. Generate Prisma client
npx prisma generate

# 4. Run migrations
npx prisma migrate deploy --skip-generate
# Expected: All migrations applied successfully

# 5. Verify database
npx prisma db execute --stdin << 'SQL'
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
SQL
# Should show: users, workflows, executions, audit_logs, etc.

# 6. Create audit log table if not exists
npx prisma migrate resolve --rolled-back "create_audit_logs"
# Or add to schema.prisma if missing
```

**Verify Database Connection**:
```bash
# Test connection string
psql postgresql://staging_user:staging_pass@localhost:5432/workflow_staging -c "SELECT version();"
# Expected: PostgreSQL version output

# Verify tables created
psql postgresql://staging_user:staging_pass@localhost:5432/workflow_staging -c "\dt"
# Expected: List of tables including audit_logs, workflows, etc.
```

### Step 4: Test Configuration

Verify all configurations are correct:

```bash
# 1. Validate environment variables
cd /opt/staging/workflow-app
npm run validate:env
# Expected: ✅ All required variables present and valid

# 2. Test database connection
cat > test-db.js << 'EOF'
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const result = await prisma.$queryRaw`SELECT NOW()`;
    console.log('✅ Database connection successful:', result);
    process.exit(0);
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

test();
EOF

node test-db.js
# Expected: ✅ Database connection successful

# 3. Test Redis connection
npm run test:redis
# Expected: ✅ Redis connection verified

# 4. Test SMTP configuration
npm run test:smtp
# Expected: ✅ SMTP server reachable and authenticated

# 5. Test all notification channels
npm run test:notifications
# Expected: ✅ All channels tested successfully
```

**Troubleshooting Connection Issues**:
```bash
# If database test fails:
# Check connection string
echo $DATABASE_URL

# Verify PostgreSQL is running
sudo systemctl status postgresql
# If not running: sudo systemctl start postgresql

# Verify Redis is running
redis-cli ping
# Should return: PONG

# Check firewall rules
sudo ufw allow 5432/tcp  # PostgreSQL
sudo ufw allow 6380/tcp  # Redis staging
```

### Step 5: Build Application

Compile and prepare for deployment:

```bash
# 1. Build backend
npm run build:backend
# Expected: dist/backend/ created without errors
# Verification: ls -la dist/backend/

# 2. Build frontend
npm run build
# Expected: dist/ folder created with index.html
# Verification: ls -la dist/

# 3. Verify build output
du -sh dist/
# Should be: 2-5MB depending on optimizations

# 4. Check for critical errors
npm run lint:critical
# Expected: 0 critical errors (warnings acceptable)

# 5. Type check production build
npm run typecheck:build
# Expected: No type errors in built code
```

**Build Optimization**:
```bash
# Verify bundle size
npm run build:analyze
# Look for large dependencies

# Check tree-shaking
npm run build -- --report
# Should show unused code removal

# Minification check
ls -la dist/js/
# Files should end in .min.js
```

### Step 6: Start Staging Application

Initialize the staging environment:

```bash
# 1. Create PM2 ecosystem file
cat > /opt/staging/workflow-app/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'workflow-staging',
    script: 'npm',
    args: 'start',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'staging',
      PORT: 3001,
    },
    error_file: '/var/log/workflow-staging/error.log',
    out_file: '/var/log/workflow-staging/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    max_memory_restart: '1G',
    watch: false,
    ignore_watch: ['node_modules', 'dist'],
    max_restarts: 10,
    min_uptime: '10s',
    autorestart: true
  }]
};
EOF

# 2. Create log directory
mkdir -p /var/log/workflow-staging
chmod 755 /var/log/workflow-staging

# 3. Start application with PM2
pm2 start ecosystem.config.js
# Expected: Successfully started

# 4. Verify running
pm2 list
# Expected: workflow-staging showing as online

# 5. Save PM2 config
pm2 save
# Expected: Configuration saved

# 6. Setup PM2 startup
pm2 startup systemd
# Follow instructions to add system startup
```

**Monitor Startup**:
```bash
# Watch logs during startup
pm2 logs workflow-staging --lines 50 --follow

# Monitor resource usage
pm2 monit

# Check process details
pm2 show workflow-staging
```

### Step 7: Verify Staging Deployment

Ensure all systems are functioning:

```bash
# 1. Health Check - Application
curl -s http://localhost:3001/health | jq
# Expected response:
# {
#   "status": "ok",
#   "timestamp": "2024-11-21T...",
#   "uptime": 123.45,
#   "environment": "staging"
# }

# 2. Health Check - Database
curl -s http://localhost:3001/health/db | jq
# Expected: status: "connected", responseTime: <100ms

# 3. Health Check - Redis
curl -s http://localhost:3001/health/redis | jq
# Expected: status: "connected", responseTime: <50ms

# 4. Security Monitor Status
curl -s http://localhost:3001/api/security/metrics | jq
# Expected: Active threats: 0, Blocked requests: 0

# 5. Audit Log Status
curl -s http://localhost:3001/api/audit/status | jq
# Expected: status: "active", logsWritten: >0

# 6. API Endpoints
curl -s http://localhost:3001/api/workflows | jq '.length'
# Expected: 0 (empty database) or >0 (seeded data)
```

**Verify Configuration**:
```bash
# Check environment
curl -s http://localhost:3001/api/config/environment | jq .NODE_ENV
# Expected: "staging"

# Check feature flags
curl -s http://localhost:3001/api/config/features | jq
# Expected: All security features enabled
```

### Step 8: Run Smoke Tests

Execute critical path testing:

```bash
# 1. Run all smoke tests
npm run test:smoke
# Expected: All tests passing
# Typical tests: health endpoints, basic CRUD operations

# 2. Test input validation
npm run test:validation
# Expected: All validation rules working
# Coverage: SQL injection, XSS, command injection tests

# 3. Test audit logging
npm run test:audit
# Expected: Audit events logged correctly
# Verification: Check database for audit records

# 4. Test monitoring
npm run test:monitoring
# Expected: Metrics collection active
# Check: /api/security/metrics endpoint

# 5. Test alerting
npm run test:alerts
# Expected: Alert channels responding
# Verify: Check Slack for test messages

# 6. API endpoint tests
npm run test:api:staging
# Expected: All endpoints returning 200/201
# Coverage: Workflows, executions, users endpoints
```

**Critical Path Test**:
```bash
# Complete workflow test
npm run test:workflow:e2e:staging
# Test: Create → Configure → Execute → Monitor workflow

# Expected sequence:
# 1. Create new workflow
# 2. Add nodes
# 3. Configure connections
# 4. Start execution
# 5. Monitor execution
# 6. Verify results
# 7. Check audit logs
```

**Performance Baseline**:
```bash
# Measure baseline performance
npm run benchmark:staging
# Expected: <200ms average response time
# P99: <500ms
# Error rate: <0.1%

# Check memory usage
pm2 monit
# Expected: <500MB per process
```

### Step 9: Load Testing

Validate capacity and stability:

```bash
# 1. Install Apache Bench (if not present)
sudo apt-get install -y apache2-utils

# 2. Light load test (100 requests, 10 concurrent)
ab -n 100 -c 10 http://localhost:3001/api/workflows
# Expected: 100% successful requests

# 3. Medium load test (1000 requests, 50 concurrent)
ab -n 1000 -c 50 http://localhost:3001/api/workflows
# Expected: >99% successful requests

# 4. Heavy load test (5000 requests, 100 concurrent)
ab -n 5000 -c 100 http://localhost:3001/api/workflows
# Expected: >95% successful requests

# 5. Stress test (increasing load)
for c in 10 50 100 200; do
  echo "Testing with $c concurrent connections..."
  ab -n 1000 -c $c http://localhost:3001/api/workflows
done

# 6. Monitor during load
# In another terminal:
pm2 monit
# Watch CPU, memory, request/sec metrics
```

**Load Test Analysis**:
```bash
# Analyze results
# Success criteria:
# - Response time < 500ms at 50 concurrent users
# - <1% failed requests
# - CPU < 80%
# - Memory < 1GB total

# If thresholds exceeded:
# 1. Increase PM2 instances
# 2. Optimize slow endpoints
# 3. Increase database connections
# 4. Scale up Redis memory
```

### Step 10: Integration Testing

Verify all system components work together:

```bash
# 1. Database + Application integration
npm run test:integration:database
# Expected: All DB operations working

# 2. Redis + Application integration
npm run test:integration:redis
# Expected: Caching and queue operations working

# 3. Notification channels
npm run test:integration:notifications
# Expected: All alert channels responsive

# 4. Audit logging end-to-end
npm run test:integration:audit
# Verify: Actions are logged → Logs queried → Reports generated

# 5. Security monitoring
npm run test:integration:security
# Expected: Threats detected → Alerts sent → Response initiated

# 6. Compliance
npm run test:integration:compliance
# Expected: Audit trails support compliance reports
```

**Full Integration Test**:
```bash
# Complete system test
npm run test:integration:full
# This test:
# 1. Creates test workflow
# 2. Executes workflow with various inputs
# 3. Validates audit logging
# 4. Verifies security alerts
# 5. Tests compliance reports
# 6. Cleans up test data
```

---

## Phase 2: Production Deployment

### Step 1: Production Server Setup

Initialize production infrastructure:

```bash
# 1. SSH into production server
ssh -i ~/.ssh/production-key.pem ubuntu@production-server-ip

# 2. Update system packages
sudo apt update
sudo apt upgrade -y
# Expected: All packages updated

# 3. Set timezone
sudo timedatectl set-timezone UTC
timedatectl status
# Expected: UTC timezone

# 4. Enable automatic security updates
sudo apt-get install -y unattended-upgrades apt-listchanges
sudo dpkg-reconfigure -plow unattended-upgrades

# 5. Install required system packages
sudo apt-get install -y \
  build-essential \
  curl \
  wget \
  git \
  htop \
  vim \
  jq \
  net-tools \
  openssl \
  libssl-dev \
  pkg-config

# 6. Create application user
sudo useradd -m -s /bin/bash workflow
sudo usermod -aG sudo workflow
# Switch to application user
su - workflow
```

**Verify System**:
```bash
# Check system info
uname -a
# Should show Linux with proper kernel version

# Check disk space
df -h
# Should show adequate space

# Check memory
free -h
# Should show sufficient RAM

# Check uptime (should be clean)
uptime
```

### Step 2: Install Node.js and npm

Configure Node.js runtime:

```bash
# 1. Add Node.js repository
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
# Expected: Repository added successfully

# 2. Install Node.js
sudo apt-get install -y nodejs
# Expected: Installation complete

# 3. Verify installation
node --version
# Expected: v20.12.2 or higher

npm --version
# Expected: 10.8.2 or higher

# 4. Install global Node tools
sudo npm install -g pm2 @pm2/auto-pull
# Expected: Global tools installed

# 5. Verify PM2
pm2 --version
# Expected: 5.3.0 or higher
```

**Configure npm**:
```bash
# Set npm registry (if using private)
npm config set registry https://registry.npmjs.org/

# Set npm cache
npm config set cache ~/.npm

# Increase npm timeout
npm config set fetch-timeout 120000

# Verify configuration
npm config list
```

### Step 3: Install PostgreSQL

Setup database system:

```bash
# 1. Add PostgreSQL repository
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt update

# 2. Install PostgreSQL 16
sudo apt-get install -y postgresql-16 postgresql-contrib-16
# Expected: Installation complete

# 3. Verify installation
psql --version
# Expected: psql (PostgreSQL) 16.0

# 4. Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql
# Expected: Service started and enabled

# 5. Verify service
sudo systemctl status postgresql
# Expected: active (running)
```

**Create Database and User**:
```bash
# Switch to postgres user
sudo -u postgres psql << 'SQL'
-- Create production user
CREATE ROLE workflow_prod WITH LOGIN PASSWORD 'your_secure_password';

-- Grant permissions
ALTER ROLE workflow_prod CREATEDB;

-- Create databases
CREATE DATABASE workflow_prod OWNER workflow_prod;

-- Set connection limits
ALTER DATABASE workflow_prod SET max_connections = 100;

-- Grant schema permissions
GRANT CONNECT ON DATABASE workflow_prod TO workflow_prod;
GRANT USAGE ON SCHEMA public TO workflow_prod;
GRANT CREATE ON SCHEMA public TO workflow_prod;

-- Verify
SELECT datname, usename FROM pg_database JOIN pg_user ON pg_database.datdba = pg_user.usesysid WHERE datname = 'workflow_prod';
SQL

# Expected: workflow_prod database created
```

**Optimize PostgreSQL**:
```bash
# Edit PostgreSQL configuration
sudo nano /etc/postgresql/16/main/postgresql.conf

# Find and update these settings:
# shared_buffers = 256MB          (25% of RAM for 8GB server)
# effective_cache_size = 2GB      (50% of RAM)
# maintenance_work_mem = 64MB
# checkpoint_completion_target = 0.9
# wal_buffers = 16MB
# default_statistics_target = 100
# random_page_cost = 1.1
# effective_io_concurrency = 200

# Restart PostgreSQL
sudo systemctl restart postgresql

# Verify
sudo -u postgres psql -c "SHOW shared_buffers;"
```

### Step 4: Install Redis

Configure caching system:

```bash
# 1. Add Redis repository
curl -fsSL https://packages.redis.io/gpg | sudo gpg --dearmor -o /usr/share/keyrings/redis-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/redis-archive-keyring.gpg] https://packages.redis.io/deb $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/redis.list
sudo apt update

# 2. Install Redis
sudo apt-get install -y redis-server
# Expected: Installation complete

# 3. Verify installation
redis-server --version
# Expected: Redis server v=7.2.0 or higher

# 4. Start Redis service
sudo systemctl start redis-server
sudo systemctl enable redis-server
# Expected: Service started and enabled

# 5. Verify service
redis-cli ping
# Expected: PONG
```

**Optimize Redis**:
```bash
# Edit Redis configuration
sudo nano /etc/redis/redis.conf

# Find and update these settings:
# maxmemory = 4gb              (50% of RAM for 8GB server)
# maxmemory-policy = allkeys-lru
# tcp-backlog = 511
# timeout = 0
# tcp-keepalive = 300
# databases = 16
# save 900 1                   (Snapshot every 15min if 1+ changes)
# save 300 10
# save 60 10000
# appendonly yes               (AOF persistence)
# appendfsync everysec

# Restart Redis
sudo systemctl restart redis-server

# Verify
redis-cli info memory | grep maxmemory
```

### Step 5: Install and Configure Nginx

Setup reverse proxy:

```bash
# 1. Install Nginx
sudo apt-get install -y nginx
# Expected: Installation complete

# 2. Enable Nginx service
sudo systemctl enable nginx
sudo systemctl start nginx
# Expected: Service started

# 3. Verify installation
sudo nginx -v
# Expected: nginx/1.X.X
```

**Create Nginx Configuration**:
```bash
# Create workflow app configuration
sudo tee /etc/nginx/sites-available/workflow-production > /dev/null << 'EOF'
# Upstream Node.js application
upstream workflow_app {
    least_conn;
    server localhost:3000 max_fails=3 fail_timeout=30s weight=5;
    server localhost:3001 max_fails=3 fail_timeout=30s weight=5;
    keepalive 32;
}

# HTTP redirect to HTTPS
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name workflow.company.com;

    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Redirect all HTTP to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2 default_server;
    listen [::]:443 ssl http2 default_server;
    server_name workflow.company.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/workflow.company.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/workflow.company.com/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/workflow.company.com/chain.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;

    # SSL Protocols and Ciphers
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_ecdh_curve secp384r1;

    # HSTS Header
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

    # CSP Header
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;" always;

    # Logging
    access_log /var/log/nginx/workflow-access.log combined buffer=32k flush=5s;
    error_log /var/log/nginx/workflow-error.log warn;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1000;
    gzip_proxied any;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/json application/xml+rss;
    gzip_disable "MSIE [1-6]\.";

    # Buffer Sizes
    client_body_buffer_size 16M;
    client_max_body_size 10M;

    # Timeouts
    client_connect_timeout 60s;
    client_send_timeout 60s;
    client_body_timeout 60s;
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;

    # Main location block
    location / {
        proxy_pass http://workflow_app;
        proxy_http_version 1.1;

        # Connection upgrades
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $server_name;
        proxy_set_header X-Request-ID $request_id;

        # Buffering
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
        proxy_busy_buffers_size 8k;

        # Keepalive
        proxy_http_version 1.1;
        proxy_set_header Connection "";

        # Cache bypass for authenticated requests
        proxy_cache_bypass $http_authorization;
    }

    # WebSocket upgrade
    location /ws {
        proxy_pass http://workflow_app;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 86400;
    }

    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://workflow_app;
        proxy_cache_valid 200 365d;
        add_header Cache-Control "public, immutable, max-age=31536000";
    }

    # Health check endpoint (exclude from logging)
    location /health {
        proxy_pass http://workflow_app;
        access_log off;
    }
}

# Rate limiting upstream
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/s;
limit_req_zone $binary_remote_addr zone=app_limit:10m rate=1000r/m;
EOF

# Enable the configuration
sudo ln -sf /etc/nginx/sites-available/workflow-production /etc/nginx/sites-enabled/

# Remove default configuration
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t
# Expected: syntax is ok, test is successful
```

**Restart Nginx**:
```bash
# Reload Nginx
sudo systemctl reload nginx

# Verify status
sudo systemctl status nginx
# Expected: active (running)

# Check listening ports
sudo netstat -tlnp | grep nginx
# Expected: Listening on 80 and 443
```

### Step 6: Deploy Application

Install and configure the application:

```bash
# 1. Create application directory (as workflow user)
sudo mkdir -p /opt/workflow-app
sudo chown workflow:workflow /opt/workflow-app
cd /opt/workflow-app

# 2. Clone repository
git clone https://github.com/your-org/workflow-automation.git .
# Expected: Repository cloned successfully

# 3. Checkout production branch
git checkout production
git pull origin production
# Expected: On production branch

# 4. Install production dependencies
npm ci --production
# Expected: Dependencies installed (--production skips dev dependencies)

# 5. Generate Prisma client
npm run prisma:generate
# Expected: Prisma client generated

# 6. Build application
npm run build
npm run build:backend
# Expected: Build completes without errors

# 7. Verify build
ls -la dist/
# Expected: Built files present

# 8. Set permissions
sudo chown -R www-data:www-data /opt/workflow-app
chmod 755 /opt/workflow-app
find /opt/workflow-app -type f -name "*.js" -exec chmod 644 {} \;
find /opt/workflow-app -type d -exec chmod 755 {} \;
```

**Create PM2 Configuration**:
```bash
# Create ecosystem config
cat > /opt/workflow-app/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'workflow-api-1',
      script: 'npm',
      args: 'start',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: '/var/log/workflow/api-1-error.log',
      out_file: '/var/log/workflow/api-1-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      max_memory_restart: '1G',
      watch: false,
      ignore_watch: ['node_modules', 'dist', 'logs'],
      max_restarts: 10,
      min_uptime: '10s',
      autorestart: true,
      shutdown_with_message: true,
      listen_timeout: 3000,
      kill_timeout: 5000,
    },
    {
      name: 'workflow-api-2',
      script: 'npm',
      args: 'start',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      error_file: '/var/log/workflow/api-2-error.log',
      out_file: '/var/log/workflow/api-2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      max_memory_restart: '1G',
      watch: false,
      ignore_watch: ['node_modules', 'dist', 'logs'],
      max_restarts: 10,
      min_uptime: '10s',
      autorestart: true,
      shutdown_with_message: true,
      listen_timeout: 3000,
      kill_timeout: 5000,
    }
  ],
  deploy: {
    production: {
      user: 'workflow',
      host: 'production-server-ip',
      ref: 'origin/production',
      repo: 'https://github.com/your-org/workflow-automation.git',
      path: '/opt/workflow-app',
      'post-deploy': 'npm ci --production && npm run build && pm2 reload ecosystem.config.js --env production'
    }
  }
};
EOF

# Set permissions
chmod 644 /opt/workflow-app/ecosystem.config.js
```

### Step 7: Start Production Application

Initialize the application:

```bash
# 1. Create log directory
sudo mkdir -p /var/log/workflow
sudo chown www-data:www-data /var/log/workflow
chmod 755 /var/log/workflow

# 2. Start application with PM2
cd /opt/workflow-app
pm2 start ecosystem.config.js --env production
# Expected: Successfully started

# 3. Verify running
pm2 list
# Expected: Both workflow-api-1 and workflow-api-2 online

# 4. Check process details
pm2 show workflow-api-1
# Expected: Process details and status

# 5. Save PM2 configuration
pm2 save
# Expected: PM2 config saved

# 6. Setup PM2 startup
sudo pm2 startup systemd -u www-data --hp /var/www
# Follow the instructions output
# This creates a systemd service for PM2

# 7. Verify systemd service
sudo systemctl status pm2-www-data
# Expected: active (running)
```

**Verify Application**:
```bash
# Check if ports are listening
sudo netstat -tlnp | grep node
# Expected: Listening on ports 3000 and 3001

# Test application health
curl http://localhost:3000/health
# Expected: {"status":"ok",...}

# Check PM2 logs
pm2 logs workflow-api-1 --lines 20
# Look for successful startup messages
```

### Step 8: Configure SSL Certificates

Install and manage SSL/TLS:

```bash
# 1. Install Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# 2. Request Let's Encrypt certificate
sudo certbot certonly --nginx -d workflow.company.com
# Follow prompts:
# - Email: security@company.com
# - Agree to terms
# - Share email (optional)

# Expected: Certificate installed to /etc/letsencrypt/live/workflow.company.com/

# 3. Verify certificate
ls -la /etc/letsencrypt/live/workflow.company.com/
# Expected: fullchain.pem, privkey.pem, chain.pem

# 4. Test HTTPS
curl https://workflow.company.com/health
# Expected: Valid response from https endpoint

# 5. Check certificate validity
openssl x509 -in /etc/letsencrypt/live/workflow.company.com/fullchain.pem -text -noout | grep -A 2 "Validity"
# Expected: Valid dates shown

# 6. Setup certificate auto-renewal
sudo certbot renew --dry-run
# Expected: Dry run successful

# 7. Enable automatic renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
# Expected: Timer enabled and started
```

**Test SSL Configuration**:
```bash
# Test SSL strength
openssl s_client -connect workflow.company.com:443 -servername workflow.company.com << EOF
Q
EOF
# Expected: Proper TLS version and cipher shown

# Test HTTPS endpoint
curl -i https://workflow.company.com/health
# Expected: HTTP/2 200 with security headers
```

### Step 9: Configure Backup System

Setup automated database backups:

```bash
# 1. Create backup directory
sudo mkdir -p /backups/workflow
sudo chown postgres:postgres /backups/workflow
chmod 700 /backups/workflow

# 2. Create backup script
sudo tee /usr/local/bin/workflow-backup.sh > /dev/null << 'EOF'
#!/bin/bash

BACKUP_DIR="/backups/workflow"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d_%H%M%S)
TIMESTAMP=$(date +%Y-%m-%d\ %H:%M:%S)

# Create backup directory if needed
mkdir -p "$BACKUP_DIR"

# Database backup
echo "[$TIMESTAMP] Starting database backup..."
pg_dump -h localhost -U workflow_prod -d workflow_prod --compress=9 -f "$BACKUP_DIR/db_$DATE.sql.gz" 2>&1 | logger -t workflow-backup

if [ $? -eq 0 ]; then
    echo "[$TIMESTAMP] Database backup completed: db_$DATE.sql.gz"
    logger -t workflow-backup "Database backup completed: db_$DATE.sql.gz"
else
    echo "[$TIMESTAMP] Database backup failed!" >&2
    logger -t workflow-backup "Database backup failed!"
    exit 1
fi

# Audit logs backup
echo "[$TIMESTAMP] Starting audit logs backup..."
tar --exclude='*.lock' -czf "$BACKUP_DIR/audit_logs_$DATE.tar.gz" /var/log/workflow/audit 2>/dev/null
if [ $? -eq 0 ]; then
    echo "[$TIMESTAMP] Audit logs backup completed"
    logger -t workflow-backup "Audit logs backup completed"
fi

# Configuration backup
echo "[$TIMESTAMP] Starting configuration backup..."
gpg --symmetric --cipher-algo AES256 --output "$BACKUP_DIR/config_$DATE.gpg" /opt/workflow-app/.env.production 2>/dev/null
if [ $? -eq 0 ]; then
    echo "[$TIMESTAMP] Configuration backup completed"
    logger -t workflow-backup "Configuration backup completed"
fi

# Remove old backups
echo "[$TIMESTAMP] Removing backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "*.gz" -o -name "*.gpg" | while read f; do
    if [ $(find "$f" -mtime +$RETENTION_DAYS 2>/dev/null) ]; then
        rm -f "$f"
        logger -t workflow-backup "Removed old backup: $(basename $f)"
    fi
done

echo "[$TIMESTAMP] Backup process completed"
EOF

# Make executable
sudo chmod +x /usr/local/bin/workflow-backup.sh

# Test backup script
sudo /usr/local/bin/workflow-backup.sh
# Expected: Backup files created in /backups/workflow/

# 3. Schedule backups via cron
sudo tee /etc/cron.d/workflow-backup > /dev/null << 'EOF'
# Workflow backup schedule
# Backups run every 6 hours: 2AM, 8AM, 2PM, 8PM
0 2,8,14,20 * * * root /usr/local/bin/workflow-backup.sh

# Verify backups exist (daily at 1AM)
0 1 * * * root [ -f /backups/workflow/db_*.sql.gz ] || echo "No recent backups found!" | mail -s "Workflow Backup Alert" ops@company.com
EOF

# Verify cron setup
sudo crontab -l | grep workflow
# Expected: Cron jobs listed
```

**Test Backup Restoration**:
```bash
# List backups
ls -lh /backups/workflow/

# Test restore procedure (on test database)
# Create test database
sudo -u postgres createdb workflow_restore

# Restore from backup
gunzip -c /backups/workflow/db_*.sql.gz | sudo -u postgres psql -d workflow_restore

# Verify restore
sudo -u postgres psql -d workflow_restore -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"
# Expected: Table count > 0

# Drop test database
sudo -u postgres dropdb workflow_restore
```

---

## Phase 3: Post-Deployment

### Step 1: Verify Production Deployment

Comprehensive verification of production setup:

```bash
# 1. Application Health
echo "=== Application Health ==="
curl -s https://workflow.company.com/health | jq
# Expected: status: "ok", environment: "production"

# 2. Database Health
echo "=== Database Health ==="
curl -s https://workflow.company.com/health/db | jq
# Expected: status: "connected", responseTime < 100ms

# 3. Redis Health
echo "=== Redis Health ==="
curl -s https://workflow.company.com/health/redis | jq
# Expected: status: "connected", responseTime < 50ms

# 4. Security Monitor Status
echo "=== Security Monitor ==="
curl -s https://workflow.company.com/api/security/metrics | jq
# Expected: activeThreats: 0, blockedRequests: 0

# 5. Check SSL Certificate
echo "=== SSL Certificate ==="
curl -I https://workflow.company.com 2>&1 | grep -E "SSL|TLS"
# Expected: TLSv1.3, proper cipher suite

# 6. Check Response Headers
echo "=== Security Headers ==="
curl -I https://workflow.company.com | grep -E "X-Frame|X-Content|X-XSS|Strict-Transport"
# Expected: All security headers present

# 7. Check HTTPS Redirect
echo "=== HTTPS Redirect ==="
curl -i http://workflow.company.com 2>&1 | head -5
# Expected: 301 redirect to HTTPS

# 8. DNS Resolution
echo "=== DNS Resolution ==="
nslookup workflow.company.com
# Expected: Resolves to production server IP
```

**Load Testing**:
```bash
# Production baseline test
ab -n 500 -c 25 https://workflow.company.com/api/workflows
# Expected: >95% successful requests
# Response time: <200ms (50th percentile), <500ms (95th percentile)
```

### Step 2: Initialize Audit Logging

Activate audit system:

```bash
# 1. Verify audit logging is active
curl -s https://workflow.company.com/api/audit/status | jq
# Expected: status: "active", enabled: true

# 2. Check audit log directory
ls -la /var/log/workflow/audit/
# Expected: audit.log file present

# 3. Test audit logging
curl -X POST https://workflow.company.com/api/workflows \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"test","nodes":[]}'

# 4. Verify audit entry
tail -f /var/log/workflow/audit/audit.log | grep "workflow"
# Expected: Audit entry for create operation

# 5. Check audit database
psql postgresql://workflow_prod@localhost:5432/workflow_prod -c "SELECT COUNT(*) FROM audit_logs;"
# Expected: Count > 0
```

**Configure Audit Retention**:
```bash
# Set retention policy
cat > /etc/logrotate.d/workflow-audit << 'EOF'
/var/log/workflow/audit/*.log {
    daily
    rotate 365
    compress
    delaycompress
    notifempty
    create 0600 www-data www-data
    sharedscripts
    postrotate
        systemctl reload workflow-production > /dev/null 2>&1 || true
    endscript
}
EOF

# Test logrotate
sudo logrotate -f /etc/logrotate.d/workflow-audit
```

### Step 3: Configure Notification Channels

Setup alert delivery:

```bash
# 1. Test Email Alerts
echo "Testing email alerts..."
curl -X POST https://workflow.company.com/api/alerts/test/email \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"recipient":"ops@company.com","subject":"Test Alert"}'

# Check for test email
# Expected: Email received within 30 seconds

# 2. Test Slack Integration
echo "Testing Slack alerts..."
curl -X POST https://workflow.company.com/api/alerts/test/slack \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"channel":"#security-alerts","message":"Test alert from workflow"}'

# Check Slack channel
# Expected: Test message posted within 5 seconds

# 3. Test Teams Integration
echo "Testing Teams alerts..."
curl -X POST https://workflow.company.com/api/alerts/test/teams \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"Test alert from workflow"}'

# Check Teams channel
# Expected: Test card posted within 5 seconds

# 4. Test PagerDuty (if enabled)
curl -X POST https://workflow.company.com/api/alerts/test/pagerduty \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"service":"workflow","severity":"warning","title":"Test Alert"}'

# Check PagerDuty incidents
# Expected: Incident created (may require approval)

# 5. Test SMS (if enabled)
curl -X POST https://workflow.company.com/api/alerts/test/sms \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"phone":"+1-555-0100","message":"Test SMS from workflow"}'

# Check phone
# Expected: SMS received within 30 seconds
```

**Verify Alert Configuration**:
```bash
# List configured alert channels
curl -s https://workflow.company.com/api/alerts/channels \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq
# Expected: All configured channels listed

# Check alert queue status
curl -s https://workflow.company.com/api/alerts/queue/status \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq
# Expected: queue: active, pending: 0-5, sentToday: >0
```

### Step 4: Setup Escalation Policies

Configure alert escalation:

```bash
# Create escalation policy via API
curl -X POST https://workflow.company.com/api/security/escalation-policy \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Critical Security Escalation",
    "enabled": true,
    "rules": [
      {
        "level": 1,
        "delayMinutes": 0,
        "channels": ["slack"],
        "recipients": ["oncall-engineer@company.com"]
      },
      {
        "level": 2,
        "delayMinutes": 15,
        "channels": ["pagerduty", "sms"],
        "recipients": ["security-lead@company.com"]
      },
      {
        "level": 3,
        "delayMinutes": 30,
        "channels": ["email", "pagerduty"],
        "recipients": ["ciso@company.com", "cto@company.com"]
      }
    ]
  }'

# Verify escalation policy created
curl -s https://workflow.company.com/api/security/escalation-policy \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq

# Expected: Policy listed with all levels configured
```

### Step 5: Enable Monitoring Dashboards

Activate real-time monitoring:

```bash
# 1. Access Security Dashboard
echo "Security Dashboard: https://workflow.company.com/admin/security"

# 2. Access Compliance Dashboard
echo "Compliance Dashboard: https://workflow.company.com/admin/compliance"

# 3. Access Incident Dashboard
echo "Incident Dashboard: https://workflow.company.com/admin/incidents"

# 4. Verify metrics collection
curl -s https://workflow.company.com/api/metrics/security \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.metricsActive'
# Expected: true

# 5. Check monitoring interval
curl -s https://workflow.company.com/api/config/monitoring \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.interval'
# Expected: 60 (60 seconds)
```

**Dashboard Configuration**:
```bash
# Create custom dashboard
curl -X POST https://workflow.company.com/api/dashboards \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Operations Dashboard",
    "widgets": [
      {"type": "health-status"},
      {"type": "alert-summary"},
      {"type": "execution-metrics"},
      {"type": "error-rate"},
      {"type": "response-time"}
    ]
  }'
```

### Step 6: Gradual Automation Enable

Enable automated responses carefully:

```bash
# Week 1: Monitoring Only
# Keep AUTO_RESPONSE_ENABLED=false
# Collect baseline data on false positives

# Monitor alert accuracy
curl -s https://workflow.company.com/api/security/alerts/accuracy \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq

# Expected output:
# {
#   "totalAlerts": 42,
#   "confirmed": 38,
#   "falsePositives": 4,
#   "accuracy": 0.905
# }

# After 1 week: Enable non-destructive actions
# Update .env.production:
# AUTO_RESPONSE_ENABLED=true
# AUTO_RESPONSE_ACTIONS=block_ip,lock_account
# AUTO_RESPONSE_REQUIRE_APPROVAL=false

# Reload application
pm2 restart all

# Monitor results for 1 week
# Week 3: Enable full automation including reversible actions
# AUTO_RESPONSE_ACTIONS=block_ip,lock_account,terminate_session,rate_limit
```

**Approval-Required Actions**:
```bash
# Configure actions requiring approval
curl -X PUT https://workflow.company.com/api/security/settings \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "autoResponseEnabled": true,
    "actionsRequiringApproval": [
      "revoke_token",
      "disable_api_key",
      "reset_password"
    ],
    "approvalTimeout": 3600
  }'
```

### Step 7: Configure Compliance Frameworks

Activate compliance reporting:

```bash
# 1. Enable SOC2 Framework
curl -X POST https://workflow.company.com/api/compliance/frameworks/soc2 \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'

# 2. Enable ISO 27001
curl -X POST https://workflow.company.com/api/compliance/frameworks/iso27001 \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'

# 3. Enable HIPAA
curl -X POST https://workflow.company.com/api/compliance/frameworks/hipaa \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'

# 4. Enable GDPR
curl -X POST https://workflow.company.com/api/compliance/frameworks/gdpr \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'

# 5. Enable PCI DSS
curl -X POST https://workflow.company.com/api/compliance/frameworks/pcidss \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'

# Verify frameworks enabled
curl -s https://workflow.company.com/api/compliance/frameworks \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.enabled'
# Expected: All frameworks in list
```

**Schedule Compliance Reports**:
```bash
# Schedule weekly SOC2 report
curl -X POST https://workflow.company.com/api/compliance/schedule-report \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "framework": "soc2",
    "frequency": "weekly",
    "day": "monday",
    "time": "09:00",
    "recipients": ["compliance@company.com", "audit@company.com"],
    "format": "pdf"
  }'
```

---

## Monitoring & Maintenance

### Health Checks

Continuous verification of system health:

```bash
# Automated health check script
cat > /usr/local/bin/workflow-health-check.sh << 'EOF'
#!/bin/bash

echo "=== Workflow Health Check: $(date) ==="

# Application health
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://workflow.company.com/health)
if [ "$HTTP_CODE" = "200" ]; then
    echo "✓ Application: OK"
else
    echo "✗ Application: FAILED (HTTP $HTTP_CODE)"
fi

# Database health
DB_CHECK=$(curl -s https://workflow.company.com/health/db 2>/dev/null | jq -r '.status' 2>/dev/null)
if [ "$DB_CHECK" = "connected" ]; then
    echo "✓ Database: OK"
else
    echo "✗ Database: FAILED"
fi

# Redis health
REDIS_CHECK=$(curl -s https://workflow.company.com/health/redis 2>/dev/null | jq -r '.status' 2>/dev/null)
if [ "$REDIS_CHECK" = "connected" ]; then
    echo "✓ Redis: OK"
else
    echo "✗ Redis: FAILED"
fi

# Disk space
DISK=$(df /opt/workflow-app | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK" -lt 80 ]; then
    echo "✓ Disk Space: OK ($DISK% used)"
else
    echo "✗ Disk Space: WARNING ($DISK% used)"
fi

# PM2 status
PM2_COUNT=$(pm2 list 2>/dev/null | grep -c "online")
if [ "$PM2_COUNT" -ge 2 ]; then
    echo "✓ Processes: OK ($PM2_COUNT running)"
else
    echo "✗ Processes: WARNING ($PM2_COUNT running)"
fi

# SSL certificate expiry
CERT_EXPIRY=$(openssl x509 -enddate -noout -in /etc/letsencrypt/live/workflow.company.com/fullchain.pem 2>/dev/null | cut -d= -f2)
DAYS_LEFT=$((($(date -d "$CERT_EXPIRY" +%s) - $(date +%s)) / 86400))
if [ "$DAYS_LEFT" -gt 7 ]; then
    echo "✓ SSL Certificate: OK ($DAYS_LEFT days left)"
else
    echo "✗ SSL Certificate: WARNING ($DAYS_LEFT days left)"
fi
EOF

chmod +x /usr/local/bin/workflow-health-check.sh

# Schedule health checks
sudo tee /etc/cron.d/workflow-health-check > /dev/null << 'EOF'
# Health checks every 5 minutes
*/5 * * * * root /usr/local/bin/workflow-health-check.sh >> /var/log/workflow/health-check.log 2>&1

# Daily summary
0 8 * * * root echo "=== Daily Health Summary ===" >> /var/log/workflow/health-summary.log && tail -30 /var/log/workflow/health-check.log >> /var/log/workflow/health-summary.log
EOF

# Run health check
/usr/local/bin/workflow-health-check.sh
```

### Log Monitoring

Monitor application logs:

```bash
# Follow application logs
pm2 logs workflow-api-1 --lines 50 --follow

# Monitor in another terminal
pm2 monit

# Check specific log levels
# Error logs
grep ERROR /var/log/workflow/*.log | tail -20

# Warning logs
grep WARN /var/log/workflow/*.log | tail -20

# Setup log aggregation (optional)
sudo apt-get install -y rsyslog
# Add to /etc/rsyslog.conf:
# :programname, isequal, "workflow" /var/log/workflow/syslog.log
```

### Performance Monitoring

Track system performance:

```bash
# Real-time monitoring
htop

# View process details
ps aux | grep node

# Check memory usage
free -h

# Check CPU usage
top -bn1 | head -20

# Network connections
netstat -an | grep ESTABLISHED | wc -l

# Database connections
psql -U workflow_prod -d workflow_prod -c "SELECT count(*) FROM pg_stat_activity;"

# Redis memory
redis-cli INFO memory
```

---

## Troubleshooting

### Common Issues and Solutions

**Issue: Application won't start**
```bash
# Check logs
pm2 logs workflow-api-1 | tail -50

# Verify environment variables
echo $DATABASE_URL
echo $REDIS_URL

# Check syntax
node -c /opt/workflow-app/dist/backend/api/server.js

# Test database connection
npm run test:db

# Check permissions
ls -la /opt/workflow-app

# Solution:
# 1. Fix environment variables
# 2. Verify database is running
# 3. Clear node_modules and rebuild
# 4. Check disk space
```

**Issue: High memory usage**
```bash
# Monitor memory
pm2 monit

# Identify memory leak
node --inspect /opt/workflow-app/dist/backend/api/server.js
# Then use Chrome DevTools

# Force restart
pm2 restart all

# Clear Redis cache (if memory is in Redis)
redis-cli FLUSHDB

# Increase memory limit in PM2
# Edit ecosystem.config.js:
# max_memory_restart: '2G'
pm2 restart all
```

**Issue: Database connection errors**
```bash
# Test connection
psql postgresql://workflow_prod@localhost:5432/workflow_prod

# Check connection pool
psql -U workflow_prod -d workflow_prod -c "SELECT count(*) FROM pg_stat_activity;"

# Increase pool size
# Edit .env.production:
# DATABASE_POOL_MAX=20

# Restart application
pm2 restart all

# Check for lock
pg_stat_statements
```

**Issue: Alerts not sending**
```bash
# Test email
npm run test:smtp

# Check Slack webhook
curl -X POST $SLACK_WEBHOOK_URL -d 'text=test'

# View alert queue
curl https://workflow.company.com/api/alerts/queue \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Check alert logs
grep -i alert /var/log/workflow/*.log

# Restart alert service
pm2 restart workflow-api-1
```

---

## Rollback Procedure

If critical issues occur, rollback to previous version:

```bash
# 1. Stop current version
pm2 stop all
pm2 delete all

# 2. Identify previous working commit
cd /opt/workflow-app
git log --oneline | head -10

# 3. Checkout previous version
git checkout <previous-commit>
git checkout production

# 4. Rebuild application
npm ci --production
npm run build
npm run build:backend

# 5. Restore database (if needed)
# If data corruption occurred:
gunzip < /backups/workflow/db_<timestamp>.sql.gz | psql -U workflow_prod workflow_prod

# 6. Start application
pm2 start ecosystem.config.js --env production

# 7. Verify
curl https://workflow.company.com/health

# 8. Notify stakeholders
echo "Rollback completed at $(date)" | mail -s "Workflow Rollback" ops@company.com
```

**Zero-Downtime Rollback**:
```bash
# Use blue-green deployment
# 1. Verify staging environment is running (blue)
# 2. Deploy new version to production environment (green)
# 3. If issues, switch traffic back to blue
# 4. Keep green for analysis

# Switch traffic via Nginx
sudo sed -i 's/server localhost:3000/server localhost:3002/' /etc/nginx/sites-available/workflow-production
sudo nginx -t
sudo systemctl reload nginx
```

---

## Security Hardening

### System Hardening

Strengthen security posture:

```bash
# 1. Disable root SSH
sudo sed -i 's/^PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sudo systemctl reload sshd

# 2. Configure fail2ban
sudo apt-get install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# 3. Configure firewall rules
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp     # SSH
sudo ufw allow 80/tcp     # HTTP
sudo ufw allow 443/tcp    # HTTPS
sudo ufw enable

# 4. Set file permissions
chmod 600 /opt/workflow-app/.env.production
chmod 600 ~/.ssh/authorized_keys

# 5. Enable automatic updates
sudo dpkg-reconfigure -plow unattended-upgrades

# 6. Harden SSH
sudo sed -i 's/^#PubkeyAuthentication yes/PubkeyAuthentication yes/' /etc/ssh/sshd_config
sudo sed -i 's/^#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl reload sshd

# 7. Disable unnecessary services
sudo systemctl disable bluetooth
sudo systemctl disable cups
```

### Application Hardening

Secure the application:

```bash
# 1. Enable HSTS
# Already in Nginx config

# 2. Enable CSP headers
# Already in Nginx config

# 3. Disable HTTP methods (TRACE, CONNECT)
# Add to Nginx location block:
# if ($request_method !~ ^(GET|HEAD|POST|PUT|DELETE|OPTIONS)$) {
#     return 405;
# }

# 4. Rate limiting
# Already configured in Nginx

# 5. Hide server version
sudo sed -i 's/server_tokens on;/server_tokens off;/' /etc/nginx/nginx.conf
sudo systemctl reload nginx

# 6. Restrict API access
# Configure IP whitelist if needed
# Add to Nginx location block for /api/:
# allow 203.0.113.0/24;  # Internal network
# deny all;
```

---

## Compliance Verification

Verify regulatory compliance:

```bash
# 1. Generate SOC2 Report
curl -s https://workflow.company.com/api/compliance/soc2/report \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -o soc2_report.pdf

# 2. Generate ISO 27001 Report
curl -s https://workflow.company.com/api/compliance/iso27001/report \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -o iso27001_report.pdf

# 3. Generate HIPAA Report
curl -s https://workflow.company.com/api/compliance/hipaa/report \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -o hipaa_report.pdf

# 4. Verify Audit Logging
curl -s https://workflow.company.com/api/audit/verify \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq

# Expected:
# {
#   "logsPresent": true,
#   "logsImmutable": true,
#   "retentionEnforced": true,
#   "complianceScore": 98.5
# }

# 5. Check Compliance Score
curl -s https://workflow.company.com/api/compliance/score \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq
```

**Generate Compliance Report**:
```bash
# Create comprehensive compliance report
cat > /usr/local/bin/generate-compliance-report.sh << 'EOF'
#!/bin/bash

REPORT_DIR="/reports/compliance"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p $REPORT_DIR

echo "Generating compliance reports..."

# SOC2
curl -s https://workflow.company.com/api/compliance/soc2/report \
  -H "Authorization: Bearer $(cat .auth_token)" \
  -o $REPORT_DIR/soc2_$TIMESTAMP.pdf

# ISO 27001
curl -s https://workflow.company.com/api/compliance/iso27001/report \
  -H "Authorization: Bearer $(cat .auth_token)" \
  -o $REPORT_DIR/iso27001_$TIMESTAMP.pdf

# HIPAA
curl -s https://workflow.company.com/api/compliance/hipaa/report \
  -H "Authorization: Bearer $(cat .auth_token)" \
  -o $REPORT_DIR/hipaa_$TIMESTAMP.pdf

# GDPR
curl -s https://workflow.company.com/api/compliance/gdpr/report \
  -H "Authorization: Bearer $(cat .auth_token)" \
  -o $REPORT_DIR/gdpr_$TIMESTAMP.pdf

# PCI DSS
curl -s https://workflow.company.com/api/compliance/pcidss/report \
  -H "Authorization: Bearer $(cat .auth_token)" \
  -o $REPORT_DIR/pcidss_$TIMESTAMP.pdf

echo "Reports generated to $REPORT_DIR"

# Email reports
mail -s "Workflow Compliance Reports - $TIMESTAMP" compliance@company.com < /dev/null
EOF

chmod +x /usr/local/bin/generate-compliance-report.sh

# Schedule daily reports
sudo tee /etc/cron.d/compliance-reports > /dev/null << 'EOF'
# Generate compliance reports daily at 1AM
0 1 * * * root /usr/local/bin/generate-compliance-report.sh
EOF
```

---

## Success Criteria

Verify deployment success:

```bash
# All criteria must be met:

# ✓ Application Health
curl -s https://workflow.company.com/health | jq '.status' | grep -q "ok"

# ✓ HTTPS Working
curl -I https://workflow.company.com | grep -q "200\|301"

# ✓ Database Connected
curl -s https://workflow.company.com/health/db | jq '.status' | grep -q "connected"

# ✓ Redis Connected
curl -s https://workflow.company.com/health/redis | jq '.status' | grep -q "connected"

# ✓ Audit Logs Writing
curl -s https://workflow.company.com/api/audit/status | jq '.enabled' | grep -q "true"

# ✓ Security Monitoring Active
curl -s https://workflow.company.com/api/security/metrics | jq '.monitoring_active' | grep -q "true"

# ✓ Alerts Configured
curl -s https://workflow.company.com/api/alerts/channels | jq '.[] | length' | grep -q "."

# ✓ PM2 Shows 0% Restart Rate
pm2 list | grep -q "0"

# ✓ Response Time <200ms
AB_RESULT=$(ab -n 100 -c 10 https://workflow.company.com/api/workflows 2>&1 | grep "Time per request" | head -1 | awk '{print $4}')
[ $(echo "$AB_RESULT < 200" | bc) -eq 1 ] && echo "✓ Response Time OK" || echo "✗ Response Time High"

# ✓ CPU Usage <50%
CPU=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1}')
[ $(echo "$CPU < 50" | bc) -eq 1 ] && echo "✓ CPU Usage OK" || echo "✗ CPU Usage High"

# ✓ Memory Usage <75%
MEM=$(free | grep Mem | awk '{print ($3/$2) * 100}')
[ $(echo "$MEM < 75" | bc) -eq 1 ] && echo "✓ Memory Usage OK" || echo "✗ Memory Usage High"

echo "=== Deployment Success Verification Complete ==="
```

---

## Support & Escalation

For deployment issues, contact:

| Issue | Contact | Response Time |
|-------|---------|----------------|
| General Questions | engineering@company.com | 4 hours |
| Technical Issues | devops@company.com | 2 hours |
| Security Issues | security@company.com | 1 hour |
| Production Emergency | PagerDuty On-Call | 15 minutes |
| Compliance Questions | compliance@company.com | 8 hours |

**Emergency Hotline**: +1-555-0100 (extension 5555)

---

**Deployment Status**: Ready for Production ✅

**Document Version**: 1.0
**Last Updated**: November 21, 2024
**Approved By**: CTO, Security Officer, DevOps Lead
