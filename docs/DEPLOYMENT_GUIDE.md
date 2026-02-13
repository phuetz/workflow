# Deployment Guide - Workflow Automation Platform

## Table of Contents
- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Local Development](#local-development)
- [Docker Deployment](#docker-deployment)
- [Kubernetes Deployment](#kubernetes-deployment)
- [Cloud Deployment](#cloud-deployment)
- [CI/CD Pipeline](#cicd-pipeline)
- [Monitoring & Observability](#monitoring--observability)
- [Backup & Recovery](#backup--recovery)
- [Troubleshooting](#troubleshooting)

## Overview

This guide covers all deployment scenarios for the Workflow Automation Platform, from local development to production-ready cloud infrastructure.

### Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Load Balancer (ALB/NLB)            │
└───────────────────┬─────────────────────────────────┘
                    │
    ┌───────────────┴───────────────┐
    │                               │
┌───▼───────┐                   ┌───▼───────┐
│  Frontend │                   │  Backend  │
│  (React)  │◄──────────────────│  (Node.js)│
└───────────┘                   └───┬───────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                ┌───▼────┐      ┌───▼────┐    ┌────▼────┐
                │  RDS   │      │ Redis  │    │   S3    │
                │(Postgres)     │(Cache) │    │(Storage)│
                └────────┘      └────────┘    └─────────┘
```

## Prerequisites

### Required Tools

- **Docker**: >= 24.0
- **Docker Compose**: >= 2.20
- **Kubernetes**: >= 1.26
- **Helm**: >= 3.12
- **kubectl**: >= 1.26
- **Terraform**: >= 1.5 (for cloud deployment)
- **Node.js**: >= 18.0
- **npm**: >= 9.0

### Cloud Provider Accounts (Production)

- AWS Account with appropriate permissions
- GCP Project (alternative)
- Azure Subscription (alternative)

## Local Development

### Quick Start

```bash
# Clone the repository
git clone https://github.com/your-org/workflow-automation.git
cd workflow-automation

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
nano .env

# Start with Docker Compose
docker-compose -f docker-compose.dev.yml up -d

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:3001
# pgAdmin: http://localhost:5050
# Redis Commander: http://localhost:8081
```

### Development with Hot Reload

```bash
# Install dependencies
npm install

# Run development servers
npm run dev

# In separate terminals:
# Terminal 1: Frontend
npm run dev:frontend

# Terminal 2: Backend
npm run dev:backend
```

## Docker Deployment

### Development Environment

```bash
# Start all services
docker-compose -f docker-compose.dev.yml up -d

# With dev tools (pgAdmin, Redis Commander)
docker-compose -f docker-compose.dev.yml --profile dev-tools up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop services
docker-compose -f docker-compose.dev.yml down
```

### Production Environment

```bash
# Build production image
docker build -t workflow-app:latest \
  --target runner \
  --build-arg NODE_ENV=production \
  --build-arg VITE_API_BASE_URL=https://api.your-domain.com \
  .

# Run with production docker-compose
docker-compose -f docker-compose.prod.yml up -d

# Scale services
docker-compose -f docker-compose.prod.yml up -d --scale app=3
```

### Environment Variables

Create `.env.production`:

```env
# Application
NODE_ENV=production
PORT=3001

# Database
DATABASE_URL=postgresql://user:password@postgres:5432/workflow

# Redis
REDIS_URL=redis://:password@redis:6379

# Security
JWT_SECRET=your-super-secret-jwt-key
ENCRYPTION_KEY=your-32-character-encryption-key

# Monitoring
METRICS_ENABLED=true
TRACING_ENABLED=true
LOG_LEVEL=info
```

## Kubernetes Deployment

### Using kubectl

```bash
# Create namespace
kubectl create namespace production

# Apply Kubernetes manifests
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets/ -n production
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml
kubectl apply -f k8s/hpa.yaml

# Verify deployment
kubectl get all -n production
kubectl get pods -n production -w
```

### Using Helm

#### Install Release

```bash
# Add dependencies
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Install chart
helm install workflow-platform ./helm/workflow-platform \
  --namespace production \
  --create-namespace \
  --values helm/workflow-platform/values.yaml \
  --set image.tag=2.0.0 \
  --set secrets.data.DATABASE_URL="postgresql://..." \
  --set secrets.data.JWT_SECRET="..." \
  --set secrets.data.ENCRYPTION_KEY="..."
```

#### Upgrade Release

```bash
# Upgrade with new version
helm upgrade workflow-platform ./helm/workflow-platform \
  --namespace production \
  --set image.tag=2.1.0 \
  --reuse-values \
  --wait

# Verify upgrade
helm status workflow-platform -n production
kubectl rollout status deployment/workflow-platform -n production
```

#### Rollback

```bash
# View release history
helm history workflow-platform -n production

# Rollback to previous version
helm rollback workflow-platform -n production

# Rollback to specific revision
helm rollback workflow-platform 3 -n production
```

### Horizontal Pod Autoscaling

```bash
# Check HPA status
kubectl get hpa -n production

# Describe HPA
kubectl describe hpa workflow-platform -n production

# Manual scaling (override HPA)
kubectl scale deployment workflow-platform --replicas=5 -n production
```

## Cloud Deployment

### AWS Deployment with Terraform

#### 1. Setup AWS Credentials

```bash
# Configure AWS CLI
aws configure

# Or export credentials
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_REGION="us-west-2"
```

#### 2. Initialize Terraform

```bash
cd terraform/aws

# Initialize
terraform init

# Create workspace
terraform workspace new production
terraform workspace select production
```

#### 3. Configure Variables

Create `terraform.tfvars`:

```hcl
environment = "production"
aws_region  = "us-west-2"

# VPC
vpc_cidr        = "10.0.0.0/16"
private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

# EKS
kubernetes_version   = "1.28"
node_instance_types  = ["t3.large"]
node_min_size        = 3
node_max_size        = 20
node_desired_size    = 3

# RDS
database_name           = "workflow"
database_username       = "workflow_admin"
database_password       = "your-secure-password"  # Use secrets manager
database_instance_class = "db.t3.large"
database_multi_az       = true

# Redis
redis_node_type       = "cache.t3.medium"
redis_num_cache_nodes = 2
```

#### 4. Deploy Infrastructure

```bash
# Plan deployment
terraform plan -out=tfplan

# Review plan
terraform show tfplan

# Apply changes
terraform apply tfplan

# Get outputs
terraform output
```

#### 5. Configure kubectl for EKS

```bash
# Update kubeconfig
aws eks update-kubeconfig \
  --name workflow-production \
  --region us-west-2

# Verify connection
kubectl get nodes
```

#### 6. Deploy Application to EKS

```bash
# Deploy using Helm
helm install workflow-platform ./helm/workflow-platform \
  --namespace production \
  --create-namespace \
  --set postgresql.enabled=false \
  --set redis.enabled=false \
  --set secrets.data.DATABASE_URL="$(terraform output -raw rds_endpoint)" \
  --set secrets.data.REDIS_URL="redis://$(terraform output -raw redis_endpoint):6379"
```

### GCP Deployment

```bash
cd terraform/gcp

# Initialize Terraform
terraform init

# Deploy GKE cluster and resources
terraform apply

# Configure kubectl
gcloud container clusters get-credentials workflow-production \
  --region us-central1

# Deploy application
helm install workflow-platform ./helm/workflow-platform \
  --namespace production \
  --create-namespace
```

## CI/CD Pipeline

### GitHub Actions Workflow

The platform includes comprehensive GitHub Actions workflows:

1. **ci-cd.yml**: Main CI/CD pipeline
   - Code quality checks (ESLint, TypeScript)
   - Unit and integration tests
   - Security scanning
   - Docker image build and push
   - Automated deployment to staging

2. **deploy-production.yml**: Production deployment
   - Pre-deployment validation
   - Database backup
   - Zero-downtime deployment
   - Post-deployment verification
   - Automated rollback on failure

3. **security-scan.yml**: Continuous security monitoring
   - Dependency scanning
   - Container image scanning
   - Secret scanning
   - SAST analysis

### Manual Deployment Trigger

```bash
# Trigger production deployment via GitHub CLI
gh workflow run deploy-production.yml \
  -f version=2.0.0 \
  -f skip_tests=false

# Check workflow status
gh run list --workflow=deploy-production.yml
```

## Monitoring & Observability

### Accessing Monitoring Tools

```bash
# Port forward Prometheus
kubectl port-forward -n production \
  svc/workflow-platform-prometheus-server 9090:80

# Access: http://localhost:9090

# Port forward Grafana
kubectl port-forward -n production \
  svc/workflow-platform-grafana 3000:80

# Access: http://localhost:3000
# Default credentials: admin / (from secret)
```

### Key Metrics to Monitor

- **Application Metrics**
  - Request rate and latency (p50, p95, p99)
  - Error rate
  - Active workflows
  - Queue depth

- **Infrastructure Metrics**
  - CPU and memory utilization
  - Disk I/O
  - Network traffic
  - Pod autoscaling events

- **Database Metrics**
  - Connection pool utilization
  - Query performance
  - Replication lag (if multi-AZ)

### Alerting

Configure alerts in `docker/prometheus/alerts/`:

```yaml
- alert: HighErrorRate
  expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "High error rate detected"
```

## Backup & Recovery

### Automated Backups

Backups run daily at 2 AM (configurable):

```bash
# Manual backup trigger
kubectl create job --from=cronjob/backup-cronjob manual-backup-$(date +%Y%m%d) -n production

# List backups
aws s3 ls s3://workflow-backups-production/

# Download specific backup
aws s3 cp s3://workflow-backups-production/postgres_20250118_020000.sql.gz ./
```

### Recovery Procedures

#### Database Recovery

```bash
# Stop application pods
kubectl scale deployment workflow-platform --replicas=0 -n production

# Restore from RDS snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier workflow-production-restored \
  --db-snapshot-identifier workflow-snapshot-20250118

# Update connection string
kubectl edit secret workflow-secrets -n production

# Restart application
kubectl scale deployment workflow-platform --replicas=3 -n production
```

#### Disaster Recovery

For complete disaster recovery procedures, see [DISASTER_RECOVERY.md](./DISASTER_RECOVERY.md).

**Recovery Time Objectives (RTO):**
- Database recovery: < 1 hour
- Full system recovery: < 4 hours

**Recovery Point Objectives (RPO):**
- Database: < 5 minutes (using point-in-time recovery)
- File uploads: < 1 hour

## Troubleshooting

### Common Issues

#### Pods Not Starting

```bash
# Check pod status
kubectl get pods -n production

# Describe pod for events
kubectl describe pod <pod-name> -n production

# Check logs
kubectl logs <pod-name> -n production

# Check previous logs (if crashed)
kubectl logs <pod-name> -n production --previous
```

#### Database Connection Issues

```bash
# Test database connectivity
kubectl run -it --rm debug --image=postgres:15 --restart=Never -- \
  psql -h <rds-endpoint> -U workflow -d workflow

# Check security groups
aws ec2 describe-security-groups \
  --group-ids <security-group-id>
```

#### High Memory Usage

```bash
# Check resource usage
kubectl top pods -n production

# Increase memory limits
kubectl set resources deployment workflow-platform \
  --limits=memory=4Gi \
  --requests=memory=2Gi \
  -n production
```

#### SSL/TLS Certificate Issues

```bash
# Check cert-manager
kubectl get certificates -n production
kubectl describe certificate workflow-tls -n production

# Check certificate issuer
kubectl get clusterissuer
kubectl describe clusterissuer letsencrypt-prod
```

### Debug Mode

Enable debug logging:

```bash
# Update deployment
kubectl set env deployment/workflow-platform \
  LOG_LEVEL=debug \
  DEBUG=* \
  -n production

# Watch logs
kubectl logs -f deployment/workflow-platform -n production
```

### Performance Profiling

```bash
# Enable Node.js profiling
kubectl set env deployment/workflow-platform \
  NODE_OPTIONS="--inspect=0.0.0.0:9229" \
  -n production

# Port forward debugging port
kubectl port-forward <pod-name> 9229:9229 -n production

# Connect Chrome DevTools to chrome://inspect
```

## Security Best Practices

1. **Secrets Management**
   - Use Kubernetes Secrets or external secret managers (AWS Secrets Manager, HashiCorp Vault)
   - Rotate secrets regularly
   - Never commit secrets to version control

2. **Network Security**
   - Enable Network Policies in Kubernetes
   - Use private subnets for databases
   - Enable encryption in transit (TLS/SSL)
   - Enable encryption at rest

3. **Access Control**
   - Use RBAC for Kubernetes access
   - Implement least privilege principle
   - Enable audit logging
   - Use MFA for production access

4. **Container Security**
   - Scan images for vulnerabilities
   - Use minimal base images (Alpine)
   - Run as non-root user
   - Enable Pod Security Standards

## Maintenance Windows

**Recommended maintenance schedule:**

- **Weekly**: Review logs and metrics
- **Monthly**: Update dependencies, security patches
- **Quarterly**: Major version updates, infrastructure reviews
- **Annually**: Disaster recovery drills

---

## Support

For issues and questions:
- GitHub Issues: https://github.com/your-org/workflow-automation/issues
- Documentation: https://docs.workflow-platform.com
- Email: support@workflow-platform.com

## Additional Resources

- [Infrastructure as Code Guide](./INFRASTRUCTURE.md)
- [Disaster Recovery Plan](./DISASTER_RECOVERY.md)
- [Scaling Guide](./SCALING_GUIDE.md)
- [Security Hardening](./SECURITY.md)
