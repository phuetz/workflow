# 🚀 Deployment Guide

Comprehensive deployment guide for the Workflow Automation Platform covering all deployment scenarios from development to enterprise production.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Development Deployment](#development-deployment)
4. [Docker Compose Deployment](#docker-compose-deployment)
5. [Kubernetes Deployment](#kubernetes-deployment)
6. [Cloud Deployments](#cloud-deployments)
7. [Monitoring & Observability](#monitoring--observability)
8. [Security Configuration](#security-configuration)
9. [Performance Optimization](#performance-optimization)
10. [Troubleshooting](#troubleshooting)

## 🔧 Prerequisites

### System Requirements

**Minimum Requirements:**
- CPU: 4 cores
- RAM: 8GB
- Storage: 50GB SSD
- Network: 1Gbps

**Recommended for Production:**
- CPU: 8+ cores
- RAM: 16GB+
- Storage: 200GB+ SSD
- Network: 10Gbps

### Software Dependencies

**Required:**
- Docker 24.0+
- Docker Compose 2.0+
- Node.js 18+ (for development)
- PostgreSQL 15+
- Redis 7+

**Optional (for Kubernetes):**
- kubectl 1.28+
- Helm 3.12+
- Kubernetes 1.28+

**Cloud CLIs (if deploying to cloud):**
- AWS CLI 2.0+
- Google Cloud SDK
- Azure CLI 2.0+

## ⚙️ Environment Configuration

### Environment Files

Create environment files for different stages:

```bash
# Development
cp .env.example .env.development

# Staging
cp .env.example .env.staging

# Production
cp .env.production.example .env.production
```

### Required Environment Variables

```bash
# Application
NODE_ENV=production
PORT=3000
API_PORT=3001
WEBSOCKET_PORT=3002

# Database
DATABASE_URL=postgresql://user:pass@host:5432/workflow
REDIS_URL=redis://host:6379

# Security
JWT_SECRET=your-super-secure-jwt-secret
ENCRYPTION_KEY=your-32-character-encryption-key

# OAuth (choose providers you want to support)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# External Services
OPENAI_API_KEY=your-openai-api-key
SENDGRID_API_KEY=your-sendgrid-api-key
```

### Secrets Management

**Development:**
Use environment files (not committed to git).

**Production:**
Use proper secrets management:
- **Kubernetes**: Kubernetes Secrets
- **Docker Swarm**: Docker Secrets
- **Cloud**: AWS Secrets Manager, Azure Key Vault, GCP Secret Manager

## 🔧 Development Deployment

### Quick Start

```bash
# Clone repository
git clone https://github.com/your-org/workflow-automation.git
cd workflow-automation

# Install dependencies
npm install

# Setup environment
cp .env.example .env.development

# Start development services
docker-compose -f docker-compose.dev.yml up -d

# Run migrations
npm run migrate

# Start development server
npm run dev
```

### Development Services

The development setup includes:
- **Application** (hot reload): http://localhost:3000
- **API Server**: http://localhost:3001
- **WebSocket Server**: ws://localhost:3002
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379
- **Grafana**: http://localhost:3003

## 🐳 Docker Compose Deployment

### Single Machine Production

```bash
# Clone and configure
git clone https://github.com/your-org/workflow-automation.git
cd workflow-automation

# Setup production environment
cp .env.production.example .env.production
# Edit .env.production with your values

# Deploy
docker-compose up -d

# Check status
docker-compose ps
```

### Multi-Environment Setup

```bash
# Staging
docker-compose -f docker-compose.yml -f docker-compose.staging.yml up -d

# Production
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# With monitoring
docker-compose --profile monitoring up -d

# With logging
docker-compose --profile logging up -d

# Full stack
docker-compose --profile monitoring --profile logging --profile backup up -d
```

### Service Scaling

```bash
# Scale application containers
docker-compose up -d --scale app=3

# Scale with custom resources
docker-compose -f docker-compose.yml -f docker-compose.scale.yml up -d
```

### Health Checks

```bash
# Check all services
docker-compose ps

# Check application health
curl http://localhost:3000/health

# Check API health
curl http://localhost:3001/health

# Check logs
docker-compose logs -f app
```

## ☸️ Kubernetes Deployment

### Prerequisites

```bash
# Verify cluster connection
kubectl cluster-info

# Create namespace
kubectl apply -f k8s/namespace.yaml

# Verify namespace
kubectl get namespaces
```

### Configuration

1. **Update Secrets**
```bash
# Edit k8s/configmap.yaml with your values
# Update secrets in k8s/configmap.yaml (base64 encoded)

# Apply configuration
kubectl apply -f k8s/configmap.yaml
```

2. **Storage Classes**
```bash
# Verify available storage classes
kubectl get storageclass

# Update storage class names in PVC manifests if needed
```

### Deployment Steps

```bash
# 1. Deploy databases first
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/redis.yaml

# 2. Wait for databases to be ready
kubectl wait --for=condition=ready pod -l app=postgres -n workflow-automation --timeout=300s
kubectl wait --for=condition=ready pod -l app=redis -n workflow-automation --timeout=300s

# 3. Deploy application
kubectl apply -f k8s/deployment.yaml

# 4. Wait for application
kubectl wait --for=condition=available deployment/workflow-app -n workflow-automation --timeout=300s

# 5. Deploy ingress
kubectl apply -f k8s/ingress.yaml

# 6. Deploy monitoring (optional)
kubectl apply -f k8s/monitoring.yaml
```

### Verification

```bash
# Check all resources
kubectl get all -n workflow-automation

# Check pod logs
kubectl logs -f deployment/workflow-app -n workflow-automation

# Check ingress
kubectl get ingress -n workflow-automation

# Port forward for testing
kubectl port-forward svc/workflow-app-service 3000:80 -n workflow-automation
```

### Scaling

```bash
# Manual scaling
kubectl scale deployment workflow-app --replicas=5 -n workflow-automation

# Check HPA status
kubectl get hpa -n workflow-automation

# Monitor scaling events
kubectl get events -n workflow-automation --sort-by='.lastTimestamp'
```

## ☁️ Cloud Deployments

### AWS EKS Deployment

#### Prerequisites
```bash
# Install AWS CLI and configure
aws configure

# Install eksctl
curl --silent --location "https://github.com/weaveworks/eksctl/releases/latest/download/eksctl_$(uname -s)_amd64.tar.gz" | tar xz -C /tmp
sudo mv /tmp/eksctl /usr/local/bin
```

#### Create EKS Cluster
```bash
# Create cluster
eksctl create cluster \
  --name workflow-cluster \
  --region us-west-2 \
  --nodegroup-name workers \
  --node-type m5.large \
  --nodes 3 \
  --nodes-min 1 \
  --nodes-max 10 \
  --managed

# Update kubeconfig
aws eks update-kubeconfig --region us-west-2 --name workflow-cluster
```

#### Deploy Application
```bash
# Deploy using our script
DEPLOYMENT_TYPE=aws AWS_CLUSTER_NAME=workflow-cluster ./scripts/deploy.sh

# Or deploy manually
kubectl apply -f k8s/
```

#### AWS-Specific Configuration

```yaml
# k8s/aws-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: workflow-ingress
  annotations:
    kubernetes.io/ingress.class: alb
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:us-west-2:123456789:certificate/your-cert
spec:
  rules:
  - host: workflow.your-domain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: workflow-app-service
            port:
              number: 80
```

### Google GKE Deployment

#### Prerequisites
```bash
# Install gcloud CLI
curl https://sdk.cloud.google.com | bash
exec -l $SHELL

# Authenticate and set project
gcloud auth login
gcloud config set project your-project-id
```

#### Create GKE Cluster
```bash
# Create cluster
gcloud container clusters create workflow-cluster \
  --zone us-central1-a \
  --num-nodes 3 \
  --enable-autoscaling \
  --min-nodes 1 \
  --max-nodes 10 \
  --machine-type n1-standard-2

# Get credentials
gcloud container clusters get-credentials workflow-cluster --zone us-central1-a
```

#### Deploy Application
```bash
# Deploy
kubectl apply -f k8s/

# Setup ingress with Google Load Balancer
kubectl apply -f k8s/gcp-ingress.yaml
```

### Azure AKS Deployment

#### Prerequisites
```bash
# Install Azure CLI
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Login
az login
```

#### Create AKS Cluster
```bash
# Create resource group
az group create --name WorkflowRG --location eastus

# Create AKS cluster
az aks create \
  --resource-group WorkflowRG \
  --name workflow-cluster \
  --node-count 3 \
  --enable-addons monitoring \
  --generate-ssh-keys

# Get credentials
az aks get-credentials --resource-group WorkflowRG --name workflow-cluster
```

## 📊 Monitoring & Observability

### Metrics Collection

The platform includes comprehensive monitoring:

**Application Metrics:**
- Request rates and response times
- Error rates and types
- Workflow execution metrics
- User activity metrics

**Infrastructure Metrics:**
- CPU, Memory, Disk usage
- Network I/O
- Database performance
- Cache hit rates

### Monitoring Stack

```bash
# Deploy monitoring stack
kubectl apply -f k8s/monitoring.yaml

# Access Grafana
kubectl port-forward svc/grafana-service 3000:3000 -n workflow-automation

# Access Prometheus
kubectl port-forward svc/prometheus-service 9090:9090 -n workflow-automation

# Access Jaeger
kubectl port-forward svc/jaeger-service 16686:16686 -n workflow-automation
```

### Alerting

Configure alerts in `monitoring/alert_rules.yml`:

```yaml
groups:
  - name: workflow.rules
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          
      - alert: WorkflowExecutionFailure
        expr: increase(workflow_executions_failed_total[5m]) > 5
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Multiple workflow executions failing"
```

### Log Management

```bash
# Deploy ELK stack
docker-compose --profile logging up -d

# Or with Kubernetes
kubectl apply -f k8s/logging.yaml

# Access Kibana
kubectl port-forward svc/kibana-service 5601:5601 -n workflow-automation
```

## 🔒 Security Configuration

### TLS/SSL Configuration

#### Automatic Certificate Management
```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Create ClusterIssuer
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@your-domain.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
```

#### Manual Certificate Configuration
```bash
# Create TLS secret
kubectl create secret tls workflow-tls-secret \
  --cert=path/to/cert.pem \
  --key=path/to/key.pem \
  -n workflow-automation
```

### Network Security

```yaml
# Network Policy Example
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: workflow-network-policy
  namespace: workflow-automation
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: workflow-automation
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
  egress:
  - {}  # Allow all egress traffic
```

## ⚡ Performance Optimization

### Resource Limits

```yaml
# Optimized resource configuration
resources:
  requests:
    memory: "512Mi"
    cpu: "250m"
  limits:
    memory: "2Gi"
    cpu: "1000m"
```

### Database Optimization

```sql
-- PostgreSQL optimizations
-- Enable connection pooling
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';

-- Optimize for workflow queries
CREATE INDEX CONCURRENTLY idx_workflows_user_status 
ON workflows(user_id, status) WHERE status = 'active';

CREATE INDEX CONCURRENTLY idx_executions_workflow_created 
ON workflow_executions(workflow_id, created_at);
```

### Redis Configuration

```bash
# Optimize Redis for caching
maxmemory 2gb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

### CDN Configuration

```nginx
# NGINX caching configuration
location /assets/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    add_header Vary Accept-Encoding;
    gzip_static on;
}

location /api/ {
    proxy_cache api_cache;
    proxy_cache_valid 200 302 5m;
    proxy_cache_key $scheme$proxy_host$request_uri;
}
```

## 🔧 Troubleshooting

### Common Issues

#### Application Won't Start
```bash
# Check logs
kubectl logs -f deployment/workflow-app -n workflow-automation

# Common causes:
# 1. Database connection issues
# 2. Missing environment variables
# 3. Port conflicts
# 4. Insufficient resources
```

#### Database Connection Issues
```bash
# Test database connectivity
kubectl exec -it deployment/workflow-app -n workflow-automation -- \
  psql $DATABASE_URL -c "SELECT 1"

# Check database pod
kubectl describe pod -l app=postgres -n workflow-automation
```

#### High Memory Usage
```bash
# Check memory usage
kubectl top pods -n workflow-automation

# Scale down if needed
kubectl scale deployment workflow-app --replicas=2 -n workflow-automation

# Check for memory leaks in logs
kubectl logs deployment/workflow-app -n workflow-automation | grep -i memory
```

#### Slow Performance
```bash
# Check resource usage
kubectl top nodes
kubectl top pods -n workflow-automation

# Check database performance
kubectl exec -it postgres-pod -- psql -c "
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;"

# Check Redis performance
kubectl exec -it redis-pod -- redis-cli info stats
```

### Health Checks

```bash
# Application health check
curl -f http://localhost:3000/health

# API health check
curl -f http://localhost:3001/health

# Database health check
kubectl exec -it postgres-pod -- pg_isready

# Redis health check
kubectl exec -it redis-pod -- redis-cli ping
```

### Backup and Recovery

```bash
# Create backup
./scripts/backup.sh

# List available backups
./scripts/backup.sh list

# Restore from backup
./scripts/backup.sh restore /path/to/backup.tar.gz
```

### Log Analysis

```bash
# Application logs
kubectl logs -f deployment/workflow-app -n workflow-automation

# Nginx logs
kubectl logs -f deployment/nginx -n workflow-automation

# Database logs
kubectl logs -f statefulset/postgres -n workflow-automation

# Filter error logs
kubectl logs deployment/workflow-app -n workflow-automation | grep ERROR

# Export logs for analysis
kubectl logs deployment/workflow-app -n workflow-automation --since=1h > app-logs.txt
```

### Performance Monitoring

```bash
# Check resource usage
kubectl top pods -n workflow-automation --sort-by=memory
kubectl top pods -n workflow-automation --sort-by=cpu

# Monitor in real-time
watch -n 2 'kubectl top pods -n workflow-automation'

# Check HPA scaling
kubectl describe hpa workflow-app-hpa -n workflow-automation
```

---

For more deployment scenarios and advanced configurations, see:
- [Security Guide](./SECURITY.md)
- [Monitoring Guide](./MONITORING.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)