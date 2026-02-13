# Disaster Recovery Plan
## Workflow Automation Platform

**Last Updated:** January 2025
**Document Version:** 1.0
**Classification:** Confidential

## Executive Summary

This document outlines the disaster recovery (DR) procedures for the Workflow Automation Platform. It defines recovery objectives, procedures, and responsibilities to ensure business continuity in the event of a disaster.

### Key Metrics

- **RTO (Recovery Time Objective)**: 4 hours
- **RPO (Recovery Point Objective)**: 5 minutes
- **Backup Frequency**: Continuous (database), Daily (files)
- **Backup Retention**: 30 days

## Table of Contents

1. [Disaster Scenarios](#disaster-scenarios)
2. [Backup Strategy](#backup-strategy)
3. [Recovery Procedures](#recovery-procedures)
4. [Testing & Validation](#testing--validation)
5. [Roles & Responsibilities](#roles--responsibilities)
6. [Contact Information](#contact-information)

## Disaster Scenarios

### Scenario 1: Database Failure

**Impact**: Complete loss of database instance
**RTO**: 1 hour
**RPO**: 5 minutes

**Recovery Steps**:

```bash
# 1. Identify latest RDS snapshot
aws rds describe-db-snapshots \
  --db-instance-identifier workflow-production \
  --query 'DBSnapshots[0].DBSnapshotIdentifier'

# 2. Restore from snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier workflow-production-restored \
  --db-snapshot-identifier <snapshot-id> \
  --db-subnet-group-name workflow-db-subnet \
  --publicly-accessible false \
  --multi-az true

# 3. Wait for database to be available
aws rds wait db-instance-available \
  --db-instance-identifier workflow-production-restored

# 4. Update DNS/endpoint
kubectl edit secret workflow-secrets -n production
# Update DATABASE_URL with new endpoint

# 5. Restart application pods
kubectl rollout restart deployment/workflow-platform -n production

# 6. Verify recovery
kubectl logs -f deployment/workflow-platform -n production
```

### Scenario 2: Complete Region Failure

**Impact**: Total loss of AWS region
**RTO**: 4 hours
**RPO**: 1 hour

**Recovery Steps**:

```bash
# 1. Activate DR region infrastructure
cd terraform/aws
terraform workspace select dr-region
terraform apply -var="environment=disaster-recovery"

# 2. Restore database from cross-region backup
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier workflow-dr \
  --db-snapshot-identifier <cross-region-snapshot> \
  --region eu-west-1

# 3. Deploy application to DR cluster
aws eks update-kubeconfig \
  --name workflow-dr \
  --region eu-west-1

helm install workflow-platform ./helm/workflow-platform \
  --namespace production \
  --create-namespace \
  --set secrets.data.DATABASE_URL="<dr-database-url>"

# 4. Update DNS to point to DR region
# Update Route53 or your DNS provider

# 5. Verify all services
kubectl get all -n production
curl https://workflow.company.com/health
```

### Scenario 3: Kubernetes Cluster Failure

**Impact**: Loss of EKS cluster
**RTO**: 2 hours
**RPO**: Real-time

**Recovery Steps**:

```bash
# 1. Create new EKS cluster using Terraform
cd terraform/aws
terraform apply -target=module.eks

# 2. Update kubeconfig
aws eks update-kubeconfig --name workflow-production-new

# 3. Restore application using Helm
helm install workflow-platform ./helm/workflow-platform \
  --namespace production \
  --create-namespace \
  --values production-values.yaml

# 4. Verify deployment
kubectl rollout status deployment/workflow-platform -n production
```

### Scenario 4: Data Corruption

**Impact**: Corrupted application data
**RTO**: 2 hours
**RPO**: Based on last clean backup

**Recovery Steps**:

```bash
# 1. Identify last known good backup
aws s3 ls s3://workflow-backups/ --recursive | grep postgres

# 2. Create read replica from point-in-time
aws rds create-db-instance-read-replica \
  --db-instance-identifier workflow-validation \
  --source-db-instance-identifier workflow-production \
  --db-instance-class db.t3.large

# 3. Validate data integrity on replica
psql -h <replica-endpoint> -U workflow -d workflow

# 4. If valid, promote replica to standalone
aws rds promote-read-replica \
  --db-instance-identifier workflow-validation

# 5. Point application to validated instance
kubectl edit secret workflow-secrets -n production
kubectl rollout restart deployment/workflow-platform -n production
```

## Backup Strategy

### Database Backups

**Automated RDS Snapshots**:
- Frequency: Every 5 minutes (continuous backup)
- Retention: 30 days
- Cross-region: Enabled to eu-west-1

```bash
# Configure automated backups
aws rds modify-db-instance \
  --db-instance-identifier workflow-production \
  --backup-retention-period 30 \
  --preferred-backup-window "03:00-04:00"

# Enable cross-region backup
aws rds create-db-snapshot \
  --db-instance-identifier workflow-production \
  --db-snapshot-identifier workflow-cross-region-$(date +%Y%m%d)

aws rds copy-db-snapshot \
  --source-db-snapshot-identifier workflow-cross-region-$(date +%Y%m%d) \
  --target-db-snapshot-identifier workflow-cross-region-$(date +%Y%m%d) \
  --source-region us-west-2 \
  --region eu-west-1
```

**Manual Database Exports**:
```bash
# Daily exports to S3
kubectl create job --from=cronjob/database-export manual-export -n production

# Verify export
aws s3 ls s3://workflow-backups/database/
```

### Application Data Backups

**File Uploads (S3)**:
- Versioning: Enabled
- Cross-region replication: Enabled
- Lifecycle policy: Move to Glacier after 90 days

```bash
# Enable S3 versioning
aws s3api put-bucket-versioning \
  --bucket workflow-uploads-production \
  --versioning-configuration Status=Enabled

# Configure cross-region replication
aws s3api put-bucket-replication \
  --bucket workflow-uploads-production \
  --replication-configuration file://replication-config.json
```

**Configuration Backups**:
```bash
# Export Kubernetes configs
kubectl get configmap,secret -n production -o yaml > k8s-backup.yaml

# Encrypt and store
gpg --encrypt --recipient ops@company.com k8s-backup.yaml
aws s3 cp k8s-backup.yaml.gpg s3://workflow-backups/configs/
```

### Monitoring Backups

**Prometheus Data**:
- Retention: 30 days in-cluster
- Long-term: Exported to S3 daily

**Grafana Dashboards**:
- Backed up via API
- Stored in git repository

```bash
# Backup Grafana dashboards
curl -H "Authorization: Bearer $GRAFANA_API_KEY" \
  http://grafana:3000/api/search | \
  jq -r '.[].uri' | \
  xargs -I {} curl -H "Authorization: Bearer $GRAFANA_API_KEY" \
    http://grafana:3000/api/dashboards/{} > dashboards-backup.json
```

## Recovery Procedures

### Pre-Recovery Checklist

- [ ] Identify disaster type and scope
- [ ] Notify incident commander
- [ ] Assess data integrity
- [ ] Determine recovery approach
- [ ] Notify stakeholders
- [ ] Document timeline and actions

### Recovery Priority Order

1. **Critical (P0)** - Within 1 hour
   - Database restoration
   - Authentication services
   - Core API functionality

2. **High (P1)** - Within 4 hours
   - Full application functionality
   - WebSocket connections
   - File upload/download

3. **Medium (P2)** - Within 24 hours
   - Monitoring dashboards
   - Analytics features
   - Scheduled workflows

4. **Low (P3)** - Within 72 hours
   - Historical data
   - Audit logs
   - Development environments

### Step-by-Step Recovery

#### Phase 1: Assessment (15 minutes)

```bash
# Check infrastructure status
aws ec2 describe-instances --filters "Name=tag:Environment,Values=production"
aws rds describe-db-instances --db-instance-identifier workflow-production
kubectl get nodes
kubectl get pods -n production

# Check latest backups
aws rds describe-db-snapshots --db-instance-identifier workflow-production --max-items 5
aws s3 ls s3://workflow-backups/database/ --recursive | tail -10

# Verify monitoring
curl -f http://prometheus:9090/-/healthy
curl -f http://grafana:3000/api/health
```

#### Phase 2: Isolation (15 minutes)

```bash
# Scale down affected components
kubectl scale deployment workflow-platform --replicas=0 -n production

# Enable maintenance mode (if applicable)
kubectl apply -f k8s/maintenance-mode.yaml

# Block traffic to affected services
aws elb modify-load-balancer-attributes \
  --load-balancer-name workflow-production \
  --load-balancer-attributes "ConnectionSettings={IdleTimeout=0}"
```

#### Phase 3: Restoration (1-3 hours)

See scenario-specific procedures above.

#### Phase 4: Verification (30 minutes)

```bash
# Health checks
curl https://workflow.company.com/health
curl https://workflow.company.com/api/health

# Database connectivity
kubectl exec -it <pod-name> -n production -- \
  psql $DATABASE_URL -c "SELECT 1"

# Application functionality tests
./scripts/smoke-tests.sh production

# Load test
artillery run tests/load/recovery-validation.yml

# Monitor for errors
kubectl logs -f deployment/workflow-platform -n production | grep -i error
```

#### Phase 5: Communication (Ongoing)

```bash
# Update status page
curl -X POST https://status.workflow.company.com/api/incidents \
  -H "Authorization: Bearer $STATUS_API_KEY" \
  -d '{"status": "investigating", "message": "Database recovery in progress"}'

# Notify stakeholders
./scripts/send-notification.sh \
  --channel emergency \
  --message "Recovery Phase: Verification Complete"
```

## Testing & Validation

### DR Drill Schedule

- **Monthly**: Database restore test
- **Quarterly**: Full failover test
- **Annually**: Complete disaster scenario

### Test Procedures

**Monthly Database Restore Test**:

```bash
#!/bin/bash
# monthly-dr-test.sh

set -e

echo "Starting monthly DR test..."

# 1. Create test snapshot
SNAPSHOT_ID="dr-test-$(date +%Y%m%d)"
aws rds create-db-snapshot \
  --db-instance-identifier workflow-production \
  --db-snapshot-identifier $SNAPSHOT_ID

# 2. Wait for snapshot
aws rds wait db-snapshot-completed \
  --db-snapshot-identifier $SNAPSHOT_ID

# 3. Restore to test instance
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier workflow-dr-test \
  --db-snapshot-identifier $SNAPSHOT_ID \
  --db-instance-class db.t3.medium

# 4. Verify restoration
aws rds wait db-instance-available \
  --db-instance-identifier workflow-dr-test

# 5. Run validation queries
psql -h <test-endpoint> -U workflow -d workflow -c "
  SELECT COUNT(*) FROM users;
  SELECT COUNT(*) FROM workflows;
"

# 6. Cleanup
aws rds delete-db-instance \
  --db-instance-identifier workflow-dr-test \
  --skip-final-snapshot

echo "DR test completed successfully"
```

### Validation Metrics

- **Recovery Time**: Actual vs. RTO
- **Data Loss**: Actual vs. RPO
- **Service Availability**: Percentage uptime
- **Test Success Rate**: Pass/fail ratio

## Roles & Responsibilities

### Incident Commander
- **Primary**: DevOps Lead
- **Backup**: Platform Architect
- **Responsibilities**:
  - Coordinate recovery efforts
  - Make critical decisions
  - Communicate with stakeholders

### Database Administrator
- **Primary**: Database Team Lead
- **Backup**: Senior DBA
- **Responsibilities**:
  - Database restoration
  - Data integrity verification
  - Performance tuning

### Platform Engineer
- **Primary**: Senior Platform Engineer
- **Backup**: DevOps Engineer
- **Responsibilities**:
  - Infrastructure restoration
  - Application deployment
  - Monitoring setup

### Communications Lead
- **Primary**: Engineering Manager
- **Backup**: Product Manager
- **Responsibilities**:
  - Stakeholder updates
  - Status page management
  - Post-mortem documentation

## Contact Information

### Emergency Contacts

```
Incident Commander:
  Primary: +1-555-0101 (John Doe)
  Backup: +1-555-0102 (Jane Smith)

Database Team:
  Primary: +1-555-0201 (Bob Johnson)
  Backup: +1-555-0202 (Alice Williams)

Platform Team:
  Primary: +1-555-0301 (Charlie Brown)
  Backup: +1-555-0302 (Diana Prince)

On-Call Pager: +1-555-9999
```

### Escalation Path

1. **Level 1**: On-call engineer (0-15 min)
2. **Level 2**: Team lead (15-30 min)
3. **Level 3**: Engineering manager (30-60 min)
4. **Level 4**: VP Engineering (>60 min)

### External Vendors

- **AWS Support**: Enterprise Support, 24/7
- **Database Consultant**: db-experts@company.com
- **Security Team**: security@company.com

## Post-Recovery

### Post-Mortem Template

```markdown
# Incident Post-Mortem

## Incident Summary
- Date:
- Duration:
- Impact:
- Root Cause:

## Timeline
- [Time] Event description

## What Went Well
-

## What Went Wrong
-

## Action Items
- [ ] Action item 1 (Owner: , Due: )
- [ ] Action item 2 (Owner: , Due: )

## Lessons Learned
-
```

### Continuous Improvement

- Review and update DR plan quarterly
- Incorporate lessons from incidents
- Update contact information monthly
- Test and validate backups regularly

---

**Document Owner**: DevOps Team
**Review Frequency**: Quarterly
**Next Review**: April 2025
