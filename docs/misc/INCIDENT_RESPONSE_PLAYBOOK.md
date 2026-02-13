# 🚨 PLAYBOOK D'INCIDENT RESPONSE - PLAN C

## 📋 Table des Matières
1. [Niveaux de Sévérité](#niveaux-de-sévérité)
2. [Procédures par Type d'Incident](#procédures-par-type-dincident)
3. [Commandes de Diagnostic](#commandes-de-diagnostic)
4. [Actions de Récupération](#actions-de-récupération)
5. [Escalade et Communication](#escalade-et-communication)

---

## 🎯 Niveaux de Sévérité

| Niveau | Description | Temps de Réponse | Exemples |
|--------|-------------|------------------|----------|
| **P0 - Critique** | Service complètement down | < 15 min | Site inaccessible, perte de données |
| **P1 - Majeur** | Dégradation sévère | < 30 min | Latence >2s, erreurs >10% |
| **P2 - Modéré** | Impact limité | < 2h | Feature non critique down |
| **P3 - Mineur** | Peu d'impact | < 24h | UI bugs, performances dégradées |

---

## 🔥 Procédures par Type d'Incident

### 1. SERVICE DOWN COMPLET (P0)

#### Symptômes
- Site complètement inaccessible
- Health checks en échec
- Alertes multiples Prometheus

#### Actions Immédiates
```bash
# 1. Vérifier le statut global
kubectl get all -n workflow-scalability

# 2. Vérifier les pods
kubectl get pods -n workflow-scalability | grep -v Running

# 3. Rollback immédiat si déploiement récent
kubectl rollout undo deployment/workflow-scalability-app -n workflow-scalability

# 4. Redémarrer les services critiques
kubectl rollout restart deployment/workflow-scalability-app -n workflow-scalability
```

#### Diagnostic Approfondi
```bash
# Logs des dernières 5 minutes
kubectl logs -l app=workflow-scalability --since=5m -n workflow-scalability

# Events Kubernetes
kubectl get events -n workflow-scalability --sort-by='.lastTimestamp' | head -20

# Vérifier les ressources
kubectl top pods -n workflow-scalability
kubectl describe pod <pod-name> -n workflow-scalability
```

---

### 2. HAUTE LATENCE (P1)

#### Symptômes
- Response time > 2 secondes
- Queue length > 1000
- CPU > 90%

#### Actions Immédiates
```bash
# 1. Augmenter le nombre de replicas
kubectl scale deployment/workflow-scalability-app --replicas=10 -n workflow-scalability

# 2. Vérifier la queue
docker exec -it workflow-rabbitmq rabbitmqctl list_queues

# 3. Vider la dead letter queue si nécessaire
kubectl exec -it rabbitmq-0 -n workflow-scalability -- rabbitmqctl purge_queue dead_letter

# 4. Augmenter les workers
kubectl scale deployment/workflow-worker-pool --replicas=20 -n workflow-scalability
```

#### Optimisations
```bash
# Activer le cache Redis
kubectl set env deployment/workflow-scalability-app ENABLE_CACHE=true -n workflow-scalability

# Augmenter les limites de ressources
kubectl patch deployment workflow-scalability-app -n workflow-scalability -p '
{
  "spec": {
    "template": {
      "spec": {
        "containers": [{
          "name": "workflow-app",
          "resources": {
            "limits": {
              "memory": "8Gi",
              "cpu": "4000m"
            }
          }
        }]
      }
    }
  }
}'
```

---

### 3. ERREURS ÉLEVÉES (P1)

#### Symptômes
- Error rate > 5%
- 5xx responses
- Logs d'erreur fréquents

#### Actions Immédiates
```bash
# 1. Identifier les erreurs
kubectl logs -l app=workflow-scalability -n workflow-scalability | grep ERROR | tail -50

# 2. Vérifier la base de données
kubectl exec -it postgres-0 -n workflow-scalability -- psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"

# 3. Redémarrer les pods en erreur
kubectl delete pod <pod-name> -n workflow-scalability

# 4. Activer le mode debug
kubectl set env deployment/workflow-scalability-app LOG_LEVEL=debug -n workflow-scalability
```

#### Analyse des Erreurs
```bash
# Analyser les patterns d'erreur
kubectl logs -l app=workflow-scalability -n workflow-scalability | grep -E "ERROR|FATAL" | cut -d' ' -f4- | sort | uniq -c | sort -rn | head -20

# Vérifier les connexions
netstat -an | grep ESTABLISHED | wc -l
```

---

### 4. FUITE MÉMOIRE (P2)

#### Symptômes
- Memory usage croissante
- OOMKilled pods
- Performance dégradée

#### Actions Immédiates
```bash
# 1. Identifier les pods problématiques
kubectl top pods -n workflow-scalability --sort-by=memory

# 2. Redémarrer les pods gourmands
kubectl delete pod <high-memory-pod> -n workflow-scalability

# 3. Activer le garbage collector agressif
kubectl set env deployment/workflow-scalability-app NODE_OPTIONS="--max-old-space-size=2048 --gc-interval=100" -n workflow-scalability

# 4. Réduire les caches
kubectl set env deployment/workflow-scalability-app CACHE_TTL=60 -n workflow-scalability
```

---

### 5. PROBLÈME DE BASE DE DONNÉES (P1)

#### Symptômes
- Connexions refusées
- Queries lentes
- Locks détectés

#### Actions Immédiates
```bash
# 1. Vérifier les connexions actives
kubectl exec -it postgres-0 -n workflow-scalability -- psql -U postgres -c "
SELECT 
  pid,
  usename,
  application_name,
  client_addr,
  state,
  query_start,
  state_change,
  query
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY query_start;"

# 2. Tuer les queries bloquantes
kubectl exec -it postgres-0 -n workflow-scalability -- psql -U postgres -c "
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE state != 'idle' 
AND query_start < now() - interval '5 minutes';"

# 3. Vacuum et analyze
kubectl exec -it postgres-0 -n workflow-scalability -- psql -U postgres -c "VACUUM ANALYZE;"

# 4. Augmenter le pool de connexions
kubectl set env deployment/workflow-scalability-app DATABASE_POOL_SIZE=50 -n workflow-scalability
```

---

## 🔍 Commandes de Diagnostic

### Diagnostic Rapide (< 1 minute)
```bash
# Script de diagnostic rapide
cat << 'EOF' > quick-diagnosis.sh
#!/bin/bash
echo "=== PODS STATUS ==="
kubectl get pods -n workflow-scalability | grep -v Running

echo "=== RECENT EVENTS ==="
kubectl get events -n workflow-scalability --sort-by='.lastTimestamp' | head -10

echo "=== TOP PODS BY CPU ==="
kubectl top pods -n workflow-scalability --sort-by=cpu | head -5

echo "=== TOP PODS BY MEMORY ==="
kubectl top pods -n workflow-scalability --sort-by=memory | head -5

echo "=== ERROR LOGS ==="
kubectl logs -l app=workflow-scalability -n workflow-scalability --since=5m | grep ERROR | tail -10

echo "=== HPA STATUS ==="
kubectl get hpa -n workflow-scalability
EOF

chmod +x quick-diagnosis.sh
./quick-diagnosis.sh
```

### Monitoring en Temps Réel
```bash
# Watch pods
watch -n 2 "kubectl get pods -n workflow-scalability"

# Tail logs
kubectl logs -f -l app=workflow-scalability -n workflow-scalability

# Monitor resources
watch -n 5 "kubectl top pods -n workflow-scalability"

# Grafana dashboard
kubectl port-forward svc/grafana-service 3000:3000 -n workflow-scalability
# Open http://localhost:3000
```

---

## 💊 Actions de Récupération

### Redémarrage Progressif
```bash
# 1. Cordon nodes (empêcher nouveaux pods)
kubectl cordon <node-name>

# 2. Drain node (déplacer pods existants)
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data

# 3. Redémarrer services un par un
kubectl rollout restart deployment/workflow-scalability-app -n workflow-scalability
sleep 60
kubectl rollout restart deployment/workflow-worker-pool -n workflow-scalability

# 4. Uncordon node
kubectl uncordon <node-name>
```

### Backup d'Urgence
```bash
# Backup de la base de données
kubectl exec -it postgres-0 -n workflow-scalability -- pg_dump -U postgres workflow > backup-emergency-$(date +%Y%m%d-%H%M%S).sql

# Backup des ConfigMaps et Secrets
kubectl get configmap -n workflow-scalability -o yaml > configmaps-backup.yaml
kubectl get secret -n workflow-scalability -o yaml > secrets-backup.yaml
```

### Mode Maintenance
```bash
# Activer le mode maintenance
kubectl patch ingress workflow-scalability-ingress -n workflow-scalability -p '
{
  "metadata": {
    "annotations": {
      "nginx.ingress.kubernetes.io/custom-http-errors": "503",
      "nginx.ingress.kubernetes.io/default-backend": "maintenance-page"
    }
  }
}'

# Désactiver après résolution
kubectl annotate ingress workflow-scalability-ingress nginx.ingress.kubernetes.io/custom-http-errors- -n workflow-scalability
```

---

## 📞 Escalade et Communication

### Matrice d'Escalade

| Temps | Niveau | Action | Contact |
|-------|--------|--------|---------|
| 0-15 min | L1 - On-call Dev | Diagnostic initial | Slack: #incidents |
| 15-30 min | L2 - Senior Dev | Actions correctives | PagerDuty |
| 30-60 min | L3 - Tech Lead | Décisions architecture | Phone |
| 60+ min | L4 - CTO | Communication externe | Emergency line |

### Template de Communication

#### Communication Initiale (T+5 min)
```
🚨 INCIDENT EN COURS - [P0/P1/P2]

Symptômes: [Description brève]
Impact: [Nombre d'utilisateurs affectés]
Actions en cours: [Ce qui est fait]
ETA: [Estimation de résolution]

Updates toutes les 15 minutes.
```

#### Update Régulier (T+15 min)
```
📊 UPDATE INCIDENT - [Heure]

Status: [En cours/Partiellement résolu]
Progrès: [Actions complétées]
Blocages: [Si applicable]
Prochaines étapes: [Actions planifiées]
ETA mis à jour: [Nouvelle estimation]
```

#### Résolution
```
✅ INCIDENT RÉSOLU - [Heure]

Durée totale: [XX minutes]
Cause racine: [Brève explication]
Solution appliquée: [Actions correctives]
Impact final: [Métriques]
Post-mortem: [Date planifiée]
```

---

## 📊 Métriques de Succès

### SLO (Service Level Objectives)
- Disponibilité: 99.99% (52 min downtime/an)
- Latence P95: < 100ms
- Error rate: < 0.1%
- Time to Recovery: < 30 min

### KPIs Incident Response
- MTTD (Mean Time To Detect): < 2 min
- MTTA (Mean Time To Acknowledge): < 5 min
- MTTR (Mean Time To Recovery): < 30 min
- Incidents P0/P1 par mois: < 2

---

## 🔄 Check-list Post-Incident

- [ ] Incident résolu et vérifié
- [ ] Communication de résolution envoyée
- [ ] Logs et métriques collectés
- [ ] Timeline documentée
- [ ] Cause racine identifiée
- [ ] Actions correctives planifiées
- [ ] Post-mortem schedulé
- [ ] Documentation mise à jour
- [ ] Tests de non-régression ajoutés
- [ ] Monitoring amélioré si nécessaire

---

## 📚 Ressources

### Dashboards
- Grafana: http://grafana.workflow.example.com
- Prometheus: http://prometheus.workflow.example.com:9090
- Jaeger: http://jaeger.workflow.example.com:16686

### Documentation
- Architecture: `/docs/architecture.md`
- API Docs: `/docs/api.md`
- Runbooks: `/docs/runbooks/`

### Contacts
- On-call: PagerDuty
- Slack: #incidents, #ops
- Email: ops@workflow.example.com
- Emergency: +XX XXX XXX XXXX

---

*Playbook généré avec Ultra Think Methodology - Plan C*
*Dernière mise à jour: 2024*