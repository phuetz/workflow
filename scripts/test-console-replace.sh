#!/bin/bash

# Test script - processes only ONE file to validate the approach

set -e

TEST_FILE="/home/patrice/claude/workflow/src/services/VaultService.ts"
BACKUP_FILE="${TEST_FILE}.test-backup"

echo "Testing console.* replacement on: $TEST_FILE"
echo ""

# Backup
cp "$TEST_FILE" "$BACKUP_FILE"

# Show current console statements
echo "=== BEFORE ==="
grep -n "console\." "$TEST_FILE" || echo "No console statements found"
echo ""

# Check if logger is imported
echo "=== Checking logger import ==="
if grep -q "import.*logger.*from.*LoggingService" "$TEST_FILE"; then
  echo "✓ Logger already imported"
  HAS_LOGGER=true
else
  echo "✗ Logger NOT imported - will add"
  HAS_LOGGER=false
fi
echo ""

# Replace console statements
sed -i 's/console\.log(/logger.debug(/g' "$TEST_FILE"
sed -i 's/console\.warn(/logger.warn(/g' "$TEST_FILE"
sed -i 's/console\.error(/logger.error(/g' "$TEST_FILE"
sed -i 's/console\.info(/logger.info(/g' "$TEST_FILE"
sed -i 's/console\.debug(/logger.debug(/g' "$TEST_FILE"

# Add logger import if needed
if [ "$HAS_LOGGER" = false ]; then
  # Find the last import line
  LAST_IMPORT=$(grep -n "^import" "$TEST_FILE" | tail -1 | cut -d: -f1)

  if [ -n "$LAST_IMPORT" ]; then
    # Add after last import
    sed -i "${LAST_IMPORT}a import { logger } from './LoggingService';" "$TEST_FILE"
    echo "✓ Added logger import after line $LAST_IMPORT"
  else
    # No imports, add at top
    sed -i "1i import { logger } from './LoggingService';" "$TEST_FILE"
    echo "✓ Added logger import at top of file"
  fi
fi
echo ""

# Show result
echo "=== AFTER ==="
grep -n "console\." "$TEST_FILE" || echo "✓ No console statements remaining"
echo ""
grep -n "logger\." "$TEST_FILE" | head -5
echo ""

echo "=== Logger import ==="
grep "import.*logger" "$TEST_FILE" || echo "No logger import found!"
echo ""

echo "To restore original file: mv $BACKUP_FILE $TEST_FILE"
echo "To keep changes: rm $BACKUP_FILE"
