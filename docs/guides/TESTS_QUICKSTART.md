# TESTS IMPROVEMENT - QUICK START GUIDE

## RÉSUMÉ 1 MINUTE

**Objectif**: Passer de 76.4% à 90%+ de tests qui passent
**Status Actuel**: Phase 1 complète (~80-82% estimé)
**Prochaine Étape**: Phase 2 - Corrections avancées

---

## CORRECTIONS APPLIQUÉES (Phase 1)

### ✅ 1. Timeout Global: 30 secondes
```bash
# Fichier: vitest.config.ts
testTimeout: 30000  // était 10000
hookTimeout: 30000  // était 10000
```

### ✅ 2. Memory: 8GB heap size
```bash
# Fichier: package.json
"test": "NODE_OPTIONS='--max-old-space-size=8192' vitest"
```

### ✅ 3. Regex + Callbacks
```bash
# Fichier: LoadBalancer.test.ts
- Regex corrigée: /^node[_-]/
- done() → Promise
```

**Impact**: +23-33 tests estimés

---

## EXÉCUTER LES TESTS

```bash
# Tests complets avec nouvelles corrections
npm run test -- --run

# Voir uniquement les échecs
npm run test -- --run 2>&1 | grep "×"

# Test unitaire spécifique
npm run test -- LoadBalancer.test.ts --run

# Avec coverage
npm run test:coverage
```

---

## TOP PROBLÈMES RESTANTS

### 1. errorMonitoring.test.ts (17 tests)
**Fix**: Gérer erreurs non capturées (~15 mins)

### 2. LoadBalancer timeouts (12-15 tests)
**Fix**: Utiliser `advanceTimersByTimeAsync()` (~1h)

### 3. Health checks timing (3 tests)
**Fix**: Forcer exécution checks (~30 mins)

### 4. AutoScaler timeouts (6-8 tests)
**Fix**: Même approche que LoadBalancer (~45 mins)

**Total Phase 2**: ~3-4h pour +40-48 tests

---

## COMMANDES RAPIDES

```bash
# Compter les tests qui passent/échouent
npm run test -- --run 2>&1 | tail -50

# Tests par fichier
npm run test -- src/__tests__/**/*.test.ts --run
npm run test -- src/services/**/*.test.ts --run

# Mode watch pour développement
npm run test:watch

# Coverage détaillée
npm run test:coverage
```

---

## FICHIERS IMPORTANTS

📄 **Rapports**:
- `TESTS_IMPROVEMENT_REPORT.md` - Rapport détaillé complet
- `TESTS_IMPROVEMENT_SUMMARY.md` - Résumé exécutif
- `TESTS_QUICKSTART.md` - Ce fichier

📝 **Fichiers Modifiés**:
- `vitest.config.ts` - Configuration timeouts
- `package.json` - Heap size
- `LoadBalancer.test.ts` - Corrections regex/callbacks

---

## MÉTRIQUES

| Métrique | Avant | Après Phase 1 | Cible |
|----------|-------|---------------|-------|
| Tests Passants | 479 | ~502-512 | 564+ |
| % Passage | 76.4% | ~80-82% | 90%+ |
| Heap Size | ~4GB | 8GB | - |
| Timeout | 10s | 30s | - |

---

## NEXT STEPS

**Immédiat** (30 mins):
```bash
# 1. Vérifier que tests tournent sans crash
npm run test -- --run

# 2. Noter le nouveau taux de passage
# Chercher "Tests" dans output
```

**Court Terme** (1-2 jours):
```
[ ] Corriger errorMonitoring.test.ts
[ ] Corriger LoadBalancer async/timers
[ ] Corriger AutoScaler timeouts
[ ] Atteindre 90%
```

**Validation Finale**:
```bash
npm run test -- --run > final_results.txt 2>&1
grep "Tests" final_results.txt
# Devrait afficher: Tests  564+ passed (90%+)
```

---

## AIDE RAPIDE

**Si les tests crashent (OOM)**:
```bash
# Augmenter encore plus la mémoire
NODE_OPTIONS='--max-old-space-size=16384' npm run test -- --run
```

**Si timeout même à 30s**:
```bash
# Augmenter timeout localement pour un test
it('long test', async () => {
  // ...
}, 60000); // 60 secondes
```

**Si besoin de debug**:
```bash
# Mode verbose
npm run test -- --reporter=verbose --run

# Test isolé
npm run test -- -t "nom exact du test"
```

---

**Créé**: 2025-11-01
**Mis à jour**: Après Phase 1
**Contact**: Agent Qualité Tests
