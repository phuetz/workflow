# 🚨 CRITICAL SECURITY ALERT: passport-saml Vulnerability

**Severity:** CRITICAL
**CVE:** GHSA-4mxg-3p6v-xgq3
**Date Identified:** 2025-11-01
**Status:** ⚠️ NO FIX AVAILABLE

## Summary

The `passport-saml` package has a **CRITICAL vulnerability** in SAML signature verification. This package **IS ACTIVELY USED** in the codebase at:

```
src/backend/auth/SSOService.ts
```

## Vulnerability Details

- **Issue:** Node-SAML SAML Signature Verification Vulnerability
- **Impact:** Attackers may bypass SAML authentication by exploiting signature verification weaknesses
- **Affected Versions:** All versions of passport-saml
- **Root Cause:** Depends on vulnerable xml2js (<0.5.0) with prototype pollution vulnerability
- **Fix Available:** ❌ **NO** - xml2js@0.5.0 not yet released

## Code Location

### File: `src/backend/auth/SSOService.ts`

```typescript
import { Strategy as SamlStrategy, Profile, VerifiedCallback } from 'passport-saml';
```

This import indicates active use of passport-saml for Single Sign-On (SSO) authentication.

## Risk Assessment

### Severity: CRITICAL

**Why this is critical:**
1. **Authentication Bypass:** Attackers could potentially forge SAML responses
2. **Privilege Escalation:** Could gain unauthorized access to user accounts
3. **No Patch Available:** Cannot be fixed with simple dependency update
4. **Active Use:** The vulnerable code is deployed and operational

### Attack Vector

1. Attacker crafts malicious SAML response
2. Exploits signature verification weakness
3. Bypasses authentication checks
4. Gains unauthorized access to the platform

## Immediate Actions Required

### 1. Audit SAML Usage (P0 - IMMEDIATE)

```bash
# Check if SAML authentication is actively used
grep -r "SamlStrategy" src/
grep -r "saml" src/ --include="*.ts" --include="*.tsx"

# Check environment variables
grep -i "saml" .env .env.example .env.production.example

# Check if SAML routes are exposed
grep -r "sso" src/backend/api/routes/
```

### 2. Disable SAML if Not Required (P0)

If SAML/SSO is **not actively used in production**:

```typescript
// Option A: Comment out SAML strategy in SSOService.ts
// import { Strategy as SamlStrategy } from 'passport-saml';

// Option B: Add feature flag
if (process.env.ENABLE_SAML === 'true') {
  // Only enable if explicitly required
}

// Option C: Disable SAML routes
// Comment out SAML endpoints in src/backend/api/routes/sso.ts
```

### 3. If SAML Must Remain Active (P0 - MITIGATION)

Implement additional validation layers:

```typescript
// src/backend/auth/SSOService.ts

// Add custom signature validation
function validateSamlSignature(samlResponse: string): boolean {
  // 1. Verify XML structure
  if (!samlResponse || typeof samlResponse !== 'string') {
    throw new Error('Invalid SAML response format');
  }

  // 2. Additional signature checks
  // Implement cryptographic verification beyond passport-saml

  // 3. Whitelist trusted identity providers
  const trustedIssuers = process.env.SAML_TRUSTED_ISSUERS?.split(',') || [];
  // Verify issuer is in whitelist

  // 4. Check response timestamps
  // Reject old or future-dated responses

  // 5. Validate assertion attributes
  // Ensure required fields are present and valid

  return true;
}

// Wrap passport-saml callback
passport.use(new SamlStrategy(config, (profile, done) => {
  try {
    // ADDITIONAL VALIDATION HERE
    if (!validateSamlSignature(profile.getAssertionXml())) {
      return done(new Error('SAML signature validation failed'));
    }

    // Original callback logic
    done(null, profile);
  } catch (error) {
    logger.error('SAML validation error', { error });
    done(error);
  }
}));
```

### 4. Alternative Solutions (P1 - Plan)

#### Option A: Switch to Alternative Library
```bash
# Consider these alternatives:
npm install @node-saml/node-saml  # More actively maintained
# OR
npm install saml2-js              # Different implementation
```

#### Option B: Use External SAML Service
- **Auth0**: Managed SAML authentication
- **Okta**: Enterprise SSO platform
- **Azure AD**: Microsoft's SSO service
- Offload SAML complexity to external provider

#### Option C: Remove SAML Entirely
If SSO is not critical:
- Remove passport-saml dependency
- Use OAuth2 / OIDC instead (more secure, modern)
- Implement email/password + MFA

## Monitoring & Detection

### 1. Enable SAML Audit Logging

```typescript
// src/backend/auth/SSOService.ts

passport.use(new SamlStrategy(config, (profile, done) => {
  // LOG EVERY SAML AUTHENTICATION ATTEMPT
  logger.warn('SAML authentication attempt', {
    issuer: profile.issuer,
    nameID: profile.nameID,
    timestamp: new Date().toISOString(),
    sessionIndex: profile.sessionIndex,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });

  // Alert on suspicious patterns
  if (isSuspiciousSamlAttempt(profile)) {
    logger.error('SUSPICIOUS SAML ATTEMPT DETECTED', { profile });
    // Send alert to security team
    sendSecurityAlert('Suspicious SAML authentication', profile);
  }

  // Continue with authentication
  done(null, profile);
}));
```

### 2. Rate Limiting for SAML Endpoints

```typescript
// src/backend/api/routes/sso.ts

import rateLimit from 'express-rate-limit';

const samlRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window per IP
  message: 'Too many SAML authentication attempts',
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/saml/callback', samlRateLimiter, passport.authenticate('saml'));
```

### 3. Alert on Failed SAML Attempts

```typescript
// Integrate with monitoring system
const failedSamlAttempts = new Map<string, number>();

function trackFailedSaml(ip: string) {
  const count = (failedSamlAttempts.get(ip) || 0) + 1;
  failedSamlAttempts.set(ip, count);

  if (count > 3) {
    // Alert security team
    sendSecurityAlert(`Multiple failed SAML attempts from ${ip}`, { count });
  }
}
```

## Testing & Validation

### 1. Check if SAML is in Production Use

```bash
# Check production logs
grep -i "saml" /var/log/workflow/*.log | tail -100

# Check database for SAML users
# Run SQL query to find users authenticated via SAML
```

### 2. Penetration Testing

If SAML remains active:
- Engage security firm for SAML penetration testing
- Test with malformed SAML responses
- Verify signature validation works correctly
- Test replay attack prevention

## Timeline for Remediation

### Immediate (Next 24 hours)
- ✅ Audit current SAML usage
- ✅ Determine if SAML is production-critical
- ⬜ If not critical: **DISABLE SAML immediately**
- ⬜ If critical: Implement mitigation layers
- ⬜ Enable comprehensive SAML logging
- ⬜ Set up security alerts

### Short-term (1 week)
- ⬜ Evaluate alternative SAML libraries
- ⬜ Plan migration to @node-saml/node-saml or external provider
- ⬜ Implement additional signature validation
- ⬜ Add rate limiting to SAML endpoints
- ⬜ Security penetration testing

### Medium-term (2-4 weeks)
- ⬜ Migrate away from passport-saml
- ⬜ OR switch to managed SSO provider (Auth0, Okta)
- ⬜ Update documentation with new SSO flow
- ⬜ Full security audit of authentication system

## Communication

### Who Needs to Know

1. **Security Team** - Immediate notification
2. **DevOps Team** - For monitoring and alerting setup
3. **Product Team** - If SAML is customer-facing feature
4. **Management** - Critical security issue disclosure
5. **Customers** (if applicable) - If SAML SSO is offered as feature

### Message Template

```
Subject: CRITICAL SECURITY ALERT - passport-saml Vulnerability

Team,

A critical vulnerability (GHSA-4mxg-3p6v-xgq3) has been identified in the
passport-saml package used in our SSO authentication system.

Impact: Potential authentication bypass
Status: NO FIX AVAILABLE from upstream
Action: [IMMEDIATE/MITIGATION/DISABLED]

Next Steps:
1. [Action 1]
2. [Action 2]
3. [Action 3]

Timeline: [Date for resolution]
Contact: [Security Lead]
```

## Resources

- **CVE Details:** https://github.com/advisories/GHSA-4mxg-3p6v-xgq3
- **passport-saml Repository:** https://github.com/node-saml/passport-saml
- **Alternative: @node-saml/node-saml:** https://github.com/node-saml/node-saml
- **xml2js Issue:** https://github.com/advisories/GHSA-776f-qx25-q3cc

## Decision Log

| Date | Decision | Rationale | Responsible |
|------|----------|-----------|-------------|
| 2025-11-01 | Vulnerability identified | Dependency audit | DevOps |
| YYYY-MM-DD | [Decision] | [Rationale] | [Name] |

---

**Status:** ⚠️ OPEN - Awaiting immediate action
**Next Review:** [Date]
**Owner:** [Security Lead]
**Escalation:** [Management Contact]
