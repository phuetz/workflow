# n8n Developer Experience

## CLI Tools

### Official n8n CLI
Built-in command line interface for self-hosted n8n:
- Start workflows programmatically
- Export workflows and credentials
- Import workflows and credentials
- Administrative operations

### Running n8n with npx
```bash
# Quick start without installation
npx n8n

# Access at http://localhost:5678
```
Requirements:
- Node.js v18 minimum
- Downloads dependencies automatically

### @n8n/node-cli
Official CLI for developing community nodes:

```bash
# Install in project
npm i @n8n/node-cli

# Create new node project (recommended)
npm create @n8n/node
```

#### Key Commands
| Command | Description |
|---------|-------------|
| `n8n-node new` | Create new node project |
| `n8n-node new n8n-nodes-my-app --skip-install` | Create without installing deps |
| `n8n-node new n8n-nodes-my-app --template declarative/custom` | Use specific template |
| `n8n-node dev` | Run n8n with node in development mode (hot reload) |
| `n8n-node dev --external-n8n` | Use external n8n instance |

### Third-Party CLI: 8man (n8n-manager)
Community CLI tool for instance management:
- Manage workflows
- Manage credentials
- Manage community nodes
- API Key management
- Owner account management
- Upgrade old nodes to new versions (http node, set node, function/code node)

## SDK Capabilities

### Node Development Prerequisites
- Familiarity with JavaScript and TypeScript
- Development environment management (git)
- Knowledge of npm (creating and submitting packages)

### n8n-nodes-starter Repository
Official starter module for custom nodes:
- Example project structure
- Dev dependencies included (@n8n/node-cli)
- n8n included for local development
- No global n8n installation needed

### Node Types

#### Declarative Nodes
- Configuration-based
- Simpler to create
- Use templates

#### Custom/Programmatic Nodes
- Full JavaScript/TypeScript
- Maximum flexibility
- Complex logic support

## Plugin/Custom Node Development

### Creating Community Nodes

#### Development Workflow
1. Create project: `npm create @n8n/node`
2. Implement node logic
3. Test locally with `n8n-node dev`
4. Build and package
5. Publish to npm registry

#### Project Structure
```
n8n-nodes-my-package/
  ├── nodes/
  │   └── MyNode/
  │       ├── MyNode.node.ts
  │       └── MyNode.node.json
  ├── credentials/
  │   └── MyCredential.credentials.ts
  ├── package.json
  └── tsconfig.json
```

### Verified vs Unverified Nodes

#### Verified Community Nodes
- Vetted by n8n team
- Discoverable in nodes panel
- Must adhere to technical and UX standards
- **No runtime dependencies allowed**
- Automated checks must pass
- Available on n8n cloud

#### Unverified Community Nodes
- Not reviewed by n8n
- Require self-hosted n8n
- Not available on n8n cloud
- Manual installation required

### Installation Methods

#### GUI Installation (Verified Nodes)
- Available in n8n interface
- npm registry integration
- One-click install

#### CLI Installation
```bash
# For self-hosted instances
npm install n8n-nodes-my-package
```

### Private Nodes
- Internal company use only
- No npm publication required
- Direct installation to instance
- Custom integrations

### Best Practices
- Use n8n-node CLI tool for verified nodes
- Follow expected conventions
- Adhere to community node requirements
- Test thoroughly before submission

## API Access

### Public REST API
Programmatically perform GUI tasks via REST API

#### Documentation Resources
- Main API docs: https://docs.n8n.io/api/
- API Reference: https://docs.n8n.io/api/api-reference/
- Assumes REST API familiarity

### API Authentication
- API keys for authentication
- Key generation in settings
- Secure key management

### API Playground

#### Self-hosted
- Built-in Swagger UI playground
- Interactive documentation
- Test requests directly
- Available on all self-hosted tiers

#### Cloud
- API playground NOT available
- Use external tools (Postman, etc.)

#### Configuration
- Set server base URL
- Set instance name
- Add API key
- Powered by Scalar's API platform

### API Endpoints (Examples)
- `/workflows` - Workflow CRUD operations
- `/executions` - Execution history and status
- `/credentials` - Credential management
- `/users` - User management
- `/health` - Health checks

### HTTP Request Node
- Connect to apps without pre-built nodes
- Use existing credentials
- Import curl commands directly
- Custom API integrations

### Custom API Operations
- Extend existing nodes with custom operations
- Access undocumented API endpoints
- Build specialized integrations

## Testing Tools

### Manual Testing

#### Test Workflow
- Click "Test Workflow" to execute all nodes
- See results instantly
- Input/Output tabs per node
- Error tab for failures

#### Test Step
- Execute individual nodes
- Test without running entire workflow
- Faster iteration

### Execution History
- List of all past workflow runs
- Success and failure tracking
- Click to view read-only execution details
- Input/output data for each node at execution time

### Data Pinning
Pin output data from nodes:
- Avoid repeated external requests
- Consistent test data
- Save time and costs
- Development feature only (not for production)

How to pin:
1. Run node to load data
2. In OUTPUT view, select "Pin data"
3. "This data is pinned" banner appears

Limitations:
- Cannot pin binary data outputs

### Data Mocking
Simulate or fake data during development:
- Avoid repeated calls to data source
- Work with small, predictable datasets
- Avoid risk of overwriting live data
- Faster development cycles

### Debug Features

#### Debug in Editor
- Load failed execution data
- Make workflow changes
- Re-run with previous execution data
- Fix production issues locally

#### Copy to Editor
- Paste successful execution data
- Create test scenarios
- Maintain consistent test cases

#### Debug Helper Node
Built-in debugging node with options:
- Do Nothing
- Throw Error (specified type and message)
- Out Of Memory (simulate memory issues)
- Generate Random Data (various formats)

### NoOp Node (No Operation)
- Acts as clean breakpoint
- Receives data, passes unchanged
- Pause and inspect data stream
- No impact on data flow

### VSCode Debugging
Full debugging support:
1. "Run and Debug" section
2. Select "Launch n8n with debug"
3. Set breakpoints (red dot)
4. Inspect variables at breakpoints
5. Step through or stop execution

Requirements:
- Set `EXECUTIONS_PROCESS=main` (forces workflow to run in main process)
- Attach debugger to running instance: "Attach to running n8n"

### Slack-Based Breakpoints
- Use Slack node for conditional breakpoints
- Interactive "continue" button
- Pause execution, inspect, resume

### Partial Executions
- Re-run specific nodes
- Use same input data
- Update node logic iteratively
- Efficient debugging workflow
