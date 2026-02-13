# API Capabilities

## n8n Public REST API

### Overview

The n8n Public API is a REST API providing programmatic access to manage workflows, credentials, executions, users, and other n8n resources.

### API Structure

- **Base URL**: `/api/v1`
- **Format**: JSON for requests and responses
- **Protocol**: REST principles
- **Documentation**: OpenAPI/Swagger specification

## Authentication

### API Key Authentication

- Required header: `X-N8N-API-KEY`
- API key configured in n8n instance settings
- Must be provided with every request
- Invalid authentication returns 401 Unauthorized

### Security Best Practices

- Store API keys securely
- Rotate keys periodically
- Use environment variables
- Limit key permissions where possible

## API Resources

### 1. Workflow Management

```
GET    /api/v1/workflows           - List all workflows
GET    /api/v1/workflows/:id       - Get specific workflow
POST   /api/v1/workflows           - Create new workflow
PUT    /api/v1/workflows/:id       - Update workflow
DELETE /api/v1/workflows/:id       - Delete workflow
POST   /api/v1/workflows/:id/activate   - Activate workflow
POST   /api/v1/workflows/:id/deactivate - Deactivate workflow
```

### 2. Execution Control

```
GET    /api/v1/executions          - List executions
GET    /api/v1/executions/:id      - Get execution details
POST   /api/v1/executions          - Start execution
DELETE /api/v1/executions/:id      - Delete execution
```

### 3. Credential Management

```
GET    /api/v1/credentials         - List credentials
GET    /api/v1/credentials/:id     - Get credential details
POST   /api/v1/credentials         - Create credential
PUT    /api/v1/credentials/:id     - Update credential
DELETE /api/v1/credentials/:id     - Delete credential
```

### 4. User Management

```
GET    /api/v1/users               - List users
GET    /api/v1/users/:id           - Get user details
POST   /api/v1/users               - Create user
PUT    /api/v1/users/:id           - Update user
DELETE /api/v1/users/:id           - Delete user
```

### 5. Tags

```
GET    /api/v1/tags                - List tags
POST   /api/v1/tags                - Create tag
PUT    /api/v1/tags/:id            - Update tag
DELETE /api/v1/tags/:id            - Delete tag
```

### 6. Projects (Pro/Enterprise)

- Group workflows and credentials for access control
- Requires appropriate plan

### 7. Variables (Pro/Enterprise)

- Store fixed data accessible across workflows
- Environment-specific configuration

### 8. Source Control (Enterprise)

- Git integration operations
- Requires Source Control feature licensed and configured

## API Playground

### Interactive Documentation

Available at `/api/v1/docs` on self-hosted instances:

- Swagger-based interface
- Test requests directly
- View response examples
- Explore endpoint behaviors
- Ideal starting point for API integration

## Use Cases

### Workflow Automation

```javascript
// Create workflow programmatically
const response = await fetch('https://n8n.example.com/api/v1/workflows', {
  method: 'POST',
  headers: {
    'X-N8N-API-KEY': 'your-api-key',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'My New Workflow',
    nodes: [...],
    connections: {...}
  })
});
```

### Execution Monitoring

```javascript
// Monitor executions for errors
const executions = await fetch(
  'https://n8n.example.com/api/v1/executions?status=failed',
  {
    headers: { 'X-N8N-API-KEY': 'your-api-key' }
  }
);
```

### Dynamic Workflow Creation

- Create workflows based on user input
- Generate workflows from templates
- Programmatic workflow modification

## Best Practices

1. **Use /executions Endpoint** - Log and monitor workflow runs for performance issues
2. **Design Modularly** - Smaller, reusable workflows are easier to manage via API
3. **Error Handling** - Implement proper error handling for API calls
4. **Rate Limiting** - Be aware of rate limits on cloud instances
5. **Webhook Integration** - Combine API with webhooks for full automation

## API vs GUI Comparison

| Feature | API | GUI |
|---------|-----|-----|
| Workflow Creation | Programmatic | Visual |
| Bulk Operations | Efficient | Manual |
| Automation | Full | Limited |
| Learning Curve | Higher | Lower |
| Flexibility | Maximum | Standard |

## Sources

- [n8n Public REST API Documentation](https://docs.n8n.io/api/)
- [API Reference](https://docs.n8n.io/api/api-reference/)
- [Workflow Manager API Template](https://n8n.io/workflows/4166-n8n-workflow-manager-api/)
- [Dynamic Workflow Creation Template](https://n8n.io/workflows/4544-create-dynamic-workflows-programmatically-via-webhooks-and-n8n-api/)
