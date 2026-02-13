# AI & Performance Features Documentation

## Vue d'ensemble

Ce document décrit les nouvelles fonctionnalités d'intelligence artificielle et d'optimisation des performances ajoutées au WorkflowBuilder.

## 1. Intelligence Artificielle (AI)

### AIWorkflowService (`src/services/AIWorkflowService.ts`)

Service principal pour l'intelligence artificielle dans les workflows.

#### Fonctionnalités principales :

1. **Prédiction de nœuds** (`predictNextNodes`)
   - Suggère intelligemment les prochains nœuds à ajouter
   - Basé sur l'historique et les patterns détectés
   - Confiance calculée selon le contexte

2. **Optimisation automatique** (`optimizeWorkflow`)
   - Détecte les nœuds parallélisables
   - Identifie les opportunités de cache
   - Supprime les redondances
   - Suggère des remplacements plus efficaces

3. **Détection de patterns** (`detectPatterns`)
   - Analyse l'historique des workflows
   - Identifie les séquences récurrentes
   - Propose des templates réutilisables

4. **Détection d'anomalies** (`detectAnomalies`)
   - Performance anormale
   - Taux d'erreur élevé
   - Données inhabituelles
   - Timeouts fréquents

### AIAssistant Component (`src/components/AIAssistant.tsx`)

Interface utilisateur pour l'assistant AI avec 4 onglets :

- **Suggestions** : Nœuds recommandés avec niveau de confiance
- **Optimiser** : Améliorations de performance suggérées
- **Patterns** : Modèles détectés dans l'historique
- **Anomalies** : Alertes et problèmes détectés

## 2. Performance & Scalabilité

### WorkerExecutionEngine (`src/services/WorkerExecutionEngine.ts`)

Moteur d'exécution parallèle utilisant les Web Workers.

#### Caractéristiques :

- Pool de workers auto-adaptatif (2-8 workers)
- Exécution parallèle des nœuds indépendants
- Gestion intelligente de la file d'attente
- Support du code sandboxé dans les workers

#### API principale :

```typescript
// Exécuter un workflow complet
const results = await workerExecutionEngine.executeWorkflow(nodes, edges, initialData);

// Obtenir les statistiques
const stats = workerExecutionEngine.getExecutionStats();
// { totalWorkers, activeWorkers, idleWorkers, queuedJobs, completedJobs }
```

### VirtualWorkflowRenderer (`src/services/VirtualWorkflowRenderer.ts`)

Rendu virtuel pour optimiser l'affichage de grands workflows.

#### Fonctionnalités :

- **Culling** : Seuls les nœuds visibles sont rendus
- **LOD (Level of Detail)** : Détails réduits pour nœuds distants
- **Priorisation** : Nœuds critiques rendus en premier
- **Optimisation mobile/desktop** automatique

#### Configuration :

```typescript
virtualRenderer.initialize(nodes, edges);
virtualRenderer.updateViewport({ x, y, width, height, zoom });
const visibleNodes = virtualRenderer.getVisibleNodes();
```

### WorkflowChunker (`src/services/WorkflowChunker.ts`)

Système de lazy loading pour workflows volumineux.

#### Principe :

- Division spatiale en chunks
- Chargement à la demande
- Préchargement intelligent
- Déchargement automatique

#### Utilisation :

```typescript
// Diviser le workflow
await workflowChunker.chunkWorkflow(nodes, edges);

// Charger les chunks visibles
const chunks = await workflowChunker.getVisibleChunks(viewport);
```

### PerformanceDashboard (`src/components/PerformanceDashboard.tsx`)

Tableau de bord temps réel affichant :

- FPS et temps de rendu
- Utilisation des workers
- Mémoire consommée
- Chunks chargés
- Optimisation en un clic

## 3. Infrastructure de Performance

### WorkflowPerformanceProvider

Provider React gérant globalement les performances :

- Initialisation automatique des systèmes
- Surveillance continue
- Optimisation automatique si score < 50/100
- Nettoyage des ressources

### PerformanceWarning

Avertissement contextuel quand les performances se dégradent :

- Score de performance visible
- Recommandations spécifiques
- Bouton d'optimisation rapide
- Peut être ignoré temporairement

### usePerformanceOptimization Hook

Hook détectant le contexte et optimisant automatiquement :

```typescript
const { 
  context,           // Mobile, réseau lent, etc.
  recommendations,   // Suggestions d'amélioration
  optimizeForCurrentContext,
  getPerformanceMetrics
} = usePerformanceOptimization();
```

## 4. Configuration & Personnalisation

### Optimisation mobile

```typescript
// Détection automatique
if (isMobile) {
  virtualRenderer.optimizeForMobile();
  workflowChunker.optimizeForMobile();
}
```

### Limites configurables

- `maxVisibleNodes`: 50 (mobile) / 200 (desktop)
- `maxWorkers`: 8 maximum
- `chunkSize`: 25 (mobile) / 100 (desktop)
- `maxLoadedChunks`: 5 (mobile) / 20 (desktop)

## 5. Tests

Des tests unitaires complets sont fournis :

- `AIWorkflowService.test.ts`
- `WorkerExecutionEngine.test.ts`
- `VirtualWorkflowRenderer.test.ts`

## 6. Intégration

L'intégration est transparente via :

1. Import des composants dans `App.tsx`
2. Wrapping avec `WorkflowPerformanceProvider`
3. Ajout de `AIAssistant` et `PerformanceDashboard`
4. `PerformanceWarning` s'affiche automatiquement

## 7. Métriques de Performance

Le système surveille :

- **Rendu** : FPS, temps de rendu, nœuds visibles
- **Exécution** : Workers actifs, jobs en attente
- **Mémoire** : Utilisation, chunks chargés
- **Réseau** : Détection connexion lente

## 8. Recommandations d'utilisation

1. **Workflows < 50 nœuds** : Aucune optimisation nécessaire
2. **Workflows 50-200 nœuds** : Chunking automatique activé
3. **Workflows > 200 nœuds** : Toutes optimisations actives
4. **Mobile** : Limites réduites automatiquement

## 9. API Principales

### AI Service
```typescript
aiWorkflowService.predictNextNodes(nodes, edges)
aiWorkflowService.optimizeWorkflow(nodes, edges)
aiWorkflowService.detectPatterns(workflows)
aiWorkflowService.detectAnomalies(nodeId, data, history)
```

### Performance
```typescript
workerExecutionEngine.executeWorkflow(nodes, edges)
virtualRenderer.getVisibleNodes()
workflowChunker.getVisibleChunks(viewport)
```

## 10. Dépannage

- **FPS bas** : Réduire `maxVisibleNodes`
- **Workers saturés** : Simplifier les transformations
- **Mémoire élevée** : Réduire `maxLoadedChunks`
- **Anomalies fréquentes** : Vérifier la qualité des données