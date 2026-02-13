#!/bin/bash
# Daily Health Check Script

echo "🔍 Daily Health Check - $(date)"
echo "================================"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ISSUES=0
WARNINGS=0

# Check TypeScript compilation
echo -e "\n📦 Checking TypeScript compilation..."
if npm run typecheck > /dev/null 2>&1; then
  echo -e "${GREEN}✓ TypeScript compilation successful${NC}"
else
  echo -e "${RED}✗ TypeScript compilation failed${NC}"
  ((ISSUES++))
fi

# Check tests
echo -e "\n🧪 Running tests..."
TEST_OUTPUT=$(npm test 2>&1)
if echo "$TEST_OUTPUT" | grep -q "failed"; then
  echo -e "${RED}✗ Some tests are failing${NC}"
  ((ISSUES++))
else
  echo -e "${GREEN}✓ All tests passing${NC}"
fi

# Check services
echo -e "\n🌐 Checking services..."
services=("http://localhost:3000/health" "http://localhost:9090" "http://localhost:3001")
names=("API" "Prometheus" "Grafana")

for i in "${!services[@]}"; do
  if curl -f -s "${services[$i]}" > /dev/null; then
    echo -e "${GREEN}✓ ${names[$i]} is up${NC}"
  else
    echo -e "${RED}✗ ${names[$i]} is down${NC}"
    ((ISSUES++))
  fi
done

# Summary
echo -e "\n================================"
echo "📊 SUMMARY"
echo "================================"

if [ $ISSUES -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo -e "${GREEN}✅ All systems operational!${NC}"
  exit 0
elif [ $ISSUES -eq 0 ]; then
  echo -e "${YELLOW}⚠ $WARNINGS warnings detected${NC}"
  exit 0
else
  echo -e "${RED}❌ $ISSUES critical issues, $WARNINGS warnings${NC}"
  exit 1
fi
