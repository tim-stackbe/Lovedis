#!/usr/bin/env bash
# Install (or refresh) the scheduled PostgreSQL backup on the Hetzner host.
#
# Run on the server as the `deploy` user:
#   /opt/lovedis/platform/deploy/hetzner/install-backup-cron.sh
#
# Idempotent: re-running updates the script in place and rewrites the crontab
# entries rather than appending duplicates.
#
# The runnable copy is installed to /opt/lovedis/scripts/ rather than left in
# /opt/lovedis/platform/, so that an application deploy (which rsyncs over the
# platform checkout) can never delete or downgrade the scheduled backup.
set -euo pipefail

STACK_DIR="${STACK_DIR:-/opt/lovedis}"
SCRIPT_DIR="$STACK_DIR/scripts"
LOG_DIR="$STACK_DIR/logs"
LOG_FILE="$LOG_DIR/backup.log"
TARGET="$SCRIPT_DIR/backup-postgres.sh"
SOURCE="$(cd "$(dirname "$0")" && pwd)/backup-postgres.sh"

# Twice daily, off-peak, offset off the hour to avoid colliding with other jobs.
# Times are server-local (Europe/Berlin): Debian's cron ignores CRON_TZ, so
# pinning the schedule to UTC is not possible here. Dump filenames stay in UTC.
SCHEDULE="${BACKUP_SCHEDULE:-17 3,15 * * *}"
MARKER="# lovedis-postgres-backup (managed by install-backup-cron.sh)"

[ -f "$SOURCE" ] || { echo "cannot find $SOURCE" >&2; exit 1; }

mkdir -p "$SCRIPT_DIR" "$LOG_DIR"
install -m 700 "$SOURCE" "$TARGET"
touch "$LOG_FILE"
echo "installed $TARGET"

# Rewrite the crontab: strip any previously managed block, then append a fresh
# one. Everything the user added by hand is preserved. The CRON_TZ match clears
# it out of crontabs written by an earlier version of this installer.
# grep exits 1 when it filters everything out, which is a normal outcome here.
CURRENT="$(crontab -l 2>/dev/null || true)"
CLEANED="$(printf '%s\n' "$CURRENT" \
  | awk -v m="$MARKER" '
      $0 == m { inblock = 1; next }
      inblock && ($0 ~ /^CRON_TZ=/ || $0 ~ /backup-postgres\.sh/) { next }
      { inblock = 0; print }
    ' \
  | grep -v 'backup-postgres.sh' \
  | sed '/^$/d' || true)"

{
  if [ -n "$CLEANED" ]; then printf '%s\n' "$CLEANED"; fi
  printf '%s\n' "$MARKER"
  printf '%s %s >> %s 2>&1\n' "$SCHEDULE" "$TARGET" "$LOG_FILE"
} | crontab -

echo "installed crontab entry: $SCHEDULE ($(date +%Z), server-local)"
crontab -l | grep -A1 -F "$MARKER" || true

if [ ! -f "$STACK_DIR/backup.env" ]; then
  echo
  echo "NOTE: $STACK_DIR/backup.env does not exist, so backups stay on this host only."
  echo "      See 'Enabling off-box backups' in deploy/hetzner/README.md."
fi
