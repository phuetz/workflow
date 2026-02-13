# 🧪 Guide de Tests Automatiques

Ce guide explique comment utiliser les scripts de tests automatiques pour valider l'application.

## 📋 Vue d'Ensemble

L'application dispose de plusieurs niveaux de tests automatisés:

1. **Tests de Santé Backend** - Vérifie que le backend fonctionne
2. **Tests Frontend** - Vérifie que le frontend est accessible
3. **Smoke Tests** - Tests complets de l'application
4. **CI/CD Validation** - Pipeline de validation complète
5. **GitHub Actions** - Automatisation CI/CD

## 🚀 Scripts Disponibles

### 1. Test de Santé Backend

Vérifie que tous les endpoints backend sont opérationnels.

```bash
bash scripts/test-backend-health.sh
```

**Ce qui est testé:**
- ✅ Endpoint `/health`
- ✅ API `/api/workflows`
- ✅ API `/api/templates`
- ✅ Endpoint `/metrics`

**Durée:** ~5 secondes

### 2. Test Frontend

Vérifie que le frontend Vite est accessible.

```bash
bash scripts/test-frontend.sh
```

**Ce qui est testé:**
- ✅ Frontend accessible sur port 3000
- ✅ HTML contient React root
- ✅ Vite dev server actif
- ✅ Service Worker disponible
- ✅ Assets statiques accessibles

**Durée:** ~3 secondes

### 3. Smoke Tests Complets

Validation complète de l'application (backend + frontend).

```bash
bash scripts/smoke-tests.sh
```

**Ce qui est testé:**
- ✅ 5 endpoints backend
- ✅ 3 checks frontend
- ✅ 2 vérifications de processus

**Durée:** ~10 secondes

### 4. CI/CD Validation Pipeline

Pipeline de validation complète pour intégration continue.

```bash
bash scripts/ci-validation.sh
```

**Ce qui est testé:**
1. TypeScript Type Checking
2. ESLint Code Quality
3. Backend Build
4. Frontend Build
5. Unit Tests
6. Smoke Tests (optionnel)

**Durée:** ~2-3 minutes

## 🎯 Commandes NPM

Les scripts sont également disponibles via npm:

```bash
# Tests unitaires
npm run test              # Mode watch
npm run test -- --run     # Exécution unique

# Validation TypeScript
npm run typecheck

# Linting
npm run lint
npm run lint:fix

# Builds
npm run build             # Frontend
npm run build:backend     # Backend

# Tests de santé (ajoutés)
npm run test:health       # Backend health
npm run test:smoke        # Smoke tests
npm run test:ci           # CI validation
```

## 📊 Interprétation des Résultats

### Codes de Sortie

- `0` - ✅ Tous les tests sont passés
- `1` - ❌ Au moins un test a échoué

### Symboles

- `✓` (vert) - Test réussi
- `✗` (rouge) - Test échoué
- `⚠` (jaune) - Avertissement (non-bloquant)

## 🔄 GitHub Actions

Les tests s'exécutent automatiquement sur:
- Push vers `main` ou `develop`
- Pull requests vers ces branches

Voir: `.github/workflows/ci.yml`

### Jobs CI/CD

1. **validate** - TypeScript, ESLint, Builds, Tests
2. **smoke-tests** - Tests smoke avec Redis
3. **security** - Audit de sécurité npm

## 🐛 Dépannage

### Backend Tests Échouent

```bash
# Vérifier que le backend est démarré
ps aux | grep tsx

# Démarrer le backend
npm run dev:backend

# Vérifier le port 3001
curl http://localhost:3001/health
```

### Frontend Tests Échouent

```bash
# Vérifier que Vite est démarré
ps aux | grep vite

# Démarrer le frontend
npm run dev:frontend

# Vérifier le port 3000
curl http://localhost:3000
```

### Smoke Tests Timeout

Augmenter le timeout dans le script:

```bash
# Éditer scripts/smoke-tests.sh
TIMEOUT=10  # Passer à 15 ou 20
```

## 📝 Prérequis

### Développement Local

- Node.js 18+ ou 20+
- npm 9+
- Redis (optionnel, fallback in-memory)
- Ports 3000 et 3001 disponibles

### CI/CD

- Ubuntu latest
- Node.js (automatiquement installé)
- Redis service (fourni par GitHub Actions)

## 🎨 Personnalisation

### Ajouter un Nouveau Test

1. Créer un script dans `scripts/`:
```bash
#!/bin/bash
echo "Mon test..."
# Logique de test
exit 0  # ou 1 si échec
```

2. Rendre exécutable:
```bash
chmod +x scripts/mon-test.sh
```

3. Ajouter au CI:
```yaml
# .github/workflows/ci.yml
- name: Mon Test
  run: bash ./scripts/mon-test.sh
```

### Modifier les Critères de Succès

Éditer les scripts pour ajuster:
- Timeouts
- Seuils de succès
- Endpoints testés
- Critères d'échec

## 📈 Métriques

### Objectifs de Qualité

- ✅ TypeScript: 0 erreurs
- ✅ ESLint: 0 erreurs (warnings OK)
- ✅ Backend Build: Succès
- ✅ Frontend Build: Succès en <2 min
- ✅ Tests Unitaires: >80% passent
- ✅ Smoke Tests: 100% passent

### Temps d'Exécution Cibles

| Test | Durée Cible | Durée Max |
|------|-------------|-----------|
| Backend Health | 5s | 10s |
| Frontend | 3s | 10s |
| Smoke Tests | 10s | 30s |
| CI Pipeline | 2min | 5min |

## 🔐 Sécurité

Les tests incluent:
- ✅ npm audit
- ✅ Vérification des secrets
- ✅ Scan de sécurité du code

```bash
# Exécuter l'audit de sécurité
npm audit
npm audit fix

# Vérifier les secrets
bash scripts/verify-security.sh
```

## 📚 Ressources

- [Documentation Vitest](https://vitest.dev/)
- [Documentation Playwright](https://playwright.dev/)
- [GitHub Actions Docs](https://docs.github.com/actions)
- [Node.js Testing Best Practices](https://github.com/goldbergyoni/nodebestpractices#testing)

## ✅ Checklist de Validation

Avant de merger/déployer:

- [ ] `npm run typecheck` - 0 erreurs
- [ ] `npm run lint` - 0 erreurs
- [ ] `npm run build` - Succès
- [ ] `npm run build:backend` - Succès
- [ ] `bash scripts/smoke-tests.sh` - 100% passés
- [ ] `bash scripts/ci-validation.sh` - Succès
- [ ] Tests manuels effectués
- [ ] README mis à jour si nécessaire

## 🎯 Prochaines Étapes

1. ✅ Scripts de base créés
2. ✅ GitHub Actions configuré
3. 🔄 Améliorer la couverture de tests
4. 🔄 Ajouter tests E2E Playwright
5. 🔄 Intégrer avec Codecov
6. 🔄 Ajouter tests de performance

---

**Dernière mise à jour:** 2025-11-08
**Mainteneur:** Équipe Dev
