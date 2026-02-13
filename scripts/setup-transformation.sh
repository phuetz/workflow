#!/bin/bash
# PLAN C - TRANSFORMATION SETUP SCRIPT
# Execute immediately to setup transformation environment

set -e  # Exit on error

echo "🚀 PLAN C - TRANSFORMATION SETUP"
echo "================================="
echo "Start Time: $(date)"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Create transformation directory structure
echo -e "${BLUE}📁 Creating transformation directory structure...${NC}"
mkdir -p transformation/{scripts,docs,monitoring,backups,reports,fixes,configs,templates,metrics}

# Create necessary subdirectories
mkdir -p transformation/monitoring/{prometheus,grafana,alerts}
mkdir -p transformation/scripts/{fixes,automation,health}
mkdir -p transformation/reports/{daily,weekly,metrics}

echo -e "${GREEN}✅ Directory structure created${NC}"

# Create monitoring Docker Compose file
echo -e "${BLUE}🐳 Creating Docker monitoring setup...${NC}"
cat > transformation/monitoring/docker-compose.yml << 'EOF'
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
    restart: unless-stopped
    networks:
      - monitoring

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=transformation2024
      - GF_INSTALL_PLUGINS=redis-app
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana:/etc/grafana/provisioning
    restart: unless-stopped
    networks:
      - monitoring

  alertmanager:
    image: prom/alertmanager:latest
    container_name: alertmanager
    ports:
      - "9093:9093"
    volumes:
      - ./alerts/alertmanager.yml:/etc/alertmanager/alertmanager.yml
    restart: unless-stopped
    networks:
      - monitoring

  node-exporter:
    image: prom/node-exporter:latest
    container_name: node-exporter
    ports:
      - "9100:9100"
    restart: unless-stopped
    networks:
      - monitoring

networks:
  monitoring:
    driver: bridge

volumes:
  prometheus_data:
  grafana_data:
EOF

# Create Prometheus configuration
cat > transformation/monitoring/prometheus/prometheus.yml << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']

rule_files:
  - "alert_rules.yml"

scrape_configs:
  - job_name: 'node'
    static_configs:
      - targets: ['node-exporter:9100']

  - job_name: 'workflow-api'
    static_configs:
      - targets: ['host.docker.internal:3000']
    metrics_path: '/metrics'
EOF

# Create alert rules
cat > transformation/monitoring/prometheus/alert_rules.yml << 'EOF'
groups:
  - name: critical_alerts
    interval: 30s
    rules:
      - alert: HighErrorRate
        expr: rate(errors_total[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is above 5% for the last 5 minutes"

      - alert: MemoryLeak
        expr: process_resident_memory_bytes > 4e9
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Possible memory leak"
          description: "Memory usage above 4GB for 10 minutes"

      - alert: SlowResponse
        expr: http_request_duration_seconds{quantile="0.95"} > 0.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Slow response times"
          description: "95th percentile latency above 500ms"

      - alert: ServiceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service is down"
          description: "{{ $labels.job }} has been down for more than 1 minute"
EOF

# Create AlertManager configuration
cat > transformation/monitoring/alerts/alertmanager.yml << 'EOF'
global:
  resolve_timeout: 5m

route:
  group_by: ['alertname', 'cluster', 'service']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  receiver: 'default'

receivers:
  - name: 'default'
    webhook_configs:
      - url: 'http://localhost:5001/alerts'
        send_resolved: true
EOF

# Create health check script
echo -e "${BLUE}📝 Creating health check script...${NC}"
cat > transformation/scripts/health/daily-health-check.sh << 'EOF'
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
EOF

chmod +x transformation/scripts/health/daily-health-check.sh

# Create initial report template
echo -e "${BLUE}📄 Creating report template...${NC}"
cat > transformation/reports/report-template.md << 'EOF'
# Transformation Report - [DATE]

## 📊 Executive Summary
- **Status**: [🟢 ON TRACK | 🟡 ATTENTION | 🔴 CRITICAL]
- **Progress**: [X]% complete
- **Budget**: [X]€ of [Y]€ used
- **Timeline**: Week [X] of 26

## ✅ Completed This Period
- [ ] Task 1
- [ ] Task 2
- [ ] Task 3

## 🚧 In Progress
- [ ] Task 1 (X% complete)
- [ ] Task 2 (X% complete)

## ⚠️ Issues & Risks
| Issue | Impact | Mitigation | Status |
|-------|--------|------------|--------|
| | | | |

## 📈 Key Metrics
| Metric | Target | Actual | Trend |
|--------|--------|--------|-------|
| Uptime | 99% | X% | ↗️/↘️ |
| Response Time | <500ms | Xms | ↗️/↘️ |
| Error Rate | <5% | X% | ↗️/↘️ |
| Test Coverage | >40% | X% | ↗️/↘️ |

## 📅 Next Steps
1. 
2. 
3. 

## 💰 Financial Summary
- Spent this period: €X
- Total spent: €X
- Remaining budget: €X
- Projected savings: €X

## 📝 Notes
[Additional notes and observations]
EOF

# Create backup script
echo -e "${BLUE}💾 Creating backup script...${NC}"
cat > transformation/scripts/automation/backup.sh << 'EOF'
#!/bin/bash
# Automated Backup Script

BACKUP_DIR="transformation/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "💾 Starting backup at $(date)..."

# Database backup
if [ ! -z "$DATABASE_URL" ]; then
  echo "Backing up database..."
  pg_dump $DATABASE_URL > "$BACKUP_DIR/db_backup_$TIMESTAMP.sql"
  gzip "$BACKUP_DIR/db_backup_$TIMESTAMP.sql"
  echo "✅ Database backed up"
fi

# Code backup
echo "Backing up code..."
tar -czf "$BACKUP_DIR/code_backup_$TIMESTAMP.tar.gz" \
  --exclude=node_modules \
  --exclude=dist \
  --exclude=.git \
  src/ package.json tsconfig.json

echo "✅ Code backed up"

# Clean old backups (keep last 7 days)
find "$BACKUP_DIR" -name "*.gz" -mtime +7 -delete
echo "✅ Old backups cleaned"

echo "✅ Backup complete!"
EOF

chmod +x transformation/scripts/automation/backup.sh

# Create environment template
echo -e "${BLUE}⚙️ Creating environment template...${NC}"
cat > .env.transformation << 'EOF'
# Transformation Environment Variables
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/workflow

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Security
JWT_SECRET=change-this-secret-in-production
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100

# Monitoring
METRICS_ENABLED=true
LOG_LEVEL=info

# Performance
CACHE_TTL=300
MAX_WORKERS=4
EOF

# Create main execution script
echo -e "${BLUE}🚀 Creating main execution script...${NC}"
cat > transformation/execute-plan-c.sh << 'EOF'
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
EOF

chmod +x transformation/execute-plan-c.sh

# Summary
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ TRANSFORMATION SETUP COMPLETE!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo ""
echo "📁 Structure created:"
echo "  transformation/"
echo "  ├── scripts/"
echo "  ├── monitoring/"
echo "  ├── backups/"
echo "  ├── reports/"
echo "  └── ..."
echo ""
echo "🚀 To start transformation:"
echo "  1. Review and update .env.transformation"
echo "  2. Run: ./transformation/execute-plan-c.sh"
echo ""
echo "📊 Monitoring will be available at:"
echo "  - Prometheus: http://localhost:9090"
echo "  - Grafana: http://localhost:3001"
echo ""
echo -e "${YELLOW}⚠️  Don't forget to:${NC}"
echo "  - Update database connection in .env.transformation"
echo "  - Install required npm packages"
echo "  - Review security settings"
echo ""
echo -e "${GREEN}Good luck with the transformation! 🚀${NC}"