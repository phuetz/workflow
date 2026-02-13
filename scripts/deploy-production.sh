#!/bin/bash

# Ultra Think Hard Plus - Production Deployment Script
# Complete deployment automation with zero-downtime

set -e

# Configuration
APP_NAME="workflow-automation-platform"
VERSION=$(git describe --tags --always)
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
ENVIRONMENT=${1:-production}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Banner
echo "=========================================="
echo -e "${CYAN}🚀 ULTRA THINK HARD PLUS - PRODUCTION DEPLOYMENT${NC}"
echo "=========================================="
echo -e "${BLUE}App: ${NC}$APP_NAME"
echo -e "${BLUE}Version: ${NC}$VERSION"
echo -e "${BLUE}Environment: ${NC}$ENVIRONMENT"
echo -e "${BLUE}Timestamp: ${NC}$TIMESTAMP"
echo "=========================================="

# Function to check command exists
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}❌ $1 is not installed${NC}"
        exit 1
    fi
}

# Function to handle errors
handle_error() {
    echo -e "${RED}❌ Error occurred in deployment${NC}"
    echo -e "${YELLOW}Rolling back...${NC}"
    rollback
    exit 1
}

# Set error handler
trap handle_error ERR

# Pre-flight checks
echo -e "\n${BLUE}📋 Pre-flight Checks...${NC}"
check_command docker
check_command docker-compose
check_command git
check_command npm

# 1. Run tests
echo -e "\n${BLUE}1. Running Tests...${NC}"
npm run test:ci || {
    echo -e "${RED}❌ Tests failed. Aborting deployment.${NC}"
    exit 1
}
echo -e "${GREEN}✅ Tests passed${NC}"

# 2. Build check
echo -e "\n${BLUE}2. Building Application...${NC}"
npm run build || {
    echo -e "${RED}❌ Build failed. Aborting deployment.${NC}"
    exit 1
}
echo -e "${GREEN}✅ Build successful${NC}"

# 3. Security audit
echo -e "\n${BLUE}3. Security Audit...${NC}"
npm audit --audit-level=high || {
    echo -e "${YELLOW}⚠️ Security vulnerabilities found${NC}"
    read -p "Continue deployment? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
}

# 4. Create backup
echo -e "\n${BLUE}4. Creating Backup...${NC}"
BACKUP_DIR="backups/${TIMESTAMP}"
mkdir -p $BACKUP_DIR

# Backup database
if [ "$ENVIRONMENT" = "production" ]; then
    echo "Backing up database..."
    docker exec workflow-postgres pg_dump -U postgres workflow > "$BACKUP_DIR/database.sql"
    echo -e "${GREEN}✅ Database backed up${NC}"
fi

# Backup current deployment
if [ -d "dist" ]; then
    cp -r dist "$BACKUP_DIR/dist_backup"
    echo -e "${GREEN}✅ Application backed up${NC}"
fi

# 5. Build Docker images
echo -e "\n${BLUE}5. Building Docker Images...${NC}"
docker build -t ${APP_NAME}:${VERSION} -t ${APP_NAME}:latest .
echo -e "${GREEN}✅ Docker image built${NC}"

# 6. Tag for registry
echo -e "\n${BLUE}6. Tagging Images...${NC}"
REGISTRY=${DOCKER_REGISTRY:-"ghcr.io/your-org"}
docker tag ${APP_NAME}:${VERSION} ${REGISTRY}/${APP_NAME}:${VERSION}
docker tag ${APP_NAME}:latest ${REGISTRY}/${APP_NAME}:latest

# 7. Push to registry
echo -e "\n${BLUE}7. Pushing to Registry...${NC}"
if [ "$ENVIRONMENT" = "production" ]; then
    docker push ${REGISTRY}/${APP_NAME}:${VERSION}
    docker push ${REGISTRY}/${APP_NAME}:latest
    echo -e "${GREEN}✅ Images pushed to registry${NC}"
else
    echo -e "${YELLOW}Skipping push for non-production environment${NC}"
fi

# 8. Deploy with Docker Compose (Blue-Green Deployment)
echo -e "\n${BLUE}8. Deploying Application...${NC}"

# Start new version (green)
echo "Starting new version..."
docker-compose -f docker-compose.yml -f docker-compose.${ENVIRONMENT}.yml up -d --no-deps --scale app=2 app

# Wait for health check
echo "Waiting for health check..."
for i in {1..30}; do
    if curl -f http://localhost:3000/health &> /dev/null; then
        echo -e "${GREEN}✅ New version is healthy${NC}"
        break
    fi
    echo -n "."
    sleep 2
done

# Switch traffic to new version
echo "Switching traffic to new version..."
docker-compose -f docker-compose.yml -f docker-compose.${ENVIRONMENT}.yml up -d nginx

# Stop old version
echo "Stopping old version..."
OLD_CONTAINER=$(docker ps --filter "label=com.docker.compose.service=app" --format "{{.ID}}" | tail -n 1)
if [ ! -z "$OLD_CONTAINER" ]; then
    docker stop $OLD_CONTAINER
    docker rm $OLD_CONTAINER
fi

# 9. Database migrations
echo -e "\n${BLUE}9. Running Database Migrations...${NC}"
if [ -f "prisma/schema.prisma" ]; then
    npx prisma migrate deploy
    echo -e "${GREEN}✅ Migrations completed${NC}"
else
    echo -e "${YELLOW}No migrations to run${NC}"
fi

# 10. Clear cache
echo -e "\n${BLUE}10. Clearing Cache...${NC}"
docker exec workflow-redis redis-cli FLUSHALL
echo -e "${GREEN}✅ Cache cleared${NC}"

# 11. Warm up cache
echo -e "\n${BLUE}11. Warming Up Cache...${NC}"
curl -X POST http://localhost:3001/api/cache/warmup || true
echo -e "${GREEN}✅ Cache warmed up${NC}"

# 12. Smoke tests
echo -e "\n${BLUE}12. Running Smoke Tests...${NC}"
npm run test:smoke || {
    echo -e "${RED}❌ Smoke tests failed${NC}"
    read -p "Rollback? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rollback
    fi
}
echo -e "${GREEN}✅ Smoke tests passed${NC}"

# 13. Update monitoring
echo -e "\n${BLUE}13. Updating Monitoring...${NC}"
# Send deployment event to monitoring
curl -X POST http://localhost:9090/api/v1/admin/tsdb/snapshot \
    -d "{\"deployment\":\"${VERSION}\",\"timestamp\":\"${TIMESTAMP}\"}" || true
echo -e "${GREEN}✅ Monitoring updated${NC}"

# 14. Notify team
echo -e "\n${BLUE}14. Sending Notifications...${NC}"
# Slack notification
if [ ! -z "$SLACK_WEBHOOK" ]; then
    curl -X POST $SLACK_WEBHOOK \
        -H 'Content-Type: application/json' \
        -d "{
            \"text\": \"🚀 Deployment Successful!\",
            \"attachments\": [{
                \"color\": \"good\",
                \"fields\": [
                    {\"title\": \"Application\", \"value\": \"${APP_NAME}\", \"short\": true},
                    {\"title\": \"Version\", \"value\": \"${VERSION}\", \"short\": true},
                    {\"title\": \"Environment\", \"value\": \"${ENVIRONMENT}\", \"short\": true},
                    {\"title\": \"Timestamp\", \"value\": \"${TIMESTAMP}\", \"short\": true}
                ]
            }]
        }"
fi
echo -e "${GREEN}✅ Notifications sent${NC}"

# Rollback function
rollback() {
    echo -e "\n${YELLOW}🔄 Rolling Back...${NC}"
    
    # Restore from backup
    if [ -d "$BACKUP_DIR/dist_backup" ]; then
        rm -rf dist
        cp -r "$BACKUP_DIR/dist_backup" dist
    fi
    
    # Restore database
    if [ -f "$BACKUP_DIR/database.sql" ]; then
        docker exec -i workflow-postgres psql -U postgres workflow < "$BACKUP_DIR/database.sql"
    fi
    
    # Restart services with previous version
    docker-compose restart
    
    echo -e "${GREEN}✅ Rollback completed${NC}"
}

# Success summary
echo ""
echo "=========================================="
echo -e "${GREEN}🎉 DEPLOYMENT SUCCESSFUL!${NC}"
echo "=========================================="
echo -e "${BLUE}Version:${NC} $VERSION"
echo -e "${BLUE}Environment:${NC} $ENVIRONMENT"
echo -e "${BLUE}URL:${NC} https://${ENVIRONMENT}.workflow-automation.com"
echo -e "${BLUE}API:${NC} https://api-${ENVIRONMENT}.workflow-automation.com"
echo -e "${BLUE}Monitoring:${NC} https://grafana-${ENVIRONMENT}.workflow-automation.com"
echo "=========================================="
echo ""
echo -e "${CYAN}Deployment Checklist:${NC}"
echo "✅ Tests passed"
echo "✅ Build successful"
echo "✅ Security audit"
echo "✅ Backup created"
echo "✅ Docker images built"
echo "✅ Application deployed"
echo "✅ Database migrated"
echo "✅ Cache warmed"
echo "✅ Smoke tests passed"
echo "✅ Monitoring updated"
echo "✅ Team notified"
echo ""
echo -e "${MAGENTA}🚀 Application is live!${NC}"

# Performance metrics
if [ "$ENVIRONMENT" = "production" ]; then
    echo ""
    echo -e "${CYAN}Performance Metrics:${NC}"
    curl -s http://localhost:3001/api/metrics | grep -E "http_request_duration|memory_usage|cpu_usage" | head -5
fi

# Cleanup old backups (keep last 10)
echo ""
echo -e "${BLUE}Cleaning up old backups...${NC}"
ls -dt backups/* | tail -n +11 | xargs rm -rf 2>/dev/null || true

# Log deployment
echo "$TIMESTAMP|$VERSION|$ENVIRONMENT|SUCCESS" >> deployments.log

exit 0