# Kubernetes Deployment Guide

Complete guide for deploying Workflow Automation Platform on Kubernetes with high availability, auto-scaling, and advanced deployment strategies.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Configuration](#configuration)
4. [Deployment Methods](#deployment-methods)
5. [High Availability](#high-availability)
6. [Auto-Scaling](#auto-scaling)
7. [Multi-Region Deployment](#multi-region-deployment)
8. [Blue-Green Deployment](#blue-green-deployment)
9. [Canary Deployment](#canary-deployment)
10. [Service Mesh (Istio)](#service-mesh-istio)
11. [Monitoring & Observability](#monitoring--observability)
12. [Security](#security)
13. [Backup & Recovery](#backup--recovery)
14. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required

- Kubernetes cluster version 1.24+
- kubectl configured to access your cluster
- Helm 3.x installed
- At least 3 worker nodes (for HA)
- Minimum resources per node:
  - 4 CPU cores
  - 8 GB RAM
  - 50 GB disk space

### Optional

- cert-manager (for automatic SSL certificates)
- Istio (for service mesh features)
- Prometheus & Grafana (for monitoring)
- External PostgreSQL database
- External Redis instance

## Quick Start

### 1. Install Helm Chart

```bash
# Add Helm repository (if using a Helm repository)
helm repo add workflow-automation https://charts.example.com
helm repo update

# Install with default values
helm install workflow-automation workflow-automation/workflow-automation

# Or install from local chart
helm install workflow-automation ./k8s/helm-chart
```

### 2. Verify Installation

```bash
# Check pod status
kubectl get pods -l app.kubernetes.io/name=workflow-automation

# Check services
kubectl get svc -l app.kubernetes.io/name=workflow-automation

# Get ingress URL
kubectl get ingress
```

### 3. Access Application

```bash
# Port-forward for local access
kubectl port-forward svc/workflow-automation 8080:80

# Or access via ingress
curl https://workflow.example.com/health
```

## Configuration

### Values File

Create a custom `values.yaml`:

```yaml
# Production configuration example
replicaCount: 5

image:
  repository: your-registry/workflow-automation
  tag: "1.0.0"

resources:
  limits:
    cpu: 2000m
    memory: 2Gi
  requests:
    cpu: 1000m
    memory: 1Gi

autoscaling:
  enabled: true
  minReplicas: 5
  maxReplicas: 20
  targetCPUUtilizationPercentage: 70

ingress:
  enabled: true
  className: nginx
  hosts:
    - host: workflow.production.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: workflow-tls
      hosts:
        - workflow.production.com

postgresql:
  enabled: true
  auth:
    database: workflow_prod
    username: workflow
  primary:
    persistence:
      size: 100Gi

redis:
  enabled: true
  master:
    persistence:
      size: 20Gi
```

### Install with Custom Values

```bash
helm install workflow-automation ./k8s/helm-chart \
  -f custom-values.yaml \
  --namespace production \
  --create-namespace
```

## Deployment Methods

### Standard Deployment

Default Kubernetes deployment with rolling updates:

```bash
helm install workflow-automation ./k8s/helm-chart
```

### Blue-Green Deployment

Zero-downtime deployment using two identical environments:

```yaml
# values-blue-green.yaml
blueGreen:
  enabled: true

replicaCount: 3
```

Deploy to green environment:

```bash
# Deploy new version to green
helm upgrade workflow-automation ./k8s/helm-chart \
  -f values-blue-green.yaml \
  --set image.tag=2.0.0 \
  --set targetEnvironment=green

# Run smoke tests
kubectl exec -it deployment/workflow-automation-green -- npm run test:smoke

# Switch traffic
kubectl patch service workflow-automation \
  -p '{"spec":{"selector":{"environment":"green"}}}'

# Verify
kubectl get endpoints workflow-automation

# Keep blue as rollback option or destroy
kubectl delete deployment workflow-automation-blue
```

### Canary Deployment

Gradual rollout with automatic monitoring:

```yaml
# values-canary.yaml
canary:
  enabled: true
  stages:
    - name: "1% Canary"
      weight: 1
      duration: "5m"
    - name: "10% Canary"
      weight: 10
      duration: "10m"
    - name: "50% Canary"
      weight: 50
      duration: "15m"
    - name: "100% Rollout"
      weight: 100
      duration: "5m"

  metricsThresholds:
    errorRate: 1.0  # 1%
    responseTime: 500  # ms
```

Deploy canary:

```bash
helm upgrade workflow-automation ./k8s/helm-chart \
  -f values-canary.yaml \
  --set image.tag=2.0.0

# Monitor canary progress
kubectl get canary workflow-automation -w

# Manual approval (if required)
kubectl annotate canary workflow-automation \
  approval=approved

# Rollback if needed
kubectl rollout undo deployment/workflow-automation
```

## High Availability

### Multi-Replica Setup

```yaml
replicaCount: 5  # Odd number for quorum

podDisruptionBudget:
  enabled: true
  minAvailable: 3  # Maintain at least 3 pods

affinity:
  podAntiAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:
      - labelSelector:
          matchExpressions:
            - key: app
              operator: In
              values:
                - workflow-automation
        topologyKey: kubernetes.io/hostname
```

### Database High Availability

```yaml
postgresql:
  architecture: replication
  replication:
    enabled: true
    numSynchronousReplicas: 2
  primary:
    persistence:
      size: 100Gi
  readReplicas:
    replicaCount: 2
    persistence:
      size: 100Gi
```

### Redis High Availability

```yaml
redis:
  architecture: replication
  sentinel:
    enabled: true
  master:
    persistence:
      size: 20Gi
  replica:
    replicaCount: 2
    persistence:
      size: 20Gi
```

## Auto-Scaling

### Horizontal Pod Autoscaling

```yaml
autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 20
  targetCPUUtilizationPercentage: 70
  targetMemoryUtilizationPercentage: 80

  # Custom metrics (requires metrics-server)
  metrics:
    - type: Pods
      pods:
        metric:
          name: http_requests_per_second
        target:
          type: AverageValue
          averageValue: "1000"
```

### Cluster Autoscaling

Enable cluster autoscaler on your cloud provider:

```bash
# AWS EKS
eksctl create cluster \
  --name workflow-cluster \
  --nodegroup-name workers \
  --node-type m5.xlarge \
  --nodes 3 \
  --nodes-min 3 \
  --nodes-max 10 \
  --asg-access

# GKE
gcloud container clusters create workflow-cluster \
  --enable-autoscaling \
  --min-nodes 3 \
  --max-nodes 10

# AKS
az aks create \
  --name workflow-cluster \
  --enable-cluster-autoscaler \
  --min-count 3 \
  --max-count 10
```

## Multi-Region Deployment

### Active-Active Configuration

Deploy to multiple regions:

```bash
# Region 1: US-East
helm install workflow-automation ./k8s/helm-chart \
  --namespace production \
  --create-namespace \
  -f values-us-east.yaml

# Region 2: US-West
helm install workflow-automation ./k8s/helm-chart \
  --namespace production \
  --create-namespace \
  -f values-us-west.yaml

# Region 3: EU-West
helm install workflow-automation ./k8s/helm-chart \
  --namespace production \
  --create-namespace \
  -f values-eu-west.yaml
```

### Global Load Balancing

Configure DNS-based load balancing:

```yaml
# Route53 configuration (AWS)
apiVersion: v1
kind: Service
metadata:
  name: workflow-automation
  annotations:
    external-dns.alpha.kubernetes.io/hostname: workflow.example.com
    service.beta.kubernetes.io/aws-load-balancer-cross-zone-load-balancing-enabled: "true"
spec:
  type: LoadBalancer
```

### Data Replication

Configure cross-region PostgreSQL replication:

```yaml
postgresql:
  replication:
    enabled: true
    mode: async
    synchronousCommit: remote_apply
    numSynchronousReplicas: 1
  externalPrimary:
    host: postgres-us-east.example.com
    port: 5432
```

## Service Mesh (Istio)

### Install Istio

```bash
# Install Istio
istioctl install --set profile=production

# Enable sidecar injection
kubectl label namespace production istio-injection=enabled
```

### VirtualService Configuration

```yaml
istio:
  enabled: true
  virtualService:
    enabled: true
    gateways:
      - istio-system/workflow-gateway
    hosts:
      - workflow.example.com
    http:
      - match:
          - uri:
              prefix: /api
        route:
          - destination:
              host: workflow-automation
              port:
                number: 80
            weight: 90
          - destination:
              host: workflow-automation-canary
              port:
                number: 80
            weight: 10
        timeout: 30s
        retries:
          attempts: 3
          perTryTimeout: 10s
```

### Circuit Breaker

```yaml
istio:
  destinationRule:
    enabled: true
    trafficPolicy:
      connectionPool:
        tcp:
          maxConnections: 100
        http:
          http1MaxPendingRequests: 50
          maxRequestsPerConnection: 2
      outlierDetection:
        consecutiveErrors: 5
        interval: 30s
        baseEjectionTime: 30s
        maxEjectionPercent: 50
```

## Monitoring & Observability

### Prometheus

```yaml
prometheus:
  enabled: true
  server:
    persistentVolume:
      size: 50Gi
    retention: 30d
  alertmanager:
    enabled: true
```

### Grafana

```yaml
grafana:
  enabled: true
  adminPassword: <secure-password>
  dashboards:
    default:
      workflow-metrics:
        url: https://grafana.com/dashboards/12345
```

### Custom Metrics

Export application metrics:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: workflow-automation-metrics
  labels:
    app: workflow-automation
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "9090"
    prometheus.io/path: "/metrics"
```

### Distributed Tracing

Enable Jaeger for distributed tracing:

```bash
# Install Jaeger
kubectl create namespace observability
kubectl create -f https://raw.githubusercontent.com/jaegertracing/jaeger-operator/main/deploy/crds/jaegertracing.io_jaegers_crd.yaml
kubectl create -n observability -f https://raw.githubusercontent.com/jaegertracing/jaeger-operator/main/deploy/service_account.yaml
kubectl create -n observability -f https://raw.githubusercontent.com/jaegertracing/jaeger-operator/main/deploy/role.yaml
kubectl create -n observability -f https://raw.githubusercontent.com/jaegertracing/jaeger-operator/main/deploy/role_binding.yaml
kubectl create -n observability -f https://raw.githubusercontent.com/jaegertracing/jaeger-operator/main/deploy/operator.yaml
```

## Security

### Network Policies

```yaml
networkPolicy:
  enabled: true
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: ingress-nginx
      ports:
        - protocol: TCP
          port: 3000
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              name: production
      ports:
        - protocol: TCP
          port: 5432  # PostgreSQL
        - protocol: TCP
          port: 6379  # Redis
```

### Pod Security Standards

```yaml
podSecurityContext:
  runAsNonRoot: true
  runAsUser: 1000
  fsGroup: 1000
  seccompProfile:
    type: RuntimeDefault

securityContext:
  allowPrivilegeEscalation: false
  capabilities:
    drop:
      - ALL
  readOnlyRootFilesystem: true
```

### Secrets Management

Use external secrets operator:

```bash
# Install External Secrets Operator
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets external-secrets/external-secrets

# Configure secret store (AWS Secrets Manager example)
kubectl apply -f - <<EOF
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: aws-secrets
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1
EOF
```

## Backup & Recovery

### Automated Backups

```yaml
backup:
  enabled: true
  schedule: "0 2 * * *"  # Daily at 2 AM
  retention: 30  # days
  destinations:
    - type: s3
      bucket: workflow-backups
      region: us-east-1
```

### Manual Backup

```bash
# Backup PostgreSQL
kubectl exec -n production postgresql-0 -- \
  pg_dump -U workflow workflow > backup-$(date +%Y%m%d).sql

# Upload to S3
aws s3 cp backup-$(date +%Y%m%d).sql \
  s3://workflow-backups/$(date +%Y%m%d)/
```

### Disaster Recovery

```bash
# Restore from backup
kubectl exec -n production postgresql-0 -- \
  psql -U workflow workflow < backup-20250101.sql

# Verify data integrity
kubectl exec -n production deployment/workflow-automation -- \
  npm run verify:data
```

## Troubleshooting

### Pod Not Starting

```bash
# Check pod status
kubectl describe pod <pod-name>

# Check logs
kubectl logs <pod-name>

# Check events
kubectl get events --sort-by='.lastTimestamp'
```

### Database Connection Issues

```bash
# Test database connectivity
kubectl exec -it deployment/workflow-automation -- \
  nc -zv postgresql 5432

# Check database credentials
kubectl get secret workflow-automation-secrets -o yaml
```

### Performance Issues

```bash
# Check resource usage
kubectl top pods
kubectl top nodes

# Check HPA status
kubectl get hpa

# View detailed metrics
kubectl get --raw /apis/metrics.k8s.io/v1beta1/pods
```

### Scaling Issues

```bash
# Check HPA events
kubectl describe hpa workflow-automation

# Manually scale
kubectl scale deployment workflow-automation --replicas=10

# Check pod distribution
kubectl get pods -o wide
```

## Best Practices

1. **Always use resource limits** to prevent resource exhaustion
2. **Enable PodDisruptionBudgets** for high availability
3. **Use liveness and readiness probes** for health checks
4. **Implement graceful shutdown** with preStop hooks
5. **Use ConfigMaps and Secrets** for configuration
6. **Enable monitoring and logging** from day one
7. **Test disaster recovery procedures** regularly
8. **Keep Helm charts versioned** in Git
9. **Use Helm hooks** for database migrations
10. **Implement proper RBAC** for security

## Production Checklist

- [ ] SSL/TLS certificates configured
- [ ] Database backups automated
- [ ] Monitoring and alerting set up
- [ ] Log aggregation configured
- [ ] Resource limits defined
- [ ] Pod disruption budgets created
- [ ] Network policies applied
- [ ] Security contexts configured
- [ ] Health checks implemented
- [ ] Disaster recovery tested
- [ ] Auto-scaling validated
- [ ] Multi-region failover tested
- [ ] Documentation updated

## Support

For issues and questions:
- GitHub Issues: https://github.com/yourorg/workflow-automation/issues
- Documentation: https://docs.workflow-automation.com
- Community Slack: https://slack.workflow-automation.com
