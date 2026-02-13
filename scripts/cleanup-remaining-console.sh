#!/bin/bash

# Cleanup remaining console statements
# Special cases: .catch(console.error) and logger || console.log

set -e

echo "Cleaning up remaining console statements..."
echo ""

# Files to fix
FILES=(
  "/home/patrice/claude/workflow/src/agentops/AgentABTesting.ts"
  "/home/patrice/claude/workflow/src/components/WorkflowDebugger.tsx"
  "/home/patrice/claude/workflow/src/deployment/DataReplication.ts"
  "/home/patrice/claude/workflow/src/deployment/AirGappedDeployer.ts"
  "/home/patrice/claude/workflow/src/deployment/MultiRegionManager.ts"
  "/home/patrice/claude/workflow/src/deployment/BlueGreenDeployer.ts"
  "/home/patrice/claude/workflow/src/deployment/CanaryDeployer.ts"
  "/home/patrice/claude/workflow/src/deployment/OfflinePackager.ts"
  "/home/patrice/claude/workflow/src/utils/lazyLoadComponents.tsx"
  "/home/patrice/claude/workflow/src/backend/monitoring/OpenTelemetryTracing.ts"
  "/home/patrice/claude/workflow/src/backend/monitoring/HealthCheckSystem.ts"
  "/home/patrice/claude/workflow/src/integrations/QuickBooksIntegration.ts"
  "/home/patrice/claude/workflow/src/integrations/DocuSignIntegration.ts"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "Processing: $file"

    # Replace .catch(console.error) with .catch((err) => logger.error('Error', err))
    sed -i 's/\.catch(console\.error)/.catch((err) => logger.error('\''Error'\'', err))/g' "$file"

    # Replace logger || console.log with logger || (() => {})
    sed -i 's/logger || console\.log/logger || (() => {})/g' "$file"

    echo "  ✓ Fixed"
  fi
done

echo ""
echo "Done! Verifying..."
echo ""

# Check remaining
REMAINING=$(find /home/patrice/claude/workflow/src -type f \( -name "*.ts" -o -name "*.tsx" \) \
  | grep -v "__tests__" \
  | grep -v "__mocks__" \
  | grep -v ".test.ts" \
  | grep -v ".test.tsx" \
  | xargs grep -l "console\." 2>/dev/null | wc -l)

echo "Files still with console.*: $REMAINING"

if [ "$REMAINING" -gt 0 ]; then
  echo ""
  echo "Remaining files:"
  find /home/patrice/claude/workflow/src -type f \( -name "*.ts" -o -name "*.tsx" \) \
    | grep -v "__tests__" \
    | grep -v "__mocks__" \
    | grep -v ".test.ts" \
    | grep -v ".test.tsx" \
    | xargs grep -l "console\." 2>/dev/null | while read -r f; do
      echo "  - $f"
      grep -n "console\." "$f"
  done
fi

echo ""
echo "Cleanup complete!"
