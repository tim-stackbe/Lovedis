#!/usr/bin/env bash
# Apply Prisma schema via `db push` (this project has no migrations/ folder).
# Run on the Hetzner server from deploy/hetzner after syncing the repo.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [ -f "$SCRIPT_DIR/../../prisma/schema.prisma" ]; then
  ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
elif [ -f "$SCRIPT_DIR/prisma/schema.prisma" ]; then
  ROOT="$SCRIPT_DIR"
else
  echo "migrate-db-push.sh: could not find prisma/schema.prisma" >&2
  exit 1
fi

read_env_var() {
  local file="$1" key="$2"
  [ -f "$file" ] || return 1
  grep -E "^${key}=" "$file" | head -1 | cut -d= -f2- | sed 's/^"\(.*\)"$/\1/'
}

load_database_url() {
  local f
  for f in \
    "$SCRIPT_DIR/.env" \
    "$ROOT/../platform.env" \
    "$ROOT/platform.env" \
    "$ROOT/.env"; do
    if [ -z "${DATABASE_URL:-}" ]; then
      DATABASE_URL="$(read_env_var "$f" DATABASE_URL || true)"
    fi
    if [ -z "${DATABASE_URL:-}" ] && [ -f "$f" ]; then
      set +u
      # shellcheck disable=SC1090
      set -a; source "$f" 2>/dev/null || true; set +a
      set -u
    fi
    [ -n "${DATABASE_URL:-}" ] && return 0
  done
  return 1
}

COMPOSE_FILE=docker-compose.yml
if [ -f "$ROOT/../docker-compose.yml" ]; then
  # Mac server layout: live compose at /opt/lovedis, repo at /opt/lovedis/platform
  COMPOSE_DIR="$(cd "$ROOT/.." && pwd)"
elif [ -f "$SCRIPT_DIR/docker-compose.yml" ]; then
  COMPOSE_DIR="$SCRIPT_DIR"
elif [ -f "$ROOT/docker-compose.yml" ]; then
  COMPOSE_DIR="$ROOT"
else
  echo "migrate-db-push.sh: docker-compose.yml not found" >&2
  exit 1
fi

cd "$COMPOSE_DIR"

if ! load_database_url; then
  if DB_CID="$(docker compose -f "$COMPOSE_FILE" ps -q platform 2>/dev/null || true)" \
    && [ -n "$DB_CID" ]; then
    DATABASE_URL="$(docker compose -f "$COMPOSE_FILE" exec -T platform printenv DATABASE_URL | tr -d '\r')"
  fi
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "migrate-db-push.sh: DATABASE_URL is not set" >&2
  exit 1
fi
export DATABASE_URL

DB_CID="$(docker compose -f "$COMPOSE_FILE" ps -q db 2>/dev/null || true)"
if [ -z "$DB_CID" ]; then
  echo "migrate-db-push.sh: db service is not running" >&2
  exit 1
fi
NETWORK="$(docker inspect -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{end}}' "$DB_CID" | head -1)"

echo "[migrate-db-push] running prisma db push on network ${NETWORK}…"
docker run --rm \
  --network "$NETWORK" \
  -e DATABASE_URL \
  -v "$ROOT:/app" \
  -w /app \
  node:22-bookworm-slim \
  bash -lc '
    set -euo pipefail
    apt-get update -qq
    apt-get install -y -qq openssl ca-certificates >/dev/null
    npm ci --ignore-scripts
    npx prisma db push
  '
echo "[migrate-db-push] done."
