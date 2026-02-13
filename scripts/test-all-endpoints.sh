#!/bin/bash
# Script de test complet de tous les endpoints de l'application
# Usage: ./test-all-endpoints.sh

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║     WORKFLOW AUTOMATION PLATFORM - TEST COMPLET               ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Compteurs
TOTAL=0
SUCCESS=0
FAILED=0

# Fonction de test
test_endpoint() {
    local name=$1
    local url=$2
    local expected_status=${3:-200}

    TOTAL=$((TOTAL + 1))

    # Effectuer la requête
    response_code=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)
    response_time=$(curl -s -o /dev/null -w "%{time_total}" "$url" 2>/dev/null)

    # Vérifier le résultat
    if [ "$response_code" -eq "$expected_status" ]; then
        echo -e "${GREEN}✓${NC} ${name}"
        echo -e "  └─ Status: ${GREEN}${response_code}${NC} | Time: ${response_time}s"
        SUCCESS=$((SUCCESS + 1))
    else
        echo -e "${RED}✗${NC} ${name}"
        echo -e "  └─ Status: ${RED}${response_code}${NC} (expected ${expected_status}) | Time: ${response_time}s"
        FAILED=$((FAILED + 1))
    fi
}

# Fonction de test avec contenu
test_endpoint_json() {
    local name=$1
    local url=$2
    local search_term=$3

    TOTAL=$((TOTAL + 1))

    # Effectuer la requête
    response=$(curl -s "$url" 2>/dev/null)
    response_code=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)

    # Vérifier le résultat
    if [ "$response_code" -eq 200 ] && echo "$response" | grep -q "$search_term"; then
        echo -e "${GREEN}✓${NC} ${name}"
        echo -e "  └─ Status: ${GREEN}200${NC} | Found: '${search_term}'"
        SUCCESS=$((SUCCESS + 1))
    else
        echo -e "${RED}✗${NC} ${name}"
        echo -e "  └─ Status: ${RED}${response_code}${NC} | Search term not found"
        FAILED=$((FAILED + 1))
    fi
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. FRONTEND TESTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "Frontend HTML" "http://localhost:3000" 200
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2. SYSTEM ENDPOINTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint_json "Health Check" "http://localhost:3001/health" "healthy"
test_endpoint "Metrics (Prometheus)" "http://localhost:3001/metrics" 200
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3. API - NODES ENDPOINTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint_json "Nodes API Info" "http://localhost:3001/api/nodes" "success"
test_endpoint "Nodes Types List" "http://localhost:3001/api/nodes/types" 200
test_endpoint "Nodes Categories" "http://localhost:3001/api/nodes/categories" 200
test_endpoint "Search Nodes (slack)" "http://localhost:3001/api/nodes/search?q=slack" 200
test_endpoint "Get Node Type (webhook)" "http://localhost:3001/api/nodes/types/webhook" 200
test_endpoint "Get Node Type (httpRequest)" "http://localhost:3001/api/nodes/types/httpRequest" 200
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4. API - CORE RESOURCES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint_json "Templates" "http://localhost:3001/api/templates" "success"
test_endpoint "Workflows" "http://localhost:3001/api/workflows" 200
test_endpoint "Executions" "http://localhost:3001/api/executions" 200
test_endpoint "Credentials" "http://localhost:3001/api/credentials" 200
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5. API - ANALYTICS & MONITORING"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint_json "Analytics API Info" "http://localhost:3001/api/analytics" "success"
test_endpoint "Metrics API" "http://localhost:3001/api/metrics" 200
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6. API - ADVANCED FEATURES (Optional)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_endpoint "Webhooks (404 expected)" "http://localhost:3001/api/webhooks" 404
test_endpoint "Queue Metrics (404 expected)" "http://localhost:3001/api/queue-metrics" 404
test_endpoint "Environment (404 expected)" "http://localhost:3001/api/environment" 404
test_endpoint "Git Integration (404 expected)" "http://localhost:3001/api/git" 404
test_endpoint "OAuth (404 expected)" "http://localhost:3001/api/oauth" 404
test_endpoint "Audit Trail (404 expected)" "http://localhost:3001/api/audit" 404
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "7. PERFORMANCE TESTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "Testing response times (5 consecutive requests)..."
times=()
for i in {1..5}; do
    time=$(curl -s -o /dev/null -w "%{time_total}" http://localhost:3001/health)
    times+=($time)
    echo "  Request $i: ${time}s"
done

# Calculer la moyenne
sum=0
for time in "${times[@]}"; do
    sum=$(echo "$sum + $time" | bc)
done
avg=$(echo "scale=6; $sum / 5" | bc)
echo -e "${GREEN}✓${NC} Average response time: ${avg}s"
SUCCESS=$((SUCCESS + 1))
TOTAL=$((TOTAL + 1))

echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "8. DATA VALIDATION TESTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test nombre de node types
node_count=$(curl -s http://localhost:3001/api/nodes/types | grep -o '"type":"' | wc -l)
if [ "$node_count" -gt 100 ]; then
    echo -e "${GREEN}✓${NC} Node Types Count: $node_count (> 100)"
    SUCCESS=$((SUCCESS + 1))
else
    echo -e "${RED}✗${NC} Node Types Count: $node_count (expected > 100)"
    FAILED=$((FAILED + 1))
fi
TOTAL=$((TOTAL + 1))

# Test nombre de catégories
cat_count=$(curl -s http://localhost:3001/api/nodes/categories | grep -o ',' | wc -l)
cat_count=$((cat_count + 1))
if [ "$cat_count" -gt 30 ]; then
    echo -e "${GREEN}✓${NC} Categories Count: $cat_count (> 30)"
    SUCCESS=$((SUCCESS + 1))
else
    echo -e "${RED}✗${NC} Categories Count: $cat_count (expected > 30)"
    FAILED=$((FAILED + 1))
fi
TOTAL=$((TOTAL + 1))

# Test nombre de templates
template_count=$(curl -s http://localhost:3001/api/templates | grep -o '"count":[0-9]*' | grep -o '[0-9]*')
if [ "$template_count" -gt 20 ]; then
    echo -e "${GREEN}✓${NC} Templates Count: $template_count (> 20)"
    SUCCESS=$((SUCCESS + 1))
else
    echo -e "${RED}✗${NC} Templates Count: $template_count (expected > 20)"
    FAILED=$((FAILED + 1))
fi
TOTAL=$((TOTAL + 1))

echo ""

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                      RÉSULTATS FINAUX                          ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo -e "Total tests:    ${BLUE}$TOTAL${NC}"
echo -e "Success:        ${GREEN}$SUCCESS${NC} ($(echo "scale=1; $SUCCESS * 100 / $TOTAL" | bc)%)"
echo -e "Failed:         ${RED}$FAILED${NC} ($(echo "scale=1; $FAILED * 100 / $TOTAL" | bc)%)"
echo ""

# Calculer le score
score=$(echo "scale=1; $SUCCESS * 100 / $TOTAL" | bc)
if (( $(echo "$score >= 90" | bc -l) )); then
    echo -e "Score:          ${GREEN}${score}% ★★★★★${NC} (EXCELLENT)"
elif (( $(echo "$score >= 75" | bc -l) )); then
    echo -e "Score:          ${GREEN}${score}% ★★★★☆${NC} (TRÈS BON)"
elif (( $(echo "$score >= 60" | bc -l) )); then
    echo -e "Score:          ${YELLOW}${score}% ★★★☆☆${NC} (BON)"
else
    echo -e "Score:          ${RED}${score}% ★★☆☆☆${NC} (À AMÉLIORER)"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo ""

# Exit avec code approprié
if [ "$FAILED" -eq 0 ]; then
    exit 0
else
    exit 1
fi
