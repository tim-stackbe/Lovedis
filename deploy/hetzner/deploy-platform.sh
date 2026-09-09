#!/usr/bin/env bash
# Deploy LOVEDIS platform to Hetzner TEST.
#
# Requires one of:
#   - SSH_KEY env var (Cursor environment secret or GitHub Actions secret)
#   - SSH agent with a key authorized on the server (SSH_AUTH_SOCK)
#
# Usage (from repo root):
#   ./deploy/hetzner/deploy-platform.sh
#
# Optional env:
#   SSH_HOST=49.13.222.76
#   SSH_USER=deploy
#   REMOTE_DIR=/opt/lovedis
#   PLATFORM_IMAGE=ghcr.io/tim-stackbe/lovedis:test
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HOST="${SSH_HOST:-49.13.222.76}"
USER="${SSH_USER:-deploy}"
REMOTE_DIR="${REMOTE_DIR:-/opt/lovedis}"
COMPOSE_DIR="${REMOTE_DIR}/deploy/hetzner"
IMAGE="${PLATFORM_IMAGE:-ghcr.io/tim-stackbe/lovedis:test}"
SHA="$(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || echo unknown)"

SSH_OPTS=(-o StrictHostKeyChecking=accept-new -o BatchMode=yes -o ConnectTimeout=15)
KEY_FILE=""

cleanup() {
  if [ -n "$KEY_FILE" ] && [ -f "$KEY_FILE" ]; then
    rm -f "$KEY_FILE"
  fi
}
trap cleanup EXIT

if [ -n "${SSH_KEY:-}" ]; then
  KEY_FILE="$(mktemp)"
  printf '%s\n' "$SSH_KEY" > "$KEY_FILE"
  chmod 600 "$KEY_FILE"
  SSH_OPTS+=(-i "$KEY_FILE")
elif [ -n "${SSH_AUTH_SOCK:-}" ] && [ -S "$SSH_AUTH_SOCK" ]; then
  :
else
  echo "deploy-platform.sh: missing SSH_KEY env and no SSH agent socket." >&2
  echo "Add SSH_KEY to Cursor Cloud environment secrets (private key for ${USER}@${HOST})." >&2
  exit 1
fi

SSH_CMD=(ssh "${SSH_OPTS[@]}" "${USER}@${HOST}")
RSYNC_SSH="ssh ${SSH_OPTS[*]}"
RSYNC=(rsync -az --delete
  --exclude node_modules
  --exclude .git
  --exclude .next
  --exclude cms/node_modules
  -e "$RSYNC_SSH")

echo "==> LOVEDIS Hetzner deploy (${SHA}) → ${USER}@${HOST}"

echo "→ Testing SSH…"
if ! "${SSH_CMD[@]}" "echo ok" >/dev/null 2>&1; then
  echo "deploy-platform.sh: SSH to ${USER}@${HOST} failed." >&2
  if [ -z "${SSH_KEY:-}" ] && [ -n "${SSH_AUTH_SOCK:-}" ]; then
    echo "The forwarded SSH agent key is not authorized on the server." >&2
    echo "Add SSH_KEY (deploy private key) to Cursor environment secrets." >&2
  fi
  exit 1
fi

echo "→ Syncing repository to ${REMOTE_DIR}…"
"${RSYNC[@]}" "$ROOT/" "${USER}@${HOST}:${REMOTE_DIR}/"

echo "→ Pulling platform image ${IMAGE}…"
"${SSH_CMD[@]}" bash -s <<REMOTE
set -euo pipefail
cd "${COMPOSE_DIR}"
if [ ! -f .env ]; then
  echo "Missing ${COMPOSE_DIR}/.env on server" >&2
  exit 1
fi
export PLATFORM_IMAGE="${IMAGE}"
docker compose pull platform
docker compose up -d platform
REMOTE

echo "→ Applying Prisma schema (db push)…"
"${SSH_CMD[@]}" "bash ${COMPOSE_DIR}/migrate-db-push.sh"

echo "→ Smoke test…"
bash "$ROOT/deploy/hetzner/smoke-test.sh" "$HOST"

echo "==> Deploy complete (${SHA})"
