#!/bin/bash
#
# Nightly backup: Postgres dump + MinIO bucket mirror, with retention.
# Off-server copy is opt-in via env (see BACKUP_REMOTE below).
#
#   0 3 * * *  root  /root/shaktiyoga/app/deploy/backup.sh >> /var/log/shakti-backup.log 2>&1
#
set -euo pipefail

APP_DIR="${APP_DIR:-/root/shaktiyoga/app}"
BACKUP_DIR="${BACKUP_DIR:-/root/shaktiyoga/backups}"
PG_CONTAINER="${PG_CONTAINER:-shakti_postgres}"
MINIO_CONTAINER="${MINIO_CONTAINER:-shakti_minio}"
KEEP_DAILY="${KEEP_DAILY:-7}"
KEEP_WEEKLY="${KEEP_WEEKLY:-4}"
# Optional: an `rclone` remote path, e.g. "b2:shakti-backups". Requires rclone configured.
BACKUP_REMOTE="${BACKUP_REMOTE:-}"

STAMP="$(date +%Y%m%d-%H%M%S)"
DOW="$(date +%u)"   # 1..7, 7 = Sunday
mkdir -p "$BACKUP_DIR/daily" "$BACKUP_DIR/weekly"

cd "$APP_DIR"
set -a; . ./.env.local; set +a

# --- Postgres ---------------------------------------------------------------
PG_RE='^postgres(ql)?://([^:]+):([^@]+)@[^/]+/([^?]+)'
if [[ "${DATABASE_URL:-}" =~ $PG_RE ]]; then
    PGU="${BASH_REMATCH[2]}"; PGP="${BASH_REMATCH[3]}"; PGDB="${BASH_REMATCH[4]}"
    OUT="$BACKUP_DIR/daily/pg-${STAMP}.sql.gz"
    echo "$(date -Is) pg_dump -> $OUT"
    docker exec -e PGPASSWORD="$PGP" "$PG_CONTAINER" pg_dump -U "$PGU" "$PGDB" | gzip > "$OUT"
    [ -s "$OUT" ] || { echo "pg_dump produced an empty file"; exit 1; }
else
    echo "DATABASE_URL not a postgres URL — skipping pg dump"; exit 1
fi

# --- MinIO ---------------------------------------------------------------
# The MinIO image is minimal (no tar), so archive the Docker volume from the host.
MC_OUT="$BACKUP_DIR/daily/minio-${STAMP}.tar.gz"
if docker ps --format '{{.Names}}' | grep -qx "$MINIO_CONTAINER"; then
    MINIO_VOL="$(docker inspect -f '{{range .Mounts}}{{if eq .Destination "/data"}}{{.Source}}{{end}}{{end}}' "$MINIO_CONTAINER" 2>/dev/null || true)"
    if [ -n "$MINIO_VOL" ] && [ -d "$MINIO_VOL" ]; then
        echo "$(date -Is) minio volume $MINIO_VOL -> $MC_OUT"
        tar -C "$MINIO_VOL" -czf "$MC_OUT" . || echo "  (minio archive failed, continuing)"
    else
        echo "  (couldn't resolve the MinIO /data volume — skipping object backup)"
    fi
fi

# --- Weekly promotion + retention ----------------------------------------
if [ "$DOW" = "7" ]; then
    cp "$OUT" "$BACKUP_DIR/weekly/" 2>/dev/null || true
    [ -f "$MC_OUT" ] && cp "$MC_OUT" "$BACKUP_DIR/weekly/" || true
fi
find "$BACKUP_DIR/daily"  -type f -mtime +"$KEEP_DAILY"           -delete
find "$BACKUP_DIR/weekly" -type f -mtime +$((KEEP_WEEKLY * 7))    -delete

# --- Off-server ----------------------------------------------------------
if [ -n "$BACKUP_REMOTE" ] && command -v rclone >/dev/null; then
    echo "$(date -Is) rclone sync -> $BACKUP_REMOTE"
    rclone sync "$BACKUP_DIR" "$BACKUP_REMOTE" --transfers 2 || echo "  (rclone sync failed)"
else
    echo "BACKUP_REMOTE unset or rclone missing — backup is on-server only (set one up before launch)"
fi

echo "$(date -Is) backup done: $(du -sh "$BACKUP_DIR" | cut -f1) total"
