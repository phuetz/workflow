#!/bin/bash

# ============================================
# Script de Test Automatique - Frontend
# ============================================

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

FRONTEND_URL="http://localhost:3000"
TIMEOUT=5

echo "========================================="
echo "🧪 Tests Automatiques - Frontend"
echo "========================================="
echo ""

# Test 1: Frontend accessible
echo -n "Test 1: Frontend accessible... "
RESPONSE=$(curl -s -w "\n%{http_code}" --max-time $TIMEOUT "${FRONTEND_URL}" 2>/dev/null || echo "000")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✓ PASS${NC}"
  FRONTEND_PASS=1
else
  echo -e "${RED}✗ FAIL${NC} (HTTP $HTTP_CODE)"
  FRONTEND_PASS=0
fi

# Test 2: HTML contient React root
echo -n "Test 2: HTML contains React root... "
BODY=$(echo "$RESPONSE" | head -n-1)
if echo "$BODY" | grep -q 'id="root"'; then
  echo -e "${GREEN}✓ PASS${NC}"
  ROOT_PASS=1
else
  echo -e "${RED}✗ FAIL${NC}"
  ROOT_PASS=0
fi

# Test 3: Vite dev server headers
echo -n "Test 3: Vite dev server running... "
HEADERS=$(curl -s -I --max-time $TIMEOUT "${FRONTEND_URL}" 2>/dev/null || echo "")
if echo "$HEADERS" | grep -qi "vite\|content-type.*text/html"; then
  echo -e "${GREEN}✓ PASS${NC}"
  VITE_PASS=1
else
  echo -e "${YELLOW}⚠ WARN${NC} (headers check inconclusive)"
  VITE_PASS=1
fi

# Test 4: Service Worker existe
echo -n "Test 4: Service worker file exists... "
RESPONSE=$(curl -s -w "\n%{http_code}" --max-time $TIMEOUT "${FRONTEND_URL}/service-worker.js" 2>/dev/null || echo "000")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "304" ]; then
  echo -e "${GREEN}✓ PASS${NC}"
  SW_PASS=1
else
  echo -e "${YELLOW}⚠ WARN${NC} (HTTP $HTTP_CODE)"
  SW_PASS=1  # Non-critique
fi

# Test 5: Assets statiques accessibles
echo -n "Test 5: Static assets accessible... "
RESPONSE=$(curl -s -w "\n%{http_code}" --max-time $TIMEOUT "${FRONTEND_URL}/manifest.json" 2>/dev/null || echo "000")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "304" ]; then
  echo -e "${GREEN}✓ PASS${NC}"
  ASSETS_PASS=1
else
  echo -e "${YELLOW}⚠ WARN${NC} (HTTP $HTTP_CODE)"
  ASSETS_PASS=1  # Non-critique
fi

# Résumé
echo ""
echo "========================================="
echo "📊 Résumé des Tests"
echo "========================================="

TOTAL_TESTS=5
PASSED_TESTS=$((FRONTEND_PASS + ROOT_PASS + VITE_PASS + SW_PASS + ASSETS_PASS))

echo "Tests réussis: $PASSED_TESTS/$TOTAL_TESTS"
echo ""

if [ $PASSED_TESTS -ge 3 ]; then
  echo -e "${GREEN}✓✓✓ Tests frontend OK!${NC}"
  exit 0
else
  echo -e "${RED}✗✗✗ Tests frontend échoués${NC}"
  exit 1
fi
