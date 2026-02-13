# SECURITY AUDIT - QUICK REFERENCE GUIDE

## Critical Issues - Fix Immediately

### 1. Remove Secrets from Git
```bash
git rm --cached .env
git rm --cached .env.test  
git rm --cached .env.transformation
git commit -m "Remove sensitive environment files"
# Check history: git log -p --all -S "your-super-secret" -- .env
```

### 2. Replace new Function() with VM2
**File**: `src/expressions/ExpressionEngine.ts`
```typescript
// BEFORE (UNSAFE):
const fn = new Function(...paramNames, wrappedExpression);

// AFTER (SAFE):
import { NodeVM } from 'vm2';
const vm = new NodeVM({ timeout: 5000, eval: false });
const result = vm.run(wrappedExpression);
```

### 3. Fix Password Hashing
**File**: `src/backend/auth/passwordService.ts`
```typescript
import bcryptjs from 'bcryptjs';

async hashPassword(password: string): Promise<string> {
  return bcryptjs.hash(password, 12);
}

async verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcryptjs.compare(password, hash);
}
```

### 4. Require Auth on Webhooks
**File**: `src/backend/api/routes/webhooks.ts`
```typescript
import { authMiddleware } from '../middleware/auth';

// Add authMiddleware to webhook endpoint
router.post('/:id', authMiddleware, asyncHandler(async (req, res) => {
  // Require secret configuration
  const secret = await getWebhookSecret(req.params.id);
  if (!secret) {
    throw new ApiError(400, 'Webhook secret required');
  }
  // ... validate signature
}));
```

### 5. Fix Code Execution Service
**File**: `src/backend/services/PythonExecutionService.ts`
```typescript
// Use Docker or proper sandboxing instead of exec()
// Option 1: Use Docker
import { execSync } from 'child_process';
execSync('docker run --rm -i --memory=512m --cpu-shares=1024 python:3.9 python', {
  input: userCode
});

// Option 2: Use vm2 for Node.js
import { NodeVM } from 'vm2';
const vm = new NodeVM({ timeout: 30000 });
vm.run(userCode);
```

## High Priority Issues

### 6. Add Input Validation
**All routes**: Use Zod for validation
```typescript
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1).max(200),
  kind: z.enum(['api', 'database', 'oauth'])
});

router.post('/', (req, res) => {
  const data = schema.parse(req.body); // Throws on invalid input
  // ... safe to use data
});
```

### 7. Add Ownership Checks (IDOR Prevention)
**Pattern for all resource endpoints**:
```typescript
router.get('/:id', authMiddleware, asyncHandler(async (req, res) => {
  const resource = await getResource(req.params.id);
  
  // MUST verify ownership
  if (resource.userId !== req.user.id) {
    throw new ApiError(403, 'Access denied');
  }
  
  res.json(resource);
}));
```

### 8. Fix CSP Headers
**File**: `src/backend/api/app.ts`
```typescript
helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"], // Remove 'unsafe-inline'
      imgSrc: ["'self'", "data:", "https:"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
    }
  }
});
```

### 9. Improve JWT Config
**File**: `src/backend/auth/jwt.ts`
```typescript
// Change refresh token expiry from 7 days to 3 days
private readonly refreshTokenExpiry: number = 3 * 24 * 60 * 60;

// Add token revocation for logout
private readonly tokenBlacklist: Set<string> = new Set();

async logout(jti: string): Promise<void> {
  this.tokenBlacklist.add(jti);
}
```

### 10. Update Environment Variables
**Files**: `.env`, `.env.example`
```env
# Enable production settings
NODE_ENV=production
VITE_DEBUG=false
SESSION_SECURE=true
SESSION_SAME_SITE=strict
DATABASE_SSL=true

# Change default secrets - use strong random values
JWT_SECRET=<generate 64-char random>
JWT_REFRESH_SECRET=<generate 64-char random>
SESSION_SECRET=<generate 64-char random>
ENCRYPTION_MASTER_KEY=<generate 256-bit random>
```

## Medium Priority Issues

### 11. Add Rate Limiting to Metrics
```typescript
const metricsLimiter = rateLimit({ windowMs: 60000, max: 30 });
app.get('/metrics', metricsLimiter, asyncHandler(...));
app.get('/health', metricsLimiter, asyncHandler(...));
```

### 12. Persist Audit Logs
```typescript
// Move from memory to database
async logAction(entry: AuditLogEntry) {
  await db.auditLog.create({
    ...entry,
    timestamp: new Date()
  });
}
```

### 13. Enforce HTTPS
```typescript
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}
```

### 14. Stricter CORS
```typescript
const allowedOrigins = (process.env.CORS_ORIGIN || '').split(',');
if (!allowedOrigins.length || allowedOrigins.includes('*')) {
  throw new Error('CORS_ORIGIN must be explicitly configured');
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || !allowedOrigins.includes(origin)) {
      return callback(new Error('Origin not allowed'));
    }
    callback(null, true);
  },
  credentials: true
}));
```

## Verification Checklist

- [ ] `.env` files removed from git history
- [ ] `new Function()` replaced with VM2
- [ ] Password hashing uses bcryptjs
- [ ] Webhooks require authentication
- [ ] Code execution properly sandboxed
- [ ] All endpoints have input validation
- [ ] All resource endpoints check ownership
- [ ] CSP headers fixed
- [ ] JWT configuration hardened
- [ ] Production environment variables set
- [ ] Rate limiting on all endpoints
- [ ] Audit logs persisted to database
- [ ] HTTPS redirect enabled
- [ ] CORS properly configured

## Testing Commands

```bash
# Check for exposed secrets
git log -p --all | grep -i "password\|secret\|api.?key"

# Run npm audit
npm audit --production

# Check for common vulnerabilities
npm run lint -- --rule security/*

# Validate environment
npm run typecheck

# Test security headers
curl -I https://your-domain.com

# Test rate limiting
for i in {1..10}; do curl https://api/health; done
```

## Deployment Checklist

**Before going to production:**

- [ ] Security audit report reviewed and signed off
- [ ] All critical issues resolved
- [ ] Secrets rotated and stored in vault
- [ ] Penetration test completed
- [ ] Security headers verified
- [ ] Rate limiting tested
- [ ] Audit logging enabled and tested
- [ ] HTTPS configured
- [ ] WAF rules configured
- [ ] DDoS protection enabled
- [ ] Monitoring and alerting set up
- [ ] Incident response plan documented

## Contact & Resources

- **OWASP Top 10**: https://owasp.org/Top10/
- **Node.js Security**: https://nodejs.org/en/docs/guides/security/
- **Express.js Security**: https://expressjs.com/en/advanced/best-practice-security.html
- **Helmet.js**: https://helmetjs.github.io/

## Severity Summary

| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL | 5 | MUST FIX |
| HIGH | 10 | MUST FIX |
| MEDIUM | 12 | SHOULD FIX |
| LOW | 8 | NICE TO FIX |
| **TOTAL** | **35** | - |

---

Last Updated: October 23, 2025
