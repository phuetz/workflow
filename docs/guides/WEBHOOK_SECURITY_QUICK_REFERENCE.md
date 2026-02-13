# Webhook Security Quick Reference

**🔒 MANDATORY SIGNATURE VERIFICATION**

---

## For Webhook Creators

### 1. Configure Secret (One-time)

```bash
# Generate a secure random secret
SECRET=$(openssl rand -hex 32)

# Configure the webhook
curl -X POST https://your-app.com/api/webhooks/YOUR_WEBHOOK_ID/secret \
  -H "Content-Type: application/json" \
  -d "{\"secret\": \"$SECRET\"}"
```

**Save this secret securely!** You'll need it to call the webhook.

---

## For Webhook Callers

### Quick Implementation

#### JavaScript
```javascript
const crypto = require('crypto');

const secret = 'your-webhook-secret';
const payload = JSON.stringify({ event: 'test' });
const signature = crypto.createHmac('sha256', secret)
  .update(payload).digest('hex');

await fetch('https://your-app.com/api/webhooks/YOUR_WEBHOOK_ID', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-webhook-signature': `sha256=${signature}`
  },
  body: payload
});
```

#### Python
```python
import hmac, hashlib, json, requests

secret = 'your-webhook-secret'
payload = json.dumps({'event': 'test'})
signature = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()

requests.post('https://your-app.com/api/webhooks/YOUR_WEBHOOK_ID',
  headers={'x-webhook-signature': f'sha256={signature}'},
  data=payload)
```

#### cURL
```bash
SECRET="your-webhook-secret"
PAYLOAD='{"event":"test"}'
SIG=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" | sed 's/^.* //')

curl -X POST https://your-app.com/api/webhooks/YOUR_WEBHOOK_ID \
  -H "x-webhook-signature: sha256=$SIG" \
  -d "$PAYLOAD"
```

---

## Error Messages

| Error | Cause | Fix |
|-------|-------|-----|
| `400: Webhook signature verification must be enabled` | No secret configured | Configure secret (see step 1) |
| `401: Missing webhook signature` | No signature header | Add `x-webhook-signature` header |
| `401: Invalid webhook signature` | Wrong signature | Check secret and payload match |

---

## Checklist

- [ ] Secret configured for webhook
- [ ] Secret stored securely (env var, secret manager)
- [ ] Signature generated using HMAC-SHA256
- [ ] Signature includes FULL request body
- [ ] Signature sent in `x-webhook-signature` or `x-signature` header
- [ ] Signature format: `sha256={hex_signature}`
- [ ] Using HTTPS (not HTTP)

---

## Testing Your Implementation

```bash
# Test endpoint (replace with your values)
SECRET="test-secret-123"
WEBHOOK_URL="https://your-app.com/api/webhooks/test"
PAYLOAD='{"test":true}'

# Generate signature
SIG=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" | sed 's/^.* //')

# Send request
curl -v -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "x-webhook-signature: sha256=$SIG" \
  -d "$PAYLOAD"

# Expected: HTTP 202 with {"accepted": true}
```

---

## Common Mistakes

❌ **Don't stringify the payload twice**
```javascript
// WRONG
const signature = crypto.createHmac('sha256', secret)
  .update(JSON.stringify(JSON.stringify(payload))) // ❌ Double stringify
  .digest('hex');
```

✅ **Do stringify once**
```javascript
// CORRECT
const payloadString = JSON.stringify(payload);
const signature = crypto.createHmac('sha256', secret)
  .update(payloadString) // ✅ Stringify once
  .digest('hex');
```

---

❌ **Don't modify payload after computing signature**
```javascript
// WRONG
const signature = computeSignature(payload);
payload.timestamp = Date.now(); // ❌ Modified after signature
sendRequest(payload, signature);
```

✅ **Do compute signature on final payload**
```javascript
// CORRECT
payload.timestamp = Date.now(); // ✅ Modify first
const signature = computeSignature(payload);
sendRequest(payload, signature);
```

---

❌ **Don't use different secrets**
```javascript
// WRONG - signature secret doesn't match configured secret
const signature = computeSignature(payload, 'wrong-secret'); // ❌
```

✅ **Do use the same secret**
```javascript
// CORRECT - use the secret you configured
const signature = computeSignature(payload, configuredSecret); // ✅
```

---

## Security Best Practices

🔐 **Secret Management**
- Generate: `openssl rand -hex 32` (256 bits minimum)
- Store: Environment variables or secret manager (NOT in code)
- Rotate: Every 90 days
- Unique: Different secret per webhook

🌐 **Network Security**
- Always use HTTPS (never HTTP)
- Implement IP whitelisting if possible
- Use rate limiting
- Monitor for suspicious activity

📊 **Monitoring**
- Log all webhook calls
- Alert on repeated signature failures
- Track webhook usage patterns
- Review logs regularly

---

## Need Help?

**Full Documentation:** [WEBHOOK_SIGNATURE_MIGRATION_GUIDE.md](./WEBHOOK_SIGNATURE_MIGRATION_GUIDE.md)

**Security Advisory:** [SECURITY_ADVISORY_WEBHOOK_2025_01.md](./SECURITY_ADVISORY_WEBHOOK_2025_01.md)

**Support:** security@example.com

---

**Last Updated:** 2025-01-23
**Quick Reference Version:** 1.0
