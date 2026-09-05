#!/usr/bin/env bash
# Nightly PostgreSQL backup → gzip → GPG-encrypt → upload to Hetzner Object Storage (S3).
# Schedule via cron, e.g.:  0 3 * * *  /opt/lovedis/deploy/hetzner/backup-postgres.sh >> /var/log/lovedis-backup.log 2>&1
set -euo pipefail

cd "$(dirname "$0")"
set -a; source ./.env; set +a

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="lovedis-${STAMP}.sql.gz.gpg"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# Full-database dump (platform `public` schema only — no Payload/cms schema).
echo "[backup] dumping database ${POSTGRES_DB}..."
docker compose exec -T db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" \
  | gzip -9 \
  | gpg --batch --yes --symmetric --cipher-algo AES256 \
        --passphrase "$BACKUP_ENCRYPTION_PASSPHRASE" -o "$TMP/$FILE"

echo "[backup] uploading ${FILE} to s3://${BACKUP_S3_BUCKET}..."
AWS_ACCESS_KEY_ID="$BACKUP_S3_ACCESS_KEY_ID" \
AWS_SECRET_ACCESS_KEY="$BACKUP_S3_SECRET_ACCESS_KEY" \
aws --endpoint-url "$BACKUP_S3_ENDPOINT" \
    s3 cp "$TMP/$FILE" "s3://${BACKUP_S3_BUCKET}/${FILE}"

# Prune backups older than the retention window.
CUTOFF="$(date -u -d "-${BACKUP_RETENTION_DAYS} days" +%Y%m%d 2>/dev/null || date -u -v-"${BACKUP_RETENTION_DAYS}"d +%Y%m%d)"
AWS_ACCESS_KEY_ID="$BACKUP_S3_ACCESS_KEY_ID" \
AWS_SECRET_ACCESS_KEY="$BACKUP_S3_SECRET_ACCESS_KEY" \
aws --endpoint-url "$BACKUP_S3_ENDPOINT" s3 ls "s3://${BACKUP_S3_BUCKET}/" \
  | awk '{print $4}' | grep '^lovedis-' | while read -r key; do
      d="${key#lovedis-}"; d="${d%%T*}"
      if [ -n "$d" ] && [ "$d" -lt "$CUTOFF" ]; then
        echo "[backup] pruning old backup $key"
        AWS_ACCESS_KEY_ID="$BACKUP_S3_ACCESS_KEY_ID" \
        AWS_SECRET_ACCESS_KEY="$BACKUP_S3_SECRET_ACCESS_KEY" \
        aws --endpoint-url "$BACKUP_S3_ENDPOINT" s3 rm "s3://${BACKUP_S3_BUCKET}/${key}"
      fi
  done

echo "[backup] done: ${FILE}"
# Restore (test regularly!):
#   aws --endpoint-url "$BACKUP_S3_ENDPOINT" s3 cp s3://$BACKUP_S3_BUCKET/<file> - \
#     | gpg --batch --passphrase "$BACKUP_ENCRYPTION_PASSPHRASE" -d \
#     | gunzip | docker compose exec -T db psql -U "$POSTGRES_USER" "$POSTGRES_DB"
