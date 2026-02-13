# Code Quality Audit - Quick Reference Guide

**File**: `CODE_QUALITY_AUDIT_REPORT.md` (Full 15-section report)
**Date**: 2025-10-23

---

## TL;DR - Top 10 Issues

| # | Issue | Severity | File(s) | Fix Time |
|---|-------|----------|---------|----------|
| 1 | Delete 5 backup files | CRITICAL | src/components/ | 5 min |
| 2 | Zustand store is 2003-line god class | CRITICAL | workflowStore.ts | 40 hours |
| 3 | 300-line switch in CustomNode | HIGH | CustomNode.tsx | 4 hours |
| 4 | 8 services >1300 lines | HIGH | src/services/ | 80 hours |
| 5 | 50+ magic numbers scattered | MEDIUM | Codebase | 20 hours |
| 6 | 100+ functions >50 lines | MEDIUM | Codebase | 60 hours |
| 7 | Tight coupling (components→services) | MEDIUM | ModernWorkflowEditor | 16 hours |
| 8 | Missing JSDoc on complex code | MEDIUM | Codebase | 40 hours |
| 9 | Unused imports/variables | MEDIUM | Codebase | 8 hours |
| 10 | 4 backend routes >500 lines | MEDIUM | src/backend/api/routes/ | 24 hours |

---

## Priority Implementation Order

### CRITICAL (This Week)
```bash
# 1. Delete backup files - 5 minutes
rm src/components/ExecutionEngine.BACKUP.ts
rm src/components/NodeConfigPanel.COMPLETE.tsx
rm src/components/NodeConfigPanel.OLD.tsx
rm src/components/CustomNode.BACKUP.tsx
rm src/components/CustomNode.IMPROVED.tsx

# 2. Extract icon config - 4 hours
# BEFORE: CustomNode.tsx (550 lines)
# AFTER: CustomNode.tsx (50 lines) + ICON_CONFIG (constant file)
```

### HIGH (Next 2 Weeks)
```bash
# 1. Refactor workflowStore.ts - 40 hours
# Split 2003-line file with 78 methods into 6 slice files

# 2. Break down large services - 80 hours
# DeploymentService (1381) → 5 focused classes
# PluginDevelopmentKit (1356) → 4 focused classes
# ErrorHandlingService (1340) → 3 focused classes
```

### MEDIUM (Month 2)
```bash
# 1. Create constants directory - 20 hours
# Consolidate 50+ magic numbers

# 2. Extract long functions - 60 hours
# Break down 100+ functions >50 lines

# 3. Add JSDoc - 40 hours
# Document 100+ complex functions
```

---

## Quick Fixes (Can Do Now)

### 1. Delete Backups (5 minutes)
```bash
git rm src/components/ExecutionEngine.BACKUP.ts
git rm src/components/NodeConfigPanel.COMPLETE.tsx
git rm src/components/NodeConfigPanel.OLD.tsx
git rm src/components/CustomNode.BACKUP.tsx
git rm src/components/CustomNode.IMPROVED.tsx
git commit -m "refactor: remove backup files (6000+ lines)"
```

### 2. Extract Icon Config (4 hours)
```typescript
// Create src/data/iconConfig.ts
export const ICON_CONFIG = {
  trigger: { icon: Icons.Play, bg: 'bg-green-500' },
  schedule: { icon: Icons.Clock, bg: 'bg-green-500' },
  webhook: { icon: Icons.Zap, bg: 'bg-green-500' },
  // ... 150+ more mappings
} as const;

// Use in CustomNode.tsx
const config = ICON_CONFIG[data.type];
if (!config) return <DefaultIcon />;
return <IconComponent icon={config.icon} bg={config.bg} />;
```

### 3. Create Constants File (3 hours)
```typescript
// Create src/constants/execution.ts
export const EXECUTION_CONSTANTS = {
  TIMEOUT_DEFAULT: 300000,      // 5 minutes
  TIMEOUT_WEBHOOK: 30000,       // 30 seconds
  MAX_RETRIES: 5,
  DEBOUNCE_DELAY: 300,
  CACHE_TTL_DEFAULT: 5 * 60 * 1000,
} as const;

// Replace all hardcoded values with constants
```

### 4. Fix Template Literal Bug (1 hour)
```typescript
// WRONG (in BACKUP files):
logger.error('Node type ${data.type} not found');

// CORRECT:
logger.error(`Node type ${data.type} not found`);
```

### 5. Remove Unused Imports (2 hours)
```bash
# Install eslint plugin
npm install -D eslint-plugin-unused-imports

# Run fix
npx eslint --fix src/

# Check results
git diff | grep "^-import"
```

---

## Code Smell Checklist

Use this checklist to audit any file:

```
[ ] File is <500 lines (or <1000 for services)
[ ] Component has <25 methods
[ ] Component has <50 useState hooks
[ ] No .BACKUP, .OLD, .IMPROVED files
[ ] No 300+ line switch statements
[ ] All magic numbers are in constants
[ ] All functions are <100 lines
[ ] Critical functions have JSDoc
[ ] No circular dependencies
[ ] No direct service imports (use DI instead)
[ ] Naming is consistent with conventions
[ ] No commented-out code
[ ] No console.log in production code
[ ] Error handling is standardized
[ ] Test coverage >60%
```

---

## Refactoring Patterns

### Pattern 1: Split God Class
```typescript
// BEFORE
export const useWorkflowStore = create((set) => ({
  // 78 methods mixed:
  setNodes, addNode, removeNode,
  setEdges, addEdge, removeEdge,
  setSelectedNode, setSelectedEdge,
  // ... 70+ more
}))

// AFTER
export const useWorkflowStructure = create((set) => ({
  setNodes, addNode, removeNode,
  setEdges, addEdge, removeEdge,
}))

export const useUIState = create((set) => ({
  setSelectedNode, setSelectedEdge,
  // ...
}))

// Composite for backward compatibility
export const useWorkflowStore = () => ({
  ...useWorkflowStructure(),
  ...useUIState(),
})
```

### Pattern 2: Extract Config from Logic
```typescript
// BEFORE - 550 lines
const getNodeIcon = useMemo(() => {
  switch (data.type) {
    case 'trigger': return <div>...</div>;
    case 'schedule': return <div>...</div>;
    // ... 148 more cases
  }
}, [data.type])

// AFTER - 30 lines
const ICON_CONFIG = { /* 150 entries */ }

const getNodeIcon = useCallback(() => {
  const config = ICON_CONFIG[data.type];
  return config ? <NodeIcon {...config} /> : <DefaultIcon />;
}, [data.type])
```

### Pattern 3: Extract Long Functions
```typescript
// BEFORE - 150 lines
async executeHttpRequest(config) {
  // ... validation, auth, retry, timeout, error handling
}

// AFTER - 20 lines + 8 helpers
async executeHttpRequest(config) {
  const url = this.validateUrl(config.url);
  const headers = this.buildHeaders(config.auth);
  const body = this.transformBody(config.body);
  return this.executeWithRetry(() => 
    this.sendRequest(url, headers, body, config)
  );
}

// Helper methods
private validateUrl(url) { /* 10 lines */ }
private buildHeaders(auth) { /* 10 lines */ }
private transformBody(body) { /* 10 lines */ }
// ... etc
```

### Pattern 4: Dependency Injection
```typescript
// BEFORE - Tight coupling
export function Component() {
  const execute = () => {
    new WorkflowExecutor(nodes, edges).execute();
  };
}

// AFTER - Loose coupling
export interface IWorkflowService {
  execute(): Promise<Result>;
}

export function Component({ workflowService }: { workflowService: IWorkflowService }) {
  const execute = () => {
    workflowService.execute();
  };
}
```

---

## File Size Guidelines

| Type | Max Lines | Ideal | Status |
|------|-----------|-------|--------|
| React Component | 400 | 200 | 7 violations |
| Custom Hook | 150 | 100 | 2 violations |
| Service Class | 500 | 300 | 30+ violations |
| API Route Handler | 200 | 100 | 4 violations |
| Utility/Helper | 100 | 50 | Clean |

---

## Testing Guidelines

After refactoring, minimum test coverage:

| Type | Minimum | Target |
|------|---------|--------|
| Utility functions | 90% | 95% |
| Services | 80% | 90% |
| Components | 70% | 85% |
| Hooks | 75% | 85% |
| Integration | 60% | 75% |

---

## Code Review Checklist

When reviewing PRs, check:

```
STRUCTURE:
[ ] No file >500 lines (except services <1000)
[ ] Functions are <100 lines
[ ] Components have <25 methods
[ ] No files with .BACKUP/.OLD/.IMPROVED in name

COMPLEXITY:
[ ] No switch statements >50 lines
[ ] No nested callbacks >3 levels
[ ] No magic numbers (use constants)
[ ] Cyclomatic complexity <10 per function

QUALITY:
[ ] Critical functions have JSDoc
[ ] No console.log statements
[ ] No commented-out code
[ ] Error handling is consistent
[ ] No unused imports/variables

TESTING:
[ ] New code has tests
[ ] Coverage >60% minimum
[ ] Edge cases covered
[ ] Mocked external dependencies

PERFORMANCE:
[ ] useMemo used only when needed
[ ] useCallback dependencies correct
[ ] No unnecessary re-renders
[ ] Large lists virtualized
```

---

## Tools to Setup

```bash
# ESLint plugins for code quality
npm install -D eslint-plugin-unused-imports
npm install -D eslint-plugin-complexity
npm install -D @typescript-eslint/eslint-plugin

# Configuration
cat > .eslintrc.json << 'ESLINT'
{
  "rules": {
    "max-lines": ["error", 500],
    "max-statements": ["error", 30],
    "complexity": ["error", 10],
    "max-nested-callbacks": ["error", 3],
    "unused-imports/no-unused-imports": "error",
    "no-console": ["error", { "allow": ["error", "warn"] }]
  }
}
ESLINT

# Pre-commit hooks
npm install -D husky lint-staged
npx husky install
cat > .husky/pre-commit << 'HUSKY'
#!/bin/sh
npx lint-staged
HUSKY

cat > .lintstagedrc.json << 'STAGED'
{
  "*.{ts,tsx}": [
    "eslint --fix",
    "prettier --write"
  ]
}
STAGED
```

---

## Refactoring Workflow

### For Each Large File:

1. **Analyze** (30 min)
   - Read file completely
   - Identify distinct concerns
   - List all public methods
   - Find duplicated patterns

2. **Plan** (30 min)
   - Create sub-components/services
   - Define new file structure
   - Plan dependencies
   - Identify shared code

3. **Implement** (4-8 hours depending on size)
   - Create new files
   - Move code with minimal changes
   - Update imports
   - Test thoroughly

4. **Test** (2-4 hours)
   - Write unit tests for new modules
   - Integration testing
   - Performance testing
   - Manual testing

5. **Review & Commit**
   - Clean up code
   - Update documentation
   - Create meaningful commit
   - Review with team

---

## Estimated Total Effort

| Task | Hours | Person | Total |
|------|-------|--------|-------|
| Delete backups | 0.1 | 1 | 0.1 |
| Extract icon config | 4 | 1 | 4 |
| Create constants | 20 | 1 | 20 |
| Split workflowStore | 40 | 2 | 80 |
| Refactor 8 large services | 80 | 2 | 160 |
| Extract long functions | 60 | 2 | 120 |
| Add JSDoc | 40 | 1 | 40 |
| Remove unused imports | 8 | 1 | 8 |
| Review & test | 40 | 2 | 80 |
| **TOTAL** | | | **512 hours** |

**Timeline**: 64 days at 8 hours/day, 1 person working full-time

**Team Approach**: 2-3 people working in parallel = 3-4 weeks

---

## Success Metrics

Track these before/after refactoring:

```
BEFORE:
- Files >500 lines: 45
- Files >1000 lines: 30+
- Average file size: 106 lines
- Backup files: 5
- Functions >100 lines: 100+
- Test coverage: ~50%

AFTER (TARGET):
- Files >500 lines: <10
- Files >1000 lines: <5
- Average file size: 90 lines
- Backup files: 0
- Functions >100 lines: <10
- Test coverage: 75%+
```

---

## Common Pitfalls to Avoid

1. **Over-refactoring**: Don't create too many small files (>2000 files)
2. **Breaking tests**: Run tests after every change
3. **Changing behavior**: Refactoring should not change functionality
4. **Ignoring performance**: Profile before/after to ensure no regressions
5. **Poor naming**: Spend time on good names (avoid `utils`, `helpers`)
6. **Missing documentation**: Update CLAUDE.md when patterns change

---

**See full audit**: `CODE_QUALITY_AUDIT_REPORT.md`
