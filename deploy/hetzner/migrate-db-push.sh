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

cd "$SCRIPT_DIR"
if [ -f .env ]; then
  set -a; source ./.env; set +a
elif [ -f "$ROOT/.env" ]; then
  set -a; source "$ROOT/.env"; set +a
else
  echo "migrate-db-push.sh: no .env with DATABASE_URL" >&2
  exit 1
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "migrate-db-push.sh: DATABASE_URL is not set" >&2
  exit 1
fi

COMPOSE_FILE=docker-compose.yml
if [ ! -f "$COMPOSE_FILE" ] && [ -f "$ROOT/docker-compose.yml" ]; then
  cd "$ROOT"
  COMPOSE_FILE=docker-compose.yml
fi

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
