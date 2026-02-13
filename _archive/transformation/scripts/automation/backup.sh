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
