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
# IMPORTANT: this script deploys your LOCAL WORKING TREE (rsync --delete), not a
# committed git state. A dirty tree therefore aborts the deploy, because the next
# clean deploy would silently revert those files on the server. Commit first.
#   DEPLOY_ALLOW_DIRTY=1   escape hatch — deploy uncommitted work anyway
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
BRANCH="$(git -C "$ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)"
DEPLOYED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
DIRTY=no
# Honest version label: "<sha>" only when the tree matches the commit,
# "<sha>-dirty" otherwise. Set by preflight_git_checks.
VERSION="$SHA"

# Paths rsync never ships. Changes confined to these cannot reach the server, so
# they must not block a deploy either. Keep in sync with the --exclude flags.
# src/generated is the Prisma client — a gitignored build artifact regenerated
# in-image by `npm run build` (prisma generate) and never bind-mounted at
# runtime. It must be excluded: migrate-db-push.sh generates it on the server, so
# rsyncing it is redundant, and a root-owned copy from an older deploy would make
# rsync --delete (run as the non-root deploy user) abort with "unlink … Permission
# denied" (exit 23). Excluding it lets the sync proceed regardless of its owner.
RSYNC_EXCLUDES=(node_modules .git .env .env.local .next cms/node_modules src/generated)

# Working-tree changes rsync WOULD ship: staged, unstaged and untracked files
# (excluding the rsync excludes). Emitted one porcelain line per change.
deployable_changes() {
  local line path ex excluded
  { git -C "$ROOT" status --porcelain --untracked-files=all 2>/dev/null || true; } | while IFS= read -r line; do
    path="${line:3}"
    # Renames/copies read as "old -> new"; the new path is what gets synced.
    case "$path" in
      *' -> '*) path="${path##* -> }" ;;
    esac
    path="${path#\"}"
    path="${path%\"}"
    excluded=no
    for ex in "${RSYNC_EXCLUDES[@]}"; do
      case "$path" in
        "$ex" | "$ex"/* | */"$ex" | */"$ex"/*)
          excluded=yes
          break
          ;;
      esac
    done
    [ "$excluded" = yes ] || printf '%s\n' "$line"
  done
}

# Abort on a dirty tree: the deploy would ship files that exist in no commit, and
# the next clean deploy would delete them again (this is how last week's
# Challenges / Partner Hub work vanished from TEST).
assert_clean_tree() {
  local changes
  changes="$(deployable_changes)"
  [ -n "$changes" ] || return 0

  DIRTY=yes
  VERSION="${SHA}-dirty"

  if [ "${DEPLOY_ALLOW_DIRTY:-}" = "1" ]; then
    echo
    echo "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!" >&2
    echo "!!  DEPLOY_ALLOW_DIRTY=1 — DEPLOYING UNCOMMITTED WORK               !!" >&2
    echo "!!                                                                  !!" >&2
    echo "!!  The deployed content matches NO COMMIT. Nobody can reproduce or !!" >&2
    echo "!!  review it, and the NEXT CLEAN DEPLOY WILL SILENTLY REVERT IT.   !!" >&2
    echo "!!  Commit and re-deploy as soon as possible.                       !!" >&2
    echo "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!" >&2
    echo >&2
    printf '%s\n' "$changes" | sed 's/^/  /' >&2
    echo >&2
    return 0
  fi

  echo "deploy-platform.sh: working tree is dirty — deploy aborted." >&2
  echo >&2
  echo "This script rsyncs your WORKING TREE with --delete; it does not deploy a" >&2
  echo "commit. Deploying uncommitted files puts code on the server that exists in" >&2
  echo "no commit, and the next clean deploy silently deletes it again." >&2
  echo >&2
  echo "Uncommitted changes that would be deployed:" >&2
  printf '%s\n' "$changes" | sed 's/^/  /' >&2
  echo >&2
  echo "Fix it — commit (or stash) the changes above, then re-run:" >&2
  echo "  git add -A && git commit -m '<what you changed>'" >&2
  echo "  ./deploy/hetzner/deploy-platform.sh" >&2
  echo >&2
  echo "Only if you truly need an unreproducible test deploy:" >&2
  echo "  DEPLOY_ALLOW_DIRTY=1 ./deploy/hetzner/deploy-platform.sh" >&2
  exit 1
}

# Warn (never block) when HEAD is ahead of its upstream: the server would run
# code no teammate can check out from origin.
warn_unpushed_commits() {
  local upstream ahead
  upstream="$(git -C "$ROOT" rev-parse --abbrev-ref --symbolic-full-name '@{upstream}' 2>/dev/null || true)"
  if [ -z "$upstream" ]; then
    echo "   ⚠ Branch ${BRANCH} has no upstream — nothing on origin matches this deploy."
    return
  fi
  ahead="$(git -C "$ROOT" rev-list --count "${upstream}..HEAD" 2>/dev/null || echo 0)"
  if [ "$ahead" -gt 0 ]; then
    echo "   ⚠ ${ahead} commit(s) on ${BRANCH} are not on ${upstream} — push them so"
    echo "     teammates can reproduce what is live: git push"
  fi
}

preflight_git_checks() {
  echo "→ Preflight: git state…"
  if [ "$SHA" = unknown ]; then
    echo "   ⚠ Not a git checkout — cannot verify what is being deployed." >&2
    echo "   Version to deploy: unknown (branch ${BRANCH})"
    echo
    return
  fi
  assert_clean_tree
  warn_unpushed_commits
  echo "   Version to deploy: ${VERSION} (branch ${BRANCH})"
  echo
}

# Deploy manifest written onto the server so anyone can see what is actually live.
# Non-sensitive: sha, branch, who deployed, when.
deploy_manifest() {
  cat <<EOF
version=${VERSION}
sha=${SHA}
dirty=${DIRTY}
branch=${BRANCH}
mode=${DEPLOY_MODE}
deployed_by=$(whoami 2>/dev/null || echo unknown)@$(hostname -s 2>/dev/null || echo unknown)
deployed_at=${DEPLOYED_AT}
EOF
}

# Confirm the running app reports the version we just deployed.
report_live_version() {
  local base_url="$1" body live
  body="$(curl -sS --max-time 15 "${base_url}/api/health" 2>/dev/null || echo '')"
  live="$(printf '%s' "$body" | sed -n 's/.*"version":"\([^"]*\)".*/\1/p')"
  if [ -z "$live" ]; then
    echo "    Live version: unavailable — check GET ${base_url}/api/health"
  elif [ "$live" = "$VERSION" ]; then
    echo "    Live version: ${live} ✓ matches this deploy"
  else
    echo "    Live version: ${live} ✗ expected ${VERSION} — container may not have restarted"
  fi
}

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

  echo "==> LOVEDIS Hetzner deploy (${VERSION}) [mac]"
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
    --exclude src/generated \
    --exclude .deployed-version \
    "$ROOT/" "${ssh_target}:${platform_dir}/"
  echo "   Sync complete"

  echo "→ Writing deploy manifest (${platform_dir}/.deployed-version)…"
  deploy_manifest | ssh "$ssh_target" "cat > '${platform_dir}/.deployed-version'"
  echo "   Manifest written"

  echo "→ Building platform image and restarting container…"
  ssh "$ssh_target" "set -euo pipefail
    cd '${platform_dir}'
    docker build \
      --build-arg APP_VERSION='${VERSION}' \
      --build-arg APP_BRANCH='${BRANCH}' \
      --build-arg APP_DEPLOYED_AT='${DEPLOYED_AT}' \
      -t '${image}' .
    cd '${compose_dir}'
    docker compose up -d platform
    docker compose ps platform
  "
  echo "   Platform container up"

  echo "→ Applying Prisma schema (db push) + marketplace catalog sync…"
  ssh "$ssh_target" "bash ${platform_dir}/deploy/hetzner/migrate-db-push.sh"
  echo "   Schema applied + catalog synced"

  echo "→ Smoke test (platform + homepage)…"
  bash "$ROOT/deploy/hetzner/smoke-test.sh" "49.13.222.76"
  echo
  echo "==> Deploy complete (${VERSION})"
  echo "    Platform: ${app_url}"
  echo "    Homepage: https://home.49.13.222.76.nip.io"
  report_live_version "$app_url"
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
    --exclude src/generated
    --exclude .deployed-version
    -e "$rsync_ssh")

  echo "==> LOVEDIS Hetzner deploy (${VERSION}) [cloud]"
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

  echo "→ Writing deploy manifest (${remote_dir}/.deployed-version)…"
  deploy_manifest | "${ssh_cmd[@]}" "cat > '${remote_dir}/.deployed-version'"
  echo "   Manifest written"

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
docker build --no-cache \
  --build-arg APP_VERSION='${VERSION}' \
  --build-arg APP_BRANCH='${BRANCH}' \
  --build-arg APP_DEPLOYED_AT='${DEPLOYED_AT}' \
  -t "\${PLATFORM_IMAGE}" -f Dockerfile .
cd "${compose_dir}"
docker compose up -d platform
REMOTE
  echo "   Platform container up"

  echo "→ Applying Prisma schema (db push) + marketplace catalog sync…"
  "${ssh_cmd[@]}" "bash ${compose_dir}/migrate-db-push.sh"

  echo "→ Smoke test (platform + homepage)…"
  bash "$ROOT/deploy/hetzner/smoke-test.sh" "$host"

  echo
  echo "==> Deploy complete (${VERSION})"
  echo "    Platform: https://app.${host}.nip.io"
  echo "    Homepage: https://home.${host}.nip.io"
  report_live_version "https://app.${host}.nip.io"
}

# Shared safety gate — runs before the mode dispatch so neither path can skip it.
preflight_git_checks

case "$DEPLOY_MODE" in
  mac) deploy_mac ;;
  cloud) deploy_cloud ;;
  *)
    echo "deploy-platform.sh: unknown DEPLOY_MODE=${DEPLOY_MODE} (use mac or cloud)." >&2
    exit 1
    ;;
esac
