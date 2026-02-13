# ⚡ Tests Automatiques - Démarrage Rapide

Guide ultra-rapide pour commencer avec les tests automatiques.

## 🚀 Commandes Essentielles

```bash
# Tests rapides (30 secondes) - À utiliser en développement
npm run test:quick

# Mode surveillance - Relance automatiquement les tests
bash scripts/test-watch.sh

# Tous les tests - Avant de pusher
npm run test:all
```

## 📝 Workflow Quotidien

### 1. Démarrage
```bash
# Lancer les serveurs
npm run dev
```

### 2. Développement
```bash
# Dans un autre terminal, lancer le watcher
bash scripts/test-watch.sh
```

Le watcher relancera automatiquement les tests à chaque modification de fichier.

### 3. Avant de Commiter

Les tests se lancent **automatiquement** grâce aux hooks Husky :

```bash
git add .
git commit -m "Mon message"
# ⚡ Lance automatiquement: TypeCheck + Quick Tests
```

Si les tests échouent, le commit est bloqué. Corrigez les erreurs et recommencez.

### 4. Avant de Pusher

```bash
git push
# 🚀 Lance automatiquement: TypeCheck + Lint + Smoke Tests + Build
```

Si les tests échouent, le push est bloqué.

## 🛠️ Tests Individuels

```bash
# Backend uniquement
npm run test:health

# Frontend uniquement
npm run test:frontend

# TypeScript
npm run typecheck

# Lint
npm run lint

# Build
npm run build
```

## 🔥 En Cas de Problème

### Les tests backend échouent
```bash
# Vérifier que le backend tourne
npm run dev:backend
sleep 10
npm run test:health
```

### Les tests frontend échouent
```bash
# Vérifier que le frontend tourne
npm run dev:frontend
sleep 5
npm run test:frontend
```

### Contourner les hooks (urgence seulement)
```bash
git commit --no-verify -m "Message"
git push --no-verify
```

⚠️ **À n'utiliser qu'en cas d'urgence !**

## 📊 Scripts Disponibles

| Commande | Quoi | Quand |
|----------|------|-------|
| `npm run test:quick` | Tests rapides (30s) | Développement quotidien |
| `npm run test:health` | Backend seulement (5s) | Debug backend |
| `npm run test:frontend` | Frontend seulement (3s) | Debug frontend |
| `npm run test:smoke` | Tests complets (10s) | Avant push manuel |
| `npm run test:all` | Tous les tests (5-10min) | Avant release |
| `bash scripts/test-watch.sh` | Mode surveillance | Développement actif |

## 🎯 Checklist Rapide

Avant de pusher :

- [ ] Tests locaux passent (`npm run test:quick`)
- [ ] Pas d'erreur TypeScript (`npm run typecheck`)
- [ ] Code formaté (`npm run lint:fix`)
- [ ] Build fonctionne (`npm run build:backend`)

## 📚 Documentation Complète

Pour plus de détails, voir :
- [AUTOMATED_TESTING_SYSTEM.md](./AUTOMATED_TESTING_SYSTEM.md) - Documentation complète
- [TESTING_GUIDE.md](./TESTING_GUIDE.md) - Guide détaillé

---

**C'est tout ! Les tests automatiques sont là pour vous aider, pas pour vous ralentir. 🚀**
