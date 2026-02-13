#!/bin/bash

# Script de Test du Build Production
# Date: 2025-11-01
# Mission: Validation Build Production

echo "═══════════════════════════════════════════════════════════════"
echo "          SCRIPT DE TEST BUILD PRODUCTION 2025                  "
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Couleurs pour l'output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Compteurs
TOTAL_TESTS=5
PASSED_TESTS=0

echo "🧪 TEST 1/5: TypeCheck Simple (tsconfig.json)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if npm run typecheck > /tmp/typecheck_simple.log 2>&1; then
    echo -e "${GREEN}✅ PASS${NC} - TypeCheck simple réussi"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}❌ FAIL${NC} - TypeCheck simple échoué"
    echo "Voir: /tmp/typecheck_simple.log"
fi
echo ""

echo "🧪 TEST 2/5: TypeCheck Build Backend (tsconfig.build.json)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if tsc -p tsconfig.build.json > /tmp/typecheck_build.log 2>&1; then
    echo -e "${GREEN}✅ PASS${NC} - TypeCheck build réussi (0 erreurs)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    ERRORS=0
else
    ERRORS=$(cat /tmp/typecheck_build.log | grep "^src/" | wc -l)
    echo -e "${RED}❌ FAIL${NC} - TypeCheck build échoué ($ERRORS erreurs)"
    echo "Top 5 erreurs:"
    cat /tmp/typecheck_build.log | grep "error TS" | sed 's/.*error \(TS[0-9]*\).*/\1/' | sort | uniq -c | sort -rn | head -5
    echo "Voir: /tmp/typecheck_build.log"
fi
echo ""

echo "🧪 TEST 3/5: Build Frontend Vite"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if npx vite build > /tmp/vite_build.log 2>&1; then
    echo -e "${GREEN}✅ PASS${NC} - Build Vite réussi"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    
    # Analyser la taille du bundle
    if [ -d "dist/assets" ]; then
        echo "📦 Taille du bundle:"
        ls -lh dist/assets/*.js 2>/dev/null | awk '{print "  - " $9 ": " $5}'
        TOTAL_SIZE=$(du -sh dist/assets 2>/dev/null | awk '{print $1}')
        echo "  Total: $TOTAL_SIZE"
    fi
else
    echo -e "${RED}❌ FAIL${NC} - Build Vite échoué"
    echo "Dernières lignes:"
    tail -20 /tmp/vite_build.log
    echo "Voir: /tmp/vite_build.log"
fi
echo ""

echo "🧪 TEST 4/5: Build Complet (npm run build)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if npm run build > /tmp/npm_build.log 2>&1; then
    echo -e "${GREEN}✅ PASS${NC} - Build complet réussi"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    
    # Vérifier que dist/ existe
    if [ -d "dist" ]; then
        echo "📂 Contenu de dist/:"
        ls -lh dist/ 2>/dev/null | tail -n +2
    fi
else
    echo -e "${RED}❌ FAIL${NC} - Build complet échoué"
    echo "Voir: /tmp/npm_build.log"
fi
echo ""

echo "🧪 TEST 5/5: Vérification Structure Bundle"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -d "dist" ] && [ -f "dist/index.html" ]; then
    echo -e "${GREEN}✅ PASS${NC} - Structure bundle correcte"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    
    echo "📋 Fichiers générés:"
    echo "  - index.html: $([ -f dist/index.html ] && echo '✓' || echo '✗')"
    echo "  - assets/: $([ -d dist/assets ] && echo '✓' || echo '✗')"
    echo "  - JS bundles: $(ls dist/assets/*.js 2>/dev/null | wc -l) fichiers"
    echo "  - CSS bundles: $(ls dist/assets/*.css 2>/dev/null | wc -l) fichiers"
else
    echo -e "${RED}❌ FAIL${NC} - Structure bundle incorrecte"
    echo "Le dossier dist/ est manquant ou incomplet"
fi
echo ""

# Résumé final
echo "═══════════════════════════════════════════════════════════════"
echo "                        RÉSUMÉ FINAL                            "
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Tests réussis: $PASSED_TESTS/$TOTAL_TESTS"
echo ""

if [ $PASSED_TESTS -eq $TOTAL_TESTS ]; then
    echo -e "${GREEN}🎉 SUCCÈS - Tous les tests passent${NC}"
    echo ""
    echo "Prochaines étapes:"
    echo "  1. Tester l'application: npm run preview"
    echo "  2. Ouvrir: http://localhost:4173"
    echo "  3. Vérifier les fonctionnalités clés"
    echo ""
    SCORE=100
elif [ $PASSED_TESTS -ge 3 ]; then
    echo -e "${YELLOW}⚠️  PARTIEL - Build fonctionnel avec warnings${NC}"
    echo ""
    echo "Problèmes détectés:"
    [ $PASSED_TESTS -lt 2 ] && echo "  - TypeCheck backend échoue"
    [ $PASSED_TESTS -lt 3 ] && echo "  - Build frontend échoue"
    [ $PASSED_TESTS -lt 4 ] && echo "  - Build complet échoue"
    echo ""
    SCORE=$(( PASSED_TESTS * 20 ))
else
    echo -e "${RED}❌ ÉCHEC - Build cassé${NC}"
    echo ""
    echo "Actions recommandées:"
    echo "  1. Lire: QUICK_START_BUILD_FIX.md"
    echo "  2. Choisir une option de correction"
    echo "  3. Relancer ce script après correction"
    echo ""
    SCORE=$(( PASSED_TESTS * 20 ))
fi

echo "Score: $SCORE/100"
echo ""

# Logs disponibles
echo "📋 Logs disponibles:"
echo "  - /tmp/typecheck_simple.log"
echo "  - /tmp/typecheck_build.log"
echo "  - /tmp/vite_build.log"
echo "  - /tmp/npm_build.log"
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "              Fin des Tests - $(date)"
echo "═══════════════════════════════════════════════════════════════"

exit $(( 5 - PASSED_TESTS ))
