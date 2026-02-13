# API Reference

Complete API reference for WorkflowBuilder Pro REST and GraphQL APIs.

## Base URLs

- **Development**: `http://localhost:4000`
- **Staging**: `https://staging-api.workflowbuilder.com`
- **Production**: `https://api.workflowbuilder.com`

## Authentication

All API requests require authentication using JWT tokens.

### Obtain Access Token

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your-password"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600,
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "name": "John Doe"
    }
  }
}
```

### Using Tokens

Include the access token in the Authorization header:

```bash
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## REST API Endpoints

### 1. Health Check

Check application health status.

**Endpoint:** `GET /health`

**Authentication:** Not required

**Example:**
```bash
curl http://localhost:4000/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "uptime": 123456,
  "version": "2.0.0",
  "services": {
    "database": "connected",
    "redis": "connected",
    "queue": "running"
  }
}
```

---

### 2. Database Health

Check database connectivity.

**Endpoint:** `GET /api/health/db`

**Authentication:** Not required

**Example:**
```bash
curl http://localhost:4000/api/health/db
```

**Response:**
```json
{
  "status": "healthy",
  "database": "connected",
  "latency": 5,
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

---

### 3. List Workflows

Get all workflows for the authenticated user.

**Endpoint:** `GET /api/workflows`

**Authentication:** Required

**Query Parameters:**
- `limit` (optional): Number of results (default: 50, max: 100)
- `offset` (optional): Pagination offset (default: 0)
- `status` (optional): Filter by status (`active`, `draft`, `archived`)
- `sortBy` (optional): Sort field (`createdAt`, `updatedAt`, `name`)
- `order` (optional): Sort order (`asc`, `desc`)

**Example:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:4000/api/workflows?limit=10&status=active&sortBy=updatedAt&order=desc"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "workflows": [
      {
        "id": "wf_123",
        "name": "Customer Onboarding",
        "description": "Automated customer onboarding workflow",
        "status": "active",
        "nodes": 8,
        "edges": 7,
        "createdAt": "2025-01-10T08:00:00.000Z",
        "updatedAt": "2025-01-15T10:00:00.000Z",
        "lastExecutedAt": "2025-01-15T09:45:00.000Z",
        "executionCount": 142
      }
    ],
    "total": 15,
    "limit": 10,
    "offset": 0
  }
}
```

---

### 4. Get Workflow by ID

Get a specific workflow by ID.

**Endpoint:** `GET /api/workflows/:id`

**Authentication:** Required

**Example:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:4000/api/workflows/wf_123
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "wf_123",
    "name": "Customer Onboarding",
    "description": "Automated customer onboarding workflow",
    "status": "active",
    "nodes": [
      {
        "id": "node_1",
        "type": "webhook",
        "position": { "x": 100, "y": 100 },
        "config": { "method": "POST", "path": "/webhook/onboarding" }
      },
      {
        "id": "node_2",
        "type": "email",
        "position": { "x": 300, "y": 100 },
        "config": { "to": "{{$json.email}}", "subject": "Welcome!" }
      }
    ],
    "edges": [
      { "id": "edge_1", "source": "node_1", "target": "node_2" }
    ],
    "createdAt": "2025-01-10T08:00:00.000Z",
    "updatedAt": "2025-01-15T10:00:00.000Z"
  }
}
```

---

### 5. Create Workflow

Create a new workflow.

**Endpoint:** `POST /api/workflows`

**Authentication:** Required

**Request Body:**
```json
{
  "name": "New Workflow",
  "description": "Description of the workflow",
  "nodes": [],
  "edges": [],
  "status": "draft"
}
```

**Example:**
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"My New Workflow","description":"Test workflow","nodes":[],"edges":[],"status":"draft"}' \
  http://localhost:4000/api/workflows
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "wf_456",
    "name": "New Workflow",
    "description": "Description of the workflow",
    "status": "draft",
    "nodes": [],
    "edges": [],
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z"
  }
}
```

---

### 6. Update Workflow

Update an existing workflow.

**Endpoint:** `PUT /api/workflows/:id`

**Authentication:** Required

**Request Body:**
```json
{
  "name": "Updated Workflow Name",
  "description": "Updated description",
  "nodes": [...],
  "edges": [...],
  "status": "active"
}
```

**Example:**
```bash
curl -X PUT \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated Name","status":"active"}' \
  http://localhost:4000/api/workflows/wf_123
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "wf_123",
    "name": "Updated Workflow Name",
    "updatedAt": "2025-01-15T10:35:00.000Z"
  }
}
```

---

### 7. Delete Workflow

Delete a workflow.

**Endpoint:** `DELETE /api/workflows/:id`

**Authentication:** Required

**Example:**
```bash
curl -X DELETE \
  -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:4000/api/workflows/wf_123
```

**Response:**
```json
{
  "success": true,
  "message": "Workflow deleted successfully"
}
```

---

### 8. Execute Workflow

Execute a workflow manually.

**Endpoint:** `POST /api/workflows/:id/execute`

**Authentication:** Required

**Request Body (optional):**
```json
{
  "input": {
    "customData": "value"
  },
  "options": {
    "debug": true,
    "timeout": 30000
  }
}
```

**Example:**
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"input":{"test":"data"},"options":{"debug":true}}' \
  http://localhost:4000/api/workflows/wf_123/execute
```

**Response:**
```json
{
  "success": true,
  "data": {
    "executionId": "exec_789",
    "status": "running",
    "startedAt": "2025-01-15T10:40:00.000Z"
  }
}
```

---

### 9. List Node Types

Get all available node types.

**Endpoint:** `GET /api/nodes`

**Authentication:** Required

**Query Parameters:**
- `category` (optional): Filter by category
- `search` (optional): Search by name or description

**Example:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:4000/api/nodes?category=triggers&search=webhook"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "nodes": [
      {
        "type": "webhook",
        "name": "Webhook",
        "category": "triggers",
        "description": "Trigger workflow via HTTP webhook",
        "icon": "webhook",
        "color": "#ff6b6b",
        "inputs": 0,
        "outputs": 1
      }
    ],
    "total": 150,
    "categories": ["triggers", "actions", "transforms", "ai", "database"]
  }
}
```

---

### 10. List Templates

Get available workflow templates.

**Endpoint:** `GET /api/templates`

**Authentication:** Required

**Query Parameters:**
- `category` (optional): Filter by category
- `featured` (optional): Show only featured templates

**Example:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:4000/api/templates?category=automation&featured=true"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "templates": [
      {
        "id": "tpl_1",
        "name": "Customer Onboarding",
        "description": "Automate new customer setup",
        "category": "automation",
        "featured": true,
        "nodes": 8,
        "usageCount": 1250
      }
    ],
    "total": 22
  }
}
```

---

### 11. List Executions

Get workflow execution history.

**Endpoint:** `GET /api/executions`

**Authentication:** Required

**Query Parameters:**
- `workflowId` (optional): Filter by workflow ID
- `status` (optional): Filter by status (`success`, `failed`, `running`)
- `limit` (optional): Number of results (default: 50)
- `offset` (optional): Pagination offset

**Example:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:4000/api/executions?workflowId=wf_123&status=success&limit=10"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "executions": [
      {
        "id": "exec_789",
        "workflowId": "wf_123",
        "status": "success",
        "startedAt": "2025-01-15T10:00:00.000Z",
        "finishedAt": "2025-01-15T10:00:05.000Z",
        "duration": 5000,
        "nodesExecuted": 8,
        "nodesFailed": 0
      }
    ],
    "total": 142
  }
}
```

---

### 12. Get Execution Details

Get detailed execution information.

**Endpoint:** `GET /api/executions/:id`

**Authentication:** Required

**Example:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:4000/api/executions/exec_789
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "exec_789",
    "workflowId": "wf_123",
    "status": "success",
    "startedAt": "2025-01-15T10:00:00.000Z",
    "finishedAt": "2025-01-15T10:00:05.000Z",
    "duration": 5000,
    "nodeExecutions": [
      {
        "nodeId": "node_1",
        "status": "success",
        "startedAt": "2025-01-15T10:00:00.000Z",
        "finishedAt": "2025-01-15T10:00:01.000Z",
        "output": { "data": "result" }
      }
    ]
  }
}
```

---

### 13. Metrics

Get system metrics.

**Endpoint:** `GET /api/metrics`

**Authentication:** Required (Admin only)

**Example:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:4000/api/metrics
```

**Response (Prometheus format):**
```
# HELP workflow_executions_total Total number of workflow executions
# TYPE workflow_executions_total counter
workflow_executions_total 1250

# HELP workflow_execution_duration_seconds Workflow execution duration
# TYPE workflow_execution_duration_seconds histogram
workflow_execution_duration_seconds_bucket{le="1"} 850
workflow_execution_duration_seconds_bucket{le="5"} 1200
```

---

### 14. Queue Metrics

Get queue metrics.

**Endpoint:** `GET /api/queue-metrics`

**Authentication:** Required (Admin only)

**Example:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:4000/api/queue-metrics
```

**Response:**
```json
{
  "success": true,
  "data": {
    "queues": [
      {
        "name": "workflow-execution",
        "waiting": 5,
        "active": 2,
        "completed": 1230,
        "failed": 15,
        "delayed": 3
      }
    ]
  }
}
```

---

### 15. Webhooks

Manage workflow webhooks.

**Endpoint:** `GET /api/webhooks`

**Authentication:** Required

**Example:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:4000/api/webhooks
```

**Response:**
```json
{
  "success": true,
  "data": {
    "webhooks": [
      {
        "id": "webhook_1",
        "workflowId": "wf_123",
        "path": "/webhook/onboarding",
        "method": "POST",
        "active": true,
        "url": "https://api.workflowbuilder.com/webhook/onboarding",
        "authMethod": "hmac",
        "createdAt": "2025-01-10T08:00:00.000Z"
      }
    ]
  }
}
```

---

### 16. Create Webhook

Create a new webhook.

**Endpoint:** `POST /api/webhooks`

**Authentication:** Required

**Request Body:**
```json
{
  "workflowId": "wf_123",
  "path": "/webhook/custom",
  "method": "POST",
  "authMethod": "hmac"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "webhook_2",
    "workflowId": "wf_123",
    "path": "/webhook/custom",
    "url": "https://api.workflowbuilder.com/webhook/custom",
    "secret": "whsec_abc123..."
  }
}
```

---

### 17. Credentials

Manage credentials.

**Endpoint:** `GET /api/credentials`

**Authentication:** Required

**Example:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:4000/api/credentials
```

**Response:**
```json
{
  "success": true,
  "data": {
    "credentials": [
      {
        "id": "cred_1",
        "name": "Slack Production",
        "type": "slack",
        "createdAt": "2025-01-10T08:00:00.000Z",
        "lastUsed": "2025-01-15T10:00:00.000Z"
      }
    ]
  }
}
```

---

### 18. Create Credential

Create a new credential.

**Endpoint:** `POST /api/credentials`

**Authentication:** Required

**Request Body:**
```json
{
  "name": "My API Key",
  "type": "api_key",
  "data": {
    "apiKey": "your-secret-api-key"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "cred_2",
    "name": "My API Key",
    "type": "api_key",
    "createdAt": "2025-01-15T10:45:00.000Z"
  }
}
```

---

### 19. Users

Manage users (Admin only).

**Endpoint:** `GET /api/users`

**Authentication:** Required (Admin)

**Example:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:4000/api/users
```

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "user_1",
        "email": "user@example.com",
        "name": "John Doe",
        "role": "developer",
        "active": true,
        "createdAt": "2025-01-01T00:00:00.000Z"
      }
    ],
    "total": 15
  }
}
```

---

### 20. Analytics

Get usage analytics.

**Endpoint:** `GET /api/analytics`

**Authentication:** Required

**Query Parameters:**
- `period` (optional): Time period (`day`, `week`, `month`)
- `metric` (optional): Specific metric to fetch

**Example:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:4000/api/analytics?period=week&metric=executions"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "period": "week",
    "executions": {
      "total": 1250,
      "success": 1200,
      "failed": 50,
      "successRate": 96.0
    },
    "workflows": {
      "total": 25,
      "active": 20,
      "draft": 5
    },
    "performance": {
      "avgExecutionTime": 3500,
      "p95ExecutionTime": 8000
    }
  }
}
```

---

### 21. Rate Limit Status

Check rate limit status.

**Endpoint:** `GET /api/rate-limit`

**Authentication:** Required

**Example:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:4000/api/rate-limit
```

**Response:**
```json
{
  "success": true,
  "data": {
    "limit": 1000,
    "remaining": 950,
    "resetAt": "2025-01-15T11:00:00.000Z"
  }
}
```

---

### 22. OAuth2 Callback

OAuth2 authentication callback.

**Endpoint:** `GET /api/oauth/callback`

**Authentication:** Not required

**Query Parameters:**
- `code`: OAuth authorization code
- `state`: CSRF protection state

**Example:**
```bash
curl "http://localhost:4000/api/oauth/callback?code=AUTH_CODE&state=STATE_TOKEN"
```

**Response:** Redirects to frontend with tokens

---

## GraphQL API

GraphQL endpoint: `POST /graphql`

### Example Query

```graphql
query GetWorkflows {
  workflows(limit: 10, status: ACTIVE) {
    id
    name
    description
    status
    nodes {
      id
      type
      config
    }
    edges {
      id
      source
      target
    }
    createdAt
    updatedAt
  }
}
```

### Example Mutation

```graphql
mutation CreateWorkflow($input: CreateWorkflowInput!) {
  createWorkflow(input: $input) {
    id
    name
    status
    createdAt
  }
}
```

### Example Subscription

```graphql
subscription WorkflowExecution($workflowId: ID!) {
  workflowExecution(workflowId: $workflowId) {
    executionId
    status
    nodeExecutions {
      nodeId
      status
      output
    }
  }
}
```

For complete GraphQL schema, see [docs/API.md](docs/API.md).

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}
  }
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Rate Limiting

- **Rate Limit**: 1000 requests per hour per user
- **Burst Limit**: 100 requests per minute
- Headers included in all responses:
  - `X-RateLimit-Limit`: Total requests allowed
  - `X-RateLimit-Remaining`: Requests remaining
  - `X-RateLimit-Reset`: Reset timestamp

---

## Pagination

All list endpoints support pagination:

```bash
GET /api/workflows?limit=20&offset=40
```

Response includes pagination metadata:

```json
{
  "data": [...],
  "total": 150,
  "limit": 20,
  "offset": 40,
  "hasMore": true
}
```

---

## Webhooks

Workflow webhooks can be called without authentication (if configured):

```bash
POST https://api.workflowbuilder.com/webhook/YOUR_PATH
Content-Type: application/json
X-Webhook-Signature: sha256=HMAC_SIGNATURE

{
  "data": "your webhook payload"
}
```

See [docs/webhooks/WEBHOOK_GUIDE.md](docs/webhooks/WEBHOOK_GUIDE.md) for webhook authentication methods.

---

## SDK & Libraries

Official SDKs coming soon:
- JavaScript/TypeScript
- Python
- Go
- Ruby

---

## Support

- **Documentation**: [docs/README.md](docs/README.md)
- **Issues**: [GitHub Issues](https://github.com/your-org/workflow-automation/issues)
- **Email**: api-support@workflowbuilder.com
