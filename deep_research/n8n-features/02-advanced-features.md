# n8n Advanced Features

## Error Handling Capabilities

### Error Workflow (Workflow-Level)
- Define separate workflow triggered on unhandled errors
- Configured under workflow settings
- Error Trigger node receives:
  - Information about failing workflow
  - Error details and context
- Triggered by:
  - Node setting errors
  - Memory issues
  - Forced failures via Stop And Error node

### Node-Level Error Handling Options

#### Continue on Fail
- Workflow skips failed nodes
- Execution continues with next nodes
- Failed node data excluded from output

#### Stop on Fail
- Workflow halts when error occurs
- Default behavior for most nodes

#### Error Output Branch
- Send execution down error-specific path
- Handle errors within the workflow
- Allows recovery logic

### Try/Catch Pattern
- Use Error Trigger for centralized oversight
- Try/Catch for granular item-level handling
- Inside loops: failed items go to DLQ, processing continues
- Dead-Letter Queue (DLQ) pattern for failed items

### Stop And Error Node
- Force executions to fail under chosen conditions
- Trigger error workflow intentionally
- Control when and how errors propagate

## Retry Mechanisms

### Retry on Fail (Node-Level)
Configuration options:
- **Number of retries**: e.g., 3 attempts
- **Delay between retries**: e.g., 2000 ms
- **Exponential backoff**: Increasing delay after each failure

### Important Limitation
If Retry on Fail is ON AND On Error is set to Continue options:
- Max Tries and Wait settings are **ignored**
- Single failure does NOT trigger retry
- Workflow continues immediately

### Retry Strategies Best Practices
- Define clear retry policies per workflow step
- Use exponential backoff for transient API issues
- Give services time to recover
- Implement Dead-Letter Queue for persistent failures

### Auto-Retry Patterns
- Community templates available for complex retry logic
- Error recovery workflows
- Retry except for known errors pattern

## Webhook Authentication Methods

### Built-in Authentication

#### 1. Basic Authentication
- Username/password combination
- Standard HTTP Basic Auth

#### 2. Header/API-Key/Bearer Authentication
- Custom headers for authentication
- API key in header
- Bearer token support

#### 3. JWT (JSON Web Token) Authentication
- Stateless authentication
- Uses JWT credential
- Key types: Passphrase or PEM Key
- **Important**: Claims (exp, iss, aud) NOT automatically enforced
- Must add expiry/role validation logic manually if needed

### Advanced Security Methods

#### HMAC Signature Verification
- Verify integrity and authenticity of messages
- Used by Stripe, GitHub, Shopify, etc.
- SHA256 HMAC hash of raw request body
- Shared secret for validation

#### OAuth Support
- OAuth1 authentication
- OAuth2 authentication
  - Authorization Code grant
  - PKCE grant type

### Additional Webhook Security Features

| Feature | Description |
|---------|-------------|
| CORS Allowed Origins | Restrict frontend origins (default: *) |
| Ignore Bots | Drop requests from link previewers/crawlers |
| IP Allowlist | Restrict source IPs |
| Replay Protection | Timestamp + signature (HMAC), reject old timestamps |
| Rate Limiting | In-workflow throttling or proxy/CDN policy |

## Credential Management

### Built-in Credential Storage
- All credentials encrypted in database
- Access restricted by default
- Per-credential sharing controls

### External Secrets Integration (Enterprise)
Supported providers:
1. **AWS Secrets Manager**
   - Required IAM permissions: secretsmanager:ListSecrets, BatchGetSecretValue, GetSecretValue

2. **Azure Key Vault**
   - Requires: vault name, tenant ID, client ID, client secret
   - Microsoft Entra ID app registration

3. **HashiCorp Vault**
   - Multiple authentication methods
   - Namespace isolation for Enterprise

4. **Infisical**
   - Service Token authentication
   - Single environment per token

5. **Google Cloud Platform Secret Manager**
   - Service Account Key (JSON)
   - Required roles: Secret Manager Secret Accessor, Viewer

### How External Secrets Work
- Bridge between n8n credentials and external providers
- Secrets fetched at runtime when workflow needs them
- **Never stored in n8n database**
- Expression syntax to reference secrets

### Multi-Environment Support
- Connect different n8n instances to different vaults
- Development instance -> Development vault
- Production instance -> Production vault

### Credential Limitations
- Secret names: alphanumeric characters and underscores only
- No spaces, hyphens, or special characters
- Only plaintext values (not JSON objects or key-value pairs)
- RBAC project usage requires owner/admin membership

### Credential Sharing
- Share with individual users
- Share with entire projects
- Users can use credentials but cannot view/edit details

## Version Control

### Git-Based Source Control
- Link n8n instances to Git repository
- Create multiple environments backed by Git branches
- Push pattern: work in n8n, store in Git

### How n8n Uses Git
- **Push**: Send work from instance to Git
- **Pull**: Get workflows from Git
- Branch-based environment separation

### Limitations
- Not full version control implementation
- No built-in pull request-style review/merge
- Must use external Git provider for PR workflow

### Workflow History
- Previous versions of workflows saved
- Options:
  - Clone to new workflow
  - Open version in new tab (compare)
  - Download version as JSON

### Source Control Best Practices
1. **Branching Strategy**: Create branches for dev, staging, production
2. **Commit Messages**: Clear, descriptive messages
3. **Pull Requests**: Implement review process for major changes
4. **Git Tags**: Mark important versions/releases
5. **CI/CD Pipelines**: Automate deployment to environments

### Environment-Specific Overlays
- Use templating (Helm, Kustomize, or variables)
- Same workflow artifact promoted: dev -> staging -> prod
- No manual edits required between environments

### Third-Party Tools
- **n8n2Git**: Version control for individual developers/small teams
- **Bidirectional GitHub Sync**: Backup and version control solution
- Community workflow templates for Git integration

## Collaboration Features

### Shared Workflows
- Team members work together on automations
- Controlled environment for building and managing
- Attribution tracking for changes

### Credential Sharing
- Share credentials with users or projects
- Use without viewing sensitive details
- Granular permission control

### Projects
- Group workflows and credentials
- User roles within projects
- Different access levels per project

### RBAC for Teams
- Role-based access control
- Admin, Editor, Viewer roles
- Prevent unintentional overwrites

### Collaboration Best Practices
- Instance owners should create member-level accounts for daily work
- Owner accounts can view/edit all workflows without attribution
- Use projects to organize team work
