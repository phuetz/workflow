#!/bin/bash

# DELETE BACKUP AND BROKEN FILES
# Run: ./scripts/delete-backup-files.sh [--dry-run]

set -e

DRY_RUN=false

if [ "$1" = "--dry-run" ]; then
  DRY_RUN=true
  echo "DRY RUN MODE - No files will be deleted"
  echo ""
fi

echo "================================================"
echo "  DELETE BACKUP/BROKEN FILES"
echo "================================================"
echo ""

# Find all backup files
echo "Finding backup/broken files..."

BACKUP_FILES=$(find src -name '*.BACKUP.*' \
  -o -name '*.OLD.*' \
  -o -name '*.NEW.*' \
  -o -name '*.COMPLETE.*' \
  -o -name '*.IMPROVED.*' \
  -o -name '*.broken.*' \
  -o -name '*.backup' \
  2>/dev/null)

COUNT=$(echo "$BACKUP_FILES" | grep -c . || echo 0)

if [ "$COUNT" -eq 0 ]; then
  echo "No backup files found. Nothing to do."
  exit 0
fi

echo "Found $COUNT backup files:"
echo ""
echo "$BACKUP_FILES" | sed 's/^/  /'
echo ""

# Check if any are imported
echo "Checking if any files are imported..."
IMPORTED_FILES=""

while IFS= read -r file; do
  basename=$(basename "$file")
  # Remove extension and backup suffix
  clean_name=$(echo "$basename" | sed -E 's/\.(BACKUP|OLD|NEW|COMPLETE|IMPROVED|broken|backup)\././')

  # Check if imported
  if grep -r "from.*$clean_name" src/ --include='*.ts' --include='*.tsx' -q 2>/dev/null; then
    echo "  ⚠ WARNING: $file appears to be imported"
    IMPORTED_FILES="$IMPORTED_FILES\n$file"
  fi
done <<< "$BACKUP_FILES"

if [ -n "$IMPORTED_FILES" ]; then
  echo ""
  echo "⚠ WARNING: The following files appear to be imported:"
  echo -e "$IMPORTED_FILES" | sed 's/^/  /'
  echo ""
  echo "These should be reviewed manually before deletion."
  echo ""
fi

if [ "$DRY_RUN" = true ]; then
  echo "DRY RUN: Would delete $COUNT files"
  exit 0
fi

# Ask for confirmation
echo "This will permanently delete $COUNT files."
read -p "Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Cancelled."
  exit 1
fi

echo ""
echo "Creating safety backup..."
BACKUP_DIR="backups/deleted-backups-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Copy files to backup before deleting
while IFS= read -r file; do
  mkdir -p "$BACKUP_DIR/$(dirname "$file")"
  cp "$file" "$BACKUP_DIR/$file"
done <<< "$BACKUP_FILES"

echo "✓ Backup created in: $BACKUP_DIR"
echo ""
echo "Deleting files..."

# Delete files
DELETED=0
while IFS= read -r file; do
  rm "$file"
  echo "  ✓ Deleted: $file"
  DELETED=$((DELETED + 1))
done <<< "$BACKUP_FILES"

echo ""
echo "================================================"
echo "✓ Deleted $DELETED backup files"
echo "✓ Safety backup: $BACKUP_DIR"
echo ""
echo "Next Steps:"
echo "1. Run tests: npm test"
echo "2. Check if imports are broken: npm run typecheck"
echo "3. If everything works, commit the changes"
echo ""
echo "To restore files if needed:"
echo "  cp -r $BACKUP_DIR/src/* src/"
echo "================================================"
