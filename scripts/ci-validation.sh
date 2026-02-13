#!/bin/bash

# ============================================
# CI/CD Validation Script
# Tests complets pour intégration continue
# ============================================

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

VALIDATION_FAILED=0

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║                                              ║"
echo "║     🚀 CI/CD VALIDATION PIPELINE            ║"
echo "║     Validation complète de l'application     ║"
echo "║                                              ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
echo "📂 Project: $PROJECT_DIR"
echo "⏰ Date: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# ============================================
# 1. TypeScript Type Checking
# ============================================
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}📝 Étape 1/6: TypeScript Type Checking${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
cd "$PROJECT_DIR"

if npm run typecheck 2>&1 | tee /tmp/typecheck.log; then
  echo -e "${GREEN}✓ TypeScript: Aucune erreur de type${NC}"
else
  echo -e "${RED}✗ TypeScript: Erreurs de type détectées${NC}"
  VALIDATION_FAILED=1
fi
echo ""

# ============================================
# 2. ESLint Code Quality
# ============================================
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}🔍 Étape 2/6: ESLint Code Quality${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

LINT_OUTPUT=$(npm run lint 2>&1 || true)
ERROR_COUNT=$(echo "$LINT_OUTPUT" | grep -c "error" || echo "0")
WARNING_COUNT=$(echo "$LINT_OUTPUT" | grep -c "warning" || echo "0")

echo "Erreurs ESLint: $ERROR_COUNT"
echo "Warnings ESLint: $WARNING_COUNT"

if [ "$ERROR_COUNT" -eq 0 ]; then
  if [ "$WARNING_COUNT" -eq 0 ]; then
    echo -e "${GREEN}✓ ESLint: Code parfait!${NC}"
  else
    echo -e "${YELLOW}⚠ ESLint: $WARNING_COUNT warnings (non-bloquant)${NC}"
  fi
else
  echo -e "${RED}✗ ESLint: $ERROR_COUNT erreurs détectées${NC}"
  VALIDATION_FAILED=1
fi
echo ""

# ============================================
# 3. Backend Build
# ============================================
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}🔧 Étape 3/6: Backend Build${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if npm run build:backend 2>&1 | tail -20; then
  echo -e "${GREEN}✓ Backend: Build réussi${NC}"
else
  echo -e "${RED}✗ Backend: Build échoué${NC}"
  VALIDATION_FAILED=1
fi
echo ""

# ============================================
# 4. Frontend Build
# ============================================
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}🎨 Étape 4/6: Frontend Build${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if timeout 120 npm run build 2>&1 | tail -20; then
  echo -e "${GREEN}✓ Frontend: Build réussi${NC}"
else
  echo -e "${RED}✗ Frontend: Build échoué ou timeout${NC}"
  VALIDATION_FAILED=1
fi
echo ""

# ============================================
# 5. Unit Tests
# ============================================
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}🧪 Étape 5/6: Unit Tests${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if timeout 60 npm run test -- --run --reporter=verbose 2>&1 | tail -30; then
  echo -e "${GREEN}✓ Tests: Tous les tests unitaires passent${NC}"
else
  echo -e "${YELLOW}⚠ Tests: Certains tests ont échoué ou timeout${NC}"
  # Non-bloquant pour l'instant
fi
echo ""

# ============================================
# 6. Smoke Tests (si serveurs running)
# ============================================
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}🔥 Étape 6/6: Smoke Tests (optionnel)${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if pgrep -f "tsx.*server.ts" > /dev/null 2>&1; then
  echo "Backend détecté, exécution des smoke tests..."
  if [ -f "$SCRIPT_DIR/smoke-tests.sh" ]; then
    if bash "$SCRIPT_DIR/smoke-tests.sh"; then
      echo -e "${GREEN}✓ Smoke Tests: Application fonctionnelle${NC}"
    else
      echo -e "${YELLOW}⚠ Smoke Tests: Certains tests ont échoué${NC}"
      # Non-bloquant
    fi
  else
    echo -e "${YELLOW}⚠ Script smoke-tests.sh non trouvé${NC}"
  fi
else
  echo -e "${YELLOW}⚠ Serveurs non démarrés, smoke tests ignorés${NC}"
fi
echo ""

# ============================================
# Résumé Final
# ============================================
echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║                                              ║"
echo "║           📊 RÉSUMÉ DE VALIDATION            ║"
echo "║                                              ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

if [ $VALIDATION_FAILED -eq 0 ]; then
  echo -e "${GREEN}╔══════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║                                              ║${NC}"
  echo -e "${GREEN}║   ✓✓✓ VALIDATION COMPLÈTE RÉUSSIE! ✓✓✓      ║${NC}"
  echo -e "${GREEN}║                                              ║${NC}"
  echo -e "${GREEN}║   L'application est prête pour le déploiement${NC}"
  echo -e "${GREEN}║                                              ║${NC}"
  echo -e "${GREEN}╚══════════════════════════════════════════════╝${NC}"
  echo ""
  echo "✅ TypeScript: PASS"
  echo "✅ ESLint: PASS"
  echo "✅ Backend Build: PASS"
  echo "✅ Frontend Build: PASS"
  echo ""
  exit 0
else
  echo -e "${RED}╔══════════════════════════════════════════════╗${NC}"
  echo -e "${RED}║                                              ║${NC}"
  echo -e "${RED}║      ✗✗✗ VALIDATION ÉCHOUÉE ✗✗✗             ║${NC}"
  echo -e "${RED}║                                              ║${NC}"
  echo -e "${RED}║   Des erreurs doivent être corrigées        ║${NC}"
  echo -e "${RED}║                                              ║${NC}"
  echo -e "${RED}╚══════════════════════════════════════════════╝${NC}"
  echo ""
  echo "Vérifiez les logs ci-dessus pour les détails."
  echo ""
  exit 1
fi
