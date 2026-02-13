# User Guide

Complete guide to building workflows with the Workflow Automation Platform.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Creating Your First Workflow](#creating-your-first-workflow)
3. [Workflow Examples](#workflow-examples)
4. [Best Practices](#best-practices)
5. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Accessing the Platform

1. **Login**: Navigate to the platform URL and log in with your credentials
2. **Dashboard**: View your workflows, executions, and analytics
3. **Create Workflow**: Click "New Workflow" to start building

### Interface Overview

**Main Areas:**
- **Sidebar**: Node library organized by category
- **Canvas**: Visual workflow designer with drag-and-drop
- **Properties Panel**: Configure selected node
- **Top Bar**: Save, execute, and workflow settings

**Keyboard Shortcuts:**
- `Ctrl/Cmd + S`: Save workflow
- `Ctrl/Cmd + E`: Execute workflow
- `Ctrl/Cmd + Z`: Undo
- `Ctrl/Cmd + Y`: Redo
- `Delete`: Delete selected nodes
- `Ctrl/Cmd + A`: Select all nodes

---

## Creating Your First Workflow

### Example 1: HTTP to Email Notification

**Goal**: Send an email when a webhook receives data.

**Steps:**

1. **Add Manual Trigger**
   - Drag "Manual Trigger" from Triggers category
   - This allows testing the workflow manually

2. **Add HTTP Request Node**
   - Search for "HTTP Request"
   - Configure:
     - Method: `GET`
     - URL: `https://api.example.com/users`
   - Connect Manual Trigger → HTTP Request

3. **Add Filter Node**
   - Filter for active users only
   - Configure:
     - Condition: `status` equals `active`
   - Connect HTTP Request → Filter

4. **Add Email Node**
   - Configure:
     - To: `admin@company.com`
     - Subject: `Active Users Report`
     - Body: `Found {{ $json.length }} active users`
   - Connect Filter → Email

5. **Save and Execute**
   - Click Save button
   - Click Execute to test
   - Check email inbox for notification

---

### Example 2: Database Sync Workflow

**Goal**: Sync data from MySQL to MongoDB every hour.

**Workflow:**

```
Schedule (Hourly)
  ↓
MySQL (Query)
  ↓
Transform Data
  ↓
MongoDB (Insert Many)
  ↓
Slack Notification
```

**Configuration:**

**1. Schedule Node:**
```
Cron: 0 * * * *  (every hour)
```

**2. MySQL Node:**
```sql
SELECT id, name, email, created_at
FROM users
WHERE updated_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
```

**3. Transform (Code Node):**
```javascript
// Transform MySQL data to MongoDB format
const items = $input.all();
return items.map(item => ({
  _id: item.json.id,
  name: item.json.name,
  email: item.json.email,
  createdAt: new Date(item.json.created_at)
}));
```

**4. MongoDB Node:**
```
Operation: Insert Many
Database: myapp
Collection: users
Documents: {{ $json }}
```

**5. Slack Notification:**
```
Channel: #data-sync
Message: Synced {{ $json.insertedCount }} users at {{ $now() }}
```

---

### Example 3: E-commerce Order Processing

**Goal**: Process new orders from Shopify, store in database, send confirmation.

**Workflow:**

```
Shopify Webhook (Order Created)
  ↓
Validate Order
  ├─ Valid
  │   ↓
  │  Store in MongoDB
  │   ↓
  │  Send to Stripe (Payment)
  │   ↓
  │  Send Confirmation Email
  │   ↓
  │  Add to Mailchimp List
  │
  └─ Invalid
      ↓
     Log Error
      ↓
     Notify Admin
```

**Node Configurations:**

**Shopify Webhook:**
- Event: `orders/create`
- Automatically triggers on new orders

**Validate Order (Code Node):**
```javascript
const order = $json;

// Validation rules
const isValid = (
  order.total_price > 0 &&
  order.email &&
  order.line_items.length > 0
);

return {
  valid: isValid,
  order: order,
  errors: isValid ? [] : ['Invalid order data']
};
```

**MongoDB (Insert):**
```json
{
  "operation": "insertOne",
  "database": "ecommerce",
  "collection": "orders",
  "document": {
    "shopifyId": "{{ $json.order.id }}",
    "email": "{{ $json.order.email }}",
    "total": {{ $json.order.total_price }},
    "items": {{ $json.order.line_items }},
    "createdAt": "{{ $now() }}"
  }
}
```

**Stripe (Create Payment Intent):**
```json
{
  "amount": "{{ $json.order.total_price * 100 }}",
  "currency": "usd",
  "customer_email": "{{ $json.order.email }}",
  "metadata": {
    "order_id": "{{ $json.order.id }}"
  }
}
```

**Email (Confirmation):**
```
To: {{ $json.order.email }}
Subject: Order Confirmation #{{ $json.order.id }}
Body:
Thank you for your order!

Order Details:
- Order ID: {{ $json.order.id }}
- Total: ${{ $json.order.total_price }}
- Items: {{ $json.order.line_items.length }}

We'll send a shipping notification soon!
```

---

### Example 4: AWS Lambda Data Pipeline

**Goal**: Process uploaded files in S3, run ML inference, store results.

**Workflow:**

```
Schedule (Every 5 min)
  ↓
AWS S3 (List New Files)
  ↓
For Each File
  ↓
AWS S3 (Download)
  ↓
AWS Lambda (ML Inference)
  ↓
Transform Results
  ↓
DynamoDB (Store Results)
  ↓
SNS Notification
```

**Configuration Details:**

**AWS S3 List:**
```json
{
  "operation": "listObjects",
  "bucketName": "ml-input-bucket",
  "prefix": "uploads/",
  "filter": {
    "lastModified": "> {{ $today() }}"
  }
}
```

**For Each Loop:**
- Iterates over each file from S3 list
- Processes one file at a time

**AWS Lambda Invoke:**
```json
{
  "functionName": "ml-inference-function",
  "invocationType": "RequestResponse",
  "payload": {
    "bucket": "{{ $json.bucket }}",
    "key": "{{ $json.key }}",
    "fileSize": {{ $json.size }}
  }
}
```

**DynamoDB Put Item:**
```json
{
  "tableName": "ml-results",
  "item": {
    "id": {"S": "{{ $json.fileId }}"},
    "fileName": {"S": "{{ $json.fileName }}"},
    "predictions": {"L": {{ $json.predictions }}},
    "confidence": {"N": "{{ $json.confidence }}"},
    "processedAt": {"S": "{{ $now() }}"}
  }
}
```

---

### Example 5: Real-time Data Sync (Pub/Sub)

**Goal**: Stream events from Google Pub/Sub to Elasticsearch.

**Workflow:**

```
Google Pub/Sub (Trigger)
  ↓
Parse Event
  ↓
Enrich Data (External API)
  ↓
Transform for Elasticsearch
  ↓
Elasticsearch (Index)
  ↓
Update Redis Cache
```

**Google Pub/Sub Configuration:**
```json
{
  "operation": "pull",
  "subscriptionName": "projects/my-project/subscriptions/events-sub",
  "maxMessages": 10,
  "autoAcknowledge": true
}
```

**Elasticsearch Index:**
```json
{
  "operation": "index",
  "index": "events-{{ $today('YYYY.MM.DD') }}",
  "document": {
    "timestamp": "{{ $json.timestamp }}",
    "eventType": "{{ $json.type }}",
    "userId": "{{ $json.userId }}",
    "metadata": {{ $json.metadata }},
    "enrichedData": {{ $json.enrichment }}
  }
}
```

**Redis Cache:**
```json
{
  "operation": "set",
  "key": "latest_event:{{ $json.userId }}",
  "value": "{{ $json }}",
  "expire": 3600
}
```

---

## Best Practices

### Workflow Design

**1. Start Simple**
- Begin with minimal nodes
- Test each step independently
- Add complexity gradually

**2. Use Meaningful Names**
- Name nodes descriptively: "Fetch User Data" not "HTTP 1"
- Add notes to complex nodes
- Group related nodes with sticky notes

**3. Error Handling**
- Add error output branches
- Implement retry logic for API calls
- Log errors for debugging
- Send alerts for critical failures

**4. Performance**
- Use batch operations when possible
- Implement pagination for large datasets
- Cache frequently accessed data
- Limit concurrent executions

### Data Management

**1. Data Transformation**
```javascript
// Good: Transform data explicitly
const user = {
  id: $json.userId,
  name: `${$json.firstName} ${$json.lastName}`,
  email: $json.email.toLowerCase()
};

// Avoid: Implicit assumptions
const user = $json; // May have unexpected fields
```

**2. Validation**
```javascript
// Validate required fields
if (!$json.email || !$json.name) {
  throw new Error('Missing required fields');
}

// Validate data types
if (typeof $json.age !== 'number') {
  throw new Error('Invalid age type');
}
```

**3. Security**
- Never log sensitive data (passwords, tokens)
- Use credential manager for secrets
- Sanitize user input
- Validate external data

### Testing

**1. Manual Testing**
- Use Manual Trigger for development
- Test with sample data
- Verify each node output
- Check error scenarios

**2. Test Data**
```json
{
  "test": true,
  "userId": "test-123",
  "email": "test@example.com",
  "amount": 100
}
```

**3. Monitoring**
- Enable execution logging
- Set up alerts for failures
- Monitor execution time
- Track success/failure rates

---

## Expression Language Tips

### Accessing Data

**Input Data:**
```javascript
{{ $json.fieldName }}              // Current node input
{{ $json.nested.field }}            // Nested field
{{ $json.array[0] }}                // Array element
{{ $input.first().json.data }}      // First input item
{{ $input.all()[0].json }}          // All inputs as array
```

**Previous Nodes:**
```javascript
{{ $node["HTTP Request"].json }}    // Specific node output
{{ $node["MySQL"].json.rows }}      // Access rows from MySQL
```

### Common Patterns

**Conditional Logic:**
```javascript
{{ $json.status === 'active' ? 'Enabled' : 'Disabled' }}
{{ $json.price > 100 ? 'Premium' : 'Standard' }}
```

**String Manipulation:**
```javascript
{{ $json.name.toUpperCase() }}
{{ $json.email.toLowerCase() }}
{{ $json.text.trim() }}
{{ $json.url.split('/').pop() }}
```

**Date/Time:**
```javascript
{{ $now() }}                        // Current timestamp
{{ $today() }}                      // Today's date
{{ $now().toISOString() }}          // ISO format
{{ new Date($json.date).getTime() }} // Unix timestamp
```

**Math:**
```javascript
{{ $json.price * 1.1 }}             // 10% increase
{{ Math.round($json.value) }}        // Round number
{{ Math.max(...$json.values) }}      // Maximum value
```

**Arrays:**
```javascript
{{ $json.items.length }}             // Array length
{{ $json.items.map(i => i.name) }}   // Transform array
{{ $json.items.filter(i => i.active) }} // Filter array
{{ $json.items.reduce((sum, i) => sum + i.price, 0) }} // Sum
```

---

## Troubleshooting

### Common Issues

**1. Node Not Executing**
- Check connections between nodes
- Verify trigger is enabled
- Check node configuration
- Review execution logs

**2. Authentication Errors**
- Verify credentials in Credential Manager
- Check API key permissions
- Ensure credentials are not expired
- Test credentials independently

**3. Data Not Passing Between Nodes**
- Check node output format
- Verify expression syntax
- Use Debug node to inspect data
- Check for empty arrays/objects

**4. Timeout Errors**
- Increase node timeout setting
- Implement pagination for large datasets
- Use async operations where possible
- Split workflow into sub-workflows

**5. Rate Limiting**
- Implement retry logic with delays
- Use batch operations
- Add delay nodes between API calls
- Consider caching frequently accessed data

### Debugging Tools

**1. Execution Log**
- View detailed execution history
- Inspect node input/output
- Check error messages
- Track execution time

**2. Debug Node**
- Add Debug node to inspect data
- Pause execution at specific points
- Log data to console
- Verify transformations

**3. Test Mode**
- Use sample data for testing
- Test individual nodes
- Verify error handling
- Check edge cases

---

## Getting Help

**Documentation:**
- [Node Reference](/docs/NODE_REFERENCE.md)
- [API Documentation](/docs/API.md)
- [Development Guide](/docs/DEVELOPMENT.md)

**Community:**
- GitHub Issues: Bug reports and feature requests
- Discord: Real-time community support
- Forum: Discussions and best practices

**Enterprise Support:**
- 24/7 support for enterprise customers
- Dedicated support engineer
- Priority bug fixes
- Custom integration development

---

**Last Updated:** 2025-01-18
**Version:** 2.0.0
