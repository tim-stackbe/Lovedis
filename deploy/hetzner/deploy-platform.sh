#!/usr/bin/env bash
# Deploy LOVEDIS platform to Hetzner TEST.
#
# Auth (first match wins):
#   1. SSH_KEY env var — Cursor environment secret or CI (recommended for cloud agents)
#   2. SSH agent — Mac Keychain / forwarded agent socket (desktop agents)
#
# Flow:
#   1. rsync repo → deploy@49.13.222.76:/opt/lovedis
#   2. docker build --no-cache on the server
#   3. docker compose up -d platform
#   4. prisma db push via migrate-db-push.sh
#
# Usage (from repo root):
#   ./deploy/hetzner/deploy-platform.sh
#
# Optional env:
#   SSH_HOST=49.13.222.76
#   SSH_USER=deploy
#   REMOTE_DIR=/opt/lovedis
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HOST="${SSH_HOST:-49.13.222.76}"
USER="${SSH_USER:-deploy}"
REMOTE_DIR="${REMOTE_DIR:-/opt/lovedis}"
COMPOSE_DIR="${REMOTE_DIR}/deploy/hetzner"
SHA="$(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || echo unknown)"

SSH_OPTS=(-o StrictHostKeyChecking=accept-new -o BatchMode=yes -o ConnectTimeout=15)
KEY_FILE=""

# Cursor desktop agent on Mac: forwarded ssh-agent socket.
if [ -z "${SSH_AUTH_SOCK:-}" ] && [ -S /run/host-services/ssh-auth.sock ]; then
  export SSH_AUTH_SOCK=/run/host-services/ssh-auth.sock
fi

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
  SSH_OPTS+=(-i "$KEY_FILE" -o IdentitiesOnly=yes)
elif [ -n "${SSH_AUTH_SOCK:-}" ] && [ -S "$SSH_AUTH_SOCK" ]; then
  : # Mac ssh-agent / Keychain
else
  echo "deploy-platform.sh: no SSH credentials for ${USER}@${HOST}." >&2
  echo >&2
  echo "Cloud agents: add SSH_KEY to Cursor → Environment → Secrets (full deploy private key)." >&2
  echo "Desktop Mac:  load your deploy key — ssh-add --apple-use-keychain" >&2
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

echo "==> LOVEDIS Hetzner deploy (${SHA})"
echo "    Target: ${USER}@${HOST}:${REMOTE_DIR}"
echo

echo "→ Testing SSH to ${USER}@${HOST}…"
if ! "${SSH_CMD[@]}" "echo ok" >/dev/null 2>&1; then
  echo "deploy-platform.sh: SSH failed." >&2
  echo >&2
  if [ -n "${SSH_AUTH_SOCK:-}" ] && [ -S "$SSH_AUTH_SOCK" ]; then
    echo "Agent keys offered (if any):" >&2
    ssh-add -l 2>&1 | sed 's/^/  /' >&2 || true
  fi
  if [ -n "${SSH_KEY:-}" ]; then
    echo "SSH_KEY is set but authentication failed — verify the key is in deploy@${HOST} authorized_keys." >&2
  else
    echo "The forwarded SSH agent key is not authorized on the server." >&2
    echo "Add SSH_KEY (Hetzner deploy private key) to Cursor Environment → Secrets." >&2
    echo "Or on Mac: ssh ${USER}@${HOST}  (must succeed before re-running this script)" >&2
  fi
  exit 1
fi
echo "   SSH OK"

echo "→ Syncing repo to ${REMOTE_DIR}…"
"${RSYNC[@]}" "$ROOT/" "${USER}@${HOST}:${REMOTE_DIR}/"
echo "   Sync complete"

echo "→ Building platform image on server (docker build --no-cache)…"
"${SSH_CMD[@]}" bash -s <<REMOTE
set -euo pipefail
if [ ! -f "${COMPOSE_DIR}/.env" ]; then
  echo "Missing ${COMPOSE_DIR}/.env on server — copy from .env.example and fill secrets." >&2
  exit 1
fi
set -a
source "${COMPOSE_DIR}/.env"
set +a
if [ -z "\${PLATFORM_IMAGE:-}" ]; then
  echo "PLATFORM_IMAGE is not set in ${COMPOSE_DIR}/.env" >&2
  exit 1
fi
cd "${REMOTE_DIR}"
docker build --no-cache -t "\${PLATFORM_IMAGE}" -f Dockerfile .
cd "${COMPOSE_DIR}"
docker compose up -d platform
REMOTE
echo "   Platform container up"

echo "→ Applying Prisma schema (db push)…"
"${SSH_CMD[@]}" "bash ${COMPOSE_DIR}/migrate-db-push.sh"

echo "→ Smoke test (platform + homepage)…"
bash "$ROOT/deploy/hetzner/smoke-test.sh" "$HOST"

echo
echo "==> Deploy complete (${SHA})"
echo "    Platform: https://app.${HOST}.nip.io"
echo "    Homepage: https://home.${HOST}.nip.io"
