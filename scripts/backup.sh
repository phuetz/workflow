#!/bin/bash

# Comprehensive Backup Script for Workflow Automation Platform
# Backs up database, files, configurations, and provides restore functionality

set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="workflow_backup_${TIMESTAMP}"

# Database settings
DB_HOST="${DB_HOST:-postgres}"
DB_NAME="${DB_NAME:-workflow}"
DB_USER="${DB_USER:-workflow}"
DB_PASSWORD="${DB_PASSWORD:-workflow123}"

# Notification settings
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"
EMAIL_TO="${EMAIL_TO:-}"

# Logging
LOG_FILE="${BACKUP_DIR}/backup.log"
exec 1> >(tee -a "${LOG_FILE}")
exec 2>&1

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

send_notification() {
    local status="$1"
    local message="$2"
    
    if [[ -n "${SLACK_WEBHOOK}" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🔄 Backup $status: $message\"}" \
            "${SLACK_WEBHOOK}" 2>/dev/null || true
    fi
    
    if [[ -n "${EMAIL_TO}" ]] && command -v mail >/dev/null; then
        echo "$message" | mail -s "Workflow Backup $status" "${EMAIL_TO}" || true
    fi
}

cleanup_old_backups() {
    log "Cleaning up backups older than ${RETENTION_DAYS} days..."
    find "${BACKUP_DIR}" -name "workflow_backup_*" -type d -mtime +${RETENTION_DAYS} -exec rm -rf {} + 2>/dev/null || true
    find "${BACKUP_DIR}" -name "*.tar.gz" -mtime +${RETENTION_DAYS} -delete 2>/dev/null || true
}

backup_database() {
    log "Starting database backup..."
    
    local db_backup_file="${BACKUP_DIR}/${BACKUP_NAME}/database.sql"
    mkdir -p "$(dirname "$db_backup_file")"
    
    # PostgreSQL backup
    PGPASSWORD="${DB_PASSWORD}" pg_dump \
        -h "${DB_HOST}" \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        --no-password \
        --clean \
        --if-exists \
        --create \
        --verbose \
        > "${db_backup_file}"
    
    # Compress database backup
    gzip "${db_backup_file}"
    
    log "Database backup completed: ${db_backup_file}.gz"
}

backup_files() {
    log "Starting file backup..."
    
    local files_backup_dir="${BACKUP_DIR}/${BACKUP_NAME}/files"
    mkdir -p "${files_backup_dir}"
    
    # Backup uploaded files if they exist
    if [[ -d "/app/uploads" ]]; then
        cp -r /app/uploads "${files_backup_dir}/" || true
    fi
    
    # Backup logs
    if [[ -d "/app/logs" ]]; then
        cp -r /app/logs "${files_backup_dir}/" || true
    fi
    
    # Backup configuration files
    local config_dir="${files_backup_dir}/config"
    mkdir -p "${config_dir}"
    
    [[ -f "/app/.env" ]] && cp /app/.env "${config_dir}/" || true
    [[ -f "/app/package.json" ]] && cp /app/package.json "${config_dir}/" || true
    [[ -f "/app/docker-compose.yml" ]] && cp /app/docker-compose.yml "${config_dir}/" || true
    
    log "File backup completed"
}

backup_redis() {
    log "Starting Redis backup..."
    
    local redis_backup_file="${BACKUP_DIR}/${BACKUP_NAME}/redis_dump.rdb"
    
    # Trigger Redis save and copy dump
    if command -v redis-cli >/dev/null; then
        redis-cli -h redis BGSAVE
        sleep 5  # Wait for background save to complete
        
        # Copy the dump file if it exists
        if docker exec workflow-redis test -f /data/dump.rdb; then
            docker cp workflow-redis:/data/dump.rdb "${redis_backup_file}"
            log "Redis backup completed: ${redis_backup_file}"
        else
            log "Warning: Redis dump file not found"
        fi
    else
        log "Warning: redis-cli not available, skipping Redis backup"
    fi
}

create_backup_archive() {
    log "Creating backup archive..."
    
    cd "${BACKUP_DIR}"
    tar -czf "${BACKUP_NAME}.tar.gz" "${BACKUP_NAME}/"
    rm -rf "${BACKUP_NAME}/"
    
    local archive_size=$(du -h "${BACKUP_NAME}.tar.gz" | cut -f1)
    log "Backup archive created: ${BACKUP_NAME}.tar.gz (${archive_size})"
}

verify_backup() {
    log "Verifying backup integrity..."
    
    local archive_file="${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
    
    if tar -tzf "${archive_file}" >/dev/null 2>&1; then
        log "Backup verification successful"
        return 0
    else
        log "ERROR: Backup verification failed"
        return 1
    fi
}

generate_backup_report() {
    log "Generating backup report..."
    
    local report_file="${BACKUP_DIR}/backup_report_${TIMESTAMP}.txt"
    local archive_file="${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
    
    cat > "${report_file}" << EOF
Workflow Platform Backup Report
===============================
Date: $(date)
Backup Name: ${BACKUP_NAME}
Archive Size: $(du -h "${archive_file}" | cut -f1)

Components Backed Up:
- Database (PostgreSQL): Yes
- Application Files: Yes
- Configuration Files: Yes
- Redis Data: $(command -v redis-cli >/dev/null && echo "Yes" || echo "No")

Archive Contents:
$(tar -tzf "${archive_file}" | head -20)
$([ $(tar -tzf "${archive_file}" | wc -l) -gt 20 ] && echo "... and $(($(tar -tzf "${archive_file}" | wc -l) - 20)) more files")

Backup Location: ${archive_file}
Next Scheduled Backup: $(date -d "+1 day")
EOF

    log "Backup report generated: ${report_file}"
}

restore_from_backup() {
    local backup_file="$1"
    
    if [[ ! -f "$backup_file" ]]; then
        log "ERROR: Backup file not found: $backup_file"
        exit 1
    fi
    
    log "Starting restore from: $backup_file"
    
    # Extract backup
    local restore_dir="/tmp/restore_$$"
    mkdir -p "$restore_dir"
    tar -xzf "$backup_file" -C "$restore_dir"
    
    local backup_name=$(basename "$backup_file" .tar.gz)
    local extract_dir="$restore_dir/$backup_name"
    
    # Restore database
    if [[ -f "$extract_dir/database.sql.gz" ]]; then
        log "Restoring database..."
        gunzip -c "$extract_dir/database.sql.gz" | \
        PGPASSWORD="${DB_PASSWORD}" psql \
            -h "${DB_HOST}" \
            -U "${DB_USER}" \
            -d "${DB_NAME}"
    fi
    
    # Restore files
    if [[ -d "$extract_dir/files/uploads" ]]; then
        log "Restoring uploaded files..."
        cp -r "$extract_dir/files/uploads" /app/ || true
    fi
    
    # Restore Redis
    if [[ -f "$extract_dir/redis_dump.rdb" ]]; then
        log "Restoring Redis data..."
        docker cp "$extract_dir/redis_dump.rdb" workflow-redis:/data/dump.rdb
        docker exec workflow-redis redis-cli DEBUG RESTART || true
    fi
    
    # Cleanup
    rm -rf "$restore_dir"
    
    log "Restore completed successfully"
}

list_backups() {
    log "Available backups:"
    find "${BACKUP_DIR}" -name "workflow_backup_*.tar.gz" -printf "%T@ %Tc %p\n" | sort -rn | cut -d' ' -f2-
}

main() {
    local action="${1:-backup}"
    
    case "$action" in
        backup)
            log "Starting comprehensive backup process..."
            
            mkdir -p "${BACKUP_DIR}"
            
            # Perform backup steps
            backup_database || { send_notification "FAILED" "Database backup failed"; exit 1; }
            backup_files || { send_notification "FAILED" "File backup failed"; exit 1; }
            backup_redis || log "Redis backup failed (non-critical)"
            
            create_backup_archive || { send_notification "FAILED" "Archive creation failed"; exit 1; }
            
            if verify_backup; then
                generate_backup_report
                cleanup_old_backups
                
                local archive_size=$(du -h "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" | cut -f1)
                send_notification "SUCCESS" "Backup completed successfully (${archive_size})"
                log "Backup process completed successfully"
            else
                send_notification "FAILED" "Backup verification failed"
                exit 1
            fi
            ;;
        restore)
            if [[ -z "${2:-}" ]]; then
                log "Usage: $0 restore <backup_file>"
                list_backups
                exit 1
            fi
            restore_from_backup "$2"
            ;;
        list)
            list_backups
            ;;
        cleanup)
            cleanup_old_backups
            ;;
        *)
            echo "Usage: $0 {backup|restore|list|cleanup}"
            echo "  backup  - Create a new backup"
            echo "  restore - Restore from a backup file"
            echo "  list    - List available backups"
            echo "  cleanup - Remove old backups"
            exit 1
            ;;
    esac
}

# Trap errors and send notifications
trap 'send_notification "FAILED" "Backup script encountered an error"' ERR

main "$@"