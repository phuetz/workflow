#!/bin/bash

# Script de correction automatique des 16 warnings ESLint
# Usage: ./scripts/fix-eslint-warnings.sh

set -e

echo "🔧 Fixing ESLint Warnings - Score 100/100"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Count initial warnings
INITIAL_WARNINGS=$(npm run lint 2>&1 | grep -c "warning" || echo "0")
echo "📊 Initial warnings: $INITIAL_WARNINGS"
echo ""

# Backup files
BACKUP_DIR="backups/eslint-fixes-$(date +%s)"
mkdir -p "$BACKUP_DIR"

FILES_TO_FIX=(
    "src/App.tsx"
    "src/backend/api/middleware/advancedRateLimit.ts"
    "src/backend/api/middleware/compression.ts"
    "src/backend/api/middleware/security.ts"
)

for file in "${FILES_TO_FIX[@]}"; do
    if [ -f "$file" ]; then
        cp "$file" "$BACKUP_DIR/"
        echo "✅ Backed up: $file"
    fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 FIX 1/6 - App.tsx: Remove unused import"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if grep -q "import.*nodeTypes.*from.*nodeTypes" src/App.tsx; then
    echo "  Found unused import 'nodeTypes'"
    # Comment out the import (safe approach)
    sed -i "s/^import { nodeTypes }/\/\/ import { nodeTypes }/" src/App.tsx
    echo "  ✅ Commented out unused import"
else
    echo "  ⚠️  Import not found or already fixed"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 FIX 2/6 - Middleware: Fix any types"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Fix advancedRateLimit.ts
FILE="src/backend/api/middleware/advancedRateLimit.ts"
if [ -f "$FILE" ]; then
    echo "  Processing: $FILE"

    # Add Express types import if not present
    if ! grep -q "import { Request, Response, NextFunction }" "$FILE"; then
        sed -i "1i import { Request, Response, NextFunction } from 'express';" "$FILE"
        echo "    ✅ Added Express types import"
    fi

    # Replace any types (safe patterns only)
    sed -i "s/req: any/req: Request/g" "$FILE"
    sed -i "s/res: any/res: Response/g" "$FILE"
    sed -i "s/next: any/next: NextFunction/g" "$FILE"

    echo "    ✅ Replaced any types with proper Express types"
else
    echo "  ⚠️  File not found: $FILE"
fi

# Fix compression.ts
FILE="src/backend/api/middleware/compression.ts"
if [ -f "$FILE" ]; then
    echo "  Processing: $FILE"

    # Replace chunk: any with proper type
    sed -i "s/chunk: any/chunk: Buffer | string | Uint8Array/g" "$FILE"
    sed -i "s/args: any\[\]/args: unknown[]/g" "$FILE"

    echo "    ✅ Replaced any types with proper types"
else
    echo "  ⚠️  File not found: $FILE"
fi

# Fix security.ts
FILE="src/backend/api/middleware/security.ts"
if [ -f "$FILE" ]; then
    echo "  Processing: $FILE"

    # Add Express import if needed
    if ! grep -q "import.*Application.*from.*express" "$FILE"; then
        sed -i "1i import { Application } from 'express';" "$FILE"
        echo "    ✅ Added Express Application import"
    fi

    # Replace obj: any with proper type
    sed -i "s/obj: any): any/obj: Record<string, unknown>): Record<string, unknown>/g" "$FILE"
    sed -i "s/const sanitized: any/const sanitized: Record<string, unknown>/g" "$FILE"
    sed -i "s/app: any/app: Application/g" "$FILE"

    echo "    ✅ Replaced any types with proper types"
else
    echo "  ⚠️  File not found: $FILE"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 MANUAL FIXES REQUIRED:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "FIX 3/6 - App.tsx: Reduce complexity"
echo "  Location: Line 137"
echo "  Issue: Function 'WorkflowEditor' complexity 30 > 20"
echo "  Solution: Refactor into sub-components"
echo "  File: src/App.tsx"
echo ""
echo "FIX 4/6 - App.tsx: Reduce file size"
echo "  Location: File level"
echo "  Issue: 1238 lines > 1000"
echo "  Solution: Split into modules:"
echo "    - src/App/WorkflowEditor.tsx"
echo "    - src/App/AppProviders.tsx"
echo "    - src/App/AppRoutes.tsx"
echo ""

# Verify
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Verification"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Type check
echo "⏳ Running type check..."
if npm run typecheck 2>&1 | grep -q "error"; then
    echo "  ❌ Type errors detected"
    echo "  Review and fix manually"
    TYPECHECK_OK=false
else
    echo "  ✅ No type errors"
    TYPECHECK_OK=true
fi

# Count remaining warnings
echo ""
echo "⏳ Counting remaining warnings..."
FINAL_WARNINGS=$(npm run lint 2>&1 | grep -c "warning" || echo "0")

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 RESULTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Initial warnings: $INITIAL_WARNINGS"
echo "  Final warnings: $FINAL_WARNINGS"
echo "  Fixed: $((INITIAL_WARNINGS - FINAL_WARNINGS))"
echo ""

if [ "$FINAL_WARNINGS" -le 3 ]; then
    echo "  ✅ Automated fixes complete!"
    echo "  ⚠️  $FINAL_WARNINGS manual fixes remaining (complexity + file size)"
    echo ""
    echo "Next steps:"
    echo "  1. Fix App.tsx complexity manually"
    echo "  2. Split App.tsx into modules"
    echo "  3. Run: npm run lint"
    echo "  4. Target: 0 warnings"
else
    echo "  ⚠️  More warnings remain than expected"
    echo "  Review fixes manually"
fi

echo ""
echo "📁 Backups saved to: $BACKUP_DIR"
echo ""

if [ "$TYPECHECK_OK" = false ]; then
    echo "⚠️  WARNING: Type check failed!"
    echo "Review changes before committing"
    exit 1
fi
