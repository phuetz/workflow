#!/bin/bash
# PLAN C - Verify Compilation Fixes

echo "🔍 VERIFYING COMPILATION FIXES"
echo "=============================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

FIXES_APPLIED=0
FIXES_PENDING=0

# Check Fix 1: existingLock in workflowStore.ts
echo "Checking Fix 1: existingLock..."
if grep -q "const existingLock = this.locks.get(key);" src/store/workflowStore.ts; then
  echo -e "${GREEN}✅ Fix 1: existingLock - APPLIED${NC}"
  ((FIXES_APPLIED++))
else
  echo -e "${RED}❌ Fix 1: existingLock - MISSING${NC}"
  ((FIXES_PENDING++))
fi

# Check Fix 2: waiter in workflowStore.ts
echo "Checking Fix 2: waiter..."
if grep -q "const waiter = this.globalLock.waiters.shift();" src/store/workflowStore.ts; then
  echo -e "${GREEN}✅ Fix 2: waiter - APPLIED${NC}"
  ((FIXES_APPLIED++))
else
  echo -e "${RED}❌ Fix 2: waiter - MISSING${NC}"
  ((FIXES_PENDING++))
fi

# Check Fix 3: attempt variable in workflowStore.ts
echo "Checking Fix 3: attempt variable..."
if grep -q "for (let attempt = 1; attempt <= this.maxRetries; attempt++)" src/store/workflowStore.ts; then
  echo -e "${GREEN}✅ Fix 3: attempt variable - APPLIED${NC}"
  ((FIXES_APPLIED++))
else
  echo -e "${RED}❌ Fix 3: attempt variable - MISSING${NC}"
  ((FIXES_PENDING++))
fi

# Check Fix 4: mergedOptions in ExecutionEngine.ts
echo "Checking Fix 4: mergedOptions..."
if grep -q "const mergedOptions = { ...this.defaultOptions, ...this.options };" src/components/ExecutionEngine.ts; then
  echo -e "${GREEN}✅ Fix 4: mergedOptions - APPLIED${NC}"
  ((FIXES_APPLIED++))
else
  echo -e "${RED}❌ Fix 4: mergedOptions - MISSING${NC}"
  ((FIXES_PENDING++))
fi

echo ""
echo "=============================="
echo "SUMMARY"
echo "=============================="
echo -e "Fixes Applied: ${GREEN}$FIXES_APPLIED${NC}"
echo -e "Fixes Pending: ${RED}$FIXES_PENDING${NC}"

if [ $FIXES_PENDING -eq 0 ]; then
  echo ""
  echo -e "${GREEN}✅ ALL COMPILATION FIXES APPLIED!${NC}"
  echo ""
  echo "Running TypeScript compilation check..."
  npm run typecheck 2>&1 | head -20
  
  if [ ${PIPESTATUS[0]} -eq 0 ]; then
    echo -e "${GREEN}✅ COMPILATION SUCCESSFUL!${NC}"
    exit 0
  else
    echo -e "${YELLOW}⚠️ Compilation still has errors. Check output above.${NC}"
    exit 1
  fi
else
  echo ""
  echo -e "${RED}❌ SOME FIXES ARE MISSING!${NC}"
  echo "Please apply all fixes before continuing."
  exit 1
fi