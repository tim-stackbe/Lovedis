#!/usr/bin/env bash
# Build platform image locally, push to GHCR, deploy to Hetzner TEST via SSH.
# Requires: docker, gh (logged in), repo secrets SSH_HOST/SSH_USER/SSH_KEY on GitHub
# OR local SSH access to deploy@49.13.222.76
#
# Usage: ./deploy/hetzner/deploy-platform.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

SHA="$(git rev-parse --short HEAD)"
IMAGE="ghcr.io/tim-stackbe/lovedis:test"

echo "→ Building platform image (${SHA})…"
docker build -t "$IMAGE" -t "ghcr.io/tim-stackbe/lovedis:${SHA}" .

echo "→ Pushing to GHCR…"
echo "$GITHUB_TOKEN" | docker login ghcr.io -u "$(gh api user -q .login)" --password-stdin 2>/dev/null || \
  gh auth token | docker login ghcr.io -u "$(gh api user -q .login)" --password-stdin

docker push "$IMAGE"
docker push "ghcr.io/tim-stackbe/lovedis:${SHA}"

echo "→ Triggering GitHub Actions deploy…"
gh workflow run deploy-hetzner-test.yml --ref "$(git branch --show-current)"

echo "→ Deploy triggered. Watch: gh run watch"
