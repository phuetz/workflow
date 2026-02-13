#!/bin/bash
# PLAN C - Main Execution Script

set -e

echo "🚀 PLAN C - TRANSFORMATION EXECUTION"
echo "====================================="
echo "Start Time: $(date)"
echo ""

# Source environment
if [ -f .env.transformation ]; then
  export $(cat .env.transformation | xargs)
fi

# Step 1: Compile check
echo "📦 Checking compilation..."
npm run build || exit 1

# Step 2: Run tests
echo "🧪 Running tests..."
npm test || true

# Step 3: Start monitoring
echo "📊 Starting monitoring..."
cd transformation/monitoring
docker-compose up -d
cd ../..

# Step 4: Health check
echo "🔍 Running health check..."
./transformation/scripts/health/daily-health-check.sh

echo ""
echo "✅ PLAN C INITIALIZATION COMPLETE"
echo ""
echo "📊 Access points:"
echo "  - Application: http://localhost:3000"
echo "  - Prometheus: http://localhost:9090"
echo "  - Grafana: http://localhost:3001 (admin/transformation2024)"
echo "  - Alerts: http://localhost:9093"
echo ""
echo "📝 Next steps:"
echo "  1. Review monitoring dashboards"
echo "  2. Check application logs"
echo "  3. Run performance tests"
echo ""
