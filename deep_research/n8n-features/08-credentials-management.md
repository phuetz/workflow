# Credentials Management

## Encryption Architecture

### Automatic Encryption

- n8n creates a random encryption key on first launch
- Key stored in `~/.n8n` folder
- All credentials encrypted before database storage
- Encryption key required for credential decryption

### Custom Encryption Key

```bash
# Set custom encryption key via environment variable
export N8N_ENCRYPTION_KEY=your-custom-encryption-key
```

**Important Notes:**
- Without custom key, n8n generates a new one
- In queue mode, all workers must have same encryption key
- Lost encryption key means lost access to credentials

## n8n Cloud Security

### Encryption at Rest

- OAuth tokens encrypted at rest
- Key-based credentials encrypted
- Database on encrypted disk (Azure server-side encryption)
- Uses AES256 encryption
- FIPS-140-2 compliant implementation
- Database backups also encrypted

### Encryption in Transit

- SSL/TLS for web application traffic
- Encrypted public API traffic
- Encrypted webhook traffic
- Cloudflare manages SSL certificates

### Infrastructure Security

- Database resides in private network (cloud)
- No direct database access from internet
- Regular security audits

## External Secrets Management

### Enterprise Feature

Available for Enterprise users to integrate with external vaults:

- **HashiCorp Vault** - Industry-standard secrets management
- **AWS Secrets Manager** - AWS-native secret storage
- **Azure Key Vault** - Azure-native secret management
- **Google Secret Manager** - GCP secret storage

### Benefits

1. **Centralized Management** - Single source of truth for secrets
2. **Isolation** - Secrets separate from n8n instance
3. **Audit Trail** - External vault logging
4. **Rotation** - External vault handles secret rotation
5. **Access Control** - Vault-level permissions

### Configuration

```yaml
# Example external secrets configuration
external_secrets:
  provider: hashicorp-vault
  config:
    address: https://vault.example.com
    token: ${VAULT_TOKEN}
    path: secret/n8n
```

## Credential Types

### OAuth 2.0

- Full OAuth flow support
- Automatic token refresh
- Secure token storage
- Support for most OAuth providers

### API Keys

- Encrypted storage
- Environment variable support
- Secure transmission

### Username/Password

- Password salting and hashing
- Secure storage
- Never displayed after entry

### Certificate-Based

- Client certificate support
- TLS/SSL certificates
- Secure key storage

## Role-Based Access Control (RBAC)

### Enterprise RBAC Features

- Define roles with specific permissions
- Assign users to roles
- Granular credential access control
- Project-based credential isolation

### Access Levels

| Role | Credential Access |
|------|-------------------|
| Project Admin | Full access |
| Project Editor | Use and create |
| Project Viewer | View only (limited) |

## Best Practices

### 1. Use n8n's Credential Storage

```
DO: Store credentials in n8n's credential manager
DON'T: Store credentials in workflow nodes
DON'T: Store credentials in environment variables directly
```

### 2. Implement Least Privilege

- Only grant necessary access
- Use project-based isolation
- Regular access reviews

### 3. Credential Rotation

- Rotate credentials periodically
- Update in n8n when rotated
- Consider automated rotation with external vaults

### 4. Audit and Monitoring

- Enable audit logging (Enterprise)
- Monitor credential access
- Alert on suspicious activity

### 5. Environment Separation

- Different credentials per environment
- Production credentials isolated
- Test credentials with limited scope

## Self-Hosted Security Considerations

### User Responsibilities

- Data at rest encryption (beyond credentials)
- Network security
- Access control to n8n instance
- Backup encryption

### Recommendations

1. **Set Custom Encryption Key** - Before first workflow creation
2. **Secure the Key** - Store encryption key securely
3. **Network Isolation** - Run n8n in private network
4. **Regular Backups** - Include credential recovery plan

## Credential Sharing

### Enterprise Feature

- Share credentials across projects
- Team-wide credential access
- Controlled by RBAC

### Community Limitations

- Limited sharing in community edition
- Credentials tied to individual users
- Enterprise upgrade for full sharing

## Password Security

### User Account Passwords

- Salted and hashed on account creation
- Not stored in plain text
- Secure password reset flow

### Service Credentials

- Encrypted with instance encryption key
- Never displayed after entry
- Secure update process

## Sources

- [External Secrets Documentation](https://docs.n8n.io/external-secrets/)
- [Custom Encryption Key](https://docs.n8n.io/hosting/configuration/configuration-examples/encryption-key/)
- [n8n Security](https://n8n.io/legal/security/)
- [n8n Security Best Practices](https://www.soraia.io/blog/n8n-security-best-practices-protect-your-data-and-workflows)
- [Credentials Library](https://docs.n8n.io/credentials/)
