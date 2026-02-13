#!/bin/bash

# Error Monitoring System - Setup Verification Script
# This script checks that all components are properly installed

echo "=========================================="
echo "Error Monitoring System - Setup Verification"
echo "=========================================="
echo ""

SUCCESS=0
FAIL=0

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
        ((SUCCESS++))
    else
        echo -e "${RED}✗${NC} $1 (MISSING)"
        ((FAIL++))
    fi
}

check_dir() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✓${NC} $1/"
        ((SUCCESS++))
    else
        echo -e "${RED}✗${NC} $1/ (MISSING)"
        ((FAIL++))
    fi
}

echo "Checking Core System Files..."
echo "------------------------------"
check_file "src/monitoring/ErrorMonitoringSystem.ts"
check_file "src/monitoring/ErrorPatternAnalyzer.ts"
check_file "src/monitoring/AutoCorrection.ts"
check_file "src/monitoring/ErrorStorage.ts"
check_file "src/monitoring/ExternalIntegrations.ts"
check_file "src/monitoring/config.example.ts"
check_file "src/monitoring/index.ts"
check_file "src/monitoring/README.md"
echo ""

echo "Checking UI Components..."
echo "-------------------------"
check_file "src/components/ErrorMonitoringDashboard.tsx"
echo ""

echo "Checking Tests..."
echo "-----------------"
check_dir "src/__tests__/monitoring"
check_file "src/__tests__/monitoring/errorMonitoring.test.ts"
echo ""

echo "Checking Documentation..."
echo "-------------------------"
check_file "ERROR_MONITORING_GUIDE.md"
check_file "ERROR_MONITORING_QUICK_START.md"
check_file "ERROR_MONITORING_DELIVERY_REPORT.md"
check_file "ERROR_MONITORING_SUMMARY.md"
check_file ".env.monitoring.example"
echo ""

echo "Checking File Sizes..."
echo "----------------------"
for file in src/monitoring/*.ts src/components/ErrorMonitoringDashboard.tsx src/__tests__/monitoring/*.test.ts; do
    if [ -f "$file" ]; then
        size=$(wc -l < "$file" 2>/dev/null || echo "0")
        if [ "$size" -gt 0 ]; then
            echo -e "${GREEN}✓${NC} $file: $size lines"
            ((SUCCESS++))
        else
            echo -e "${RED}✗${NC} $file: Empty file"
            ((FAIL++))
        fi
    fi
done
echo ""

echo "Checking TypeScript Syntax..."
echo "-----------------------------"
if command -v npx &> /dev/null; then
    if npx tsc --noEmit src/monitoring/*.ts 2>&1 | grep -q "error TS"; then
        echo -e "${RED}✗${NC} TypeScript errors found"
        ((FAIL++))
    else
        echo -e "${GREEN}✓${NC} No TypeScript errors"
        ((SUCCESS++))
    fi
else
    echo -e "${YELLOW}⚠${NC} TypeScript compiler not available (skipping)"
fi
echo ""

echo "=========================================="
echo "Verification Results"
echo "=========================================="
echo -e "${GREEN}Successful checks: $SUCCESS${NC}"
echo -e "${RED}Failed checks: $FAIL${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed! System is ready.${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Copy .env.monitoring.example to .env"
    echo "2. Configure your API keys"
    echo "3. Initialize in your app: import { initializeMonitoring } from './monitoring'"
    echo "4. Run tests: npm run test src/__tests__/monitoring/"
    echo "5. See ERROR_MONITORING_QUICK_START.md for details"
    exit 0
else
    echo -e "${RED}✗ Some checks failed. Please review the errors above.${NC}"
    exit 1
fi
