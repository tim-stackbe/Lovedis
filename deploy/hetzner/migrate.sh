#!/usr/bin/env bash
# Run Prisma migrations against the TEST Postgres on the server.
# The standalone platform image does NOT ship the Prisma CLI — use this script
# from the repo root on the server after `git pull`.
#
# Usage:
#   /opt/lovedis/migrate.sh
#   /opt/lovedis/deploy/hetzner/migrate.sh
#
# Requires: docker compose, repo checkout with prisma/, DATABASE_URL in env.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [ -f "$SCRIPT_DIR/prisma/schema.prisma" ]; then
  ROOT="$SCRIPT_DIR"
  COMPOSE_DIR="$SCRIPT_DIR"
elif [ -f "$SCRIPT_DIR/../../prisma/schema.prisma" ]; then
  ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
  COMPOSE_DIR="$SCRIPT_DIR"
else
  echo "migrate.sh: could not find prisma/schema.prisma from ${SCRIPT_DIR}" >&2
  exit 1
fi

cd "$COMPOSE_DIR"
if [ -f .env ]; then
  set -a; source ./.env; set +a
elif [ -f "$ROOT/platform.env" ]; then
  set -a; source "$ROOT/platform.env"; set +a
elif [ -f "$ROOT/.env" ]; then
  set -a; source "$ROOT/.env"; set +a
else
  echo "migrate.sh: no .env or platform.env with DATABASE_URL found" >&2
  exit 1
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "migrate.sh: DATABASE_URL is not set" >&2
  exit 1
fi

# Compose file may live in COMPOSE_DIR or ROOT (legacy server layout).
if [ -f docker-compose.yml ]; then
  COMPOSE_FILE=docker-compose.yml
elif [ -f "$ROOT/docker-compose.yml" ]; then
  cd "$ROOT"
  COMPOSE_FILE=docker-compose.yml
else
  echo "migrate.sh: docker-compose.yml not found" >&2
  exit 1
fi

DB_CID="$(docker compose -f "$COMPOSE_FILE" ps -q db 2>/dev/null || true)"
if [ -z "$DB_CID" ]; then
  echo "migrate.sh: db service is not running — start compose first" >&2
  exit 1
fi
NETWORK="$(docker inspect -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{end}}' "$DB_CID" | head -1)"

echo "[migrate] running prisma migrate deploy on network ${NETWORK}..."
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
    npx prisma migrate deploy
  '
echo "[migrate] done."
