# Webhooks and Polling

## Webhook Fundamentals

### What are Webhooks?

Webhooks are user-defined callbacks that enable real-time data transfer between applications:

- **Event-Driven**: Trigger on specific events
- **Push Model**: Server pushes data to clients
- **Real-Time**: Instant notification of changes
- **HTTP-Based**: Use standard HTTP POST requests

### Webhook Process Flow

1. Webhook configured to listen for event in System A
2. Event occurs in System A
3. System A sends HTTP POST to webhook URL
4. n8n receives data and starts workflow
5. Workflow processes data and takes action

## n8n Webhook Node

### Core Functionality

- Entry point to workflows
- Listens for HTTP requests
- Supports multiple HTTP methods:
  - GET
  - POST
  - PUT
  - DELETE
  - PATCH
  - HEAD

### Configuration Options

#### HTTP Methods

```yaml
methods:
  - GET    # Retrieve data
  - POST   # Create/send data (most common)
  - PUT    # Update data
  - DELETE # Remove data
```

#### Response Modes

- **Immediately** - Respond before workflow completes
- **After Last Node** - Wait for full workflow execution
- **Using Respond to Webhook Node** - Custom response point

#### Authentication Options

- None (public webhook)
- Basic Auth
- Header Auth
- JWT
- Query Parameter

### Webhook URL Structure

```
Production: https://your-n8n-instance.com/webhook/your-webhook-path
Test: https://your-n8n-instance.com/webhook-test/your-webhook-path
```

## Polling Triggers

### When to Use Polling

Use polling when:
- Service doesn't support webhooks
- No native n8n Trigger node exists
- Need to monitor changes periodically
- Webhook setup not possible

### How Polling Works

1. n8n connects to service at intervals
2. Checks for new/updated data
3. If changes found, triggers workflow
4. Repeats at configured interval

### Polling Configuration

```yaml
polling:
  interval: 5  # Check every 5 minutes
  unit: minutes
  dedup_field: id  # Prevent duplicate processing
```

### Polling Intervals

| Use Case | Recommended Interval |
|----------|---------------------|
| Real-time critical | 1 minute |
| Standard monitoring | 5 minutes |
| Resource efficient | 15 minutes |
| Daily checks | 1 hour+ |

## Webhooks vs Polling vs APIs

### Comparison

| Feature | Webhooks | Polling | APIs |
|---------|----------|---------|------|
| Trigger Type | Event-based | Time-based | Request-based |
| Automation | Automatic | Automatic | Manual |
| Latency | Real-time | Depends on interval | On-demand |
| Resource Usage | Low | Higher | Low |
| Complexity | Medium | Low | Low |
| External Setup | Required | Not required | Not required |

### When to Use Each

- **Webhooks**: Real-time events, instant notifications
- **Polling**: Legacy systems, no webhook support
- **APIs**: On-demand data retrieval, user-initiated

## Six Types of n8n Triggers

### 1. Manual Trigger
- User-initiated workflow start
- Testing and debugging
- One-off executions

### 2. Time-Based (Cron) Trigger
- Scheduled execution
- Regular intervals
- Specific times/dates

### 3. Webhook Trigger
- Event-driven
- Real-time response
- External service integration

### 4. App-Specific Trigger
- Native integration triggers
- Pre-built for popular apps
- Optimized for specific services

### 5. Polling Trigger
- Periodic checking
- Services without webhook support
- Change detection

### 6. Custom Event Trigger
- User-defined events
- n8n-to-n8n communication
- Complex event handling

## Practical Applications

### Webhook Use Cases

1. **Payment Processing**
   - Stripe payment webhooks
   - Capture payment events
   - Update order status

2. **Form Submissions**
   - Capture form data
   - Validate and process
   - Store in database

3. **GitHub Notifications**
   - Push events
   - Pull request updates
   - Issue creation

4. **E-commerce Events**
   - New orders
   - Inventory updates
   - Customer actions

### Polling Use Cases

1. **Email Monitoring**
   - Check for new emails
   - Process attachments
   - Route to appropriate workflow

2. **File System Monitoring**
   - New file detection
   - File change tracking
   - Automated processing

3. **Database Changes**
   - Record updates
   - New entries
   - Data synchronization

4. **Social Media Monitoring**
   - New posts
   - Mentions
   - Engagement metrics

## Best Practices

### Webhook Security

1. **Use HTTPS** - Always encrypt webhook traffic
2. **Authenticate** - Use header/basic auth when possible
3. **Validate Payloads** - Check data integrity
4. **Limit Exposure** - Only expose necessary endpoints
5. **Log Activity** - Monitor for suspicious requests

### Polling Efficiency

1. **Optimize Intervals** - Balance freshness vs resources
2. **Use Deduplication** - Prevent duplicate processing
3. **Implement Caching** - Reduce API calls
4. **Error Handling** - Handle service unavailability
5. **Monitor Usage** - Track API rate limits

### General Best Practices

1. **Prefer Webhooks** - When available, use webhooks over polling
2. **Fallback Strategy** - Have polling backup for webhook failures
3. **Documentation** - Document webhook endpoints and purposes
4. **Testing** - Use test endpoints before production
5. **Monitoring** - Track webhook delivery and success rates

## Sources

- [Webhook Node Documentation](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/)
- [Creating Triggers Using Polling](https://blog.n8n.io/creating-triggers-for-n8n-workflows-using-polling/)
- [Beginner's Guide to Webhooks](https://blog.n8n.io/webhooks-for-workflow-automation/)
- [Types of Triggers in n8n](https://www.c-sharpcorner.com/article/types-of-triggers-in-n8n/)
- [Webhook Integrations](https://n8n.io/integrations/webhook/)
