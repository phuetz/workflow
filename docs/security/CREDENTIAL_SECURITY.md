# Credential Security Documentation

## Overview

This document describes the comprehensive credential encryption and OAuth2 security implementation for the Workflow Automation Platform. All credentials are encrypted using AES-256-GCM encryption and stored securely.

## Table of Contents

1. [Encryption Architecture](#encryption-architecture)
2. [OAuth2 Implementation](#oauth2-implementation)
3. [Credential Management](#credential-management)
4. [External Secrets Integration](#external-secrets-integration)
5. [Migration Guide](#migration-guide)
6. [Security Best Practices](#security-best-practices)
7. [API Reference](#api-reference)

## Encryption Architecture

### AES-256-GCM Encryption

All credentials are encrypted using AES-256-GCM (Galois/Counter Mode) which provides:

- **Confidentiality**: Data is encrypted with AES-256
- **Integrity**: Built-in authentication tag prevents tampering
- **Performance**: Hardware-accelerated on modern CPUs

### Key Management

#### Master Key

- Derived from `ENCRYPTION_MASTER_KEY` environment variable
- Uses PBKDF2 with 100,000 iterations and SHA-512
- Never stored in plain text
- Rotated regularly (recommended: every 90 days)

#### Encryption Keys

- Generated from master key using key derivation
- Versioned to support key rotation
- Old keys retained to decrypt legacy data
- Automatic cleanup of expired keys

### Encrypted Data Format

```typescript
{
  ciphertext: string,      // Base64-encoded encrypted data
  iv: string,              // Base64-encoded initialization vector (16 bytes)
  authTag: string,         // Base64-encoded authentication tag (16 bytes)
  salt: string,            // Base64-encoded salt (32 bytes)
  keyVersion: number,      // Encryption key version
  algorithm: "aes-256-gcm" // Encryption algorithm
}
```

## OAuth2 Implementation

### Supported Providers

- **Google** (Gmail, Drive, Sheets, Calendar)
- **Microsoft** (Outlook, OneDrive, Teams)
- **GitHub** (Repositories, Actions)
- **Slack** (Channels, Messages)
- **Salesforce** (CRM, API)

### OAuth2 Flow

```
1. User clicks "Connect {Provider}"
2. Frontend redirects to /api/oauth/{provider}/authorize
3. Backend generates authorization URL with state parameter
4. User redirected to provider's consent screen
5. User authorizes application
6. Provider redirects to /api/oauth/{provider}/callback?code=XXX&state=YYY
7. Backend validates state (CSRF protection)
8. Backend exchanges code for tokens
9. Tokens encrypted using AES-256-GCM
10. Encrypted tokens stored in database
11. User redirected back to credentials page
```

### PKCE Support

Proof Key for Code Exchange (PKCE) is supported for enhanced security:

```typescript
// Generate code verifier
const codeVerifier = crypto.randomBytes(32).toString('base64url');

// Generate code challenge
const codeChallenge = crypto
  .createHash('sha256')
  .update(codeVerifier)
  .digest('base64url');

// Send challenge in authorization request
// Send verifier in token request
```

### Token Refresh

Tokens are automatically refreshed when:
- Token expires in < 5 minutes
- API request returns 401 Unauthorized
- Manual refresh requested

```typescript
// Auto-refresh example
if (oauth2Service.needsRefresh(tokens.expiresAt)) {
  const newTokens = await oauth2Service.refreshAccessToken(
    provider,
    tokens.refreshToken
  );
  await saveEncryptedTokens(newTokens);
}
```

## Credential Management

### Credential Types

#### API Key
```typescript
{
  type: 'apiKey',
  data: {
    apiKey: string,
    headerName?: string
  }
}
```

#### Basic Authentication
```typescript
{
  type: 'basic',
  data: {
    username: string,
    password: string
  }
}
```

#### OAuth2
```typescript
{
  type: 'oauth2',
  data: {
    clientId: string,
    clientSecret: string,
    accessToken: string,
    refreshToken?: string,
    expiresAt: number,
    scope: string
  }
}
```

#### Database
```typescript
{
  type: 'database',
  data: {
    host: string,
    port: number,
    database: string,
    username: string,
    password: string
  }
}
```

### Permissions

Credentials support three permission levels:

1. **Read**: View credential name and metadata (not sensitive data)
2. **Use**: Use credential in workflows
3. **Edit**: Modify credential data

```typescript
// Share credential
await credentialService.shareCredential(
  credentialId,
  ownerId,
  targetUserId,
  'use' // Permission level
);

// Revoke access
await credentialService.revokeShare(
  credentialId,
  ownerId,
  targetUserId
);
```

### Audit Logging

All credential operations are logged:

- Created
- Updated
- Accessed
- Shared
- Revoked
- Deleted

```typescript
// View audit log
const auditLog = credentialService.getAuditLog(credentialId, userId);

// Example log entry
{
  action: 'accessed',
  userId: 'user-123',
  timestamp: '2025-01-15T10:30:00Z',
  details: 'Used in workflow execution'
}
```

## External Secrets Integration

### Supported Providers

#### AWS Secrets Manager

```typescript
const secretsManager = createSecretsManager({
  provider: 'aws',
  config: {
    region: 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// Get secret
const secret = await secretsManager.getSecret('database-password');

// Set secret
await secretsManager.setSecret('api-key', 'sk_xxx', {
  description: 'Production API key'
});
```

#### HashiCorp Vault

```typescript
const secretsManager = createSecretsManager({
  provider: 'vault',
  config: {
    address: 'https://vault.example.com',
    token: process.env.VAULT_TOKEN,
    namespace: 'production',
    mountPath: 'secret'
  }
});

// Get secret
const secret = await secretsManager.getSecret('credentials/database');
```

#### Azure Key Vault

```typescript
const secretsManager = createSecretsManager({
  provider: 'azure',
  config: {
    vaultUrl: 'https://myvault.vault.azure.net',
    tenantId: process.env.AZURE_TENANT_ID,
    clientId: process.env.AZURE_CLIENT_ID,
    clientSecret: process.env.AZURE_CLIENT_SECRET
  }
});

// Get secret
const secret = await secretsManager.getSecret('app-secret');
```

### Secret Sync

Synchronize secrets between providers:

```typescript
const source = createSecretsManager({ provider: 'aws', config: awsConfig });
const target = createSecretsManager({ provider: 'vault', config: vaultConfig });

const result = await source.syncSecrets(target, ['api-key', 'database-password']);

console.log(`Synced: ${result.synced}, Failed: ${result.failed}`);
```

## Migration Guide

### Prerequisites

1. Set `ENCRYPTION_MASTER_KEY` in environment variables
```bash
ENCRYPTION_MASTER_KEY=your-secure-256-bit-key-here
```

2. Backup existing credentials
```bash
npm run migrate:credentials -- --backup-only
```

### Migration Steps

#### 1. Dry Run
Test migration without making changes:

```bash
npm run migrate:credentials -- --dry-run
```

#### 2. Execute Migration
Migrate all credentials:

```bash
npm run migrate:credentials
```

#### 3. Verify Migration
Check migration report:

```bash
cat backup/migration-report-{timestamp}.json
```

### Rollback

If migration fails, rollback using the backup:

```typescript
import { CredentialMigrator } from './scripts/migrate-credentials';

const migrator = new CredentialMigrator();
await migrator.rollback('backup/credentials-backup-{timestamp}.json');
```

## Security Best Practices

### 1. Environment Variables

**DO:**
- Store `ENCRYPTION_MASTER_KEY` in environment variables
- Use different keys for each environment
- Rotate keys regularly (every 90 days)

**DON'T:**
- Commit keys to version control
- Share keys in Slack/email
- Use the same key across environments

### 2. Access Control

```typescript
// ✅ Good: Principle of least privilege
await credentialService.shareCredential(
  credentialId,
  ownerId,
  userId,
  'use' // Only grant necessary permission
);

// ❌ Bad: Over-privileging
await credentialService.shareCredential(
  credentialId,
  ownerId,
  userId,
  'edit' // Too much access
);
```

### 3. Token Management

```typescript
// ✅ Good: Check expiration before use
if (oauth2Service.needsRefresh(tokens.expiresAt)) {
  tokens = await oauth2Service.refreshAccessToken(provider, tokens.refreshToken);
}

// ❌ Bad: Assume token is valid
await makeApiCall(tokens.accessToken);
```

### 4. Audit Logs

```typescript
// ✅ Good: Monitor credential access
const logs = credentialService.getAuditLog(credentialId, userId);
const recentAccess = logs.filter(
  log => log.timestamp > Date.now() - 24 * 60 * 60 * 1000
);

// Alert if suspicious activity
if (recentAccess.length > 100) {
  sendAlert('Unusual credential access pattern detected');
}
```

### 5. Secret Rotation

```typescript
// ✅ Good: Regular rotation
const rotationPolicy = {
  enabled: true,
  intervalDays: 90,
  lastRotated: new Date().toISOString()
};

await credentialService.createCredential(userId, {
  type: 'apiKey',
  name: 'Production API',
  data: { apiKey: 'xxx' },
  metadata: { rotationPolicy }
});
```

## API Reference

### Encryption Service

#### `encryptCredential(credential)`
Encrypt credential data.

**Parameters:**
- `credential.type`: Credential type
- `credential.name`: Credential name
- `credential.data`: Credential data object
- `credential.metadata`: Optional metadata

**Returns:** `EncryptedData & { credentialId: string }`

#### `decryptCredential(encryptedData)`
Decrypt credential data.

**Parameters:**
- `encryptedData`: Encrypted data object

**Returns:** Decrypted credential object

### OAuth2 Service

#### `getAuthorizationUrl(provider, options)`
Get OAuth2 authorization URL.

**Parameters:**
- `provider`: Provider name ('google', 'github', etc.)
- `options.scope`: Array of scopes
- `options.state`: Custom state parameter
- `options.usePKCE`: Enable PKCE

**Returns:** `{ url, state, codeVerifier }`

#### `exchangeCodeForTokens(provider, code, state)`
Exchange authorization code for tokens.

**Parameters:**
- `provider`: Provider name
- `code`: Authorization code
- `state`: State parameter from authorization

**Returns:** `OAuth2Tokens`

#### `refreshAccessToken(provider, refreshToken)`
Refresh access token.

**Parameters:**
- `provider`: Provider name
- `refreshToken`: Refresh token

**Returns:** `OAuth2Tokens`

### Credential Service

#### `createCredential(userId, credentialInput)`
Create encrypted credential.

**Parameters:**
- `userId`: Owner user ID
- `credentialInput`: Credential configuration

**Returns:** `Credential`

#### `getCredential(credentialId, userId, decrypt)`
Get credential (optionally decrypted).

**Parameters:**
- `credentialId`: Credential ID
- `userId`: Requesting user ID
- `decrypt`: Whether to decrypt data

**Returns:** `Credential` or `Credential & { data: CredentialData }`

#### `shareCredential(credentialId, ownerId, targetUserId, permission)`
Share credential with user.

**Parameters:**
- `credentialId`: Credential ID
- `ownerId`: Owner user ID
- `targetUserId`: Target user ID
- `permission`: Permission level ('read', 'use', 'edit')

**Returns:** `Credential`

### External Secrets Manager

#### `getSecret(key, options)`
Get secret from provider.

**Parameters:**
- `key`: Secret key
- `options.cache`: Enable caching (default: true)

**Returns:** `Secret`

#### `setSecret(key, value, metadata)`
Set secret in provider.

**Parameters:**
- `key`: Secret key
- `value`: Secret value
- `metadata`: Optional metadata

**Returns:** `Secret`

#### `syncSecrets(targetProvider, keys)`
Sync secrets between providers.

**Parameters:**
- `targetProvider`: Target secrets manager
- `keys`: Array of secret keys to sync

**Returns:** `{ synced, failed, errors }`

## Environment Variables

Add these to your `.env` file:

```bash
# Encryption
ENCRYPTION_MASTER_KEY=your-secure-256-bit-key-here
ENCRYPTION_SALT=your-salt-value-here

# OAuth2 - Google
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/oauth/google/callback

# OAuth2 - GitHub
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_REDIRECT_URI=http://localhost:3000/api/oauth/github/callback

# OAuth2 - Microsoft
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
MICROSOFT_TENANT_ID=common
MICROSOFT_REDIRECT_URI=http://localhost:3000/api/oauth/microsoft/callback

# OAuth2 - Slack
SLACK_CLIENT_ID=your-slack-client-id
SLACK_CLIENT_SECRET=your-slack-client-secret
SLACK_REDIRECT_URI=http://localhost:3000/api/oauth/slack/callback

# OAuth2 - Salesforce
SALESFORCE_CLIENT_ID=your-salesforce-client-id
SALESFORCE_CLIENT_SECRET=your-salesforce-client-secret
SALESFORCE_REDIRECT_URI=http://localhost:3000/api/oauth/salesforce/callback

# External Secrets - AWS
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# External Secrets - Vault
VAULT_ADDRESS=https://vault.example.com
VAULT_TOKEN=your-vault-token
VAULT_NAMESPACE=production

# External Secrets - Azure
AZURE_VAULT_URL=https://myvault.vault.azure.net
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret
```

## Security Checklist

- [ ] `ENCRYPTION_MASTER_KEY` set and secured
- [ ] All credentials encrypted at rest
- [ ] No credentials in localStorage
- [ ] No credentials in git
- [ ] OAuth tokens auto-refresh
- [ ] Credentials never logged
- [ ] Audit trail enabled
- [ ] Backup and rollback tested
- [ ] Key rotation policy defined
- [ ] Least privilege access enforced
- [ ] External secrets configured (if needed)
- [ ] SSL/TLS enabled in production
- [ ] CSRF protection active
- [ ] Rate limiting configured
- [ ] Security monitoring enabled

## Troubleshooting

### Encryption Service Not Initialized

```
Error: EncryptionService not initialized
```

**Solution:** Set `ENCRYPTION_MASTER_KEY` environment variable

### OAuth Callback Failed

```
Error: Invalid state parameter
```

**Solution:** Ensure cookies/session storage is enabled. State parameter used for CSRF protection.

### Token Refresh Failed

```
Error: No refresh token available
```

**Solution:** Re-authorize with `access_type=offline` and `prompt=consent` parameters

### Migration Failed

```
Error: Failed to encrypt credential
```

**Solution:** Check encryption service is initialized. Run with `--dry-run` to diagnose.

## Support

For security issues, please contact: security@example.com

For questions, see: https://docs.example.com/security
