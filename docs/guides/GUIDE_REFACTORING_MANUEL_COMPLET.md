# 📘 GUIDE COMPLET DE REFACTORING MANUEL

## ⚠️ RÈGLES D'OR
1. **JAMAIS de scripts automatiques** sans tests complets
2. **UN changement = UN commit** pour rollback facile
3. **Tester après CHAQUE modification**
4. **Backup AVANT de commencer**
5. **Code review OBLIGATOIRE**

---

## 🎯 PRIORITÉS DE REFACTORING

### 🔴 URGENCE CRITIQUE (Jour 1-2)
1. Variables non définies dans workflowStore.ts
2. Memory leaks (setInterval, Maps)
3. Fichiers > 2000 lignes

### 🟡 HAUTE PRIORITÉ (Semaine 1)
4. Dépendances circulaires
5. God Objects
6. Services monolithiques

### 🟢 PRIORITÉ NORMALE (Semaine 2-4)
7. Optimisations performance
8. Tests manquants
9. Documentation

---

## 📋 REFACTORING ÉTAPE PAR ÉTAPE

## JOUR 1: CORRECTIONS CRITIQUES

### 1️⃣ Corriger workflowStore.ts (2057 lignes)

#### Étape 1.1: Backup
```bash
cp src/store/workflowStore.ts src/store/workflowStore.ts.backup
git add src/store/workflowStore.ts.backup
git commit -m "backup: workflowStore avant refactoring"
```

#### Étape 1.2: Corriger Variables Non Définies

**Ouvrir**: `src/store/workflowStore.ts`

**LIGNE 18-21** - Corriger existingLock
```typescript
// ❌ AVANT (CASSÉ)
async acquire(key: string = 'global'): Promise<() => void> {
  if (existingLock) {  // existingLock n'existe pas!
    await existingLock;
  }

// ✅ APRÈS (CORRIGÉ)
async acquire(key: string = 'global'): Promise<() => void> {
  const existingLock = key === 'global' 
    ? this.globalLock.locked ? Promise.resolve() : null
    : this.locks.get(key);
    
  if (existingLock) {
    await existingLock;
  }
```

**LIGNE 27-36** - Corriger waiter
```typescript
// ❌ AVANT (CASSÉ)
resolve(() => {
  this.globalLock.locked = false;
  if (waiter) waiter(); // waiter n'existe pas!
});

// ✅ APRÈS (CORRIGÉ)
resolve(() => {
  this.globalLock.locked = false;
  const nextWaiter = this.globalLock.waiters.shift();
  if (nextWaiter) {
    nextWaiter();
  }
});
```

**LIGNE 93-94** - Corriger boucle for
```typescript
// ❌ AVANT (CASSÉ)
for (let __attempt = 1; attempt <= this.maxRetries; attempt++) {

// ✅ APRÈS (CORRIGÉ)
for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
```

#### Étape 1.3: Tester
```bash
npm run typecheck -- src/store/workflowStore.ts
npm run test -- src/store/workflowStore.test.ts
```

#### Étape 1.4: Commit
```bash
git add src/store/workflowStore.ts
git commit -m "fix: corriger variables non définies dans workflowStore"
```

---

### 2️⃣ Corriger ExecutionEngine.ts

#### Étape 2.1: Ouvrir `src/components/ExecutionEngine.ts`

**LIGNE 53-55** - Ajouter mergedOptions
```typescript
// ❌ AVANT (CASSÉ)
constructor(
  private nodes: WorkflowNode[],
  private edges: WorkflowEdge[],
  private options: Partial<ExecutionOptions> = {}
) {
  this.core = new ExecutionCore(this.nodes, this.edges, mergedOptions);
}

// ✅ APRÈS (CORRIGÉ)
constructor(
  private nodes: WorkflowNode[],
  private edges: WorkflowEdge[],
  private options: Partial<ExecutionOptions> = {}
) {
  const mergedOptions = { ...this.defaultOptions, ...this.options };
  this.core = new ExecutionCore(this.nodes, this.edges, mergedOptions);
}
```

#### Étape 2.2: Tester et Commit
```bash
npm run typecheck -- src/components/ExecutionEngine.ts
git add src/components/ExecutionEngine.ts
git commit -m "fix: ajouter mergedOptions manquant dans ExecutionEngine"
```

---

## JOUR 2: MEMORY LEAKS

### 3️⃣ Corriger Memory Leaks dans les Services

#### Pattern de Correction pour setInterval

**Template de Classe avec Cleanup**
```typescript
// ✅ PATTERN CORRECT
export class ServiceAvecCleanup {
  private intervals: Set<NodeJS.Timeout> = new Set();
  private listeners: Map<string, Function> = new Map();
  private subscriptions: Set<{ unsubscribe: () => void }> = new Set();
  
  constructor() {
    this.initialize();
  }
  
  private initialize(): void {
    // Ajouter tous les intervals
    const metricsInterval = setInterval(() => {
      this.updateMetrics();
    }, 5000);
    this.intervals.add(metricsInterval);
    
    // Ajouter listeners
    const listener = this.handleEvent.bind(this);
    window.addEventListener('resize', listener);
    this.listeners.set('resize', listener);
  }
  
  private handleEvent(event: Event): void {
    // Logic here
  }
  
  public destroy(): void {
    // Nettoyer intervals
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals.clear();
    
    // Nettoyer listeners
    this.listeners.forEach((listener, event) => {
      window.removeEventListener(event, listener);
    });
    this.listeners.clear();
    
    // Nettoyer subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions.clear();
  }
}
```

#### Fichiers à Corriger

1. **quantum/hybrid/HybridQuantumClassical.ts:837**
```typescript
// Ajouter dans la classe
private monitoringInterval?: NodeJS.Timeout;

// Ligne 837 - Remplacer
this.monitoringInterval = setInterval(() => {
  // existing code
}, 5000);

// Ajouter méthode destroy
public destroy(): void {
  if (this.monitoringInterval) {
    clearInterval(this.monitoringInterval);
  }
}
```

2. **quantum/core/QuantumProcessor.ts:886 & 892**
```typescript
// Même pattern que ci-dessus
```

---

## SEMAINE 1: REFACTORING STRUCTUREL

### 4️⃣ Diviser les God Objects

#### Pattern: Diviser un Service Monolithique

**AVANT**: DeploymentService.ts (1381 lignes)
```typescript
// ❌ MONOLITHIQUE
export class DeploymentService {
  // 50+ méthodes
  // 30+ propriétés
  // Tout mélangé
}
```

**APRÈS**: Structure Modulaire
```
src/services/deployment/
├── DeploymentService.ts (facade - 100 lignes)
├── DeploymentValidator.ts (200 lignes)
├── DeploymentExecutor.ts (300 lignes)
├── DeploymentMonitor.ts (200 lignes)
├── DeploymentRollback.ts (200 lignes)
├── DeploymentConfig.ts (100 lignes)
├── types.ts (50 lignes)
└── index.ts (exports)
```

**DeploymentService.ts (Facade)**
```typescript
import { DeploymentValidator } from './DeploymentValidator';
import { DeploymentExecutor } from './DeploymentExecutor';
import { DeploymentMonitor } from './DeploymentMonitor';
import { DeploymentRollback } from './DeploymentRollback';

export class DeploymentService {
  private validator: DeploymentValidator;
  private executor: DeploymentExecutor;
  private monitor: DeploymentMonitor;
  private rollback: DeploymentRollback;
  
  constructor() {
    this.validator = new DeploymentValidator();
    this.executor = new DeploymentExecutor();
    this.monitor = new DeploymentMonitor();
    this.rollback = new DeploymentRollback();
  }
  
  async deploy(config: DeploymentConfig): Promise<DeploymentResult> {
    // 1. Valider
    const validation = await this.validator.validate(config);
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '));
    }
    
    // 2. Exécuter
    const execution = await this.executor.execute(config);
    
    // 3. Monitorer
    this.monitor.start(execution.id);
    
    // 4. Gérer les erreurs
    execution.on('error', async (error) => {
      await this.rollback.execute(execution.id);
    });
    
    return execution;
  }
}
```

---

### 5️⃣ Résoudre les Dépendances Circulaires

#### Pattern: Dependency Injection

**AVANT**: Import Direct
```typescript
// ❌ CIRCULAIRE
// ServiceA.ts
import { ServiceB } from './ServiceB';
export class ServiceA {
  method() {
    ServiceB.doSomething();
  }
}

// ServiceB.ts
import { ServiceA } from './ServiceA';
export class ServiceB {
  method() {
    ServiceA.doSomething();
  }
}
```

**APRÈS**: Injection
```typescript
// ✅ DÉCOUPLÉ
// interfaces.ts
export interface IServiceA {
  methodA(): void;
}

export interface IServiceB {
  methodB(): void;
}

// ServiceA.ts
export class ServiceA implements IServiceA {
  constructor(private serviceB: IServiceB) {}
  
  methodA() {
    this.serviceB.methodB();
  }
}

// ServiceB.ts
export class ServiceB implements IServiceB {
  constructor(private serviceA: IServiceA) {}
  
  methodB() {
    this.serviceA.methodA();
  }
}

// container.ts (Dependency Injection Container)
export class DIContainer {
  private services = new Map<string, any>();
  
  register<T>(name: string, factory: () => T): void {
    this.services.set(name, factory);
  }
  
  get<T>(name: string): T {
    const factory = this.services.get(name);
    if (!factory) {
      throw new Error(`Service ${name} not found`);
    }
    return factory();
  }
}

// Usage
const container = new DIContainer();
container.register('ServiceA', () => new ServiceA(container.get('ServiceB')));
container.register('ServiceB', () => new ServiceB(container.get('ServiceA')));
```

---

## 🎯 PATTERNS DE PERFORMANCE

### 6️⃣ Optimisation React Components

#### Pattern: Memoization Correcte
```typescript
// ✅ OPTIMISÉ
import React, { memo, useMemo, useCallback } from 'react';

interface Props {
  data: Item[];
  onSelect: (id: string) => void;
}

export const OptimizedList = memo<Props>(({ data, onSelect }) => {
  // Memoize calculs coûteux
  const sortedData = useMemo(() => {
    return data.slice().sort((a, b) => a.name.localeCompare(b.name));
  }, [data]);
  
  // Memoize callbacks
  const handleClick = useCallback((id: string) => {
    return () => onSelect(id);
  }, [onSelect]);
  
  return (
    <div>
      {sortedData.map(item => (
        <Item 
          key={item.id} 
          item={item} 
          onClick={handleClick(item.id)} 
        />
      ))}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison pour éviter re-renders
  return (
    prevProps.data === nextProps.data &&
    prevProps.onSelect === nextProps.onSelect
  );
});

OptimizedList.displayName = 'OptimizedList';
```

### 7️⃣ Optimisation Store Zustand

#### Pattern: Store Modulaire
```typescript
// ✅ STORE OPTIMISÉ
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

// Slice pour UI
const useUISlice = create<UISlice>()(
  subscribeWithSelector((set) => ({
    theme: 'light',
    sidebarOpen: true,
    toggleSidebar: () => set((state) => ({ 
      sidebarOpen: !state.sidebarOpen 
    })),
  }))
);

// Slice pour Workflow
const useWorkflowSlice = create<WorkflowSlice>()(
  subscribeWithSelector((set, get) => ({
    nodes: [],
    edges: [],
    addNode: (node) => set((state) => ({
      nodes: [...state.nodes, node]
    })),
  }))
);

// Hook combiné avec sélection fine
export const useStore = () => {
  const theme = useUISlice((state) => state.theme);
  const nodes = useWorkflowSlice((state) => state.nodes);
  
  return { theme, nodes };
};

// Subscription sélective
useWorkflowSlice.subscribe(
  (state) => state.nodes.length,
  (length) => {
    console.log('Nodes count changed:', length);
  }
);
```

---

## ✅ CHECKLIST FINALE DE REFACTORING

### Avant de Commencer
- [ ] Créer branche dédiée: `git checkout -b refactoring/phase-1`
- [ ] Backup complet: `cp -r src src_backup_$(date +%Y%m%d)`
- [ ] Documentation des changements prévus

### Pendant le Refactoring
- [ ] Un fichier à la fois
- [ ] Tests après chaque modification
- [ ] Commits atomiques avec messages clairs
- [ ] Code review si possible

### Après le Refactoring
- [ ] Tous les tests passent
- [ ] TypeScript compile sans erreur
- [ ] ESLint ne montre pas de nouveaux warnings
- [ ] Performance non dégradée (benchmark)
- [ ] Documentation mise à jour
- [ ] Pull Request avec description détaillée

---

## 📊 MÉTRIQUES DE SUCCÈS

| Métrique | Avant | Cible | Mesure |
|----------|-------|-------|---------|
| **Erreurs TypeScript** | 15+ | 0 | `npm run typecheck` |
| **Memory Leaks** | 10+ | 0 | Chrome DevTools |
| **Fichiers > 1000 lignes** | 14 | 5 | `find src -name "*.ts" -exec wc -l {} \;` |
| **Complexité Cyclomatique** | 15.3 | <10 | ESLint complexity rule |
| **Test Coverage** | 40% | 70% | `npm run test:coverage` |
| **Bundle Size** | 668MB | <300MB | `npm run build` |
| **Build Time** | 60s | <30s | `time npm run build` |

---

## 🚨 PROBLÈMES COURANTS ET SOLUTIONS

### Problème 1: Tests cassés après refactoring
**Solution**: Ne jamais changer l'API publique sans migration
```typescript
// Garder l'ancienne API avec deprecation
/**
 * @deprecated Use newMethod instead
 */
oldMethod() {
  console.warn('oldMethod is deprecated, use newMethod');
  return this.newMethod();
}
```

### Problème 2: Performance dégradée
**Solution**: Profiler avant/après
```typescript
console.time('operation');
// operation
console.timeEnd('operation');
```

### Problème 3: Régression fonctionnelle
**Solution**: Tests d'intégration complets
```typescript
describe('Refactoring validation', () => {
  it('should maintain backward compatibility', () => {
    // Test ancien comportement
  });
});
```

---

*Guide de refactoring manuel - NE PAS automatiser sans tests*
*Durée estimée: 2-4 semaines pour refactoring complet*
*ROI: Réduction de 70% des bugs, +60% productivité*