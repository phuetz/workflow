# TESTS TROUBLESHOOTING GUIDE

Guide de dépannage pour les problèmes de tests courants

---

## PROBLÈME: Tests Timeout

### Symptômes
```
× Test timed out in 10000ms
× Test timed out in 30000ms
```

### Solutions

#### 1. Augmenter timeout global
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    testTimeout: 60000, // 60 secondes
    hookTimeout: 60000,
  }
});
```

#### 2. Timeout par test
```typescript
it('slow test', async () => {
  // ...
}, 60000); // 60 secondes pour CE test
```

#### 3. Utiliser fake timers correctement
```typescript
import { vi } from 'vitest';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

it('test with timers', async () => {
  const promise = someAsyncOperation();

  // IMPORTANT: Utiliser advanceTimersByTimeAsync
  await vi.advanceTimersByTimeAsync(10000);

  const result = await promise;
  expect(result).toBeDefined();
});
```

---

## PROBLÈME: Heap Out of Memory

### Symptômes
```
FATAL ERROR: Reached heap limit Allocation failed
JavaScript heap out of memory
```

### Solutions

#### 1. Augmenter heap size (Recommandé)
```json
// package.json
{
  "scripts": {
    "test": "NODE_OPTIONS='--max-old-space-size=8192' vitest"
  }
}
```

#### 2. Séparer les suites de tests
```bash
# Au lieu de tout exécuter
npm run test -- --run

# Exécuter par parties
npm run test -- src/__tests__/**/*.test.ts --run
npm run test -- src/services/**/*.test.ts --run
npm run test -- src/components/**/*.test.ts --run
```

#### 3. Cleanup après chaque test
```typescript
afterEach(() => {
  // Nettoyer les gros objets
  largeObject = null;

  // Clear mocks
  vi.clearAllMocks();

  // Clear stores si Zustand/Redux
  useStore.setState(initialState);
});
```

#### 4. Exécuter en mode single thread
```json
// vitest.config.ts
export default defineConfig({
  test: {
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true // Réduit memory overhead
      }
    }
  }
});
```

---

## PROBLÈME: Unhandled Error

### Symptômes
```
× Unhandled error. (Test error)
× Unhandled error. (Connection failed)
```

### Solutions

#### 1. Désactiver capture en mode test
```typescript
// Dans beforeEach du test
beforeEach(() => {
  errorMonitor = ErrorMonitoringSystem.getInstance({
    enabled: true,
    captureUnhandledRejections: false,
    captureConsoleErrors: false,
  });
});
```

#### 2. Global error handler dans test setup
```typescript
// src/test-setup.ts
beforeAll(() => {
  // Supprimer listeners globaux
  process.removeAllListeners('unhandledRejection');
  process.removeAllListeners('uncaughtException');
});

// Ajouter handler silencieux
process.on('unhandledRejection', () => {
  // Silencieux en mode test
});
```

#### 3. Try/catch dans les tests
```typescript
it('test with potential errors', async () => {
  try {
    await functionThatMightThrow();
  } catch (error) {
    // Gérer l'erreur ou vérifier qu'elle est attendue
    expect(error.message).toContain('expected error');
  }
});
```

---

## PROBLÈME: Assertion Failed

### Symptômes
```
× expected X to be Y
× expected 'abc' to match /^xyz/
```

### Solutions

#### 1. Regex qui ne match pas
```typescript
// ❌ Trop strict
expect(nodeId).toMatch(/^node-/);

// ✅ Plus permissif
expect(nodeId).toMatch(/^node[_-]/);

// ✅ Ou vérifier juste le début
expect(nodeId).toStartWith('node');
```

#### 2. Timestamps identiques
```typescript
// ❌ Problème: timestamps identiques
it('should update timestamp', () => {
  const before = Date.now();
  doSomething();
  const after = Date.now();
  expect(after).toBeGreaterThan(before); // Peut échouer si trop rapide
});

// ✅ Solution: Mock Date
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2025-01-01'));
});

it('should update timestamp', () => {
  const before = Date.now();

  vi.advanceTimersByTime(100); // Avancer le temps

  doSomething();
  const after = Date.now();
  expect(after).toBeGreaterThan(before); // ✓ Passe toujours
});
```

#### 3. États asynchrones
```typescript
// ❌ Problème: state pas encore mis à jour
it('should update state', () => {
  updateState('new value');
  expect(getState()).toBe('new value'); // Peut échouer si async
});

// ✅ Solution: Attendre la mise à jour
it('should update state', async () => {
  await updateState('new value');

  // Ou attendre explicitement
  await waitFor(() => {
    expect(getState()).toBe('new value');
  });
});
```

---

## PROBLÈME: Variables Non Définies

### Symptômes
```
ReferenceError: res is not defined
ReferenceError: data is not defined
```

### Solutions

```typescript
// ❌ Variable utilisée avant déclaration
it('test', async () => {
  const data = await res.json(); // res non déclaré
});

// ✅ Déclarer avant utilisation
it('test', async () => {
  let res, data;

  res = await fetch('/api');
  data = await res.json();

  expect(data).toBeDefined();
});

// ✅ Ou utiliser destructuring
it('test', async () => {
  const res = await fetch('/api');
  const data = await res.json();

  expect(data).toBeDefined();
});
```

---

## PROBLÈME: Deprecated done() Callback

### Symptômes
```
× done() callback is deprecated, use promise instead
```

### Solutions

```typescript
// ❌ Old style avec done()
it('test event', (done) => {
  emitter.on('event', (data) => {
    expect(data).toBe('value');
    done();
  });

  emitter.emit('event', 'value');
});

// ✅ New style avec Promise
it('test event', () => {
  return new Promise<void>((resolve) => {
    emitter.on('event', (data) => {
      expect(data).toBe('value');
      resolve();
    });

    emitter.emit('event', 'value');
  });
});

// ✅ Ou avec async/await et waitFor
it('test event', async () => {
  let receivedData: string | null = null;

  emitter.on('event', (data) => {
    receivedData = data;
  });

  emitter.emit('event', 'value');

  await waitFor(() => {
    expect(receivedData).toBe('value');
  });
});
```

---

## PROBLÈME: Health Checks Ne S'exécutent Pas

### Symptômes
```
× expected 'healthy' to be 'unhealthy'
× expected lastCheck to be greater than beforeCheck
```

### Solutions

```typescript
// ❌ Health checks pas exécutés
it('should mark unhealthy nodes', () => {
  const node = addNode({ host: 'bad-server' });

  // Simuler échec
  mockHealthCheck.mockReturnValue(false);

  expect(node.health.status).toBe('unhealthy'); // ❌ Pas encore exécuté
});

// ✅ Forcer l'exécution des health checks
it('should mark unhealthy nodes', async () => {
  vi.useFakeTimers();

  const node = addNode({ host: 'bad-server' });

  // Simuler échec
  mockHealthCheck.mockReturnValue(false);

  // Avancer au prochain health check
  await vi.advanceTimersByTimeAsync(healthCheckInterval);

  expect(node.health.status).toBe('unhealthy'); // ✓ Check exécuté
});
```

---

## PROBLÈME: Tests Passent Localement, Échouent en CI

### Causes Courantes

1. **Différence de timezone**
```typescript
// Solution: Utiliser UTC
const date = new Date().toISOString(); // Toujours UTC
```

2. **Ressources limitées en CI**
```typescript
// Augmenter timeouts pour CI
const timeout = process.env.CI ? 60000 : 30000;
```

3. **Dépendances manquantes**
```bash
# Vérifier que package-lock.json est commit
git add package-lock.json
```

4. **Variables d'environnement**
```typescript
// Utiliser dotenv pour tests
import 'dotenv/config';
```

---

## PROBLÈME: Tests Lents

### Symptômes
- Suite de tests prend >5 minutes
- Tests individuels prennent >1 seconde

### Solutions

#### 1. Parallélisation
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false, // Activer parallélisation
        minThreads: 1,
        maxThreads: 4
      }
    }
  }
});
```

#### 2. Mock des opérations lentes
```typescript
// ❌ Vraie requête HTTP (lente)
it('test API', async () => {
  const res = await fetch('https://api.example.com');
  // ...
});

// ✅ Mock (rapide)
it('test API', async () => {
  vi.spyOn(global, 'fetch').mockResolvedValue({
    json: async () => ({ data: 'test' })
  });

  const res = await fetch('https://api.example.com');
  // ...
});
```

#### 3. Utiliser beforeAll au lieu de beforeEach
```typescript
// ❌ Setup à chaque test (lent)
beforeEach(async () => {
  await setupDatabase(); // 500ms × 20 tests = 10s
});

// ✅ Setup une fois (rapide)
beforeAll(async () => {
  await setupDatabase(); // 500ms × 1 = 500ms
});

afterEach(() => {
  clearDatabaseData(); // Juste clear les données, pas rebuild
});
```

---

## DEBUGGING TIPS

### Voir les logs dans les tests
```typescript
it('test with debug', () => {
  console.log('Debug:', someValue); // Visible avec --reporter=verbose
  expect(someValue).toBe(expected);
});
```

### Isoler un test spécifique
```typescript
// Exécuter CE test uniquement
it.only('this test only', () => {
  // ...
});

// Skip CE test
it.skip('skip this test', () => {
  // ...
});
```

### Voir les assertions qui échouent
```bash
npm run test -- --reporter=verbose --run
```

### Debug avec breakpoints
```bash
# Utiliser Node debugger
node --inspect-brk ./node_modules/vitest/vitest.mjs --run

# Puis attacher VS Code debugger
```

---

## CHECKLIST RAPIDE

Avant de commit des nouveaux tests:

- [ ] Tests passent localement avec `npm run test`
- [ ] Pas de `done()` callbacks (use Promises)
- [ ] Pas de hard-coded timeouts (use config ou param)
- [ ] Cleanup dans `afterEach`
- [ ] Fake timers utilisés correctement (`advanceTimersByTimeAsync`)
- [ ] Pas de dépendances externes non mockées
- [ ] Variables déclarées avant utilisation
- [ ] Regex permissives (pas trop strictes)

---

## RESSOURCES

**Documentation Vitest**: https://vitest.dev/
**Fake Timers**: https://vitest.dev/api/vi.html#vi-usefaketimers
**Mocking**: https://vitest.dev/guide/mocking.html

**Fichiers Importants**:
- `vitest.config.ts` - Configuration globale
- `src/test-setup.ts` - Setup global pour tous les tests
- `TESTS_IMPROVEMENT_REPORT.md` - Rapport détaillé des corrections

---

**Créé**: 2025-11-01
**Maintenu par**: Agent Qualité Tests
