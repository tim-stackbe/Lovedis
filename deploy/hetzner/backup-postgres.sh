#!/usr/bin/env bash
# PostgreSQL backup for the Lovedis platform database.
#
# Takes a pg_dump custom-format (compressed) dump of the `db` container, validates it,
# prunes old dumps, and optionally uploads off-box to any S3-compatible target.
#
# Install the schedule with ./install-backup-cron.sh (idempotent).
# Restore instructions: see the "Database backups" section of README.md.
#
# pg_dump is read-only with respect to the data; this script never writes to the
# live database and never restarts a container.
set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration. Override via /opt/lovedis/backup.env (never committed — it is
# the only place off-box credentials belong).
# ---------------------------------------------------------------------------
CONFIG_FILE="${BACKUP_CONFIG_FILE:-/opt/lovedis/backup.env}"
if [ -f "$CONFIG_FILE" ]; then
  set -a; source "$CONFIG_FILE"; set +a
fi

STACK_DIR="${STACK_DIR:-/opt/lovedis}"
BACKUP_DIR="${BACKUP_DIR:-$STACK_DIR/backups}"
DB_CONTAINER="${DB_CONTAINER:-lovedis-db-1}"
PG_IMAGE="${PG_IMAGE:-postgres:18}"
LOCK_FILE="${LOCK_FILE:-/tmp/lovedis-backup.lock}"

# Retention: every dump from the last KEEP_DAYS days, plus the Sunday dump of
# each of the last KEEP_WEEKS weeks.
KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"
KEEP_WEEKS="${BACKUP_KEEP_WEEKS:-8}"

# A dump smaller than this is treated as truncated/corrupt and fails the run.
MIN_BYTES="${BACKUP_MIN_BYTES:-100000}"

# Tables that must carry data in a healthy dump.
REQUIRED_TABLES="${BACKUP_REQUIRED_TABLES:-User Company Program}"

# Off-box upload. Unset BACKUP_S3_BUCKET (the default) keeps backups local-only.
S3_BUCKET="${BACKUP_S3_BUCKET:-}"
S3_ENDPOINT="${BACKUP_S3_ENDPOINT:-}"
S3_PREFIX="${BACKUP_S3_PREFIX:-lovedis-postgres}"
S3_REGION="${BACKUP_S3_REGION:-auto}"
AWSCLI_IMAGE="${AWSCLI_IMAGE:-amazon/aws-cli:latest}"

log()  { echo "[backup $(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"; }
fail() { echo "[backup FAILED $(date -u +%Y-%m-%dT%H:%M:%SZ)] $*" >&2; exit 1; }

# ---------------------------------------------------------------------------
# Single instance only. A slow dump must never stack up on the next schedule.
# ---------------------------------------------------------------------------
exec 9>"$LOCK_FILE"
flock -n 9 || fail "another backup is already running (lock: $LOCK_FILE)"

command -v docker >/dev/null || fail "docker not found"
RUNNING="$(docker inspect -f '{{.State.Running}}' "$DB_CONTAINER" 2>/dev/null || true)"
[ "$RUNNING" = true ] || fail "container $DB_CONTAINER is not running"

# Credentials live in the container's environment, not in this repo.
container_env() {
  docker inspect "$DB_CONTAINER" --format '{{range .Config.Env}}{{println .}}{{end}}' \
    | sed -n "s/^$1=//p" | head -1
}
PGUSER_VAL="$(container_env POSTGRES_USER)"
PGDB_VAL="$(container_env POSTGRES_DB)"
[ -n "$PGUSER_VAL" ] && [ -n "$PGDB_VAL" ] || fail "could not read POSTGRES_USER/POSTGRES_DB from $DB_CONTAINER"

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="lovedis-${STAMP}.dump"
DEST="$BACKUP_DIR/$FILE"
TMP="$BACKUP_DIR/.$FILE.part"
trap 'rm -f "$TMP"' EXIT

# ---------------------------------------------------------------------------
# Dump. Write to a .part file and only move it into place once validated, so a
# failed run can never leave a plausible-looking but broken backup behind.
# ---------------------------------------------------------------------------
log "dumping database '$PGDB_VAL' from $DB_CONTAINER"
docker exec "$DB_CONTAINER" pg_dump \
  -U "$PGUSER_VAL" -d "$PGDB_VAL" \
  --format=custom --compress=9 --no-owner --no-privileges > "$TMP" \
  || fail "pg_dump failed"

SIZE="$(stat -c %s "$TMP" 2>/dev/null || wc -c < "$TMP")"
[ "$SIZE" -ge "$MIN_BYTES" ] \
  || fail "dump is only ${SIZE} bytes (minimum ${MIN_BYTES}) — treating as truncated"

# ---------------------------------------------------------------------------
# Validate the archive is readable and actually carries the expected tables.
# Uses a throwaway container so the live database is never involved.
# ---------------------------------------------------------------------------
log "validating archive (${SIZE} bytes)"
TOC="$(docker run --rm -i -v "$BACKUP_DIR:/b:ro" "$PG_IMAGE" \
        pg_restore --list "/b/.$FILE.part" 2>&1)" \
  || fail "pg_restore --list could not read the archive: $TOC"

# Matched in-shell rather than through `grep -q`, which would SIGPIPE the writer
# and trip `pipefail` on a large table of contents.
for t in $REQUIRED_TABLES; do
  case "$TOC" in
    *"TABLE DATA public $t "*) ;;
    *) fail "archive is missing table data for '$t' — refusing to keep this dump" ;;
  esac
done
TABLE_COUNT="$(printf '%s\n' "$TOC" | grep -c 'TABLE DATA public ' || true)"

mv "$TMP" "$DEST"
chmod 600 "$DEST"
trap - EXIT
( cd "$BACKUP_DIR" && sha256sum "$FILE" > "$FILE.sha256" )
ln -sfn "$FILE" "$BACKUP_DIR/latest.dump"
log "wrote $DEST (${SIZE} bytes, ${TABLE_COUNT} tables)"

# ---------------------------------------------------------------------------
# Off-box copy. Backups that only exist on the database's own disk do not
# survive host loss, so a missing target is a warning on every run, not silence.
# ---------------------------------------------------------------------------
if [ -n "$S3_BUCKET" ]; then
  [ -n "${BACKUP_S3_ACCESS_KEY_ID:-}" ] && [ -n "${BACKUP_S3_SECRET_ACCESS_KEY:-}" ] \
    || fail "BACKUP_S3_BUCKET is set but BACKUP_S3_ACCESS_KEY_ID/SECRET_ACCESS_KEY are not"
  log "uploading $FILE to s3://$S3_BUCKET/$S3_PREFIX/"
  ENDPOINT_ARGS=()
  if [ -n "$S3_ENDPOINT" ]; then ENDPOINT_ARGS=(--endpoint-url "$S3_ENDPOINT"); fi
  docker run --rm \
    -e AWS_ACCESS_KEY_ID="${BACKUP_S3_ACCESS_KEY_ID:-}" \
    -e AWS_SECRET_ACCESS_KEY="${BACKUP_S3_SECRET_ACCESS_KEY:-}" \
    -e AWS_DEFAULT_REGION="$S3_REGION" \
    -v "$BACKUP_DIR:/b:ro" "$AWSCLI_IMAGE" \
    "${ENDPOINT_ARGS[@]}" s3 cp "/b/$FILE" "s3://$S3_BUCKET/$S3_PREFIX/$FILE" \
    || fail "off-box upload failed — the local dump is fine but there is no remote copy"
  log "off-box copy confirmed"
else
  log "WARNING: BACKUP_S3_BUCKET is not set. Backups exist ONLY on this host, on the"
  log "WARNING: same disk as the database. Losing the server loses the backups too."
  log "WARNING: See the 'Enabling off-box backups' section of deploy/hetzner/README.md."
fi

# ---------------------------------------------------------------------------
# Prune. Keep every dump from the last KEEP_DAYS days, plus Sunday dumps for
# the last KEEP_WEEKS weeks. Newest dump is always kept.
# ---------------------------------------------------------------------------
DAILY_CUTOFF="$(date -u -d "-${KEEP_DAYS} days" +%Y%m%d)"
WEEKLY_CUTOFF="$(date -u -d "-$((KEEP_WEEKS * 7)) days" +%Y%m%d)"

for path in "$BACKUP_DIR"/lovedis-*.dump; do
  [ -f "$path" ] || continue
  name="$(basename "$path")"
  [ "$name" = "$FILE" ] && continue
  day="${name#lovedis-}"; day="${day%%T*}"
  case "$day" in ????????) ;; *) continue ;; esac

  keep=no
  [ "$day" -ge "$DAILY_CUTOFF" ] && keep=yes
  if [ "$keep" = no ] && [ "$day" -ge "$WEEKLY_CUTOFF" ]; then
    [ "$(date -u -d "$day" +%u)" = "7" ] && keep=yes   # Sunday
  fi

  if [ "$keep" = no ]; then
    log "pruning $name"
    rm -f "$path" "$path.sha256"
  fi
done

TOTAL="$(find "$BACKUP_DIR" -maxdepth 1 -name 'lovedis-*.dump' | wc -l | tr -d ' ')"
log "done: $FILE ($TOTAL dumps retained, $(du -sh "$BACKUP_DIR" | cut -f1) total)"
