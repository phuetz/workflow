#!/bin/bash

echo "=================================="
echo "Monitoring & Observability Setup Verification"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

verify_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
        return 0
    else
        echo -e "${RED}✗${NC} $1 (missing)"
        return 1
    fi
}

echo "Backend Monitoring Components:"
verify_file "src/backend/monitoring/EnhancedLogger.ts"
verify_file "src/backend/monitoring/OpenTelemetryTracing.ts"
verify_file "src/backend/monitoring/AlertingSystem.ts"
verify_file "src/backend/monitoring/HealthCheckSystem.ts"
verify_file "src/backend/monitoring/SLAMonitoring.ts"
verify_file "src/backend/monitoring/WorkflowDebugger.ts"
verify_file "src/backend/monitoring/index.ts"

echo ""
echo "Prometheus Configuration:"
verify_file "monitoring/prometheus.yml"
verify_file "monitoring/alert_rules.yml"
verify_file "monitoring/recording_rules.yml"

echo ""
echo "Grafana Configuration:"
verify_file "monitoring/grafana/dashboards/comprehensive-monitoring.json"
verify_file "monitoring/grafana/dashboards/workflow-overview.json"
verify_file "monitoring/grafana/datasources/datasources.yml"

echo ""
echo "Documentation:"
verify_file "monitoring/README_OBSERVABILITY.md"
verify_file "AGENT5_MONITORING_OBSERVABILITY_REPORT.md"

echo ""
echo "Existing Components (Enhanced):"
verify_file "src/monitoring/PrometheusMonitoring.ts"
verify_file "src/utils/logger.ts"
verify_file "src/backend/api/routes/health.ts"

echo ""
echo "=================================="
echo "Verification Complete"
echo "=================================="
