# Secrets Management Documentation

## 🎯 Overview

This directory contains comprehensive documentation and tools for managing secrets securely in the Workflow Automation Platform.

## 📚 Documentation Files

### 1. **SECRETS_MANAGEMENT_URGENT_GUIDE.md** (⭐ MAIN GUIDE - 600+ lines)

**Start here if you need to migrate from hardcoded secrets to proper secrets management.**

This comprehensive guide covers:
- Immediate actions to take when secrets are exposed
- How to remove secrets from git history (3 methods)
- Setup guides for 5 different secrets managers
- Complete code implementation examples
- Docker and Kubernetes integration
- Testing and validation procedures
- Security checklists

**Estimated time**: 2-4 hours to complete full migration

**Best for**:
- Complete migration project
- Production deployment setup
- Understanding all options available

---

### 2. **SECRETS_SECURITY_SUMMARY.md** (📊 EXECUTIVE SUMMARY)

**Read this for a quick overview and action plan.**

High-level summary including:
- What secrets were found exposed
- Risk assessment
- Immediate actions required
- Timeline and milestones
- Success criteria

**Reading time**: 10 minutes

**Best for**:
- Team leads and managers
- Quick understanding of the issue
- Planning the migration project

---

### 3. **SECRETS_QUICK_REFERENCE.md** (🚀 CHEAT SHEET)

**Use this for daily operations and quick lookups.**

Quick reference card with:
- Common commands (generate secrets, Doppler, AWS, Vault)
- Security checklists
- Troubleshooting guide
- Emergency procedures
- Decision tree for common scenarios

**Reading time**: 5 minutes to skim, reference as needed

**Best for**:
- Daily development work
- Quick command lookups
- Troubleshooting issues

---

## 🛠️ Tools & Scripts

### 1. **scripts/setup-secrets.sh**

**Purpose**: Quick setup for local development

**What it does**:
- Generates secure random secrets
- Creates `.env.local` with proper permissions
- Sets up test environment (`.env.test`)
- Configures PostgreSQL database (optional)
- Updates `.gitignore`

**Usage**:
```bash
./scripts/setup-secrets.sh
```

**Time**: 5 minutes

---

### 2. **scripts/audit-secrets.sh**

**Purpose**: Security audit and vulnerability scanning

**What it checks**:
1. Hardcoded secrets in source code
2. Secrets in git history
3. .env files tracked by git
4. .gitignore configuration
5. Weak secrets in environment
6. Exposed API keys
7. Recent commits with sensitive files

**Usage**:
```bash
./scripts/audit-secrets.sh
```

**Time**: 30 seconds

**Exit codes**:
- `0`: No issues found
- `1`: Issues found (see output)

---

### 3. **scripts/check-secrets-status.sh**

**Purpose**: Quick status check and scorecard

**What it reports**:
1. Git repository status
2. .gitignore configuration
3. Local environment files
4. Loaded environment variables
5. Code security scan
6. Secrets management setup
7. Security tools availability
8. Database connectivity

**Usage**:
```bash
./scripts/check-secrets-status.sh
```

**Time**: 10 seconds

**Output**: Colored report with score (0-100%) and recommendations

---

## 🚀 Quick Start Guide

### For New Developers

```bash
# 1. Clone the repository
git clone <repo-url>
cd workflow

# 2. Setup local development secrets
./scripts/setup-secrets.sh

# 3. Install dependencies
npm install

# 4. Start development
npm run dev
```

### For Existing Developers

```bash
# 1. Check current status
./scripts/check-secrets-status.sh

# 2. If you need to setup/update secrets
./scripts/setup-secrets.sh

# 3. Run security audit
./scripts/audit-secrets.sh
```

### For DevOps/Security Teams

```bash
# 1. Read the executive summary
cat SECRETS_SECURITY_SUMMARY.md

# 2. Run full audit
./scripts/audit-secrets.sh

# 3. Review the migration guide
cat SECRETS_MANAGEMENT_URGENT_GUIDE.md

# 4. Choose and implement secrets manager
# (See Section 4 of the urgent guide)
```

---

## 📋 Common Scenarios

### Scenario 1: Setting up local development

**Solution**: Use the setup script
```bash
./scripts/setup-secrets.sh
```

This creates `.env.local` with secure random secrets for development.

---

### Scenario 2: Deploying to production

**Solution**: Choose a secrets manager

**Options**:
1. **Doppler** - Easiest, 15 min setup
2. **AWS Secrets Manager** - If using AWS, 30 min setup
3. **HashiCorp Vault** - Enterprise, 2-4 hour setup
4. **Azure Key Vault** - If using Azure, 30 min setup
5. **Google Secret Manager** - If using GCP, 30 min setup

**See**: Section 4 of `SECRETS_MANAGEMENT_URGENT_GUIDE.md`

---

### Scenario 3: Found secrets in git history

**Immediate action**:
```bash
# 1. Stop tracking the files
git rm --cached .env.test .env.transformation
git commit -m "Stop tracking sensitive files"

# 2. Clean git history
# See Section 2 of SECRETS_MANAGEMENT_URGENT_GUIDE.md
# Use BFG Repo-Cleaner (recommended) or git-filter-repo
```

---

### Scenario 4: Secrets compromised

**Emergency response**:
```bash
# 1. Generate new secrets immediately
NEW_JWT_SECRET=$(openssl rand -base64 64)

# 2. Update in secrets manager
doppler secrets set JWT_SECRET "$NEW_JWT_SECRET" --config production

# 3. Restart services
kubectl rollout restart deployment/workflow-app

# 4. Invalidate all sessions
redis-cli FLUSHDB

# 5. Check access logs for unauthorized access
```

**See**: Emergency Procedures in `SECRETS_QUICK_REFERENCE.md`

---

### Scenario 5: Adding a new secret

**Development**:
```bash
# Add to .env.local
echo "NEW_API_KEY=your-key-here" >> .env.local
```

**Production**:
```bash
# Using Doppler
doppler secrets set NEW_API_KEY "your-key" --config production

# Using AWS
aws secretsmanager create-secret \
  --name workflow/production/new-api-key \
  --secret-string "your-key"

# Using Vault
vault kv put workflow/production new_api_key="your-key"
```

---

### Scenario 6: Team member needs access

**Development** (local):
```bash
# They run the setup script
./scripts/setup-secrets.sh
```

**Production**:
```bash
# Using Doppler - invite via dashboard
# https://dashboard.doppler.com

# Using AWS - grant IAM access
aws iam attach-user-policy \
  --user-name john.doe \
  --policy-arn arn:aws:iam::123456789:policy/WorkflowSecretsReadOnly

# Using Vault - create token
vault token create -policy=workflow-app
```

---

## 🔒 Security Best Practices

### DO ✅

- Use secrets manager for production
- Generate strong random secrets (32+ characters)
- Rotate secrets regularly (30-90 days)
- Use different secrets per environment
- Keep `.env.local` in `.gitignore`
- Run `./scripts/audit-secrets.sh` regularly
- Enable audit logging
- Use minimum required permissions

### DON'T ❌

- Commit `.env` files to git
- Share secrets via email, Slack, or chat
- Use default or example secrets in production
- Hardcode secrets in source code
- Use the same secrets across environments
- Give everyone production access
- Skip secret rotation
- Ignore security warnings

---

## 📊 Monitoring & Maintenance

### Daily

```bash
# Check status before starting work
./scripts/check-secrets-status.sh
```

### Weekly

```bash
# Run full security audit
./scripts/audit-secrets.sh

# Check for secrets in recent commits
git log --oneline -10 --name-only | grep -E "\.env|secrets|credentials"
```

### Monthly

- Review secret access logs in secrets manager
- Check for weak or expired secrets
- Update team access permissions
- Review `.gitignore` for completeness

### Quarterly

- Rotate all production secrets
- Full security audit by security team
- Update documentation if needed
- Train new team members

---

## 🆘 Troubleshooting

### Issue: "Missing required environment variable"

**Solution**:
```bash
# Check if .env.local exists
ls -la .env.local

# If not, run setup
./scripts/setup-secrets.sh

# If exists, check it's being loaded
echo $JWT_SECRET
```

---

### Issue: "Database connection failed"

**Solution**:
```bash
# Test the connection string
psql "$DATABASE_URL" -c "SELECT 1"

# If it fails, check the credentials in .env.local
# Make sure PostgreSQL is running:
sudo systemctl status postgresql
```

---

### Issue: "Audit script reports hardcoded secrets"

**Solution**:
```bash
# Run audit to see specific locations
./scripts/audit-secrets.sh

# Review the reported files
# Replace hardcoded secrets with environment variables

# Example:
# Before: const apiKey = "sk-abc123..."
# After:  const apiKey = process.env.OPENAI_API_KEY
```

---

### Issue: "Doppler/AWS/Vault not working"

**Solution**:
```bash
# Doppler
doppler whoami
doppler login
doppler setup

# AWS
aws sts get-caller-identity
aws configure

# Vault
vault status
vault login
```

---

## 📖 Additional Resources

### Official Documentation

- **Doppler**: https://docs.doppler.com/
- **AWS Secrets Manager**: https://docs.aws.amazon.com/secretsmanager/
- **HashiCorp Vault**: https://developer.hashicorp.com/vault
- **Azure Key Vault**: https://learn.microsoft.com/en-us/azure/key-vault/
- **Google Secret Manager**: https://cloud.google.com/secret-manager/docs

### Security Tools

- **BFG Repo-Cleaner**: https://rtyley.github.io/bfg-repo-cleaner/
- **git-filter-repo**: https://github.com/newren/git-filter-repo
- **TruffleHog**: https://github.com/trufflesecurity/trufflehog (secret scanning)
- **GitGuardian**: https://www.gitguardian.com/ (automated detection)

### Learning Resources

- **OWASP Secrets Management**: https://owasp.org/www-community/vulnerabilities/Use_of_hard-coded_password
- **12 Factor App**: https://12factor.net/config
- **NIST Password Guidelines**: https://pages.nist.gov/800-63-3/

---

## 🎓 Training Materials

### For Developers

1. Read: `SECRETS_QUICK_REFERENCE.md` (5 min)
2. Watch: Internal secrets management training (if available)
3. Practice: Run `./scripts/setup-secrets.sh` on test project
4. Quiz: Can you add a new secret without hardcoding it?

### For DevOps

1. Read: `SECRETS_MANAGEMENT_URGENT_GUIDE.md` (30 min)
2. Complete: Set up secrets manager for staging environment
3. Practice: Implement secret rotation for one service
4. Document: Write runbook for your specific setup

### For Security Team

1. Review: All documentation files
2. Audit: Run all security scripts
3. Plan: Create incident response plan for secret leaks
4. Monitor: Set up alerts for secret access

---

## 📞 Support

### For Technical Issues

1. Check the troubleshooting section above
2. Review the relevant documentation file
3. Run `./scripts/check-secrets-status.sh` for diagnostics
4. Check secrets manager documentation

### For Security Incidents

1. Follow emergency procedures in `SECRETS_QUICK_REFERENCE.md`
2. Notify security team immediately
3. Document timeline and actions taken
4. Review and improve procedures after incident

### For Questions

- Review the Quick Reference for common commands
- Check the Urgent Guide for implementation details
- Consult secrets manager official documentation
- Ask in team security channel

---

## 📈 Metrics & KPIs

### Security Metrics

- **Audit Score**: Target 90%+ (from `check-secrets-status.sh`)
- **Secrets in Git**: Target 0
- **Hardcoded Secrets**: Target 0
- **Secret Age**: Target <90 days
- **Failed Secret Access**: Target <5/day

### Process Metrics

- **Time to Rotate Secret**: Target <30 minutes
- **New Developer Setup**: Target <10 minutes
- **Security Audit Frequency**: Target weekly
- **Secret Rotation Frequency**: Target quarterly

---

## 🗺️ Roadmap

### Completed ✅

- Created comprehensive documentation
- Built automated audit tools
- Updated `.gitignore` configuration
- Created setup automation

### In Progress 🚧

- Migrating to secrets manager (choose one)
- Cleaning git history
- Setting up automated rotation

### Planned 📋

- Implement pre-commit hooks for secret detection
- Set up automated secret rotation
- Integrate with CI/CD pipelines
- Add secret scanning to GitHub Actions
- Create monitoring dashboard for secret access
- Implement break-glass emergency access procedures

---

## 📝 Change Log

### 2025-10-23

- ✅ Created comprehensive secrets management guide
- ✅ Built automated audit script
- ✅ Built setup automation script
- ✅ Built status checker script
- ✅ Updated `.gitignore` with comprehensive patterns
- ✅ Created executive summary
- ✅ Created quick reference guide
- ✅ Created this README

---

## 🏁 Getting Started Checklist

**For your first time working with this project:**

- [ ] Read `SECRETS_SECURITY_SUMMARY.md` (10 min)
- [ ] Run `./scripts/check-secrets-status.sh`
- [ ] Run `./scripts/setup-secrets.sh`
- [ ] Verify setup with `./scripts/check-secrets-status.sh`
- [ ] Test the application: `npm run dev`
- [ ] Read `SECRETS_QUICK_REFERENCE.md` for daily reference

**For production deployment:**

- [ ] Read `SECRETS_MANAGEMENT_URGENT_GUIDE.md`
- [ ] Choose secrets manager (Section 3)
- [ ] Follow implementation guide (Section 4)
- [ ] Update code to load secrets (Section 5)
- [ ] Test thoroughly (Section 6)
- [ ] Complete security checklist (Section 7)

---

**Questions? Check the relevant documentation file above or run the status checker for diagnostics.**

**Last Updated**: 2025-10-23
**Version**: 1.0
**Maintained by**: Security Team
