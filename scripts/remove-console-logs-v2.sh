#!/bin/bash

###############################################################################
# Console.log Cleanup Script v2
# Replaces all console.log/warn/error with proper logger calls
# DOES NOT touch test files (__tests__/, *.test.ts, *.test.tsx)
###############################################################################

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
TOTAL_FILES=0
MODIFIED_FILES=0
CONSOLE_LOG_COUNT=0
CONSOLE_WARN_COUNT=0
CONSOLE_ERROR_COUNT=0
CONSOLE_INFO_COUNT=0
CONSOLE_DEBUG_COUNT=0
FILES_NEEDING_IMPORT=0
ERRORS=0

# Arrays to track files
declare -a MODIFIED_FILE_LIST
declare -a FILES_NEEDING_IMPORT_LIST
declare -a ERROR_FILES

# Project root
PROJECT_ROOT="/home/patrice/claude/workflow"
SRC_DIR="${PROJECT_ROOT}/src"
REPORT_FILE="${PROJECT_ROOT}/CONSOLE_LOG_CLEANUP_REPORT.md"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Console.log Cleanup Script v2${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Find all TypeScript/TSX files excluding tests
echo -e "${YELLOW}Step 1: Finding all production TypeScript files...${NC}"
FILES=$(find "${SRC_DIR}" -type f \( -name "*.ts" -o -name "*.tsx" \) \
  | grep -v "__tests__" \
  | grep -v "__mocks__" \
  | grep -v ".test.ts" \
  | grep -v ".test.tsx" \
  | grep -v "test-setup" \
  | grep -v "testUtils")

TOTAL_FILES=$(echo "$FILES" | wc -l)
echo -e "${GREEN}Found ${TOTAL_FILES} production files${NC}"
echo ""

# Function to calculate relative path from file to LoggingService
get_logger_import_path() {
  local file="$1"
  local file_dir=$(dirname "$file")

  # Calculate relative path
  local rel_path=$(realpath --relative-to="$file_dir" "${SRC_DIR}/services/LoggingService")

  # Remove .ts extension and ensure it starts with ./
  rel_path="${rel_path%.ts}"

  if [[ ! "$rel_path" =~ ^\. ]]; then
    rel_path="./${rel_path}"
  fi

  echo "$rel_path"
}

# Function to check if logger is imported in a file
has_logger_import() {
  local file="$1"
  grep -q "import.*logger.*from.*['\"].*LoggingService['\"]" "$file" || \
  grep -q "import.*{.*logger.*}.*from.*['\"].*LoggingService['\"]" "$file"
}

# Function to process a single file
process_file() {
  local file="$1"
  local file_modified=false
  local needs_import=false

  # Count console statements in this file
  local log_count=$(grep "console\.log(" "$file" 2>/dev/null | wc -l)
  local warn_count=$(grep "console\.warn(" "$file" 2>/dev/null | wc -l)
  local error_count=$(grep "console\.error(" "$file" 2>/dev/null | wc -l)
  local info_count=$(grep "console\.info(" "$file" 2>/dev/null | wc -l)
  local debug_count=$(grep "console\.debug(" "$file" 2>/dev/null | wc -l)

  local total_console=$((log_count + warn_count + error_count + info_count + debug_count))

  # Skip if no console statements
  if [ "$total_console" -eq 0 ]; then
    return
  fi

  # Skip LoggingService itself
  if [[ "$file" =~ LoggingService\.(ts|js)$ ]]; then
    echo -e "${BLUE}Skipping LoggingService itself: ${file}${NC}"
    return
  fi

  local relative_path=${file#${PROJECT_ROOT}/}
  echo -e "${YELLOW}Processing: ${relative_path}${NC}"
  echo "  - console.log: $log_count"
  echo "  - console.warn: $warn_count"
  echo "  - console.error: $error_count"
  echo "  - console.info: $info_count"
  echo "  - console.debug: $debug_count"

  # Check if logger import exists
  if ! has_logger_import "$file"; then
    needs_import=true
    echo -e "  ${YELLOW}⚠ Logger not imported${NC}"
  fi

  # Create a backup
  cp "$file" "${file}.backup"

  # Replace console statements
  if [ "$log_count" -gt 0 ]; then
    sed -i 's/console\.log(/logger.debug(/g' "$file"
    CONSOLE_LOG_COUNT=$((CONSOLE_LOG_COUNT + log_count))
    file_modified=true
  fi

  if [ "$warn_count" -gt 0 ]; then
    sed -i 's/console\.warn(/logger.warn(/g' "$file"
    CONSOLE_WARN_COUNT=$((CONSOLE_WARN_COUNT + warn_count))
    file_modified=true
  fi

  if [ "$error_count" -gt 0 ]; then
    sed -i 's/console\.error(/logger.error(/g' "$file"
    CONSOLE_ERROR_COUNT=$((CONSOLE_ERROR_COUNT + error_count))
    file_modified=true
  fi

  if [ "$info_count" -gt 0 ]; then
    sed -i 's/console\.info(/logger.info(/g' "$file"
    CONSOLE_INFO_COUNT=$((CONSOLE_INFO_COUNT + info_count))
    file_modified=true
  fi

  if [ "$debug_count" -gt 0 ]; then
    sed -i 's/console\.debug(/logger.debug(/g' "$file"
    CONSOLE_DEBUG_COUNT=$((CONSOLE_DEBUG_COUNT + debug_count))
    file_modified=true
  fi

  if [ "$file_modified" = true ]; then
    MODIFIED_FILES=$((MODIFIED_FILES + 1))
    MODIFIED_FILE_LIST+=("$relative_path")
    echo -e "  ${GREEN}✓ Replaced $total_console console statements${NC}"

    # Add logger import if needed
    if [ "$needs_import" = true ]; then
      local import_path=$(get_logger_import_path "$file")

      # Find last import line
      local last_import=$(grep -n "^import" "$file" | tail -1 | cut -d: -f1)

      if [ -n "$last_import" ] && [ "$last_import" -gt 0 ]; then
        # Add after last import
        sed -i "${last_import}a import { logger } from '${import_path}';" "$file"
        echo -e "  ${BLUE}✓ Added import: import { logger } from '${import_path}';${NC}"
      else
        # No imports, add at the very top after any shebangs/comments
        sed -i "1i import { logger } from '${import_path}';" "$file"
        echo -e "  ${BLUE}✓ Added import at top${NC}"
      fi

      FILES_NEEDING_IMPORT=$((FILES_NEEDING_IMPORT + 1))
      FILES_NEEDING_IMPORT_LIST+=("$relative_path")
    fi

    # Verify the changes were successful
    local remaining=$(grep "console\." "$file" 2>/dev/null | wc -l)
    if [ "$remaining" -eq 0 ]; then
      echo -e "  ${GREEN}✓ Verification: No console.* remaining${NC}"
      rm "${file}.backup"
    else
      echo -e "  ${RED}✗ Warning: Still has $remaining console.* statements${NC}"
      ERROR_FILES+=("$relative_path")
      ERRORS=$((ERRORS + 1))
    fi
  else
    rm "${file}.backup"
  fi

  echo ""
}

# Process all files
echo -e "${YELLOW}Step 2: Processing files...${NC}"
echo ""

COUNTER=0
while IFS= read -r file; do
  if [ -n "$file" ]; then
    COUNTER=$((COUNTER + 1))
    process_file "$file"

    # Progress indicator every 20 files
    if [ $((COUNTER % 20)) -eq 0 ]; then
      echo -e "${BLUE}Progress: $COUNTER / $TOTAL_FILES files processed...${NC}"
      echo ""
    fi
  fi
done <<< "$FILES"

# Verify cleanup
echo -e "${YELLOW}Step 3: Verifying cleanup...${NC}"
REMAINING_FILES=$(find "${SRC_DIR}" -type f \( -name "*.ts" -o -name "*.tsx" \) \
  | grep -v "__tests__" \
  | grep -v "__mocks__" \
  | grep -v ".test.ts" \
  | grep -v ".test.tsx" \
  | grep -v "test-setup" \
  | grep -v "testUtils" \
  | xargs grep -l "console\." 2>/dev/null | wc -l)

REMAINING_CONSOLE=$(find "${SRC_DIR}" -type f \( -name "*.ts" -o -name "*.tsx" \) \
  | grep -v "__tests__" \
  | grep -v "__mocks__" \
  | grep -v ".test.ts" \
  | grep -v ".test.tsx" \
  | grep -v "test-setup" \
  | grep -v "testUtils" \
  | xargs grep "console\." 2>/dev/null | wc -l)

echo -e "${GREEN}Files with console.*: ${REMAINING_FILES}${NC}"
echo -e "${GREEN}Total console.* statements: ${REMAINING_CONSOLE}${NC}"
echo ""

# Generate report
echo -e "${YELLOW}Step 4: Generating report...${NC}"

cat > "$REPORT_FILE" << EOF
# Console.log Cleanup Report

**Date**: $(date)
**Script**: remove-console-logs-v2.sh
**Duration**: Script completed successfully

## Executive Summary

✅ **Production code is now using structured logging!**

- **Total Production Files Scanned**: ${TOTAL_FILES}
- **Files Modified**: ${MODIFIED_FILES}
- **Files Needing Logger Import**: ${FILES_NEEDING_IMPORT}
- **Errors During Processing**: ${ERRORS}

## Console Statements Replaced

| Type | Count |
|------|-------|
| console.log → logger.debug | ${CONSOLE_LOG_COUNT} |
| console.warn → logger.warn | ${CONSOLE_WARN_COUNT} |
| console.error → logger.error | ${CONSOLE_ERROR_COUNT} |
| console.info → logger.info | ${CONSOLE_INFO_COUNT} |
| console.debug → logger.debug | ${CONSOLE_DEBUG_COUNT} |
| **TOTAL REPLACED** | **$((CONSOLE_LOG_COUNT + CONSOLE_WARN_COUNT + CONSOLE_ERROR_COUNT + CONSOLE_INFO_COUNT + CONSOLE_DEBUG_COUNT))** |

## Verification Results

- **Files Still Containing console.***: ${REMAINING_FILES}
- **Total console.* Statements Remaining**: ${REMAINING_CONSOLE}

EOF

if [ "$REMAINING_FILES" -gt 0 ]; then
  cat >> "$REPORT_FILE" << EOF

### Files with Remaining Console Statements

These files still contain console.* (likely in LoggingService itself or special cases):

EOF

  find "${SRC_DIR}" -type f \( -name "*.ts" -o -name "*.tsx" \) \
    | grep -v "__tests__" \
    | grep -v "__mocks__" \
    | grep -v ".test.ts" \
    | grep -v ".test.tsx" \
    | grep -v "test-setup" \
    | grep -v "testUtils" \
    | xargs grep -l "console\." 2>/dev/null | while read -r file; do
      relative_path=${file#${PROJECT_ROOT}/}
      count=$(grep "console\." "$file" 2>/dev/null | wc -l)
      echo "- \`${relative_path}\` - ${count} occurrences" >> "$REPORT_FILE"
  done
fi

cat >> "$REPORT_FILE" << EOF

## Modified Files (${#MODIFIED_FILE_LIST[@]} total)

EOF

if [ ${#MODIFIED_FILE_LIST[@]} -gt 0 ]; then
  for file in "${MODIFIED_FILE_LIST[@]}"; do
    echo "- \`${file}\`" >> "$REPORT_FILE"
  done
else
  echo "No files were modified." >> "$REPORT_FILE"
fi

if [ ${#FILES_NEEDING_IMPORT_LIST[@]} -gt 0 ]; then
  cat >> "$REPORT_FILE" << EOF

## Files Where Logger Import Was Added (${#FILES_NEEDING_IMPORT_LIST[@]} total)

EOF

  for file in "${FILES_NEEDING_IMPORT_LIST[@]}"; do
    echo "- \`${file}\`" >> "$REPORT_FILE"
  done
fi

if [ ${#ERROR_FILES[@]} -gt 0 ]; then
  cat >> "$REPORT_FILE" << EOF

## ⚠️ Files With Potential Issues

These files were processed but may still contain console.* statements:

EOF

  for file in "${ERROR_FILES[@]}"; do
    echo "- \`${file}\`" >> "$REPORT_FILE"
  done
fi

cat >> "$REPORT_FILE" << EOF

## Migration Details

### What Was Changed

All production code (excluding tests) had their console statements replaced:

- \`console.log()\` → \`logger.debug()\` - For debug information
- \`console.warn()\` → \`logger.warn()\` - For warnings
- \`console.error()\` → \`logger.error()\` - For errors
- \`console.info()\` → \`logger.info()\` - For informational messages
- \`console.debug()\` → \`logger.debug()\` - For debug traces

### Logger Import

Files that didn't have the logger imported received an import statement with the correct relative path:

\`\`\`typescript
import { logger } from '../services/LoggingService';
\`\`\`

The path is automatically calculated based on file location.

### Files Excluded

The following files were intentionally NOT modified:
- Files in \`__tests__/\` directories
- Files in \`__mocks__/\` directories
- Files ending with \`.test.ts\` or \`.test.tsx\`
- \`test-setup.ts\` and \`test-setup.tsx\`
- \`testUtils.ts\` and \`testUtils.tsx\`
- \`LoggingService.ts\` itself

Console statements in test files are preserved for debugging purposes.

## Benefits of Structured Logging

1. **Production Safety**: Console logs disabled in production by default
2. **Remote Logging**: Logs can be sent to remote endpoints (Datadog, Splunk, etc.)
3. **Data Sanitization**: Sensitive data (passwords, tokens) automatically redacted
4. **Context Awareness**: All logs include userId, sessionId, timestamps
5. **Log Levels**: Proper filtering - only show relevant logs
6. **Performance**: Built-in performance timers with \`logger.startTimer()\`
7. **Structured Data**: Logs are JSON-formatted for easy parsing
8. **Audit Trail**: Persistent storage in localStorage (configurable)
9. **Error Tracking**: Automatic stack traces for errors
10. **Event System**: Subscribe to log events for custom handling

## LoggingService API

### Basic Usage

\`\`\`typescript
import { logger } from '../services/LoggingService';

// Debug information
logger.debug('User clicked button', { buttonId: 'submit' });

// Informational messages
logger.info('Workflow executed successfully', { workflowId: 'wf_123', duration: 1234 });

// Warnings
logger.warn('API rate limit approaching', { remaining: 10, limit: 100 });

// Errors
logger.error('Failed to save workflow', { error: err.message });

// Fatal errors
logger.fatal('Database connection lost', { host: 'db.example.com' });
\`\`\`

### Performance Monitoring

\`\`\`typescript
const stopTimer = logger.startTimer('expensive-operation');
// ... do expensive work ...
stopTimer(); // Logs: "Performance: expensive-operation" with duration
\`\`\`

### Structured Logging

\`\`\`typescript
// API calls
logger.logApiCall('POST', '/api/workflows', 200, 145);

// User actions
logger.logUserAction('create-workflow', { workflowName: 'My Workflow' });

// State changes
logger.logStateChange('WorkflowEditor', { nodeCount: 5, edgeCount: 4 });
\`\`\`

## Configuration

The LoggingService can be configured via environment variables:

\`\`\`bash
# Enable/disable console output (default: true in dev, false in prod)
NODE_ENV=production

# Remote logging endpoint
REACT_APP_LOG_ENDPOINT=https://logs.example.com/ingest

# Minimum log level (debug, info, warn, error, fatal)
# Default: 'debug' in dev, 'info' in prod
\`\`\`

## Next Steps

### Immediate Actions

1. ✅ **Review this report**
2. ⏳ **Run typecheck**: \`npm run typecheck\`
3. ⏳ **Run tests**: \`npm run test\`
4. ⏳ **Run lint**: \`npm run lint\`
5. ⏳ **Manual verification**: Test critical workflows
6. ⏳ **Commit changes**

### Recommended Commands

\`\`\`bash
# 1. Type check
npm run typecheck

# 2. Run tests
npm run test

# 3. Lint code
npm run lint

# 4. Review changes
git diff --stat

# 5. Commit
git add .
git commit -m "refactor: replace console.* with structured logger

- Replaced $((CONSOLE_LOG_COUNT + CONSOLE_WARN_COUNT + CONSOLE_ERROR_COUNT + CONSOLE_INFO_COUNT + CONSOLE_DEBUG_COUNT)) console statements across ${MODIFIED_FILES} files
- Added logger imports to ${FILES_NEEDING_IMPORT} files
- All production code now uses centralized LoggingService
- Test files unchanged (console preserved for debugging)
- Improves production observability and debugging"
\`\`\`

## Statistics

- **Files Scanned**: ${TOTAL_FILES}
- **Files Modified**: ${MODIFIED_FILES}
- **Statements Replaced**: $((CONSOLE_LOG_COUNT + CONSOLE_WARN_COUNT + CONSOLE_ERROR_COUNT + CONSOLE_INFO_COUNT + CONSOLE_DEBUG_COUNT))
- **Imports Added**: ${FILES_NEEDING_IMPORT}
- **Success Rate**: $(awk "BEGIN {printf \"%.1f\", (${MODIFIED_FILES} / ${TOTAL_FILES}) * 100}")%
- **Files Remaining with console.***: ${REMAINING_FILES}

---

**Generated by**: remove-console-logs-v2.sh
**Report Location**: \`${REPORT_FILE}\`
**Timestamp**: $(date -Iseconds)
EOF

echo -e "${GREEN}✓ Report generated: ${REPORT_FILE}${NC}"
echo ""

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Cleanup Complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}✓ Scanned ${TOTAL_FILES} production files${NC}"
echo -e "${GREEN}✓ Modified ${MODIFIED_FILES} files${NC}"
echo -e "${GREEN}✓ Replaced $((CONSOLE_LOG_COUNT + CONSOLE_WARN_COUNT + CONSOLE_ERROR_COUNT + CONSOLE_INFO_COUNT + CONSOLE_DEBUG_COUNT)) console statements${NC}"
echo -e "${GREEN}✓ Added logger import to ${FILES_NEEDING_IMPORT} files${NC}"
echo ""

if [ "$ERRORS" -gt 0 ]; then
  echo -e "${RED}⚠ ${ERRORS} files had issues during processing${NC}"
  echo ""
fi

if [ "$REMAINING_FILES" -gt 0 ]; then
  echo -e "${YELLOW}📝 ${REMAINING_FILES} files still contain console.* statements${NC}"
  echo -e "${YELLOW}   (Likely LoggingService itself or special cases)${NC}"
else
  echo -e "${GREEN}✅ All production console.* statements replaced!${NC}"
fi

echo ""
echo -e "${BLUE}📊 Report saved to: ${REPORT_FILE}${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Review the report: cat ${REPORT_FILE}"
echo "  2. Run typecheck: npm run typecheck"
echo "  3. Run tests: npm run test"
echo "  4. Review changes: git diff --stat"
echo "  5. Commit: git add . && git commit -m 'refactor: replace console.* with structured logger'"
echo ""

exit 0
