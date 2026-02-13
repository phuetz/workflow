# Webhook Signature Verification Migration Guide

## CRITICAL SECURITY UPDATE - P1 PRIORITY

**Effective Date:** Immediate
**Impact:** Breaking change for all webhooks
**Severity:** Critical (9/10)

---

## Summary

Webhook signature verification is now **MANDATORY** for all webhook endpoints. This critical security fix prevents unauthorized workflow execution.

### What Changed

**Before:**
- Signature verification was optional
- Webhooks could be triggered without authentication
- Anyone with the webhook URL could execute workflows

**After:**
- Signature verification is required for all webhooks
- Webhooks without valid signatures are rejected with 401 Unauthorized
- Each webhook must have a configured secret

---

## Migration Steps

### Step 1: Configure Webhook Secrets

For each webhook, generate and configure a secret key:

```bash
# Generate a secure random secret
SECRET=$(openssl rand -hex 32)

# Configure the secret for your webhook
curl -X POST https://your-domain.com/api/webhooks/{webhook-id}/secret \
  -H "Content-Type: application/json" \
  -d "{\"secret\": \"$SECRET\"}"
```

**Response:**
```json
{
  "success": true
}
```

### Step 2: Update Webhook Callers

Update all systems that call your webhooks to include the signature header.

#### Signature Format

The signature uses HMAC-SHA256 with the following format:

```
x-webhook-signature: sha256={signature}
```

Where `{signature}` is the hex-encoded HMAC-SHA256 of the request body.

#### Implementation Examples

##### JavaScript/Node.js

```javascript
const crypto = require('crypto');

// Your webhook configuration
const webhookUrl = 'https://your-domain.com/api/webhooks/webhook-123';
const secret = 'your-secret-key';
const payload = {
  event: 'order.created',
  data: { orderId: 123 }
};

// Compute signature
const rawBody = JSON.stringify(payload);
const signature = crypto
  .createHmac('sha256', secret)
  .update(rawBody)
  .digest('hex');

// Send request
const response = await fetch(webhookUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-webhook-signature': `sha256=${signature}`
  },
  body: rawBody
});
```

##### Python

```python
import hmac
import hashlib
import json
import requests

# Your webhook configuration
webhook_url = 'https://your-domain.com/api/webhooks/webhook-123'
secret = 'your-secret-key'
payload = {
    'event': 'order.created',
    'data': {'orderId': 123}
}

# Compute signature
raw_body = json.dumps(payload)
signature = hmac.new(
    secret.encode(),
    raw_body.encode(),
    hashlib.sha256
).hexdigest()

# Send request
response = requests.post(
    webhook_url,
    headers={
        'Content-Type': 'application/json',
        'x-webhook-signature': f'sha256={signature}'
    },
    data=raw_body
)
```

##### cURL

```bash
#!/bin/bash

WEBHOOK_URL="https://your-domain.com/api/webhooks/webhook-123"
SECRET="your-secret-key"
PAYLOAD='{"event":"order.created","data":{"orderId":123}}'

# Compute signature
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" | sed 's/^.* //')

# Send request
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "x-webhook-signature: sha256=$SIGNATURE" \
  -d "$PAYLOAD"
```

##### Go

```go
package main

import (
    "bytes"
    "crypto/hmac"
    "crypto/sha256"
    "encoding/hex"
    "encoding/json"
    "fmt"
    "net/http"
)

func sendWebhook(webhookURL, secret string, payload map[string]interface{}) error {
    // Marshal payload
    rawBody, err := json.Marshal(payload)
    if err != nil {
        return err
    }

    // Compute signature
    h := hmac.New(sha256.New, []byte(secret))
    h.Write(rawBody)
    signature := hex.EncodeToString(h.Sum(nil))

    // Create request
    req, err := http.NewRequest("POST", webhookURL, bytes.NewBuffer(rawBody))
    if err != nil {
        return err
    }

    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("x-webhook-signature", fmt.Sprintf("sha256=%s", signature))

    // Send request
    client := &http.Client{}
    resp, err := client.Do(req)
    if err != nil {
        return err
    }
    defer resp.Body.Close()

    return nil
}
```

---

## Error Responses

### 400 Bad Request - No Secret Configured

```json
{
  "error": "Webhook signature verification must be enabled. Configure a secret via POST /api/webhooks/webhook-123/secret"
}
```

**Action:** Configure a secret for the webhook (see Step 1).

### 401 Unauthorized - Missing Signature

```json
{
  "error": "Missing webhook signature. Include signature in x-webhook-signature or x-signature header."
}
```

**Action:** Add signature header to your requests (see Step 2).

### 401 Unauthorized - Invalid Signature

```json
{
  "error": "Invalid webhook signature"
}
```

**Possible Causes:**
- Wrong secret used
- Payload was modified after signature generation
- Signature format is incorrect
- Signature algorithm doesn't match (must be SHA-256)

**Action:** Verify signature computation matches the examples above.

---

## Testing Your Implementation

### 1. Test Secret Configuration

```bash
# Configure secret
curl -X POST https://your-domain.com/api/webhooks/test-webhook/secret \
  -H "Content-Type: application/json" \
  -d '{"secret": "test-secret-123"}'
```

### 2. Test Valid Signature

```bash
# Generate signature
PAYLOAD='{"test":true}'
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "test-secret-123" | sed 's/^.* //')

# Send request
curl -X POST https://your-domain.com/api/webhooks/test-webhook \
  -H "Content-Type: application/json" \
  -H "x-webhook-signature: sha256=$SIGNATURE" \
  -d "$PAYLOAD"
```

**Expected Response (202 Accepted):**
```json
{
  "accepted": true
}
```

### 3. Test Invalid Signature

```bash
# Send request with wrong signature
curl -X POST https://your-domain.com/api/webhooks/test-webhook \
  -H "Content-Type: application/json" \
  -H "x-webhook-signature: sha256=invalid-signature" \
  -d '{"test":true}'
```

**Expected Response (401 Unauthorized):**
```json
{
  "error": "Invalid webhook signature"
}
```

---

## Security Best Practices

### 1. Secret Management

✅ **DO:**
- Generate secrets using cryptographically secure random generators
- Use at least 32 bytes (256 bits) of entropy
- Store secrets securely (environment variables, secret managers)
- Rotate secrets periodically (e.g., every 90 days)
- Use different secrets for each webhook

❌ **DON'T:**
- Use predictable secrets (e.g., "password123")
- Hardcode secrets in source code
- Share secrets via insecure channels (email, chat)
- Reuse the same secret across multiple webhooks

### 2. Signature Verification

✅ **DO:**
- Use timing-safe comparison functions (built into the platform)
- Verify signatures on every request
- Reject requests with missing or invalid signatures
- Log failed verification attempts

❌ **DON'T:**
- Skip signature verification in development
- Use simple string comparison (vulnerable to timing attacks)
- Trust webhook requests without verification

### 3. Network Security

✅ **DO:**
- Use HTTPS for all webhook traffic
- Implement rate limiting
- Monitor for suspicious activity
- Use IP whitelisting where possible

---

## Frequently Asked Questions

### Q: Can I disable signature verification?

**A:** No. Signature verification is mandatory for security reasons. All webhooks must have a configured secret and valid signature.

### Q: What if I need to support legacy systems that can't add signatures?

**A:** You have two options:
1. Update the legacy system to support signature generation (recommended)
2. Create a proxy service that adds signatures to requests from the legacy system

### Q: How do I rotate webhook secrets?

**A:**
1. Generate a new secret
2. Update the webhook configuration: `POST /api/webhooks/:id/secret`
3. Update all webhook callers to use the new secret
4. Monitor for failed requests from systems using the old secret

### Q: Can I use the same secret for multiple webhooks?

**A:** While technically possible, we strongly recommend using unique secrets for each webhook to limit the impact of a compromised secret.

### Q: What signature algorithms are supported?

**A:** Currently, only HMAC-SHA256 is supported. This is the industry standard used by GitHub, Stripe, Shopify, and many other services.

### Q: How long are secrets valid?

**A:** Secrets don't expire automatically, but we recommend rotating them every 90 days as a security best practice.

---

## Rollback Plan (Emergency Only)

⚠️ **WARNING:** Only use this in emergency situations. This reintroduces the security vulnerability.

If you absolutely must temporarily disable signature verification:

1. Contact your system administrator
2. Document the business justification
3. Create a temporary exemption (requires code change)
4. Set a deadline to re-enable verification (maximum 7 days)
5. Implement monitoring for unauthorized access

**Note:** Disabling signature verification is strongly discouraged and should only be used as a last resort during migration.

---

## Support

If you encounter issues during migration:

1. Review the error messages and implementation examples above
2. Test your signature generation using the provided test scripts
3. Check the application logs for detailed error information
4. Contact the security team for assistance

---

## Timeline

| Date | Action | Status |
|------|--------|--------|
| Immediate | Security fix deployed | ✅ Complete |
| Day 1-7 | Migration period | 🔄 In Progress |
| Day 7+ | All webhooks must have signatures | ⏳ Required |

---

## Additional Resources

- [HMAC Wikipedia](https://en.wikipedia.org/wiki/HMAC)
- [GitHub Webhook Signatures](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries)
- [Stripe Webhook Signatures](https://stripe.com/docs/webhooks/signatures)
- [OAuth 2.0 Security Best Practices](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)

---

**Last Updated:** 2025-01-23
**Version:** 1.0
**Severity:** Critical (P1)
