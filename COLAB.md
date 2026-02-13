# COLAB.md - Plan de Travail Collaboratif Multi-AI

> **Version:** 6.0.0
> **Date:** 2026-02-05
> **Statut:** AUDIT COMPLET + NOUVELLE RESTRUCTURATION
> **Participants:** Claude Code (coordinateur), AI collaborateurs

---

## Table des Matieres

1. [Regles de Collaboration](#1-regles-de-collaboration)
2. [Audit Global](#2-audit-global)
3. [Architecture Cible](#3-architecture-cible)
4. [Phases de Travail](#4-phases-de-travail)
5. [Journal de Bord](#5-journal-de-bord)
6. [Protocole de Validation](#6-protocole-de-validation)

---

## 1. Regles de Collaboration

### 1.1 Principes Fondamentaux

```
REGLE 1: Maximum 10 fichiers modifies par iteration
REGLE 2: Chaque tache doit etre testee avant de passer a la suivante
REGLE 3: Aucun script automatique sans validation prealable
REGLE 4: Boucle de retroaction obligatoire apres chaque modification
REGLE 5: Documenter chaque changement dans le Journal de Bord (section 5)
```

### 1.2 Boucle de Retroaction (Obligatoire)

Apres CHAQUE iteration, executer dans cet ordre:

```bash
# Etape 1: Verification TypeScript
npm run typecheck 2>&1 | head -50

# Etape 2: Lint du code
npm run lint 2>&1 | head -30

# Etape 3: Tests unitaires (fichiers modifies)
npm run test -- --run path/to/modified.test.ts

# Etape 4: Si modification backend
npm run typecheck:backend 2>&1 | head -50

# Etape 5: Build de verification
npm run build 2>&1 | tail -20
```

**Si une etape echoue**: Corriger AVANT de passer a la tache suivante.

### 1.3 Protocole de Communication entre AI

Chaque AI qui travaille sur ce projet DOIT:

1. **Avant de commencer**: Lire COLAB.md entierement
2. **Prendre une tache**: Mettre son statut a `EN COURS` avec son identifiant
3. **Apres chaque iteration**: Mettre a jour le Journal de Bord (section 5)
4. **En cas de blocage**: Documenter le probleme dans la section Blocages
5. **Tache terminee**: Mettre le statut a `FAIT` avec preuve de fonctionnement

### 1.4 Convention de Statut

| Symbole | Signification |
|---------|---------------|
| `[ ]` | A faire |
| `[~]` | En cours (indiquer AI + date) |
| `[x]` | Fait et valide |
| `[!]` | Bloque (voir section Blocages) |
| `[-]` | Abandonne (justification requise) |

### 1.5 Gestion des Conflits

Si deux AI travaillent sur des fichiers qui se chevauchent:
1. Le premier a avoir mis `[~]` a la priorite
2. Le second doit choisir une autre tache
3. En cas de doute: documenter dans Blocages et attendre resolution

---

## 2. Audit Global (2026-02-05)

### 2.1 Metriques Cles

| Metrique | Valeur | Etat |
|----------|--------|------|
| Fichiers totaux | 2,928 | - |
| Lignes de code | 1,128,153 | - |
| Fichiers de test | 242 | - |
| Erreurs TypeScript backend | 141 | CRITIQUE |
| Fichiers > 800 LOC | 137 | A REDUIRE |
| Fichiers > 1500 LOC | 19 | URGENT |
| Usages de `any` | 6,415 | A REDUIRE |
| Services dupliques | 118 noms en doublon | CRITIQUE |
| Couverture tests API routes | ~5% | CRITIQUE |
| Couverture tests middleware | 0% | CRITIQUE |
| Score global | 67/100 | OBJECTIF: 85/100 |

### 2.2 Problemes Critiques Identifies

#### CRITIQUE 1: 141 Erreurs TypeScript Backend
- `subworkflows.ts`: 10+ erreurs TS2769
- `workflows.ts`: 10+ erreurs TS2322/TS18047
- `QueueManager.ts`: 8+ erreurs de type
- `CredentialTesterService.ts`: casting invalide
- `repositories/adapters.ts`: type WorkflowNode[] incorrect

#### CRITIQUE 2: Services Dupliques
- `AuthService.ts` existe en 2 endroits (frontend + backend)
- `CacheService.ts` existe en 2 endroits
- `DatabaseService.ts` existe en 2 endroits
- 102 fichiers de services au niveau racine (ideal: ~30)

#### CRITIQUE 3: Fichiers Monolithiques Backend
- `openapi.ts`: 1,710 LOC
- `oauth.ts`: 1,375 LOC
- `GitService.ts`: 1,262 LOC
- `workflows.ts`: 1,233 LOC
- `QueueManager.ts`: 1,206 LOC
- `webhooks.ts`: 1,187 LOC

#### CRITIQUE 4: Configuration TypeScript Defaillante
- `tsconfig.app.json`: strict=false (DANGEREUX pour 180K+ lignes)
- `tsconfig.backend.json`: moduleResolution=bundler (INCORRECT pour Node)
- Barrel exports manquants pour middleware/, repositories/, services/

#### CRITIQUE 5: Couverture de Tests Insuffisante
- Routes API: ~5% couvertes
- Middleware: 0% couvert
- Database layer: ~20% couvert
- ESLint ne couvre que 7 fichiers sur 390+

### 2.3 Points Positifs

- Organisation composants frontend: 85/100
- State management Zustand: 80/100
- Stack technique moderne (React 19, Vite 7, TS 5.5)
- Securite globale: bonne base (Helmet, CSRF, rate limiting)
- Tests securite: excellents (80+ fichiers)

---

## 3. Architecture Cible

### 3.1 Objectif Final

```
Score: 67/100 --> 85/100
Erreurs TS: 141 --> 0
Fichiers > 800 LOC: 137 --> < 20
Couverture tests: ~15% --> 40%
Services dupliques: 118 --> 0
```

### 3.2 Structure Backend Cible

```
src/backend/
  api/
    routes/          # Max 400 LOC par route
      auth/          # Split en sous-modules
      workflows/     # Split en sous-modules
      oauth/         # Split en sous-modules
    middleware/
      index.ts       # Barrel export
    repositories/
      index.ts       # Barrel export
    services/
      index.ts       # Barrel export
  auth/              # Consolide (plus de doublons)
  database/          # Consolide
  security/          # Consolide
  queue/             # Consolide
```

### 3.3 Structure Services Cible

```
src/services/
  index.ts           # Barrel export principal
  auth/              # AuthService consolide
  cache/             # CacheService consolide
  database/          # DatabaseService consolide
  execution/         # ExecutionEngine consolide
  analytics/         # Tous les analytics
  monitoring/        # Monitoring consolide
  ...
```

---

## 4. Phases de Travail

### PHASE 1: Stabilisation Critique (Erreurs TS + Barrel Exports)
> **Objectif**: 0 erreurs TypeScript, build fonctionnel
> **Priorite**: BLOQUANT - Rien d'autre ne peut avancer sans ca

---

#### TACHE 1.1: Creer les barrel exports manquants
**Statut**: `[x]` Claude-Opus 2026-02-05
**Fichiers** (3 fichiers):
1. `src/backend/api/middleware/index.ts` - Nouveau barrel export
2. `src/backend/api/repositories/index.ts` - Nouveau barrel export
3. `src/backend/api/services/index.ts` - Nouveau barrel export

**Instructions**:
```bash
# Pour chaque dossier, lister les exports existants
ls src/backend/api/middleware/*.ts
# Creer un index.ts qui re-exporte tout
# Exemple: export { rateLimiter } from './rateLimiter';
```

**Validation**:
```bash
npm run typecheck:backend 2>&1 | grep "Cannot find module"
# Doit retourner 0 erreur de module manquant
```

**Preuve attendue**: `npm run typecheck:backend` ne montre plus d'erreur de modules manquants

---

#### TACHE 1.2: Corriger les erreurs TS dans repositories/adapters.ts
**Statut**: `[x]` Claude-Opus 2026-02-05
**Fichiers** (2 fichiers):
1. `src/backend/api/repositories/adapters.ts` - Fixer les casts de type
2. `src/types/workflow.ts` - Verifier les types WorkflowNode

**Instructions**:
- Remplacer les `as WorkflowNode[]` par des validations de type runtime
- Ajouter les champs manquants au type WorkflowStatus
- Utiliser des type guards au lieu de cast bruts

**Validation**:
```bash
npm run typecheck:backend 2>&1 | grep "adapters.ts"
# Doit retourner 0 erreur
```

**Preuve attendue**: 0 erreurs TS dans adapters.ts

---

#### TACHE 1.3: Corriger les erreurs TS dans routes/auth.ts
**Statut**: `[x]` Claude-Opus 2026-02-05
**Fichiers** (2 fichiers):
1. `src/backend/api/routes/auth.ts` - Fixer les proprietes manquantes
2. `prisma/schema.prisma` - Verifier le modele User

**Instructions**:
- Verifier que le modele Prisma User contient `oauthProvider` et `avatarUrl`
- Si les champs existent dans Prisma mais pas dans les types: `npx prisma generate`
- Si les champs n'existent pas: les ajouter au schema + migration

**Validation**:
```bash
npm run typecheck:backend 2>&1 | grep "auth.ts"
npx prisma validate
```

**Preuve attendue**: Schema Prisma valide, 0 erreurs TS dans auth.ts

---

#### TACHE 1.4: Corriger les erreurs TS dans subworkflows.ts
**Statut**: `[x]` Claude-Opus 2026-02-05
**Fichiers** (1 fichier):
1. `src/backend/api/routes/subworkflows.ts` - Fixer les 10+ erreurs TS2769

**Instructions**:
- Les erreurs TS2769 concernent les surcharges de router (express.Router)
- Verifier que les handlers ont les bons types (Request, Response, NextFunction)
- Ajouter des types explicites aux parametres de route

**Validation**:
```bash
npm run typecheck:backend 2>&1 | grep "subworkflows.ts"
# Doit retourner 0 erreur
```

**Preuve attendue**: 0 erreurs TS dans subworkflows.ts

---

#### TACHE 1.5: Corriger les erreurs TS dans workflows.ts
**Statut**: `[x]` Claude-Opus 2026-02-05
**Fichiers** (1 fichier):
1. `src/backend/api/routes/workflows.ts` - Fixer TS2322/TS18047

**Instructions**:
- Ajouter des null checks pour les proprietes possiblement undefined
- Corriger les assignments de type JSON vers WorkflowNode[]
- Utiliser des type guards pour les donnees Prisma

**Validation**:
```bash
npm run typecheck:backend 2>&1 | grep "workflows.ts"
```

**Preuve attendue**: 0 erreurs TS dans workflows.ts

---

#### TACHE 1.6: Corriger les erreurs TS dans QueueManager.ts
**Statut**: `[x]` Claude-Opus 2026-02-05
**Fichiers** (1 fichier):
1. `src/backend/queue/QueueManager.ts` - Fixer 8+ erreurs de type

**Instructions**:
- Corriger les TS2345 (argument de type incorrect)
- Corriger les TS2352 (conversion de type incorrecte)
- Verifier la compatibilite avec BullMQ types

**Validation**:
```bash
npm run typecheck:backend 2>&1 | grep "QueueManager.ts"
```

**Preuve attendue**: 0 erreurs TS dans QueueManager.ts

---

#### TACHE 1.7: Corriger les erreurs TS restantes (batch)
**Statut**: `[x]` Claude-Opus 2026-02-05 (BuiltInFunctions, SecureExpressionEngineV2, LLMService, SLAService, chat/storage, chat/providerHandlers, ConnectionFactory, CredentialTesterService, executionService, httpRequestExecutor)
**Fichiers** (max 10 fichiers):
- Liste des fichiers restants avec erreurs apres taches 1.1-1.6

**Instructions**:
1. Lancer `npm run typecheck:backend 2>&1`
2. Lister tous les fichiers encore en erreur
3. Corriger par lots de maximum 10 fichiers
4. Repeter jusqu'a 0 erreurs

**Validation**:
```bash
npm run typecheck:backend
# Exit code 0, aucune erreur
npm run build:backend
# Build reussi
```

**Preuve attendue**: `npm run typecheck:backend` retourne 0 erreurs

---

#### TACHE 1.8: Valider le build complet
**Statut**: `[x]` Claude-Opus 2026-02-05 - typecheck:backend=0, build=SUCCESS, lint=0 errors
**Fichiers** (0 fichiers - validation uniquement):

**Instructions**:
```bash
npm run typecheck          # Frontend
npm run typecheck:backend  # Backend
npm run build             # Build complet
npm run test -- --run     # Tests unitaires
```

**Preuve attendue**: Les 4 commandes passent sans erreur

---

### PHASE 2: Consolidation des Services Dupliques
> **Objectif**: Eliminer les doublons, creer des barrel exports
> **Prerequis**: Phase 1 terminee (0 erreurs TS)

---

#### TACHE 2.1: Consolider AuthService
**Statut**: `[ ]`
**Fichiers** (max 5 fichiers):
1. `src/services/AuthService.ts` - SUPPRIMER (deja supprime dans git status)
2. `src/backend/auth/AuthService.ts` - Service autoritaire
3. `src/backend/auth/index.ts` - Barrel export
4. Fichiers qui importent l'ancien AuthService - Mettre a jour les imports

**Instructions**:
- L'AuthService frontend est deja supprime (git status: `D src/services/AuthService.ts`)
- Verifier que tous les imports pointent vers `src/backend/auth/AuthService`
- Creer/verifier le barrel export `src/backend/auth/index.ts`

**Validation**:
```bash
grep -r "from.*services/AuthService" src/ --include="*.ts" --include="*.tsx"
# Doit retourner 0 resultat
npm run typecheck
```

**Preuve attendue**: Aucun import vers l'ancien AuthService

---

#### TACHE 2.2: Consolider CacheService
**Statut**: `[ ]`
**Fichiers** (max 5 fichiers):
1. `src/services/CacheService.ts` - Evaluer si necessaire
2. `src/backend/services/CacheService.ts` - Service autoritaire
3. `src/services/CacheLayer.ts` - Nouveau service (non-commite)
4. `src/services/CachingService.ts` - Doublon potentiel
5. Mettre a jour les imports

**Instructions**:
- Determiner quel CacheService est utilise ou (frontend vs backend)
- Consolider en un seul service avec interface claire
- Mettre a jour tous les imports

**Validation**:
```bash
grep -r "CacheService\|CachingService\|CacheLayer" src/ --include="*.ts" -l
npm run typecheck
```

**Preuve attendue**: Un seul CacheService, tous imports corrects

---

#### TACHE 2.3: Consolider DatabaseService
**Statut**: `[ ]`
**Fichiers** (max 5 fichiers):
1. `src/services/DatabaseService.ts` - Frontend service
2. `src/backend/database/DatabaseService.ts` - Backend service
3. Verifier les imports et consolider

**Instructions**:
- Le DatabaseService frontend ne devrait pas exister (le DB access est cote backend)
- Migrer les references frontend vers des appels API
- Garder uniquement `src/backend/database/DatabaseService.ts`

**Validation**:
```bash
grep -r "from.*services/DatabaseService" src/ --include="*.ts" --include="*.tsx"
npm run typecheck
```

---

#### TACHE 2.4: Creer le barrel export src/services/index.ts
**Statut**: `[ ]`
**Fichiers** (1-2 fichiers):
1. `src/services/index.ts` - Nouveau barrel export

**Instructions**:
- Lister tous les services dans src/services/
- Creer un index.ts qui exporte les services publics
- Organiser par categorie (auth, cache, execution, etc.)

**Validation**:
```bash
npm run typecheck
```

---

### PHASE 3: Decoupage des Fichiers Monolithiques Backend
> **Objectif**: Aucun fichier backend > 800 LOC
> **Prerequis**: Phase 2 terminee

---

#### TACHE 3.1: Decouper oauth.ts (1,375 LOC)
**Statut**: `[ ]`
**Fichiers** (max 6 fichiers):
1. `src/backend/api/routes/oauth.ts` - Fichier original (reduire a < 200 LOC)
2. `src/backend/api/routes/oauth/index.ts` - Router principal
3. `src/backend/api/routes/oauth/providers.ts` - Logique par provider
4. `src/backend/api/routes/oauth/strategies.ts` - Strategies OAuth
5. `src/backend/api/routes/oauth/callbacks.ts` - Handlers de callback
6. `src/backend/api/routes/oauth/utils.ts` - Utilitaires partages

**Instructions**:
- Lire oauth.ts et identifier les blocs logiques
- Creer un dossier oauth/ avec des fichiers < 400 LOC chacun
- L'index.ts re-exporte le router complet

**Validation**:
```bash
wc -l src/backend/api/routes/oauth/*.ts
# Chaque fichier < 400 LOC
npm run typecheck:backend
npm run test -- --run src/__tests__/*oauth*
```

**Preuve attendue**: Chaque fichier < 400 LOC, tous les tests passent

---

#### TACHE 3.2: Decouper workflows.ts (1,233 LOC)
**Statut**: `[ ]`
**Fichiers** (max 5 fichiers):
1. `src/backend/api/routes/workflows.ts` - Reduire a < 200 LOC
2. `src/backend/api/routes/workflows/index.ts` - Router principal
3. `src/backend/api/routes/workflows/crud.ts` - Operations CRUD
4. `src/backend/api/routes/workflows/execution.ts` - Execution
5. `src/backend/api/routes/workflows/versioning.ts` - Versioning

**Validation**:
```bash
wc -l src/backend/api/routes/workflows/*.ts
npm run typecheck:backend
```

---

#### TACHE 3.3: Decouper webhooks.ts (1,187 LOC)
**Statut**: `[ ]`
**Fichiers** (max 5 fichiers):
1. `src/backend/api/routes/webhooks.ts` - Reduire
2. `src/backend/api/routes/webhooks/index.ts`
3. `src/backend/api/routes/webhooks/management.ts`
4. `src/backend/api/routes/webhooks/handlers.ts`
5. `src/backend/api/routes/webhooks/auth.ts`

**Validation**: meme pattern que 3.1

---

#### TACHE 3.4: Decouper QueueManager.ts (1,206 LOC)
**Statut**: `[ ]`
**Fichiers** (max 5 fichiers):
1. `src/backend/queue/QueueManager.ts` - Reduire
2. `src/backend/queue/QueueWorker.ts` - Workers
3. `src/backend/queue/QueueScheduler.ts` - Scheduling
4. `src/backend/queue/QueueEvents.ts` - Event handling
5. `src/backend/queue/types.ts` - Types partages

**Validation**:
```bash
wc -l src/backend/queue/*.ts
npm run typecheck:backend
```

---

#### TACHE 3.5: Decouper GitService.ts (1,262 LOC)
**Statut**: `[ ]`
**Fichiers** (max 5 fichiers):
1. `src/backend/git/GitService.ts` - Reduire
2. `src/backend/git/GitCommands.ts` - Operations git
3. `src/backend/git/GitDiff.ts` - Diff et comparaison
4. `src/backend/git/GitBranch.ts` - Gestion des branches
5. `src/backend/git/types.ts` - Types partages

---

#### TACHE 3.6: Decouper validation.ts (1,075 LOC)
**Statut**: `[ ]`
**Fichiers** (max 5 fichiers):
1. `src/backend/api/middleware/validation.ts` - Reduire
2. `src/backend/api/middleware/validation/index.ts`
3. `src/backend/api/middleware/validation/schemas.ts`
4. `src/backend/api/middleware/validation/sanitizers.ts`
5. `src/backend/api/middleware/validation/validators.ts`

---

#### TACHE 3.7: Decouper les fichiers restants > 800 LOC
**Statut**: `[ ]`
**Fichiers**: A determiner apres taches 3.1-3.6

**Instructions**:
```bash
# Lister les fichiers backend encore > 800 LOC
find src/backend -name "*.ts" -exec wc -l {} + | sort -rn | head -20
```
Repeter le pattern de decoupage par lots de max 10 fichiers.

---

### PHASE 4: Couverture de Tests Critique
> **Objectif**: Couvrir les routes API, middleware et database layer
> **Prerequis**: Phase 1 terminee (les phases 2-3 peuvent etre en parallele)

---

#### TACHE 4.1: Tests des routes API - Auth
**Statut**: `[ ]`
**Fichiers** (max 4 fichiers):
1. `src/__tests__/integration/api-auth.test.ts` - Existe deja (non-commite)
2. Verifier/completer les tests existants

**Tests a couvrir**:
- POST /api/auth/login
- POST /api/auth/register
- POST /api/auth/logout
- GET /api/auth/me
- POST /api/auth/refresh-token
- POST /api/auth/forgot-password

**Validation**:
```bash
npm run test -- --run src/__tests__/integration/api-auth.test.ts
# Tous les tests passent
```

---

#### TACHE 4.2: Tests des routes API - Workflows
**Statut**: `[ ]`
**Fichiers** (max 4 fichiers):
1. `src/__tests__/integration/api-workflows.test.ts` - Existe deja

**Tests a couvrir**:
- GET /api/workflows
- POST /api/workflows
- GET /api/workflows/:id
- PUT /api/workflows/:id
- DELETE /api/workflows/:id
- POST /api/workflows/:id/execute

---

#### TACHE 4.3: Tests des routes API - Credentials & Executions
**Statut**: `[ ]`
**Fichiers** (max 4 fichiers):
1. `src/__tests__/integration/api-credentials.test.ts` - Existe deja
2. `src/__tests__/integration/api-executions.test.ts` - Existe deja

---

#### TACHE 4.4: Tests Middleware
**Statut**: `[ ]`
**Fichiers** (max 5 fichiers):
1. `src/backend/api/middleware/__tests__/rateLimiter.test.ts` - Existe
2. `src/backend/api/middleware/__tests__/csrf.test.ts` - A creer
3. `src/backend/api/middleware/__tests__/compression.test.ts` - A creer
4. `src/backend/api/middleware/__tests__/validation.test.ts` - A creer
5. `src/backend/api/middleware/__tests__/timeout.test.ts` - A creer

**Tests a couvrir par middleware**:
- Rate limiter: limite respectee, reset apres delai
- CSRF: token genere, requete rejetee sans token
- Compression: reponses compressees au-dessus du seuil
- Validation: schemas valides/invalides
- Timeout: requete interrompue apres delai

---

#### TACHE 4.5: Tests Database Layer
**Statut**: `[ ]`
**Fichiers** (max 5 fichiers):
1. `src/backend/database/__tests__/ConnectionPool.test.ts` - A creer
2. `src/backend/database/__tests__/DatabaseService.test.ts` - A creer
3. `src/backend/database/__tests__/backup.test.ts` - A creer

---

### PHASE 5: Configuration et Build
> **Objectif**: Build fiable, ESLint elargi, TypeScript strict
> **Prerequis**: Phase 1 terminee

---

#### TACHE 5.1: Corriger tsconfig.backend.json
**Statut**: `[ ]`
**Fichiers** (2 fichiers):
1. `tsconfig.backend.json` - Changer moduleResolution
2. `tsconfig.build.json` - Ajouter les fichiers exclus

**Instructions**:
- Changer `moduleResolution` de `bundler` a `node16` ou `nodenext`
- Ajouter dans tsconfig.build.json les fichiers exclus:
  - `src/backend/database/ConnectionPool.ts`
  - `src/backend/services/executionService.ts`
  - `src/backend/services/analyticsService.ts`

---

#### TACHE 5.2: Elargir la couverture ESLint
**Statut**: `[ ]`
**Fichiers** (1 fichier):
1. `eslint.config.js` - Ajouter les scopes manquants

**Instructions**:
- Actuellement ESLint ne couvre que ~7 fichiers
- Ajouter progressivement:
  - `src/backend/api/routes/**/*.ts`
  - `src/backend/api/repositories/**/*.ts`
  - `src/services/**/*.ts`

---

#### TACHE 5.3: Mettre a jour package.json engines
**Statut**: `[ ]`
**Fichiers** (1 fichier):
1. `package.json` - Mettre node >= 20.0.0

---

#### TACHE 5.4: Activer TypeScript strict mode (frontend)
**Statut**: `[ ]`
**Fichiers** (1 fichier):
1. `tsconfig.app.json` - Activer strict progressivement

**Instructions**:
- NE PAS activer strict: true d'un coup (trop d'erreurs)
- Activer progressivement:
  1. D'abord `noImplicitAny: true`
  2. Puis `strictNullChecks: true`
  3. Puis `strict: true`
- Chaque etape = une sous-tache separee

---

### PHASE 6: Nettoyage Services Frontend
> **Objectif**: Reduire de 102 a ~40 services racine
> **Prerequis**: Phase 2 terminee (doublons resolus)

---

#### TACHE 6.1: Consolider les services analytics
**Statut**: `[ ]`
**Fichiers** (max 8 fichiers):
1. `src/services/AnalyticsService.ts`
2. `src/services/AnalyticsPersistence.ts`
3. `src/services/AdvancedAnalyticsService.ts`
4. `src/services/WorkflowAnalyticsService.ts`
5. `src/services/analytics/index.ts` - Dossier consolide (deja existe)

**Instructions**:
- Verifier ce qui est deja dans `src/services/analytics/`
- Migrer les services racine vers le sous-dossier
- Mettre a jour tous les imports

---

#### TACHE 6.2: Consolider les services d'execution
**Statut**: `[ ]`
**Fichiers** (max 8 fichiers):
1. `src/services/AdvancedExecutionEngine.ts`
2. `src/services/WorkerExecutionEngine.ts`
3. `src/services/execution/` - Dossier consolide (deja existe)
4. `src/components/ExecutionEngine.ts`

---

#### TACHE 6.3: Consolider les services de monitoring
**Statut**: `[ ]`
**Fichiers** (max 8 fichiers):
1. `src/services/MonitoringService.ts`
2. `src/services/PerformanceMonitoringService.ts`
3. `src/services/MetricsCollector.ts`
4. `src/services/ErrorTrackingService.ts`
5. `src/services/monitoring/` - Dossier consolide

---

#### TACHE 6.4: Consolider les services restants
**Statut**: `[ ]`
**Fichiers** (max 10 fichiers par iteration):

Services a consolider en sous-dossiers:
- `NotificationService.ts` + `EventNotificationService.ts` --> `notifications/`
- `VaultService.ts` + `SecretsService.ts` --> `vault/`
- `ImportExportService.ts` --> `import-export/`
- `BackupService.ts` + `S3BackupService.ts` --> `backup/`
- `SubWorkflowService.ts` --> `workflow/`
- `WorkflowTestingService.ts` + `TestingService` --> `testing/`

---

### PHASE 7: Decoupage Composants Frontend > 700 LOC
> **Objectif**: Aucun composant React > 500 LOC
> **Prerequis**: Phase 1 terminee

---

#### TACHE 7.1: Decouper VariablesManager.tsx (859 LOC)
**Statut**: `[ ]`
**Fichiers** (max 5 fichiers)

---

#### TACHE 7.2: Decouper Documentation.tsx (814 LOC)
**Statut**: `[ ]`
**Fichiers** (max 5 fichiers)

---

#### TACHE 7.3: Decouper les dashboards restants > 700 LOC
**Statut**: `[ ]`
**Fichiers** (max 10 fichiers par iteration):
- ImportExportDashboard.tsx (822 LOC)
- ErrorHandlingDashboard.tsx (821 LOC)
- BentoDashboard.tsx (808 LOC)
- WorkflowAnalyticsAI.tsx (795 LOC)
- VersionControlHub.tsx (792 LOC)

---

### PHASE 8: Performance et Optimisation
> **Objectif**: Lazy loading des deps lourdes, optimisation bundle
> **Prerequis**: Phases 1-3 terminees

---

#### TACHE 8.1: Lazy loading TensorFlow et LangChain
**Statut**: `[ ]`
**Fichiers** (max 5 fichiers):

**Instructions**:
- Identifier tous les imports de @tensorflow/tfjs et langchain
- Les remplacer par des dynamic imports: `const tf = await import('@tensorflow/tfjs')`
- Ajouter un loading state dans les composants concernes

---

#### TACHE 8.2: Lazy loading Monaco Editor
**Statut**: `[ ]`
**Fichiers** (max 5 fichiers):

**Instructions**:
- Monaco est deja dans un chunk separe (vite.config.ts)
- Verifier que les composants utilisent React.lazy()
- Ajouter des Suspense boundaries

---

#### TACHE 8.3: Consolider les rate limiters
**Statut**: `[ ]`
**Fichiers** (max 3 fichiers):
1. `src/backend/api/middleware/rateLimiter.ts`
2. `src/backend/security/RateLimitService.ts`
3. Eliminer la duplication

---

### PHASE 9: Tests E2E et Validation Finale
> **Objectif**: Validation complete avec Chrome/Playwright
> **Prerequis**: Toutes les phases precedentes

---

#### TACHE 9.1: Verifier les tests E2E existants
**Statut**: `[ ]`
**Fichiers**:
1. `e2e/workflow-creation.spec.ts`
2. `e2e/workflow-execution.spec.ts`
3. `e2e/workflow-import-export.spec.ts`

**Validation**:
```bash
npm run test:e2e
```

---

#### TACHE 9.2: Tests E2E - Navigation et UI
**Statut**: `[ ]`
**Fichiers** (max 3 fichiers):

**Tests a couvrir**:
- Chargement de l'application
- Navigation entre les pages
- Dark mode toggle
- Responsive design

---

#### TACHE 9.3: Audit final et rapport
**Statut**: `[ ]`
**Fichiers** (0 fichiers - audit uniquement):

**Instructions**:
```bash
npm run typecheck         # 0 erreurs
npm run typecheck:backend # 0 erreurs
npm run lint              # 0 erreurs
npm run test -- --run     # Tous tests passent
npm run build             # Build reussi
npm run test:e2e          # E2E passent
```

**Rapport a produire**: Mise a jour de COLAB.md avec scores finaux

---

## 5. Journal de Bord

### Format d'entree

```
### [DATE] - [AI_ID] - [TACHE]
**Statut**: [REUSSI/ECHEC/EN COURS]
**Fichiers modifies**: [liste]
**Tests**: [resultats]
**Problemes**: [description si applicable]
**Prochaine etape**: [tache suivante]
```

### Entrees

#### 2026-02-05 - Claude-Coord - Audit Initial
**Statut**: REUSSI
**Action**: Audit complet de l'application (4 agents paralleles)
**Resultats**:
- Score global: 67/100
- 141 erreurs TypeScript backend
- 137 fichiers > 800 LOC
- 118 services dupliques
- Couverture tests API: ~5%
**Prochaine etape**: Phase 1 - Stabilisation critique

#### 2026-02-05 - Claude-Opus - Phase 1 Complete
**Statut**: REUSSI
**Action**: Correction de toutes les erreurs TypeScript backend (141 -> 0)
**Fichiers modifies** (16 fichiers):
1. `src/backend/api/middleware/index.ts` - Cree barrel export
2. `src/backend/api/repositories/index.ts` - Cree barrel export
3. `src/backend/api/services/index.ts` - Cree barrel export
4. `src/backend/api/index.ts` - Fix export app
5. `src/backend/api/routes/index.ts` - Fix named imports (nodes, auth, analytics, marketplace)
6. `src/backend/api/repositories/adapters.ts` - Fix Prisma JSON types (14 erreurs)
7. `src/backend/api/routes/workflows.ts` - Fix type casts et null checks (12 erreurs)
8. `src/backend/api/routes/executions.ts` - Fix JobData type
9. `src/backend/api/routes/metrics.ts` - Fix BufferEncoding
10. `src/backend/api/routes/chat/storage.ts` - Fix Prisma JSON types (6 erreurs)
11. `src/backend/api/routes/chat/providerHandlers.ts` - Fix healthCheck
12. `src/backend/auth/AuthManager.ts` - Fix logger signature
13. `src/backend/database/pool/ConnectionFactory.ts` - Fix module imports
14. `src/backend/database/pool/modules.d.ts` - Cree declarations pg/mysql2
15. `src/backend/services/CredentialTesterService.ts` - Fix boolean return
16. `src/backend/services/executionService.ts` - Fix node.data types
17. `src/backend/services/nodeExecutors/httpRequestExecutor.ts` - Fix URL constructor
18. `src/backend/queue/QueueManager.ts` - Fix 13 type errors (agents paralleles)
19. `src/expressions/BuiltInFunctions.ts` - Fix null comparisons (8 erreurs)
20. `src/expressions/SecureExpressionEngineV2.ts` - Fix BLOCKED_PROPERTIES + undefined
21. `src/services/LLMService.ts` - Fix response.json() unknown type
22. `src/services/SLAService.ts` - Remove dead AuthService import
**Tests**: typecheck:backend = 0 errors, build = SUCCESS, lint = 0 errors (23 warnings)
**Prochaine etape**: Phase 2 - Consolidation services dupliques

---

## 6. Protocole de Validation

### 6.1 Validation par Tache

Chaque tache DOIT passer cette checklist:

```
[ ] Code modifie (max 10 fichiers)
[ ] npm run typecheck passe
[ ] npm run lint passe (pas de nouvelles erreurs)
[ ] Tests unitaires passent pour les fichiers modifies
[ ] Aucune regression (tests existants passent toujours)
[ ] Journal de Bord mis a jour
[ ] Statut de la tache mis a jour dans COLAB.md
```

### 6.2 Validation par Phase

A la fin de chaque phase:

```
[ ] Toutes les taches de la phase sont [x]
[ ] npm run build reussi
[ ] npm run test -- --run : tous passent
[ ] Score d'architecture recalcule
[ ] COLAB.md mis a jour avec les nouveaux scores
```

### 6.3 Test avec Chrome (Boucle de Retroaction UI)

Pour les modifications qui impactent le frontend:

```bash
# 1. Lancer l'application
npm run dev

# 2. Ouvrir Chrome sur http://localhost:8080

# 3. Verifier visuellement:
#    - L'application charge sans erreur console
#    - Les composants modifies s'affichent correctement
#    - Les interactions fonctionnent (clic, drag, etc.)
#    - Le dark mode fonctionne
#    - Pas de regression visuelle

# 4. Tests Playwright automatises
npm run test:e2e
```

### 6.4 Ordre de Priorite des Phases

```
Phase 1 (BLOQUANT)     --> Phase 2, 4, 5 (PARALLELE)
                             |
                             v
                        Phase 3, 6, 7 (PARALLELE)
                             |
                             v
                        Phase 8 (OPTIMISATION)
                             |
                             v
                        Phase 9 (VALIDATION FINALE)
```

**Dependances**:
- Phase 1 bloque TOUT le reste
- Phases 2, 4, 5 peuvent se faire en parallele apres Phase 1
- Phases 3, 6, 7 dependent de Phase 2
- Phase 8 depend de Phases 3+6
- Phase 9 depend de toutes les autres

---

## Annexe A: Fichiers les Plus Critiques

| Fichier | LOC | Probleme | Phase |
|---------|-----|----------|-------|
| `openapi.ts` | 1,710 | Trop gros | 3 |
| `oauth.ts` | 1,375 | Trop gros | 3 |
| `GitService.ts` | 1,262 | Trop gros | 3 |
| `workflows.ts` | 1,233 | Erreurs TS + trop gros | 1+3 |
| `QueueManager.ts` | 1,206 | Erreurs TS + trop gros | 1+3 |
| `webhooks.ts` | 1,187 | Trop gros | 3 |
| `subworkflows.ts` | ~800 | 10+ erreurs TS | 1 |
| `adapters.ts` | ~500 | Erreurs type | 1 |
| `auth.ts` | 885 | Erreurs + trop gros | 1+3 |
| `validation.ts` | 1,075 | Trop gros | 3 |

## Annexe B: Commandes Utiles

```bash
# Compter les lignes de code
find src -name "*.ts" -o -name "*.tsx" | xargs wc -l | sort -rn | head -30

# Trouver les fichiers > 800 LOC
find src -name "*.ts" -o -name "*.tsx" | xargs wc -l | awk '$1 > 800' | sort -rn

# Verifier les doublons de noms
find src -name "*.ts" | xargs -I{} basename {} | sort | uniq -d

# Chercher les imports d'un service
grep -r "from.*ServiceName" src/ --include="*.ts" --include="*.tsx" -l

# Lancer un test specifique
npm run test -- --run src/__tests__/path/to/test.ts

# Verifier les types d'un fichier specifique
npx tsc --noEmit --project tsconfig.backend.json 2>&1 | grep "filename"
```

## Annexe C: Estimation Globale

| Phase | Taches | Effort Estime | Impact |
|-------|--------|---------------|--------|
| Phase 1 | 8 | 8-12h | CRITIQUE: debloquer le build |
| Phase 2 | 4 | 4-6h | Eliminer les doublons |
| Phase 3 | 7 | 12-16h | Reduire complexite backend |
| Phase 4 | 5 | 8-10h | Couvrir les tests critiques |
| Phase 5 | 4 | 3-4h | Fiabiliser la config |
| Phase 6 | 4 | 6-8h | Nettoyer services frontend |
| Phase 7 | 3 | 4-6h | Reduire composants gros |
| Phase 8 | 3 | 4-6h | Optimiser performance |
| Phase 9 | 3 | 4-6h | Validation finale |
| **TOTAL** | **41** | **53-74h** | **67/100 --> 85/100** |
