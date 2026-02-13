#!/bin/bash

# REPLACE 'error: any' WITH 'error: unknown'
# Run: ./scripts/replace-error-any.sh [--dry-run]

set -e

DRY_RUN=false

if [ "$1" = "--dry-run" ]; then
  DRY_RUN=true
  echo "DRY RUN MODE - No changes will be made"
  echo ""
fi

echo "================================================"
echo "  REPLACE 'error: any' → 'error: unknown'"
echo "================================================"
echo ""

# Find all occurrences
echo "Finding occurrences of 'error: any'..."
OCCURRENCES=$(grep -r 'error: any' src/ \
  --include='*.ts' --include='*.tsx' \
  2>/dev/null | wc -l || echo 0)

echo "Found $OCCURRENCES occurrences"
echo ""

if [ "$OCCURRENCES" -eq 0 ]; then
  echo "No occurrences found. Nothing to do."
  exit 0
fi

# Show files that will be affected
echo "Files to be modified:"
grep -r 'error: any' src/ \
  --include='*.ts' --include='*.tsx' \
  -l 2>/dev/null | sort | head -20

TOTAL_FILES=$(grep -r 'error: any' src/ \
  --include='*.ts' --include='*.tsx' \
  -l 2>/dev/null | wc -l)

if [ "$TOTAL_FILES" -gt 20 ]; then
  echo "... and $((TOTAL_FILES - 20)) more files"
fi

echo ""

if [ "$DRY_RUN" = true ]; then
  echo "DRY RUN: Would replace in $TOTAL_FILES files"
  echo ""
  echo "Preview of changes:"
  grep -rn 'error: any' src/ \
    --include='*.ts' --include='*.tsx' \
    2>/dev/null | head -10
  echo ""
  echo "Run without --dry-run to apply changes"
  exit 0
fi

# Ask for confirmation
echo "This will modify $TOTAL_FILES files."
read -p "Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Cancelled."
  exit 1
fi

echo ""
echo "Applying changes..."

# Backup before changes
BACKUP_DIR="backups/error-any-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
echo "Creating backup in $BACKUP_DIR..."

# Find and backup files
grep -r 'error: any' src/ \
  --include='*.ts' --include='*.tsx' \
  -l 2>/dev/null | while read -r file; do
    mkdir -p "$BACKUP_DIR/$(dirname "$file")"
    cp "$file" "$BACKUP_DIR/$file"
  done

# Perform replacement
REPLACED=0
grep -r 'error: any' src/ \
  --include='*.ts' --include='*.tsx' \
  -l 2>/dev/null | while read -r file; do
    sed -i 's/error: any/error: unknown/g' "$file"
    REPLACED=$((REPLACED + 1))
  done

echo ""
echo "✓ Replaced 'error: any' → 'error: unknown' in $TOTAL_FILES files"
echo "✓ Backup saved to: $BACKUP_DIR"
echo ""
echo "Next Steps:"
echo "1. Run tests: npm test"
echo "2. Run TypeScript check: npm run typecheck"
echo "3. Fix any type errors (add instanceof checks)"
echo ""
echo "Example fix:"
echo "  // BEFORE"
echo "  } catch (error: any) {"
echo "    console.error(error.message);"
echo "  }"
echo ""
echo "  // AFTER"
echo "  } catch (error: unknown) {"
echo "    if (error instanceof Error) {"
echo "      logger.error(error.message);"
echo "    }"
echo "  }"
echo ""
echo "================================================"
