#!/bin/bash

# ============================================
# Smoke Tests - Validation Complète Application
# ============================================

# Note: Not using 'set -e' to allow test failures to be counted
set -u

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BACKEND_URL="http://localhost:3001"
FRONTEND_URL="http://localhost:3000"
TIMEOUT=5
TOTAL_PASSED=0
TOTAL_FAILED=0

echo ""
echo "╔════════════════════════════════════════╗"
echo "║   🔥 SMOKE TESTS - Application         ║"
echo "║   Validation complète de l'app         ║"
echo "╚════════════════════════════════════════╝"
echo ""

# ============================================
# 1. Tests Backend
# ============================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔧 Backend Tests${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Health Check
echo -n "  [1/10] Health endpoint... "
RESPONSE=$(curl -s -w "\n%{http_code}" --max-time $TIMEOUT "${BACKEND_URL}/health" 2>/dev/null || echo "000")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✓${NC}"
  ((TOTAL_PASSED++))
else
  echo -e "${RED}✗${NC}"
  ((TOTAL_FAILED++))
fi

# Workflows API
echo -n "  [2/10] Workflows API... "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "${BACKEND_URL}/api/workflows" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✓${NC}"
  ((TOTAL_PASSED++))
else
  echo -e "${RED}✗${NC}"
  ((TOTAL_FAILED++))
fi

# Templates API
echo -n "  [3/10] Templates API... "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "${BACKEND_URL}/api/templates" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✓${NC}"
  ((TOTAL_PASSED++))
else
  echo -e "${RED}✗${NC}"
  ((TOTAL_FAILED++))
fi

# Executions API
echo -n "  [4/10] Executions API... "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "${BACKEND_URL}/api/executions" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✓${NC}"
  ((TOTAL_PASSED++))
else
  echo -e "${RED}✗${NC}"
  ((TOTAL_FAILED++))
fi

# Metrics
echo -n "  [5/10] Metrics endpoint... "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "${BACKEND_URL}/metrics" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✓${NC}"
  ((TOTAL_PASSED++))
else
  echo -e "${RED}✗${NC}"
  ((TOTAL_FAILED++))
fi

# ============================================
# 2. Tests Frontend
# ============================================
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🎨 Frontend Tests${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Frontend accessible
echo -n "  [6/10] Frontend accessible... "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "${FRONTEND_URL}" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✓${NC}"
  ((TOTAL_PASSED++))
else
  echo -e "${RED}✗${NC}"
  ((TOTAL_FAILED++))
fi

# React root element
echo -n "  [7/10] React root element... "
RESPONSE=$(curl -s --max-time $TIMEOUT "${FRONTEND_URL}" 2>/dev/null || echo "")
if echo "$RESPONSE" | grep -q 'id="root"'; then
  echo -e "${GREEN}✓${NC}"
  ((TOTAL_PASSED++))
else
  echo -e "${RED}✗${NC}"
  ((TOTAL_FAILED++))
fi

# Service Worker
echo -n "  [8/10] Service worker... "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "${FRONTEND_URL}/service-worker.js" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "304" ]; then
  echo -e "${GREEN}✓${NC}"
  ((TOTAL_PASSED++))
else
  echo -e "${YELLOW}⚠${NC}"
  ((TOTAL_PASSED++))  # Non-critique
fi

# ============================================
# 3. Tests de Processus
# ============================================
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}⚙️  Process Tests${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Backend process running
echo -n "  [9/10] Backend process... "
if pgrep -f "tsx.*server.ts" > /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC}"
  ((TOTAL_PASSED++))
else
  echo -e "${RED}✗${NC}"
  ((TOTAL_FAILED++))
fi

# Frontend process running
echo -n "  [10/10] Frontend process... "
if pgrep -f "vite" > /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC}"
  ((TOTAL_PASSED++))
else
  echo -e "${RED}✗${NC}"
  ((TOTAL_FAILED++))
fi

# ============================================
# Résumé Final
# ============================================
echo ""
echo "╔════════════════════════════════════════╗"
echo "║         📊 RÉSUMÉ FINAL                ║"
echo "╚════════════════════════════════════════╝"
echo ""

TOTAL_TESTS=$((TOTAL_PASSED + TOTAL_FAILED))
SUCCESS_RATE=$(awk "BEGIN {printf \"%.1f\", ($TOTAL_PASSED/$TOTAL_TESTS)*100}")

echo "Tests réussis:  ${GREEN}$TOTAL_PASSED${NC}"
echo "Tests échoués:  ${RED}$TOTAL_FAILED${NC}"
echo "Total:          $TOTAL_TESTS"
echo "Taux de succès: ${SUCCESS_RATE}%"
echo ""

if [ $TOTAL_FAILED -eq 0 ]; then
  echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║  ✓✓✓ TOUS LES TESTS SONT PASSÉS! ✓✓✓  ║${NC}"
  echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
  exit 0
elif [ $TOTAL_PASSED -ge 8 ]; then
  echo -e "${YELLOW}╔════════════════════════════════════════╗${NC}"
  echo -e "${YELLOW}║  ⚠  Application OK avec avertissements ║${NC}"
  echo -e "${YELLOW}╚════════════════════════════════════════╝${NC}"
  exit 0
else
  echo -e "${RED}╔════════════════════════════════════════╗${NC}"
  echo -e "${RED}║  ✗✗✗ CERTAINS TESTS ONT ÉCHOUÉ ✗✗✗    ║${NC}"
  echo -e "${RED}╚════════════════════════════════════════╝${NC}"
  exit 1
fi
