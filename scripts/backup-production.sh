#!/bin/bash
###############################################################################
# Production Backup Script
# Automated backup for PostgreSQL, Redis, and application data
###############################################################################

set -e  # Exit on error
set -u  # Exit on undefined variable
set -o pipefail  # Exit on pipe failure

# Configuration
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${BACKUP_DIR:-/backups}"
S3_BUCKET="${S3_BUCKET:-s3://workflow-backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"
BACKUP_NAME="backup_${TIMESTAMP}"

# Database Configuration
DB_HOST="${DATABASE_HOST:-localhost}"
DB_PORT="${DATABASE_PORT:-5432}"
DB_NAME="${DATABASE_NAME:-workflow}"
DB_USER="${DATABASE_USER:-workflow}"

# Redis Configuration
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Send Slack notification
send_slack_notification() {
    local message=$1
    local status=${2:-info}

    if [ -n "$SLACK_WEBHOOK" ]; then
        local color="good"
        [ "$status" = "error" ] && color="danger"
        [ "$status" = "warning" ] && color="warning"

        curl -X POST "$SLACK_WEBHOOK" \
            -H 'Content-Type: application/json' \
            -d "{
                \"attachments\": [{
                    \"color\": \"$color\",
                    \"title\": \"Workflow Backup\",
                    \"text\": \"$message\",
                    \"footer\": \"Backup System\",
                    \"ts\": $(date +%s)
                }]
            }" 2>/dev/null || log_warn "Failed to send Slack notification"
    fi
}

# Create backup directory
create_backup_dir() {
    log_info "Creating backup directory: ${BACKUP_DIR}/${BACKUP_NAME}"
    mkdir -p "${BACKUP_DIR}/${BACKUP_NAME}"
}

# Backup PostgreSQL database
backup_postgres() {
    log_info "Backing up PostgreSQL database..."

    local backup_file="${BACKUP_DIR}/${BACKUP_NAME}/postgres_${TIMESTAMP}.sql.gz"

    if command -v pg_dump &> /dev/null; then
        PGPASSWORD="${DATABASE_PASSWORD}" pg_dump \
            -h "$DB_HOST" \
            -p "$DB_PORT" \
            -U "$DB_USER" \
            -d "$DB_NAME" \
            --verbose \
            --no-owner \
            --no-acl \
            | gzip > "$backup_file"

        log_info "✅ PostgreSQL backup completed: $(du -h "$backup_file" | cut -f1)"
    else
        log_warn "pg_dump not found, skipping PostgreSQL backup"
    fi
}

# Backup Redis data
backup_redis() {
    log_info "Backing up Redis data..."

    local backup_file="${BACKUP_DIR}/${BACKUP_NAME}/redis_${TIMESTAMP}.rdb"

    if command -v redis-cli &> /dev/null; then
        # Trigger Redis save
        redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" BGSAVE

        # Wait for save to complete
        sleep 2

        # Copy the RDB file
        if [ -f "/var/lib/redis/dump.rdb" ]; then
            cp /var/lib/redis/dump.rdb "$backup_file"
            log_info "✅ Redis backup completed: $(du -h "$backup_file" | cut -f1)"
        else
            log_warn "Redis dump.rdb not found"
        fi
    else
        log_warn "redis-cli not found, skipping Redis backup"
    fi
}

# Backup application files
backup_app_data() {
    log_info "Backing up application data..."

    local backup_file="${BACKUP_DIR}/${BACKUP_NAME}/app_data_${TIMESTAMP}.tar.gz"
    local app_dirs="/app/uploads /app/public/uploads /app/data"

    # Find directories that exist
    local existing_dirs=""
    for dir in $app_dirs; do
        [ -d "$dir" ] && existing_dirs="$existing_dirs $dir"
    done

    if [ -n "$existing_dirs" ]; then
        tar -czf "$backup_file" $existing_dirs 2>/dev/null || log_warn "Some app directories not found"
        log_info "✅ Application data backup completed: $(du -h "$backup_file" | cut -f1)"
    else
        log_warn "No application data directories found"
    fi
}

# Create backup manifest
create_manifest() {
    log_info "Creating backup manifest..."

    local manifest_file="${BACKUP_DIR}/${BACKUP_NAME}/manifest.json"

    cat > "$manifest_file" <<EOF
{
  "backup_id": "${BACKUP_NAME}",
  "timestamp": "${TIMESTAMP}",
  "date": "$(date -Iseconds)",
  "hostname": "$(hostname)",
  "database": {
    "host": "${DB_HOST}",
    "port": ${DB_PORT},
    "name": "${DB_NAME}"
  },
  "redis": {
    "host": "${REDIS_HOST}",
    "port": ${REDIS_PORT}
  },
  "files": $(ls -1 "${BACKUP_DIR}/${BACKUP_NAME}" | jq -R -s -c 'split("\n") | map(select(length > 0))'),
  "size_bytes": $(du -sb "${BACKUP_DIR}/${BACKUP_NAME}" | cut -f1),
  "size_human": "$(du -sh "${BACKUP_DIR}/${BACKUP_NAME}" | cut -f1)"
}
EOF

    log_info "✅ Manifest created"
}

# Verify backup integrity
verify_backup() {
    log_info "Verifying backup integrity..."

    local postgres_backup="${BACKUP_DIR}/${BACKUP_NAME}/postgres_${TIMESTAMP}.sql.gz"

    if [ -f "$postgres_backup" ]; then
        if gunzip -t "$postgres_backup" 2>/dev/null; then
            log_info "✅ PostgreSQL backup integrity verified"
        else
            log_error "PostgreSQL backup is corrupted!"
            return 1
        fi
    fi

    log_info "✅ Backup verification completed"
}

# Upload to S3
upload_to_s3() {
    log_info "Uploading backup to S3..."

    if command -v aws &> /dev/null; then
        aws s3 cp "${BACKUP_DIR}/${BACKUP_NAME}/" "${S3_BUCKET}/${BACKUP_NAME}/" \
            --recursive \
            --storage-class STANDARD_IA \
            --metadata "backup_date=${TIMESTAMP},hostname=$(hostname)"

        log_info "✅ Backup uploaded to ${S3_BUCKET}/${BACKUP_NAME}/"
    else
        log_warn "AWS CLI not found, skipping S3 upload"
    fi
}

# Cleanup old backups
cleanup_old_backups() {
    log_info "Cleaning up backups older than ${RETENTION_DAYS} days..."

    # Local cleanup
    find "${BACKUP_DIR}" -type d -name "backup_*" -mtime +${RETENTION_DAYS} -exec rm -rf {} + 2>/dev/null || true

    # S3 cleanup (if AWS CLI available)
    if command -v aws &> /dev/null; then
        local cutoff_date=$(date -d "${RETENTION_DAYS} days ago" +%Y%m%d)
        aws s3 ls "${S3_BUCKET}/" | while read -r line; do
            local backup_name=$(echo "$line" | awk '{print $2}' | sed 's/\///')
            if [[ "$backup_name" =~ backup_([0-9]{8}) ]]; then
                local backup_date="${BASH_REMATCH[1]}"
                if [ "$backup_date" -lt "$cutoff_date" ]; then
                    aws s3 rm "${S3_BUCKET}/${backup_name}" --recursive
                    log_info "Deleted old S3 backup: ${backup_name}"
                fi
            fi
        done
    fi

    log_info "✅ Cleanup completed"
}

# Main execution
main() {
    log_info "========================================="
    log_info "Starting backup: ${BACKUP_NAME}"
    log_info "========================================="

    send_slack_notification "🔄 Backup started: ${BACKUP_NAME}" "info"

    # Execute backup steps
    create_backup_dir
    backup_postgres
    backup_redis
    backup_app_data
    create_manifest
    verify_backup
    upload_to_s3
    cleanup_old_backups

    # Calculate total backup size
    local total_size=$(du -sh "${BACKUP_DIR}/${BACKUP_NAME}" | cut -f1)

    log_info "========================================="
    log_info "✅ Backup completed successfully!"
    log_info "   Backup ID: ${BACKUP_NAME}"
    log_info "   Total Size: ${total_size}"
    log_info "   Location: ${BACKUP_DIR}/${BACKUP_NAME}"
    log_info "========================================="

    send_slack_notification "✅ Backup completed successfully\nBackup ID: ${BACKUP_NAME}\nSize: ${total_size}" "good"

    # Write success marker
    echo "SUCCESS" > "${BACKUP_DIR}/${BACKUP_NAME}/.success"
}

# Error handler
error_handler() {
    log_error "Backup failed at line $1"
    send_slack_notification "❌ Backup failed at line $1" "error"
    exit 1
}

# Set error trap
trap 'error_handler $LINENO' ERR

# Run main function
main "$@"
