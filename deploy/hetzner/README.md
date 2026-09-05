# Hetzner deployment (Storyblok hybrid)

**Current phase: TEST only.** The Hetzner box (`49.13.222.76`) is a staging environment.
**Do not change `lovedis.de` DNS** until the stack passes TEST smoke tests and you explicitly
run production cutover (see below).

| Environment | Homepage | Platform | CMS |
|---|---|---|---|
| **Production (live today)** | `lovedis.de` — existing host (Cloudflare / unchanged) | varies | Storyblok Visual Editor |
| **Hetzner TEST (this deploy)** | `https://home.49.13.222.76.nip.io` | `https://app.49.13.222.76.nip.io` | Storyblok (same space, read via API) |

See the full plan: `docs/architecture/plan-mara-homepage-merge.md`.

## Architecture (TEST)

```text
Hetzner TEST VPS (49.13.222.76)       Storyblok Cloud (EU)
┌──────────────────────────────┐      ┌──────────────────────┐
│ home.*.nip.io  → homepage    │◀─ API│ Visual Editor        │
│ app.*.nip.io   → platform    │      │ Content (unchanged)  │
│ Postgres (platform data)     │      └──────────────────────┘
│ Caddy + TLS (auto, nip.io)   │
└──────────────────────────────┘

lovedis.de  ──▶  NOT pointed here yet (production stays where it is)
```

## Files

| File | Purpose |
|---|---|
| `docker-compose.yml` | `caddy` + `platform` + `homepage` + `db` |
| `Caddyfile` | **Active TEST** routes (`home.*` / `app.*` nip.io) |
| `Caddyfile.production.example` | **Inactive** — `lovedis.de` blocks for future cutover |
| `.env.example` | Platform + Postgres + backup vars → copy to `.env` |
| `homepage.env.example` | Storyblok tokens → copy to `homepage.env` |
| `smoke-test.sh` | Read-only HTTP checks against the TEST URLs |
| `backup-postgres.sh` | Nightly encrypted `pg_dump` → Object Storage (cron) |
| `github-actions-deploy.yml.example` | CI build + SSH deploy to TEST |

## Deploy / update the TEST stack

On the server (`/opt/lovedis/deploy/hetzner`):

```bash
cp .env.example .env                    # first time only; fill secrets
cp homepage.env.example homepage.env    # first time only; Storyblok token
chmod 600 .env homepage.env

docker compose pull platform homepage
docker compose up -d
docker compose exec -T platform npx prisma migrate deploy

# From your laptop (or on the server):
./smoke-test.sh 49.13.222.76
```

### Env checklist (TEST)

- `NEXTAUTH_URL=https://app.49.13.222.76.nip.io` — must match the public TEST URL
- `PLATFORM_IMAGE` / `HOMEPAGE_IMAGE` — use `:test` tags, not `:latest`
- Storyblok delivery token in `homepage.env` — read-only; same LOVEDIS space as production
- Resend / other API keys — **test-scoped**, distinct from production (see security audit #13)

## Smoke test

```bash
./deploy/hetzner/smoke-test.sh              # default IP 49.13.222.76
./deploy/hetzner/smoke-test.sh <other-ip>   # different test box
```

Checks: platform `/api/health`, login, auth redirect; homepage `/` and `/de`.

Full QA reference: `docs/reports/2026-08-27-hetzner-functional-test.md`.

## Production cutover (later — do not run yet)

Only when TEST is green and you are ready to move real traffic:

1. Confirm stack on nip.io — `./smoke-test.sh` passes, editors happy with Storyblok preview against TEST URLs if configured.
2. Lower TTL on `lovedis.de` DNS to 300 s (24 h ahead).
3. Swap `Caddyfile` TEST blocks for `Caddyfile.production.example` content.
4. Update `.env`: `NEXTAUTH_URL=https://app.lovedis.de`, image tags → `:latest`.
5. Point DNS: `lovedis.de`, `www.lovedis.de`, `app.lovedis.de` → server IP.
6. `docker compose up -d` + reload Caddy; smoke-test production URLs.
7. Decommission old homepage host after a grace period. **Storyblok space stays as-is.**

## Provisioning (new TEST server)

1. **CX32** or **CAX21** (Ubuntu 24.04) + Cloud Volume at `/mnt/pgdata`.
2. Harden: SSH keys, UFW/firewall (22/80/443), fail2ban, unattended-upgrades.
3. Docker + Compose + `aws` CLI (for backups).
4. Object Storage bucket for TEST backups (`lovedis-backups-test`).
5. Clone repo → `/opt/lovedis`, copy env files, update `Caddyfile` IP if not `49.13.222.76`.
6. `docker compose up -d` + migrations + backup cron.

## Prerequisites

- **Nuxt homepage repo** — separate from this monorepo; CI builds `HOMEPAGE_IMAGE`.
- **Storyblok delivery token** — LOVEDIS space (`docs/storyblok-baseline/`).
- **SSH access** to the TEST server.

## Paused / not used

- **`cms/` (Payload CMS)** — paused; Storyblok is the active CMS.
- **`lovedis.de` in Caddyfile** — intentionally absent; see `Caddyfile.production.example`.

## Related reports

- `docs/reports/2026-08-27-hetzner-security-audit.md`
- `docs/reports/2026-08-27-hetzner-functional-test.md`
