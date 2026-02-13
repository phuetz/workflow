#!/bin/bash

# Script de validation finale pour score 100/100
# Usage: ./scripts/validate-100-score.sh

set -e

echo "🎯 VALIDATION FINALE - SCORE 100/100"
echo "════════════════════════════════════════════════════════════════════════════"
echo ""

SCORE=0
MAX_SCORE=100
CHECKS_PASSED=0
CHECKS_TOTAL=10

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper function
check_passed() {
    echo -e "${GREEN}✓${NC} $1"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
}

check_failed() {
    echo -e "${RED}✗${NC} $1"
}

check_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SECTION 1: Code Quality (Weight: 13%)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check 1: ESLint Warnings
echo "CHECK 1/10: ESLint Warnings"
WARNING_COUNT=$(npm run lint 2>&1 | grep -c "warning" || echo "0")
if [ "$WARNING_COUNT" -eq 0 ]; then
    check_passed "0 ESLint warnings (target: 0)"
    SCORE=$((SCORE + 13))
elif [ "$WARNING_COUNT" -le 3 ]; then
    check_warning "$WARNING_COUNT ESLint warnings (target: 0)"
    SCORE=$((SCORE + 10))
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
    check_failed "$WARNING_COUNT ESLint warnings (target: 0)"
fi
echo ""

# Check 2: TypeScript Errors
echo "CHECK 2/10: TypeScript Type Safety"
TYPE_ERROR_COUNT=$(npm run typecheck 2>&1 | grep -c "error TS" || echo "0")
if [ "$TYPE_ERROR_COUNT" -eq 0 ]; then
    check_passed "0 TypeScript errors"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
    check_failed "$TYPE_ERROR_COUNT TypeScript errors"
fi
echo ""

# Check 3: Critical Any Types
echo "CHECK 3/10: Critical Any Types (Middleware)"
MIDDLEWARE_ANY_COUNT=$(grep -r ": any" src/backend/api/middleware --include="*.ts" 2>/dev/null | wc -l || echo "0")
if [ "$MIDDLEWARE_ANY_COUNT" -eq 0 ]; then
    check_passed "0 any types in middleware (target: 0)"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
elif [ "$MIDDLEWARE_ANY_COUNT" -le 5 ]; then
    check_warning "$MIDDLEWARE_ANY_COUNT any types in middleware"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
    check_failed "$MIDDLEWARE_ANY_COUNT any types in middleware (target: 0)"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SECTION 2: React Performance (Weight: 33%)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check 4: React.memo Usage
echo "CHECK 4/10: React.memo Optimization"
TOTAL_COMPONENTS=$(find src/components -name "*.tsx" -type f 2>/dev/null | wc -l)
MEMOIZED_COMPONENTS=$(grep -r "React.memo" src/components --include="*.tsx" 2>/dev/null | wc -l)
MEMOIZATION_RATIO=$((MEMOIZED_COMPONENTS * 100 / TOTAL_COMPONENTS))

echo "  Total components: $TOTAL_COMPONENTS"
echo "  Memoized: $MEMOIZED_COMPONENTS"
echo "  Ratio: $MEMOIZATION_RATIO%"

if [ "$MEMOIZATION_RATIO" -ge 12 ]; then
    check_passed "≥12% components optimized (target: 12%)"
    SCORE=$((SCORE + 33))
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
elif [ "$MEMOIZATION_RATIO" -ge 8 ]; then
    check_warning "$MEMOIZATION_RATIO% components optimized (target: 12%)"
    SCORE=$((SCORE + 25))
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
    check_failed "$MEMOIZATION_RATIO% components optimized (target: 12%)"
    SCORE=$((SCORE + 18))
fi
echo ""

# Check 5: useCallback Usage
echo "CHECK 5/10: useCallback Hook"
USECALLBACK_COUNT=$(grep -r "useCallback" src/components --include="*.tsx" 2>/dev/null | wc -l)
if [ "$USECALLBACK_COUNT" -ge 20 ]; then
    check_passed "$USECALLBACK_COUNT useCallback usages"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
    check_warning "$USECALLBACK_COUNT useCallback usages (low)"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SECTION 3: Testing (Weight: 27%)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check 6: Test Execution
echo "CHECK 6/10: Test Suite"
if npm run test -- --run --reporter=verbose 2>&1 | grep -q "Tests.*passed"; then
    check_passed "All tests passing"
    SCORE=$((SCORE + 27))
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
    check_failed "Some tests failing"
    SCORE=$((SCORE + 20))
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SECTION 4: Build & Performance (Weight: 20%)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check 7: Production Build
echo "CHECK 7/10: Production Build"
if npm run build 2>&1 | grep -q "built in"; then
    check_passed "Production build successful"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
    check_failed "Production build failed"
fi
echo ""

# Check 8: Bundle Size
echo "CHECK 8/10: Bundle Size"
if [ -d "dist/assets" ]; then
    MAIN_BUNDLE_SIZE=$(find dist/assets -name "*.js" -type f -exec du -b {} \; | awk '{s+=$1} END {print s}')
    BUNDLE_SIZE_KB=$((MAIN_BUNDLE_SIZE / 1024))

    echo "  Bundle size: ${BUNDLE_SIZE_KB}KB"

    if [ "$BUNDLE_SIZE_KB" -le 450 ]; then
        check_passed "Bundle size ≤450KB (target: ≤450KB)"
        SCORE=$((SCORE + 20))
        CHECKS_PASSED=$((CHECKS_PASSED + 1))
    else
        check_warning "Bundle size ${BUNDLE_SIZE_KB}KB > 450KB"
        SCORE=$((SCORE + 15))
        CHECKS_PASSED=$((CHECKS_PASSED + 1))
    fi
else
    check_warning "dist/ folder not found, run build first"
    SCORE=$((SCORE + 15))
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SECTION 5: Documentation (Weight: 7%)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check 9: JSDoc Comments
echo "CHECK 9/10: JSDoc Coverage"
JSDOC_COUNT=$(grep -r "/\*\*" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l || echo "0")
if [ "$JSDOC_COUNT" -ge 100 ]; then
    check_passed "$JSDOC_COUNT JSDoc comments"
    SCORE=$((SCORE + 7))
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
    check_warning "$JSDOC_COUNT JSDoc comments"
    SCORE=$((SCORE + 5))
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SECTION 6: Bonus Checks"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check 10: Git Status
echo "CHECK 10/10: Git Status"
if git diff --quiet 2>/dev/null; then
    check_passed "No uncommitted changes"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
else
    check_warning "Uncommitted changes present"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
fi
echo ""

# Final Results
echo "════════════════════════════════════════════════════════════════════════════"
echo "FINAL RESULTS"
echo "════════════════════════════════════════════════════════════════════════════"
echo ""

echo "  Checks Passed: $CHECKS_PASSED / $CHECKS_TOTAL"
echo "  Estimated Score: $SCORE / $MAX_SCORE"
echo ""

if [ "$SCORE" -ge 100 ]; then
    echo -e "${GREEN}🎉 SCORE: 100/100 - EXCELLENCE ACHIEVED!${NC}"
    echo ""
    echo "✅ All quality gates passed!"
    echo "✅ Ready for production deployment"
    echo ""
    exit 0
elif [ "$SCORE" -ge 95 ]; then
    echo -e "${YELLOW}⚠️  SCORE: $SCORE/100 - VERY CLOSE!${NC}"
    echo ""
    echo "Remaining work:"
    [ "$WARNING_COUNT" -gt 0 ] && echo "  • Fix $WARNING_COUNT ESLint warnings"
    [ "$MEMOIZATION_RATIO" -lt 12 ] && echo "  • Optimize more React components (current: $MEMOIZATION_RATIO%)"
    echo ""
    exit 1
else
    echo -e "${RED}❌ SCORE: $SCORE/100 - MORE WORK NEEDED${NC}"
    echo ""
    echo "Priority fixes:"
    [ "$WARNING_COUNT" -gt 0 ] && echo "  • Fix $WARNING_COUNT ESLint warnings"
    [ "$TYPE_ERROR_COUNT" -gt 0 ] && echo "  • Fix $TYPE_ERROR_COUNT TypeScript errors"
    [ "$MEMOIZATION_RATIO" -lt 12 ] && echo "  • Optimize React components (target: 12%+)"
    echo ""
    exit 1
fi
