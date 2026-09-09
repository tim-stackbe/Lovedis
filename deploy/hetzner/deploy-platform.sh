#!/usr/bin/env bash
# Deploy LOVEDIS platform to Hetzner TEST.
#
# Two deploy paths (auto-selected; override with DEPLOY_MODE=mac|cloud):
#
#   mac   — Mac desktop: ~/.ssh/config alias (hetzner-lovedis), rsync → /opt/lovedis/platform,
#           compose at /opt/lovedis, db push + smoke test, ControlMaster multiplexing.
#   cloud — Cursor cloud agent / CI: SSH_KEY → deploy@49.13.222.76, rsync → /opt/lovedis,
#           compose at /opt/lovedis/deploy/hetzner, db push + smoke test.
#
# Auth (cloud path; first match wins):
#   1. SSH_KEY env var — Cursor environment secret or CI
#   2. SSH agent — Mac Keychain / forwarded agent socket (desktop agents)
#
# Mac path uses SSH config on the alias (HETZNER_SSH_HOST); no SSH_KEY required.
#
# Usage (from repo root):
#   ./deploy/hetzner/deploy-platform.sh
#
# Optional env (cloud):
#   SSH_HOST=49.13.222.76
#   SSH_USER=deploy
#   REMOTE_DIR=/opt/lovedis
#
# Optional env (Mac):
#   HETZNER_SSH_HOST=hetzner-lovedis
#   HETZNER_PLATFORM_DIR=/opt/lovedis/platform
#   HETZNER_COMPOSE_DIR=/opt/lovedis
#   HETZNER_PLATFORM_IMAGE=lovedis-platform:test
#   HETZNER_APP_URL=https://app.49.13.222.76.nip.io
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SHA="$(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || echo unknown)"

resolve_deploy_mode() {
  if [ -n "${DEPLOY_MODE:-}" ]; then
    printf '%s\n' "$DEPLOY_MODE"
    return
  fi
  if [ -n "${SSH_KEY:-}" ]; then
    printf '%s\n' cloud
    return
  fi
  if [ -n "${HETZNER_SSH_HOST:-}" ] \
    || [ -n "${HETZNER_PLATFORM_DIR:-}" ] \
    || [ -n "${HETZNER_COMPOSE_DIR:-}" ]; then
    printf '%s\n' mac
    return
  fi
  if [ "$(uname -s 2>/dev/null || echo unknown)" = "Darwin" ]; then
    if ssh -G hetzner-lovedis 2>/dev/null | grep -qE '^hostname '; then
      printf '%s\n' mac
      return
    fi
  fi
  printf '%s\n' cloud
}

DEPLOY_MODE="$(resolve_deploy_mode)"

KEY_FILE=""

cleanup() {
  if [ -n "$KEY_FILE" ] && [ -f "$KEY_FILE" ]; then
    rm -f "$KEY_FILE"
  fi
}
trap cleanup EXIT

deploy_mac() {
  local ssh_target platform_dir compose_dir image app_url

  ssh_target="${HETZNER_SSH_HOST:-hetzner-lovedis}"
  platform_dir="${HETZNER_PLATFORM_DIR:-/opt/lovedis/platform}"
  compose_dir="${HETZNER_COMPOSE_DIR:-/opt/lovedis}"
  image="${HETZNER_PLATFORM_IMAGE:-lovedis-platform:test}"
  app_url="${HETZNER_APP_URL:-https://app.49.13.222.76.nip.io}"

  echo "==> LOVEDIS Hetzner deploy (${SHA}) [mac]"
  echo "    Target: ${ssh_target}:${platform_dir}"
  echo "    Compose: ${compose_dir}"
  echo "    Image:   ${image}"
  echo

  echo "→ Opening SSH master (ControlMaster)…"
  ssh -O check "$ssh_target" 2>/dev/null || ssh -fN "$ssh_target"

  echo "→ Testing SSH to ${ssh_target}…"
  if ! ssh "$ssh_target" "echo ok" >/dev/null 2>&1; then
    echo "deploy-platform.sh: SSH failed for ${ssh_target}." >&2
    echo "Ensure ~/.ssh/config defines Host ${ssh_target} and \`ssh ${ssh_target}\` works." >&2
    exit 1
  fi
  echo "   SSH OK"

  echo "→ Syncing repo to ${platform_dir}…"
  rsync -az --delete \
    --exclude node_modules \
    --exclude .git \
    --exclude .env \
    --exclude .env.local \
    --exclude .next \
    --exclude cms/node_modules \
    "$ROOT/" "${ssh_target}:${platform_dir}/"
  echo "   Sync complete"

  echo "→ Building platform image and restarting container…"
  ssh "$ssh_target" "set -euo pipefail
    cd '${platform_dir}'
    docker build -t '${image}' .
    cd '${compose_dir}'
    docker compose up -d platform
    docker compose ps platform
  "
  echo "   Platform container up"

  echo "→ Applying Prisma schema (db push)…"
  ssh "$ssh_target" "bash ${platform_dir}/deploy/hetzner/migrate-db-push.sh"
  echo "   Schema applied"

  echo "→ Smoke test (platform + homepage)…"
  bash "$ROOT/deploy/hetzner/smoke-test.sh" "49.13.222.76"
  echo
  echo "==> Deploy complete (${SHA})"
  echo "    Platform: ${app_url}"
  echo "    Homepage: https://home.49.13.222.76.nip.io"
}

deploy_cloud() {
  local host user remote_dir compose_dir

  host="${SSH_HOST:-49.13.222.76}"
  user="${SSH_USER:-deploy}"
  remote_dir="${REMOTE_DIR:-/opt/lovedis}"
  compose_dir="${remote_dir}/deploy/hetzner"

  local -a ssh_opts=(-o StrictHostKeyChecking=accept-new -o BatchMode=yes -o ConnectTimeout=15)
  local -a ssh_cmd rsync

  # Cursor desktop agent on Mac: forwarded ssh-agent socket.
  if [ -z "${SSH_AUTH_SOCK:-}" ] && [ -S /run/host-services/ssh-auth.sock ]; then
    export SSH_AUTH_SOCK=/run/host-services/ssh-auth.sock
  fi

  if [ -n "${SSH_KEY:-}" ]; then
    KEY_FILE="$(mktemp)"
    printf '%s\n' "$SSH_KEY" > "$KEY_FILE"
    chmod 600 "$KEY_FILE"
    ssh_opts+=(-i "$KEY_FILE" -o IdentitiesOnly=yes)
  elif [ -n "${SSH_AUTH_SOCK:-}" ] && [ -S "$SSH_AUTH_SOCK" ]; then
    : # Mac ssh-agent / Keychain
  else
    echo "deploy-platform.sh: no SSH credentials for ${user}@${host}." >&2
    echo >&2
    echo "Cloud agents: add SSH_KEY to Cursor → Environment → Secrets (full deploy private key)." >&2
    echo "Desktop Mac:  load your deploy key — ssh-add --apple-use-keychain" >&2
    exit 1
  fi

  ssh_cmd=(ssh "${ssh_opts[@]}" "${user}@${host}")
  local rsync_ssh="ssh ${ssh_opts[*]}"
  rsync=(rsync -az --delete
    --exclude node_modules
    --exclude .git
    --exclude .next
    --exclude cms/node_modules
    -e "$rsync_ssh")

  echo "==> LOVEDIS Hetzner deploy (${SHA}) [cloud]"
  echo "    Target: ${user}@${host}:${remote_dir}"
  echo

  echo "→ Testing SSH to ${user}@${host}…"
  if ! "${ssh_cmd[@]}" "echo ok" >/dev/null 2>&1; then
    echo "deploy-platform.sh: SSH failed." >&2
    echo >&2
    if [ -n "${SSH_AUTH_SOCK:-}" ] && [ -S "$SSH_AUTH_SOCK" ]; then
      echo "Agent keys offered (if any):" >&2
      ssh-add -l 2>&1 | sed 's/^/  /' >&2 || true
    fi
    if [ -n "${SSH_KEY:-}" ]; then
      echo "SSH_KEY is set but authentication failed — verify the key is in deploy@${host} authorized_keys." >&2
    else
      echo "The forwarded SSH agent key is not authorized on the server." >&2
      echo "Add SSH_KEY (Hetzner deploy private key) to Cursor Environment → Secrets." >&2
      echo "Or on Mac: ssh ${user}@${host}  (must succeed before re-running this script)" >&2
    fi
    exit 1
  fi
  echo "   SSH OK"

  echo "→ Syncing repo to ${remote_dir}…"
  "${rsync[@]}" "$ROOT/" "${user}@${host}:${remote_dir}/"
  echo "   Sync complete"

  echo "→ Building platform image on server (docker build --no-cache)…"
  "${ssh_cmd[@]}" bash -s <<REMOTE
set -euo pipefail
if [ ! -f "${compose_dir}/.env" ]; then
  echo "Missing ${compose_dir}/.env on server — copy from .env.example and fill secrets." >&2
  exit 1
fi
set -a
source "${compose_dir}/.env"
set +a
if [ -z "\${PLATFORM_IMAGE:-}" ]; then
  echo "PLATFORM_IMAGE is not set in ${compose_dir}/.env" >&2
  exit 1
fi
cd "${remote_dir}"
docker build --no-cache -t "\${PLATFORM_IMAGE}" -f Dockerfile .
cd "${compose_dir}"
docker compose up -d platform
REMOTE
  echo "   Platform container up"

  echo "→ Applying Prisma schema (db push)…"
  "${ssh_cmd[@]}" "bash ${compose_dir}/migrate-db-push.sh"

  echo "→ Smoke test (platform + homepage)…"
  bash "$ROOT/deploy/hetzner/smoke-test.sh" "$host"

  echo
  echo "==> Deploy complete (${SHA})"
  echo "    Platform: https://app.${host}.nip.io"
  echo "    Homepage: https://home.${host}.nip.io"
}

case "$DEPLOY_MODE" in
  mac) deploy_mac ;;
  cloud) deploy_cloud ;;
  *)
    echo "deploy-platform.sh: unknown DEPLOY_MODE=${DEPLOY_MODE} (use mac or cloud)." >&2
    exit 1
    ;;
esac
