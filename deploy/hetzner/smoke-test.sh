#!/usr/bin/env bash
# Quick smoke test for the Hetzner TEST stack. Read-only HTTP checks only.
# Usage: ./smoke-test.sh [server-ip]
# Default IP: 49.13.222.76 (lovedis-prod TEST box)
set -euo pipefail

IP="${1:-49.13.222.76}"
APP="https://app.${IP}.nip.io"
HOME="https://home.${IP}.nip.io"

pass=0
fail=0

check() {
  local name="$1"
  local url="$2"
  local expect="${3:-200}"
  local code
  code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 15 "$url" || echo "000")"
  if [ "$code" = "$expect" ] || { [ "$expect" = "2xx" ] && [ "${code:0:1}" = "2" ]; }; then
    echo "  OK   $name  ($code)  $url"
    pass=$((pass + 1))
  else
    echo "  FAIL $name  (got $code, want $expect)  $url"
    fail=$((fail + 1))
  fi
}

echo "=== Lovedis Hetzner TEST smoke test ==="
echo "Server IP: $IP"
echo

echo "--- Platform ($APP) ---"
check "health"       "${APP}/api/health" "200"
check "login page"   "${APP}/login" "2xx"
check "unauth dash"  "${APP}/dashboard/admin" "307"

echo
echo "--- Homepage ($HOME) ---"
check "root redirect" "${HOME}/" "302"
check "de locale"     "${HOME}/de" "200"

echo
echo "--- Summary ---"
echo "  Passed: $pass"
echo "  Failed: $fail"
[ "$fail" -eq 0 ]
