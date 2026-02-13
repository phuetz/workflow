#!/bin/bash

# ============================================
# Quick Test - Validation Rapide
# Exécute les tests essentiels rapidement
# ============================================

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║                                              ║"
echo "║     ⚡ QUICK TEST - Validation Rapide       ║"
echo "║                                              ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

FAILED=0

# Backend Health
echo -e "${BLUE}[1/3]${NC} Test Backend... "
if bash "$SCRIPT_DIR/test-backend-health.sh" > /dev/null 2>&1; then
  echo -e "      ${GREEN}✓ Backend OK${NC}"
else
  echo -e "      ${RED}✗ Backend FAIL${NC}"
  FAILED=1
fi

# Frontend
echo -e "${BLUE}[2/3]${NC} Test Frontend... "
if bash "$SCRIPT_DIR/test-frontend.sh" > /dev/null 2>&1; then
  echo -e "      ${GREEN}✓ Frontend OK${NC}"
else
  echo -e "      ${RED}✗ Frontend FAIL${NC}"
  FAILED=1
fi

# TypeScript
echo -e "${BLUE}[3/3]${NC} TypeScript Check... "
cd "$(dirname "$SCRIPT_DIR")"
if npm run typecheck > /dev/null 2>&1; then
  echo -e "      ${GREEN}✓ TypeScript OK${NC}"
else
  echo -e "      ${RED}✗ TypeScript FAIL${NC}"
  FAILED=1
fi

echo ""
if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}╔══════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║  ✓✓✓ Application OK - Tests réussis!        ║${NC}"
  echo -e "${GREEN}╚══════════════════════════════════════════════╝${NC}"
  exit 0
else
  echo -e "${RED}╔══════════════════════════════════════════════╗${NC}"
  echo -e "${RED}║  ✗✗✗ Certains tests ont échoué              ║${NC}"
  echo -e "${RED}╚══════════════════════════════════════════════╝${NC}"
  echo ""
  echo "Exécutez les scripts individuellement pour plus de détails:"
  echo "  bash scripts/test-backend-health.sh"
  echo "  bash scripts/test-frontend.sh"
  echo "  npm run typecheck"
  exit 1
fi
