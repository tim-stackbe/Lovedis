#!/usr/bin/env bash
# Read-only deployment + security probe for the Hetzner TEST stack.
# Usage: ./deployment-audit.sh [server-ip]
set -euo pipefail

IP="${1:-49.13.222.76}"
APP="https://app.${IP}.nip.io"
HOME_URL="https://home.${IP}.nip.io"
TS="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

section() { echo; echo "=== $1 ==="; }

curl_code() {
  curl -sS -o /dev/null -w '%{http_code}' --max-time 15 "$1" 2>/dev/null || echo "000"
}

curl_code_post() {
  curl -sS -o /dev/null -w '%{http_code}' -X POST --max-time 15 "$1" 2>/dev/null || echo "000"
}

curl_headers() {
  curl -sS -I --max-time 15 "$1" 2>/dev/null || true
}

check_route() {
  local label="$1" url="$2" expect="$3"
  local code
  code="$(curl_code "$url")"
  if [ "$code" = "$expect" ]; then
    echo "  OK   $label ($code) $url"
  else
    echo "  FAIL $label (got $code, want $expect) $url"
  fi
}

section "Lovedis Hetzner deployment audit — $TS"
echo "Target IP: $IP"
echo "Platform: $APP"
echo "Homepage: $HOME_URL"

section "1. Container / route smoke"
check_route "platform health" "${APP}/api/health" "200"
check_route "platform login" "${APP}/login" "200"
check_route "platform unauth admin" "${APP}/dashboard/admin" "307"
check_route "platform register" "${APP}/register" "200"
check_route "platform cron GET" "${APP}/api/cron/reminders" "405"
code="$(curl_code_post "${APP}/api/cron/reminders")"
if [ "$code" = "401" ]; then
  echo "  OK   platform cron POST unauth ($code) ${APP}/api/cron/reminders"
else
  echo "  FAIL platform cron POST unauth (got $code, want 401) ${APP}/api/cron/reminders"
fi
check_route "homepage root" "${HOME_URL}/" "302"
check_route "homepage /de" "${HOME_URL}/de" "200"
check_route "homepage /en" "${HOME_URL}/en" "200"
check_route "homepage startups" "${HOME_URL}/de/startups" "200"

section "2. TLS / HTTPS"
for host in "app.${IP}.nip.io" "home.${IP}.nip.io"; do
  echo "--- $host ---"
  echo | openssl s_client -connect "${host}:443" -servername "$host" 2>/dev/null | openssl x509 -noout -subject -issuer -dates 2>/dev/null || echo "  TLS check failed"
  http_code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 10 "http://${host}/" 2>/dev/null || echo 000)"
  echo "  HTTP→HTTPS redirect: $http_code"
done

section "3. Security headers — platform ($APP)"
curl_headers "${APP}/login" | rg -i '^(strict-transport|x-content-type|x-frame|referrer-policy|permissions-policy|content-security-policy|server):' || echo "  (no matching headers found)"

section "4. Security headers — homepage ($HOME_URL/de)"
curl_headers "${HOME_URL}/de" | rg -i '^(strict-transport|x-content-type|x-frame|referrer-policy|permissions-policy|content-security-policy|server):' || echo "  (no matching headers found)"

section "5. Secret / config file exposure"
for path in "/.env" "/platform.env" "/.git/config" "/docker-compose.yml"; do
  for base in "$APP" "$HOME_URL"; do
    code="$(curl_code "${base}${path}")"
    echo "  $base$path → $code"
  done
done

section "6. Health endpoint body (no secret leak check)"
curl -sS --max-time 10 "${APP}/api/health" 2>/dev/null || echo "  unreachable"

section "7. External port probe (from this machine)"
for port in 22 80 443; do
  if nc -z -G 3 "$IP" "$port" 2>/dev/null; then
    echo "  OPEN  $port"
  else
    echo "  closed/filtered $port"
  fi
done
for port in 5432 3000; do
  if nc -z -G 2 "$IP" "$port" 2>/dev/null; then
    echo "  WARN OPEN $port (should be closed externally)"
  else
    echo "  closed/filtered $port (expected)"
  fi
done

section "8. Storyblok / production DNS sanity"
prod_ip="$(dig +short lovedis.de A 2>/dev/null | head -1 || echo unknown)"
echo "  lovedis.de A → ${prod_ip:-unknown}"
if [ "$prod_ip" = "$IP" ]; then
  echo "  WARN lovedis.de resolves to the TEST server IP"
else
  echo "  OK   lovedis.de is NOT on TEST IP $IP"
fi

echo
echo "Audit complete."
