#!/bin/sh
# ============================================
# Automated Backup Script
# Workflow Automation Platform
# ============================================

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
S3_BUCKET="${S3_BUCKET:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo "${RED}[ERROR]${NC} $1"
}

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

# ============================================
# Backup PostgreSQL
# ============================================
backup_postgres() {
    log_info "Starting PostgreSQL backup..."

    POSTGRES_BACKUP="${BACKUP_DIR}/postgres_${TIMESTAMP}.sql.gz"

    if command -v pg_dump >/dev/null 2>&1; then
        pg_dump -h postgres -U ${POSTGRES_USER:-workflow} ${POSTGRES_DB:-workflow} | gzip > "${POSTGRES_BACKUP}"
        log_info "PostgreSQL backup completed: ${POSTGRES_BACKUP}"
    else
        log_error "pg_dump not found. Skipping PostgreSQL backup."
        return 1
    fi
}

# ============================================
# Backup Redis
# ============================================
backup_redis() {
    log_info "Starting Redis backup..."

    REDIS_BACKUP="${BACKUP_DIR}/redis_${TIMESTAMP}.rdb"

    if [ -f "/backup/redis/dump.rdb" ]; then
        cp /backup/redis/dump.rdb "${REDIS_BACKUP}"
        gzip "${REDIS_BACKUP}"
        log_info "Redis backup completed: ${REDIS_BACKUP}.gz"
    else
        log_warn "Redis dump file not found. Skipping Redis backup."
    fi
}

# ============================================
# Backup Uploads
# ============================================
backup_uploads() {
    log_info "Starting uploads backup..."

    UPLOADS_BACKUP="${BACKUP_DIR}/uploads_${TIMESTAMP}.tar.gz"

    if [ -d "/backup/uploads" ]; then
        tar -czf "${UPLOADS_BACKUP}" -C /backup uploads/
        log_info "Uploads backup completed: ${UPLOADS_BACKUP}"
    else
        log_warn "Uploads directory not found. Skipping uploads backup."
    fi
}

# ============================================
# Upload to S3 (if configured)
# ============================================
upload_to_s3() {
    if [ -n "${S3_BUCKET}" ] && command -v aws >/dev/null 2>&1; then
        log_info "Uploading backups to S3..."

        aws s3 sync "${BACKUP_DIR}/" "s3://${S3_BUCKET}/backups/" \
            --exclude "*" \
            --include "*${TIMESTAMP}*" \
            --storage-class STANDARD_IA

        log_info "S3 upload completed"
    else
        log_warn "S3 backup not configured or AWS CLI not available"
    fi
}

# ============================================
# Cleanup old backups
# ============================================
cleanup_old_backups() {
    log_info "Cleaning up backups older than ${RETENTION_DAYS} days..."

    find "${BACKUP_DIR}" -type f -mtime +${RETENTION_DAYS} -delete

    log_info "Cleanup completed"
}

# ============================================
# Main execution
# ============================================
main() {
    log_info "=== Backup started at $(date) ==="

    # Run backups
    backup_postgres || log_error "PostgreSQL backup failed"
    backup_redis || log_warn "Redis backup skipped"
    backup_uploads || log_warn "Uploads backup skipped"

    # Upload to S3 if configured
    upload_to_s3

    # Cleanup old backups
    cleanup_old_backups

    log_info "=== Backup completed at $(date) ==="
}

# Run main function
main

exit 0
