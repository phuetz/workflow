# Enterprise Integration Guide

## Table of Contents
1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Enterprise SSO Guide](#enterprise-sso-guide)
4. [Enterprise API Gateway Guide](#enterprise-api-gateway-guide)
5. [Enterprise Audit Guide](#enterprise-audit-guide)
6. [Integration Examples](#integration-examples)
7. [Best Practices](#best-practices)
8. [API Reference](#api-reference)

---

## Overview

### What is Enterprise Integration?

Enterprise Integration in this workflow platform provides comprehensive tools for organizations to:
- **Authenticate Users** securely via SSO (Single Sign-On)
- **Manage APIs** with rate limiting, versioning, and governance
- **Audit Operations** with compliance-ready logging and reporting
- **Enforce Security** policies across all integrations
- **Monitor Performance** with real-time metrics and analytics

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    External Identity Providers             │
│         (Okta, Azure AD, Google Workspace, etc.)           │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────▼────────────┐
        │  Enterprise SSO Layer    │
        │  • SAML 2.0             │
        │  • OIDC/OAuth2          │
        │  • WS-Federation        │
        │  • LDAP/AD              │
        └────────────┬────────────┘
                     │
        ┌────────────▼────────────────┐
        │  API Gateway               │
        │  • Authentication          │
        │  • Rate Limiting           │
        │  • Request Transformation  │
        │  • Circuit Breaking        │
        └────────────┬────────────────┘
                     │
        ┌────────────▼────────────────┐
        │  Core Workflow Engine       │
        │  • Execution               │
        │  • Data Processing         │
        │  • Integration Nodes       │
        └────────────┬────────────────┘
                     │
        ┌────────────▼────────────────┐
        │  Audit & Compliance Layer   │
        │  • Event Logging           │
        │  • Compliance Reporting    │
        │  • Security Monitoring     │
        └────────────────────────────┘
```

### Key Components

#### 1. **Enterprise SSO Service**
- Multi-protocol support (SAML 2.0, OIDC/OAuth2, WS-Federation, LDAP)
- 7 identity providers (Okta, Azure AD, OneLogin, Ping Identity, Google Workspace, custom SAML/OIDC)
- Multi-factor authentication (TOTP, SMS, Email, Hardware Keys)
- Just-in-time user provisioning
- Directory synchronization
- Session management and token refresh

#### 2. **Enterprise API Gateway**
- API registration, versioning, and deprecation
- Multiple authentication strategies (API Key, OAuth2, JWT, Mutual TLS)
- Rate limiting with token bucket, fixed window, or sliding window
- Circuit breaker for fault tolerance
- Request/response transformation
- Performance metrics and analytics
- Policy enforcement and governance

#### 3. **Audit & Compliance**
- Event-based audit logging
- 10+ audit categories and 50+ audit actions
- Compliance reporting (SOC2, HIPAA, GDPR, ISO 27001)
- User activity tracking
- Resource change tracking
- Security event monitoring

### Benefits

| Feature | Benefit |
|---------|---------|
| **Multi-Protocol SSO** | Support for all major enterprise identity providers |
| **API Governance** | Control, version, and manage all APIs centrally |
| **Compliance Ready** | Built-in audit logging for regulatory requirements |
| **Security First** | Multiple authentication layers and encryption |
| **Developer Friendly** | Easy integration, comprehensive documentation |
| **Monitoring & Analytics** | Real-time insights into API usage and performance |

---

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Redis 7+ (for rate limiting and caching)
- TypeScript 5.5+

### 5-Minute Setup

#### Step 1: Install Dependencies

```bash
npm install passport passport-saml jwt-simple ioredis bcrypt
```

#### Step 2: Configure Environment Variables

```bash
# .env file

# SSO Configuration
SSO_ENABLED=true
SSO_PROVIDER=saml
SAML_ENTRY_POINT=https://your-idp.com/sso
SAML_ISSUER=https://your-app.com/metadata.xml
SAML_CERT=-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----
SAML_CALLBACK_URL=https://your-app.com/api/sso/acs

# API Gateway
API_GATEWAY_ENABLED=true
API_RATE_LIMIT_WINDOW=60000
API_RATE_LIMIT_REQUESTS=1000

# Audit Logging
AUDIT_LOGGING_ENABLED=true
AUDIT_LOG_RETENTION_DAYS=90
```

#### Step 3: Initialize SSO Service

```typescript
import { initializeSSOService } from './src/backend/auth/SSOService';

const ssoService = initializeSSOService({
  enabled: true,
  provider: 'saml',
  saml: {
    entryPoint: process.env.SAML_ENTRY_POINT!,
    issuer: process.env.SAML_ISSUER!,
    cert: process.env.SAML_CERT!,
    callbackUrl: process.env.SAML_CALLBACK_URL!,
  },
});
```

#### Step 4: Set Up API Gateway

```typescript
import { EnterpriseAPIGateway } from './src/security/enterprise/EnterpriseAPIGateway';

const gateway = new EnterpriseAPIGateway({
  enableRateLimit: true,
  enableCircuitBreaker: true,
  enableMetrics: true,
});

// Register your API
gateway.registerAPI({
  id: 'workflow-api-v1',
  name: 'Workflow API',
  version: '1.0.0',
  baseUrl: 'https://api.your-app.com',
  owner: 'platform-team',
});
```

#### Step 5: First SSO Login

1. Navigate to your application
2. Click "Sign in with SSO"
3. You'll be redirected to your identity provider
4. After authentication, you'll be logged in automatically

#### Step 6: Verification

```bash
# Test SSO endpoint
curl -X GET https://localhost:3000/api/sso/status

# Test API Gateway
curl -X GET https://localhost:3000/api/v1/workflows \
  -H "Authorization: Bearer YOUR_API_KEY"

# Check audit logs
curl -X GET https://localhost:3000/api/audit/logs \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

---

## Enterprise SSO Guide

### SSO Protocols

#### SAML 2.0 (Security Assertion Markup Language)

**Use Case**: Traditional enterprise single sign-on
**Standards**: OASIS SAML 2.0
**Flow**: User → IdP → SP (Service Provider) → Application

```typescript
import { SSOService, SSOConfig } from './src/backend/auth/SSOService';

const samlConfig: SSOConfig = {
  enabled: true,
  provider: 'saml',
  saml: {
    entryPoint: 'https://idp.company.com/sso/SAML2/Web',
    issuer: 'https://app.company.com/metadata',
    cert: fs.readFileSync('idp-cert.pem', 'utf8'),
    callbackUrl: 'https://app.company.com/saml/acs',
    logoutUrl: 'https://idp.company.com/sso/SLO',
    identifierFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
    acceptedClockSkewMs: 5000,
    attributeMap: {
      email: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
      firstName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname',
      lastName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname',
      groups: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/groups',
    },
  },
};

const ssoService = new SSOService(samlConfig);
ssoService.initialize();
```

**Advantages**:
- Industry standard for enterprise SSO
- Well-supported by identity providers
- Encryption and signature support
- Attribute mapping flexibility

#### OIDC/OAuth2 (OpenID Connect)

**Use Case**: Modern cloud-native authentication
**Standards**: OpenID Connect Core 1.0, OAuth 2.0
**Flow**: User → AuthZ Server → Authorization Code → Tokens → Application

```typescript
import { OAuth2Service } from './src/backend/auth/OAuth2Service';

const oauth2Service = new OAuth2Service();

// Get authorization URL
const { url, state } = await oauth2Service.getAuthorizationUrl('google', {
  scope: ['openid', 'profile', 'email'],
  usePKCE: true, // Enhanced security with PKCE
});

// Exchange code for tokens
const tokens = await oauth2Service.exchangeCodeForTokens('google', code, state);

// Refresh access token when needed
if (oauth2Service.needsRefresh(tokens.expiresAt)) {
  const newTokens = await oauth2Service.refreshAccessToken('google', tokens.refreshToken!);
}
```

**Supported Providers**:
- Google
- Microsoft/Azure AD
- GitHub
- Slack
- Salesforce

**Advantages**:
- Modern standard with broad support
- Better mobile/SPA support
- Built-in token management
- PKCE for enhanced security

#### WS-Federation

**Use Case**: Microsoft environments with Active Directory
**Standards**: WS-Federation 1.2
**Flow**: User → IdP → Federation Server → Token → Application

```typescript
// WS-Federation configuration for AD FS
const wsConfig = {
  protocol: 'ws-federation',
  realm: 'urn:company:app',
  homeRealmDiscoveryUrl: 'https://ad-fs.company.com/adfs/ls/Home',
  wctx: 'http://your-app.com', // Return URL
  wreply: 'https://your-app.com/ws-federation-callback',
};
```

**Advantages**:
- Seamless Active Directory integration
- Windows-based authentication
- Legacy system compatibility

#### LDAP/Active Directory

**Use Case**: On-premises directory synchronization
**Standards**: LDAP v3, RFC 4511
**Flow**: Direct directory queries with bind authentication

```typescript
import { LDAPAuthProvider } from './src/auth/ldap/LDAPAuthProvider';

const ldapConfig = {
  url: 'ldaps://ad.company.com:636',
  baseDN: 'dc=company,dc=com',
  bindDN: 'cn=svc_account,cn=users,dc=company,dc=com',
  bindPassword: process.env.LDAP_BIND_PASSWORD,
  userSearchFilter: '(&(objectClass=person)(sAMAccountName={username}))',
  groupSearchFilter: '(member={userDN})',
  mailAttribute: 'mail',
  displayNameAttribute: 'displayName',
  groupMemberAttribute: 'memberOf',
  tlsEnabled: true,
};

const ldapProvider = new LDAPAuthProvider(ldapConfig);
const user = await ldapProvider.authenticate('john.doe', 'password');
```

**Advantages**:
- On-premises control
- Synchronize with existing directory
- Group-based authorization
- Real-time user management

### Identity Providers

#### Okta

**Setup**:
```bash
# Environment variables
OKTA_DOMAIN=https://dev-123456.okta.com
OKTA_CLIENT_ID=0oaXXXXXXXXXXXXXXXX
OKTA_CLIENT_SECRET=XXXXXXXXXXXXXXXXXXXXXX
OKTA_REDIRECT_URI=https://your-app.com/api/oauth/okta/callback
```

**Configuration**:
```typescript
const oktaConfig = {
  provider: 'okta',
  protocol: 'oidc',
  clientId: process.env.OKTA_CLIENT_ID!,
  clientSecret: process.env.OKTA_CLIENT_SECRET!,
  discoveryUrl: `${process.env.OKTA_DOMAIN}/.well-known/openid-configuration`,
  authorizationUrl: `${process.env.OKTA_DOMAIN}/oauth2/v1/authorize`,
  tokenUrl: `${process.env.OKTA_DOMAIN}/oauth2/v1/token`,
  userInfoUrl: `${process.env.OKTA_DOMAIN}/oauth2/v1/userinfo`,
  jwksUrl: `${process.env.OKTA_DOMAIN}/oauth2/v1/keys`,
  scopes: ['openid', 'profile', 'email', 'groups'],
};
```

#### Azure AD

**Setup**:
```bash
# Environment variables
AZURE_TENANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
AZURE_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
AZURE_CLIENT_SECRET=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
AZURE_REDIRECT_URI=https://your-app.com/api/oauth/azure/callback
```

**Configuration**:
```typescript
const azureConfig = {
  provider: 'azure_ad',
  protocol: 'oidc',
  clientId: process.env.AZURE_CLIENT_ID!,
  clientSecret: process.env.AZURE_CLIENT_SECRET!,
  authorizationUrl: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/authorize`,
  tokenUrl: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`,
  userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
  jwksUrl: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/discovery/v2.0/keys`,
  scopes: ['openid', 'profile', 'email', 'Directory.Read.All'],
};
```

#### OneLogin, Ping Identity, Google Workspace

Similar configuration patterns with provider-specific endpoints and scopes.

### Authentication Flows

#### SAML 2.0 Flow

```
User Browser                Your App              Identity Provider
     │                           │                       │
     │─ Click "Login" ─────────→ │                       │
     │                           │                       │
     │                  Redirect to IdP ─────────────────→ │
     │ ← ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ←│
     │                           │                       │
     │─ Login & Consent ────────────────────────────────→ │
     │                           │                       │
     │  ← ─ ─ ─ SAML Assertion ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ← │
     │ ← ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ← │
     │                           │                       │
     │─ SAML Response ──────────→ │ Validate & Create Session
     │ ← ─ Set Session Cookie ── │
     │                           │
     │─ Access Application ─────→ │
```

#### OIDC Flow with PKCE

```
User Browser            Your App           Authorization Server
     │                      │                       │
     │ Click "Login"        │                       │
     │ ───────────────────→ │                       │
     │                      │                       │
     │         Generate State & PKCE Verifier      │
     │                      │                       │
     │                  Redirect with Code Challenge
     │ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─→ │
     │                      │ ← Login Page ─ ─ ─ ─ ← │
     │ ← User Logs In ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ← │
     │                      │ ← Consent Screen ─ ─ ← │
     │                      │ ← Authorization Code ─ ← │
     │ ← Redirect with Code
     │                      │                       │
     │ ──────────────────→  │                       │
     │              Exchange Code + Verifier      │
     │                      │ ─────────────────────→ │
     │                      │ ← Access + ID Token ─ ← │
     │                      │                       │
     │ Create Session ← ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │
     │                      │                       │
     │ ← Set Cookie ────────│                       │
     │                      │                       │
     │ Access App ────────→ │                       │
```

### User Management

#### Just-In-Time (JIT) Provisioning

Automatically create users on first SSO login:

```typescript
import { EnterpriseSSOIntegration } from './src/security/enterprise/EnterpriseSSOIntegration';

const sso = getEnterpriseSSOIntegration();

// Enable JIT provisioning
sso.registerProvider({
  provider: 'okta',
  name: 'Okta',
  enabled: true,
  protocol: oktaOIDCConfig,
  attributeMappings: [
    { idpAttribute: 'email', localAttribute: 'email', required: true },
    { idpAttribute: 'given_name', localAttribute: 'firstName' },
    { idpAttribute: 'family_name', localAttribute: 'lastName' },
  ],
  groupRoleMappings: [
    { idpGroup: 'okta_admin_group', localRole: 'admin', permissions: ['admin:*'] },
    { idpGroup: 'okta_user_group', localRole: 'user', permissions: ['user:read', 'workflow:execute'] },
  ],
  jitProvisioning: {
    enabled: true,
    defaultRole: 'user',
    emailVerificationRequired: false,
  },
});
```

#### Directory Synchronization

Sync users from identity provider periodically:

```typescript
// Configure directory sync
sso.registerProvider({
  // ... other config
  directorySyncConfig: {
    enabled: true,
    syncIntervalMs: 24 * 60 * 60 * 1000, // Daily
    batchSize: 100,
    deleteDisabledUsers: true,
  },
});

// Listen for sync completion
sso.on('directory-sync-completed', (result) => {
  console.log(`Synced ${result.createdUsers} new users, updated ${result.updatedUsers}`);
});

// Manual sync trigger
const result = await sso.synchronizeDirectory('okta');
console.log(`Sync took ${result.duration}ms, ${result.failedUsers} failures`);
```

### Security Features

#### Multi-Factor Authentication

```typescript
// Verify MFA during login
const mfaVerified = await sso.verifyMFA(sessionId, 'totp', otpCode);

if (mfaVerified) {
  console.log('User successfully authenticated with MFA');
}
```

**Supported MFA Methods**:
- Time-based One-Time Password (TOTP)
- SMS verification
- Email verification
- Hardware security keys
- Push notifications

#### Session Management

```typescript
// Get active session
const session = sso.getSession(sessionId);

// Refresh token before expiry
if (session && Date.now() + 5 * 60 * 1000 >= session.tokenExpiresAt) {
  const newTokens = await sso.refreshSession(sessionId, refreshToken);
  console.log(`New token expires at ${new Date(newTokens.expiresAt)}`);
}

// Logout and invalidate session
await sso.logout(sessionId, 'okta');
```

---

## Enterprise API Gateway Guide

### API Management

#### Register an API

```typescript
import { EnterpriseAPIGateway } from './src/security/enterprise/EnterpriseAPIGateway';

const gateway = new EnterpriseAPIGateway();

gateway.registerAPI({
  id: 'workflow-api-v1',
  name: 'Workflow API',
  title: 'Workflow Management API',
  description: 'API for managing workflow definitions and executions',
  version: '1.0.0',
  baseUrl: 'https://api.company.com/v1',
  status: 'active',
  owner: 'platform-team',
  contact: {
    name: 'Platform Team',
    email: 'platform@company.com',
    url: 'https://internal-wiki.company.com',
  },
  endpoints: [
    {
      id: 'create-workflow',
      path: '/workflows',
      method: 'POST',
      version: '1.0.0',
      description: 'Create a new workflow',
      authentication: ['oauth2', 'jwt'],
      rateLimit: { requests: 100, window: 60000 },
      retryPolicy: { maxRetries: 3, backoffMs: 1000, backoffMultiplier: 2 },
    },
    {
      id: 'list-workflows',
      path: '/workflows',
      method: 'GET',
      version: '1.0.0',
      description: 'List all workflows',
      authentication: ['oauth2', 'jwt'],
      rateLimit: { requests: 1000, window: 60000 },
    },
  ],
  authentication: {
    strategies: ['oauth2', 'jwt', 'api-key'],
    defaultStrategy: 'oauth2',
  },
  rateLimit: {
    global: { requests: 10000, window: 60000 },
    perUser: { requests: 1000, window: 60000 },
    strategy: 'sliding-window',
  },
  quota: {
    dailyRequests: 100000,
    monthlyRequests: 3000000,
    concurrentConnections: 100,
  },
  documentation: {
    url: 'https://docs.company.com/api/workflows',
    openapi: 'https://api.company.com/openapi.json',
    postman: 'https://api.company.com/postman-collection.json',
  },
});
```

#### Create API Keys

```typescript
// Generate API key for third-party integration
const apiKey = gateway.createAPIKey({
  apiId: 'workflow-api-v1',
  name: 'Partner Integration Key',
  permissions: ['workflow:read', 'workflow:list'],
  ipWhitelist: ['192.168.1.100', '10.0.0.0/8'],
  rateLimit: { requests: 1000, window: 60000 },
  quotas: { daily: 50000, monthly: 1500000 },
  expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
});

console.log(`API Key: ${apiKey.key}`);
```

### Security (Authentication & Authorization)

#### API Key Authentication

```typescript
// Client making request
const response = await fetch('https://api.company.com/v1/workflows', {
  headers: {
    'X-API-Key': 'your-api-key-here',
    'Content-Type': 'application/json',
  },
});
```

#### OAuth2 Authentication

```typescript
// Server validates token
const isValid = await gateway.validateOAuth2Token(token, 'workflow-api-v1');

if (!isValid) {
  return res.status(401).json({ error: 'Invalid token' });
}
```

#### JWT Authentication

```typescript
// Verify JWT signature and claims
const decoded = await gateway.validateJWT(token, {
  algorithms: ['HS256', 'RS256'],
  issuer: 'https://your-idp.com',
  audience: 'workflow-api-v1',
  clockTolerance: 60, // seconds
});

const userId = decoded.sub;
const scopes = decoded.scope.split(' ');
```

#### Mutual TLS (mTLS)

```typescript
// Server configuration
const server = https.createServer({
  key: fs.readFileSync('server-key.pem'),
  cert: fs.readFileSync('server-cert.pem'),
  ca: fs.readFileSync('client-ca.pem'),
  requestCert: true,
  rejectUnauthorized: true,
}, app);
```

### Traffic Management

#### Rate Limiting

```typescript
// Token bucket strategy (smooth traffic)
const rateLimiter = {
  strategy: 'token-bucket',
  capacity: 100,
  refillRate: 10, // tokens per second
};

// Sliding window strategy (accurate counting)
const rateLimiter = {
  strategy: 'sliding-window',
  requests: 100,
  window: 60000, // 1 minute
};

// Fixed window strategy (simple, less accurate)
const rateLimiter = {
  strategy: 'fixed-window',
  requests: 100,
  window: 60000, // 1 minute
};

// Check rate limit
const allowed = gateway.checkRateLimit(apiKeyId, 'workflow-api-v1');
if (!allowed) {
  return res.status(429).json({
    error: 'Rate limit exceeded',
    retryAfter: 60, // seconds
  });
}
```

#### Circuit Breaker

Prevent cascading failures:

```typescript
// Circuit breaker automatically opens after 5 failures
const circuitBreaker = {
  apiId: 'external-service-api',
  endpoint: '/data',
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 60000, // 1 minute
};

// Get circuit breaker status
const status = gateway.getCircuitBreakerStatus('external-service-api', '/data');
// { state: 'open' | 'closed' | 'half-open', failureCount: 5 }

if (status.state === 'open') {
  console.log('Circuit breaker is open, requests are blocked');
}
```

### Monitoring

#### Performance Metrics

```typescript
// Get metrics for an API
const metrics = gateway.getMetrics('workflow-api-v1', {
  startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
  endDate: new Date(),
});

console.log(`
  Total Requests: ${metrics.totalRequests}
  Average Latency: ${metrics.avgLatency}ms
  Error Rate: ${metrics.errorRate}%
  P95 Latency: ${metrics.p95Latency}ms
  P99 Latency: ${metrics.p99Latency}ms
`);

// Get endpoint-specific metrics
const endpointMetrics = gateway.getEndpointMetrics('workflow-api-v1', '/workflows', 'POST');
```

#### Usage Analytics

```typescript
// Track API usage over time
const usage = gateway.getUsageAnalytics('workflow-api-v1');

console.log(`
  Daily Active Users: ${usage.dailyActiveUsers}
  Requests per Minute: ${usage.requestsPerMinute}
  Top Users: ${usage.topUsers.map(u => `${u.name} (${u.requests} requests)`).join(', ')}
`);
```

### Developer Experience

#### API Documentation

```typescript
// Generate OpenAPI/Swagger documentation
const openapi = gateway.generateOpenAPI('workflow-api-v1');

// Serve on /openapi.json
app.get('/openapi.json', (req, res) => {
  res.json(openapi);
});

// Documentation UI available at /docs
app.use('/docs', swaggerUI.serve, swaggerUI.setup(openapi));
```

#### API Versioning

```typescript
// Support multiple API versions
gateway.registerAPI({
  id: 'workflow-api-v1',
  version: '1.0.0',
  status: 'active',
  // ... other config
});

gateway.registerAPI({
  id: 'workflow-api-v2',
  version: '2.0.0',
  status: 'active',
  // ... other config
});

// Deprecation timeline
gateway.registerAPI({
  id: 'workflow-api-v1',
  version: '1.0.0',
  status: 'deprecated', // No longer in active development
  deprecationDate: new Date('2025-12-31'),
  sunsetDate: new Date('2026-12-31'), // End of life
});
```

---

## Enterprise Audit Guide

### Audit Logging

#### Event Types

```typescript
import { AuditAction, AuditCategory, AuditSeverity } from './src/backend/audit/AuditTypes';

// Authentication events
await auditLog({
  action: AuditAction.SECURITY_SSO_LOGIN,
  category: AuditCategory.SECURITY,
  severity: AuditSeverity.INFO,
  userId: 'user123',
  userEmail: 'john@company.com',
  resourceType: 'user',
  resourceId: 'user123',
  success: true,
  details: { provider: 'okta', method: 'OIDC' },
});

// Workflow execution
await auditLog({
  action: AuditAction.WORKFLOW_EXECUTED,
  category: AuditCategory.WORKFLOW,
  severity: AuditSeverity.INFO,
  userId: 'user123',
  resourceType: 'workflow',
  resourceId: 'wf_456',
  resourceName: 'Customer Data Sync',
  success: true,
  duration: 1234, // milliseconds
});

// Credential access
await auditLog({
  action: AuditAction.CREDENTIAL_ACCESSED,
  category: AuditCategory.SECURITY,
  severity: AuditSeverity.WARNING,
  userId: 'user123',
  resourceType: 'credential',
  resourceId: 'cred_789',
  success: true,
  details: { scope: 'slack_token_read' },
});

// Configuration change
await auditLog({
  action: AuditAction.CONFIGURATION_CHANGED,
  category: AuditCategory.ADMINISTRATION,
  severity: AuditSeverity.INFO,
  userId: 'admin123',
  resourceType: 'api-gateway',
  resourceId: 'gateway-1',
  oldValue: { rateLimit: 1000 },
  newValue: { rateLimit: 5000 },
  success: true,
});

// Security event
await auditLog({
  action: AuditAction.UNAUTHORIZED_ACCESS_ATTEMPT,
  category: AuditCategory.SECURITY,
  severity: AuditSeverity.CRITICAL,
  userId: 'unknown',
  resourceType: 'workflow',
  resourceId: 'wf_sensitive',
  success: false,
  errorMessage: 'User does not have execute permission',
  ipAddress: '192.168.1.100',
  userAgent: 'Mozilla/5.0...',
});
```

**Audit Categories**:
- SECURITY (login, credentials, access attempts)
- WORKFLOW (execution, creation, deletion)
- DATA (read, write, deletion)
- ADMINISTRATION (configuration, user management)
- INTEGRATION (third-party API calls)
- COMPLIANCE (GDPR requests, audit operations)

**Audit Actions** (50+):
- SECURITY_SSO_LOGIN, SECURITY_SSO_LOGOUT
- WORKFLOW_CREATED, WORKFLOW_EXECUTED, WORKFLOW_DELETED
- CREDENTIAL_ACCESSED, CREDENTIAL_ROTATED
- USER_CREATED, USER_UPDATED, USER_DELETED
- API_KEY_CREATED, API_KEY_REVOKED
- CONFIGURATION_CHANGED
- UNAUTHORIZED_ACCESS_ATTEMPT
- And 30+ more...

### Compliance Reporting

#### Generate Compliance Reports

```typescript
import { getAuditService } from './src/backend/audit/AuditService';

const auditService = getAuditService();

// Query audit logs
const { entries, total } = await auditService.query({
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-12-31'),
  categories: ['SECURITY', 'COMPLIANCE'],
  severities: ['WARNING', 'ERROR', 'CRITICAL'],
});

// Get statistics
const stats = await auditService.getStats({
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-12-31'),
});

console.log(`
  Total Audit Entries: ${stats.totalEntries}
  By Category: ${JSON.stringify(stats.byCategory)}
  By Severity: ${JSON.stringify(stats.bySeverity)}
  Failure Rate: ${stats.failureRate.toFixed(2)}%
  Top Users: ${stats.topUsers.map(u => `${u.userId} (${u.count} actions)`).join(', ')}
`);

// Export as CSV
const csv = await auditService.export({
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-12-31'),
  categories: ['SECURITY'],
});

fs.writeFileSync('audit-export.csv', csv);
```

### Analytics & Search

#### Advanced Filtering

```typescript
// Search for specific events
const results = await auditService.query({
  // Time range
  startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
  endDate: new Date(),

  // Filter by action
  actions: ['SECURITY_SSO_LOGIN', 'CREDENTIAL_ACCESSED'],

  // Filter by category
  categories: ['SECURITY', 'COMPLIANCE'],

  // Filter by severity
  severities: ['ERROR', 'CRITICAL', 'WARNING'],

  // Filter by users
  userIds: ['user123', 'user456'],

  // Filter by resources
  resourceTypes: ['workflow', 'credential'],
  resourceIds: ['wf_123', 'cred_456'],

  // Search text
  searchText: 'failed authentication',

  // Success/failure
  success: false,

  // Pagination
  offset: 0,
  limit: 100,
});

// Find potential security incidents
const securityEvents = results.entries.filter(e => e.severity === 'CRITICAL');
const failedAttempts = results.entries.filter(e => !e.success);
```

### Investigation & Troubleshooting

#### User Activity Timeline

```typescript
// Get all activities for a specific user
const userActivity = await auditService.query({
  userIds: ['user123'],
  startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  limit: 1000,
});

// Analyze activity pattern
userActivity.entries.forEach(entry => {
  console.log(`${entry.timestamp} - ${entry.action} on ${entry.resourceType}:${entry.resourceId}`);
});
```

#### Workflow Execution Audit

```typescript
// Trace all events related to a specific workflow execution
const workflowAudit = await auditService.query({
  resourceIds: ['execution_xyz'],
  resourceTypes: ['workflow_execution'],
});

console.log('Execution Timeline:');
workflowAudit.entries.forEach(entry => {
  console.log(`- ${entry.timestamp}: ${entry.action} (${entry.severity})`);
  if (entry.errorMessage) console.log(`  Error: ${entry.errorMessage}`);
});
```

---

## Integration Examples

### Okta SSO Integration

**Step 1: Configure Okta Application**

In Okta admin console:
1. Create new OIDC application
2. Grant OpenID, profile, email scopes
3. Set redirect URI: `https://your-app.com/api/oauth/okta/callback`
4. Copy Client ID and Client Secret

**Step 2: Configure Application**

```typescript
import { initializeEnterpriseSSOIntegration } from './src/security/enterprise/EnterpriseSSOIntegration';
import { IdentityProvider, SSOProtocol } from './src/security/enterprise/EnterpriseSSOIntegration';

const sso = await initializeEnterpriseSSOIntegration([
  {
    provider: IdentityProvider.OKTA,
    name: 'Okta',
    enabled: true,
    protocol: {
      protocol: SSOProtocol.OIDC,
      clientId: process.env.OKTA_CLIENT_ID!,
      clientSecret: process.env.OKTA_CLIENT_SECRET!,
      discoveryUrl: `${process.env.OKTA_DOMAIN}/.well-known/openid-configuration`,
      authorizationUrl: `${process.env.OKTA_DOMAIN}/oauth2/v1/authorize`,
      tokenUrl: `${process.env.OKTA_DOMAIN}/oauth2/v1/token`,
      userInfoUrl: `${process.env.OKTA_DOMAIN}/oauth2/v1/userinfo`,
      scopes: ['openid', 'profile', 'email'],
    },
    attributeMappings: [
      { idpAttribute: 'email', localAttribute: 'email', required: true },
      { idpAttribute: 'given_name', localAttribute: 'firstName' },
      { idpAttribute: 'family_name', localAttribute: 'lastName' },
      { idpAttribute: 'name', localAttribute: 'displayName' },
    ],
    groupRoleMappings: [
      { idpGroup: 'okta_admin', localRole: 'admin', permissions: ['admin:*'] },
      { idpGroup: 'okta_developer', localRole: 'developer', permissions: ['workflow:*'] },
      { idpGroup: 'okta_user', localRole: 'user', permissions: ['workflow:read', 'workflow:execute'] },
    ],
    jitProvisioning: {
      enabled: true,
      defaultRole: 'user',
      emailVerificationRequired: false,
    },
    directorySyncConfig: {
      enabled: true,
      syncIntervalMs: 24 * 60 * 60 * 1000,
      batchSize: 100,
    },
  },
]);

// Listen for authentication events
sso.on('user-authenticated', ({ provider, user }) => {
  console.log(`User ${user.email} authenticated via ${provider}`);
  // Sync user to local database
});
```

**Step 3: Create Login Endpoint**

```typescript
app.post('/api/auth/login/okta', async (req, res) => {
  const { code, state } = req.query;

  try {
    const user = await sso.authenticateOIDC(
      IdentityProvider.OKTA,
      code as string,
      state as string
    );

    // Create session
    res.cookie('sessionId', user.sessionId, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        roles: user.roles,
      },
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: error instanceof Error ? error.message : 'Authentication failed',
    });
  }
});
```

### Azure AD Integration

**Step 1: Register Application in Azure**

1. Go to Azure Portal > App registrations
2. New registration (name: "Workflow Automation")
3. Set redirect URI: `https://your-app.com/api/oauth/azure/callback`
4. Create client secret
5. Grant API permissions (User.Read, Directory.Read.All)

**Step 2: Configure**

```typescript
const azureConfig = {
  provider: IdentityProvider.AZURE_AD,
  name: 'Azure AD',
  enabled: true,
  protocol: {
    protocol: SSOProtocol.OIDC,
    clientId: process.env.AZURE_CLIENT_ID!,
    clientSecret: process.env.AZURE_CLIENT_SECRET!,
    authorizationUrl: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/authorize`,
    tokenUrl: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`,
    userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
    scopes: ['openid', 'profile', 'email', 'Directory.Read.All'],
  },
  groupRoleMappings: [
    // Azure AD group ObjectId to local role mapping
    { idpGroup: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', localRole: 'admin' },
  ],
  directorySyncConfig: {
    enabled: true,
    syncIntervalMs: 12 * 60 * 60 * 1000, // Every 12 hours
  },
};

const sso = await initializeEnterpriseSSOIntegration([azureConfig]);
```

### Full Enterprise Flow

Complete example with SSO, API Gateway, and Audit:

```typescript
import express from 'express';
import { initializeEnterpriseSSOIntegration } from './src/security/enterprise/EnterpriseSSOIntegration';
import { EnterpriseAPIGateway } from './src/security/enterprise/EnterpriseAPIGateway';
import { getAuditService, initializeAuditService } from './src/backend/audit/AuditService';

const app = express();

// Initialize services
const sso = await initializeEnterpriseSSOIntegration([{ /* config */ }]);
const gateway = new EnterpriseAPIGateway();
const audit = initializeAuditService();

// SSO Login endpoint
app.post('/api/auth/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    const user = await sso.authenticateOIDC(IdentityProvider.OKTA, code, state);

    // Audit successful login
    await audit.log({
      action: AuditAction.SECURITY_SSO_LOGIN,
      category: AuditCategory.SECURITY,
      severity: AuditSeverity.INFO,
      userId: user.id,
      userEmail: user.email,
      resourceType: 'user',
      resourceId: user.id,
      success: true,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ user });
  } catch (error) {
    // Audit failed login
    await audit.log({
      action: AuditAction.SECURITY_SSO_LOGIN,
      category: AuditCategory.SECURITY,
      severity: AuditSeverity.ERROR,
      userId: 'unknown',
      resourceType: 'user',
      resourceId: 'unknown',
      success: false,
      errorMessage: String(error),
      ipAddress: req.ip,
    });

    res.status(401).json({ error: String(error) });
  }
});

// API Gateway middleware
app.use('/api/v1', (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  // Check rate limit
  const allowed = gateway.checkRateLimit(apiKey as string, 'workflow-api-v1');
  if (!allowed) {
    return res.status(429).json({ error: 'Rate limit exceeded' });
  }

  next();
});

// Protected workflow endpoint
app.post('/api/v1/workflows', async (req, res) => {
  const sessionId = req.cookies.sessionId;
  const user = sso.getSession(sessionId);

  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    // Create workflow
    const workflow = await createWorkflow(req.body, user.id);

    // Audit workflow creation
    await audit.log({
      action: AuditAction.WORKFLOW_CREATED,
      category: AuditCategory.WORKFLOW,
      severity: AuditSeverity.INFO,
      userId: user.id,
      userEmail: user.email,
      resourceType: 'workflow',
      resourceId: workflow.id,
      resourceName: workflow.name,
      success: true,
    });

    res.json(workflow);
  } catch (error) {
    await audit.log({
      action: AuditAction.WORKFLOW_CREATED,
      category: AuditCategory.WORKFLOW,
      severity: AuditSeverity.ERROR,
      userId: user.id,
      resourceType: 'workflow',
      resourceId: 'unknown',
      success: false,
      errorMessage: String(error),
    });

    res.status(500).json({ error: String(error) });
  }
});

// Audit logs endpoint
app.get('/api/admin/audit/logs', async (req, res) => {
  const { startDate, endDate, action, category } = req.query;

  const logs = await audit.query({
    startDate: startDate ? new Date(startDate as string) : undefined,
    endDate: endDate ? new Date(endDate as string) : undefined,
    actions: action ? [action as AuditAction] : undefined,
    categories: category ? [category as AuditCategory] : undefined,
  });

  res.json(logs);
});

app.listen(3000, () => {
  console.log('Enterprise application running on :3000');
});
```

---

## Best Practices

### SSO Security

1. **Always use HTTPS**: SSO tokens must be transmitted over encrypted connections
2. **Implement PKCE**: Use PKCE with OAuth2 for enhanced security
3. **Verify IdP Certificates**: Validate SAML IdP certificates and OIDC JWT signatures
4. **Implement MFA**: Require multi-factor authentication for sensitive operations
5. **Short Token Expiry**: Set appropriate token expiration times (15-60 minutes)
6. **Refresh Token Rotation**: Rotate refresh tokens on use
7. **Session Timeout**: Implement idle session timeouts (15-30 minutes)
8. **Monitor Failed Attempts**: Alert on multiple failed authentication attempts
9. **Audit All SSO Events**: Log all login, logout, and MFA events
10. **Test Connection**: Verify IdP connectivity on startup

### API Governance

1. **Version Your APIs**: Use semantic versioning (v1, v2, v3)
2. **Deprecation Path**: Provide 6-12 month deprecation periods
3. **Rate Limiting**: Protect APIs from abuse with progressive rate limits
4. **Circuit Breakers**: Prevent cascading failures with circuit breakers
5. **Request Validation**: Validate all inputs before processing
6. **Response Consistency**: Standardize error responses
7. **Documentation**: Keep OpenAPI documentation up-to-date
8. **Monitor Usage**: Track API usage patterns and quota violations
9. **API Keys Rotation**: Require periodic API key rotation
10. **IP Whitelisting**: Use IP whitelist for sensitive operations

### Audit Compliance

1. **Log All Changes**: Audit all configuration and data changes
2. **Immutable Logs**: Ensure audit logs cannot be deleted or modified
3. **Long Retention**: Retain logs for 7+ years for compliance
4. **Regular Reviews**: Schedule regular audit log reviews
5. **Alert on Anomalies**: Set up alerts for suspicious activities
6. **Compliance Reports**: Generate compliance reports regularly
7. **User Access Reviews**: Regularly review who has what access
8. **Segregation of Duties**: Ensure different users perform authorization
9. **Exception Handling**: Document and review exceptions to policies
10. **Third-party Audits**: Facilitate external audits with comprehensive logs

---

## API Reference

### SSOService

```typescript
interface SSOConfig {
  enabled: boolean;
  provider: 'saml' | 'ldap' | 'oauth2';
  saml?: SAMLConfig;
}

class SSOService {
  constructor(config: SSOConfig)
  initialize(): void
  isEnabled(): boolean
  getProvider(): string
  updateConfig(newConfig: Partial<SSOConfig>): void
  generateMetadata(): string
}
```

### OAuth2Service

```typescript
class OAuth2Service {
  getAuthorizationUrl(providerName: string, options?: object): Promise<{ url: string; state: string; codeVerifier?: string }>
  exchangeCodeForTokens(providerName: string, code: string, state: string): Promise<OAuth2Tokens>
  refreshAccessToken(providerName: string, refreshToken: string): Promise<OAuth2Tokens>
  revokeToken(providerName: string, token: string): Promise<boolean>
  getUserInfo(providerName: string, accessToken: string): Promise<OAuth2UserInfo>
  needsRefresh(expiresAt: number): boolean
  isProviderConfigured(providerName: string): boolean
  getConfiguredProviders(): Array<{ name: string; displayName: string }>
}
```

### AuditService

```typescript
class AuditService {
  log(params: AuditLogParams): Promise<AuditLogEntry>
  query(filter: AuditLogFilter): Promise<{ entries: AuditLogEntry[]; total: number; hasMore: boolean }>
  getStats(filter: Partial<AuditLogFilter>): Promise<AuditLogStats>
  getById(id: string): Promise<AuditLogEntry | null>
  export(filter: AuditLogFilter): Promise<string>
  cleanup(olderThan: Date): Promise<number>
  count(): Promise<number>
}
```

### EnterpriseAPIGateway

```typescript
class EnterpriseAPIGateway {
  registerAPI(api: APIDefinition): void
  createAPIKey(params: APIKeyParams): APIKey
  validateAPIKey(key: string): boolean
  checkRateLimit(apiKeyId: string, apiId: string): boolean
  getMetrics(apiId: string, options: MetricsOptions): APIMetrics
  getCircuitBreakerStatus(apiId: string, endpoint: string): CircuitBreakerState
  generateOpenAPI(apiId: string): object
}
```

### EnterpriseSSOIntegration

```typescript
class EnterpriseSSOIntegration extends EventEmitter {
  registerProvider(config: SSOProviderConfig): void
  authenticateSAML(provider: IdentityProvider, samlResponse: string, relayState?: string): Promise<SSOUser>
  authenticateOIDC(provider: IdentityProvider, code: string, state: string, codeVerifier?: string): Promise<SSOUser>
  refreshSession(sessionId: string, refreshToken?: string): Promise<SSOTokens>
  verifyMFA(sessionId: string, mfaMethod: MFAType, mfaToken: string): Promise<boolean>
  logout(sessionId: string, provider: IdentityProvider): Promise<void>
  synchronizeDirectory(provider: IdentityProvider): Promise<DirectorySyncResult>
  testConnection(provider: IdentityProvider): Promise<ConnectionTestResult>
  getSession(sessionId: string): SSOUser | undefined
  getAuditLog(limit?: number, userId?: string): SessionAuditEntry[]
  getComplianceReport(startDate: number, endDate: number): object
}
```

---

## Conclusion

This Enterprise Integration Guide provides a complete reference for implementing enterprise-grade SSO, API management, and audit logging in your workflow automation platform. Follow the quick start guide to get up and running in 5 minutes, then dive into specific sections for detailed configuration of your identity providers and API governance policies.

For additional support, refer to the integration examples or consult your identity provider's documentation.

**Document Version**: 1.0
**Last Updated**: November 2025
**Maintained By**: Platform Engineering Team
