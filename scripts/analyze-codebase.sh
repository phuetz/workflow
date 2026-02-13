#!/bin/bash
# analyze-codebase.sh
# Script d'analyse complète du codebase
# Usage: ./scripts/analyze-codebase.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Output directory
OUTPUT_DIR="./analysis-reports"
mkdir -p "$OUTPUT_DIR"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}    Codebase Analysis Tool${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function: Progress bar
progress_bar() {
    local current=$1
    local total=$2
    local width=50
    local percent=$((current * 100 / total))
    local filled=$((width * current / total))

    printf "\r["
    printf "%${filled}s" | tr ' ' '='
    printf "%$((width - filled))s" | tr ' ' ' '
    printf "] %3d%%" "$percent"
}

# 1. TypeScript Analysis
echo -e "${YELLOW}[1/8] Running TypeScript type checking...${NC}"
npm run typecheck > "$OUTPUT_DIR/typescript-$TIMESTAMP.txt" 2>&1
TS_ERRORS=$(grep -c "error TS" "$OUTPUT_DIR/typescript-$TIMESTAMP.txt" || echo "0")
if [ "$TS_ERRORS" -eq 0 ]; then
    echo -e "${GREEN}✓ TypeScript: 0 errors${NC}"
else
    echo -e "${RED}✗ TypeScript: $TS_ERRORS errors${NC}"
fi

# 2. ESLint Analysis
echo -e "${YELLOW}[2/8] Running ESLint...${NC}"
npm run lint > "$OUTPUT_DIR/eslint-$TIMESTAMP.txt" 2>&1 || true
ESLINT_WARNINGS=$(grep -c "warning" "$OUTPUT_DIR/eslint-$TIMESTAMP.txt" || echo "0")
if [ "$ESLINT_WARNINGS" -eq 0 ]; then
    echo -e "${GREEN}✓ ESLint: 0 warnings${NC}"
else
    echo -e "${YELLOW}⚠ ESLint: $ESLINT_WARNINGS warnings${NC}"
fi

# 3. Test Execution
echo -e "${YELLOW}[3/8] Running tests...${NC}"
npm run test > "$OUTPUT_DIR/tests-$TIMESTAMP.txt" 2>&1 || true
TEST_PASSED=$(grep -oP "\d+(?= passed)" "$OUTPUT_DIR/tests-$TIMESTAMP.txt" | tail -1 || echo "0")
TEST_FAILED=$(grep -oP "\d+(?= failed)" "$OUTPUT_DIR/tests-$TIMESTAMP.txt" | tail -1 || echo "0")
echo -e "${GREEN}✓ Tests passed: $TEST_PASSED${NC}"
if [ "$TEST_FAILED" -gt 0 ]; then
    echo -e "${RED}✗ Tests failed: $TEST_FAILED${NC}"
fi

# 4. Circular Dependencies
echo -e "${YELLOW}[4/8] Analyzing circular dependencies...${NC}"
npx madge --circular --extensions ts,tsx src/ > "$OUTPUT_DIR/circular-deps-$TIMESTAMP.txt" 2>&1
CIRCULAR_DEPS=$(grep -c "^[0-9]" "$OUTPUT_DIR/circular-deps-$TIMESTAMP.txt" || echo "0")
if [ "$CIRCULAR_DEPS" -eq 0 ]; then
    echo -e "${GREEN}✓ No circular dependencies${NC}"
else
    echo -e "${RED}✗ Found $CIRCULAR_DEPS circular dependencies${NC}"
fi

# 5. Any Type Usage
echo -e "${YELLOW}[5/8] Analyzing 'any' type usage...${NC}"
grep -r "\bany\b" src/ --include="*.ts" --include="*.tsx" | \
    cut -d: -f1 | sort | uniq -c | sort -rn > "$OUTPUT_DIR/any-usage-$TIMESTAMP.txt"
ANY_COUNT=$(grep -r "\bany\b" src/ --include="*.ts" --include="*.tsx" | wc -l)
echo -e "${YELLOW}⚠ Found $ANY_COUNT 'any' usages${NC}"

# 6. Console Statements
echo -e "${YELLOW}[6/8] Finding console statements...${NC}"
grep -rn "console\." src/ --include="*.ts" --include="*.tsx" | \
    grep -v "logger" | grep -v "//" > "$OUTPUT_DIR/console-$TIMESTAMP.txt" || true
CONSOLE_COUNT=$(wc -l < "$OUTPUT_DIR/console-$TIMESTAMP.txt" || echo "0")
if [ "$CONSOLE_COUNT" -lt 20 ]; then
    echo -e "${GREEN}✓ Console statements: $CONSOLE_COUNT${NC}"
else
    echo -e "${YELLOW}⚠ Console statements: $CONSOLE_COUNT${NC}"
fi

# 7. TODO/FIXME
echo -e "${YELLOW}[7/8] Finding TODO/FIXME comments...${NC}"
grep -rn -E "TODO|FIXME|HACK|XXX" src/ --include="*.ts" --include="*.tsx" \
    > "$OUTPUT_DIR/todos-$TIMESTAMP.txt" || true
TODO_COUNT=$(wc -l < "$OUTPUT_DIR/todos-$TIMESTAMP.txt" || echo "0")
echo -e "${BLUE}ℹ Found $TODO_COUNT TODO/FIXME comments${NC}"

# 8. File Size Analysis
echo -e "${YELLOW}[8/8] Analyzing file sizes...${NC}"
find src -name "*.ts" -o -name "*.tsx" | xargs wc -l | sort -rn | head -30 \
    > "$OUTPUT_DIR/large-files-$TIMESTAMP.txt"
LARGE_FILES=$(awk '$1 > 2000 {print $2}' "$OUTPUT_DIR/large-files-$TIMESTAMP.txt" | wc -l)
if [ "$LARGE_FILES" -eq 0 ]; then
    echo -e "${GREEN}✓ No files >2000 lines${NC}"
else
    echo -e "${YELLOW}⚠ Found $LARGE_FILES files >2000 lines${NC}"
fi

# Generate Summary Report
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}    Analysis Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

TOTAL_SCORE=100

# Calculate score
if [ "$TS_ERRORS" -gt 0 ]; then TOTAL_SCORE=$((TOTAL_SCORE - 20)); fi
if [ "$ESLINT_WARNINGS" -gt 10 ]; then TOTAL_SCORE=$((TOTAL_SCORE - 10)); fi
if [ "$TEST_FAILED" -gt 0 ]; then TOTAL_SCORE=$((TOTAL_SCORE - 15)); fi
if [ "$CIRCULAR_DEPS" -gt 0 ]; then TOTAL_SCORE=$((TOTAL_SCORE - 10)); fi
if [ "$ANY_COUNT" -gt 1000 ]; then TOTAL_SCORE=$((TOTAL_SCORE - 15)); fi
if [ "$CONSOLE_COUNT" -gt 50 ]; then TOTAL_SCORE=$((TOTAL_SCORE - 5)); fi
if [ "$LARGE_FILES" -gt 5 ]; then TOTAL_SCORE=$((TOTAL_SCORE - 5)); fi

cat > "$OUTPUT_DIR/summary-$TIMESTAMP.txt" << EOF
Codebase Analysis Summary
Generated: $(date)
======================================

TypeScript Errors:        $TS_ERRORS
ESLint Warnings:          $ESLINT_WARNINGS
Tests Passed:             $TEST_PASSED
Tests Failed:             $TEST_FAILED
Circular Dependencies:    $CIRCULAR_DEPS
'any' Type Usage:         $ANY_COUNT
Console Statements:       $CONSOLE_COUNT
TODO/FIXME Comments:      $TODO_COUNT
Large Files (>2000):      $LARGE_FILES

TOTAL SCORE: $TOTAL_SCORE/100

Status:
$([ $TOTAL_SCORE -ge 90 ] && echo "✅ EXCELLENT" || true)
$([ $TOTAL_SCORE -ge 80 ] && [ $TOTAL_SCORE -lt 90 ] && echo "🟢 GOOD" || true)
$([ $TOTAL_SCORE -ge 70 ] && [ $TOTAL_SCORE -lt 80 ] && echo "🟡 NEEDS IMPROVEMENT" || true)
$([ $TOTAL_SCORE -lt 70 ] && echo "🔴 CRITICAL" || true)

Detailed reports saved in: $OUTPUT_DIR
EOF

cat "$OUTPUT_DIR/summary-$TIMESTAMP.txt"

echo ""
echo -e "${GREEN}✓ Analysis complete!${NC}"
echo -e "${BLUE}Reports saved in: $OUTPUT_DIR${NC}"
echo ""

# Priority recommendations
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}    Priority Recommendations${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

if [ "$TEST_FAILED" -gt 0 ]; then
    echo -e "${RED}🔴 P0: Fix $TEST_FAILED failing tests${NC}"
fi

if [ "$CIRCULAR_DEPS" -gt 0 ]; then
    echo -e "${RED}🔴 P1: Resolve $CIRCULAR_DEPS circular dependencies${NC}"
fi

if [ "$ANY_COUNT" -gt 1000 ]; then
    echo -e "${YELLOW}🟡 P2: Reduce 'any' usage from $ANY_COUNT to <500${NC}"
fi

if [ "$CONSOLE_COUNT" -gt 50 ]; then
    echo -e "${GREEN}🟢 P3: Replace $CONSOLE_COUNT console statements with logger${NC}"
fi

if [ "$LARGE_FILES" -gt 5 ]; then
    echo -e "${GREEN}🟢 P3: Refactor $LARGE_FILES large files${NC}"
fi

echo ""
echo -e "${BLUE}For detailed technical information, see:${NC}"
echo -e "${BLUE}  - RAPPORT_ANALYSE_COMPLETE.md${NC}"
echo -e "${BLUE}  - PROBLEMES_DETAILLES_TECHNIQUES.md${NC}"
echo ""
