# API Documentation - Workflow Automation Platform

## Overview
The Workflow Automation Platform provides a comprehensive REST API for managing workflows, executions, and integrations.

**Base URL**: `https://api.workflow-platform.com/v1`  
**Authentication**: Bearer token (JWT)

---

## Authentication

### POST /api/auth/login
Authenticate a user and receive JWT tokens.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "secure_password"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600,
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "admin"
  }
}
```

### POST /api/auth/refresh
Refresh access token using refresh token.

**Headers:**
```
Authorization: Bearer <refresh_token>
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600
}
```

---

## Workflows

### GET /api/workflows
Get all workflows for the authenticated user.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)
- `status` (string): Filter by status (active, inactive, draft)
- `search` (string): Search in workflow names

**Response:**
```json
{
  "workflows": [
    {
      "id": "wf_123",
      "name": "Customer Onboarding",
      "description": "Automated customer onboarding process",
      "status": "active",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-16T14:20:00Z",
      "nodes": 12,
      "executions": 245
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
```

### POST /api/workflows
Create a new workflow.

**Request:**
```json
{
  "name": "New Workflow",
  "description": "Workflow description",
  "nodes": [
    {
      "id": "node_1",
      "type": "trigger",
      "data": {
        "triggerType": "webhook",
        "config": {}
      }
    }
  ],
  "edges": [
    {
      "id": "edge_1",
      "source": "node_1",
      "target": "node_2"
    }
  ],
  "settings": {
    "errorHandling": "continue",
    "timeout": 30000
  }
}
```

### PUT /api/workflows/:id
Update an existing workflow.

### DELETE /api/workflows/:id
Delete a workflow.

### POST /api/workflows/:id/execute
Execute a workflow manually.

**Request:**
```json
{
  "inputData": {
    "customer_email": "customer@example.com",
    "order_id": "ORD_12345"
  },
  "options": {
    "mode": "test",
    "timeout": 60000
  }
}
```

**Response:**
```json
{
  "executionId": "exec_456",
  "status": "running",
  "startedAt": "2024-01-15T10:35:00Z"
}
```

---

## Executions

### GET /api/executions
Get workflow executions.

**Query Parameters:**
- `workflowId` (string): Filter by workflow
- `status` (string): Filter by status (running, success, error, stopped)
- `from` (date): Start date
- `to` (date): End date

### GET /api/executions/:id
Get execution details.

**Response:**
```json
{
  "id": "exec_456",
  "workflowId": "wf_123",
  "status": "success",
  "startedAt": "2024-01-15T10:35:00Z",
  "finishedAt": "2024-01-15T10:35:45Z",
  "duration": 45000,
  "nodes": [
    {
      "nodeId": "node_1",
      "status": "success",
      "startTime": "2024-01-15T10:35:00Z",
      "endTime": "2024-01-15T10:35:10Z",
      "output": {}
    }
  ]
}
```

### POST /api/executions/:id/stop
Stop a running execution.

---

## Nodes

### GET /api/nodes/types
Get available node types.

**Response:**
```json
{
  "categories": [
    {
      "name": "Triggers",
      "nodes": [
        {
          "type": "webhook",
          "name": "Webhook",
          "description": "Trigger workflow via webhook",
          "icon": "webhook"
        }
      ]
    }
  ]
}
```

### GET /api/nodes/:type/schema
Get node configuration schema.

---

## Credentials

### GET /api/credentials
Get all credentials.

### POST /api/credentials
Create new credentials.

**Request:**
```json
{
  "name": "Gmail Account",
  "type": "gmail",
  "data": {
    "email": "user@gmail.com",
    "accessToken": "encrypted_token"
  }
}
```

### PUT /api/credentials/:id
Update credentials.

### DELETE /api/credentials/:id
Delete credentials.

---

## Webhooks

### GET /api/webhooks
Get all webhooks.

### POST /api/webhooks
Create a webhook.

**Request:**
```json
{
  "name": "Customer Updates",
  "path": "/customer-updates",
  "method": "POST",
  "workflowId": "wf_123"
}
```

**Response:**
```json
{
  "id": "wh_789",
  "url": "https://api.workflow-platform.com/webhooks/wh_789/customer-updates",
  "secret": "whsec_abc123..."
}
```

---

## Monitoring

### GET /api/health
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "uptime": 86400,
  "timestamp": "2024-01-15T10:30:00Z",
  "checks": {
    "database": "ok",
    "redis": "ok",
    "queue": "ok"
  }
}
```

### GET /api/metrics
Get application metrics (Prometheus format).

---

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Invalid request parameters",
    "details": {
      "field": "email",
      "reason": "Invalid email format"
    }
  }
}
```

### Error Codes
- `UNAUTHORIZED`: Invalid or missing authentication
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `INVALID_REQUEST`: Invalid request parameters
- `RATE_LIMITED`: Too many requests
- `INTERNAL_ERROR`: Server error

---

## Rate Limiting

API requests are rate limited:
- **Standard**: 100 requests per minute
- **Premium**: 1000 requests per minute
- **Enterprise**: Unlimited

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642248000
```

---

## Webhooks Security

Webhook requests include a signature header for verification:

```
X-Webhook-Signature: sha256=abc123...
```

Verify using HMAC-SHA256 with the webhook secret.

---

## SDKs

Official SDKs available:
- **JavaScript/TypeScript**: `npm install @workflow-platform/sdk`
- **Python**: `pip install workflow-platform`
- **Go**: `go get github.com/workflow-platform/go-sdk`

---

## Support

- **Documentation**: https://docs.workflow-platform.com
- **Status Page**: https://status.workflow-platform.com
- **Support**: support@workflow-platform.com