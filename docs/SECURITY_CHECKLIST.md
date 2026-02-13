# Security Checklist

## 🔐 Pre-Deployment Security Checklist

Use this checklist before deploying to production to ensure your application is secure.

### ✅ Environment Variables & Secrets

- [ ] **All `.env` files are ignored by git**
  ```bash
  git check-ignore -v .env .env.test .env.production
  ```

- [ ] **No `.env` files in git history**
  ```bash
  git log --all --full-history -- .env
  # Should return empty
  ```

- [ ] **Unique secrets generated for production**
  - [ ] JWT_SECRET (64+ characters)
  - [ ] JWT_REFRESH_SECRET (64+ characters)
  - [ ] SESSION_SECRET (64+ characters)
  - [ ] ENCRYPTION_MASTER_KEY (32 bytes base64)
  - [ ] ENCRYPTION_SALT (64 characters)

- [ ] **Different secrets for each environment** (dev ≠ staging ≠ production)

- [ ] **Secrets stored in secure secret manager**
  - [ ] AWS Secrets Manager / Parameter Store
  - [ ] HashiCorp Vault
  - [ ] Azure Key Vault
  - [ ] Google Secret Manager
  - [ ] Doppler / Infisical

- [ ] **No hardcoded secrets in source code**
  ```bash
  # Search for potential secrets
  grep -r "sk-" --include="*.ts" --include="*.tsx" --include="*.js"
  grep -r "api_key" --include="*.ts" --include="*.tsx" --include="*.js"
  ```

### ✅ Authentication & Authorization

- [ ] **HTTPS enforced in production**
  - [ ] `SESSION_SECURE=true`
  - [ ] `CORS_ORIGIN` set to production domain
  - [ ] No HTTP URLs in production config

- [ ] **Strong password policy enabled**
  - [ ] Minimum 12 characters
  - [ ] Uppercase, lowercase, numbers, special chars
  - [ ] Password complexity validation

- [ ] **JWT configuration secured**
  - [ ] Short expiration time (15-30 minutes)
  - [ ] Refresh token rotation enabled
  - [ ] Token signing algorithm is RS256 or HS256

- [ ] **OAuth2 properly configured**
  - [ ] Callback URLs whitelisted
  - [ ] Client secrets not exposed to frontend
  - [ ] State parameter validation enabled

- [ ] **RBAC configured and tested**
  - [ ] Default user role is least privileged
  - [ ] Admin role requires approval
  - [ ] Role permissions reviewed and documented

### ✅ Database Security

- [ ] **Database credentials secured**
  - [ ] Not using default postgres/admin passwords
  - [ ] Database user has minimal required permissions
  - [ ] `DATABASE_SSL=true` in production

- [ ] **Database backups configured**
  - [ ] Automated daily backups
  - [ ] Backup retention policy set (30+ days)
  - [ ] Backup restoration tested

- [ ] **Prepared statements used** (prevents SQL injection)
  - [ ] Prisma ORM configured correctly
  - [ ] No raw SQL queries without parameterization

### ✅ API Security

- [ ] **Rate limiting enabled**
  - [ ] `RATE_LIMIT_MAX_REQUESTS` set appropriately (100-1000)
  - [ ] `RATE_LIMIT_WINDOW_MS` configured (15 minutes = 900000ms)
  - [ ] Rate limits tested under load

- [ ] **CORS configured correctly**
  - [ ] `CORS_ORIGIN` set to specific domains (not `*`)
  - [ ] `CORS_CREDENTIALS=true` only if needed
  - [ ] Allowed methods restricted to required only

- [ ] **Input validation enabled**
  - [ ] All user inputs validated
  - [ ] File uploads restricted by size and type
  - [ ] Expression evaluation sandboxed

- [ ] **Security headers configured**
  - [ ] Helmet.js middleware enabled
  - [ ] CSP (Content Security Policy) headers set
  - [ ] X-Frame-Options: DENY
  - [ ] X-Content-Type-Options: nosniff

### ✅ Encryption

- [ ] **Encryption at rest**
  - [ ] Credentials encrypted with `ENCRYPTION_MASTER_KEY`
  - [ ] Sensitive data encrypted in database
  - [ ] Encryption algorithm is AES-256-GCM

- [ ] **Encryption in transit**
  - [ ] TLS 1.2+ enforced
  - [ ] Valid SSL certificates installed
  - [ ] HTTP redirects to HTTPS

- [ ] **Password hashing**
  - [ ] Bcrypt with 12+ rounds (`HASH_SALT_ROUNDS=12`)
  - [ ] No plaintext passwords stored

### ✅ Logging & Monitoring

- [ ] **Security logging enabled**
  - [ ] Failed login attempts logged
  - [ ] Sensitive operations logged (credential access, role changes)
  - [ ] Logs do NOT contain secrets or passwords

- [ ] **Log streaming configured**
  - [ ] Centralized logging (Datadog, Splunk, ELK)
  - [ ] Log retention policy set
  - [ ] Alerts configured for security events

- [ ] **Error monitoring configured**
  - [ ] Sentry or similar tool configured
  - [ ] Error messages don't expose sensitive data
  - [ ] Stack traces filtered in production

### ✅ Network Security

- [ ] **Firewall configured**
  - [ ] Only required ports open (80, 443)
  - [ ] Database ports not exposed to internet
  - [ ] Redis ports not exposed to internet

- [ ] **VPC/Network isolation** (if using cloud)
  - [ ] Application in private subnet
  - [ ] Database in private subnet
  - [ ] NAT gateway for outbound traffic

- [ ] **DDoS protection**
  - [ ] Cloudflare or AWS Shield enabled
  - [ ] Rate limiting at edge
  - [ ] Geographic restrictions if applicable

### ✅ Dependency Security

- [ ] **Dependencies audited**
  ```bash
  npm audit
  npm audit fix
  ```

- [ ] **Outdated packages updated**
  ```bash
  npm outdated
  npm update
  ```

- [ ] **Dependabot or Snyk enabled**
  - [ ] Automated vulnerability scanning
  - [ ] Security patch notifications
  - [ ] Auto-update PRs for critical vulnerabilities

- [ ] **No malicious packages**
  - [ ] Review all dependencies in package.json
  - [ ] Check for typosquatting
  - [ ] Verify package maintainers

### ✅ Code Security

- [ ] **No eval() or Function() constructor**
  - [ ] Expression evaluation uses safe parser
  - [ ] Plugin execution sandboxed

- [ ] **XSS prevention**
  - [ ] User input sanitized
  - [ ] React escapes by default (verified)
  - [ ] Dangerous HTML rendering avoided

- [ ] **CSRF protection enabled**
  - [ ] CSRF tokens on state-changing requests
  - [ ] SameSite cookie attribute set

- [ ] **File upload security**
  - [ ] File type validation (not just extension)
  - [ ] File size limits enforced
  - [ ] Uploaded files scanned for malware
  - [ ] Files stored outside webroot

### ✅ Compliance

- [ ] **GDPR compliance** (if applicable)
  - [ ] Privacy policy published
  - [ ] Consent management implemented
  - [ ] Data deletion procedures documented
  - [ ] Data export functionality available

- [ ] **SOC2/ISO27001** (if applicable)
  - [ ] Audit logging comprehensive
  - [ ] Access controls documented
  - [ ] Incident response plan documented

- [ ] **HIPAA** (if handling health data)
  - [ ] BAA agreements signed
  - [ ] PHI encryption verified
  - [ ] Audit trails comprehensive

### ✅ Deployment

- [ ] **Infrastructure as Code**
  - [ ] Terraform/CloudFormation scripts reviewed
  - [ ] No secrets in IaC files
  - [ ] State files secured

- [ ] **CI/CD security**
  - [ ] Secrets injected at runtime (not in repo)
  - [ ] Build artifacts scanned
  - [ ] Deployment requires approval

- [ ] **Container security** (if using Docker)
  - [ ] Base images from official sources
  - [ ] Images scanned for vulnerabilities
  - [ ] Containers run as non-root user
  - [ ] Minimal image size (alpine/distroless)

### ✅ Incident Response

- [ ] **Incident response plan documented**
  - [ ] Contact procedures defined
  - [ ] Escalation matrix documented
  - [ ] Communication templates prepared

- [ ] **Backup and recovery tested**
  - [ ] Database restore tested
  - [ ] RTO/RPO defined and tested
  - [ ] Disaster recovery runbook

- [ ] **Secret rotation procedure documented**
  - [ ] How to rotate each secret type
  - [ ] Impact assessment for rotation
  - [ ] Rollback procedure

## 🔍 Automated Security Checks

### Run Before Every Deployment

```bash
# 1. Audit dependencies
npm audit --production

# 2. Check for secrets in code
git secrets --scan

# 3. Lint for security issues
npm run lint

# 4. Run security-focused tests
npm run test:security

# 5. Check environment variables
./scripts/check-env.sh

# 6. Scan Docker images (if applicable)
docker scan workflow-app:latest

# 7. Check for sensitive files
git status | grep -E '\.env|\.pem|\.key'
```

## 📞 Security Contact

- **Security Team Email**: security@your-company.com
- **Bug Bounty**: https://hackerone.com/your-company
- **PGP Key**: https://keybase.io/your-company

## 📚 Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [Node.js Security Best Practices](https://github.com/goldbergyoni/nodebestpractices#6-security-best-practices)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)

---

**Last Updated**: 2025-01-23
**Version**: 1.0
