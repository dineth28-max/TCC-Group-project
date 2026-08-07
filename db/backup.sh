#!/usr/bin/env bash
# Daily DB backup (Phase 10 / plan.md NFR: "DB backup, Daily, RPO <= 24h").
# Usage: ./db/backup.sh [output-directory]
# Run from the repo root, or anywhere — relies only on the docker compose project being up.
set -euo pipefail

OUT_DIR="${1:-./backups}"
mkdir -p "$OUT_DIR"

STAMP=$(date +%Y%m%d-%H%M%S)
OUT_FILE="$OUT_DIR/csmas-$STAMP.sql"

DB_ROOT_PASSWORD=$(grep -E '^DB_ROOT_PASSWORD=' .env | cut -d= -f2-)
DB_NAME=$(grep -E '^DB_NAME=' .env | cut -d= -f2-)

docker compose exec -T mysql mysqldump \
  -uroot -p"$DB_ROOT_PASSWORD" \
  --single-transaction --routines --triggers "$DB_NAME" \
  2>/dev/null > "$OUT_FILE"

echo "Backup written to $OUT_FILE ($(wc -l < "$OUT_FILE") lines)."
