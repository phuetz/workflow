# 🧪 PLAN C - PHASE 2: STABILISATION DES TESTS

## 📊 ÉTAT ACTUEL DES TESTS

### Statistiques
- **Fichiers de tests:** 29 total
  - ✅ 2 passent complètement
  - ❌ 27 échouent au chargement/compilation
- **Tests individuels:** 18 exécutés
  - ✅ 15 passent
  - ❌ 3 échouent
- **Couverture actuelle:** ~12% (estimation)
- **Objectif Phase 2:** 40% de couverture

---

## 🔍 ANALYSE DES PROBLÈMES

### 1. Erreurs de Compilation/Import (27 fichiers)
- Modules manquants ou mal configurés
- Imports circulaires
- Mocks incorrects
- Dépendances non mockées

### 2. Tests Cassés (3 tests)
- Logique incorrecte
- Assertions obsolètes
- Données de test invalides

### 3. Tests Manquants
- Aucun test pour les nouveaux modules (globalErrorHandler, app.ts)
- Tests d'intégration incomplets
- Tests E2E non fonctionnels

---

## 🛠️ STRATÉGIE DE CORRECTION

### ÉTAPE 1: Fix Import/Module Errors (Priorité: CRITIQUE)

#### Pattern identifié:
```typescript
// PROBLÈME: Import de modules inexistants
import { ExecutionCore } from './execution/ExecutionCore';

// SOLUTION: Créer un mock ou le module manquant
vi.mock('./execution/ExecutionCore', () => ({
  ExecutionCore: vi.fn().mockImplementation(() => ({
    execute: vi.fn().mockResolvedValue({ success: true })
  }))
}));
```

### ÉTAPE 2: Créer Modules Manquants

#### Modules à créer:
1. `src/components/execution/ExecutionCore.ts`
2. `src/services/LoggingService.ts` (exports corrects)
3. Autres dépendances manquantes

### ÉTAPE 3: Corriger Tests Individuels

#### Tests à corriger:
1. colorContrast ratio calculation
2. executionEngine tests
3. workflowStore tests

### ÉTAPE 4: Ajouter Tests Critiques

#### Nouveaux tests requis:
1. `globalErrorHandler.test.ts`
2. `app.test.ts`
3. Tests d'intégration API
4. Tests de sécurité

---

## 📝 PLAN D'ACTION IMMÉDIAT

### 1. Créer Module ExecutionCore
```typescript
// src/components/execution/ExecutionCore.ts
export interface ExecutionOptions {
  maxRecoveryAttempts?: number;
  enableCheckpoints?: boolean;
  validateBeforeExecution?: boolean;
  maxExecutionTime?: number;
  enableMetrics?: boolean;
  timeout?: number;
  retries?: number;
  parallel?: boolean;
}

export interface ExecutionResult {
  success: boolean;
  results: Map<string, any>;
  errors: Array<{ nodeId: string; error: string; timestamp: number }>;
  metrics: {
    executionTimeMs: number;
    nodesExecuted: number;
  };
  diagnostics: {
    warnings: string[];
  };
}

export class ExecutionCore {
  constructor(
    private nodes: any[],
    private edges: any[],
    private options: ExecutionOptions
  ) {}

  async execute(
    onNodeStart: (nodeId: string) => void,
    onNodeComplete: (nodeId: string, inputData: any, result: any) => void,
    onNodeError: (nodeId: string, error: Error) => void
  ): Promise<ExecutionResult> {
    // Implementation placeholder
    return {
      success: true,
      results: new Map(),
      errors: [],
      metrics: {
        executionTimeMs: 100,
        nodesExecuted: this.nodes.length
      },
      diagnostics: {
        warnings: []
      }
    };
  }

  stop(): void {
    // Stop execution
  }

  getProgress(): { completed: number; total: number; percentage: number } {
    return {
      completed: 0,
      total: this.nodes.length,
      percentage: 0
    };
  }
}
```

### 2. Fix LoggingService Exports
```typescript
// src/services/LoggingService.ts
export const logger = {
  debug: (message: string, ...args: any[]) => console.debug(message, ...args),
  info: (message: string, ...args: any[]) => console.info(message, ...args),
  warn: (message: string, ...args: any[]) => console.warn(message, ...args),
  error: (message: string, ...args: any[]) => console.error(message, ...args),
  fatal: (message: string, ...args: any[]) => console.error('[FATAL]', message, ...args),
  startTimer: () => () => 0
};
```

### 3. Test GlobalErrorHandler
```typescript
// src/middleware/__tests__/globalErrorHandler.test.ts
import { describe, it, expect, vi } from 'vitest';
import { 
  AppError, 
  ErrorCode,
  globalErrorHandler,
  ErrorFactory 
} from '../globalErrorHandler';

describe('GlobalErrorHandler', () => {
  describe('AppError', () => {
    it('creates error with correct properties', () => {
      const error = new AppError(
        'Test error',
        ErrorCode.VALIDATION_ERROR,
        400
      );
      
      expect(error.message).toBe('Test error');
      expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(error.statusCode).toBe(400);
      expect(error.isOperational).toBe(true);
    });
  });

  describe('ErrorFactory', () => {
    it('creates validation error', () => {
      const error = ErrorFactory.validation('Invalid input');
      expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(error.statusCode).toBe(400);
    });

    it('creates auth error', () => {
      const error = ErrorFactory.unauthorized();
      expect(error.code).toBe(ErrorCode.AUTH_ERROR);
      expect(error.statusCode).toBe(401);
    });
  });

  describe('globalErrorHandler middleware', () => {
    it('handles AppError correctly', () => {
      const error = new AppError('Test', ErrorCode.VALIDATION_ERROR, 400);
      const req = { url: '/test', method: 'GET', ip: '127.0.0.1' };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      };
      const next = vi.fn();

      globalErrorHandler(error, req as any, res as any, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: ErrorCode.VALIDATION_ERROR,
            message: 'Test'
          })
        })
      );
    });
  });
});
```

---

## 📊 MÉTRIQUES DE SUCCÈS

### Objectifs Phase 2
- [ ] 100% des tests compilent (0/29 → 29/29)
- [ ] 80% des tests passent (15/18 → 14/18 minimum)
- [ ] 40% de couverture de code
- [ ] 0 erreur de type TypeScript
- [ ] Temps d'exécution < 30 secondes

### KPIs
- Nombre de tests passants
- Couverture de code
- Temps d'exécution moyen
- Nombre d'erreurs TypeScript

---

## 🚀 COMMANDES D'EXÉCUTION

```bash
# 1. Créer les modules manquants
npm run generate:execution-core

# 2. Fixer les imports
npm run fix:imports

# 3. Lancer les tests
npm test

# 4. Vérifier la couverture
npm run test:coverage

# 5. Lancer un test spécifique
npm test src/__tests__/colorContrast.test.ts
```

---

## ⏱️ TIMELINE

### Jour 1 (Aujourd'hui)
- ✅ Fix test-setup.tsx
- ✅ Fix colorContrast.ts
- ⏳ Créer ExecutionCore
- ⏳ Fix LoggingService
- ⏳ 50% des tests compilent

### Jour 2
- [ ] 100% des tests compilent
- [ ] 80% des tests passent
- [ ] Tests globalErrorHandler

### Jour 3
- [ ] Tests d'intégration
- [ ] 40% de couverture atteinte
- [ ] Documentation des tests

---

## 📝 NOTES

1. **Priorité absolue:** Faire compiler tous les tests
2. **Ne pas casser:** Les fonctionnalités existantes
3. **Documenter:** Chaque correction appliquée
4. **Mesurer:** La progression à chaque étape

---

**STATUS:** EN COURS D'EXÉCUTION
**PROGRESSION:** 15/18 tests passent (83%)
**PROCHAINE ACTION:** Créer ExecutionCore.ts