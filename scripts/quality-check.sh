#!/bin/bash

# CODE QUALITY CHECK SCRIPT
# Run: ./scripts/quality-check.sh

set -e

echo "================================================"
echo "  CODE QUALITY DASHBOARD"
echo "================================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
SCORE=100

# 1. Console Statements
echo "📊 Checking console statements..."
CONSOLE_COUNT=$(grep -r 'console\.' src/ \
  --include='*.ts' --include='*.tsx' \
  --exclude-dir=__tests__ \
  --exclude='*.test.ts' --exclude='*.test.tsx' \
  2>/dev/null | grep -v 'logger\.' | wc -l || echo 0)

if [ "$CONSOLE_COUNT" -gt 0 ]; then
  echo -e "  ${RED}✗${NC} Console statements: $CONSOLE_COUNT (target: 0)"
  PENALTY=$(echo "scale=1; $CONSOLE_COUNT / 145" | bc)
  SCORE=$(echo "scale=1; $SCORE - $PENALTY" | bc)
  if [ "$CONSOLE_COUNT" -gt 100 ]; then
    echo "  ${YELLOW}Warning: High count of console statements${NC}"
  fi
else
  echo -e "  ${GREEN}✓${NC} Console statements: 0"
fi

# 2. Any Types
echo ""
echo "📊 Checking TypeScript any types..."
ANY_COUNT=$(grep -r ': any\|as any' src/ \
  --include='*.ts' --include='*.tsx' \
  2>/dev/null | wc -l || echo 0)

if [ "$ANY_COUNT" -gt 500 ]; then
  echo -e "  ${RED}✗${NC} Any types: $ANY_COUNT (target: <500)"
  PENALTY=$(echo "scale=1; ($ANY_COUNT - 500) / 666" | bc)
  SCORE=$(echo "scale=1; $SCORE - $PENALTY" | bc)
else
  echo -e "  ${GREEN}✓${NC} Any types: $ANY_COUNT"
fi

# 3. Large Files
echo ""
echo "📊 Checking large files (>1500 lines)..."
LARGE_FILES=$(find src -name '*.ts' -o -name '*.tsx' 2>/dev/null | \
  xargs wc -l 2>/dev/null | \
  awk '$1 > 1500 && $2 != "total" {print}' | \
  wc -l || echo 0)

if [ "$LARGE_FILES" -gt 0 ]; then
  echo -e "  ${RED}✗${NC} Large files: $LARGE_FILES (target: 0)"
  PENALTY=$(echo "scale=1; $LARGE_FILES / 8.5" | bc)
  SCORE=$(echo "scale=1; $SCORE - $PENALTY" | bc)

  echo "  ${YELLOW}Top offenders:${NC}"
  find src -name '*.ts' -o -name '*.tsx' 2>/dev/null | \
    xargs wc -l 2>/dev/null | \
    awk '$1 > 1500 && $2 != "total" {print "    " $1 " lines - " $2}' | \
    sort -rn | head -5
else
  echo -e "  ${GREEN}✓${NC} Large files: 0"
fi

# 4. Backup Files
echo ""
echo "📊 Checking backup/broken files..."
BACKUP_FILES=$(find src -name '*.BACKUP.*' -o -name '*.OLD.*' -o -name '*.NEW.*' \
  -o -name '*.COMPLETE.*' -o -name '*.IMPROVED.*' -o -name '*.broken.*' \
  2>/dev/null | wc -l || echo 0)

if [ "$BACKUP_FILES" -gt 0 ]; then
  echo -e "  ${RED}✗${NC} Backup files: $BACKUP_FILES (target: 0)"
  PENALTY=$(echo "scale=1; $BACKUP_FILES / 8" | bc)
  SCORE=$(echo "scale=1; $SCORE - $PENALTY" | bc)

  echo "  ${YELLOW}Files to delete:${NC}"
  find src -name '*.BACKUP.*' -o -name '*.OLD.*' -o -name '*.NEW.*' \
    -o -name '*.COMPLETE.*' -o -name '*.IMPROVED.*' -o -name '*.broken.*' \
    2>/dev/null | head -5 | sed 's/^/    /'
else
  echo -e "  ${GREEN}✓${NC} Backup files: 0"
fi

# 5. TODO/FIXME Comments
echo ""
echo "📊 Checking TODO/FIXME comments..."
TODO_COUNT=$(grep -r 'TODO\|FIXME\|HACK\|PLACEHOLDER' src/ \
  --include='*.ts' --include='*.tsx' \
  --exclude-dir=__tests__ \
  2>/dev/null | wc -l || echo 0)

if [ "$TODO_COUNT" -gt 0 ]; then
  echo -e "  ${YELLOW}⚠${NC} TODO/FIXME comments: $TODO_COUNT (target: 0)"
  PENALTY=$(echo "scale=1; $TODO_COUNT / 130" | bc)
  SCORE=$(echo "scale=1; $SCORE - $PENALTY" | bc)
else
  echo -e "  ${GREEN}✓${NC} TODO/FIXME comments: 0"
fi

# 6. ESLint Check
echo ""
echo "📊 Running ESLint..."
if npm run lint > /dev/null 2>&1; then
  echo -e "  ${GREEN}✓${NC} ESLint: PASS"
else
  echo -e "  ${RED}✗${NC} ESLint: FAIL"
  SCORE=$(echo "scale=1; $SCORE - 2" | bc)
fi

# 7. TypeScript Check
echo ""
echo "📊 Running TypeScript check..."
if npm run typecheck > /dev/null 2>&1; then
  echo -e "  ${GREEN}✓${NC} TypeScript: PASS"
else
  echo -e "  ${RED}✗${NC} TypeScript: FAIL"
  SCORE=$(echo "scale=1; $SCORE - 3" | bc)
fi

# Final Score
echo ""
echo "================================================"
SCORE_INT=$(printf "%.0f" "$SCORE")

if [ "$SCORE_INT" -ge 95 ]; then
  echo -e "  ${GREEN}✓ QUALITY SCORE: $SCORE_INT/100 - EXCELLENT${NC}"
  EXIT_CODE=0
elif [ "$SCORE_INT" -ge 90 ]; then
  echo -e "  ${GREEN}✓ QUALITY SCORE: $SCORE_INT/100 - GOOD${NC}"
  EXIT_CODE=0
elif [ "$SCORE_INT" -ge 80 ]; then
  echo -e "  ${YELLOW}⚠ QUALITY SCORE: $SCORE_INT/100 - NEEDS IMPROVEMENT${NC}"
  EXIT_CODE=1
else
  echo -e "  ${RED}✗ QUALITY SCORE: $SCORE_INT/100 - POOR${NC}"
  EXIT_CODE=1
fi

echo "================================================"
echo ""

# Recommendations
if [ "$CONSOLE_COUNT" -gt 50 ]; then
  echo "💡 Quick Win: Remove console.log statements"
  echo "   Run: ./scripts/find-console-statements.sh"
fi

if [ "$ANY_COUNT" -gt 1000 ]; then
  echo "💡 Quick Win: Replace 'error: any' with 'error: unknown'"
  echo "   Run: ./scripts/replace-error-any.sh"
fi

if [ "$BACKUP_FILES" -gt 0 ]; then
  echo "💡 Quick Win: Delete backup files"
  echo "   Run: ./scripts/delete-backup-files.sh"
fi

echo ""
echo "📖 For detailed report, see: AUDIT_CODE_QUALITY_100.md"
echo ""

exit $EXIT_CODE
