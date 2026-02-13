# Manual Correction Scripts

This directory contains **MANUAL** scripts that should be run by humans after reviewing recommendations.

## ⚠️ CRITICAL WARNING

These scripts are **NOT AUTOMATED**. They must be:
1. Reviewed by a human before running
2. Tested in staging/development first
3. Run with understanding of what they do
4. Monitored during execution
5. Ready to rollback if issues occur

## Available Scripts

### memory-optimization.sh

Optimizes memory usage based on recommendations.

**Before running**:
- Review memory usage: `pm2 monit`
- Check heap dumps
- Understand current state

**To run**:
```bash
# DRY RUN FIRST (shows what would be done)
./scripts/manual-corrections/memory-optimization.sh --dry-run

# ACTUAL RUN (only after reviewing dry-run)
./scripts/manual-corrections/memory-optimization.sh
```

### database-connection-fix.sh

Fixes database connection issues.

**Before running**:
- Check database status: `systemctl status postgresql`
- Review connection pool settings
- Backup current configuration

**To run**:
```bash
# DRY RUN FIRST
./scripts/manual-corrections/database-connection-fix.sh --dry-run

# ACTUAL RUN
./scripts/manual-corrections/database-connection-fix.sh
```

### network-retry-config.sh

Configures network retry strategies.

**Before running**:
- Test endpoint connectivity
- Review current timeout settings
- Plan rollback

**To run**:
```bash
# DRY RUN FIRST
./scripts/manual-corrections/network-retry-config.sh --dry-run

# ACTUAL RUN
./scripts/manual-corrections/network-retry-config.sh
```

## General Guidelines

### Pre-Execution Checklist

- [ ] Reviewed recommendation in dashboard
- [ ] Understood what the script will do
- [ ] Tested in development/staging
- [ ] Backed up current configuration
- [ ] Scheduled maintenance window (if needed)
- [ ] Notified team
- [ ] Prepared rollback plan
- [ ] Ready to monitor logs

### During Execution

- [ ] Run with dry-run flag first
- [ ] Review dry-run output
- [ ] Run actual script
- [ ] Monitor logs in real-time
- [ ] Watch system metrics
- [ ] Be ready to stop if issues

### Post-Execution

- [ ] Verify fix worked
- [ ] Check error logs
- [ ] Monitor for 30+ minutes
- [ ] Run validation tests
- [ ] Document what was done
- [ ] Update runbook

## Emergency Rollback

If anything goes wrong:

```bash
# Restore from backup
cp /backup/config.json config/production.json

# Restart services
pm2 restart all

# Check status
pm2 status
pm2 logs --lines 100
```

## Support

Questions? Check:
1. SAFE_CORRECTION_SYSTEM_GUIDE.md
2. Dashboard recommendations
3. DevOps team chat
4. Production runbook
