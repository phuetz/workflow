# Enterprise Features

## Authentication & Single Sign-On

### SSO Support

Available on Enterprise plans:

- **SAML 2.0** - Industry-standard enterprise SSO
- **OIDC** - OpenID Connect protocol
- **LDAP** - Directory service integration

### Identity Provider Integration

Tested integrations include:
- Okta
- Azure Active Directory
- Google Workspace
- OneLogin
- Auth0

### Configuration Requirements

- Instance owner or admin privileges required
- SAML setup through admin panel
- Metadata exchange with IdP
- Attribute mapping configuration

### Multi-Factor Authentication (MFA)

- Enforce 2FA across entire instance
- Per-user 2FA settings
- TOTP support
- Recovery codes

## Role-Based Access Control (RBAC)

### Availability

| Plan | RBAC Features |
|------|---------------|
| Community | None |
| Starter | Basic roles |
| Pro | Standard RBAC |
| Enterprise | Advanced RBAC |

### Role Types

#### Instance Roles

- **Owner** - Full instance control
- **Admin** - Instance administration
- **Member** - Standard user access

#### Project Roles

- **Project Admin** - Full project control, member management
- **Project Editor** - Create, update, delete workflows
- **Project Viewer** - Read-only access

### Permission Matrix

| Action | Admin | Editor | Viewer |
|--------|-------|--------|--------|
| View Workflows | Yes | Yes | Yes |
| Create Workflows | Yes | Yes | No |
| Execute Workflows | Yes | Yes | No |
| Delete Workflows | Yes | Yes | No |
| Manage Members | Yes | No | No |
| Project Settings | Yes | No | No |

## Audit Logging

### Enterprise Audit Features

- Complete activity tracking
- User action logging
- Change history
- Access logging

### Retention

- Minimum 12 months history
- Last 3 months immediately available
- Configurable retention policies

### Log Streaming

Stream logs to external services:
- Datadog
- Splunk
- Elasticsearch
- AWS CloudWatch
- Custom endpoints

### Audit Log Contents

- Who performed actions
- What actions were taken
- When actions occurred
- Workflow execution history
- Credential access logs
- User authentication events

## External Secrets Integration

### Supported Providers

- HashiCorp Vault
- AWS Secrets Manager
- Azure Key Vault
- Google Secret Manager

### Benefits

1. Centralized secret management
2. Enhanced security isolation
3. Enterprise compliance support
4. Automated rotation
5. Cross-environment consistency

## Environment Management

### Isolated Environments

Enterprise supports multiple environments:
- Development
- Staging
- Production

### Git Control

- Native Git integration
- Branch-based workflows
- Environment promotion
- Version control for workflows

### Environment Features

- Environment-specific credentials
- Deployment pipelines
- Configuration management
- Rollback capabilities

## Scaling & Performance

### Multi-Main Mode

- High availability deployment
- Load distribution
- Failover support
- Enterprise-only feature

### Queue Mode

- Distributed execution
- Worker scaling
- Redis-backed queuing
- Execution load balancing

### S3 Binary Storage

- External binary data storage
- Reduced database load
- Scalable file handling
- Enterprise feature

## Projects & Organization

### Unlimited Projects

Enterprise includes:
- Unlimited shared projects
- Project isolation
- Cross-project sharing
- Hierarchical organization

### Custom Variables

- Instance-wide variables
- Environment-specific values
- Secure variable storage
- Pro/Enterprise feature

## Compliance & Security

### SOC 2 Alignment

- Continuous evaluation
- Annual audits by independent auditor
- Security program documentation
- Customer data protection

### Security Features

- Advanced permission structures
- SSO/SAML support
- Audit trails
- Compliance reporting

### Data Governance

- Data residency options
- Encryption at rest
- Encryption in transit
- Access controls

## Support & SLAs

### Enterprise Support

- Dedicated support team
- Service Level Agreements
- Priority issue resolution
- Direct communication channels

### Support Tiers

| Plan | Support Level |
|------|---------------|
| Starter | Forum |
| Pro | Business Support |
| Enterprise | Dedicated + SLA |

## Pricing Structure

### Plan Comparison

| Feature | Starter | Pro | Enterprise |
|---------|---------|-----|------------|
| Executions/month | 2,500 | 10,000+ | Custom |
| Active Workflows | 5 | 15+ | Unlimited |
| Users | Limited | More | Unlimited |
| SSO | No | No | Yes |
| LDAP | No | No | Yes |
| Audit Logs | No | No | Yes |
| Log Streaming | No | No | Yes |
| External Secrets | No | No | Yes |
| Dedicated Support | No | No | Yes |

### Pricing

- **Starter**: ~$20-24/month
- **Pro**: ~$50-60/month
- **Enterprise**: Custom pricing (cloud or self-hosted)

## Enterprise Self-Hosted

### Additional Features

- Full on-premises deployment
- Complete data control
- Network isolation
- Custom infrastructure

### Managed Service Option

Enterprise self-hosted can be:
- Fully self-managed
- Vendor-managed service
- Hybrid management

## Sources

- [Set up SSO Documentation](https://docs.n8n.io/hosting/securing/set-up-sso/)
- [n8n Pricing](https://n8n.io/pricing/)
- [RBAC Documentation](https://docs.n8n.io/user-management/rbac/)
- [n8n Security](https://n8n.io/legal/security/)
- [n8n Enterprise Overview](https://ntconsultcorp.com/n8n-enterprise/)
- [Enterprise Governance](https://scalevise.com/resources/n8n-enterprise-governance/)
