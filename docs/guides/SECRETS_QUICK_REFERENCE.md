# Secrets Management - Quick Reference Card

## 🚀 Quick Start (5 minutes)

```bash
# 1. Setup local development secrets
cd /home/patrice/claude/workflow
./scripts/setup-secrets.sh

# 2. Start development
npm run dev

# 3. Run security audit
./scripts/audit-secrets.sh
```

---

## 📚 Common Commands

### Generate Secrets

```bash
# 64-byte secret (base64)
openssl rand -base64 64

# 32-byte encryption key
openssl rand -base64 32

# Using Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"

# UUID
uuidgen
```

### Doppler (Recommended for Quick Setup)

```bash
# Install
brew install dopplerhq/cli/doppler  # macOS
curl -Ls https://cli.doppler.com/install.sh | sh  # Linux

# Login
doppler login

# Setup project
doppler setup

# Run with secrets
doppler run -- npm run dev

# List secrets
doppler secrets

# Set secret
doppler secrets set JWT_SECRET "$(openssl rand -base64 64)"

# Download for backup
doppler secrets download --format json > secrets-backup.json
```

### AWS Secrets Manager

```bash
# Create secret
aws secretsmanager create-secret \
  --name workflow/production/jwt-secret \
  --secret-string "$(openssl rand -base64 64)"

# Get secret
aws secretsmanager get-secret-value \
  --secret-id workflow/production/jwt-secret \
  --query SecretString --output text

# Rotate secret
aws secretsmanager rotate-secret \
  --secret-id workflow/production/jwt-secret
```

### HashiCorp Vault

```bash
# Set secret
vault kv put workflow/production \
  jwt_secret="$(openssl rand -base64 64)"

# Get secret
vault kv get workflow/production

# Delete secret
vault kv delete workflow/production
```

### Git Operations

```bash
# Remove file from git but keep local
git rm --cached .env.test

# Search history for secret
git log --all -S "secret_value"

# Clean history with BFG
java -jar bfg.jar --replace-text secrets.txt repo.git
cd repo.git
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

---

## 🔍 Security Checks

### Before Committing

```bash
# Run audit
./scripts/audit-secrets.sh

# Check for secrets in staged files
git diff --cached | grep -iE "password|secret|api[_-]?key"

# Verify .env files not staged
git status | grep "\.env"
```

### Production Deployment

```bash
# Verify secrets loaded
node -e "console.log('JWT:', process.env.JWT_SECRET ? 'SET' : 'MISSING')"

# Test database connection
node -e "require('pg').Client({connectionString: process.env.DATABASE_URL}).connect().then(() => console.log('OK'))"

# Check secret strength
node -e "console.log('Length:', process.env.JWT_SECRET.length)"
```

---

## 🚨 Emergency Procedures

### If Secrets Compromised

```bash
# 1. Generate new secrets immediately
NEW_JWT=$(openssl rand -base64 64)
NEW_DB_PASS=$(openssl rand -base64 32)

# 2. Update in secrets manager
doppler secrets set JWT_SECRET "$NEW_JWT" --config production

# 3. Invalidate all sessions
redis-cli FLUSHDB

# 4. Restart services
kubectl rollout restart deployment/workflow-app

# 5. Check logs for unauthorized access
kubectl logs -l app=workflow --since=1h | grep -i "unauthorized\|failed"
```

### If Git Contains Secrets

```bash
# Quick cleanup (for recent commits)
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env.test" \
  HEAD~5..HEAD

# Full cleanup (entire history)
# Use BFG or git-filter-repo - see main guide
```

---

## 📋 Checklists

### Daily Development

- [ ] Using `.env.local` for development
- [ ] Not committing `.env` files
- [ ] Secrets not hardcoded in code
- [ ] Audit script passes

### Before Production Deploy

- [ ] Secrets loaded from secrets manager
- [ ] All required secrets present
- [ ] No default/weak secrets
- [ ] Database connection tested
- [ ] Backup secrets documented

### Monthly Security Review

- [ ] Run `./scripts/audit-secrets.sh`
- [ ] Review secret access logs
- [ ] Check for weak secrets
- [ ] Verify .gitignore up to date
- [ ] Test secret rotation

### Quarterly

- [ ] Rotate all production secrets
- [ ] Review team access
- [ ] Update documentation
- [ ] Train new team members

---

## 🔑 Environment Variables Reference

### Required for All Environments

```bash
NODE_ENV=production|development|test
PORT=3000
API_PORT=3001
```

### Required for Production

```bash
# Security
JWT_SECRET=             # Min 64 chars
JWT_REFRESH_SECRET=     # Min 64 chars
SESSION_SECRET=         # Min 64 chars
ENCRYPTION_MASTER_KEY=  # Min 32 chars

# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# Redis (optional but recommended)
REDIS_URL=redis://host:6379
```

### Optional but Recommended

```bash
# External Services
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
SENDGRID_API_KEY=

# Monitoring
SENTRY_DSN=
LOG_LEVEL=info

# Features
CORS_ORIGIN=https://yourdomain.com
RATE_LIMIT_MAX_REQUESTS=100
```

---

## 🐛 Troubleshooting

### "Missing required environment variable"

```bash
# Check what's loaded
node -e "console.log(process.env)" | grep SECRET

# Verify .env.local exists
ls -la .env.local

# Check if using Doppler
doppler secrets --config development
```

### "Database connection failed"

```bash
# Test connection string
psql "$DATABASE_URL" -c "SELECT 1"

# Check if database exists
psql -l

# Verify credentials
echo $DATABASE_URL | sed 's/:[^@]*@/:***@/'
```

### "Secrets not loading from manager"

```bash
# Doppler: Check token
doppler whoami

# AWS: Check credentials
aws sts get-caller-identity

# Vault: Check connection
vault status
```

### "Audit script failing"

```bash
# Check execution permissions
chmod +x scripts/audit-secrets.sh

# Run with verbose output
bash -x scripts/audit-secrets.sh

# Check git configuration
git config --list | grep user
```

---

## 📁 File Locations

```
/home/patrice/claude/workflow/
├── SECRETS_MANAGEMENT_URGENT_GUIDE.md    # Complete guide (600+ lines)
├── SECRETS_SECURITY_SUMMARY.md           # Executive summary
├── SECRETS_QUICK_REFERENCE.md            # This file
├── scripts/
│   ├── audit-secrets.sh                  # Security audit script
│   └── setup-secrets.sh                  # Local dev setup
├── .env.example                          # Template (SAFE to commit)
├── .env.local                            # Your secrets (DO NOT commit)
├── .env.test                             # Test secrets (DO NOT commit)
└── .gitignore                            # Configured to ignore secrets
```

---

## 🎯 Quick Decision Tree

**Need to set up local development?**
→ Run `./scripts/setup-secrets.sh`

**Need to deploy to production?**
→ Read Section 4 of `SECRETS_MANAGEMENT_URGENT_GUIDE.md`
→ Choose: Doppler (fastest) or AWS/Vault (if already using them)

**Found secrets in git?**
→ Read Section 2 of `SECRETS_MANAGEMENT_URGENT_GUIDE.md`
→ Use BFG Repo-Cleaner (recommended)

**Secrets compromised?**
→ See "Emergency Procedures" above
→ Rotate immediately
→ Check access logs

**Need to add new secret?**
→ Development: Add to `.env.local`
→ Production: Add to secrets manager
→ Never hardcode in code!

---

## 💡 Best Practices

### DO

✅ Use secrets manager for production
✅ Generate strong random secrets
✅ Rotate secrets regularly (30-90 days)
✅ Use different secrets per environment
✅ Keep .env.local in .gitignore
✅ Use environment-specific configs
✅ Enable audit logging
✅ Test secret rotation before production

### DON'T

❌ Commit .env files to git
❌ Share secrets via email/Slack
❌ Use default/example secrets
❌ Hardcode secrets in code
❌ Use same secrets across environments
❌ Skip secret rotation
❌ Ignore audit warnings
❌ Give everyone production access

---

## 🆘 Getting Help

1. **Check the full guide**: `SECRETS_MANAGEMENT_URGENT_GUIDE.md`
2. **Run the audit**: `./scripts/audit-secrets.sh`
3. **Read the summary**: `SECRETS_SECURITY_SUMMARY.md`
4. **Check troubleshooting** section above
5. **Review secrets manager docs**:
   - Doppler: https://docs.doppler.com
   - AWS: https://docs.aws.amazon.com/secretsmanager
   - Vault: https://developer.hashicorp.com/vault

---

## 📊 Status Check

Run this to check your current status:

```bash
#!/bin/bash
echo "=== Secrets Security Status ==="
echo ""

# Check .env files
echo "📁 .env files in git:"
git ls-files | grep "^\.env" || echo "  ✅ None (good)"
echo ""

# Check .gitignore
echo "🚫 .gitignore coverage:"
grep -E "^\.env" .gitignore | head -5
echo ""

# Check for hardcoded secrets
echo "🔍 Hardcoded secrets check:"
git grep -iE "password\s*=\s*['\"][^'\"]{3,}['\"]" -- '*.ts' '*.tsx' | wc -l | \
  xargs -I {} echo "  Found {} potential issues"
echo ""

# Check if secrets loaded
echo "🔑 Environment secrets:"
[ -n "$JWT_SECRET" ] && echo "  ✅ JWT_SECRET loaded" || echo "  ❌ JWT_SECRET missing"
[ -n "$DATABASE_URL" ] && echo "  ✅ DATABASE_URL loaded" || echo "  ❌ DATABASE_URL missing"
echo ""

echo "Run './scripts/audit-secrets.sh' for detailed analysis"
```

Save as `scripts/check-status.sh` and run it anytime!

---

**Remember**: Security is not a one-time task, it's an ongoing practice.

**Last Updated**: 2025-10-23
**Version**: 1.0
