# Lovedis Hetzner TEST Server — Security Audit Report

- **Date:** 2026-08-27
- **Auditor:** Automated security-audit agent (read-only)
- **Target:** Hetzner TEST server `49.13.222.76` (`lovedis-prod`, Ubuntu 26.04 LTS)
  - Platform (Next.js): `https://app.49.13.222.76.nip.io`
  - Homepage (Nuxt): `https://home.49.13.222.76.nip.io`
  - Stack in `/opt/lovedis` — Docker Compose: `caddy`, `platform`, `homepage`, `db` (postgres:18)
- **Method:** Read-only SSH inspection (`ssh hetzner-lovedis`, user `deploy`) + external read-only network/HTTP/TLS probes + cross-reference against the repo at `/Users/timmeggert/Documents/Lovedis`.
- **Constraint:** Audit only. No configuration, firewall, container, or database changes were made; nothing was installed. Secret values are **not** reproduced anywhere in this report.

---

## Executive Summary

The TEST server is in **good overall security posture**. The host is hardened well beyond a default install: UFW is active with default-deny inbound, SSH is key-only with root login disabled and fail2ban active, kernel sysctl hardening is applied, unattended security upgrades are enabled, and TLS is modern (Let's Encrypt, TLS 1.2/1.3 only, HSTS, HTTP→HTTPS redirect). The database port **5432 is not reachable externally** and is not published to the host — only 22/80/443 are exposed. Application-level auth (bcrypt(10), hardened password-reset flow with hashed single-use TTL tokens and no user enumeration) is well implemented.

No **Critical** issues were found. The most material items are **Medium**:

- **No Content-Security-Policy header on the authenticated `app.*` platform** (the homepage has a strong CSP; the platform does not).
- **No database backups / DR** configured (no script, cron, or timer; only the local `pgdata` volume).
- **The TEST stack contains live-looking third-party API credentials** (Cloudflare R2, Resend, Storyblok) injected via env files — given the prior secrets incident, these should be test-scoped and rotated, and must differ from production.

Lower-severity items: `deploy` has passwordless (`NOPASSWD:ALL`) sudo, SSH (22) is open to the whole internet (rate-limited but not source-restricted; Hetzner Cloud Firewall status could not be verified), no app-layer login rate-limiting/lockout beyond bcrypt cost, and the full platform env (including unrelated secrets) is loaded into the postgres container.

---

## Findings Table

| # | Area | Severity | Finding | Evidence | Recommended Remediation |
|---|------|----------|---------|----------|--------------------------|
| 1 | Network exposure | **Info (Good)** | Only 22/80/443 externally open. DB 5432 filtered externally and **not host-published** (Compose uses `expose: 5432` only, on the internal `lovedis_default` network). | External: `nc 5432` → not reachable; `22/80/443` open. `ss -tulpen`: listeners only on 80/443/22 (0.0.0.0) + localhost DNS/chrony. `docker ps`: db shows `5432/tcp` (no host mapping); only caddy maps `0.0.0.0:80->80, :443->443`. | None required. Keep DB unpublished. |
| 2 | Network exposure (SSH) | **Low** | SSH (22) is reachable from the entire internet. Mitigated by key-only auth + fail2ban + UFW `LIMIT`, but there is no source-IP restriction. Hetzner Cloud Firewall status not verifiable from inside the host. | UFW `22/tcp LIMIT IN Anywhere`; `nc 22` open from external. Cloud firewall = **unverified**. | Restrict 22 to known admin IPs via Hetzner Cloud Firewall or UFW `from` rules; confirm a cloud firewall exists. |
| 3 | SSH hardening | **Info (Good)** | Strong config: `PasswordAuthentication no`, `PermitRootLogin no`, pubkey-only, `MaxAuthTries 3`, `LoginGraceTime 20`, `AllowUsers deploy`, no agent/TCP/X11 forwarding, `LogLevel VERBOSE`, modern kex/ciphers. | `sshd -T` + `/etc/ssh/sshd_config.d/99-hardening.conf`. | None. Optional: remove legacy MACs (see #4). |
| 4 | SSH ciphers | **Low/Info** | Legacy MACs still offered (`hmac-sha1`, `umac-64`). Ciphers/KEX are strong (chacha20/aes-gcm, mlkem768x25519, curve25519). | `sshd -T` `macs` line. | Optionally restrict `MACs` to ETM SHA-2 variants only. |
| 5 | fail2ban | **Info (Good)** | Active `sshd` jail, `maxretry 3`, `bantime 1h`, `findtime 10m`, backend systemd; 2 IPs currently banned, 11 total. | `fail2ban-client status sshd`; `/etc/fail2ban/jail.local`. | None. |
| 6 | Firewall (UFW) | **Info (Good)** | UFW active; default **deny incoming**, allow outgoing, deny routed; only `22 LIMIT`, `80 ALLOW`, `443 ALLOW`. | `ufw status verbose`; `nft list ruleset` (ufw-managed chains). | None. |
| 7 | Firewall / Docker interaction | **Info** | Docker manages its own iptables chains and can bypass UFW for *published* ports. Only `caddy` publishes ports (intended); `db` is not published, so no unintended exposure exists today. | `docker compose config` (only caddy has `ports:`), external 5432 filtered. | Keep DB unpublished; be aware any future `ports:` mapping bypasses UFW. |
| 8 | TLS/HTTPS | **Info (Good)** | Let's Encrypt cert (issuer `E1`/`YE1`), valid `Aug 24 2026 → Nov 22 2026`. TLS 1.2 and 1.3 offered; TLS 1.1 refused. HTTP→HTTPS `308` redirect. HTTP/2 + HTTP/3 (`alt-svc h3`). HSTS present on both hosts (home adds `preload`). | `openssl s_client` (tls1_3/tls1_2 succeed, tls1_1 alert 70); `curl -sI http://…` → 308; response `strict-transport-security` headers. | None. Renewal is automated by Caddy. |
| 9 | HTTP headers — homepage | **Info (Good)** | `home.*` returns a full, well-scoped CSP plus HSTS+preload, `X-Content-Type-Options`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy`, `Permissions-Policy`, `X-Permitted-Cross-Domain-Policies: none`. | `curl -I https://home.49.13.222.76.nip.io/`. | None. |
| 10 | HTTP headers — platform | **Medium** | `app.*` is **missing `Content-Security-Policy`**. It does send HSTS, `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`. Absence of CSP weakens XSS mitigation on the authenticated app. | `curl -I https://app.49.13.222.76.nip.io/` (no CSP line); Caddyfile `app` block has no CSP directive. | Add a CSP for `app.*` (Caddy `header` block or Next.js middleware), starting report-only then enforcing. |
| 11 | Secrets — file perms | **Info (Good)** | `/opt/lovedis/.env` and `platform.env` are `600 deploy:deploy` (not world-readable). Compose injects via `env_file:` (not inline hardcoded). No `.git` working copy on server. | `ls -la /opt/lovedis`; `find … -printf %m` → `600`; server `docker-compose.yml` uses `env_file`. | None. |
| 12 | Secrets — HTTP exposure | **Info (Good)** | No secret files served over HTTP. `app` `/.env`, `/platform.env`, `/.git/config`, `/docker-compose.yml` → `307` (auth redirect, not the file); `home` `/.env` → `404`. Container logs show no secret/token strings. | `curl` status codes; `docker logs --tail 300 | grep -icE 'password|secret|token|api_key'` → 0. | None. |
| 13 | Secrets — live third-party keys in TEST | **Medium** | The TEST stack env contains live-looking third-party credentials (Cloudflare R2 access key + secret, Resend API key, Storyblok tokens) plus `AUTH_SECRET`/DB password. Given the prior incident, TEST should use test-scoped, rotated keys distinct from production. (Values were observed via `docker compose config` but are **not** reproduced here.) | `docker compose config` environment (redacted). | Rotate and replace with test-scoped keys; verify none match production; consider Docker/compose secrets instead of env. |
| 14 | Secrets — over-provisioning to DB | **Low** | The `db` (postgres) container loads the full `platform.env` (`AUTH_SECRET`, R2, Resend, Storyblok, etc.) though it only needs `POSTGRES_*`. Unnecessarily widens the secret blast-radius. | Server `docker-compose.yml`: `db: env_file: platform.env`. | Give `db` a dedicated env file containing only `POSTGRES_*`. |
| 15 | Docker daemon hardening | **Info (Good)** | `daemon.json`: `no-new-privileges: true`, `live-restore: true`, json-file log rotation (`10m` × 3). | `/etc/docker/daemon.json`. | None. |
| 16 | Container hardening | **Info (Good)** | No `privileged`, no added caps, no `docker.sock` mounts, `restart: unless-stopped`. `platform` runs as non-root `nextjs(1001)`, `homepage` as non-root `node(1000)`. | `docker inspect` (Priv=false, Caps+=[], SecOpt=[], no socket binds); `docker exec id`. | None. |
| 17 | Container users (db/caddy) | **Low/Info** | `db` and `caddy` containers run as `root` (standard for the official images; postgres drops to `postgres` for the DB process). No read-only rootfs anywhere. | `docker exec … id` → uid=0 for db/caddy. | Optional: `read_only: true` rootfs + tmpfs where feasible; run caddy as non-root. |
| 18 | Image freshness | **Info** | `caddy:2` image is ~2 months old; leftover `postgres:17` and `hello-world` images present. App images are `:test` (17h / 2d old). | `docker images`. | Periodically `pull`/rebuild base images for CVE patches; prune unused images. |
| 19 | OS updates | **Info (Good)** | Ubuntu 26.04 LTS. 6 packages upgradable, **0 security-flagged**. `unattended-upgrades` installed + enabled with `-security` origins and daily update/upgrade timers. | `apt list --upgradable`; `systemctl is-enabled unattended-upgrades`; `50unattended-upgrades`. | Apply pending updates in a maintenance window. |
| 20 | Auto-reboot | **Info** | `Unattended-Upgrade::Automatic-Reboot` not confirmed enabled — kernel security updates may wait for a manual reboot. | Not present in grepped `50unattended-upgrades` output. | Decide on `Automatic-Reboot "true"` + reboot window, or track manual reboots. |
| 21 | Kernel/sysctl hardening | **Info (Good)** | `kernel.dmesg_restrict=1`, `kernel.kptr_restrict=2`, `net.ipv4.conf.all.rp_filter=1`, `tcp_syncookies=1`, `accept_redirects=0`, `unprivileged_bpf_disabled=2`. | `/etc/sysctl.d/99-hardening.conf`; `sysctl -n`. | None. |
| 22 | Sudo privileges | **Low** | `deploy` has `NOPASSWD:ALL` sudo (full root without a password). Combined with internet-facing SSH, a compromised key = immediate root. | `/etc/sudoers.d/*`: `deploy ALL=(ALL) NOPASSWD:ALL`; `sudo` group = `deploy`. | Require a password for sudo, or scope NOPASSWD to the specific deploy commands. |
| 23 | Auth failures / logins | **Info (Good)** | No failed-login backlog surfaced (`lastb` empty); fail2ban actively banning brute-force sources. | `lastb`; fail2ban status. | None. |
| 24 | App auth — password hashing | **Info (Good)** | Passwords hashed with `bcrypt(10)` for create, temp-password, and reset flows. | Repo `src/auth.ts`, `src/app/actions/{auth,users,companies}.ts`. | None. |
| 25 | App auth — password reset | **Info (Good)** | Tokens: 32-byte random, **SHA-256 hashed at rest** (raw never stored), **single-use** (`usedAt`), **60-min TTL**, single-live-token per user, **60s throttle**, and **neutral non-enumerating** response for every submission. Reset forces fresh login. | Repo `src/lib/password-reset.ts`, `src/app/actions/auth.ts`. Not exercised live (avoided real side effects). | None. |
| 26 | App — health endpoint | **Info (Good)** | `/api/health` returns only `{status, database, timestamp}`; no version/stack/secret leakage. | `curl https://app.…/api/health` → `{"status":"ok","database":"up",…}`; repo `src/app/api/health/route.ts`. | None (the `database` up/down flag is minor, acceptable). |
| 27 | App — cron endpoint | **Info (Good)** | `/api/cron/reminders` fails closed in production: requires `Authorization: Bearer <CRON_SECRET>`, POST-only, `GET` → 405, unauthorized `POST` → 401 (no side effect). | Live: GET → 405, unauth POST → 401; repo route source. | None. (Note: `CRON_SECRET` absent in env → reminders won't run — functional, out of scope.) |
| 28 | App — error handling | **Info (Good)** | Unknown paths redirect to `/login` via auth middleware; no stack traces or framework internals leaked. | `curl` unknown paths → 307/redirect, no stack trace body. | None. |
| 29 | App — rate limiting | **Low** | App-layer throttling exists only for password-reset issuance. No general per-IP rate limiting / account lockout on `login` (brute-force bounded only by bcrypt cost). fail2ban covers SSH only. | Repo review (no rate-limit middleware); Caddyfile has no rate_limit. | Add login rate-limiting / lockout (Caddy rate_limit, app middleware, or fail2ban filter on Caddy access logs). |
| 30 | CORS | **Info (Good)** | No permissive `Access-Control-Allow-Origin` wildcards found; homepage CSP `connect-src` is explicitly scoped. | Repo grep (no `Access-Control-Allow-Origin: *`); response headers. | None. |
| 31 | Backups / DR | **Medium** | **No database backup configured** — no `backup-postgres.sh`, no cron, no systemd timer, no offsite copy. Only the local `pgdata` Docker volume exists. Data loss on volume/host failure would be unrecoverable. | `find … -iname '*backup*'` (only Storyblok/app dirs); `crontab -l` = none; `systemctl list-timers` = no backup timer; `docker volume ls` = local `lovedis_pgdata`. | Add scheduled `pg_dump` + offsite storage (e.g. R2) with retention + periodic restore test. |

---

## Prioritized Remediation List

### Critical
- None.

### High
- None.

### Medium
1. **Add a Content-Security-Policy to `app.*`** (platform). The homepage has a strong CSP; the authenticated app has none. Start report-only, then enforce. *(Finding #10)*
2. **Configure database backups + DR.** Scheduled `pg_dump` to offsite storage with retention and a tested restore path. *(Finding #31)*
3. **Rotate/replace TEST third-party credentials** (Cloudflare R2, Resend, Storyblok) with test-scoped keys distinct from production; move toward Docker/compose secrets. *(Finding #13)*

### Low
4. Restrict SSH (22) to known admin IPs (Hetzner Cloud Firewall or UFW `from`), and confirm a cloud firewall exists. *(Findings #2)*
5. Remove `NOPASSWD:ALL` for `deploy` (require sudo password or scope it). *(Finding #22)*
6. Add login rate-limiting / account lockout. *(Finding #29)*
7. Give the `db` container a `POSTGRES_*`-only env file instead of the full `platform.env`. *(Finding #14)*
8. Optional hardening: trim legacy SSH MACs, run `caddy`/`db` with read-only rootfs / non-root where feasible, enable unattended-upgrades auto-reboot window, prune stale images, apply the 6 pending package updates. *(Findings #4, #17, #18, #19, #20)*

---

## Checks That Could NOT Be Completed / Not Verified

- **Hetzner Cloud Firewall (cloud-level):** Not visible from inside the host. Whether a cloud firewall further restricts port 22 (or any port) is **unverified**. Host-level UFW was fully verified.
- **Third-party key scoping:** Could not confirm the TEST keys differ from production without printing values (not done by policy). Flagged for manual verification.
- **`.env.example` contents:** Only permissions/paths were checked (`homepage/.env.example`, `platform/.env.example` are `644` templates). Their contents were not printed; confirm they contain no real secrets.
- **Live password-reset exercise:** Verified from code + endpoint behavior only; not triggered end-to-end to avoid creating real reset side effects (emails/tokens).
- **Transient SSH rate-limit:** Mid-audit, port 22 briefly returned "Connection refused" after several rapid SSH connections (UFW `LIMIT` rate-limit tripped). Resolved by pausing ~150s and reconnecting once. No rule was changed; behavior is self-healing.

---

## Audit Integrity Statement

- **No** server configuration, firewall, fail2ban, container, or database changes were made.
- **Nothing** was installed on the server or locally.
- This was a **read-only** audit using inspection commands and external read-only probes.
- **No** secret values, raw tokens, or password hashes are printed in this report.
- State-changing commands executed: **none** that alter server state. The only side effect was tripping UFW's transient SSH rate-limit (self-healing) and one **unauthorized** `POST /api/cron/reminders` which returned `401` and performed **no** action.
- **Scope:** TEST server only. Neon / production / Dedalus were **not** touched.
