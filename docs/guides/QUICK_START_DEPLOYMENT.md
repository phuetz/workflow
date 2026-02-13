# Quick Start Deployment Guide

This guide gets you from zero to deployed in under 10 minutes.

## Prerequisites

- Docker & Docker Compose installed
- kubectl and Helm 3+ (for Kubernetes)
- AWS CLI (for cloud deployment)

## Option 1: Local Development (2 minutes)

```bash
# Clone and start
git clone <repo-url>
cd workflow-automation
cp .env.example .env
docker-compose -f docker-compose.dev.yml up -d

# Access at:
# - Frontend: http://localhost:3000
# - API: http://localhost:3001
# - pgAdmin: http://localhost:5050
```

## Option 2: Production with Docker Compose (5 minutes)

```bash
# Configure production environment
cp .env.production.example .env.production

# Edit secrets (REQUIRED)
nano .env.production

# Deploy
docker-compose -f docker-compose.prod.yml up -d

# Verify
docker-compose -f docker-compose.prod.yml ps
curl http://localhost:3001/health
```

## Option 3: Kubernetes with Helm (8 minutes)

```bash
# Add Helm repositories
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# Create secrets file
cat > secrets.yaml <<EOF
secrets:
  data:
    DATABASE_URL: "postgresql://user:pass@postgres:5432/workflow"
    JWT_SECRET: "your-super-secret-jwt-key"
    ENCRYPTION_KEY: "your-32-character-encryption"
EOF

# Deploy
helm install workflow-platform ./helm/workflow-platform \
  --namespace production \
  --create-namespace \
  --values secrets.yaml

# Verify
kubectl get pods -n production
kubectl logs -f deployment/workflow-platform -n production
```

## Option 4: AWS with Terraform (30 minutes)

```bash
# Configure AWS
aws configure

# Deploy infrastructure
cd terraform/aws
terraform init
terraform apply

# Get cluster credentials
aws eks update-kubeconfig --name workflow-production

# Deploy application
helm install workflow-platform ../../helm/workflow-platform \
  --namespace production \
  --create-namespace \
  --set postgresql.enabled=false \
  --set redis.enabled=false \
  --set secrets.data.DATABASE_URL="$(terraform output -raw rds_endpoint)"

# Access
kubectl get ingress -n production
```

## Health Checks

```bash
# Application health
curl http://localhost:3001/health

# Database connection
kubectl exec -it <pod-name> -n production -- \
  psql $DATABASE_URL -c "SELECT 1"

# All services status
kubectl get all -n production
```

## Common Commands

```bash
# View logs
docker-compose logs -f                    # Docker Compose
kubectl logs -f deployment/workflow-platform  # Kubernetes

# Scale
docker-compose up -d --scale app=3       # Docker Compose
kubectl scale deployment workflow-platform --replicas=5  # K8s

# Update
docker-compose pull && docker-compose up -d  # Docker Compose
helm upgrade workflow-platform ./helm/workflow-platform  # K8s

# Stop
docker-compose down                      # Docker Compose
helm uninstall workflow-platform         # Kubernetes
```

## Troubleshooting

**Pods not starting:**
```bash
kubectl describe pod <pod-name> -n production
kubectl logs <pod-name> -n production
```

**Database connection failed:**
```bash
# Check database is running
kubectl get pods -n production | grep postgres

# Test connection
kubectl run -it --rm debug --image=postgres:15 --restart=Never -- \
  psql -h postgres -U workflow -d workflow
```

**Out of memory:**
```bash
# Increase limits
kubectl set resources deployment workflow-platform \
  --limits=memory=4Gi -n production
```

## Next Steps

- Read [DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md) for detailed instructions
- Configure monitoring: `docker-compose --profile monitoring up -d`
- Set up backups: See [DISASTER_RECOVERY.md](docs/DISASTER_RECOVERY.md)
- Enable CI/CD: Configure GitHub Actions workflows

## Support

- GitHub Issues: [Report issues](https://github.com/your-org/workflow-automation/issues)
- Documentation: [docs/](docs/)
- Email: support@workflow-platform.com
