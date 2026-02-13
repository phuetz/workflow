# Environment Setup Guide

## 🔐 Security First

**⚠️ CRITICAL SECURITY WARNING**: Never commit `.env` files containing real secrets to version control!

This guide will help you properly configure your environment variables for the Workflow Automation Platform.

## 📋 Quick Start

### 1. Copy the Example File

For **development**:
```bash
cp .env.example .env
```

For **production**:
```bash
cp .env.production.example .env.production
```

For **testing**:
```bash
cp .env.example .env.test
```

### 2. Generate Secure Secrets

**NEVER use the default example values in production!** Generate strong, random secrets:

```bash
# Generate JWT Secret (64 characters recommended)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate Encryption Key (32 bytes = 256 bits for AES-256)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Generate Session Secret (64 characters recommended)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate Encryption Salt (64 characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Configure Required Variables

Edit your `.env` file and update **AT MINIMUM** these critical variables:

```bash
# Security (REQUIRED - Generate with commands above)
JWT_SECRET=<generated-jwt-secret-here>
JWT_REFRESH_SECRET=<generated-refresh-secret-here>
SESSION_SECRET=<generated-session-secret-here>
ENCRYPTION_MASTER_KEY=<generated-encryption-key-here>
ENCRYPTION_SALT=<generated-salt-here>

# Database (REQUIRED for persistence)
DATABASE_URL=postgresql://username:password@localhost:5432/workflow_db

# Redis (REQUIRED for queues and caching)
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=<your-redis-password>
```

## 📚 Environment Variables Reference

### Required Variables

These variables **MUST** be configured for the application to work:

| Variable | Description | Example | How to Get |
|----------|-------------|---------|------------|
| `NODE_ENV` | Runtime environment | `development`, `production`, `test` | Set manually |
| `PORT` | Frontend port | `3000` | Set manually |
| `API_PORT` | Backend API port | `3001` | Set manually |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` | Your database provider |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` | Your Redis instance |
| `JWT_SECRET` | JWT signing secret | (64-char random string) | Generate with crypto |
| `JWT_REFRESH_SECRET` | JWT refresh token secret | (64-char random string) | Generate with crypto |
| `SESSION_SECRET` | Session cookie secret | (64-char random string) | Generate with crypto |
| `ENCRYPTION_MASTER_KEY` | Master encryption key | (32-byte base64 string) | Generate with crypto |

### Optional but Recommended Variables

These enhance functionality and security:

#### Security & Authentication

| Variable | Description | Default | Notes |
|----------|-------------|---------|-------|
| `ENCRYPTION_SALT` | Salt for key derivation | - | Required for credential encryption |
| `ENCRYPTION_ALGORITHM` | Encryption algorithm | `aes-256-gcm` | Do not change unless you know what you're doing |
| `HASH_SALT_ROUNDS` | Bcrypt salt rounds | `12` | Higher = more secure but slower |
| `CORS_ORIGIN` | Allowed CORS origins | `http://localhost:3000` | Update for production domain |
| `SESSION_MAX_AGE` | Session expiration (ms) | `86400000` (24h) | Adjust based on security needs |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` | Adjust based on usage |

#### OAuth2 Providers

Configure these to enable social login:

**Google OAuth**:
- `GOOGLE_CLIENT_ID` - From [Google Cloud Console](https://console.cloud.google.com/)
- `GOOGLE_CLIENT_SECRET` - From Google Cloud Console
- `VITE_GOOGLE_CLIENT_ID` - Same as above (frontend)

**GitHub OAuth**:
- `GITHUB_CLIENT_ID` - From [GitHub Developer Settings](https://github.com/settings/developers)
- `GITHUB_CLIENT_SECRET` - From GitHub Developer Settings
- `VITE_GITHUB_CLIENT_ID` - Same as above (frontend)

**Microsoft OAuth**:
- `MICROSOFT_CLIENT_ID` - From [Azure Portal](https://portal.azure.com/)
- `MICROSOFT_CLIENT_SECRET` - From Azure Portal
- `MICROSOFT_TENANT_ID` - Your Azure AD tenant ID
- `VITE_MICROSOFT_CLIENT_ID` - Same as client ID (frontend)

#### AI/LLM Services

Enable AI-powered features:

| Variable | Description | Get From | Required For |
|----------|-------------|----------|--------------|
| `OPENAI_API_KEY` | OpenAI API key | [OpenAI Platform](https://platform.openai.com/) | OpenAI nodes, AI features |
| `ANTHROPIC_API_KEY` | Anthropic API key | [Anthropic Console](https://console.anthropic.com/) | Claude nodes |
| `GOOGLE_AI_API_KEY` | Google AI API key | [Google AI Studio](https://makersuite.google.com/) | Gemini nodes |
| `AZURE_OPENAI_API_KEY` | Azure OpenAI key | [Azure Portal](https://portal.azure.com/) | Azure OpenAI nodes |
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI endpoint | Azure Portal | Azure OpenAI nodes |

#### Communication Services

**Email (SMTP)**:
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password
EMAIL_FROM=noreply@your-domain.com
```

**SendGrid** (Alternative to SMTP):
```bash
SENDGRID_API_KEY=SG.your-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply@your-domain.com
```

**Slack**:
```bash
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token
SLACK_CLIENT_ID=your-slack-client-id
SLACK_CLIENT_SECRET=your-slack-client-secret
```

#### Cloud Storage

**AWS S3**:
```bash
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name
```

**Google Cloud Storage**:
```bash
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_KEY_FILE=/path/to/service-account.json
```

**Azure Blob Storage**:
```bash
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=...
```

#### Monitoring & Observability

```bash
# Logging
LOG_LEVEL=info                    # debug, info, warn, error
METRICS_ENABLED=true

# Sentry (Error Tracking)
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id

# Analytics
GOOGLE_ANALYTICS_ID=UA-XXXXXXXXX-X
```

#### Performance & Scaling

```bash
# Database
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10
DATABASE_TIMEOUT=30000

# Redis
REDIS_TTL=3600                    # Cache TTL in seconds

# Timeouts (all in milliseconds)
TIMEOUT_WORKFLOW_EXECUTION=300000  # 5 minutes
TIMEOUT_NODE_EXECUTION=120000      # 2 minutes
TIMEOUT_HTTP_REQUEST=30000         # 30 seconds
TIMEOUT_LLM_REQUEST=30000          # 30 seconds
```

## 🌍 Environment-Specific Configurations

### Development Environment

```bash
NODE_ENV=development
PORT=3000
API_PORT=3001

# Enable debug features
VITE_DEBUG=true
DEBUG_MODE=true
LOG_LEVEL=debug

# Relaxed security for local development
SESSION_SECURE=false
CORS_ORIGIN=http://localhost:3000

# Use local services
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/workflow_dev
REDIS_URL=redis://localhost:6379
```

### Production Environment

```bash
NODE_ENV=production
PORT=3000
API_PORT=3001

# Disable debug features
VITE_DEBUG=false
DEBUG_MODE=false
LOG_LEVEL=info

# Strict security
SESSION_SECURE=true
CORS_ORIGIN=https://your-production-domain.com

# Production services
DATABASE_URL=postgresql://user:password@prod-db.example.com:5432/workflow_prod
REDIS_URL=redis://:password@prod-redis.example.com:6379

# Enable monitoring
SENTRY_DSN=https://your-sentry-dsn
METRICS_ENABLED=true

# Performance optimization
DATABASE_POOL_MAX=20
REDIS_TTL=7200
```

### Testing Environment

```bash
NODE_ENV=test

# Use test database and Redis
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/workflow_test
REDIS_URL=redis://localhost:6379/1

# Test secrets (simple values)
JWT_SECRET=test-jwt-secret
JWT_REFRESH_SECRET=test-refresh-secret
SESSION_SECRET=test-session-secret

# Disable external services
OPENAI_API_KEY=test-key
SENDGRID_API_KEY=test-key
STRIPE_SECRET_KEY=sk_test_fake_key

# Fast timeouts for tests
TIMEOUT_WORKFLOW_EXECUTION=5000
TIMEOUT_NODE_EXECUTION=2000

# Minimal logging
LOG_LEVEL=error
DEBUG=false
```

## 🔒 Security Best Practices

### 1. Secret Management

**DO**:
- ✅ Generate unique, random secrets for each environment
- ✅ Use environment variables or secret management services (Vault, AWS Secrets Manager)
- ✅ Rotate secrets regularly (at least every 90 days)
- ✅ Use different secrets for dev, staging, and production
- ✅ Store production secrets in encrypted secret managers

**DON'T**:
- ❌ Commit `.env` files to version control
- ❌ Use the same secrets across environments
- ❌ Share secrets via email, Slack, or other insecure channels
- ❌ Use default/example values in production
- ❌ Store secrets in source code or comments

### 2. Git Configuration

Verify `.env` files are ignored:

```bash
# Check git ignore status
git check-ignore -v .env

# Should output:
# .gitignore:26:.env	.env
```

If `.env` files are tracked, remove them:

```bash
# Remove from git (keeps local file)
git rm --cached .env .env.test .env.transformation

# Commit the removal
git commit -m "Remove environment files from git"
```

### 3. Secret Rotation

Regularly rotate your secrets:

```bash
# 1. Generate new secrets
NEW_JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# 2. Update .env file
# Edit .env and replace JWT_SECRET with $NEW_JWT_SECRET

# 3. Restart application
npm run dev

# 4. Invalidate old sessions/tokens if needed
```

### 4. Environment Validation

The application validates required environment variables on startup. If critical variables are missing, you'll see:

```
❌ Missing required environment variable: JWT_SECRET
❌ Missing required environment variable: DATABASE_URL

Please configure these variables in your .env file.
See docs/ENVIRONMENT_SETUP.md for details.
```

## 🐳 Docker & Container Deployments

When using Docker, you can:

1. **Use `.env` file** (Docker Compose):
```yaml
# docker-compose.yml
services:
  app:
    env_file:
      - .env.production
```

2. **Pass variables explicitly**:
```yaml
services:
  app:
    environment:
      NODE_ENV: production
      DATABASE_URL: ${DATABASE_URL}
      JWT_SECRET: ${JWT_SECRET}
```

3. **Use Docker secrets** (Docker Swarm):
```yaml
services:
  app:
    secrets:
      - jwt_secret
      - database_password

secrets:
  jwt_secret:
    external: true
  database_password:
    external: true
```

## 🔍 Troubleshooting

### "Missing required environment variable" error

**Solution**: Copy `.env.example` to `.env` and configure required variables:
```bash
cp .env.example .env
# Edit .env and fill in required values
```

### "Invalid JWT secret" error

**Solution**: Generate a new JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copy the output and set it as JWT_SECRET in .env
```

### "Database connection failed" error

**Solution**: Verify your `DATABASE_URL` is correct:
```bash
# Test PostgreSQL connection
psql "postgresql://user:password@localhost:5432/workflow_db"
```

### "Redis connection refused" error

**Solution**: Ensure Redis is running:
```bash
# Start Redis
redis-server

# Or with Docker
docker run -d -p 6379:6379 redis:7-alpine
```

### Frontend can't connect to backend

**Solution**: Verify frontend environment variables:
```bash
# .env
VITE_API_BASE_URL=http://localhost:3001/api/v1
VITE_GRAPHQL_URL=http://localhost:3001/api/v1/graphql
VITE_WS_URL=ws://localhost:3001/ws
```

## 📞 Support

If you encounter issues with environment configuration:

1. Check the [Environment Variables Reference](#environment-variables-reference) section
2. Review the [Security Best Practices](#security-best-practices)
3. See the [Troubleshooting](#troubleshooting) section
4. Check existing issues on GitHub
5. Create a new issue (do NOT include your actual secrets!)

## 📚 Additional Resources

- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Node.js Best Practices - Configuration](https://github.com/goldbergyoni/nodebestpractices#6-security-best-practices)
- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [12-Factor App - Config](https://12factor.net/config)
