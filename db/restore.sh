#!/usr/bin/env bash
# Restore a backup produced by db/backup.sh. Verified (not just assumed) during Phase 10 by
# restoring into a throwaway database and diffing row counts against the live one.
# Usage: ./db/restore.sh path/to/csmas-YYYYMMDD-HHMMSS.sql [target-db-name]
set -euo pipefail

BACKUP_FILE="$1"
TARGET_DB="${2:-}"

DB_ROOT_PASSWORD=$(grep -E '^DB_ROOT_PASSWORD=' .env | cut -d= -f2-)
DB_NAME=$(grep -E '^DB_NAME=' .env | cut -d= -f2-)
TARGET_DB="${TARGET_DB:-$DB_NAME}"

if [ "$TARGET_DB" = "$DB_NAME" ]; then
  echo "WARNING: this will overwrite the live database '$DB_NAME'. Ctrl+C now to abort."
  sleep 5
fi

docker compose exec -T mysql mysql -uroot -p"$DB_ROOT_PASSWORD" \
  -e "CREATE DATABASE IF NOT EXISTS $TARGET_DB;" 2>/dev/null

docker compose exec -T mysql mysql -uroot -p"$DB_ROOT_PASSWORD" "$TARGET_DB" \
  < "$BACKUP_FILE" 2>/dev/null

echo "Restored $BACKUP_FILE into database '$TARGET_DB'."
