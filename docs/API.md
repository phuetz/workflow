# API Documentation

## Table of Contents

- [Authentication](#authentication)
- [Workflows](#workflows)
- [Executions](#executions)
- [Nodes](#nodes)
- [Templates](#templates)
- [Webhooks](#webhooks)
- [Credentials](#credentials)
- [Users](#users)
- [Analytics](#analytics)
- [Health & Metrics](#health--metrics)

## Base URL

Production: https://api.workflow.com/api
Development: http://localhost:3000/api

## Authentication

All API requests require JWT Bearer tokens.

Authorization Header: Bearer <access_token>

### POST /auth/login

Authenticate user and receive JWT tokens.

Request:
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

Response (200 OK):
```json
{
  "user": {
    "id": "usr_1234567890",
    "email": "user@example.com",
    "role": "user",
    "permissions": ["workflow.create", "workflow.read"]
  },
  "tokens": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "expiresIn": 3600
  }
}
```

Errors:
- 401 Unauthorized - Invalid credentials
- 423 Locked - Account locked (5+ failed attempts)
- 429 Too Many Requests - Rate limit exceeded

