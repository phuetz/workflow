#!/bin/bash

# FIND ALL CONSOLE STATEMENTS IN PRODUCTION CODE
# Run: ./scripts/find-console-statements.sh

echo "================================================"
echo "  CONSOLE STATEMENTS AUDIT"
echo "================================================"
echo ""

# Find all console statements
echo "Searching for console.* in production code..."
echo ""

OUTPUT_FILE="console-statements-report.txt"

{
  echo "CONSOLE STATEMENTS AUDIT REPORT"
  echo "Generated: $(date)"
  echo "================================================"
  echo ""
  echo "Summary:"
  echo "--------"

  CONSOLE_LOG=$(grep -r 'console\.log' src/ \
    --include='*.ts' --include='*.tsx' \
    --exclude-dir=__tests__ \
    --exclude='*.test.ts' --exclude='*.test.tsx' \
    2>/dev/null | grep -v 'logger\.' | wc -l || echo 0)

  CONSOLE_ERROR=$(grep -r 'console\.error' src/ \
    --include='*.ts' --include='*.tsx' \
    --exclude-dir=__tests__ \
    --exclude='*.test.ts' --exclude='*.test.tsx' \
    2>/dev/null | grep -v 'logger\.' | wc -l || echo 0)

  CONSOLE_WARN=$(grep -r 'console\.warn' src/ \
    --include='*.ts' --include='*.tsx' \
    --exclude-dir=__tests__ \
    --exclude='*.test.ts' --exclude='*.test.tsx' \
    2>/dev/null | grep -v 'logger\.' | wc -l || echo 0)

  CONSOLE_DEBUG=$(grep -r 'console\.debug' src/ \
    --include='*.ts' --include='*.tsx' \
    --exclude-dir=__tests__ \
    --exclude='*.test.ts' --exclude='*.test.tsx' \
    2>/dev/null | grep -v 'logger\.' | wc -l || echo 0)

  TOTAL=$((CONSOLE_LOG + CONSOLE_ERROR + CONSOLE_WARN + CONSOLE_DEBUG))

  echo "  console.log:   $CONSOLE_LOG"
  echo "  console.error: $CONSOLE_ERROR"
  echo "  console.warn:  $CONSOLE_WARN"
  echo "  console.debug: $CONSOLE_DEBUG"
  echo "  -------------------------"
  echo "  TOTAL:         $TOTAL"
  echo ""

  echo "Detailed Report:"
  echo "----------------"
  echo ""

  echo "=== Files by Count (Top 20) ==="
  grep -r 'console\.' src/ \
    --include='*.ts' --include='*.tsx' \
    --exclude-dir=__tests__ \
    --exclude='*.test.ts' --exclude='*.test.tsx' \
    2>/dev/null | grep -v 'logger\.' | \
    awk -F: '{print $1}' | sort | uniq -c | sort -rn | head -20 | \
    awk '{print $1 " statements - " $2}'
  echo ""

  echo "=== All Occurrences with Line Numbers ==="
  grep -rn 'console\.' src/ \
    --include='*.ts' --include='*.tsx' \
    --exclude-dir=__tests__ \
    --exclude='*.test.ts' --exclude='*.test.tsx' \
    2>/dev/null | grep -v 'logger\.'

} | tee "$OUTPUT_FILE"

echo ""
echo "================================================"
echo "Report saved to: $OUTPUT_FILE"
echo ""
echo "Next Steps:"
echo "1. Review critical files (services, backend, security)"
echo "2. Replace with logger: import { logger } from '@/utils/logger'"
echo "3. Run: ./scripts/migrate-to-logger.sh [file.ts]"
echo "================================================"
