# Password Security Guide

## 📋 Table of Contents

1. [Overview](#overview)
2. [Password Hashing](#password-hashing)
3. [Password Strength Validation](#password-strength-validation)
4. [Breach Detection](#breach-detection)
5. [Password History](#password-history)
6. [Password Reset Flow](#password-reset-flow)
7. [Best Practices](#best-practices)
8. [API Reference](#api-reference)
9. [Troubleshooting](#troubleshooting)

---

## Overview

Enterprise-grade password security system implementing OWASP, NIST, and PCI DSS recommendations.

### Key Features

- ✅ **Argon2id Hashing** - Winner of Password Hashing Competition
- ✅ **Strength Validation** - 100-point scoring system
- ✅ **Breach Detection** - Have I Been Pwned integration
- ✅ **Password History** - Prevent reuse of last 24 passwords
- ✅ **Secure Reset Flow** - Cryptographically secure tokens
- ✅ **Rate Limiting** - Prevent brute force attacks
- ✅ **Audit Logging** - Complete password activity tracking

### Security Standards

| Standard | Requirements | Status |
|----------|--------------|--------|
| **OWASP** | Argon2id, salting, breach checking | ✅ |
| **NIST SP 800-63B** | Entropy, breach detection, history | ✅ |
| **PCI DSS** | Complex passwords, history (24), expiry | ✅ |
| **SOC 2** | Access control, audit logging | ✅ |
| **ISO 27001** | Password management | ✅ |

---

## Password Hashing

### Argon2id Algorithm

Uses Argon2id with OWASP-recommended parameters:

```typescript
{
  memoryCost: 65536,    // 64 MB
  timeCost: 3,          // 3 iterations
  parallelism: 4,       // 4 threads
  hashLength: 32        // 32 bytes (256 bits)
}
```

**Why Argon2id?**
- Winner of Password Hashing Competition (2015)
- Resistant to GPU attacks
- Resistant to side-channel attacks
- Configurable memory/time costs
- Hybrid mode (best of Argon2i and Argon2d)

### Usage

```typescript
import { getPasswordHashingService } from './backend/auth/PasswordHashingService';

const hashingService = getPasswordHashingService();

// Hash password
const hash = await hashingService.hash('MySecurePassword123!');
// Returns: $argon2id$v=19$m=65536,t=3,p=4$...

// Verify password
const isValid = await hashingService.verify(hash, 'MySecurePassword123!');
// Returns: true

// Check if hash needs rehashing (parameters changed)
const needsRehash = hashingService.needsRehash(hash);
if (needsRehash) {
  const newHash = await hashingService.hash(password);
  // Update database
}
```

### Performance

- **Hash time**: ~500ms (intentionally slow to prevent brute force)
- **Verify time**: ~500ms
- **Memory usage**: 64 MB per hash operation

### Custom Parameters

```typescript
// For high-security applications
const hash = await hashingService.hash(password, {
  memoryCost: 131072,   // 128 MB
  timeCost: 4,          // 4 iterations
  parallelism: 8        // 8 threads
});

// Get recommended parameters for target time
const options = await hashingService.getRecommendedOptions(1000); // 1 second
```

---

## Password Strength Validation

### Scoring System (0-100)

| Score | Strength | Description |
|-------|----------|-------------|
| 80-100 | Very Strong | Excellent password |
| 60-79 | Strong | Good password |
| 40-59 | Fair | Acceptable but could be stronger |
| 20-39 | Weak | Easily crackable |
| 0-19 | Very Weak | Do not use |

### Validation Criteria

1. **Length** (0-25 points)
   - 16+ characters: 25 points
   - 12-15 characters: 20 points
   - <12 characters: penalty

2. **Complexity** (0-40 points)
   - Uppercase letters: +10
   - Lowercase letters: +10
   - Numbers: +10
   - Special characters: +10

3. **Character Diversity** (0-15 points)
   - Unique characters bonus

4. **Entropy** (0-20 points)
   - Based on character set size and length

5. **Penalties** (deductions)
   - Common password: -30
   - Dictionary words: -10
   - Sequential chars: -15
   - Repeated chars: -10
   - Keyboard patterns: -10
   - Personal info: -20

### Usage

```typescript
import { getPasswordStrengthValidator } from './backend/auth/PasswordStrengthValidator';

const validator = getPasswordStrengthValidator();

const result = validator.validate('MyStr0ng!Pass@2024');

console.log(result);
```

**Output:**
```javascript
{
  isValid: true,
  score: 85,
  strength: 'very-strong',
  feedback: ['Strong password!'],
  requirements: {
    minLength: true,
    hasUppercase: true,
    hasLowercase: true,
    hasNumber: true,
    hasSpecialChar: true,
    noCommonPassword: true,
    noSequential: true,
    noRepeated: true
  },
  estimatedCrackTime: 'Millions of years'
}
```

### Custom Validation Options

```typescript
const result = validator.validate(password, {
  minLength: 16,              // Require 16+ characters
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  checkCommonPasswords: true,
  checkSequential: true,
  checkRepeated: true,
  personalInfo: [              // Block personal information
    user.email,
    user.firstName,
    user.lastName
  ]
});
```

### Password Generation

```typescript
// Generate strong random password
const password = validator.generateStrongPassword(16);
// Returns: xK9#mQ2$vL7@pN4!
```

---

## Breach Detection

### Have I Been Pwned Integration

Checks passwords against 600+ million breached passwords using k-anonymity model.

**Privacy Protection:**
- Only sends first 5 characters of SHA-1 hash
- Never sends actual password
- Compares remaining hash locally
- No tracking or logging

### Usage

```typescript
import { getPasswordBreachChecker } from './backend/auth/PasswordBreachChecker';

const breachChecker = getPasswordBreachChecker();

const result = await breachChecker.checkPassword('password');

console.log(result);
```

**Output:**
```javascript
{
  isBreached: true,
  breachCount: 3730471,
  severity: 'critical',
  recommendation: '🔥 This password has been seen 3,730,471 times in data breaches! This is an extremely common password. Never use this password.'
}
```

### Severity Levels

| Severity | Breach Count | Action |
|----------|--------------|--------|
| **Safe** | 0 | ✅ Password can be used |
| **Low** | 1-9 | ⚠️ Consider different password |
| **Medium** | 10-99 | 🚨 Choose different password immediately |
| **High** | 100-999 | 🔥 Highly compromised, use unique password |
| **Critical** | 1000+ | 🔥 Extremely common, never use |

### Caching

```typescript
// 5-minute cache for API responses
const stats = breachChecker.getCacheStats();
console.log(stats); // { size: 42, hitRate: 0.85 }

// Clear cache
breachChecker.clearCache();
```

### Health Check

```typescript
const isHealthy = await breachChecker.healthCheck();
if (!isHealthy) {
  console.error('HIBP API is unavailable');
}
```

---

## Password History

### Policy

Default policy (PCI DSS compliant):
- **History Size**: 24 passwords
- **Minimum Age**: 1 hour between changes
- **Maximum Age**: 90 days before expiry

### Usage

```typescript
import { getPasswordHistoryManager } from './backend/auth/PasswordHistoryManager';

const historyManager = getPasswordHistoryManager();

// Check if password can be used
const check = await historyManager.canUsePassword(userId, newPassword);

if (!check.canUse) {
  console.log(check.reason);
  // "This password was used 2 months ago. Please choose a different password."
}

// Add password to history (after hashing)
await historyManager.addToHistory(userId, passwordHash);

// Get password statistics
const stats = await historyManager.getPasswordStats(userId);
console.log(stats);
```

**Statistics Output:**
```javascript
{
  totalChanges: 15,
  lastChanged: 2025-01-15T10:30:00Z,
  passwordAge: '5 days',
  daysUntilExpiry: 85,
  changesThisYear: 3
}
```

### Minimum Age Enforcement

```typescript
// Check if user can change password now
const canChange = await historyManager.canChangePassword(userId);

if (!canChange.allowed) {
  console.log(canChange.reason);
  console.log('Next allowed:', canChange.nextAllowedChange);
}
```

### Expiration Check

```typescript
const expiry = await historyManager.isPasswordExpired(userId);

if (expiry.expired) {
  console.log(`Password expired ${expiry.age} ago`);
  console.log(`Expired at: ${expiry.expiresAt}`);
  // Force password change
}
```

### Custom Policy

```typescript
historyManager.setPolicy({
  historySize: 12,      // Remember 12 passwords
  minimumAge: 24,       // 24 hours minimum
  maximumAge: 60,       // 60 days maximum
  enforceHistory: true
});
```

---

## Password Reset Flow

### Secure Token Generation

- **Token Length**: 32 bytes (256 bits)
- **Encoding**: Hexadecimal
- **Storage**: Hashed with Argon2id
- **Expiry**: 1 hour
- **Single Use**: Invalidated after use

### Request Reset

```typescript
import { getPasswordResetService } from './backend/auth/PasswordResetService';

const resetService = getPasswordResetService();

const result = await resetService.requestReset({
  email: 'user@example.com',
  ipAddress: req.ip
});

console.log(result.message);
// "If an account exists with that email, you will receive password reset instructions."
```

**Features:**
- Same response for valid/invalid emails (prevent enumeration)
- Rate limiting (3 per email/hour, 10 per IP/hour)
- Token sent via email
- Audit logging

### Reset Password

```typescript
const result = await resetService.resetPassword({
  token: resetToken,
  newPassword: 'NewSecurePass123!',
  ipAddress: req.ip
});

if (result.success) {
  console.log('Password reset successfully');
} else {
  console.log('Error:', result.message);
  console.log('Details:', result.errors);
}
```

**Validation Steps:**
1. Token validity and expiration
2. Password strength check
3. Breach detection
4. Password history check
5. Hash password
6. Update database
7. Invalidate all sessions
8. Send confirmation email

### Verify Token

```typescript
const verification = await resetService.verifyToken(token);

if (verification.valid) {
  console.log('Token expires at:', verification.expiresAt);
} else {
  console.log('Invalid or expired token');
}
```

### Cleanup

```typescript
// Clean up expired tokens (run daily)
const deleted = await resetService.cleanupExpiredTokens();
console.log(`Deleted ${deleted} expired tokens`);
```

### Statistics

```typescript
const stats = await resetService.getResetStats(
  new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
);

console.log(stats);
```

**Output:**
```javascript
{
  totalRequests: 150,
  successfulResets: 120,
  failedResets: 30,
  expiredTokens: 10
}
```

---

## Best Practices

### For Users

1. **Create Strong Passwords**
   - Minimum 12 characters
   - Mix of uppercase, lowercase, numbers, and symbols
   - Avoid common words and patterns
   - Use password manager

2. **Avoid Reuse**
   - Use unique password for each service
   - Don't reuse old passwords
   - Enable password history checking

3. **Change Regularly**
   - Change password every 90 days
   - Change immediately if breach suspected
   - Use different password than previous 24

4. **Protect Your Password**
   - Never share passwords
   - Don't write down passwords
   - Use two-factor authentication
   - Beware of phishing

### For Developers

1. **Always Hash Passwords**
   ```typescript
   // ❌ NEVER store plain text
   user.password = password;

   // ✅ Always hash
   user.passwordHash = await hashingService.hash(password);
   ```

2. **Validate Before Storing**
   ```typescript
   // Check strength
   const strength = validator.validate(password);
   if (!strength.isValid) throw new Error(strength.feedback.join(', '));

   // Check breaches
   const breach = await breachChecker.checkPassword(password);
   if (breach.isBreached) throw new Error(breach.recommendation);

   // Check history
   const history = await historyManager.canUsePassword(userId, password);
   if (!history.canUse) throw new Error(history.reason);
   ```

3. **Use Secure Reset Flow**
   ```typescript
   // Generate secure token
   const token = crypto.randomBytes(32).toString('hex');

   // Store hashed token
   const tokenHash = await hashingService.hash(token);

   // Set expiration
   const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

   // Send unhashed token via email
   sendResetEmail(user.email, token);
   ```

4. **Implement Rate Limiting**
   ```typescript
   // Limit password attempts
   app.use('/auth/login', rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 5 // 5 attempts
   }));
   ```

5. **Log Security Events**
   ```typescript
   await prisma.auditLog.create({
     data: {
       userId,
       action: 'PASSWORD_CHANGED',
       ipAddress: req.ip
     }
   });
   ```

### For Administrators

1. **Configure Strong Policies**
   - Minimum 12-character passwords
   - Require complexity
   - Enforce history (24 passwords)
   - Set expiration (90 days)

2. **Monitor Password Activity**
   - Track failed login attempts
   - Alert on suspicious activity
   - Review password reset patterns
   - Audit password changes

3. **Educate Users**
   - Password security training
   - Phishing awareness
   - Two-factor authentication
   - Password manager recommendations

4. **Regular Security Audits**
   - Review password policies
   - Check for weak passwords
   - Verify breach detection working
   - Test reset flow security

---

## API Reference

### PasswordHashingService

```typescript
// Hash password
hash(password: string, options?: HashOptions): Promise<string>

// Verify password
verify(hash: string, password: string): Promise<boolean>

// Check if rehashing needed
needsRehash(hash: string, options?: HashOptions): boolean

// Get hash information
getHashInfo(hash: string): Promise<PasswordHashResult | null>

// Benchmark hash time
benchmarkHash(password?: string, options?: HashOptions): Promise<number>

// Get recommended options
getRecommendedOptions(targetMs?: number): Promise<HashOptions>
```

### PasswordStrengthValidator

```typescript
// Validate password strength
validate(password: string, options?: ValidationOptions): PasswordStrengthResult

// Generate strong password
generateStrongPassword(length?: number): string
```

### PasswordBreachChecker

```typescript
// Check single password
checkPassword(password: string): Promise<BreachCheckResult>

// Batch check passwords
checkPasswords(passwords: string[]): Promise<Map<string, BreachCheckResult>>

// Health check
healthCheck(): Promise<boolean>

// Cache management
getCacheStats(): { size: number; hitRate: number }
clearCache(): void
```

### PasswordHistoryManager

```typescript
// Check if password can be used
canUsePassword(userId: string, password: string, policy?: PasswordHistoryPolicy): Promise<PasswordReuseCheckResult>

// Add to history
addToHistory(userId: string, passwordHash: string): Promise<void>

// Get password history
getPasswordHistory(userId: string, limit?: number): Promise<PasswordHistoryEntry[]>

// Check if can change password
canChangePassword(userId: string, minimumAgeHours?: number): Promise<{allowed: boolean; reason?: string}>

// Check if password expired
isPasswordExpired(userId: string, maximumAgeDays?: number): Promise<{expired: boolean; age?: string}>

// Get statistics
getPasswordStats(userId: string): Promise<PasswordStats>

// Delete user history
deleteUserHistory(userId: string): Promise<void>
```

### PasswordResetService

```typescript
// Request reset
requestReset(request: ResetRequest): Promise<ResetRequestResult>

// Reset password
resetPassword(request: ResetPasswordRequest): Promise<ResetPasswordResult>

// Verify token
verifyToken(token: string): Promise<{valid: boolean; expiresAt?: Date; userId?: string}>

// Cleanup expired tokens
cleanupExpiredTokens(): Promise<number>

// Get statistics
getResetStats(since: Date): Promise<ResetStats>
```

---

## Troubleshooting

### Common Issues

#### "Password hashing is slow"

**Expected behavior.** Argon2id is intentionally slow (~500ms) to prevent brute force attacks.

**Solutions:**
- Use async/await properly
- Don't hash on main thread in UI
- Consider using Web Workers in browser
- Cache authentication results

#### "Breach check fails"

**Check:**
1. Internet connectivity
2. Have I Been Pwned API status
3. Firewall/proxy settings
4. Rate limits (1500 requests/5 min)

**Fallback:**
```typescript
try {
  const breach = await breachChecker.checkPassword(password);
} catch (error) {
  // Log error but allow password (fail open)
  console.error('Breach check failed:', error);
}
```

#### "Password history not enforced"

**Check:**
1. Policy enabled: `enforceHistory: true`
2. History added: `await historyManager.addToHistory(userId, hash)`
3. Database migration run
4. Correct userId used

#### "Reset tokens not working"

**Check:**
1. Token not expired (1 hour limit)
2. Token not already used
3. Token matches (case-sensitive)
4. IP address matches (if enforced)

---

## Database Schema

```prisma
model PasswordHistory {
  id            String   @id @default(cuid())
  userId        String
  passwordHash  String
  createdAt     DateTime @default(now())

  @@map("password_history")
  @@index([userId])
}

model PasswordResetToken {
  id          String    @id @default(cuid())
  userId      String
  token       String    // Hashed
  expiresAt   DateTime
  createdAt   DateTime  @default(now())
  used        Boolean   @default(false)
  usedAt      DateTime?
  ipAddress   String?

  @@map("password_reset_tokens")
  @@index([userId])
  @@index([expiresAt])
}
```

---

## Support

For password security questions or issues:

- 📧 **Security Team**: security@workflow-platform.com
- 📚 **Documentation**: https://docs.workflow-platform.com/security/passwords
- 🐛 **Report Issues**: https://github.com/yourusername/workflow-platform/issues

---

**Last Updated:** January 2025
**Version:** 1.0.0
**Status:** ✅ Production Ready
