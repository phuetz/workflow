#!/bin/bash
# Architecture Audit Script
# Génère des métriques pour suivre les progrès vers 100/100

set -e

echo "=========================================="
echo "ARCHITECTURE AUDIT - Workflow Platform"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Taille du Store Monolithique
echo "📊 1. STORE METRICS"
echo "-------------------------------------------"
store_lines=$(wc -l < src/store/workflowStore.ts)
echo "workflowStore.ts: $store_lines lines"

if [ $store_lines -gt 1000 ]; then
    echo -e "${RED}❌ CRITIQUE: Store trop volumineux (>1000 lignes)${NC}"
    score_store=0
elif [ $store_lines -gt 500 ]; then
    echo -e "${YELLOW}⚠️  WARNING: Store volumineux (>500 lignes)${NC}"
    score_store=1
else
    echo -e "${GREEN}✅ OK: Store de taille acceptable${NC}"
    score_store=2
fi
echo ""

# 2. Imports Circulaires
echo "🔄 2. CIRCULAR DEPENDENCIES"
echo "-------------------------------------------"
if command -v madge &> /dev/null; then
    circular_count=$(npx madge --circular --extensions ts,tsx src/ 2>/dev/null | grep -c "^[0-9]" || echo "0")
    echo "Circular dependencies found: $circular_count"

    if [ "$circular_count" -gt 20 ]; then
        echo -e "${RED}❌ CRITIQUE: Trop de cycles (>20)${NC}"
        score_circular=0
    elif [ "$circular_count" -gt 10 ]; then
        echo -e "${YELLOW}⚠️  WARNING: Nombreux cycles (>10)${NC}"
        score_circular=1
    elif [ "$circular_count" -gt 0 ]; then
        echo -e "${YELLOW}⚠️  IMPROVEMENT NEEDED: Quelques cycles${NC}"
        score_circular=1
    else
        echo -e "${GREEN}✅ PERFECT: Aucun cycle détecté${NC}"
        score_circular=2
    fi
else
    echo "⚠️  madge not installed, skipping circular dependency check"
    echo "Install with: npm install -g madge"
    score_circular=0
fi
echo ""

# 3. Fichiers Legacy
echo "🗑️  3. LEGACY FILES"
echo "-------------------------------------------"
legacy_files=$(find src -name "*.BACKUP.*" -o -name "*.OLD.*" -o -name "*.broken.*" | wc -l)
echo "Legacy files found: $legacy_files"

if [ $legacy_files -gt 5 ]; then
    echo -e "${RED}❌ CRITIQUE: Trop de fichiers legacy (>5)${NC}"
    score_legacy=0
elif [ $legacy_files -gt 0 ]; then
    echo -e "${YELLOW}⚠️  WARNING: Fichiers legacy à nettoyer${NC}"
    score_legacy=1
else
    echo -e "${GREEN}✅ PERFECT: Aucun fichier legacy${NC}"
    score_legacy=2
fi
echo ""

# 4. Taille des Fichiers
echo "📏 4. FILE SIZE ANALYSIS"
echo "-------------------------------------------"
large_files=$(find src -name "*.ts" -o -name "*.tsx" | xargs wc -l | awk '$1 > 500 {print $2}' | wc -l)
echo "Files > 500 lines: $large_files"

if [ $large_files -gt 10 ]; then
    echo -e "${RED}❌ CRITIQUE: Trop de gros fichiers (>10)${NC}"
    score_size=0
elif [ $large_files -gt 5 ]; then
    echo -e "${YELLOW}⚠️  WARNING: Plusieurs gros fichiers (>5)${NC}"
    score_size=1
else
    echo -e "${GREEN}✅ GOOD: Fichiers de taille raisonnable${NC}"
    score_size=2
fi
echo ""

# 5. TypeScript Strictness
echo "🔒 5. TYPESCRIPT STRICTNESS"
echo "-------------------------------------------"
if grep -q '"strict": true' tsconfig.json; then
    echo -e "${GREEN}✅ Strict mode enabled${NC}"
    score_ts=2
else
    echo -e "${YELLOW}⚠️  Strict mode not enabled${NC}"
    score_ts=1
fi
echo ""

# 6. Test Coverage (si disponible)
echo "🧪 6. TEST COVERAGE"
echo "-------------------------------------------"
if [ -f coverage/coverage-summary.json ]; then
    coverage=$(cat coverage/coverage-summary.json | grep -o '"lines":{"total":[0-9]*,"covered":[0-9]*' | head -1 | sed 's/.*"covered":\([0-9]*\)/\1/')
    total=$(cat coverage/coverage-summary.json | grep -o '"lines":{"total":[0-9]*' | head -1 | sed 's/.*"total":\([0-9]*\)/\1/')

    if [ -n "$coverage" ] && [ -n "$total" ] && [ $total -gt 0 ]; then
        percent=$((coverage * 100 / total))
        echo "Line coverage: $percent%"

        if [ $percent -ge 80 ]; then
            echo -e "${GREEN}✅ EXCELLENT: Coverage >80%${NC}"
            score_coverage=2
        elif [ $percent -ge 60 ]; then
            echo -e "${YELLOW}⚠️  GOOD: Coverage >60%${NC}"
            score_coverage=1
        else
            echo -e "${RED}❌ LOW: Coverage <60%${NC}"
            score_coverage=0
        fi
    else
        echo "Coverage data not readable"
        score_coverage=0
    fi
else
    echo "⚠️  Coverage report not found"
    echo "Run: npm run test:coverage"
    score_coverage=0
fi
echo ""

# 7. Duplication
echo "📋 7. CODE DUPLICATION"
echo "-------------------------------------------"
if command -v jscpd &> /dev/null; then
    duplication=$(npx jscpd src --min-lines 10 --min-tokens 50 --format "json" 2>/dev/null | grep -o '"percentage":[0-9.]*' | head -1 | sed 's/.*:\([0-9.]*\)/\1/' || echo "0")
    echo "Code duplication: ${duplication}%"

    if (( $(echo "$duplication > 5" | bc -l) )); then
        echo -e "${RED}❌ HIGH: Duplication >5%${NC}"
        score_dup=0
    elif (( $(echo "$duplication > 2" | bc -l) )); then
        echo -e "${YELLOW}⚠️  MEDIUM: Duplication >2%${NC}"
        score_dup=1
    else
        echo -e "${GREEN}✅ LOW: Duplication <2%${NC}"
        score_dup=2
    fi
else
    echo "⚠️  jscpd not installed, skipping duplication check"
    echo "Install with: npm install -g jscpd"
    score_dup=0
fi
echo ""

# 8. Dependency Analysis
echo "📦 8. DEPENDENCIES"
echo "-------------------------------------------"
if [ -f package.json ]; then
    deps=$(cat package.json | grep -c '".*":' || echo "0")
    echo "Total dependencies: $deps"

    # Check for outdated packages
    if command -v npm &> /dev/null; then
        outdated=$(npm outdated --json 2>/dev/null | grep -c '"current"' || echo "0")
        echo "Outdated packages: $outdated"

        if [ $outdated -gt 20 ]; then
            echo -e "${RED}❌ CRITICAL: Nombreux packages outdated (>20)${NC}"
            score_deps=0
        elif [ $outdated -gt 10 ]; then
            echo -e "${YELLOW}⚠️  WARNING: Quelques packages outdated (>10)${NC}"
            score_deps=1
        else
            echo -e "${GREEN}✅ GOOD: Dependencies à jour${NC}"
            score_deps=2
        fi
    else
        score_deps=1
    fi
else
    score_deps=0
fi
echo ""

# 9. ESLint Errors
echo "🔍 9. LINTING"
echo "-------------------------------------------"
if [ -f "eslint.config.js" ] || [ -f ".eslintrc.json" ]; then
    # Run ESLint and count errors
    eslint_output=$(npx eslint src --format json 2>/dev/null || echo "[]")
    error_count=$(echo "$eslint_output" | grep -o '"errorCount":[0-9]*' | sed 's/.*:\([0-9]*\)/\1/' | awk '{sum+=$1} END {print sum}' || echo "0")
    warning_count=$(echo "$eslint_output" | grep -o '"warningCount":[0-9]*' | sed 's/.*:\([0-9]*\)/\1/' | awk '{sum+=$1} END {print sum}' || echo "0")

    echo "ESLint errors: $error_count"
    echo "ESLint warnings: $warning_count"

    if [ "$error_count" -gt 50 ]; then
        echo -e "${RED}❌ CRITICAL: Trop d'erreurs ESLint (>50)${NC}"
        score_lint=0
    elif [ "$error_count" -gt 0 ]; then
        echo -e "${YELLOW}⚠️  WARNING: Erreurs ESLint présentes${NC}"
        score_lint=1
    else
        echo -e "${GREEN}✅ PERFECT: Aucune erreur ESLint${NC}"
        score_lint=2
    fi
else
    echo "⚠️  ESLint config not found"
    score_lint=0
fi
echo ""

# 10. Bundle Size Analysis
echo "📦 10. BUNDLE SIZE"
echo "-------------------------------------------"
if [ -d "dist" ]; then
    bundle_size=$(du -sh dist 2>/dev/null | cut -f1 || echo "N/A")
    echo "Build size: $bundle_size"

    # Extract numeric value (assumes format like "2.3M" or "500K")
    size_num=$(echo "$bundle_size" | sed 's/[^0-9.]//g')
    size_unit=$(echo "$bundle_size" | sed 's/[0-9.]//g')

    if [ "$size_unit" = "M" ]; then
        if (( $(echo "$size_num > 5" | bc -l 2>/dev/null || echo "0") )); then
            echo -e "${YELLOW}⚠️  LARGE: Bundle >5MB${NC}"
            score_bundle=1
        else
            echo -e "${GREEN}✅ GOOD: Bundle <5MB${NC}"
            score_bundle=2
        fi
    else
        echo -e "${GREEN}✅ EXCELLENT: Bundle <1MB${NC}"
        score_bundle=2
    fi
else
    echo "⚠️  Build not found. Run: npm run build"
    score_bundle=0
fi
echo ""

# Calculate Total Score
echo "=========================================="
echo "📊 FINAL SCORE"
echo "=========================================="
total=$((score_store + score_circular + score_legacy + score_size + score_ts + score_coverage + score_dup + score_deps + score_lint + score_bundle))
max_score=20
percentage=$((total * 100 / max_score))

echo ""
echo "Score Details:"
echo "  Store Size:          $score_store/2"
echo "  Circular Deps:       $score_circular/2"
echo "  Legacy Files:        $score_legacy/2"
echo "  File Sizes:          $score_size/2"
echo "  TypeScript:          $score_ts/2"
echo "  Test Coverage:       $score_coverage/2"
echo "  Code Duplication:    $score_dup/2"
echo "  Dependencies:        $score_deps/2"
echo "  Linting:             $score_lint/2"
echo "  Bundle Size:         $score_bundle/2"
echo ""
echo "-------------------------------------------"
echo "Total Score: $total/$max_score ($percentage%)"
echo ""

if [ $percentage -ge 95 ]; then
    echo -e "${GREEN}🎉 EXCELLENT - Architecture de niveau production!${NC}"
elif [ $percentage -ge 80 ]; then
    echo -e "${GREEN}✅ GOOD - Bonne architecture, quelques améliorations possibles${NC}"
elif [ $percentage -ge 60 ]; then
    echo -e "${YELLOW}⚠️  FAIR - Architecture acceptable, refactoring recommandé${NC}"
else
    echo -e "${RED}❌ NEEDS IMPROVEMENT - Refactoring urgent nécessaire${NC}"
fi
echo ""

# Generate Report File
report_file="architecture-audit-report-$(date +%Y%m%d-%H%M%S).json"
cat > "$report_file" <<EOF
{
  "timestamp": "$(date -Iseconds)",
  "scores": {
    "store_size": $score_store,
    "circular_dependencies": $score_circular,
    "legacy_files": $score_legacy,
    "file_sizes": $score_size,
    "typescript": $score_ts,
    "test_coverage": $score_coverage,
    "code_duplication": $score_dup,
    "dependencies": $score_deps,
    "linting": $score_lint,
    "bundle_size": $score_bundle
  },
  "total": $total,
  "max_score": $max_score,
  "percentage": $percentage,
  "metrics": {
    "store_lines": $store_lines,
    "circular_count": $circular_count,
    "legacy_files": $legacy_files,
    "large_files": $large_files
  }
}
EOF

echo "📄 Report saved to: $report_file"
echo ""

# Recommendations
echo "=========================================="
echo "🎯 RECOMMENDATIONS"
echo "=========================================="
echo ""

if [ $score_store -lt 2 ]; then
    echo "1. 🔴 PRIORITY: Refactor workflowStore.ts"
    echo "   → See AUDIT_ARCHITECTURE_100.md section 1"
    echo ""
fi

if [ $score_circular -lt 2 ]; then
    echo "2. 🔴 PRIORITY: Fix circular dependencies"
    echo "   → See AUDIT_ARCHITECTURE_100.md section 2"
    echo ""
fi

if [ $score_legacy -gt 0 ]; then
    echo "3. 🟡 QUICK WIN: Remove legacy files"
    echo "   → Run: scripts/clean-legacy.sh"
    echo ""
fi

if [ $score_coverage -lt 2 ]; then
    echo "4. 🟡 IMPROVEMENT: Increase test coverage"
    echo "   → Target: 80%+ coverage"
    echo ""
fi

if [ $score_lint -lt 2 ]; then
    echo "5. 🟡 FIX: Resolve ESLint errors"
    echo "   → Run: npm run lint:fix"
    echo ""
fi

echo "For detailed action plan, see:"
echo "  → AUDIT_ARCHITECTURE_100.md"
echo "  → REFACTORING_EXAMPLES.md"
echo ""
echo "=========================================="
