# 📋 Plan d'Écriture de Tests - Semaine 1

## 🎯 Objectif
Passer de **9% à 30%** de couverture en écrivant **250 tests unitaires** sur les composants critiques.

**Date de début** : 2025-11-08
**Deadline** : 2025-11-15 (7 jours)
**Priorité** : P0 - CRITIQUE

---

## 📊 État Actuel

Selon `WHAT_WE_NEED_TO_MATCH_N8N_2025.md` :
- **Tests actuels** : 135 tests
- **Objectif final** : 1,475 tests (80% couverture)
- **Gap** : 1,340 tests manquants

### Breakdown Objectif Final
- 500 tests unitaires
- 400 tests d'intégration
- 100 tests E2E
- 135 tests existants

---

## 🎯 Semaine 1 : 250 Tests Unitaires

### Priorité 1 : ExecutionEngine (80 tests)

**Fichiers cibles** :
- `src/components/ExecutionEngine.ts` - 20 tests
- `src/components/execution/ExecutionCore.ts` - 25 tests
- `src/components/execution/ExecutionValidator.ts` - 20 tests
- `src/components/execution/ExecutionQueue.ts` - 15 tests

**Scénarios à tester** :

#### ExecutionEngine.ts (20 tests)
1. ✅ Simple workflow execution (exists)
2. ✅ Error handling (exists)
3. [ ] Constructor validation
4. [ ] Options merging
5. [ ] State management (isRunning flag)
6. [ ] Result map handling
7. [ ] Legacy result format conversion
8. [ ] Multiple executions sequentially
9. [ ] Execution timeout handling
10. [ ] Metrics collection
11. [ ] Checkpoint creation
12. [ ] Recovery from checkpoint
13. [ ] Max recovery attempts
14. [ ] Callback invocation (onNodeStart)
15. [ ] Callback invocation (onNodeComplete)
16. [ ] Callback invocation (onNodeError)
17. [ ] Empty workflow handling
18. [ ] Single node workflow
19. [ ] Circular dependency detection
20. [ ] Execution cancellation

#### ExecutionCore.ts (25 tests)
1. [ ] Node topology sorting
2. [ ] Parallel node execution
3. [ ] Sequential node execution
4. [ ] Data flow between nodes
5. [ ] Error propagation
6. [ ] Error branch routing
7. [ ] Conditional execution
8. [ ] Loop detection
9. [ ] Max execution time enforcement
10. [ ] Node input validation
11. [ ] Node output validation
12. [ ] Expression evaluation
13. [ ] Variable substitution
14. [ ] Sub-workflow execution
15. [ ] Retry logic
16. [ ] Circuit breaker
17. [ ] Resource limiting
18. [ ] Memory management
19. [ ] Execution metrics
20. [ ] Partial execution
21. [ ] Data pinning
22. [ ] Breakpoint handling
23. [ ] Step-by-step execution
24. [ ] Resume from node
25. [ ] Execution history

#### ExecutionValidator.ts (20 tests)
1. [ ] Workflow structure validation
2. [ ] Node configuration validation
3. [ ] Edge validation
4. [ ] Circular dependency detection
5. [ ] Orphaned node detection
6. [ ] Missing required fields
7. [ ] Invalid node types
8. [ ] Invalid edge connections
9. [ ] Duplicate node IDs
10. [ ] Empty workflow rejection
11. [ ] Maximum nodes limit
12. [ ] Maximum edges limit
13. [ ] Expression syntax validation
14. [ ] Credential validation
15. [ ] Environment variable validation
16. [ ] Node input schema validation
17. [ ] Node output schema validation
18. [ ] Type compatibility checking
19. [ ] Version compatibility
20. [ ] Custom validation rules

#### ExecutionQueue.ts (15 tests)
1. [ ] Queue initialization
2. [ ] Add node to queue
3. [ ] Get next node
4. [ ] Priority-based ordering
5. [ ] Dependency resolution
6. [ ] Queue emptying
7. [ ] Queue size tracking
8. [ ] Node readiness check
9. [ ] Parallel node batching
10. [ ] Sequential ordering
11. [ ] Error node handling
12. [ ] Queue state snapshot
13. [ ] Queue restoration
14. [ ] Queue clearing
15. [ ] Queue iteration

---

### Priorité 2 : Expression System (60 tests)

**Fichiers cibles** :
- `src/expressions/ExpressionEngine.ts` - 30 tests
- `src/expressions/ExpressionContext.ts` - 15 tests
- `src/expressions/BuiltInFunctions.ts` - 15 tests

#### ExpressionEngine.ts (30 tests)
1. [ ] Simple variable substitution `{{ $json.name }}`
2. [ ] Nested property access `{{ $json.user.email }}`
3. [ ] Array indexing `{{ $json.items[0] }}`
4. [ ] Function calls `{{ $json.name.toLowerCase() }}`
5. [ ] Chained functions `{{ $json.email.toLowerCase().trim() }}`
6. [ ] Math operations `{{ $json.price * 1.2 }}`
7. [ ] String concatenation `{{ "Hello " + $json.name }}`
8. [ ] Conditional expressions `{{ $json.age > 18 ? "adult" : "minor" }}`
9. [ ] Boolean logic `{{ $json.active && $json.verified }}`
10. [ ] Null coalescing `{{ $json.name || "Unknown" }}`
11. [ ] Template literals with expressions
12. [ ] Multi-line expressions
13. [ ] Expression with whitespace
14. [ ] Special characters handling
15. [ ] HTML encoding
16. [ ] SQL injection prevention
17. [ ] XSS prevention
18. [ ] Forbidden pattern detection (eval, Function)
19. [ ] Whitelist validation
20. [ ] Expression parsing errors
21. [ ] Syntax error messages
22. [ ] Timeout on long expressions
23. [ ] Memory limit enforcement
24. [ ] Recursive expression limits
25. [ ] Context variable access
26. [ ] Previous node data access `{{ $node["HTTP Request"].json }}`
27. [ ] Workflow variables `{{ $workflow.id }}`
28. [ ] Environment variables `{{ $env.API_KEY }}`
29. [ ] Built-in function calls `{{ $now.format('YYYY-MM-DD') }}`
30. [ ] Custom function registration

#### ExpressionContext.ts (15 tests)
1. [ ] $json context variable
2. [ ] $node context variable
3. [ ] $items context variable
4. [ ] $workflow context variable
5. [ ] $execution context variable
6. [ ] $env context variable
7. [ ] $now context variable
8. [ ] $input context variable
9. [ ] $output context variable
10. [ ] $params context variable
11. [ ] $credentials context variable
12. [ ] Context variable priority
13. [ ] Context inheritance
14. [ ] Context isolation
15. [ ] Context serialization

#### BuiltInFunctions.ts (15 tests)
1. [ ] String functions (toLowerCase, toUpperCase, trim)
2. [ ] Math functions (round, floor, ceil, abs)
3. [ ] Date functions (format, parse, add, subtract)
4. [ ] Array functions (map, filter, reduce, find)
5. [ ] Object functions (keys, values, entries, merge)
6. [ ] JSON functions (parse, stringify)
7. [ ] Encoding functions (base64, url, html)
8. [ ] Hash functions (md5, sha256)
9. [ ] UUID generation
10. [ ] Random number generation
11. [ ] Type checking functions (isString, isNumber)
12. [ ] Validation functions (isEmail, isURL)
13. [ ] Custom function registration
14. [ ] Function namespace isolation
15. [ ] Function error handling

---

### Priorité 3 : Node Types (50 tests)

**Top 10 nodes les plus utilisés** (5 tests chacun) :

#### 1. HTTP Request Node (5 tests)
- [ ] GET request
- [ ] POST with body
- [ ] Authentication (Bearer, Basic, OAuth2)
- [ ] Error handling (4xx, 5xx)
- [ ] Timeout handling

#### 2. Email Node (5 tests)
- [ ] Send email with SMTP
- [ ] HTML email
- [ ] Attachments
- [ ] CC/BCC
- [ ] Error handling

#### 3. Slack Node (5 tests)
- [ ] Send message
- [ ] Upload file
- [ ] Update message
- [ ] Delete message
- [ ] Error handling

#### 4. Transform Node (5 tests)
- [ ] Field mapping
- [ ] Data transformation
- [ ] Type conversion
- [ ] Conditional transformation
- [ ] Error handling

#### 5. Filter Node (5 tests)
- [ ] Simple condition
- [ ] Multiple conditions (AND)
- [ ] Multiple conditions (OR)
- [ ] Complex nested conditions
- [ ] Error handling

#### 6. Database Node (PostgreSQL) (5 tests)
- [ ] SELECT query
- [ ] INSERT query
- [ ] UPDATE query
- [ ] DELETE query
- [ ] Connection error handling

#### 7. Delay Node (5 tests)
- [ ] Fixed delay
- [ ] Variable delay
- [ ] Delay with expression
- [ ] Cancellation
- [ ] Error handling

#### 8. Schedule Node (5 tests)
- [ ] Cron expression
- [ ] Interval
- [ ] One-time schedule
- [ ] Timezone handling
- [ ] Error handling

#### 9. Webhook Node (5 tests)
- [ ] Receive POST
- [ ] Receive GET
- [ ] JSON body parsing
- [ ] Form data parsing
- [ ] Authentication

#### 10. SubWorkflow Node (5 tests)
- [ ] Execute sub-workflow
- [ ] Pass data to sub-workflow
- [ ] Receive data from sub-workflow
- [ ] Error propagation
- [ ] Nested sub-workflows

---

### Priorité 4 : State Management (30 tests)

**Fichier cible** : `src/store/workflowStore.ts`

#### Zustand Store (30 tests)
1. [ ] Initial state
2. [ ] Add node
3. [ ] Update node
4. [ ] Delete node
5. [ ] Add edge
6. [ ] Update edge
7. [ ] Delete edge
8. [ ] Undo action
9. [ ] Redo action
10. [ ] Clear history
11. [ ] Set workflow name
12. [ ] Set workflow description
13. [ ] Save workflow
14. [ ] Load workflow
15. [ ] Execute workflow
16. [ ] Stop execution
17. [ ] Set execution result
18. [ ] Multi-select nodes
19. [ ] Group nodes
20. [ ] Ungroup nodes
21. [ ] Copy nodes
22. [ ] Paste nodes
23. [ ] Duplicate workflow
24. [ ] Set active environment
25. [ ] Set credentials
26. [ ] Toggle view mode
27. [ ] Set zoom level
28. [ ] Set canvas position
29. [ ] Persist state to localStorage
30. [ ] Restore state from localStorage

---

### Priorité 5 : API Backend (30 tests)

**Fichiers cibles** :
- `src/backend/api/routes/workflows.ts` - 10 tests
- `src/backend/api/routes/executions.ts` - 10 tests
- `src/backend/api/routes/webhooks.ts` - 10 tests

#### Workflows API (10 tests)
1. [ ] GET /api/workflows (list)
2. [ ] GET /api/workflows/:id (get by ID)
3. [ ] POST /api/workflows (create)
4. [ ] PUT /api/workflows/:id (update)
5. [ ] DELETE /api/workflows/:id (delete)
6. [ ] GET /api/workflows/:id/executions (history)
7. [ ] POST /api/workflows/:id/execute (run)
8. [ ] Authorization check
9. [ ] Validation errors
10. [ ] Database errors

#### Executions API (10 tests)
1. [ ] GET /api/executions (list)
2. [ ] GET /api/executions/:id (get by ID)
3. [ ] POST /api/executions (create)
4. [ ] DELETE /api/executions/:id (delete)
5. [ ] GET /api/executions/:id/logs (logs)
6. [ ] POST /api/executions/:id/retry (retry)
7. [ ] POST /api/executions/:id/cancel (cancel)
8. [ ] Authorization check
9. [ ] Validation errors
10. [ ] Database errors

#### Webhooks API (10 tests)
1. [ ] POST /webhooks/:path (trigger)
2. [ ] GET /webhooks/:path (trigger GET)
3. [ ] Authentication validation
4. [ ] Signature verification (HMAC)
5. [ ] JWT validation
6. [ ] OAuth2 validation
7. [ ] Rate limiting
8. [ ] Webhook not found
9. [ ] Webhook disabled
10. [ ] Webhook execution timeout

---

## 📅 Planning Quotidien

### Jour 1 (Lundi) : ExecutionEngine (80 tests)
- Matin : ExecutionEngine.ts (20 tests)
- Après-midi : ExecutionCore.ts (25 tests) + ExecutionValidator.ts (première moitié, 10 tests)
- Soir : ExecutionValidator.ts (seconde moitié, 10 tests) + ExecutionQueue.ts (15 tests)

### Jour 2 (Mardi) : Expression System (60 tests)
- Matin : ExpressionEngine.ts (première moitié, 15 tests)
- Après-midi : ExpressionEngine.ts (seconde moitié, 15 tests)
- Soir : ExpressionContext.ts (15 tests) + BuiltInFunctions.ts (15 tests)

### Jour 3 (Mercredi) : Node Types Part 1 (25 tests)
- Matin : HTTP Request (5) + Email (5) + Slack (5)
- Après-midi : Transform (5) + Filter (5)

### Jour 4 (Jeudi) : Node Types Part 2 (25 tests)
- Matin : Database (5) + Delay (5) + Schedule (5)
- Après-midi : Webhook (5) + SubWorkflow (5)

### Jour 5 (Vendredi) : State Management (30 tests)
- Matin : Actions (15 tests)
- Après-midi : Persistence (15 tests)

### Jour 6 (Samedi) : API Backend (30 tests)
- Matin : Workflows API (10 tests)
- Après-midi : Executions API (10 tests) + Webhooks API (10 tests)

### Jour 7 (Dimanche) : Buffer & Documentation
- Rattrapage des tests en retard
- Documentation des tests
- Refactoring si nécessaire

---

## 🛠️ Template de Test

### Pattern à suivre

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ComponentName } from '../path/to/component';

describe('ComponentName', () => {

  describe('Feature Group', () => {

    beforeEach(() => {
      // Setup
    });

    afterEach(() => {
      // Cleanup
    });

    it('should do something specific', () => {
      // Arrange
      const input = { /* test data */ };

      // Act
      const result = component.method(input);

      // Assert
      expect(result).toBe(expected);
    });

    it('should handle error case', () => {
      // Arrange
      const invalidInput = null;

      // Act & Assert
      expect(() => component.method(invalidInput)).toThrow('Expected error');
    });

  });

});
```

---

## ✅ Critères de Succès

### Jour 1-7
- [ ] 250 tests unitaires écrits
- [ ] 100% des tests passent
- [ ] Couverture passée de 9% → 30%
- [ ] Documentation mise à jour
- [ ] CI/CD verte
- [ ] Aucune régression

### Métriques
- **Tests par jour** : ~36 tests
- **Tests par heure** : ~5 tests (sur 7h de travail)
- **Temps par test** : ~12 minutes (incluant setup, écriture, debug)

---

## 🚨 Risques & Mitigation

### Risque 1 : Tests complexes prennent plus de temps
**Mitigation** : Commencer par les tests simples, garder buffer du dimanche

### Risque 2 : Tests cassent du code existant
**Mitigation** : Lancer `npm run test:watch` en continu, fixer immédiatement

### Risque 3 : Manque de données de test
**Mitigation** : Créer fixtures réutilisables dans `src/__mocks__/`

### Risque 4 : Couverture insuffisante
**Mitigation** : Vérifier coverage quotidiennement avec `npm run test:coverage`

---

## 📊 Tracking

### Tableau de Bord

| Jour | Tests Prévus | Tests Réalisés | Couverture | Status |
|------|--------------|----------------|------------|--------|
| Jour 1 | 80 | - | - | 🔵 À faire |
| Jour 2 | 60 | - | - | 🔵 À faire |
| Jour 3 | 25 | - | - | 🔵 À faire |
| Jour 4 | 25 | - | - | 🔵 À faire |
| Jour 5 | 30 | - | - | 🔵 À faire |
| Jour 6 | 30 | - | - | 🔵 À faire |
| Jour 7 | Buffer | - | - | 🔵 À faire |
| **TOTAL** | **250** | **0** | **9%** | 🔵 Démarrage |

---

## 🎯 Prochaine Étape Immédiate

**MAINTENANT** : Commencer Jour 1 - ExecutionEngine.ts (20 premiers tests)

**Commande** :
```bash
# Terminal 1 : Test watcher
npm run test:watch

# Terminal 2 : Développement
code src/__tests__/executionEngine.test.ts
```

**Premier test à écrire** : Constructor validation

---

**Date de création** : 2025-11-08
**Dernière mise à jour** : 2025-11-08
**Statut** : 🚀 PRÊT À DÉMARRER
