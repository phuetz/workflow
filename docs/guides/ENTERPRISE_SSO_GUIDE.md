# Enterprise SSO Guide - Week 25

## Comprehensive Single Sign-On Implementation Guide

This guide covers the enterprise-grade SSO capabilities available in the Workflow Automation Platform, including EnterpriseSSOManager, IdentityFederationHub, and UserProvisioningEngine.

---

## Table of Contents

1. [Overview](#1-overview)
2. [EnterpriseSSOManager Usage](#2-enterprisessomanager-usage)
3. [IdentityFederationHub Usage](#3-identityfederationhub-usage)
4. [UserProvisioningEngine Usage](#4-userprovisioningengine-usage)
5. [Supported Identity Providers](#5-supported-identity-providers)
6. [SAML 2.0 Configuration](#6-saml-20-configuration)
7. [OIDC Configuration](#7-oidc-configuration)
8. [MFA Setup](#8-mfa-setup)
9. [User Provisioning Workflows](#9-user-provisioning-workflows)
10. [HR System Integration](#10-hr-system-integration)
11. [Best Practices](#11-best-practices)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Overview

### 1.1 What is Enterprise SSO?

Enterprise Single Sign-On (SSO) enables users to authenticate once and gain access to multiple applications without re-entering credentials. Our platform provides comprehensive SSO capabilities supporting:

- **SAML 2.0** - Industry standard for enterprise federation
- **OIDC/OAuth 2.0** - Modern token-based authentication
- **LDAP/Active Directory** - Direct directory integration
- **SCIM 2.0** - Automated user provisioning

### 1.2 Architecture Overview

```
+-------------------+     +------------------------+     +-------------------+
|  Identity         |     |  Workflow Platform     |     |  User             |
|  Providers        |     |                        |     |  Applications     |
|  (IdP)            |     |  +------------------+  |     |                   |
|                   |     |  | EnterpriseSSOManager|     |                   |
|  - Okta           |<--->|  +------------------+  |<--->|  - Web App        |
|  - Azure AD       |     |           |            |     |  - Mobile App     |
|  - OneLogin       |     |  +------------------+  |     |  - API Access     |
|  - Auth0          |     |  |IdentityFederationHub|     |                   |
|  - Google         |     |  +------------------+  |     |                   |
|  - PingIdentity   |     |           |            |     |                   |
|  - AWS IAM IC     |     |  +------------------+  |     |                   |
|                   |     |  |UserProvisioningEngine|    |                   |
+-------------------+     +------------------------+     +-------------------+
```

### 1.3 Key Components

| Component | Purpose | Location |
|-----------|---------|----------|
| EnterpriseSSOManager | Core SSO authentication and session management | `src/enterprise/sso/EnterpriseSSOManager.ts` |
| IdentityFederationHub | Cross-domain federation and trust management | `src/enterprise/sso/IdentityFederationHub.ts` |
| UserProvisioningEngine | SCIM 2.0 user lifecycle management | `src/enterprise/sso/UserProvisioningEngine.ts` |
| SSOService | Backend service integration | `src/backend/auth/SSOService.ts` |
| SSO Routes | API endpoints | `src/backend/api/routes/sso.ts` |

---

## 2. EnterpriseSSOManager Usage

The EnterpriseSSOManager is the core component for managing SSO providers, authentication flows, sessions, and MFA.

### 2.1 Initialization

```typescript
import { EnterpriseSSOManager, getEnterpriseSSOManager } from '@/enterprise/sso/EnterpriseSSOManager';

// Get singleton instance
const ssoManager = getEnterpriseSSOManager();

// Or get via static method
const ssoManager = EnterpriseSSOManager.getInstance();
```

### 2.2 IdP Configuration

Configure an identity provider with full settings:

```typescript
import { SSOProviderConfig, IdPType, AuthProtocol } from '@/enterprise/sso/EnterpriseSSOManager';

// Configure Okta as OIDC provider
const oktaConfig: SSOProviderConfig = {
  id: 'okta-prod',
  name: 'Okta Production',
  type: 'okta',
  protocol: 'oidc',
  enabled: true,
  priority: 100,

  // OIDC Configuration
  oidc: {
    issuer: 'https://your-domain.okta.com',
    clientId: process.env.OKTA_CLIENT_ID!,
    clientSecret: process.env.OKTA_CLIENT_SECRET!,
    authorizationUrl: 'https://your-domain.okta.com/oauth2/v1/authorize',
    tokenUrl: 'https://your-domain.okta.com/oauth2/v1/token',
    userInfoUrl: 'https://your-domain.okta.com/oauth2/v1/userinfo',
    jwksUrl: 'https://your-domain.okta.com/oauth2/v1/keys',
    redirectUri: 'https://your-app.com/auth/callback',
    postLogoutRedirectUri: 'https://your-app.com/logout',
    scope: ['openid', 'profile', 'email', 'groups'],
    responseType: 'code',
    codeChallengeMethod: 'S256',
    tokenEndpointAuthMethod: 'client_secret_basic',
  },

  // Attribute Mapping
  attributeMapping: {
    userId: 'sub',
    email: 'email',
    firstName: 'given_name',
    lastName: 'family_name',
    displayName: 'name',
    groups: 'groups',
    department: 'department',
    title: 'title',
  },

  // Role Mapping
  roleMapping: [
    { idpGroup: 'Admins', localRole: 'admin', permissions: ['*'] },
    { idpGroup: 'Developers', localRole: 'developer', permissions: ['read:workflows', 'write:workflows'] },
    { idpGroup: 'Viewers', localRole: 'viewer', permissions: ['read:workflows'] },
    { idpGroup: 'Engineering-*', localRole: 'developer', priority: 1 },
  ],

  // MFA Configuration
  mfa: {
    enabled: true,
    required: true,
    methods: ['totp', 'push', 'hardware_key'],
    rememberDeviceDays: 30,
    stepUpAuthTriggers: ['admin-actions', 'sensitive-data'],
  },

  // Session Configuration
  session: {
    maxDurationMs: 24 * 60 * 60 * 1000, // 24 hours
    idleTimeoutMs: 30 * 60 * 1000,       // 30 minutes
    absoluteTimeoutMs: 72 * 60 * 60 * 1000, // 72 hours
    singleSessionPerUser: false,
    persistSessions: true,
  },

  // JIT Provisioning
  jitProvisioning: {
    enabled: true,
    defaultRole: 'user',
    autoActivate: true,
    syncAttributes: true,
    syncGroups: true,
    deactivateOnRemoval: true,
  },
};

// Register the provider
const result = await ssoManager.configureSSOProvider(oktaConfig);

if (result.success) {
  console.log(`Provider ${result.providerId} configured successfully`);
} else {
  console.error(`Failed to configure provider: ${result.error}`);
}
```

### 2.3 SAML Configuration

Configure a SAML 2.0 provider:

```typescript
const samlConfig: SSOProviderConfig = {
  id: 'onelogin-corp',
  name: 'OneLogin Corporate',
  type: 'onelogin',
  protocol: 'saml2',
  enabled: true,
  priority: 90,

  // SAML 2.0 Configuration
  saml: {
    entityId: 'urn:workflow:saml:sp',
    ssoUrl: 'https://company.onelogin.com/trust/saml2/http-post/sso/123456',
    sloUrl: 'https://company.onelogin.com/trust/saml2/http-redirect/slo/123456',
    certificate: `-----BEGIN CERTIFICATE-----
MIIDpDCCAoygAwIBAgIGAYX...
-----END CERTIFICATE-----`,
    assertionConsumerServiceUrl: 'https://your-app.com/saml/acs',
    signatureAlgorithm: 'sha256',
    digestAlgorithm: 'sha256',
    nameIdFormat: 'emailAddress',
    signAuthnRequest: true,
    wantAssertionsSigned: true,
    wantMessageSigned: true,
    acceptedClockSkewMs: 180000, // 3 minutes
    forceAuthn: false,
  },

  attributeMapping: {
    userId: 'NameID',
    email: 'User.email',
    firstName: 'User.FirstName',
    lastName: 'User.LastName',
    groups: 'memberOf',
  },

  roleMapping: [
    { idpGroup: 'cn=admins,ou=groups,dc=company,dc=com', localRole: 'admin' },
    { idpGroup: 'cn=users,ou=groups,dc=company,dc=com', localRole: 'user' },
  ],
};

await ssoManager.configureSSOProvider(samlConfig);
```

### 2.4 Authentication Flow

Initiate and complete authentication:

```typescript
import { AuthenticationRequest, AuthenticationResult } from '@/enterprise/sso/EnterpriseSSOManager';

// Initiate authentication
const authRequest: AuthenticationRequest = {
  providerId: 'okta-prod',
  returnUrl: '/dashboard',
  prompt: 'login',
  loginHint: 'user@company.com',
};

const initResult = await ssoManager.authenticateUser(authRequest);

if (initResult.success && initResult.redirectUrl) {
  // Redirect user to IdP
  window.location.href = initResult.redirectUrl;
}

// Handle OIDC callback
router.get('/auth/callback', async (req, res) => {
  const { code, state } = req.query;

  const result = await ssoManager.validateOIDCToken(
    code as string,
    state as string
  );

  if (result.success && result.session) {
    // Set session cookie
    res.cookie('session_id', result.session.id, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
    });

    res.redirect(result.session.metadata?.returnUrl || '/dashboard');
  } else if (result.requiresMfa) {
    // Redirect to MFA challenge
    res.redirect(`/mfa?challenge=${result.mfaChallenge?.challengeId}`);
  } else {
    res.redirect(`/login?error=${result.errorCode}`);
  }
});

// Handle SAML callback
router.post('/saml/acs', async (req, res) => {
  const { SAMLResponse, RelayState } = req.body;

  const result = await ssoManager.validateSAMLResponse(SAMLResponse, RelayState);

  if (result.success && result.session) {
    res.cookie('session_id', result.session.id, {
      httpOnly: true,
      secure: true,
    });
    res.redirect('/dashboard');
  } else {
    res.redirect(`/login?error=${result.errorCode}`);
  }
});
```

### 2.5 Session Management

```typescript
// Validate session
const validation = ssoManager.validateSession(sessionId);

if (!validation.valid) {
  console.log(`Session invalid: ${validation.reason}`);
  // Redirect to login
}

// Refresh session
const refreshResult = await ssoManager.refreshSession(sessionId);

if (refreshResult.success) {
  console.log(`Session refreshed, new expiry: ${refreshResult.session?.expiresAt}`);
}

// Get user sessions
const userSessions = ssoManager.getUserSessions(userId);
console.log(`User has ${userSessions.length} active sessions`);

// Single logout
const logoutResult = await ssoManager.initiateLogout({
  sessionId: 'session-123',
  singleLogout: true, // Logout from all sessions and IdP
});

if (logoutResult.logoutUrls && logoutResult.logoutUrls.length > 0) {
  // Redirect to IdP logout
  window.location.href = logoutResult.logoutUrls[0];
}
```

### 2.6 Event Handling

```typescript
// Listen for SSO events
ssoManager.on('provider:configured', ({ providerId, config }) => {
  console.log(`Provider ${providerId} configured`);
});

ssoManager.on('auth:success', ({ user, session, provider }) => {
  console.log(`User ${user.email} logged in via ${provider}`);
  // Send login notification
  // Update last login time
});

ssoManager.on('auth:logout', ({ sessionId, userId }) => {
  console.log(`User ${userId} logged out`);
});

ssoManager.on('session:expired', ({ sessionId, userId }) => {
  console.log(`Session ${sessionId} expired for user ${userId}`);
});

ssoManager.on('user:provisioned', ({ user, provider }) => {
  console.log(`New user ${user.email} provisioned via JIT from ${provider}`);
  // Send welcome email
});

ssoManager.on('audit:log', (entry) => {
  // Forward to audit logging system
  auditLogger.log(entry);
});
```

---

## 3. IdentityFederationHub Usage

The IdentityFederationHub enables cross-domain identity federation, trust management, and identity brokering for B2B partner integration.

### 3.1 Initialization

```typescript
import {
  IdentityFederationHub,
  getIdentityFederationHub,
  initializeIdentityFederationHub,
  FederationHubConfig
} from '@/enterprise/sso/IdentityFederationHub';

// Initialize with custom configuration
const config: FederationHubConfig = {
  hubId: 'workflow-federation-hub',
  hubName: 'Workflow Federation Hub',
  entityId: 'urn:workflow:federation:hub',
  issuer: 'https://workflow.example.com/federation',
  signingKey: process.env.FEDERATION_SIGNING_KEY!,
  signingCertificate: process.env.FEDERATION_SIGNING_CERT!,
  defaultSessionDuration: 3600000, // 1 hour
  maxSessionDuration: 86400000,    // 24 hours
  allowedClockSkew: 300000,        // 5 minutes
  enableTokenExchange: true,
  enableSCIM: true,
  scimEndpoint: '/scim/v2',
  wsFederationEndpoint: '/wsfed',
  samlEndpoint: '/saml',
  oidcEndpoint: '/oidc',
};

const federationHub = await initializeIdentityFederationHub(config);
```

### 3.2 Trust Relationship Management

Create trust relationships between organizations:

```typescript
import {
  OrganizationInfo,
  TrustRelationship,
  TrustType,
  TrustDirection,
  FederationProtocol
} from '@/enterprise/sso/IdentityFederationHub';

// Define organizations
const sourceOrg: OrganizationInfo = {
  id: 'org-1',
  name: 'Acme Corporation',
  domain: 'acme.com',
  entityId: 'urn:acme:identity',
  metadataUrl: 'https://idp.acme.com/.well-known/federation-metadata',
  contacts: [
    { type: 'technical', name: 'John Doe', email: 'john.doe@acme.com' },
    { type: 'administrative', name: 'Jane Smith', email: 'jane.smith@acme.com' },
  ],
  attributes: {
    industry: 'Technology',
    size: 'Enterprise',
  },
};

const targetOrg: OrganizationInfo = {
  id: 'org-2',
  name: 'Partner Inc',
  domain: 'partner.com',
  entityId: 'urn:partner:identity',
  contacts: [
    { type: 'technical', name: 'Bob Wilson', email: 'bob@partner.com' },
  ],
  attributes: {},
};

// Create trust relationship
const trust = await federationHub.createTrustRelationship(
  sourceOrg,
  targetOrg,
  {
    trustType: 'federation',
    trustDirection: 'two-way',
    protocol: 'saml2',
    metadata: {
      entityId: sourceOrg.entityId,
      ssoEndpoint: 'https://idp.acme.com/sso',
      sloEndpoint: 'https://idp.acme.com/slo',
      certificate: `-----BEGIN CERTIFICATE-----...-----END CERTIFICATE-----`,
      algorithms: ['RS256', 'RS384'],
      attributes: {},
    },
    claimsMapping: [
      {
        id: 'map-email',
        name: 'Email',
        sourceClaimType: 'email',
        targetClaimType: 'email',
        transformation: { type: 'passthrough', config: {} },
        required: true,
      },
      {
        id: 'map-groups',
        name: 'Groups',
        sourceClaimType: 'groups',
        targetClaimType: 'roles',
        transformation: {
          type: 'map',
          config: {
            mapping: {
              'partner-admins': 'admin',
              'partner-users': 'user',
            },
          },
        },
        required: false,
      },
    ],
    validityDays: 365,
    autoRenew: true,
    tags: ['partner', 'production'],
  }
);

console.log(`Trust relationship created: ${trust.id}`);

// Activate trust relationship
const activatedTrust = await federationHub.activateTrustRelationship(trust.id);
console.log(`Trust status: ${activatedTrust.status}`);
```

### 3.3 Claims Transformation

Transform claims between identity systems:

```typescript
import {
  FederatedClaims,
  ClaimsMappingRule,
  createDefaultClaimsMapping
} from '@/enterprise/sso/IdentityFederationHub';

// Get default claims mapping
const defaultMapping = createDefaultClaimsMapping();

// Custom claims transformation
const customMapping: ClaimsMappingRule[] = [
  {
    id: 'transform-email-domain',
    name: 'Email Domain Transform',
    sourceClaimType: 'email',
    targetClaimType: 'email',
    transformation: {
      type: 'regex',
      config: {
        pattern: '@oldcompany\\.com$',
        replacement: '@newcompany.com',
      },
    },
    required: true,
  },
  {
    id: 'extract-department',
    name: 'Extract Department from DN',
    sourceClaimType: 'distinguishedName',
    targetClaimType: 'department',
    transformation: {
      type: 'regex',
      config: {
        pattern: 'OU=([^,]+)',
        replacement: '$1',
      },
    },
    required: false,
  },
  {
    id: 'normalize-name',
    name: 'Normalize Display Name',
    sourceClaimType: 'displayName',
    targetClaimType: 'name',
    transformation: {
      type: 'script',
      config: {
        script: 'toLowerCase',
      },
    },
    required: false,
    defaultValue: 'Unknown User',
  },
];

// Transform claims
const sourceClaims: FederatedClaims = {
  subject: 'user123',
  issuer: 'https://idp.partner.com',
  email: 'user@oldcompany.com',
  name: 'JOHN DOE',
  groups: ['partner-admins', 'developers'],
  issuedAt: new Date(),
  attributes: {
    distinguishedName: 'CN=John Doe,OU=Engineering,DC=partner,DC=com',
  },
};

const transformedClaims = await federationHub.transformClaims(sourceClaims, customMapping);
console.log('Transformed claims:', transformedClaims);
```

### 3.4 Identity Linking

Link identities across providers:

```typescript
// Federate an identity
const federatedIdentity = await federationHub.federateIdentity(
  'partner-idp',
  {
    subject: 'partner-user-123',
    issuer: 'https://idp.partner.com',
    email: 'user@partner.com',
    name: 'Partner User',
    groups: ['external-users'],
    issuedAt: new Date(),
    expiresAt: new Date(Date.now() + 3600000),
    attributes: {},
  },
  {
    linkToLocalUser: 'local-user-456', // Optional: link to existing user
    createIfNotExists: true,            // Create local user if not found
  }
);

// Link multiple identities to a single user
await federationHub.linkIdentities('local-user-456', [
  federatedIdentity.id,
  'another-federated-identity-id',
]);

// Unlink an identity
await federationHub.unlinkIdentity('local-user-456', federatedIdentity.id);
```

### 3.5 Token Exchange (RFC 8693)

Exchange tokens between identity systems:

```typescript
import { TokenExchangeRequest, TokenExchangeResponse } from '@/enterprise/sso/IdentityFederationHub';

const exchangeRequest: TokenExchangeRequest = {
  grantType: 'urn:ietf:params:oauth:grant-type:token-exchange',
  subjectToken: 'eyJhbGciOiJSUzI1NiIs...', // Original token
  subjectTokenType: 'urn:ietf:params:oauth:token-type:access_token',
  requestedTokenType: 'urn:ietf:params:oauth:token-type:id_token',
  audience: 'https://api.workflow.com',
  scope: ['read', 'write'],
};

const exchangeResponse: TokenExchangeResponse = await federationHub.exchangeToken(exchangeRequest);

console.log('New token:', exchangeResponse.accessToken);
console.log('Token type:', exchangeResponse.issuedTokenType);
console.log('Expires in:', exchangeResponse.expiresIn);
```

### 3.6 WS-Federation Support

Handle WS-Federation requests:

```typescript
import { WSFederationRequest } from '@/enterprise/sso/IdentityFederationHub';

router.get('/wsfed', async (req, res) => {
  const wsfedRequest: WSFederationRequest = {
    wa: req.query.wa as 'wsignin1.0' | 'wsignout1.0',
    wtrealm: req.query.wtrealm as string,
    wreply: req.query.wreply as string,
    wctx: req.query.wctx as string,
    whr: req.query.whr as string,
  };

  const result = await federationHub.handleWSFederationRequest(wsfedRequest);

  if (result.redirectUrl) {
    res.redirect(result.redirectUrl);
  } else {
    res.send(result.response);
  }
});
```

### 3.7 Federation Metadata

Generate and expose federation metadata:

```typescript
// Get SAML metadata
router.get('/saml/metadata', (req, res) => {
  const metadata = federationHub.getFederationMetadata('saml2');
  res.type('application/xml').send(metadata);
});

// Get OIDC discovery document
router.get('/.well-known/openid-configuration', (req, res) => {
  const discovery = federationHub.getFederationMetadata('oidc');
  res.type('application/json').send(discovery);
});

// Get WS-Federation metadata
router.get('/federationmetadata/2007-06/federationmetadata.xml', (req, res) => {
  const metadata = federationHub.getFederationMetadata('ws-federation');
  res.type('application/xml').send(metadata);
});
```

---

## 4. UserProvisioningEngine Usage

The UserProvisioningEngine provides SCIM 2.0 compliant user provisioning with automated lifecycle management.

### 4.1 Initialization

```typescript
import {
  UserProvisioningEngine,
  ProvisioningConfig
} from '@/enterprise/sso/UserProvisioningEngine';

const provisioningConfig: ProvisioningConfig = {
  enabled: true,
  mode: 'push', // 'push' | 'pull' | 'bidirectional'

  // SCIM settings
  scimEndpoint: 'https://your-app.com/scim/v2',
  scimToken: process.env.SCIM_TOKEN,
  scimVersion: '2.0',

  // Sync settings
  syncInterval: 3600000,   // 1 hour
  batchSize: 100,
  maxRetries: 3,
  retryDelay: 5000,

  // Lifecycle settings
  autoProvision: true,
  autoDeprovision: true,
  deprovisionDelay: 30,    // Days before hard delete
  suspendBeforeDelete: true,

  // Data retention
  retainUserData: true,
  dataRetentionDays: 90,
  archiveOnDelete: true,

  // Conflict resolution
  conflictResolution: 'source_wins', // 'source_wins' | 'target_wins' | 'newest_wins' | 'manual'

  // Attribute mapping
  attributeMappings: [
    { source: 'userName', target: 'username', required: true },
    { source: 'emails[0].value', target: 'email', required: true },
    { source: 'name.givenName', target: 'firstName' },
    { source: 'name.familyName', target: 'lastName' },
    { source: 'displayName', target: 'displayName' },
    { source: 'title', target: 'title' },
    {
      source: 'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User.department',
      target: 'department',
    },
    {
      source: 'active',
      target: 'status',
      transform: (v) => v ? 'active' : 'inactive',
    },
  ],

  // Group to role mapping
  groupMappings: {
    'Administrators': 'admin',
    'Developers': 'developer',
    'Users': 'user',
    'Read-Only': 'viewer',
  },

  // HR integrations
  hrIntegrations: [],
};

const provisioningEngine = UserProvisioningEngine.getInstance(provisioningConfig);
```

### 4.2 SCIM User Operations

```typescript
import { SCIMUser } from '@/enterprise/sso/UserProvisioningEngine';

// Provision a user from SCIM
const scimUser: SCIMUser = {
  schemas: [
    'urn:ietf:params:scim:schemas:core:2.0:User',
    'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User',
  ],
  id: 'scim-user-123',
  userName: 'jdoe',
  name: {
    givenName: 'John',
    familyName: 'Doe',
    formatted: 'John Doe',
  },
  displayName: 'John Doe',
  emails: [
    { value: 'john.doe@company.com', type: 'work', primary: true },
  ],
  phoneNumbers: [
    { value: '+1-555-0123', type: 'work' },
  ],
  title: 'Senior Developer',
  active: true,
  groups: [
    { value: 'group-dev', display: 'Developers' },
    { value: 'group-users', display: 'Users' },
  ],
  'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User': {
    employeeNumber: 'EMP-001',
    department: 'Engineering',
    organization: 'Acme Corp',
    manager: {
      value: 'manager-id',
      displayName: 'Jane Manager',
    },
  },
};

const result = await provisioningEngine.provisionUser(scimUser, 'okta-scim');

if (result.success) {
  console.log(`User provisioned: ${result.userId}`);
} else {
  console.error(`Provisioning failed: ${result.error}`);
}
```

### 4.3 User Lifecycle Management

```typescript
// Deprovision user (soft delete)
const deprovisionResult = await provisioningEngine.deprovisionUser(
  'user-123',
  'Employee terminated',
  'hr-system',
  false // hardDelete = false (suspend first)
);

console.log(`User ${deprovisionResult.action}: ${deprovisionResult.details}`);

// Hard delete user
await provisioningEngine.deprovisionUser(
  'user-123',
  'Data retention period expired',
  'system',
  true // hardDelete = true
);

// Get user status
const user = provisioningEngine.getUser('user-123');
console.log(`User status: ${user?.status}`);
```

### 4.4 Group Synchronization

```typescript
import { SCIMGroup } from '@/enterprise/sso/UserProvisioningEngine';

const scimGroups: SCIMGroup[] = [
  {
    schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
    id: 'group-1',
    displayName: 'Administrators',
    members: [
      { value: 'user-1', display: 'Admin User' },
      { value: 'user-2', display: 'Super Admin' },
    ],
  },
  {
    schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
    id: 'group-2',
    displayName: 'Developers',
    members: [
      { value: 'user-3', display: 'Dev 1' },
      { value: 'user-4', display: 'Dev 2' },
    ],
  },
];

const syncResult = await provisioningEngine.syncGroups(scimGroups, 'okta-scim');

console.log(`Groups synced: ${syncResult.created} created, ${syncResult.updated} updated`);
```

### 4.5 Scheduled Synchronization

```typescript
// Start scheduled sync
provisioningEngine.startScheduledSync();

// Run sync manually
const syncResult = await provisioningEngine.runScheduledSync();

console.log(`Sync completed:
  - Processed: ${syncResult.totalProcessed}
  - Created: ${syncResult.created}
  - Updated: ${syncResult.updated}
  - Disabled: ${syncResult.disabled}
  - Errors: ${syncResult.errors}
  - Duration: ${syncResult.duration}ms
`);

// Stop scheduled sync
provisioningEngine.stopScheduledSync();

// Check sync status
const isSyncing = provisioningEngine.isSyncInProgress();
const lastSync = provisioningEngine.getLastSyncResult();
```

### 4.6 Conflict Resolution

```typescript
// Get pending conflicts
const conflicts = provisioningEngine.getPendingConflicts();

for (const conflict of conflicts) {
  console.log(`Conflict for user ${conflict.userId}:`);
  console.log(`  Fields: ${conflict.conflictFields.join(', ')}`);
  console.log(`  Source: ${JSON.stringify(conflict.sourceData)}`);
  console.log(`  Target: ${JSON.stringify(conflict.targetData)}`);

  // Resolve conflict
  const resolved = provisioningEngine.resolveConflict(
    conflict.id,
    'source',       // 'source' | 'target' | 'merged'
    'admin@company.com',
    // Optional merged data for 'merged' resolution
  );
}

// Listen for conflict events
provisioningEngine.on('conflictDetected', (conflict) => {
  // Notify admin
  sendEmail('admin@company.com', `User conflict detected for ${conflict.userId}`);
});
```

### 4.7 Bulk Operations

```typescript
// Export users
const exportOperation = await provisioningEngine.exportUsers(
  'csv',
  (user) => user.status === 'active' // Optional filter
);

if (exportOperation.status === 'completed') {
  // Download export
  const downloadUrl = exportOperation.resultUrl;
}

// Import users
const csvData = `
id,username,email,firstName,lastName,role,status
,jdoe,john.doe@company.com,John,Doe,developer,active
,jsmith,jane.smith@company.com,Jane,Smith,admin,active
`;

const importOperation = await provisioningEngine.importUsers(
  csvData,
  'csv',
  'bulk_import'
);

console.log(`Import completed:
  - Total: ${importOperation.totalRecords}
  - Success: ${importOperation.successRecords}
  - Failed: ${importOperation.failedRecords}
`);

// Check operation status
const operation = provisioningEngine.getBulkOperation(importOperation.id);
```

### 4.8 Audit Trail

```typescript
// Get audit log
const auditEntries = provisioningEngine.getAuditLog(
  {
    userId: 'user-123',
    action: 'create',
    startDate: new Date('2024-01-01'),
    endDate: new Date(),
  },
  100, // limit
  0    // offset
);

for (const entry of auditEntries) {
  console.log(`${entry.timestamp}: ${entry.action} by ${entry.performedBy}`);
  console.log(`  Details: ${JSON.stringify(entry.details)}`);
}

// Listen for audit events
provisioningEngine.on('auditEntry', (entry) => {
  // Forward to centralized logging
  auditLogger.log(entry);
});
```

---

## 5. Supported Identity Providers

The platform supports 7 major enterprise identity providers out of the box:

### 5.1 Okta

```typescript
const oktaConfig: SSOProviderConfig = {
  id: 'okta',
  name: 'Okta',
  type: 'okta',
  protocol: 'oidc',
  enabled: true,
  priority: 100,
  oidc: {
    issuer: 'https://your-domain.okta.com',
    clientId: process.env.OKTA_CLIENT_ID!,
    clientSecret: process.env.OKTA_CLIENT_SECRET!,
    authorizationUrl: 'https://your-domain.okta.com/oauth2/v1/authorize',
    tokenUrl: 'https://your-domain.okta.com/oauth2/v1/token',
    userInfoUrl: 'https://your-domain.okta.com/oauth2/v1/userinfo',
    jwksUrl: 'https://your-domain.okta.com/oauth2/v1/keys',
    redirectUri: `${process.env.APP_URL}/auth/callback`,
    scope: ['openid', 'profile', 'email', 'groups'],
    responseType: 'code',
    tokenEndpointAuthMethod: 'client_secret_basic',
  },
  attributeMapping: {
    userId: 'sub',
    email: 'email',
    firstName: 'given_name',
    lastName: 'family_name',
    groups: 'groups',
  },
  roleMapping: [],
};
```

### 5.2 Azure AD (Microsoft Entra ID)

```typescript
const azureConfig: SSOProviderConfig = {
  id: 'azure-ad',
  name: 'Azure Active Directory',
  type: 'azure_ad',
  protocol: 'oidc',
  enabled: true,
  priority: 100,
  oidc: {
    issuer: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/v2.0`,
    clientId: process.env.AZURE_CLIENT_ID!,
    clientSecret: process.env.AZURE_CLIENT_SECRET!,
    authorizationUrl: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/authorize`,
    tokenUrl: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`,
    userInfoUrl: 'https://graph.microsoft.com/oidc/userinfo',
    jwksUrl: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/discovery/v2.0/keys`,
    redirectUri: `${process.env.APP_URL}/auth/callback`,
    scope: ['openid', 'profile', 'email', 'User.Read', 'GroupMember.Read.All'],
    responseType: 'code',
    tokenEndpointAuthMethod: 'client_secret_post',
  },
  attributeMapping: {
    userId: 'oid',
    email: 'email',
    firstName: 'given_name',
    lastName: 'family_name',
    displayName: 'name',
    groups: 'groups',
  },
  roleMapping: [],
};
```

### 5.3 OneLogin

```typescript
const oneLoginConfig: SSOProviderConfig = {
  id: 'onelogin',
  name: 'OneLogin',
  type: 'onelogin',
  protocol: 'saml2',
  enabled: true,
  priority: 100,
  saml: {
    entityId: process.env.ONELOGIN_ENTITY_ID!,
    ssoUrl: `https://${process.env.ONELOGIN_SUBDOMAIN}.onelogin.com/trust/saml2/http-post/sso/${process.env.ONELOGIN_APP_ID}`,
    sloUrl: `https://${process.env.ONELOGIN_SUBDOMAIN}.onelogin.com/trust/saml2/http-redirect/slo/${process.env.ONELOGIN_APP_ID}`,
    certificate: process.env.ONELOGIN_CERTIFICATE!,
    assertionConsumerServiceUrl: `${process.env.APP_URL}/saml/acs`,
    signatureAlgorithm: 'sha256',
    digestAlgorithm: 'sha256',
    nameIdFormat: 'emailAddress',
    signAuthnRequest: true,
    wantAssertionsSigned: true,
    wantMessageSigned: true,
    acceptedClockSkewMs: 180000,
  },
  attributeMapping: {
    userId: 'NameID',
    email: 'User.email',
    firstName: 'User.FirstName',
    lastName: 'User.LastName',
    groups: 'memberOf',
  },
  roleMapping: [],
};
```

### 5.4 Ping Identity

```typescript
const pingConfig: SSOProviderConfig = {
  id: 'ping-identity',
  name: 'Ping Identity',
  type: 'ping_identity',
  protocol: 'oidc',
  enabled: true,
  priority: 100,
  oidc: {
    issuer: `https://auth.pingone.com/${process.env.PING_ENVIRONMENT_ID}/as`,
    clientId: process.env.PING_CLIENT_ID!,
    clientSecret: process.env.PING_CLIENT_SECRET!,
    authorizationUrl: `https://auth.pingone.com/${process.env.PING_ENVIRONMENT_ID}/as/authorize`,
    tokenUrl: `https://auth.pingone.com/${process.env.PING_ENVIRONMENT_ID}/as/token`,
    userInfoUrl: `https://auth.pingone.com/${process.env.PING_ENVIRONMENT_ID}/as/userinfo`,
    jwksUrl: `https://auth.pingone.com/${process.env.PING_ENVIRONMENT_ID}/as/jwks`,
    redirectUri: `${process.env.APP_URL}/auth/callback`,
    scope: ['openid', 'profile', 'email'],
    responseType: 'code',
    tokenEndpointAuthMethod: 'client_secret_basic',
  },
  attributeMapping: {
    userId: 'sub',
    email: 'email',
    firstName: 'given_name',
    lastName: 'family_name',
  },
  roleMapping: [],
};
```

### 5.5 Auth0

```typescript
const auth0Config: SSOProviderConfig = {
  id: 'auth0',
  name: 'Auth0',
  type: 'auth0',
  protocol: 'oidc',
  enabled: true,
  priority: 100,
  oidc: {
    issuer: `https://${process.env.AUTH0_DOMAIN}/`,
    clientId: process.env.AUTH0_CLIENT_ID!,
    clientSecret: process.env.AUTH0_CLIENT_SECRET!,
    authorizationUrl: `https://${process.env.AUTH0_DOMAIN}/authorize`,
    tokenUrl: `https://${process.env.AUTH0_DOMAIN}/oauth/token`,
    userInfoUrl: `https://${process.env.AUTH0_DOMAIN}/userinfo`,
    jwksUrl: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`,
    redirectUri: `${process.env.APP_URL}/auth/callback`,
    scope: ['openid', 'profile', 'email'],
    responseType: 'code',
    codeChallengeMethod: 'S256', // PKCE enabled
    tokenEndpointAuthMethod: 'client_secret_post',
  },
  attributeMapping: {
    userId: 'sub',
    email: 'email',
    firstName: 'given_name',
    lastName: 'family_name',
    displayName: 'name',
  },
  roleMapping: [],
};
```

### 5.6 Google Workspace

```typescript
const googleConfig: SSOProviderConfig = {
  id: 'google-workspace',
  name: 'Google Workspace',
  type: 'google_workspace',
  protocol: 'oidc',
  enabled: true,
  priority: 100,
  oidc: {
    issuer: 'https://accounts.google.com',
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
    jwksUrl: 'https://www.googleapis.com/oauth2/v3/certs',
    redirectUri: `${process.env.APP_URL}/auth/callback`,
    scope: ['openid', 'profile', 'email'],
    responseType: 'code',
    tokenEndpointAuthMethod: 'client_secret_post',
  },
  attributeMapping: {
    userId: 'sub',
    email: 'email',
    firstName: 'given_name',
    lastName: 'family_name',
    displayName: 'name',
  },
  roleMapping: [],
};
```

### 5.7 AWS IAM Identity Center

```typescript
const awsIamConfig: SSOProviderConfig = {
  id: 'aws-iam-identity-center',
  name: 'AWS IAM Identity Center',
  type: 'aws_iam_identity_center',
  protocol: 'saml2',
  enabled: true,
  priority: 100,
  saml: {
    entityId: process.env.AWS_IAM_ENTITY_ID!,
    ssoUrl: process.env.AWS_IAM_SSO_URL!,
    certificate: process.env.AWS_IAM_CERTIFICATE!,
    assertionConsumerServiceUrl: `${process.env.APP_URL}/saml/acs`,
    signatureAlgorithm: 'sha256',
    digestAlgorithm: 'sha256',
    nameIdFormat: 'emailAddress',
    signAuthnRequest: false,
    wantAssertionsSigned: true,
    wantMessageSigned: false,
    acceptedClockSkewMs: 300000,
  },
  attributeMapping: {
    userId: 'NameID',
    email: 'email',
    firstName: 'firstName',
    lastName: 'lastName',
    groups: 'groups',
  },
  roleMapping: [],
};
```

---

## 6. SAML 2.0 Configuration

### 6.1 Service Provider Metadata

Generate and expose SP metadata for IdP configuration:

```typescript
// Generate SAML SP metadata
router.get('/saml/metadata', (req, res) => {
  const ssoService = getSSOService();
  const metadata = ssoService.generateMetadata();

  res.set('Content-Type', 'application/xml');
  res.send(metadata);
});
```

Example SP Metadata:
```xml
<?xml version="1.0"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
                     entityID="urn:workflow:saml:sp">
  <md:SPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <md:KeyDescriptor use="signing">
      <ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
        <ds:X509Data>
          <ds:X509Certificate>MIIDpDCCAoygAwIBAgIG...</ds:X509Certificate>
        </ds:X509Data>
      </ds:KeyInfo>
    </md:KeyDescriptor>
    <md:SingleLogoutService
        Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
        Location="https://your-app.com/saml/slo" />
    <md:AssertionConsumerService
        Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
        Location="https://your-app.com/saml/acs"
        index="1" />
  </md:SPSSODescriptor>
</md:EntityDescriptor>
```

### 6.2 IdP Metadata Import

```typescript
// Import IdP metadata from URL
async function importIdPMetadata(metadataUrl: string): Promise<void> {
  const response = await fetch(metadataUrl);
  const metadataXml = await response.text();

  // Parse metadata and extract configuration
  const parser = new DOMParser();
  const doc = parser.parseFromString(metadataXml, 'application/xml');

  const entityId = doc.querySelector('EntityDescriptor')?.getAttribute('entityID');
  const ssoUrl = doc.querySelector('SingleSignOnService')?.getAttribute('Location');
  const certificate = doc.querySelector('X509Certificate')?.textContent;

  // Configure provider with extracted metadata
  await ssoManager.configureSSOProvider({
    id: 'imported-idp',
    name: 'Imported IdP',
    type: 'custom' as IdPType,
    protocol: 'saml2',
    enabled: true,
    priority: 100,
    saml: {
      entityId: entityId!,
      ssoUrl: ssoUrl!,
      certificate: certificate!,
      // ... other settings
    },
    attributeMapping: {
      userId: 'NameID',
      email: 'email',
    },
    roleMapping: [],
  });
}
```

### 6.3 SAML Attribute Mapping

```typescript
// Common SAML attribute names by IdP
const samlAttributeNames = {
  // Standard SAML attributes
  standard: {
    email: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
    firstName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname',
    lastName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname',
    displayName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name',
    groups: 'http://schemas.microsoft.com/ws/2008/06/identity/claims/groups',
  },

  // Okta-specific
  okta: {
    email: 'email',
    firstName: 'firstName',
    lastName: 'lastName',
    groups: 'groups',
  },

  // Azure AD-specific
  azure: {
    email: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
    firstName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname',
    lastName: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname',
    upn: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/upn',
    groups: 'http://schemas.microsoft.com/ws/2008/06/identity/claims/groups',
  },
};
```

---

## 7. OIDC Configuration

### 7.1 Discovery Document

The platform supports automatic OIDC discovery:

```typescript
// Auto-discover OIDC configuration
async function discoverOIDCProvider(issuerUrl: string): Promise<SSOProviderConfig> {
  const discoveryUrl = `${issuerUrl}/.well-known/openid-configuration`;
  const response = await fetch(discoveryUrl);
  const discovery = await response.json();

  return {
    id: 'discovered-oidc',
    name: 'Discovered OIDC Provider',
    type: 'custom' as IdPType,
    protocol: 'oidc',
    enabled: true,
    priority: 100,
    oidc: {
      issuer: discovery.issuer,
      clientId: process.env.OIDC_CLIENT_ID!,
      clientSecret: process.env.OIDC_CLIENT_SECRET!,
      authorizationUrl: discovery.authorization_endpoint,
      tokenUrl: discovery.token_endpoint,
      userInfoUrl: discovery.userinfo_endpoint,
      jwksUrl: discovery.jwks_uri,
      redirectUri: `${process.env.APP_URL}/auth/callback`,
      scope: discovery.scopes_supported.slice(0, 5), // Take first 5 scopes
      responseType: 'code',
      tokenEndpointAuthMethod: discovery.token_endpoint_auth_methods_supported?.[0] || 'client_secret_basic',
    },
    attributeMapping: {
      userId: 'sub',
      email: 'email',
    },
    roleMapping: [],
  };
}
```

### 7.2 PKCE Support

```typescript
// Enable PKCE for enhanced security
const oidcConfig: SSOProviderConfig['oidc'] = {
  // ... other settings
  codeChallengeMethod: 'S256', // Enable PKCE
  responseType: 'code',
};

// PKCE is automatically handled in the authentication flow
const authResult = await ssoManager.authenticateUser({
  providerId: 'auth0',
  // PKCE code_verifier and code_challenge are auto-generated
});
```

### 7.3 Token Validation

```typescript
// Validate ID token claims
function validateIdTokenClaims(claims: OIDCClaims, expectedAudience: string): boolean {
  // Check issuer
  if (!claims.iss) {
    throw new Error('Missing issuer claim');
  }

  // Check audience
  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!audiences.includes(expectedAudience)) {
    throw new Error('Invalid audience');
  }

  // Check expiration
  if (claims.exp && claims.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Token expired');
  }

  // Check not before
  if (claims.nbf && claims.nbf > Math.floor(Date.now() / 1000)) {
    throw new Error('Token not yet valid');
  }

  return true;
}
```

---

## 8. MFA Setup

### 8.1 MFA Configuration

```typescript
// Configure MFA for a provider
const mfaConfig: SSOProviderConfig['mfa'] = {
  enabled: true,
  required: true,
  methods: ['totp', 'push', 'sms', 'hardware_key'],
  rememberDeviceDays: 30,
  stepUpAuthTriggers: [
    'admin-actions',
    'sensitive-data-access',
    'workflow-deletion',
    'credential-management',
  ],
};

// Add MFA to provider config
providerConfig.mfa = mfaConfig;
await ssoManager.configureSSOProvider(providerConfig);
```

### 8.2 MFA Challenge Flow

```typescript
// Handle MFA challenge
router.post('/mfa/verify', async (req, res) => {
  const { challengeId, method, code } = req.body;

  const result = await ssoManager.completeMFAChallenge(
    challengeId,
    method as MFAMethod,
    code
  );

  if (result.success && result.session) {
    res.cookie('session_id', result.session.id, {
      httpOnly: true,
      secure: true,
    });
    res.json({ success: true, redirectUrl: '/dashboard' });
  } else {
    res.status(401).json({
      success: false,
      error: result.error,
      errorCode: result.errorCode,
    });
  }
});

// Request new MFA challenge
router.post('/mfa/resend', async (req, res) => {
  const { userId, method } = req.body;

  // Implementation would trigger a new MFA code via the chosen method
  // This integrates with your MFA service (Twilio, Duo, etc.)
});
```

### 8.3 Step-Up Authentication

```typescript
// Middleware for step-up authentication
async function requireStepUpAuth(req: Request, res: Response, next: NextFunction) {
  const session = await ssoManager.getSession(req.cookies.session_id);

  if (!session) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const provider = ssoManager.getProvider(session.providerId);

  // Check if action requires step-up auth
  const action = req.path.split('/')[1];
  const requiresStepUp = provider?.mfa?.stepUpAuthTriggers?.includes(action);

  if (requiresStepUp && !session.mfaCompleted) {
    // Initiate MFA challenge
    return res.status(403).json({
      error: 'MFA required',
      mfaRequired: true,
    });
  }

  next();
}
```

---

## 9. User Provisioning Workflows

### 9.1 Just-in-Time (JIT) Provisioning

JIT provisioning automatically creates users on first login:

```typescript
// JIT provisioning is enabled per provider
const providerConfig: SSOProviderConfig = {
  // ... other config
  jitProvisioning: {
    enabled: true,
    defaultRole: 'user',
    autoActivate: true,
    syncAttributes: true,
    syncGroups: true,
    deactivateOnRemoval: true,
  },
};

// Listen for JIT provisioning events
ssoManager.on('user:provisioned', async ({ user, provider }) => {
  // Send welcome email
  await sendWelcomeEmail(user.email, {
    name: user.displayName,
    role: user.roles[0],
    loginUrl: `${process.env.APP_URL}/login`,
  });

  // Create default workspace
  await createDefaultWorkspace(user.id);

  // Assign default workflows
  await assignDefaultWorkflows(user.id);
});
```

### 9.2 SCIM 2.0 Provisioning

```typescript
// SCIM endpoints
router.post('/scim/v2/Users', async (req, res) => {
  const scimUser: SCIMUser = req.body;

  const result = await provisioningEngine.provisionUser(scimUser, 'scim');

  if (result.success) {
    const user = provisioningEngine.getUser(result.userId!);
    res.status(201).json(convertToSCIMUser(user!));
  } else {
    res.status(400).json({
      schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
      detail: result.error,
      status: '400',
    });
  }
});

router.patch('/scim/v2/Users/:id', async (req, res) => {
  const { id } = req.params;
  const operations = req.body.Operations;

  // Apply SCIM patch operations
  for (const op of operations) {
    switch (op.op) {
      case 'replace':
        await provisioningEngine.provisionUser({
          ...getCurrentUser(id),
          [op.path]: op.value,
        }, 'scim');
        break;
      case 'add':
        // Handle add operation
        break;
      case 'remove':
        // Handle remove operation
        break;
    }
  }

  res.json(convertToSCIMUser(provisioningEngine.getUser(id)!));
});

router.delete('/scim/v2/Users/:id', async (req, res) => {
  const { id } = req.params;

  await provisioningEngine.deprovisionUser(id, 'SCIM delete', 'scim', true);

  res.status(204).send();
});
```

### 9.3 Deprovisioning Workflow

```typescript
// Configure deprovisioning workflow
const deprovisioningWorkflow = {
  // Step 1: Suspend account
  suspend: async (userId: string, reason: string) => {
    const result = await provisioningEngine.deprovisionUser(
      userId,
      reason,
      'admin',
      false // Soft delete
    );

    // Revoke all sessions
    await ssoManager.initiateLogout({
      sessionId: '*',
      userId,
      singleLogout: true,
    });

    return result;
  },

  // Step 2: Transfer data (after review period)
  transferData: async (userId: string, newOwnerId: string) => {
    // Transfer workflows
    // Transfer credentials
    // Transfer schedules
  },

  // Step 3: Archive data
  archive: async (userId: string) => {
    const user = provisioningEngine.getUser(userId);
    // Archive user data to cold storage
  },

  // Step 4: Hard delete
  delete: async (userId: string) => {
    await provisioningEngine.deprovisionUser(
      userId,
      'Retention period expired',
      'system',
      true // Hard delete
    );
  },
};
```

---

## 10. HR System Integration

### 10.1 Workday Integration

```typescript
const workdayConfig: HRIntegrationConfig = {
  type: 'workday',
  enabled: true,
  endpoint: 'https://wd5-impl-services1.workday.com/ccx/service/tenant/Human_Resources/v40.0',
  clientId: process.env.WORKDAY_CLIENT_ID!,
  clientSecret: process.env.WORKDAY_CLIENT_SECRET!,
  tenantId: process.env.WORKDAY_TENANT!,
  syncFields: [
    'Worker_ID',
    'Employee_ID',
    'Legal_Name',
    'Email_Address',
    'Primary_Work_Email',
    'Manager',
    'Cost_Center',
    'Organization',
    'Department',
    'Job_Title',
    'Location',
    'Hire_Date',
    'Termination_Date',
  ],
  customHeaders: {
    'Content-Type': 'application/json',
  },
};

// Add to provisioning config
provisioningConfig.hrIntegrations.push(workdayConfig);
```

### 10.2 BambooHR Integration

```typescript
const bambooHRConfig: HRIntegrationConfig = {
  type: 'bamboohr',
  enabled: true,
  endpoint: `https://api.bamboohr.com/api/gateway.php/${process.env.BAMBOOHR_SUBDOMAIN}/v1`,
  apiKey: process.env.BAMBOOHR_API_KEY!,
  syncFields: [
    'id',
    'displayName',
    'firstName',
    'lastName',
    'workEmail',
    'jobTitle',
    'department',
    'division',
    'supervisor',
    'hireDate',
    'terminationDate',
    'status',
  ],
  customHeaders: {
    'Accept': 'application/json',
  },
};
```

### 10.3 SAP SuccessFactors Integration

```typescript
const sapConfig: HRIntegrationConfig = {
  type: 'sap',
  enabled: true,
  endpoint: `https://${process.env.SAP_API_HOST}/odata/v2`,
  clientId: process.env.SAP_CLIENT_ID!,
  clientSecret: process.env.SAP_CLIENT_SECRET!,
  tenantId: process.env.SAP_COMPANY_ID!,
  syncFields: [
    'personIdExternal',
    'personalInfoNav/firstName',
    'personalInfoNav/lastName',
    'emailNav/emailAddress',
    'employmentNav/jobInfoNav/jobTitle',
    'employmentNav/jobInfoNav/department',
    'employmentNav/jobInfoNav/managerId',
    'employmentNav/startDate',
    'employmentNav/endDate',
  ],
};
```

### 10.4 Custom HR Integration

```typescript
const customHRConfig: HRIntegrationConfig = {
  type: 'custom',
  enabled: true,
  endpoint: 'https://hr.company.com/api/employees',
  apiKey: process.env.CUSTOM_HR_API_KEY!,
  syncFields: ['id', 'email', 'name', 'department', 'manager', 'status'],
  customHeaders: {
    'X-API-Key': process.env.CUSTOM_HR_API_KEY!,
    'Accept': 'application/json',
  },
};

// Custom sync implementation
provisioningEngine.on('syncStarted', async ({ source }) => {
  if (source === 'custom') {
    // Custom sync logic
    const response = await fetch(customHRConfig.endpoint, {
      headers: customHRConfig.customHeaders,
    });

    const employees = await response.json();

    for (const employee of employees) {
      await provisioningEngine.provisionUser({
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
        userName: employee.email,
        emails: [{ value: employee.email, primary: true }],
        name: { formatted: employee.name },
        active: employee.status === 'active',
        'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User': {
          department: employee.department,
          manager: { value: employee.manager },
        },
      }, 'custom-hr');
    }
  }
});
```

---

## 11. Best Practices

### 11.1 Security Best Practices

```typescript
// 1. Always use HTTPS
const ssoConfig = {
  oidc: {
    redirectUri: 'https://your-app.com/auth/callback', // Never HTTP
  },
};

// 2. Enable PKCE for public clients
const publicClientConfig = {
  oidc: {
    codeChallengeMethod: 'S256', // Always use S256
  },
};

// 3. Validate all tokens
async function validateToken(token: string, provider: SSOProviderConfig) {
  // Verify signature
  // Check expiration
  // Validate issuer
  // Validate audience
  // Check nonce (for OIDC)
}

// 4. Use secure session configuration
const sessionConfig = {
  maxDurationMs: 8 * 60 * 60 * 1000, // 8 hours max
  idleTimeoutMs: 15 * 60 * 1000,      // 15 minutes idle
  singleSessionPerUser: true,          // For sensitive apps
};

// 5. Implement proper logout
async function secureLogout(sessionId: string) {
  // Revoke session locally
  await ssoManager.initiateLogout({
    sessionId,
    singleLogout: true, // Also logout from IdP
  });

  // Clear all session data
  // Invalidate tokens
}

// 6. Rotate secrets regularly
// Schedule monthly rotation of:
// - OIDC client secrets
// - SAML certificates
// - API keys
```

### 11.2 Performance Best Practices

```typescript
// 1. Cache IdP metadata
const metadataCache = new Map<string, { data: any; expiresAt: Date }>();

async function getCachedMetadata(metadataUrl: string) {
  const cached = metadataCache.get(metadataUrl);
  if (cached && cached.expiresAt > new Date()) {
    return cached.data;
  }

  const response = await fetch(metadataUrl);
  const data = await response.json();

  metadataCache.set(metadataUrl, {
    data,
    expiresAt: new Date(Date.now() + 3600000), // 1 hour
  });

  return data;
}

// 2. Batch user sync operations
const batchConfig: ProvisioningConfig = {
  batchSize: 100,        // Process 100 users at a time
  syncInterval: 3600000, // Every hour, not every minute
};

// 3. Use connection pooling for LDAP
const ldapConfig = {
  poolSize: 10,
  maxIdleTime: 300000,
};

// 4. Implement retry with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(Math.pow(2, i) * 1000);
    }
  }
  throw new Error('Max retries exceeded');
}
```

### 11.3 Monitoring Best Practices

```typescript
// 1. Track authentication metrics
const authMetrics = {
  loginAttempts: new Counter('sso_login_attempts_total'),
  loginSuccess: new Counter('sso_login_success_total'),
  loginFailure: new Counter('sso_login_failure_total'),
  authLatency: new Histogram('sso_auth_latency_seconds'),
  activeSessions: new Gauge('sso_active_sessions'),
};

ssoManager.on('auth:success', ({ provider }) => {
  authMetrics.loginSuccess.inc({ provider });
});

ssoManager.on('auth:failure', ({ provider, error }) => {
  authMetrics.loginFailure.inc({ provider, error });
});

// 2. Set up alerts
const alerts = [
  {
    name: 'high_auth_failure_rate',
    condition: 'rate(sso_login_failure_total[5m]) > 10',
    severity: 'warning',
  },
  {
    name: 'idp_connection_failure',
    condition: 'sso_idp_health == 0',
    severity: 'critical',
  },
];

// 3. Log all authentication events
ssoManager.on('audit:log', (entry) => {
  logger.info('SSO Audit', {
    eventType: entry.eventType,
    userId: entry.userId,
    providerId: entry.providerId,
    success: entry.success,
    timestamp: entry.timestamp,
  });
});
```

---

## 12. Troubleshooting

### 12.1 Common Issues

#### SAML Signature Validation Failed

```typescript
// Problem: SAML signature validation fails
// Solution: Check certificate format and clock skew

// 1. Ensure certificate is in correct format
const certificate = `-----BEGIN CERTIFICATE-----
${process.env.SAML_CERT}
-----END CERTIFICATE-----`;

// 2. Increase clock skew tolerance
const samlConfig = {
  acceptedClockSkewMs: 300000, // 5 minutes
};

// 3. Verify certificate hasn't expired
import { X509Certificate } from 'crypto';
const cert = new X509Certificate(certificate);
console.log('Certificate valid until:', cert.validTo);
```

#### OIDC Token Validation Failed

```typescript
// Problem: OIDC token validation fails
// Solution: Check issuer, audience, and expiration

// 1. Verify issuer matches exactly
const expectedIssuer = 'https://accounts.google.com';
if (claims.iss !== expectedIssuer) {
  console.error('Issuer mismatch:', claims.iss, '!==', expectedIssuer);
}

// 2. Check audience claim
const expectedAudience = process.env.OIDC_CLIENT_ID;
const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
if (!audiences.includes(expectedAudience)) {
  console.error('Audience not found:', audiences);
}

// 3. Verify token hasn't expired
const now = Math.floor(Date.now() / 1000);
if (claims.exp < now) {
  console.error('Token expired:', claims.exp, '<', now);
}
```

#### Session Not Persisting

```typescript
// Problem: User keeps getting logged out
// Solution: Check cookie settings and session configuration

// 1. Verify cookie settings
res.cookie('session_id', sessionId, {
  httpOnly: true,
  secure: true,                    // Must be true in production
  sameSite: 'lax',                 // Or 'strict' for same-site only
  domain: '.your-domain.com',      // If using subdomains
  maxAge: 24 * 60 * 60 * 1000,    // Match session duration
});

// 2. Check session configuration
const sessionConfig = {
  idleTimeoutMs: 30 * 60 * 1000,   // 30 minutes
  absoluteTimeoutMs: 24 * 60 * 60 * 1000, // 24 hours
  persistSessions: true,
};

// 3. Ensure session refresh is working
setInterval(async () => {
  const result = await ssoManager.refreshSession(sessionId);
  if (!result.success) {
    // Session expired, redirect to login
    window.location.href = '/login';
  }
}, 5 * 60 * 1000); // Every 5 minutes
```

### 12.2 Debug Mode

```typescript
// Enable debug logging
process.env.SSO_DEBUG = 'true';

// Listen for all events
const events = [
  'provider:configured',
  'auth:initiated',
  'auth:success',
  'auth:failure',
  'session:created',
  'session:refreshed',
  'session:expired',
  'user:provisioned',
  'audit:log',
];

events.forEach(event => {
  ssoManager.on(event, (data) => {
    console.log(`[SSO Debug] ${event}:`, JSON.stringify(data, null, 2));
  });
});
```

### 12.3 Health Checks

```typescript
// Implement SSO health check endpoint
router.get('/health/sso', async (req, res) => {
  const health = {
    status: 'healthy',
    providers: {} as Record<string, any>,
    timestamp: new Date().toISOString(),
  };

  for (const provider of ssoManager.getEnabledProviders()) {
    try {
      // Check IdP connectivity
      if (provider.protocol === 'oidc' && provider.oidc?.jwksUrl) {
        const response = await fetch(provider.oidc.jwksUrl, { timeout: 5000 });
        health.providers[provider.id] = {
          status: response.ok ? 'healthy' : 'degraded',
          latency: response.headers.get('x-response-time'),
        };
      } else if (provider.protocol === 'saml2' && provider.saml?.ssoUrl) {
        const response = await fetch(provider.saml.ssoUrl, {
          method: 'HEAD',
          timeout: 5000,
        });
        health.providers[provider.id] = {
          status: response.ok || response.status === 405 ? 'healthy' : 'degraded',
        };
      }
    } catch (error) {
      health.status = 'degraded';
      health.providers[provider.id] = {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  res.status(health.status === 'healthy' ? 200 : 503).json(health);
});
```

### 12.4 Error Codes Reference

| Error Code | Description | Solution |
|------------|-------------|----------|
| `PROVIDER_NOT_FOUND` | Provider ID doesn't exist | Verify provider configuration |
| `PROVIDER_DISABLED` | Provider is disabled | Enable provider or use different one |
| `INVALID_STATE` | OAuth state mismatch | Clear cookies and try again |
| `INVALID_SIGNATURE` | SAML signature invalid | Check certificate configuration |
| `ASSERTION_EXPIRED` | SAML assertion expired | Check clock sync between servers |
| `TOKEN_EXPIRED` | OIDC token expired | Request new token or refresh |
| `INVALID_NONCE` | OIDC nonce mismatch | Security issue - investigate |
| `USER_NOT_FOUND` | User doesn't exist | Enable JIT provisioning |
| `MFA_REQUIRED` | MFA challenge needed | Complete MFA verification |
| `SESSION_EXPIRED` | Session timed out | Re-authenticate |
| `CONFLICT_PENDING` | User data conflict | Resolve manually or auto |

---

## Appendix: Environment Variables

```bash
# SSO General
SSO_ENABLED=true
SSO_DEBUG=false

# SAML Configuration
SAML_ENTITY_ID=urn:workflow:saml:sp
SAML_CALLBACK_URL=https://your-app.com/saml/acs
SAML_PRIVATE_KEY=-----BEGIN RSA PRIVATE KEY-----...
SAML_CERTIFICATE=-----BEGIN CERTIFICATE-----...

# OIDC Configuration
OIDC_CLIENT_ID=your-client-id
OIDC_CLIENT_SECRET=your-client-secret
OIDC_REDIRECT_URI=https://your-app.com/auth/callback

# Okta
OKTA_DOMAIN=your-domain.okta.com
OKTA_CLIENT_ID=xxx
OKTA_CLIENT_SECRET=xxx

# Azure AD
AZURE_TENANT_ID=xxx
AZURE_CLIENT_ID=xxx
AZURE_CLIENT_SECRET=xxx

# Auth0
AUTH0_DOMAIN=your-domain.auth0.com
AUTH0_CLIENT_ID=xxx
AUTH0_CLIENT_SECRET=xxx

# Google Workspace
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx

# OneLogin
ONELOGIN_SUBDOMAIN=your-company
ONELOGIN_APP_ID=xxx
ONELOGIN_CERTIFICATE=-----BEGIN CERTIFICATE-----...

# Ping Identity
PING_ENVIRONMENT_ID=xxx
PING_CLIENT_ID=xxx
PING_CLIENT_SECRET=xxx

# AWS IAM Identity Center
AWS_IAM_ENTITY_ID=urn:amazon:webservices
AWS_IAM_SSO_URL=https://xxx.awsapps.com/start
AWS_IAM_CERTIFICATE=-----BEGIN CERTIFICATE-----...

# Federation Hub
FEDERATION_ENTITY_ID=urn:workflow:federation:hub
FEDERATION_ISSUER=https://workflow.example.com/federation
FEDERATION_SIGNING_KEY=-----BEGIN RSA PRIVATE KEY-----...
FEDERATION_SIGNING_CERT=-----BEGIN CERTIFICATE-----...

# User Provisioning
SCIM_ENDPOINT=https://your-app.com/scim/v2
SCIM_TOKEN=xxx

# HR Integrations
WORKDAY_CLIENT_ID=xxx
WORKDAY_CLIENT_SECRET=xxx
WORKDAY_TENANT=xxx
BAMBOOHR_SUBDOMAIN=your-company
BAMBOOHR_API_KEY=xxx
SAP_API_HOST=api.sap.com
SAP_CLIENT_ID=xxx
SAP_CLIENT_SECRET=xxx
SAP_COMPANY_ID=xxx
```

---

## Related Documentation

- [LDAP Integration Guide](./LDAP_INTEGRATION_GUIDE.md)
- [RBAC Guide](./RBAC_GUIDE.md)
- [API Security Guide](./API_SECURITY_GUIDE.md)
- [Compliance Framework Guide](./COMPLIANCE_FRAMEWORK_GUIDE.md)
- [Password Security Guide](./PASSWORD_SECURITY_GUIDE.md)

---

*Last updated: Week 25 - Enterprise SSO Implementation*
*Version: 1.0.0*
