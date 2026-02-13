# 📚 Guide de Déploiement - Workflow Automation Platform

## 🚀 Démarrage Rapide

### Option 1: Script Automatique (Recommandé)
```bash
# Rendre le script exécutable
chmod +x quick-start.sh

# Lancer en mode interactif
./quick-start.sh

# Ou lancer directement un environnement
./quick-start.sh dev        # Développement
./quick-start.sh docker     # Stack Docker complet
./quick-start.sh k8s        # Kubernetes
./quick-start.sh prod       # Production
```

### Option 2: Commandes Manuelles

#### Développement
```bash
# Installer les dépendances
npm install

# Lancer en développement
npm run dev

# Accéder à http://localhost:3000
```

#### Production
```bash
# Build optimisé
npm run build

# Lancer en production
NODE_ENV=production npm start
```

## 🐳 Déploiement Docker

### Prérequis
- Docker 20.10+
- Docker Compose 2.0+
- 8GB RAM minimum
- 20GB espace disque

### Lancement
```bash
# Stack complet avec monitoring
docker-compose -f docker/docker-compose.scalability.yml up -d

# Vérifier les services
docker-compose -f docker/docker-compose.scalability.yml ps

# Voir les logs
docker-compose -f docker/docker-compose.scalability.yml logs -f
```

### Services Disponibles
| Service | URL | Credentials |
|---------|-----|-------------|
| Application | http://localhost:3000 | - |
| GraphQL API | http://localhost:4000 | - |
| RabbitMQ | http://localhost:15672 | admin/admin |
| Redis Commander | http://localhost:8081 | - |
| Grafana | http://localhost:3001 | admin/admin |
| Prometheus | http://localhost:9090 | - |
| Jaeger | http://localhost:16686 | - |

## ☸️ Déploiement Kubernetes

### Prérequis
- Kubernetes 1.25+
- kubectl configuré
- Helm 3.0+ (optionnel)
- Ingress Controller
- cert-manager (pour SSL)

### Installation Complète

#### 1. Créer le Namespace
```bash
kubectl create namespace workflow-scalability
```

#### 2. Appliquer les Secrets
```bash
# Créer les secrets (éditer d'abord les valeurs)
kubectl create secret generic scalability-secrets \
  --from-literal=REDIS_PASSWORD=your-redis-password \
  --from-literal=RABBITMQ_PASSWORD=your-rabbitmq-password \
  --from-literal=POSTGRES_PASSWORD=your-postgres-password \
  --from-literal=JWT_SECRET=your-jwt-secret-min-32-chars \
  --from-literal=ENCRYPTION_KEY=your-encryption-key \
  -n workflow-scalability
```

#### 3. Déployer l'Infrastructure
```bash
# Services de base (Redis, RabbitMQ, PostgreSQL)
kubectl apply -f k8s/scalability-infrastructure.yaml

# Attendre que les services soient prêts
kubectl wait --for=condition=ready pod -l app=redis -n workflow-scalability --timeout=300s
kubectl wait --for=condition=ready pod -l app=rabbitmq -n workflow-scalability --timeout=300s
kubectl wait --for=condition=ready pod -l app=postgres -n workflow-scalability --timeout=300s
```

#### 4. Déployer l'Application
```bash
# Application principale et workers
kubectl apply -f k8s/scalability-deployment.yaml

# Vérifier le déploiement
kubectl get all -n workflow-scalability
```

#### 5. Configurer le Monitoring
```bash
# Stack de monitoring (Prometheus, Grafana, Jaeger)
kubectl apply -f k8s/scalability-monitoring.yaml

# Accéder à Grafana
kubectl port-forward svc/grafana-service 3000:3000 -n workflow-scalability
```

#### 6. Configurer l'Ingress
```bash
# Éditer les domaines dans k8s/scalability-deployment.yaml
# Remplacer workflow.example.com par votre domaine

# Appliquer l'ingress
kubectl apply -f k8s/scalability-deployment.yaml

# Vérifier l'ingress
kubectl get ingress -n workflow-scalability
```

### Déploiement avec Helm

```bash
# Ajouter le repo (si disponible)
helm repo add workflow https://charts.workflow.example.com
helm repo update

# Installer avec les valeurs personnalisées
helm install workflow-scalability ./helm/workflow-scalability \
  --namespace workflow-scalability \
  --create-namespace \
  --values k8s/helm-values.yaml \
  --set app.domain=your-domain.com \
  --set monitoring.enabled=true
```

### Scaling

#### Auto-scaling
```bash
# Vérifier l'HPA
kubectl get hpa -n workflow-scalability

# Modifier les limites
kubectl edit hpa workflow-scalability-hpa -n workflow-scalability
```

#### Scaling Manuel
```bash
# Scale l'application
kubectl scale deployment workflow-scalability-app --replicas=10 -n workflow-scalability

# Scale les workers
kubectl scale deployment workflow-worker-pool --replicas=20 -n workflow-scalability
```

## 🔧 Configuration

### Variables d'Environnement

#### Obligatoires
```env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/db
REDIS_URL=redis://host:6379
JWT_SECRET=minimum-32-characters-secret
ENCRYPTION_KEY=256-bit-encryption-key
```

#### Scalabilité
```env
ENABLE_WORKER_POOL=true
ENABLE_QUEUE=true
ENABLE_LOAD_BALANCER=true
ENABLE_AUTO_SCALING=true
ENABLE_FEDERATION=true
MAX_WORKERS=100
MIN_INSTANCES=3
MAX_INSTANCES=50
TARGET_UTILIZATION=70
```

#### Monitoring
```env
MONITORING_ENABLED=true
MONITORING_INTERVAL=30000
METRICS_PORT=9090
TRACING_ENABLED=true
JAEGER_ENDPOINT=http://jaeger:14268
```

### Configuration des Services

#### Redis
```yaml
maxmemory: 2gb
maxmemory-policy: allkeys-lru
appendonly: yes
cluster-enabled: yes  # Pour la haute disponibilité
```

#### RabbitMQ
```yaml
vm_memory_high_watermark: 0.6
disk_free_limit: 5GB
heartbeat: 60
channel_max: 2047
```

#### PostgreSQL
```yaml
max_connections: 500
shared_buffers: 2GB
effective_cache_size: 6GB
maintenance_work_mem: 512MB
```

## 📊 Monitoring

### Dashboards Grafana

1. **Importer les dashboards**
```bash
# Accéder à Grafana
kubectl port-forward svc/grafana-service 3000:3000 -n workflow-scalability

# Login: admin/admin
# Importer les dashboards depuis grafana/dashboards/
```

2. **Dashboards Disponibles**
- Application Metrics
- Worker Pool Performance
- Queue Statistics
- Database Performance
- Infrastructure Overview

### Alertes

Les alertes sont configurées dans Prometheus:
- High CPU Usage (>80%)
- High Memory Usage (>90%)
- Pod Crash Looping
- High Queue Length (>1000)
- Worker Pool Exhausted
- Database Connection Failure
- High Error Rate (>5%)
- Slow Response Time (>2s)

### Logs

#### Docker
```bash
# Tous les logs
docker-compose -f docker/docker-compose.scalability.yml logs

# Service spécifique
docker-compose -f docker/docker-compose.scalability.yml logs app
```

#### Kubernetes
```bash
# Logs de l'application
kubectl logs -f deployment/workflow-scalability-app -n workflow-scalability

# Logs des workers
kubectl logs -f deployment/workflow-worker-pool -n workflow-scalability

# Logs avec sélecteur
kubectl logs -l app=workflow-scalability -n workflow-scalability --tail=100
```

## 🔒 Sécurité

### SSL/TLS

#### Avec cert-manager
```bash
# Installer cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Créer l'issuer
cat <<EOF | kubectl apply -f -
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

### Secrets Management

```bash
# Rotation des secrets
kubectl create secret generic scalability-secrets-new \
  --from-literal=JWT_SECRET=new-secret \
  --dry-run=client -o yaml | kubectl apply -f -

# Redémarrer les pods
kubectl rollout restart deployment -n workflow-scalability
```

## 🔄 Maintenance

### Backup

#### Base de Données
```bash
# Backup PostgreSQL
kubectl exec -it postgres-0 -n workflow-scalability -- \
  pg_dump -U postgres workflow > backup-$(date +%Y%m%d).sql

# Restore
kubectl exec -i postgres-0 -n workflow-scalability -- \
  psql -U postgres workflow < backup.sql
```

#### Volumes Persistants
```bash
# Backup des PVC
kubectl get pvc -n workflow-scalability -o yaml > pvc-backup.yaml
```

### Updates

#### Rolling Update
```bash
# Mettre à jour l'image
kubectl set image deployment/workflow-scalability-app \
  workflow-app=workflow-scalability:v2.0.0 \
  -n workflow-scalability

# Vérifier le rollout
kubectl rollout status deployment/workflow-scalability-app -n workflow-scalability
```

#### Rollback
```bash
# Voir l'historique
kubectl rollout history deployment/workflow-scalability-app -n workflow-scalability

# Rollback à la version précédente
kubectl rollout undo deployment/workflow-scalability-app -n workflow-scalability

# Rollback à une version spécifique
kubectl rollout undo deployment/workflow-scalability-app --to-revision=3 -n workflow-scalability
```

## 🆘 Troubleshooting

### Problèmes Courants

#### Pods en CrashLoopBackOff
```bash
# Vérifier les logs
kubectl logs <pod-name> -n workflow-scalability --previous

# Vérifier les events
kubectl describe pod <pod-name> -n workflow-scalability

# Vérifier les ressources
kubectl top pods -n workflow-scalability
```

#### Services Non Accessibles
```bash
# Vérifier les endpoints
kubectl get endpoints -n workflow-scalability

# Tester la connectivité
kubectl run test-pod --image=busybox -it --rm --restart=Never -- \
  wget -qO- http://workflow-scalability-service/health
```

#### Performance Issues
```bash
# Vérifier les métriques
kubectl top nodes
kubectl top pods -n workflow-scalability

# Analyser les HPA
kubectl describe hpa -n workflow-scalability

# Vérifier les limites
kubectl describe resourcequota -n workflow-scalability
```

### Commandes Utiles

```bash
# État général
kubectl get all -n workflow-scalability

# Débugger un pod
kubectl exec -it <pod-name> -n workflow-scalability -- /bin/sh

# Port forwarding pour debug
kubectl port-forward <pod-name> 8080:3000 -n workflow-scalability

# Voir les événements récents
kubectl get events -n workflow-scalability --sort-by='.lastTimestamp'

# Nettoyer les pods terminés
kubectl delete pod --field-selector=status.phase==Succeeded -n workflow-scalability
```

## 📈 Performance Tuning

### Optimisations Recommandées

1. **Node.js**
```bash
NODE_OPTIONS="--max-old-space-size=4096 --optimize-for-size"
UV_THREADPOOL_SIZE=16
```

2. **Kubernetes Resources**
```yaml
resources:
  requests:
    memory: "1Gi"
    cpu: "500m"
  limits:
    memory: "4Gi"
    cpu: "2000m"
```

3. **HPA Configuration**
```yaml
behavior:
  scaleUp:
    stabilizationWindowSeconds: 0
    policies:
    - type: Percent
      value: 100
      periodSeconds: 15
  scaleDown:
    stabilizationWindowSeconds: 300
```

## 🌍 Multi-Region Deployment

### Configuration
```yaml
# Dans k8s/multi-region.yaml
topologySpreadConstraints:
- maxSkew: 1
  topologyKey: topology.kubernetes.io/zone
  whenUnsatisfiable: DoNotSchedule
  labelSelector:
    matchLabels:
      app: workflow-scalability
```

### Réplication Cross-Region
```bash
# Configurer la réplication PostgreSQL
# Configurer Redis Cluster multi-zone
# Configurer RabbitMQ Federation
```

## 📞 Support

### Logs à Collecter pour Support
1. Logs d'application (dernières 1000 lignes)
2. Métriques Prometheus (dernière heure)
3. Events Kubernetes (derniers 100)
4. Configuration actuelle (sans secrets)

### Script de Collecte
```bash
#!/bin/bash
# collect-support-info.sh
kubectl logs -l app=workflow-scalability -n workflow-scalability --tail=1000 > app-logs.txt
kubectl get events -n workflow-scalability --sort-by='.lastTimestamp' | head -100 > events.txt
kubectl get all -n workflow-scalability -o yaml > resources.yaml
kubectl top pods -n workflow-scalability > metrics.txt
tar -czf support-bundle-$(date +%Y%m%d-%H%M%S).tar.gz *.txt *.yaml
```

---

## ✅ Checklist de Déploiement

### Développement
- [ ] Node.js 18+ installé
- [ ] Dependencies installées
- [ ] Variables d'environnement configurées
- [ ] Tests passent

### Docker
- [ ] Docker/Docker Compose installés
- [ ] Images construites
- [ ] Volumes configurés
- [ ] Services démarrés

### Kubernetes
- [ ] Cluster disponible
- [ ] Namespace créé
- [ ] Secrets configurés
- [ ] Services déployés
- [ ] Ingress configuré
- [ ] SSL/TLS activé
- [ ] Monitoring opérationnel
- [ ] Backup configuré

### Production
- [ ] DNS configuré
- [ ] SSL certificats
- [ ] Monitoring/Alerting
- [ ] Backup automatique
- [ ] Plan de rollback
- [ ] Documentation équipe
- [ ] Runbook incidents

---

**📌 Note**: Pour une assistance rapide, utilisez le script `quick-start.sh` qui automatise la plupart des étapes de déploiement.

---

*Generated with Ultra Think Methodology - Plan C Deployment Guide*