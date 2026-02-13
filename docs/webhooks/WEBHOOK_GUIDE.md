# Webhook System Guide

Complete guide to using the advanced webhook system with test/production modes, 7 authentication methods, rate limiting, and comprehensive analytics.

## Table of Contents

1. [Overview](#overview)
2. [Test vs Production Webhooks](#test-vs-production-webhooks)
3. [Authentication Methods](#authentication-methods)
4. [Rate Limiting](#rate-limiting)
5. [Request/Response Customization](#requestresponse-customization)
6. [Analytics & Monitoring](#analytics--monitoring)
7. [API Gateway Features](#api-gateway-features)
8. [Examples](#examples)

## Overview

The webhook system provides enterprise-grade webhook functionality with:

- **Test/Production Modes**: Separate test webhooks (24h expiry) from production webhooks
- **7 Authentication Methods**: None, Basic, Header, Query, JWT, HMAC, OAuth2
- **Advanced Rate Limiting**: Per-webhook and per-IP rate limits with custom windows
- **Comprehensive Analytics**: Request logging, performance metrics, error analysis
- **Custom Responses**: Multiple response modes with custom status codes and headers
- **API Gateway Features**: CORS, compression, request/response transformation

## Test vs Production Webhooks

### Test Webhooks

Test webhooks are temporary URLs designed for development and testing:

```typescript
import { webhookService } from './backend/webhooks/WebhookService';

// Create a test webhook
const { webhook, config } = webhookService.createWebhook({
  workflowId: 'workflow-123',
  mode: 'test',
  name: 'Development Webhook',
  description: 'Used for testing integrations'
});

console.log('Test Webhook URL:', webhook.url);
// => http://localhost:3000/api/webhooks/test/test_abc123_xyz789

console.log('Expires at:', webhook.expiresAt);
// => 2025-10-19T12:00:00.000Z (24 hours from creation)
```

**Features:**
- 🕐 Expires after 24 hours
- 🔄 Can be extended (see below)
- 🎨 Orange indicator in UI
- 🚀 Perfect for development and testing

**Extending Expiry:**

```typescript
import { testWebhookManager } from './backend/webhooks/TestWebhookManager';

// Extend by 24 hours
const extended = testWebhookManager.extendTestWebhook(webhook.id, 24);

console.log('New expiry:', extended.expiresAt);
```

**Promote to Production:**

```typescript
// Convert test webhook to production
const prodWebhook = testWebhookManager.promoteToProduction(webhook.id);

console.log('Production URL:', prodWebhook.url);
// => http://localhost:3000/api/webhooks/prod_def456_uvw123
```

### Production Webhooks

Production webhooks are permanent URLs for production use:

```typescript
// Create a production webhook
const { webhook, config } = webhookService.createWebhook({
  workflowId: 'workflow-123',
  mode: 'production',
  name: 'Production Webhook',
  authentication: {
    method: 'hmac',
    config: {
      type: 'hmac',
      secret: process.env.WEBHOOK_SECRET,
      algorithm: 'sha256',
      headerName: 'X-Signature'
    }
  }
});

console.log('Production Webhook URL:', webhook.url);
// => http://localhost:3000/api/webhooks/prod_ghi789_rst456
```

**Features:**
- ∞ Never expires (permanent)
- 🔒 Recommended to use authentication
- 🟢 Green indicator in UI
- 📊 Full analytics and monitoring

## Authentication Methods

The webhook system supports 7 authentication methods:

### 1. No Authentication

Anyone can trigger the webhook (not recommended for production):

```typescript
const { webhook } = webhookService.createWebhook({
  workflowId: 'workflow-123',
  mode: 'test',
  authentication: {
    method: 'none',
    config: { type: 'none' }
  }
});

// Call without authentication
curl -X POST http://localhost:3000/api/webhooks/test_abc123
```

### 2. Basic Authentication

Username and password authentication:

```typescript
const { webhook } = webhookService.createWebhook({
  workflowId: 'workflow-123',
  mode: 'production',
  authentication: {
    method: 'basic',
    config: {
      type: 'basic',
      username: 'admin',
      password: 'secret123'
    }
  }
});

// Call with Basic Auth
curl -X POST http://localhost:3000/api/webhooks/prod_abc123 \
  -u admin:secret123 \
  -H "Content-Type: application/json" \
  -d '{"event": "test"}'
```

### 3. Header Authentication

Custom header with specific value (e.g., API Key):

```typescript
const { webhook } = webhookService.createWebhook({
  workflowId: 'workflow-123',
  mode: 'production',
  authentication: {
    method: 'header',
    config: {
      type: 'header',
      headerName: 'X-API-Key',
      headerValue: 'sk_live_abc123xyz789',
      caseSensitive: true
    }
  }
});

// Call with Header Auth
curl -X POST http://localhost:3000/api/webhooks/prod_abc123 \
  -H "X-API-Key: sk_live_abc123xyz789" \
  -H "Content-Type: application/json" \
  -d '{"event": "test"}'
```

### 4. Query Parameter Authentication

API key in query string:

```typescript
const { webhook } = webhookService.createWebhook({
  workflowId: 'workflow-123',
  mode: 'production',
  authentication: {
    method: 'query',
    config: {
      type: 'query',
      paramName: 'api_key',
      paramValue: 'secret-key-123'
    }
  }
});

// Call with Query Auth
curl -X POST "http://localhost:3000/api/webhooks/prod_abc123?api_key=secret-key-123" \
  -H "Content-Type: application/json" \
  -d '{"event": "test"}'
```

### 5. JWT (JSON Web Token) Authentication

Verify JWT tokens with signature validation:

```typescript
const { webhook } = webhookService.createWebhook({
  workflowId: 'workflow-123',
  mode: 'production',
  authentication: {
    method: 'jwt',
    config: {
      type: 'jwt',
      secret: 'your-jwt-secret',
      algorithm: 'HS256',
      issuer: 'https://your-auth-server.com',
      audience: 'webhook-api',
      clockTolerance: 30 // 30 seconds tolerance
    }
  }
});

// Call with JWT
curl -X POST http://localhost:3000/api/webhooks/prod_abc123 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{"event": "test"}'
```

### 6. HMAC Signature Authentication

GitHub/Shopify/Stripe style signature verification:

```typescript
const { webhook } = webhookService.createWebhook({
  workflowId: 'workflow-123',
  mode: 'production',
  authentication: {
    method: 'hmac',
    config: {
      type: 'hmac',
      secret: 'webhook-secret',
      algorithm: 'sha256',
      headerName: 'X-Signature',
      prefix: 'sha256=' // Optional, for GitHub-style signatures
    }
  }
});

// Generate signature
const crypto = require('crypto');
const payload = JSON.stringify({ event: 'test' });
const signature = crypto
  .createHmac('sha256', 'webhook-secret')
  .update(payload)
  .digest('hex');

// Call with HMAC
curl -X POST http://localhost:3000/api/webhooks/prod_abc123 \
  -H "X-Signature: sha256=${signature}" \
  -H "Content-Type: application/json" \
  -d '{"event": "test"}'
```

**HMAC with Request Signing** (includes headers):

```typescript
const { webhook } = webhookService.createWebhook({
  workflowId: 'workflow-123',
  mode: 'production',
  authentication: {
    method: 'hmac',
    config: {
      type: 'hmac',
      secret: 'webhook-secret',
      algorithm: 'sha256',
      headerName: 'X-Signature',
      includeHeaders: ['Content-Type', 'X-Request-ID']
    }
  }
});
```

### 7. OAuth2 Bearer Token Authentication

Validate OAuth2 access tokens:

```typescript
const { webhook } = webhookService.createWebhook({
  workflowId: 'workflow-123',
  mode: 'production',
  authentication: {
    method: 'oauth2',
    config: {
      type: 'oauth2',
      introspectionEndpoint: 'https://auth.example.com/oauth/introspect',
      requiredScopes: ['webhook:write'],
      acceptedIssuers: ['https://auth.example.com']
    }
  }
});

// Call with OAuth2
curl -X POST http://localhost:3000/api/webhooks/prod_abc123 \
  -H "Authorization: Bearer ya29.a0AfH6SMB..." \
  -H "Content-Type: application/json" \
  -d '{"event": "test"}'
```

## Rate Limiting

Configure rate limits at different levels:

### Per-Webhook Rate Limits

Limit total requests to a webhook:

```typescript
const { webhook } = webhookService.createWebhook({
  workflowId: 'workflow-123',
  mode: 'production',
  rateLimit: {
    webhookLimits: {
      requests: 100,
      window: 'hour' // 'second' | 'minute' | 'hour' | 'day'
    }
  }
});

// After 100 requests per hour, returns 429 Too Many Requests
```

### Per-IP Rate Limits

Limit requests from individual IPs:

```typescript
const { webhook } = webhookService.createWebhook({
  workflowId: 'workflow-123',
  mode: 'production',
  rateLimit: {
    ipLimits: {
      requests: 10,
      window: 'minute'
    }
  }
});

// Each IP can make 10 requests per minute
```

### Global Rate Limits

Limit all webhook requests globally:

```typescript
const { webhook } = webhookService.createWebhook({
  workflowId: 'workflow-123',
  mode: 'production',
  rateLimit: {
    globalLimits: {
      requests: 1000,
      window: 'hour'
    }
  }
});
```

### IP Whitelist/Blacklist

```typescript
const { webhook } = webhookService.createWebhook({
  workflowId: 'workflow-123',
  mode: 'production',
  rateLimit: {
    whitelistedIPs: [
      '192.168.1.100',
      '10.0.0.0/8'
    ],
    blacklistedIPs: [
      '203.0.113.0'
    ],
    webhookLimits: {
      requests: 100,
      window: 'hour'
    }
  }
});

// Whitelisted IPs bypass rate limiting
// Blacklisted IPs are blocked entirely
```

### Custom Error Response

```typescript
const { webhook } = webhookService.createWebhook({
  workflowId: 'workflow-123',
  mode: 'production',
  rateLimit: {
    webhookLimits: {
      requests: 100,
      window: 'hour'
    },
    errorResponse: {
      statusCode: 429,
      message: 'Rate limit exceeded. Please try again later.',
      headers: {
        'X-Custom-Header': 'Rate Limited'
      }
    }
  }
});
```

### Rate Limit Headers

All responses include rate limit information:

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 75
X-RateLimit-Reset: 2025-10-18T13:00:00.000Z
```

When rate limited:

```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 2025-10-18T13:00:00.000Z
Retry-After: 1800

{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded: 100/100 requests in hour",
  "retryAfter": 1800
}
```

## Request/Response Customization

### Response Modes

#### 1. Last Node Output (default)

Return output from the final workflow node:

```typescript
const { webhook } = webhookService.createWebhook({
  workflowId: 'workflow-123',
  mode: 'production',
  response: {
    mode: 'lastNode',
    statusCode: 200
  }
});

// Response: { result: "output from last node" }
```

#### 2. All Nodes Output

Return outputs from all workflow nodes:

```typescript
const { webhook } = webhookService.createWebhook({
  workflowId: 'workflow-123',
  mode: 'production',
  response: {
    mode: 'allNodes',
    statusCode: 200
  }
});

// Response:
// {
//   "success": true,
//   "allNodes": {
//     "node1": { ... },
//     "node2": { ... },
//     "node3": { ... }
//   },
//   "timestamp": "2025-10-18T12:00:00.000Z"
// }
```

#### 3. Custom Response

Define a custom JSON response:

```typescript
const { webhook } = webhookService.createWebhook({
  workflowId: 'workflow-123',
  mode: 'production',
  response: {
    mode: 'custom',
    statusCode: 201,
    headers: {
      'X-Request-ID': crypto.randomUUID()
    },
    body: {
      success: true,
      message: 'Webhook received and processed',
      data: { ... }
    }
  }
});
```

#### 4. File Download

Return a downloadable file:

```typescript
const { webhook } = webhookService.createWebhook({
  workflowId: 'workflow-123',
  mode: 'production',
  response: {
    mode: 'file',
    statusCode: 200,
    headers: {
      'Content-Disposition': 'attachment; filename="result.json"'
    }
  }
});

// Downloads result.json file
```

#### 5. Redirect

Redirect to another URL:

```typescript
const { webhook } = webhookService.createWebhook({
  workflowId: 'workflow-123',
  mode: 'production',
  response: {
    mode: 'redirect',
    body: {
      url: 'https://example.com/success'
    }
  }
});

// Returns 302 redirect to https://example.com/success
```

### Response Templates

Use Handlebars templates for dynamic responses:

```typescript
const { webhook } = webhookService.createWebhook({
  workflowId: 'workflow-123',
  mode: 'production',
  response: {
    mode: 'custom',
    template: `{
      "status": "success",
      "workflowId": "{{result.workflowId}}",
      "processedAt": "{{result.timestamp}}",
      "items": {{result.items}}
    }`
  }
});
```

### Response Transformation

Transform response with JavaScript:

```typescript
const { webhook } = webhookService.createWebhook({
  workflowId: 'workflow-123',
  mode: 'production',
  response: {
    mode: 'lastNode',
    transformScript: `
      return {
        success: true,
        data: data.result.map(item => ({
          id: item.id,
          name: item.name.toUpperCase()
        })),
        count: data.result.length,
        timestamp: new Date().toISOString()
      };
    `
  }
});
```

### Custom Status Codes

```typescript
const { webhook } = webhookService.createWebhook({
  workflowId: 'workflow-123',
  mode: 'production',
  response: {
    mode: 'custom',
    statusCode: 202, // Accepted
    body: {
      message: 'Request accepted for processing',
      jobId: '{{ result.jobId }}'
    }
  }
});
```

## Analytics & Monitoring

### Request Logging

Automatically log all webhook requests:

```typescript
const { webhook } = webhookService.createWebhook({
  workflowId: 'workflow-123',
  mode: 'production',
  analytics: {
    enabled: true,
    trackHeaders: true,
    trackBody: true,
    trackIP: true
  }
});
```

### Get Analytics Summary

```typescript
import { webhookAnalytics } from './backend/webhooks/WebhookAnalytics';

const summary = webhookAnalytics.getSummary('webhook-123', {
  startDate: new Date('2025-10-01'),
  endDate: new Date('2025-10-18')
});

console.log(summary);
// {
//   totalRequests: 1234,
//   successfulRequests: 1180,
//   failedRequests: 54,
//   successRate: 95.62,
//   averageResponseTime: 145.3,
//   medianResponseTime: 120,
//   p95ResponseTime: 250,
//   p99ResponseTime: 380,
//   requestsByMethod: { POST: 1100, GET: 134 },
//   requestsByStatus: { 200: 1180, 401: 30, 500: 24 },
//   topIPs: [
//     { ip: '192.168.1.100', count: 450 },
//     { ip: '10.0.0.50', count: 320 }
//   ],
//   errorsByType: {
//     authentication: 30,
//     timeout: 15,
//     server_error: 9
//   }
// }
```

### Real-time Statistics

```typescript
const stats = webhookAnalytics.getRealtimeStats('webhook-123');

console.log(stats);
// {
//   last1min: 12,
//   last5min: 58,
//   last15min: 167,
//   last1hour: 623,
//   currentRPS: 0.2
// }
```

### Error Analysis

```typescript
const errors = webhookAnalytics.getErrorAnalysis('webhook-123', {
  startDate: new Date('2025-10-01'),
  endDate: new Date('2025-10-18')
});

console.log(errors);
// {
//   totalErrors: 54,
//   errorRate: 4.38,
//   errorsByStatus: { 401: 30, 500: 24 },
//   errorsByType: {
//     authentication: 30,
//     server_error: 24
//   },
//   topErrors: [
//     {
//       error: 'Invalid API key',
//       count: 30,
//       lastOccurrence: '2025-10-18T11:30:00.000Z'
//     }
//   ]
// }
```

### Export Analytics

```typescript
// Export to CSV
const csv = webhookAnalytics.exportToCSV('webhook-123', {
  startDate: new Date('2025-10-01'),
  endDate: new Date('2025-10-18')
});

// Save to file
fs.writeFileSync('webhook-analytics.csv', csv);
```

## API Gateway Features

### CORS Configuration

```typescript
const { webhook } = webhookService.createWebhook({
  workflowId: 'workflow-123',
  mode: 'production',
  cors: {
    enabled: true,
    origins: ['https://example.com', 'https://app.example.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    headers: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400 // 24 hours
  }
});
```

### Compression

Automatically compress responses:

```typescript
const { webhook } = webhookService.createWebhook({
  workflowId: 'workflow-123',
  mode: 'production',
  compression: {
    enabled: true,
    algorithms: ['gzip'],
    threshold: 1024 // Only compress responses > 1KB
  }
});

// Response includes: Content-Encoding: gzip
```

### Request Transformation

Transform incoming requests:

```typescript
const { webhook } = webhookService.createWebhook({
  workflowId: 'workflow-123',
  mode: 'production',
  requestTransform: {
    enabled: true,
    script: `
      // Transform request before workflow execution
      return {
        ...request,
        body: {
          ...request.body,
          processedAt: new Date().toISOString(),
          source: 'webhook'
        }
      };
    `,
    validation: {
      required: ['userId', 'action'],
      schema: {
        type: 'object',
        properties: {
          userId: { type: 'string' },
          action: { type: 'string' }
        }
      }
    }
  }
});
```

## Examples

### Example 1: Shopify Webhook

```typescript
const { webhook } = webhookService.createWebhook({
  workflowId: 'shopify-orders',
  mode: 'production',
  name: 'Shopify Order Webhook',
  authentication: {
    method: 'hmac',
    config: {
      type: 'hmac',
      secret: process.env.SHOPIFY_WEBHOOK_SECRET,
      algorithm: 'sha256',
      headerName: 'X-Shopify-Hmac-SHA256'
    }
  },
  rateLimit: {
    webhookLimits: {
      requests: 1000,
      window: 'hour'
    }
  },
  analytics: {
    enabled: true,
    trackHeaders: true,
    trackBody: true
  }
});

// Configure in Shopify Admin:
// URL: https://your-domain.com/api/webhooks/prod_abc123
// Format: JSON
// Event: Order creation
```

### Example 2: GitHub Webhook

```typescript
const { webhook } = webhookService.createWebhook({
  workflowId: 'github-ci',
  mode: 'production',
  name: 'GitHub Push Webhook',
  authentication: {
    method: 'hmac',
    config: {
      type: 'hmac',
      secret: process.env.GITHUB_WEBHOOK_SECRET,
      algorithm: 'sha1',
      headerName: 'X-Hub-Signature',
      prefix: 'sha1='
    }
  },
  response: {
    mode: 'custom',
    statusCode: 200,
    body: {
      message: 'Webhook received'
    }
  }
});
```

### Example 3: Stripe Webhook

```typescript
const { webhook } = webhookService.createWebhook({
  workflowId: 'stripe-payments',
  mode: 'production',
  name: 'Stripe Payment Webhook',
  authentication: {
    method: 'hmac',
    config: {
      type: 'hmac',
      secret: process.env.STRIPE_WEBHOOK_SECRET,
      algorithm: 'sha256',
      headerName: 'Stripe-Signature'
    }
  },
  rateLimit: {
    ipLimits: {
      requests: 100,
      window: 'minute'
    }
  },
  analytics: {
    enabled: true,
    trackBody: true
  }
});
```

### Example 4: Custom API Integration

```typescript
const { webhook } = webhookService.createWebhook({
  workflowId: 'custom-api',
  mode: 'production',
  name: 'Custom API Webhook',
  authentication: {
    method: 'jwt',
    config: {
      type: 'jwt',
      secret: process.env.JWT_SECRET,
      algorithm: 'HS256',
      issuer: 'https://api.example.com',
      audience: 'webhook-api'
    }
  },
  rateLimit: {
    webhookLimits: {
      requests: 1000,
      window: 'hour'
    },
    ipLimits: {
      requests: 60,
      window: 'minute'
    }
  },
  response: {
    mode: 'custom',
    statusCode: 202,
    headers: {
      'X-Request-ID': '{{ requestId }}'
    },
    template: `{
      "status": "accepted",
      "jobId": "{{result.jobId}}",
      "estimatedTime": {{result.estimatedTime}}
    }`
  },
  cors: {
    enabled: true,
    origins: ['*'],
    methods: ['POST'],
    credentials: false
  },
  compression: {
    enabled: true,
    threshold: 1024
  },
  analytics: {
    enabled: true,
    trackHeaders: true,
    trackBody: true,
    trackIP: true
  }
});
```

## Best Practices

1. **Always use authentication in production**
   - Never use `method: 'none'` for production webhooks
   - Prefer HMAC or JWT for API integrations

2. **Set appropriate rate limits**
   - Start conservative and increase as needed
   - Use per-IP limits to prevent abuse

3. **Enable analytics**
   - Monitor webhook performance
   - Track errors and fix issues proactively

4. **Use test webhooks for development**
   - Test integrations thoroughly before promoting to production
   - Extend test webhooks if needed

5. **Handle errors gracefully**
   - Return appropriate HTTP status codes
   - Provide clear error messages

6. **Secure your secrets**
   - Store authentication secrets in environment variables
   - Rotate secrets regularly

7. **Monitor webhook health**
   - Set up alerts for high error rates
   - Monitor response times

## API Reference

### WebhookService

- `createWebhook(config)` - Create a new webhook
- `updateWebhook(id, updates)` - Update webhook configuration
- `deleteWebhook(id)` - Delete a webhook
- `handleRequest(id, request)` - Handle incoming webhook request
- `testWebhook(id, data)` - Test a webhook
- `getAnalytics(id, options)` - Get analytics for a webhook
- `getRateLimitStatus(id)` - Get rate limit status

### TestWebhookManager

- `createTestWebhook(workflowId, options)` - Create test webhook
- `createProductionWebhook(workflowId, options)` - Create production webhook
- `promoteToProduction(testWebhookId)` - Promote test to production
- `extendTestWebhook(id, hours)` - Extend test webhook expiry
- `getExpiringWebhooks(withinHours)` - Get webhooks expiring soon

### WebhookAnalytics

- `getSummary(webhookId, options)` - Get analytics summary
- `getErrorAnalysis(webhookId, options)` - Get error analysis
- `getPerformanceMetrics(webhookId, options)` - Get performance metrics
- `getRealtimeStats(webhookId)` - Get real-time statistics
- `exportToCSV(webhookId, options)` - Export analytics to CSV

## Support

For issues or questions:
- Check the [GitHub Issues](https://github.com/your-repo/issues)
- Join our [Discord Community](https://discord.gg/your-server)
- Email support@example.com
