#!/bin/bash

###############################################################################
# Memory Optimization Script
#
# This script implements memory optimization recommendations.
#
# ⚠️ WARNING: This script is NOT AUTOMATIC. It must be run manually by a human
# after reviewing the recommendation in the dashboard.
#
# Usage:
#   ./memory-optimization.sh --dry-run    # Preview what will be done
#   ./memory-optimization.sh              # Actually apply changes
#
# Pre-requisites:
#   - Review recommendation in dashboard
#   - Check current memory usage: pm2 monit
#   - Backup current configuration
#   - Test in staging first
###############################################################################

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DRY_RUN=false
BACKUP_DIR="/backup/$(date +%Y%m%d_%H%M%S)"
NODE_MAX_OLD_SPACE_SIZE=4096  # 4GB
PM2_APP_NAME="workflow-app"

# Parse arguments
if [[ "$1" == "--dry-run" ]]; then
  DRY_RUN=true
  echo -e "${YELLOW}🔍 DRY RUN MODE - No changes will be made${NC}\n"
fi

###############################################################################
# Functions
###############################################################################

log_info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
  echo -e "${RED}❌ $1${NC}"
}

confirm_action() {
  if [ "$DRY_RUN" = true ]; then
    return 0
  fi

  read -p "Continue with this action? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    log_error "Action cancelled by user"
    exit 1
  fi
}

backup_file() {
  local file=$1
  if [ ! -f "$file" ]; then
    log_warning "File does not exist: $file"
    return
  fi

  if [ "$DRY_RUN" = true ]; then
    log_info "Would backup: $file to $BACKUP_DIR/"
    return
  fi

  mkdir -p "$BACKUP_DIR"
  cp "$file" "$BACKUP_DIR/"
  log_success "Backed up: $file"
}

###############################################################################
# Pre-flight Checks
###############################################################################

log_info "Starting Memory Optimization Script"
log_info "Timestamp: $(date)"
echo

# Check if running as appropriate user
if [[ $EUID -eq 0 ]]; then
  log_error "This script should NOT be run as root"
  exit 1
fi

# Check if pm2 is installed
if ! command -v pm2 &> /dev/null; then
  log_error "pm2 is not installed. Please install it first."
  exit 1
fi

# Check current memory usage
log_info "Current Memory Usage:"
if command -v free &> /dev/null; then
  free -h
fi

# Check if app is running
if pm2 list | grep -q "$PM2_APP_NAME"; then
  log_success "App is running: $PM2_APP_NAME"
else
  log_warning "App is not running: $PM2_APP_NAME"
fi

echo

###############################################################################
# Step 1: Backup Current Configuration
###############################################################################

log_info "Step 1: Backing up current configuration"

backup_file "package.json"
backup_file "ecosystem.config.js"
backup_file "tsconfig.json"

if [ "$DRY_RUN" = false ]; then
  log_success "Backup completed: $BACKUP_DIR"
else
  log_info "Would create backup in: $BACKUP_DIR"
fi

echo

###############################################################################
# Step 2: Update Node.js Heap Size
###############################################################################

log_info "Step 2: Updating Node.js heap size to ${NODE_MAX_OLD_SPACE_SIZE}MB"

if [ "$DRY_RUN" = true ]; then
  log_info "Would update package.json scripts:"
  echo '  "start": "node --max-old-space-size=4096 dist/src/backend/api/server.js"'
  echo '  "dev:backend": "node --max-old-space-size=4096 -r tsx/register src/backend/api/server.ts"'
else
  log_warning "Manual step required:"
  echo "  Update package.json with:"
  echo '  "start": "node --max-old-space-size=4096 dist/src/backend/api/server.js"'
  echo '  "dev:backend": "node --max-old-space-size=4096 -r tsx/register src/backend/api/server.ts"'
  echo
  confirm_action
fi

echo

###############################################################################
# Step 3: Clear Caches
###############################################################################

log_info "Step 3: Clearing caches"

if [ "$DRY_RUN" = true ]; then
  log_info "Would clear Node.js cache"
  log_info "Would clear Redis cache (if available)"
else
  confirm_action

  # Clear npm cache
  log_info "Clearing npm cache..."
  npm cache clean --force
  log_success "npm cache cleared"

  # Clear Redis cache (if available)
  if command -v redis-cli &> /dev/null; then
    log_info "Clearing Redis cache..."
    redis-cli FLUSHDB
    log_success "Redis cache cleared"
  else
    log_warning "redis-cli not found, skipping Redis cache clear"
  fi
fi

echo

###############################################################################
# Step 4: Force Garbage Collection (if enabled)
###############################################################################

log_info "Step 4: Configuring garbage collection"

if [ "$DRY_RUN" = true ]; then
  log_info "Would enable --expose-gc flag for manual garbage collection"
else
  log_warning "Manual step required:"
  echo "  Add --expose-gc flag to Node.js startup if needed"
  echo "  This allows manual garbage collection via global.gc()"
fi

echo

###############################################################################
# Step 5: Restart Application
###############################################################################

log_info "Step 5: Restarting application"

if [ "$DRY_RUN" = true ]; then
  log_info "Would run: pm2 reload $PM2_APP_NAME --update-env"
else
  log_warning "This will reload the application"
  confirm_action

  log_info "Reloading application..."
  pm2 reload "$PM2_APP_NAME" --update-env
  log_success "Application reloaded"

  # Wait a few seconds for app to start
  sleep 5

  # Check status
  pm2 list
fi

echo

###############################################################################
# Step 6: Monitor Memory Usage
###############################################################################

log_info "Step 6: Monitoring memory usage"

if [ "$DRY_RUN" = true ]; then
  log_info "Would monitor memory usage for 5 minutes"
else
  log_info "Monitoring for 5 minutes..."
  log_info "Watch memory usage with: pm2 monit"
  log_info "Press Ctrl+C to stop monitoring early"
  echo

  for i in {1..10}; do
    echo "Check $i/10 (30 seconds interval)..."
    pm2 show "$PM2_APP_NAME" | grep -E "memory|cpu"

    if [ $i -lt 10 ]; then
      sleep 30
    fi
  done

  log_success "Monitoring complete"
fi

echo

###############################################################################
# Final Report
###############################################################################

log_info "Memory Optimization Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$DRY_RUN" = true ]; then
  echo "DRY RUN COMPLETED"
  echo
  echo "Actions that would be performed:"
  echo "  1. ✅ Backup current configuration"
  echo "  2. ⚠️  Update Node.js heap size to ${NODE_MAX_OLD_SPACE_SIZE}MB (manual)"
  echo "  3. ✅ Clear caches (npm, Redis)"
  echo "  4. ⚠️  Configure garbage collection (manual)"
  echo "  5. ✅ Restart application"
  echo "  6. ✅ Monitor memory usage"
  echo
  log_info "Review the actions above and run without --dry-run to apply"
else
  echo "OPTIMIZATION COMPLETED"
  echo
  echo "Actions performed:"
  echo "  1. ✅ Backed up configuration to: $BACKUP_DIR"
  echo "  2. ⚠️  Heap size update (requires manual step)"
  echo "  3. ✅ Cleared caches"
  echo "  4. ⚠️  GC configuration (requires manual step)"
  echo "  5. ✅ Application restarted"
  echo "  6. ✅ Memory monitored"
  echo
  log_success "Memory optimization complete!"
  log_info "Continue monitoring with: pm2 monit"
  log_info "Check logs with: pm2 logs $PM2_APP_NAME"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo

###############################################################################
# Rollback Instructions
###############################################################################

if [ "$DRY_RUN" = false ]; then
  log_warning "If issues occur, rollback with:"
  echo "  cp $BACKUP_DIR/package.json package.json"
  echo "  pm2 restart $PM2_APP_NAME"
fi

log_info "Script finished at: $(date)"
