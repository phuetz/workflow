# Git Commands for Dependencies Update

## Option 1: Commit Updates (Recommended After Testing)

```bash
# Stage dependency files
git add package.json package-lock.json

# Stage Prisma generated client (if needed)
git add node_modules/.prisma/ --force  # Only if tracking generated files

# Stage documentation
git add DEPENDENCIES_UPDATE_REPORT.md
git add DEPENDENCIES_UPDATE_SUMMARY.md
git add DEPENDENCIES_UPDATE_README.md
git add CRITICAL_SECURITY_ALERT_PASSPORT_SAML.md
git add DEPENDENCIES_VALIDATION_COMMANDS.sh
git add DEPENDENCIES_GIT_COMMANDS.md

# Stage backups (for reference)
git add package.json.backup-deps-update
git add package-lock.json.backup-deps-update

# Create commit
git commit -m "chore(deps): Update critical dependencies and fix security vulnerabilities

- Update Prisma 5.22.0 → 6.18.0 (major upgrade)
- Update bcryptjs 2.4.3 → 3.0.2 (security)
- Update nodemailer 6.10.1 → 7.0.10 (fixes GHSA-mm7p-fcc7-pg87)
- Add dompurify 3.3.0 (partial XSS mitigation)

BREAKING CHANGES:
- Prisma 6.x may have API changes, requires integration testing
- nodemailer 7.x has configuration changes
- bcryptjs 3.x should be backward compatible

SECURITY:
- Fixed 1 vulnerability (nodemailer)
- Remaining: 6 vulnerabilities (including CRITICAL passport-saml)
- See CRITICAL_SECURITY_ALERT_PASSPORT_SAML.md for urgent action items

TESTING:
- Unit tests pass (no new failures)
- Build has pre-existing errors (not from this update)
- Integration testing required for Prisma 6 and nodemailer 7

DOCUMENTATION:
- Full report: DEPENDENCIES_UPDATE_REPORT.md
- Quick summary: DEPENDENCIES_UPDATE_SUMMARY.md
- Security alert: CRITICAL_SECURITY_ALERT_PASSPORT_SAML.md

Refs: #security #dependencies #prisma #nodejs"
```

## Option 2: Create Feature Branch

```bash
# Create branch for dependency updates
git checkout -b deps/update-critical-dependencies-2025-11

# Stage and commit as above
git add package.json package-lock.json
git add DEPENDENCIES_*.md CRITICAL_SECURITY_ALERT_PASSPORT_SAML.md
git add *.backup-deps-update

git commit -m "chore(deps): Update critical dependencies

See DEPENDENCIES_UPDATE_REPORT.md for full details.

CRITICAL: passport-saml vulnerability requires immediate attention.
See CRITICAL_SECURITY_ALERT_PASSPORT_SAML.md"

# Push to remote
git push origin deps/update-critical-dependencies-2025-11

# Create pull request
gh pr create --title "Critical Dependencies Update - Nov 2025" \
  --body "$(cat DEPENDENCIES_UPDATE_SUMMARY.md)"
```

## Option 3: Separate Commits for Each Update

```bash
# Commit 1: Prisma
git add package.json package-lock.json
git commit -m "chore(deps): Update Prisma to 6.18.0

- Prisma 5.22.0 → 6.18.0 (major version)
- @prisma/client 5.22.0 → 6.18.0
- Schema validated successfully
- Client generated for v6.18.0

BREAKING: May require migration changes, testing needed"

# Commit 2: Security fixes
git add package.json package-lock.json
git commit -m "fix(security): Update bcryptjs and nodemailer

- bcryptjs 2.4.3 → 3.0.2
- nodemailer 6.10.1 → 7.0.10
- Fixes GHSA-mm7p-fcc7-pg87 (nodemailer vulnerability)
- dompurify 3.3.0 added (XSS mitigation)"

# Commit 3: Documentation
git add DEPENDENCIES_*.md CRITICAL_*.md
git commit -m "docs: Add dependencies update documentation

- Full update report with breaking changes
- Security alert for passport-saml (CRITICAL)
- Validation commands and rollback instructions
- Quick summary for team reference"
```

## Verification Before Commit

```bash
# Check what will be committed
git status
git diff --cached

# Verify package.json changes
git diff --cached package.json

# Verify package-lock.json has expected versions
git diff --cached package-lock.json | grep '"version"' | head -20

# Run tests one more time
npm run test -- --run

# Verify audit status
npm audit
```

## Post-Commit Actions

```bash
# Tag the update for reference
git tag -a deps-update-2025-11-01 -m "Dependencies update: Prisma 6, bcryptjs 3, nodemailer 7"

# Push with tags
git push origin main --tags

# Or push branch
git push origin deps/update-critical-dependencies-2025-11
```

## Rollback Commands (If Deployment Fails)

```bash
# Option 1: Revert the commit
git revert HEAD
git push origin main

# Option 2: Hard reset (if commit not pushed)
git reset --hard HEAD~1

# Option 3: Cherry-pick specific fixes only
git checkout main
git checkout -b hotfix/rollback-deps
git checkout HEAD~1 -- package.json package-lock.json
git commit -m "revert: Rollback dependency updates due to [reason]"
git push origin hotfix/rollback-deps
```

## CI/CD Considerations

If you have CI/CD pipeline:

```bash
# Before committing, ensure CI will pass
npm run build       # Check build
npm run test        # Check tests
npm run lint        # Check linting
npm audit           # Check security

# Add CI skip if needed for documentation-only commits
git commit -m "docs: Add dependencies documentation [skip ci]"
```

## Communication

### Notify Team

```bash
# Create GitHub issue for tracking
gh issue create --title "CRITICAL: passport-saml Security Vulnerability" \
  --body "$(cat CRITICAL_SECURITY_ALERT_PASSPORT_SAML.md)" \
  --label "security,critical,dependencies"

# Post to Slack/Teams
# Attach DEPENDENCIES_UPDATE_SUMMARY.md
# Highlight CRITICAL_SECURITY_ALERT_PASSPORT_SAML.md
```

---

**Important:** Do NOT commit until:
1. ✅ CRITICAL passport-saml issue is addressed
2. ✅ Integration tests pass with Prisma 6
3. ✅ Email functionality tested with nodemailer 7
4. ✅ Team is aware of breaking changes

**Remember:** Backups are available at:
- `package.json.backup-deps-update`
- `package-lock.json.backup-deps-update`
