#!/usr/bin/env bash
# Deploy LOVEDIS platform to Hetzner TEST — run from your Mac.
#
# Primary path: local SSH via macOS Keychain / ssh-agent (no env vars required).
# Optional: set SSH_KEY to a private key file contents (CI / automation only).
#
# Usage (from repo root on Mac):
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
  : # Mac ssh-agent / Keychain — default path
else
  echo "deploy-platform.sh: cannot connect to ${USER}@${HOST}." >&2
  echo >&2
  echo "Run this script from your Mac (repo: ~/Documents/Lovedis or similar)." >&2
  echo "Your SSH key must be loaded — e.g. \`ssh-add --apple-use-keychain\` or \`ssh ${USER}@${HOST}\` once." >&2
  echo "Cloud Agent VMs cannot deploy without SSH_KEY; use Mac-local deploy instead." >&2
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
echo "    Image:  ${IMAGE}"
echo

echo "→ Testing SSH to ${USER}@${HOST}…"
if ! "${SSH_CMD[@]}" "echo ok" >/dev/null 2>&1; then
  echo "deploy-platform.sh: SSH failed." >&2
  echo >&2
  echo "On Mac, verify your deploy key is authorized:" >&2
  echo "  ssh ${USER}@${HOST}" >&2
  echo "If that works, re-run: ./deploy/hetzner/deploy-platform.sh" >&2
  exit 1
fi
echo "   SSH OK"

echo "→ Syncing repo to ${REMOTE_DIR}…"
"${RSYNC[@]}" "$ROOT/" "${USER}@${HOST}:${REMOTE_DIR}/"
echo "   Sync complete"

echo "→ Pulling platform image and restarting container…"
"${SSH_CMD[@]}" bash -s <<REMOTE
set -euo pipefail
cd "${COMPOSE_DIR}"
if [ ! -f .env ]; then
  echo "Missing ${COMPOSE_DIR}/.env on server — copy from .env.example and fill secrets." >&2
  exit 1
fi
export PLATFORM_IMAGE="${IMAGE}"
docker compose pull platform
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
