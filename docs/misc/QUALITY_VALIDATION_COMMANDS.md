# Quality Validation Commands

Quick reference for validating code quality after polish phase.

---

## 🔍 Quick Health Check

```bash
# Run all validations
npm run typecheck && npm run lint && echo "✅ All validations passed!"
```

---

## 📋 Individual Checks

### 1. TypeScript Type Checking

```bash
# Full type check (no emit)
npm run typecheck

# Expected: No errors
# Current: ✅ 0 errors
```

### 2. ESLint Code Quality

```bash
# Run linter on configured files
npm run lint

# Expected: 0 errors, <20 warnings
# Current: ✅ 0 errors, 16 warnings
```

```bash
# Auto-fix linting issues
npm run lint:fix
```

### 3. Full Build

```bash
# Production build
npm run build

# Expected: Build succeeds (may have type warnings)
# Current: ⚠️ 60 type strictness issues (non-blocking)
```

### 4. Development Server

```bash
# Start dev server
npm run dev

# Expected: Server starts without errors
# Check: http://localhost:3000
```

---

## 📊 Code Metrics

### Count Any Types

```bash
# Count all any type usage
grep -rn ": any" src/ --include="*.ts" --include="*.tsx" | wc -l

# Current: 2,495 instances
# Target: <2,000 instances
```

### Find Large Files

```bash
# List files over 1,000 lines
find src -name "*.ts" -o -name "*.tsx" | xargs wc -l | awk '$1 > 1000' | sort -rn

# Current: 17 files over 1,500 lines
# Target: <10 files over 1,500 lines
```

### Count Total Code

```bash
# Total lines of TypeScript
wc -l src/**/*.{ts,tsx} 2>/dev/null | tail -1

# Current: 481,641 lines
```

### Count Files

```bash
# Total TypeScript files
find src -name "*.ts" -o -name "*.tsx" | wc -l

# Current: 1,736 files
```

---

## 🧪 Testing

### Run All Tests

```bash
# Unit tests (Vitest)
npm test

# With coverage
npm run test:coverage

# Integration tests
npm run test:integration

# E2E tests (requires server running)
npm run test:e2e
```

---

## 🎯 Quality Gates (CI/CD)

### Required Checks Before Commit

```bash
#!/bin/bash
# Save as .git/hooks/pre-commit (make executable)

echo "Running quality checks..."

# TypeScript
echo "1. TypeScript check..."
npm run typecheck || exit 1

# ESLint
echo "2. ESLint check..."
npm run lint || exit 1

# Tests (optional - can be slow)
# echo "3. Running tests..."
# npm test || exit 1

echo "✅ All quality checks passed!"
```

### Required Checks Before Push

```bash
#!/bin/bash
# Save as .git/hooks/pre-push (make executable)

echo "Running comprehensive checks..."

# Full build
echo "1. Production build..."
npm run build || exit 1

# All tests
echo "2. Running all tests..."
npm test || exit 1

echo "✅ Ready to push!"
```

---

## 📈 Quality Metrics Dashboard

### Generate Quality Report

```bash
# Count TypeScript errors
echo "TypeScript Errors:"
npm run typecheck 2>&1 | grep -c "error TS"

# Count ESLint errors
echo "ESLint Errors:"
npm run lint 2>&1 | grep -c "error"

# Count ESLint warnings
echo "ESLint Warnings:"
npm run lint 2>&1 | grep -c "warning"

# Count any types
echo "Any Types:"
grep -rn ": any" src/ --include="*.ts" --include="*.tsx" | wc -l

# Count large files
echo "Files >1000 lines:"
find src -name "*.ts" -o -name "*.tsx" | xargs wc -l | awk '$1 > 1000' | wc -l
```

### Automated Quality Report

```bash
#!/bin/bash
# quality-report.sh

echo "==================================="
echo "Code Quality Report"
echo "Generated: $(date)"
echo "==================================="
echo ""

echo "📊 Codebase Size"
echo "Total TypeScript files: $(find src -name "*.ts" -o -name "*.tsx" | wc -l)"
echo "Total lines of code: $(wc -l src/**/*.{ts,tsx} 2>/dev/null | tail -1 | awk '{print $1}')"
echo ""

echo "🔍 Type Safety"
echo "TypeScript errors: $(npm run typecheck 2>&1 | grep -c "error TS" || echo "0")"
echo "Any types: $(grep -rn ": any" src/ --include="*.ts" --include="*.tsx" | wc -l)"
echo ""

echo "✨ Code Quality"
LINT_OUTPUT=$(npm run lint 2>&1)
echo "ESLint errors: $(echo "$LINT_OUTPUT" | grep -c "error" || echo "0")"
echo "ESLint warnings: $(echo "$LINT_OUTPUT" | grep -c "warning" || echo "0")"
echo ""

echo "📏 File Sizes"
echo "Files >1500 lines: $(find src -name "*.ts" -o -name "*.tsx" | xargs wc -l | awk '$1 > 1500' | wc -l)"
echo "Files >1000 lines: $(find src -name "*.ts" -o -name "*.tsx" | xargs wc -l | awk '$1 > 1000' | wc -l)"
echo ""

echo "==================================="
echo "Quality Score Estimation"
echo "==================================="

# Simple scoring
TS_ERRORS=$(npm run typecheck 2>&1 | grep -c "error TS" || echo "0")
LINT_ERRORS=$(echo "$LINT_OUTPUT" | grep -c "error" || echo "0")
ANY_COUNT=$(grep -rn ": any" src/ --include="*.ts" --include="*.tsx" | wc -l)

SCORE=100
[ $TS_ERRORS -gt 0 ] && SCORE=$((SCORE - 10))
[ $LINT_ERRORS -gt 0 ] && SCORE=$((SCORE - 10))
[ $ANY_COUNT -gt 3000 ] && SCORE=$((SCORE - 5))
[ $ANY_COUNT -gt 2000 ] && SCORE=$((SCORE - 3))

echo "Estimated Quality Score: $SCORE/100"
echo ""

if [ $SCORE -ge 95 ]; then
  echo "✅ Excellent - Production ready!"
elif [ $SCORE -ge 85 ]; then
  echo "✅ Good - Minor improvements needed"
elif [ $SCORE -ge 70 ]; then
  echo "⚠️ Fair - Improvements recommended"
else
  echo "❌ Poor - Significant work needed"
fi
```

---

## 🔧 Fix Common Issues

### Fix TypeScript Errors

```bash
# Run type check and save errors
npm run typecheck > typescript-errors.txt 2>&1

# Review errors
less typescript-errors.txt

# Common fixes:
# 1. Add missing type definitions: npm i --save-dev @types/package-name
# 2. Add @ts-expect-error comments for known issues
# 3. Fix type incompatibilities manually
```

### Fix ESLint Errors

```bash
# Auto-fix what's possible
npm run lint:fix

# Review remaining errors
npm run lint

# Common fixes:
# 1. Remove unused variables (or prefix with _)
# 2. Replace any with unknown or proper type
# 3. Fix @ts-ignore → @ts-expect-error
# 4. Reduce function complexity
```

### Reduce Any Types

```bash
# Find all any types
grep -rn ": any" src/ --include="*.ts" --include="*.tsx" > any-types.txt

# Prioritize by file (most any types first)
grep -rn ": any" src/ --include="*.ts" --include="*.tsx" | cut -d: -f1 | sort | uniq -c | sort -rn

# Fix strategy:
# 1. Replace with unknown for uncertain types
# 2. Use Record<string, unknown> for objects
# 3. Use proper interfaces where structure is known
# 4. Use generic types for reusable code
```

---

## 📚 References

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [ESLint Rules](https://eslint.org/docs/latest/rules/)
- [TypeScript ESLint](https://typescript-eslint.io/rules/)
- [React Hooks ESLint](https://www.npmjs.com/package/eslint-plugin-react-hooks)

---

## 🎯 Quality Targets

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Quality Score | 95/100 | 98/100 | 🟡 3 points to go |
| TypeScript Errors | 0 | 0 | ✅ Met |
| ESLint Errors | 0 | 0 | ✅ Met |
| ESLint Warnings | 16 | <10 | 🟡 6 to fix |
| Any Types | 2,495 | <2,000 | 🟡 495 to reduce |
| Files >1,500 lines | 17 | <10 | 🟡 7 to refactor |

---

**Last Updated:** 2025-10-24
**Quality Status:** ✅ Production Ready
**Next Review:** After addressing remaining 3 points
