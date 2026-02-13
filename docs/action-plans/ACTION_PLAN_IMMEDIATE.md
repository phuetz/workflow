# 🎯 PLAN D'ACTION IMMÉDIAT

**Objectif**: Résoudre les problèmes critiques bloquant la production
**Timeline**: 6 semaines (144 heures)
**Priorité**: P0 → P1 → P2

---

## 📅 SEMAINE 1: TYPE SAFETY (40h)

### Jour 1-2: SecureExpressionEvaluator.ts (16h)

**Problème**: 234 erreurs TypeScript

#### Commandes de Diagnostic
```bash
# Isoler les erreurs
npm run typecheck 2>&1 | grep "SecureExpressionEvaluator" > evaluator_errors.log
wc -l evaluator_errors.log

# Analyser les types d'erreurs
grep "TS18046" evaluator_errors.log | wc -l  # unknown type
grep "TS7053" evaluator_errors.log | wc -l   # index signature
```

#### Corrections à Appliquer

**1. Fix 'unknown' type errors (ligne 174, 616-619)**
```typescript
// AVANT
catch (error) {
  console.error(error.message); // ❌ error is unknown
}

// APRÈS
catch (error) {
  if (error instanceof Error) {
    console.error(error.message); // ✅ type-safe
  } else {
    console.error('Unknown error:', error);
  }
}
```

**2. Fix index signature errors (lignes 616-619)**
```typescript
// AVANT
const result = obj[key]; // ❌ Element implicitly has 'any'

// APRÈS
const result = obj[key as keyof typeof obj];
// OU
if (key in obj) {
  const result = (obj as Record<string, unknown>)[key];
}
```

**3. Add proper type guards**
```typescript
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function hasProperty<K extends string>(
  obj: unknown,
  key: K
): obj is Record<K, unknown> {
  return isRecord(obj) && key in obj;
}
```

#### Validation
```bash
# Après corrections
npm run typecheck 2>&1 | grep "SecureExpressionEvaluator" | wc -l
# Goal: 0 errors
```

### Jour 3-4: SecureSandbox.ts (16h)

**Problème**: 189 erreurs TypeScript

#### Corrections à Appliquer

**1. Fix visitor pattern (ligne 332)**
```typescript
// AVANT
const visitors = {
  ExportDeclaration(path: any) { // ❌ Does not exist
    // ...
  }
}

// APRÈS
import { SimpleVisitors } from '@babel/traverse';

const visitors: SimpleVisitors = {
  ExportAllDeclaration(path) {
    // Correct visitor name
  }
}
```

**2. Fix spread arguments (lignes 503, 505)**
```typescript
// AVANT
const result = func(...args); // ❌ spread must have tuple type

// APRÈS
const result = func(...(args as Parameters<typeof func>));
// OU
const result = (func as (...args: unknown[]) => unknown)(...args);
```

#### Validation
```bash
npm run typecheck 2>&1 | grep "SecureSandbox" | wc -l
# Goal: 0 errors
```

### Jour 5: UnifiedNotificationService.ts (8h)

**Problème**: 156 erreurs TypeScript

#### Corrections à Appliquer

**1. Install missing types**
```bash
npm install --save-dev @types/ws
```

**2. Fix console channel type (ligne 513)**
```typescript
// AVANT
type NotificationChannel = 'email' | 'slack' | ...;
if (channel === 'console') { // ❌ not in union
}

// APRÈS
type NotificationChannel = 'email' | 'slack' | 'console' | ...;
```

**3. Fix window reference (ligne 639)**
```typescript
// AVANT
if (window) { // ❌ Cannot find 'window'
}

// APRÈS
if (typeof window !== 'undefined') {
  // Browser context
}
```

**4. Add WebSocket types (ligne 643)**
```typescript
// AVANT
wss.on('connection', (ws, req) => { // ❌ implicit any

// APRÈS
import type { WebSocket } from 'ws';
import type { IncomingMessage } from 'http';

wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
  // Now type-safe
});
```

#### Validation
```bash
npm run typecheck 2>&1 | grep "UnifiedNotificationService" | wc -l
# Goal: 0 errors
```

---

## 📅 SEMAINE 2: MODULE RESOLUTION (40h)

### Jour 1: Install Missing Types (8h)

```bash
# Identifier les modules manquants
npm run build 2>&1 | grep "Cannot find module" | awk -F"'" '{print $2}' | sort -u > missing_modules.txt

# Installer les types manquants
cat missing_modules.txt | while read module; do
  echo "Installing @types/$module"
  npm install --save-dev @types/$module 2>/dev/null || echo "No types available for $module"
done

# Vérifier l'amélioration
npm run typecheck 2>&1 | grep "Cannot find module" | wc -l
```

### Jour 2: Custom Type Declarations (8h)

**Créer les déclarations manquantes**

#### types/ws.d.ts
```typescript
declare module 'ws' {
  import { EventEmitter } from 'events';
  import { IncomingMessage } from 'http';

  export class WebSocket extends EventEmitter {
    send(data: string | Buffer): void;
    close(code?: number, reason?: string): void;
    on(event: 'message', listener: (data: string) => void): this;
    on(event: 'close', listener: (code: number, reason: string) => void): this;
    on(event: 'error', listener: (error: Error) => void): this;
  }

  export class Server extends EventEmitter {
    on(event: 'connection', listener: (socket: WebSocket, request: IncomingMessage) => void): this;
  }
}
```

#### types/globals.d.ts
```typescript
// Browser/Node environment detection
declare const IS_BROWSER: boolean;
declare const IS_NODE: boolean;

// Conditional DOM types
interface WindowOrGlobal {
  setTimeout: typeof setTimeout;
  setInterval: typeof setInterval;
  clearTimeout: typeof clearTimeout;
  clearInterval: typeof clearInterval;
}

declare const globalContext: WindowOrGlobal;
```

### Jour 3-4: Fix Import Paths (16h)

**1. Analyser les imports**
```bash
# Trouver les imports relatifs profonds
find src -name "*.ts" -o -name "*.tsx" | xargs grep -n "from.*\.\./\.\./\.\." > deep_imports.txt
wc -l deep_imports.txt
```

**2. Consolider la structure**
```typescript
// AVANT
import { ExecutionEngine } from '../../../components/ExecutionEngine';
import { NodeTypes } from '../../../data/nodeTypes';

// APRÈS (using path mapping)
import { ExecutionEngine } from '@/components/ExecutionEngine';
import { NodeTypes } from '@/data/nodeTypes';
```

**3. Update tsconfig.json**
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@/components/*": ["src/components/*"],
      "@/utils/*": ["src/utils/*"],
      "@/types/*": ["src/types/*"]
    }
  }
}
```

### Jour 5: Validation (8h)

```bash
# Check module errors
npm run typecheck 2>&1 | grep "Cannot find module" | wc -l
# Goal: <50 errors

# Check build improvement
npm run build 2>&1 | grep "error TS" | wc -l
# Goal: <2000 errors
```

---

## 📅 SEMAINE 3: ENVIRONMENT ISSUES (40h)

### Jour 1-2: Browser/Node Separation (16h)

**1. Créer utilitaire de détection**

#### utils/environment.ts
```typescript
export const isBrowser = typeof window !== 'undefined';
export const isNode = !isBrowser;

export function getGlobalContext(): typeof globalThis {
  if (isBrowser) {
    return window as unknown as typeof globalThis;
  }
  return global;
}

export function getTimeout() {
  return isBrowser ? window.setTimeout : global.setTimeout;
}

export function getInterval() {
  return isBrowser ? window.setInterval : global.setInterval;
}
```

**2. Refactor intervalManager.ts**
```typescript
// AVANT
if (window) { // ❌ Cannot find 'window'
  window.addEventListener('visibilitychange', handler);
}

// APRÈS
import { isBrowser, getGlobalContext } from './environment';

if (isBrowser) {
  const win = getGlobalContext() as Window & typeof globalThis;
  win.addEventListener('visibilitychange', handler);
}
```

### Jour 3-4: DOM Type Conflicts (16h)

**1. Update tsconfig.json**
```json
{
  "compilerOptions": {
    // Split configs
  },
  "include": ["src/**/*"],
  "exclude": ["src/backend/**/*"]
}
```

**2. Create tsconfig.backend.json**
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "lib": ["ES2020"], // No DOM
    "types": ["node"]
  },
  "include": ["src/backend/**/*"]
}
```

**3. Create tsconfig.frontend.json**
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "types": ["vite/client"]
  },
  "include": ["src/**/*"],
  "exclude": ["src/backend/**/*"]
}
```

### Jour 5: Final Validation (8h)

```bash
# Full typecheck
npm run typecheck

# Backend typecheck
npx tsc --noEmit -p tsconfig.backend.json

# Frontend typecheck
npx tsc --noEmit -p tsconfig.frontend.json

# Build attempt
npm run build 2>&1 | tee build_week3.log
grep "error TS" build_week3.log | wc -l
# Goal: <500 errors

# Error reduction tracking
echo "Week 1: 5443 errors"
echo "Week 2: $(cat build_week2.log | grep 'error TS' | wc -l) errors"
echo "Week 3: $(cat build_week3.log | grep 'error TS' | wc -l) errors"
```

---

## 📅 SEMAINE 4: TEST FIXES (40h)

### Jour 1: UUID Mock Fix (8h)

**Problème**: 42 tests failing - "(0, v4) is not a function"

#### test-setup.ts
```typescript
import { vi } from 'vitest';

// Mock uuid BEFORE imports
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-uuid-' + Math.random().toString(36).slice(2, 11)),
  v1: vi.fn(() => 'test-uuid-v1'),
  v3: vi.fn(() => 'test-uuid-v3'),
  v5: vi.fn(() => 'test-uuid-v5')
}));
```

#### Validation
```bash
npm run test -- src/digitaltwin/__tests__/digitaltwin.test.ts
# Goal: All 42 tests pass
```

### Jour 2: Approval Workflow (8h)

**Problème**: 2 tests failing - "expected 'failed' to be 'pending'"

#### Debug
```bash
# Run avec logs
npm run test -- src/__tests__/environments.test.ts --reporter=verbose 2>&1 | tee approval_debug.log

# Identifier le problème
grep -A20 "should handle approval workflow" approval_debug.log
```

#### Fix ApprovalEngine state machine
```typescript
// src/environments/PromotionManager.ts

async requestPromotion(request: PromotionRequest): Promise<Promotion> {
  // ...

  if (request.requireApproval) {
    promotion.status = 'pending'; // ✅ Not 'failed'

    // Setup approval workflow
    await this.approvalEngine.createApproval({
      promotionId: promotion.id,
      approvers: request.approvers,
      // ...
    });
  }

  return promotion;
}
```

#### Validation
```bash
npm run test -- src/__tests__/environments.test.ts
# Goal: 2 tests pass
```

### Jour 3-4: Other Test Failures (16h)

**AI Template Generator (11 failures)**
```typescript
// Update mock responses in test
const mockLLMResponse = {
  category: 'ecommerce', // ✅ Match expected
  nodes: [/* proper structure */],
  edges: [/* proper connections */]
};
```

**Agentic Workflow (3 failures)**
```typescript
// Add proper async handling
test('should execute sequential pattern', async () => {
  const result = await engine.execute(pattern);

  // Add wait for completion
  await vi.waitFor(() => {
    expect(result.steps.length).toBeGreaterThan(0);
  }, { timeout: 1000 });
});
```

**AI Suggestions (1 failure)**
```typescript
// Fix URL validation
export function validateURL(url: string): boolean {
  try {
    new URL(url);
    return true; // ✅ Return true for valid URLs
  } catch {
    return false;
  }
}
```

#### Validation
```bash
npm run test -- --run 2>&1 | tee test_week4.log
grep "Tests.*passing" test_week4.log
# Goal: >90% pass rate
```

### Jour 5: Full Test Validation (8h)

```bash
# Run all tests
NODE_OPTIONS="--max-old-space-size=6144" npm run test -- --run --reporter=json > test_results.json

# Parse results
node -e "
const results = require('./test_results.json');
console.log('Total:', results.numTotalTests);
console.log('Passed:', results.numPassedTests);
console.log('Failed:', results.numFailedTests);
console.log('Pass Rate:', (results.numPassedTests / results.numTotalTests * 100).toFixed(2) + '%');
"

# Goal: >95% pass rate
```

---

## 📅 SEMAINE 5: QUALITY IMPROVEMENTS (40h)

### Jour 1-2: Coverage to 85% (16h)

**Identifier les gaps**
```bash
npm run test:coverage -- --reporter=json > coverage.json

# Analyser
node -e "
const cov = require('./coverage/coverage-summary.json');
console.log('Current:', cov.total.lines.pct + '%');
console.log('Target: 85%');
console.log('Gap:', 85 - cov.total.lines.pct + '%');
"
```

**Écrire tests manquants**
```bash
# Fichiers sans tests
find src -name "*.ts" -o -name "*.tsx" | while read file; do
  testfile=$(echo $file | sed 's/\.tsx\?$/.test.ts/')
  if [ ! -f "$testfile" ]; then
    echo "$file - NO TEST"
  fi
done > files_without_tests.txt
```

### Jour 3: Documentation (8h)

```bash
# Identifier fonctions sans JSDoc
npx eslint src --rule 'require-jsdoc: error' 2>&1 | grep "Missing JSDoc" > missing_jsdoc.txt
wc -l missing_jsdoc.txt

# Ajouter JSDoc
# Manual process pour top 50 fonctions
```

### Jour 4-5: Performance (16h)

**Bundle analysis**
```bash
npm run build -- --mode production
npx vite-bundle-visualizer

# Identifier large chunks
# Implement code splitting
# Add lazy loading
```

---

## 📅 SEMAINE 6: PRODUCTION READY (24h)

### Jour 1: Security Audit (8h)

```bash
# npm audit
npm audit --json > audit.json
npm audit fix

# Dependency check
npx depcheck

# Security scan
npx snyk test
```

### Jour 2: E2E Testing (8h)

```bash
# Setup E2E
npm run dev &
sleep 10

# Run E2E
npm run test:e2e

# Goal: All critical paths tested
```

### Jour 3: Performance Testing (8h)

```bash
# Load testing
npm run test:load

# Performance budget
npm run lighthouse

# Monitoring setup
```

---

## 📊 TRACKING PROGRESS

### Daily Checklist
```bash
# Morning
git pull
npm install
npm run typecheck | tee daily_typecheck.log

# Track errors
date >> progress.log
echo "TS Errors: $(grep 'error TS' daily_typecheck.log | wc -l)" >> progress.log

# End of day
npm run build 2>&1 | grep "error TS" | wc -l >> build_errors.log
```

### Weekly Report
```bash
# Generate report
cat << EOF > week_X_report.md
# Week X Report

## Metrics
- TS Errors: $(tail -1 build_errors.log)
- Tests Passing: $(npm run test -- --run 2>&1 | grep passing)
- Coverage: $(npm run test:coverage 2>&1 | grep "All files")

## Completed
- [x] Task 1
- [x] Task 2

## Next Week
- [ ] Task 3
- [ ] Task 4
EOF
```

---

## 🎯 SUCCESS CRITERIA

### Week 1 ✅
- [  ] SecureExpressionEvaluator: 0 errors
- [  ] SecureSandbox: 0 errors
- [  ] UnifiedNotificationService: 0 errors
- [  ] Total TS errors < 4000

### Week 2 ✅
- [  ] Missing types installed
- [  ] Custom declarations created
- [  ] Import paths optimized
- [  ] Total TS errors < 2000

### Week 3 ✅
- [  ] Browser/Node separated
- [  ] DOM conflicts resolved
- [  ] Build errors < 500
- [  ] **npm run build SUCCESS** 🎉

### Week 4 ✅
- [  ] UUID mock fixed (42 tests)
- [  ] Approval workflow fixed (2 tests)
- [  ] Other tests fixed (105 tests)
- [  ] Test pass rate > 95%

### Week 5 ✅
- [  ] Coverage > 85%
- [  ] Documentation complete
- [  ] Performance optimized

### Week 6 ✅
- [  ] Security audit clean
- [  ] E2E tests pass
- [  ] Performance tests pass
- [  ] **PRODUCTION READY** 🚀

---

**Start Date**: [À définir]
**Target Completion**: [Start + 6 weeks]
**Status**: 📋 READY TO START
