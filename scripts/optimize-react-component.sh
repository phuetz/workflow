#!/bin/bash

# Script d'optimisation React pour atteindre 100/100
# Usage: ./scripts/optimize-react-component.sh <component-name>
# Example: ./scripts/optimize-react-component.sh CostOptimizerPro

set -e

COMPONENT_NAME="$1"
COMPONENT_PATH="src/components/${COMPONENT_NAME}.tsx"

if [ -z "$COMPONENT_NAME" ]; then
    echo "❌ Usage: $0 <component-name>"
    echo "Example: $0 CostOptimizerPro"
    exit 1
fi

if [ ! -f "$COMPONENT_PATH" ]; then
    echo "❌ Component not found: $COMPONENT_PATH"
    exit 1
fi

echo "🔧 Optimizing React component: $COMPONENT_NAME"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Backup original file
BACKUP_PATH="${COMPONENT_PATH}.backup-$(date +%s)"
cp "$COMPONENT_PATH" "$BACKUP_PATH"
echo "✅ Backup created: $BACKUP_PATH"

# Check if already optimized
if grep -q "React.memo" "$COMPONENT_PATH"; then
    echo "⚠️  Component already uses React.memo"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        rm "$BACKUP_PATH"
        exit 0
    fi
fi

# Analysis
echo ""
echo "📊 Component Analysis:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

SIZE=$(wc -c < "$COMPONENT_PATH")
LINES=$(wc -l < "$COMPONENT_PATH")
USESTATE_COUNT=$(grep -c "useState" "$COMPONENT_PATH" || true)
USEEFFECT_COUNT=$(grep -c "useEffect" "$COMPONENT_PATH" || true)
HANDLER_COUNT=$(grep -c "const handle" "$COMPONENT_PATH" || true)

echo "  Size: $SIZE bytes"
echo "  Lines: $LINES"
echo "  useState hooks: $USESTATE_COUNT"
echo "  useEffect hooks: $USEEFFECT_COUNT"
echo "  Event handlers: $HANDLER_COUNT"

# Estimate optimization potential
OPTIMIZATION_SCORE=0
if [ $SIZE -gt 40000 ]; then OPTIMIZATION_SCORE=$((OPTIMIZATION_SCORE + 3)); fi
if [ $HANDLER_COUNT -gt 5 ]; then OPTIMIZATION_SCORE=$((OPTIMIZATION_SCORE + 2)); fi
if [ $USESTATE_COUNT -gt 3 ]; then OPTIMIZATION_SCORE=$((OPTIMIZATION_SCORE + 2)); fi

echo ""
echo "  Optimization Potential: $OPTIMIZATION_SCORE/7"
if [ $OPTIMIZATION_SCORE -ge 5 ]; then
    echo "  Priority: 🔴 HIGH"
elif [ $OPTIMIZATION_SCORE -ge 3 ]; then
    echo "  Priority: 🟡 MEDIUM"
else
    echo "  Priority: 🟢 LOW"
fi

echo ""
echo "🔍 Recommendations:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

RECOMMENDATIONS=()

if ! grep -q "React.memo" "$COMPONENT_PATH"; then
    RECOMMENDATIONS+=("  ✓ Wrap with React.memo()")
fi

if [ $HANDLER_COUNT -gt 0 ] && ! grep -q "useCallback" "$COMPONENT_PATH"; then
    RECOMMENDATIONS+=("  ✓ Use useCallback for $HANDLER_COUNT handlers")
fi

if grep -q "\.map\|\.reduce\|\.filter" "$COMPONENT_PATH" && ! grep -q "useMemo" "$COMPONENT_PATH"; then
    RECOMMENDATIONS+=("  ✓ Use useMemo for array operations")
fi

if ! grep -q "displayName" "$COMPONENT_PATH"; then
    RECOMMENDATIONS+=("  ✓ Add displayName")
fi

if [ ${#RECOMMENDATIONS[@]} -eq 0 ]; then
    echo "  ✅ Component is well optimized!"
else
    for rec in "${RECOMMENDATIONS[@]}"; do
        echo "$rec"
    done
fi

echo ""
echo "📝 Manual Steps Required:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Add imports:"
echo "   import React, { useCallback, useMemo } from 'react';"
echo ""
echo "2. Wrap component with React.memo():"
echo "   const ${COMPONENT_NAME} = React.memo(() => {"
echo "     // component code"
echo "   });"
echo ""
echo "3. Optimize handlers with useCallback:"
echo "   const handleClick = useCallback(() => {"
echo "     // handler code"
echo "   }, [/* dependencies */]);"
echo ""
echo "4. Optimize computations with useMemo:"
echo "   const expensiveValue = useMemo(() => {"
echo "     // computation"
echo "   }, [/* dependencies */]);"
echo ""
echo "5. Add displayName:"
echo "   ${COMPONENT_NAME}.displayName = '${COMPONENT_NAME}';"
echo ""
echo "6. Test the component:"
echo "   npm run test -- ${COMPONENT_NAME}"
echo ""

# Open file in editor
echo "🚀 Opening component in editor..."
code "$COMPONENT_PATH" 2>/dev/null || vi "$COMPONENT_PATH" || nano "$COMPONENT_PATH"

# Wait for user confirmation
echo ""
read -p "Have you finished optimizing? (y/n) " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Verify optimization
    echo ""
    echo "🔍 Verifying optimization..."
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    CHECKS_PASSED=0
    CHECKS_TOTAL=4

    # Check React.memo
    if grep -q "React.memo" "$COMPONENT_PATH"; then
        echo "  ✅ React.memo detected"
        CHECKS_PASSED=$((CHECKS_PASSED + 1))
    else
        echo "  ❌ React.memo missing"
    fi

    # Check useCallback
    if grep -q "useCallback" "$COMPONENT_PATH"; then
        echo "  ✅ useCallback detected"
        CHECKS_PASSED=$((CHECKS_PASSED + 1))
    else
        echo "  ⚠️  useCallback not found (optional)"
        CHECKS_PASSED=$((CHECKS_PASSED + 1))
    fi

    # Check displayName
    if grep -q "displayName" "$COMPONENT_PATH"; then
        echo "  ✅ displayName detected"
        CHECKS_PASSED=$((CHECKS_PASSED + 1))
    else
        echo "  ❌ displayName missing"
    fi

    # Type check
    if npx tsc --noEmit "$COMPONENT_PATH" 2>&1 | grep -q "error"; then
        echo "  ❌ Type errors detected"
    else
        echo "  ✅ No type errors"
        CHECKS_PASSED=$((CHECKS_PASSED + 1))
    fi

    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  Score: $CHECKS_PASSED/$CHECKS_TOTAL checks passed"

    if [ $CHECKS_PASSED -eq $CHECKS_TOTAL ]; then
        echo "  ✅ OPTIMIZATION COMPLETE!"
        rm "$BACKUP_PATH"
        echo ""
        echo "🎉 ${COMPONENT_NAME} successfully optimized!"
        echo ""
        echo "Next steps:"
        echo "  1. Test: npm run test -- ${COMPONENT_NAME}"
        echo "  2. Lint: npm run lint src/components/${COMPONENT_NAME}.tsx"
        echo "  3. Profile: React DevTools Profiler"
        exit 0
    else
        echo "  ⚠️  Some checks failed"
        read -p "Keep changes anyway? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rm "$BACKUP_PATH"
            echo "✅ Changes kept"
        else
            mv "$BACKUP_PATH" "$COMPONENT_PATH"
            echo "↩️  Reverted to backup"
        fi
    fi
else
    echo "↩️  Optimization cancelled"
    mv "$BACKUP_PATH" "$COMPONENT_PATH"
    echo "Reverted to original file"
fi
