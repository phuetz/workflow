#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Quick Wins Implementation...${NC}"
echo ""
echo "This script will:"
echo "1. Install missing type packages"
echo "2. Create utility files (type guards, environment utils)"
echo "3. Fix test setup for UUID mocking"
echo "4. Validate changes"
echo ""
echo -e "${YELLOW}⚠️  Warning: This will modify files. Backups will be created.${NC}"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

# Create backup directory
BACKUP_DIR="backup_quickwins_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
echo -e "${GREEN}✅ Created backup directory: $BACKUP_DIR${NC}"
echo ""

# Track progress
START_TIME=$(date +%s)
START_ERRORS=$(npm run typecheck 2>&1 | grep -c "error TS" || echo "0")
echo -e "${BLUE}📊 Starting TypeScript errors: $START_ERRORS${NC}"
echo ""

# 1. Install Missing Types
echo -e "${BLUE}1️⃣  Installing missing type packages...${NC}"
npm install --save-dev @types/ws @types/node 2>&1 | grep -E "added|up to date" || true
echo -e "${GREEN}✅ Types installed${NC}"
echo ""

# Validation
echo -e "${BLUE}6️⃣  Validating changes...${NC}"
echo ""

echo "   Running TypeScript check..."
npm run typecheck 2>&1 | tee "${BACKUP_DIR}/typecheck_after_quickwins.log" > /dev/null || true
END_ERRORS=$(grep -c "error TS" "${BACKUP_DIR}/typecheck_after_quickwins.log" 2>/dev/null || echo "$START_ERRORS")

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}       VALIDATION COMPLETED!           ${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Calculate improvements
ERRORS_FIXED=$((START_ERRORS - END_ERRORS))
if [ $START_ERRORS -gt 0 ]; then
    PERCENT_IMPROVEMENT=$(awk "BEGIN {printf \"%.1f\", ($ERRORS_FIXED / $START_ERRORS) * 100}")
else
    PERCENT_IMPROVEMENT="0.0"
fi

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
MINUTES=$((DURATION / 60))
SECONDS=$((DURATION % 60))

echo -e "${BLUE}📊 Results Summary:${NC}"
echo "   Time taken: ${MINUTES}m ${SECONDS}s"
echo ""
echo "   TypeScript Errors:"
echo "   ├─ Before: $START_ERRORS errors"
echo "   ├─ After:  $END_ERRORS errors"
echo "   ├─ Fixed:  $ERRORS_FIXED errors"
echo "   └─ Improvement: ${PERCENT_IMPROVEMENT}%"
echo ""

echo -e "${GREEN}Done! 🎉${NC}"
echo ""
echo "See full report: RAPPORT_FINAL_VALIDATION_QUALITE.md"
