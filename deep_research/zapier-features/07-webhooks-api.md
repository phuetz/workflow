# Webhooks and API

## Overview

Zapier provides robust webhook and API capabilities that allow users to connect virtually any app or service, even those without native Zapier integrations.

## Webhooks by Zapier

### What Are Webhooks?
- Automated notifications sent between apps
- POST data (usually JSON) to a specific URL
- Triggered immediately when events occur
- No polling required - instant data delivery

### Webhook Triggers

#### Catch Hook
- Receive data from any service
- Auto-generates unique Zapier URL
- Parses incoming POST, PUT, or GET requests
- No server or code required

#### Catch Raw Hook
- Receive unparsed webhook payload
- Access raw request body
- Useful for custom parsing needs

### Webhook Actions

| Action | Description |
|--------|-------------|
| POST | Fire single POST request as form or JSON |
| GET | Fire single GET request with querystrings |
| PUT | Fire single PUT request as form or JSON |
| Custom Request | Raw request with full control |

### Payload Types
- **Form (URL-encoded)**: Standard form submission format
- **JSON**: JavaScript Object Notation
- **XML**: Extensible Markup Language

### Custom Requests
- Type raw JSON/XML directly
- No automatic parsing or formatting
- Full control over request structure
- Recommended to validate before sending

## Webhooks Features

### Headers
- Add custom HTTP headers
- Authentication tokens
- Content-Type specification
- Custom metadata

### Authentication Methods
- Basic Auth (username/password)
- Bearer tokens
- API keys
- Custom headers
- OAuth (via app connections)

### Query Parameters
- Add to GET requests
- Dynamic values from previous steps
- URL encoding handled automatically

## Code by Zapier

### JavaScript
- Run custom JavaScript in Zaps
- Access input data from previous steps
- Return structured output
- Modern ES6+ syntax supported

### Python
- Run custom Python code
- Standard library access
- Same input/output model
- 3.x syntax

### Use Cases
- Complex data transformations
- API response parsing
- Custom calculations
- Data validation

### Limitations
- Execution time limits
- Memory constraints
- No external dependencies (pip/npm)
- Synchronous execution only

## Custom Connections

### What Are Custom Connections?
- Connect custom APIs to Zapier
- Build one-off integrations
- No full integration development required

### Custom Actions
- AI-powered action creation
- Make HTTP requests in Zap editor
- One-off actions without app development

### When to Use
- Internal APIs
- Niche services
- Prototype integrations
- Temporary solutions

## API Request Best Practices

### Authentication
1. Store credentials securely
2. Use environment-appropriate tokens
3. Implement token refresh if needed
4. Never expose secrets in URLs

### Error Handling
- Check response status codes
- Handle timeouts gracefully
- Implement retries for transient errors
- Log failures for debugging

### Rate Limiting
- Respect API rate limits
- Implement backoff strategies
- Use delays between requests
- Monitor usage

### Data Formatting
- Validate JSON structure
- Handle null values
- Escape special characters
- Use consistent date formats

## Webhook Security

### Incoming Webhooks
- Unique URLs per Zap
- Can regenerate URLs
- IP filtering (Enterprise)
- HMAC signature verification

### Outgoing Webhooks
- Secure credential storage
- HTTPS only recommended
- Certificate validation
- Timeout configuration

## Advanced Features

### Digest/Basic Auth
- Configure username and password
- Auto-encoded in header
- Supported on all request types

### SSL Certificates
- Custom certificate support
- Self-signed certificate options
- mTLS (Enterprise)

### Retry Logic
- Automatic retries on failure
- Configurable retry behavior
- Exponential backoff

## Integration Patterns

### Webhook to Zap
1. External service fires webhook
2. Catch Hook receives data
3. Zap processes and acts
4. Optional response webhook

### Zap to External API
1. Trigger fires in Zapier
2. Webhook action sends request
3. Response parsed by Zapier
4. Continue with response data

### Bidirectional
1. Receive via Catch Hook
2. Process with Zap steps
3. Respond via webhook action
4. Complete round-trip

## Competitive Features Summary

| Feature | Zapier Capability |
|---------|-------------------|
| HTTP methods | GET, POST, PUT, Custom |
| Payload types | JSON, Form, XML |
| Authentication | Basic, Bearer, API Key, OAuth |
| Custom code | JavaScript, Python |
| Response handling | Parse JSON, raw data |
| Error handling | Automatic retries |
| Security | HTTPS, HMAC, mTLS (Enterprise) |

## Use Cases

### 1. Connect Unsupported Apps
- Any app with API access
- Internal tools and services
- Legacy systems

### 2. Receive External Events
- GitHub webhooks
- Stripe events
- Custom application events

### 3. Send Data to Custom Endpoints
- Internal APIs
- Custom dashboards
- Data warehouses

### 4. Build Custom Integrations
- Prototype before full integration
- Handle edge cases
- Extend existing integrations

## Sources

- [Webhooks by Zapier Integrations](https://zapier.com/apps/webhook/integrations)
- [Send webhooks in Zaps - Zapier](https://help.zapier.com/hc/en-us/articles/8496326446989-Send-webhooks-in-Zaps)
- [Move your data instantly with webhooks - Zapier](https://zapier.com/features/webhooks)
- [Custom Connections - Zapier](https://zapier.com/apps/custom-connections)
