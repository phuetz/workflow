# n8n Enterprise Features

## User Management

### Account Types

#### Owner
- Full access and control over n8n instance
- Invite new users
- Manage all workflows
- Can view/edit all workflows without attribution
- **Best Practice**: Create member-level account for daily workflow building

#### Admin (Pro/Enterprise Plans)
- Elevated permissions
- User management capabilities
- Instance-level administration

#### Member
- Standard user access
- Access based on project membership
- Workflow and credential access via roles

### User Operations
- Invite users via email
- Deactivate/reactivate accounts
- Password reset functionality
- Profile management

## Role-Based Access Control (RBAC)

### Availability
| Plan | RBAC Support |
|------|-------------|
| Community | Not available |
| Starter | Limited |
| Pro | Full (Admin, Editor roles) |
| Enterprise | Full (including Viewer role) |

### Instance-Level Roles

#### Instance Owner
- Highest level permissions
- Full instance control
- All administrative functions

#### Instance Admin
- Administrative privileges
- Create projects
- Manage users across instance

### Project-Level Roles

#### Project Admin
- Manage project settings (name, deletion)
- Manage project members (invite, remove, change roles)
- Full access to workflows, credentials, executions

#### Project Editor (Pro Cloud, Self-hosted Enterprise)
- View, create, update, delete workflows
- View, create, update, delete credentials
- View, create, update, delete executions
- Cannot manage project settings or members

#### Project Viewer (Enterprise Only)
- Read-only access to workflows
- View executions
- Cannot modify anything

### Projects System
- Group workflows and credentials
- Assign roles to users per project
- Single user can have different roles in different projects
- Instance owners/admins can create projects
- Project admins can add/remove users

### Permission Matrix

| Action | Owner | Admin | Editor | Viewer |
|--------|-------|-------|--------|--------|
| Manage project settings | Yes | Yes | No | No |
| Invite/remove members | Yes | Yes | No | No |
| Create workflows | Yes | Yes | Yes | No |
| Edit workflows | Yes | Yes | Yes | No |
| View workflows | Yes | Yes | Yes | Yes |
| Delete workflows | Yes | Yes | Yes | No |
| Create credentials | Yes | Yes | Yes | No |
| Use credentials | Yes | Yes | Yes | No |
| View credential details | Yes | Yes | No | No |

## SSO/LDAP Integration

### Supported Protocols
- **SAML 2.0**: XML-based, enterprise standard (banks, governments, Fortune 500)
- **OIDC**: OpenID Connect support

### SAML Setup Process
1. Go to Settings > SSO in n8n
2. Note Redirect URL and Entity ID
3. Configure in Identity Provider (IdP)
4. Load metadata XML into n8n (URL or raw XML)

### Supported Identity Providers
- Okta
- Keycloak
- Ory
- Azure AD (Entra ID)
- Custom SAML/OIDC providers

### LDAP Integration

#### Configuration
1. Log in as instance owner
2. Settings > LDAP > Enable LDAP Login
3. Configure connection settings

#### Behavior
- Anyone on LDAP server can sign in (unless filtered)
- First sign-in creates n8n user account automatically
- User details managed on LDAP server, not n8n
- Updates sync on next scheduled sync or login attempt

#### User Filter
- Exclude specific users from LDAP access
- Control who can access n8n instance

### Active Directory Support
Two options:
1. **LDAP**: AD is LDAP-compatible, use built-in LDAP
2. **SAML/OIDC**: For Azure AD (Entra ID)

### SSO Features
- Keep local users while enabling SSO (break-glass access)
- MFA handled at IdP level (inherited by n8n)
- Multiple authentication methods simultaneously

## Audit Logging

### Capabilities
- Track every action by individual users
- Query log info as needed
- Trace workflow changes
- Prove accountability for compliance

### Retention
- **Minimum 12 months** of audit log history
- At least **3 months immediately available** for analysis

### Tracked Events
- Workflow edits
- Workflow executions
- Deployments
- User actions
- Credential access
- Project changes

### Audit Queries
- Filter by user
- Filter by action type
- Filter by date range
- Filter by workflow/project

## Compliance Features

### SOC 2 Compliance
- Security program aligned to SOC 2 framework
- Continuous evaluation and annual audits
- Independent auditor verification
- SOC 2 report available to enterprise customers
- SOC 3 report publicly available

### GDPR Support
- Self-hosted option: data never leaves controlled infrastructure
- Data minimization in workflows
- Audit logs for data processing activities
- Data subject access, correction, deletion support
- Critical for EU data protection requirements

### ISO 27001
- Self-hosting supports ISO 27001 compliance
- Controlled infrastructure deployment
- Security controls implementation

### HIPAA Considerations
- Self-hosted deployment for healthcare
- Data residency control
- Audit trail capabilities

### Security Measures

#### Infrastructure Security
- Operational audit system monitoring cloud infrastructure
- Alerts to appropriate personnel
- Web Application Firewall (WAF) protection
- Intrusion Detection System (IDS)
- Approved networking ports and protocols only
- Firewalls configured

#### Data Encryption
- OAuth tokens encrypted at rest
- Key-based credentials encrypted
- Azure server-side encryption (AES256)
- FIPS-140-2 compliant implementation

#### Security Audit Tool
Run security audit via:
- CLI
- Public API
- n8n node
Detects common security issues in your instance

### Trust Center
- Centralized security information
- Compliance documentation
- Privacy policies
- Reliability information

## Environment Management

### Multi-Environment Setup
- Development, staging, production environments
- Git branch per environment
- External secrets vault per environment

### Environment Isolation
- Connect each n8n instance to different vault/project
- Separate credentials per environment
- Workflow promotion between environments

### Deployment Patterns
- CI/CD pipelines for environment promotion
- Validation steps (linting, schema checks, tests)
- Staged deployments
- Environment-specific overlays (Helm, Kustomize)

### Version Control Integration
- Git-backed environments
- Branch-based environment separation
- Workflow history tracking
- Rollback capabilities

## Enterprise Plan Features Summary

### Self-hosted Enterprise Includes:
- Full RBAC with all roles
- SAML SSO
- LDAP integration
- External secrets integration
- Log streaming
- Audit logs
- Workflow history
- Custom variables
- External storage
- Git control
- Isolated environments
- Multi-user workflows
- Advanced permissions

### Cloud Enterprise Includes:
All self-hosted features plus:
- Managed infrastructure
- Automatic updates
- Professional support
- SLA guarantees
