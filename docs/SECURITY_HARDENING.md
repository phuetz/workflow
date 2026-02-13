# Security Hardening Guide

Comprehensive guide to securing your Workflow Automation Platform deployment.

## Table of Contents

1. [Security Overview](#security-overview)
2. [Authentication & Authorization](#authentication--authorization)
3. [Network Security](#network-security)
4. [Data Protection](#data-protection)
5. [Application Security](#application-security)
6. [Infrastructure Security](#infrastructure-security)
7. [Monitoring & Auditing](#monitoring--auditing)
8. [Incident Response](#incident-response)
9. [Compliance](#compliance)
10. [Security Checklist](#security-checklist)

---

## Security Overview

### Security Layers

1. **Network Layer**: Firewalls, TLS, VPN
2. **Application Layer**: Authentication, authorization, input validation
3. **Data Layer**: Encryption at rest and in transit
4. **Infrastructure Layer**: Container security, OS hardening
5. **Monitoring Layer**: Logging, alerting, SIEM

### Threat Model

**Key Threats:**
- Unauthorized access to workflows and data
- Credential theft and misuse
- Injection attacks (SQL, code, command)
- Denial of service attacks
- Data exfiltration
- Supply chain attacks

---

## Authentication & Authorization

### User Authentication

#### Enable Multi-Factor Authentication (MFA)

**Required for:**
- Admin accounts (mandatory)
- Production access (mandatory)
- Developer accounts (recommended)

**Configuration:**
```env
ENABLE_MFA=true
MFA_ISSUER=WorkflowPlatform
MFA_REQUIRED_FOR_ADMIN=true
```

**Supported Methods:**
- TOTP (Google Authenticator, Authy)
- WebAuthn/FIDO2 (hardware keys)
- SMS (not recommended for high-security environments)

#### Password Policies

**Requirements:**
```env
# Minimum password requirements
PASSWORD_MIN_LENGTH=12
PASSWORD_REQUIRE_UPPERCASE=true
PASSWORD_REQUIRE_LOWERCASE=true
PASSWORD_REQUIRE_NUMBER=true
PASSWORD_REQUIRE_SPECIAL=true
PASSWORD_EXPIRY_DAYS=90
PASSWORD_HISTORY_COUNT=5
```

**Best Practices:**
- Enforce strong passwords (12+ characters)
- Require password rotation every 90 days
- Implement account lockout after failed attempts
- Use bcrypt with cost factor 12+

#### Session Management

```env
# Session configuration
SESSION_TIMEOUT=3600           # 1 hour
SESSION_ABSOLUTE_TIMEOUT=28800 # 8 hours
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_HTTPONLY=true
SESSION_COOKIE_SAMESITE=strict
```

**Best Practices:**
- Use secure, HTTP-only cookies
- Implement session timeouts
- Regenerate session IDs on login
- Invalidate sessions on logout

### SSO Integration

#### SAML 2.0 Configuration

```typescript
// config/saml.ts
export const samlConfig = {
  entryPoint: process.env.SAML_ENTRY_POINT,
  issuer: process.env.SAML_ISSUER,
  cert: process.env.SAML_CERT,
  signatureAlgorithm: 'sha256',
  digestAlgorithm: 'sha256',
  wantAssertionsSigned: true,
  wantLogoutResponseSigned: true
};
```

#### OAuth 2.0 / OIDC

```env
# OAuth configuration
OAUTH_PROVIDER=okta
OAUTH_CLIENT_ID=your_client_id
OAUTH_CLIENT_SECRET=your_client_secret
OAUTH_ISSUER=https://your-domain.okta.com
OAUTH_SCOPES=openid,profile,email
```

### Role-Based Access Control (RBAC)

#### Role Definitions

**Admin:**
- Full system access
- User management
- Security configuration
- Audit log access

**Developer:**
- Create/edit workflows
- Execute workflows
- View executions
- Manage credentials (own)

**Viewer:**
- View workflows (read-only)
- View executions
- No modifications

**Operator:**
- Execute workflows
- View executions
- No workflow edits

#### Permission Granularity

```typescript
// Example permission check
const permissions = {
  workflows: {
    create: ['admin', 'developer'],
    read: ['admin', 'developer', 'viewer', 'operator'],
    update: ['admin', 'developer'],
    delete: ['admin'],
    execute: ['admin', 'developer', 'operator']
  },
  credentials: {
    create: ['admin', 'developer'],
    read: ['admin'], // Only admins can view credential values
    update: ['admin', 'developer'],
    delete: ['admin']
  }
};
```

---

## Network Security

### TLS/SSL Configuration

#### Enable HTTPS Only

```nginx
# nginx.conf
server {
    listen 80;
    server_name workflow.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name workflow.example.com;

    ssl_certificate /etc/ssl/certs/cert.pem;
    ssl_certificate_key /etc/ssl/private/key.pem;

    # Modern TLS configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';
    ssl_prefer_server_ciphers on;

    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
}
```

### Firewall Rules

#### Application Firewall

**Allow:**
- HTTPS (443) from internet
- SSH (22) from jump host only
- PostgreSQL (5432) from application servers only
- Redis (6379) from application servers only

**Deny:**
- All other inbound traffic

**Example (AWS Security Group):**
```hcl
resource "aws_security_group" "app" {
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port       = 22
    to_port         = 22
    protocol        = "tcp"
    security_groups = [aws_security_group.bastion.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

### VPC/Network Isolation

**Architecture:**
```
Internet
    ↓
Load Balancer (Public Subnet)
    ↓
Application Servers (Private Subnet)
    ↓
Database/Cache (Private Subnet - No Internet)
```

**Best Practices:**
- Use private subnets for application and data tiers
- Deploy NAT gateway for outbound internet access
- Implement network segmentation
- Use VPC endpoints for AWS services

---

## Data Protection

### Encryption at Rest

#### Database Encryption

**PostgreSQL:**
```env
# Enable encryption
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require

# Transparent Data Encryption (TDE)
POSTGRES_ENCRYPTION=aes-256-gcm
```

**Configuration:**
```sql
-- Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Encrypt sensitive columns
CREATE TABLE credentials (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    api_key BYTEA, -- Encrypted column
    encrypted_data BYTEA
);

-- Insert with encryption
INSERT INTO credentials (id, name, api_key)
VALUES (
    gen_random_uuid(),
    'AWS API Key',
    pgp_sym_encrypt('secret_key', 'encryption_password')
);

-- Query with decryption
SELECT
    id,
    name,
    pgp_sym_decrypt(api_key, 'encryption_password') as api_key
FROM credentials;
```

#### File Storage Encryption

**AWS S3:**
```typescript
// Enable server-side encryption
const s3Client = new S3Client({
  region: 'us-east-1'
});

await s3Client.send(new PutObjectCommand({
  Bucket: 'workflow-storage',
  Key: 'workflow-data.json',
  Body: data,
  ServerSideEncryption: 'aws:kms',
  SSEKMSKeyId: 'arn:aws:kms:region:account:key/key-id'
}));
```

### Encryption in Transit

**All external communications must use TLS:**
```env
# Enforce TLS for all connections
DATABASE_SSL=require
REDIS_TLS=true
SMTP_TLS=true
API_HTTPS_ONLY=true
```

### Secrets Management

#### Using HashiCorp Vault

```typescript
// vault-client.ts
import Vault from 'node-vault';

const vault = Vault({
  apiVersion: 'v1',
  endpoint: process.env.VAULT_ADDR,
  token: process.env.VAULT_TOKEN
});

// Store secret
await vault.write('secret/data/aws-credentials', {
  data: {
    accessKeyId: 'AKIA...',
    secretAccessKey: 'secret...'
  }
});

// Retrieve secret
const { data } = await vault.read('secret/data/aws-credentials');
const credentials = data.data;
```

#### Environment Variables

**Best Practices:**
- Never commit secrets to version control
- Use `.env` files for local development
- Use secret management services in production
- Rotate secrets regularly (every 90 days)

**Example `.env` (development only):**
```env
# Development secrets (NEVER commit to git)
JWT_SECRET=local-dev-secret-change-in-production
DATABASE_URL=postgresql://localhost:5432/workflow_dev
```

---

## Application Security

### Input Validation

#### SQL Injection Prevention

**✅ Good - Parameterized Queries:**
```typescript
// Using parameterized queries
const users = await db.query(
  'SELECT * FROM users WHERE email = $1',
  [userEmail]
);
```

**❌ Bad - String Concatenation:**
```typescript
// VULNERABLE to SQL injection
const users = await db.query(
  `SELECT * FROM users WHERE email = '${userEmail}'`
);
```

#### Command Injection Prevention

**✅ Good - Validated Input:**
```typescript
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Whitelist allowed commands
const ALLOWED_COMMANDS = ['ls', 'pwd', 'date'];

async function executeCommand(command: string) {
  const [cmd, ...args] = command.split(' ');

  if (!ALLOWED_COMMANDS.includes(cmd)) {
    throw new Error('Command not allowed');
  }

  // Validate arguments
  const sanitizedArgs = args.map(arg =>
    arg.replace(/[^a-zA-Z0-9_-]/g, '')
  );

  return execAsync(`${cmd} ${sanitizedArgs.join(' ')}`);
}
```

#### XSS Prevention

**React (automatic escaping):**
```typescript
// Safe - React escapes by default
<div>{userInput}</div>

// Dangerous - use only for trusted content
<div dangerouslySetInnerHTML={{ __html: sanitizedHTML }} />
```

**DOMPurify for HTML sanitization:**
```typescript
import DOMPurify from 'dompurify';

const sanitizedHTML = DOMPurify.sanitize(userHTML, {
  ALLOWED_TAGS: ['p', 'b', 'i', 'em', 'strong', 'a'],
  ALLOWED_ATTR: ['href']
});
```

### Code Execution Security

#### Sandboxed Execution

```typescript
// Safe code execution with VM2
import { VM } from 'vm2';

function executeUserCode(code: string, context: any) {
  const vm = new VM({
    timeout: 5000,
    sandbox: context,
    eval: false,
    wasm: false,
    fixAsync Timeout: false
  });

  try {
    return vm.run(code);
  } catch (error) {
    throw new Error(`Execution failed: ${error.message}`);
  }
}
```

### Rate Limiting

**API Rate Limiting:**
```typescript
import rateLimit from 'express-rate-limit';

// Global rate limit
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests, please try again later'
});

// Authentication rate limit (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 login attempts per window
  message: 'Too many login attempts, please try again later'
});

app.use('/api/', globalLimiter);
app.use('/api/auth/', authLimiter);
```

---

## Infrastructure Security

### Container Security

#### Docker Hardening

**Dockerfile:**
```dockerfile
# Use minimal base image
FROM node:18-alpine

# Run as non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy dependencies
COPY --chown=nodejs:nodejs package*.json ./
RUN npm ci --only=production

# Copy application
COPY --chown=nodejs:nodejs . .

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node healthcheck.js

# Start application
CMD ["node", "dist/server.js"]
```

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  app:
    build: .
    read_only: true
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
    tmpfs:
      - /tmp
    environment:
      - NODE_ENV=production
```

### Kubernetes Security

**Pod Security Policy:**
```yaml
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: restricted
spec:
  privileged: false
  allowPrivilegeEscalation: false
  requiredDropCapabilities:
    - ALL
  volumes:
    - 'configMap'
    - 'emptyDir'
    - 'projected'
    - 'secret'
  runAsUser:
    rule: 'MustRunAsNonRoot'
  seLinux:
    rule: 'RunAsAny'
  fsGroup:
    rule: 'RunAsAny'
  readOnlyRootFilesystem: true
```

**Network Policies:**
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: app-network-policy
spec:
  podSelector:
    matchLabels:
      app: workflow-app
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: nginx-ingress
      ports:
        - protocol: TCP
          port: 3000
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: postgresql
      ports:
        - protocol: TCP
          port: 5432
```

---

## Monitoring & Auditing

### Audit Logging

**What to Log:**
- Authentication attempts (success and failure)
- Authorization failures
- Data access (read/write/delete)
- Configuration changes
- Credential usage
- API requests
- Security events

**Log Format:**
```json
{
  "timestamp": "2025-01-18T10:30:00Z",
  "eventType": "authentication",
  "action": "login",
  "result": "success",
  "userId": "user-123",
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "metadata": {
    "mfaUsed": true,
    "sessionId": "sess-456"
  }
}
```

### Security Monitoring

**Alerts:**
- Multiple failed login attempts
- Privilege escalation attempts
- Unusual API access patterns
- Credential misuse
- Data exfiltration attempts

**Example Alert (Prometheus):**
```yaml
groups:
  - name: security
    rules:
      - alert: HighFailedLoginRate
        expr: rate(auth_failures_total[5m]) > 10
        for: 5m
        annotations:
          summary: High rate of failed login attempts
          description: "{{ $value }} failed logins per second"
```

---

## Incident Response

### Response Plan

**1. Detection**
- Monitor security alerts
- Review audit logs
- User reports

**2. Containment**
- Isolate affected systems
- Revoke compromised credentials
- Block malicious IPs

**3. Investigation**
- Analyze logs
- Determine scope of breach
- Identify attack vector

**4. Remediation**
- Patch vulnerabilities
- Rotate all credentials
- Update security controls

**5. Recovery**
- Restore from backups if needed
- Verify system integrity
- Resume normal operations

**6. Post-Incident**
- Document lessons learned
- Update security procedures
- Communicate with stakeholders

---

## Compliance

### GDPR

**Data Subject Rights:**
- Right to access
- Right to rectification
- Right to erasure
- Right to data portability

**Implementation:**
```typescript
// User data export
async function exportUserData(userId: string) {
  const userData = await db.getUserData(userId);
  const workflows = await db.getUserWorkflows(userId);
  const executions = await db.getUserExecutions(userId);

  return {
    user: userData,
    workflows,
    executions,
    exportDate: new Date().toISOString()
  };
}

// User data deletion
async function deleteUserData(userId: string) {
  await db.transaction(async (tx) => {
    await tx.deleteUserExecutions(userId);
    await tx.deleteUserWorkflows(userId);
    await tx.anonymizeUserData(userId);
    await auditLog('user_deletion', { userId });
  });
}
```

### SOC 2

**Controls:**
- Access control (RBAC)
- Encryption (at rest and in transit)
- Monitoring and logging
- Incident response
- Change management

---

## Security Checklist

### Pre-Production

- [ ] Enable HTTPS/TLS everywhere
- [ ] Configure strong password policies
- [ ] Enable MFA for all admin accounts
- [ ] Implement RBAC
- [ ] Enable audit logging
- [ ] Configure rate limiting
- [ ] Set up security monitoring
- [ ] Encrypt sensitive data
- [ ] Secure secrets management
- [ ] Harden containers/infrastructure
- [ ] Configure network policies
- [ ] Set up backups
- [ ] Test incident response plan
- [ ] Security scan all dependencies
- [ ] Penetration testing completed

### Post-Production

- [ ] Monitor security alerts daily
- [ ] Review audit logs weekly
- [ ] Rotate credentials quarterly
- [ ] Update dependencies monthly
- [ ] Security assessments annually
- [ ] Test disaster recovery quarterly
- [ ] Review access permissions quarterly
- [ ] Update security documentation

---

**Last Updated:** 2025-01-18
**Version:** 2.0.0
