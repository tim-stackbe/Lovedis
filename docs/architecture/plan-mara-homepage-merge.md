# Plan — Hetzner hybrid deployment (Storyblok + Mara platform)

> **Status (2026-09-05): Active — TEST phase.** Storyblok Visual Editor is the priority — we
> **keep Storyblok** for homepage content and self-host the frontends on Hetzner. The Hetzner box
> is **TEST only**; **`lovedis.de` production DNS must not be changed** until explicit cutover.
>
> Deploy artifacts: `deploy/hetzner/`. Storyblok baseline: `docs/storyblok-baseline/`.
> Payload scaffold (paused): `cms/`.

## Goal

Validate **lovedis.de homepage** (Nuxt + Storyblok) and the **Mara platform** (Next.js) on a
single Hetzner TEST VPS, then cut over production DNS only when ready.

## Decisions locked (2026-09-05)

| Area | Decision |
|---|---|
| **Homepage CMS** | **Keep Storyblok** (SaaS, EU region). No content migration. |
| **Homepage frontend** | **Nuxt (Vue 3)** — separate repo, Docker image on Hetzner |
| **Platform** | **Next.js 16 + React 19** (this repo), NextAuth v5, Prisma 7 |
| **Platform DB** | **Self-hosted PostgreSQL 17** on the VPS (TEST; was Neon in dev) |
| **Hosting** | **Hetzner Cloud — single VPS** (TEST: `49.13.222.76`) |
| **TEST routing** | `home.<ip>.nip.io` → homepage · `app.<ip>.nip.io` → platform |
| **Production routing (later)** | `lovedis.de` → homepage · `app.lovedis.de` → platform |
| **TLS** | Caddy + Let's Encrypt (works on nip.io without DNS changes) |
| **Backups** | Nightly encrypted `pg_dump` → Hetzner Object Storage |
| **Payload CMS** | **Paused** — `cms/` kept for reference only |

### Why Storyblok stays

The Visual Editor (click-on-page inline editing) matters more than full CMS self-hosting. Storyblok
has no self-hosted edition; the hybrid model (self-hosted frontends + Storyblok cloud content) is
the lowest-effort path with the best editor UX.

## Current state

| Piece | Where | Notes |
|---|---|---|
| Homepage `lovedis.de` | Nuxt + Storyblok, **production host (unchanged)** | Separate Nuxt repo |
| Storyblok space | EU SaaS, id `288104308443570` | 126 stories; baseline in `docs/storyblok-baseline/` |
| Mara platform | This repo, Next.js | Neon Postgres in dev; TEST on Hetzner |
| **Hetzner TEST** | `49.13.222.76` (`lovedis-prod`) | `home.*` + `app.*` nip.io — see security/functional test reports |

## Phase 1 — TEST (active now)

```text
                         Storyblok Cloud (EU) — shared with production
                         ┌─────────────────────────┐
                         │ Visual Editor + content   │
                         └───────────┬─────────────┘
                                     │ Delivery API
Hetzner TEST (49.13.222.76)          │
┌────────────────────────────────────┼──────────────────────────┐
│ home.49.13.222.76.nip.io → homepage ◀┘  (Nuxt)               │
│ app.49.13.222.76.nip.io  → platform      (Next.js)            │
│ PostgreSQL 17 (platform data, schema=public)                   │
└────────────────────────────────────────────────────────────────┘

lovedis.de (production)  ──▶  existing host — NOT the Hetzner box yet
```

### TEST rollout steps

1. Update compose + Caddyfile on the TEST server (repo templates in `deploy/hetzner/`).
2. Wire CI for `PLATFORM_IMAGE:test` (this repo) and `HOMEPAGE_IMAGE:test` (Nuxt repo).
3. Deploy with `.env` + `homepage.env`; `NEXTAUTH_URL=https://app.49.13.222.76.nip.io`.
4. Migrate platform DB snapshot to TEST Postgres if needed; `prisma migrate deploy`.
5. Run `./deploy/hetzner/smoke-test.sh` + full functional QA.
6. **Stop here.** Do not touch `lovedis.de` DNS.

## Phase 2 — Production cutover (later, explicit gate)

Only after TEST sign-off:

1. Swap `Caddyfile` → production blocks from `Caddyfile.production.example`.
2. Update `NEXTAUTH_URL=https://app.lovedis.de`; image tags → `:latest`.
3. Lower DNS TTL; point `lovedis.de`, `www`, `app.lovedis.de` at the server IP.
4. Smoke-test production URLs; decommission old homepage host after grace period.
5. **Storyblok unchanged** — same space, editors keep Visual Editor.

## Server stack (Docker Compose)

```text
Hetzner Cloud VPS (Ubuntu 24.04 + Docker)
├─ Caddy         → Auto-TLS, reverse proxy (nip.io on TEST)
├─ homepage      → Nuxt container (Storyblok Delivery API)
├─ platform      → Next.js app (NextAuth, Prisma)
├─ PostgreSQL 17 → data on /mnt/pgdata (Hetzner Cloud Volume)
└─ Backups       → Hetzner Object Storage (S3-compatible)
```

## What is NOT in this deployment

- **Payload CMS** (`cms/` service) — paused
- **Storyblok → Payload migration** — not needed
- **Homepage rewrite in React** — not needed
- **lovedis.de on TEST Caddyfile** — intentionally absent until Phase 2

## One-time migrations (TEST)

| Data | Action |
|---|---|
| **Platform DB** | Optional: `pg_dump` from Neon → restore into TEST Postgres |
| **Homepage content** | None — Storyblok Delivery API |
| **Media** | None — Storyblok CDN |

## What's needed for TEST

- SSH access to `49.13.222.76` (deploy user)
- Nuxt homepage repo in CI (`HOMEPAGE_IMAGE:test`)
- Storyblok delivery token (LOVEDIS space)
- Test-scoped API keys (Resend, etc.) — not production secrets

## Superseded decisions (archived)

The following were decided in Aug 2026 but **superseded on 2026-09-05**:

- ~~Replace Storyblok with Payload CMS 3~~
- ~~Merge homepage into one Next.js app at `lovedis.de`~~
- ~~Single origin: `/` marketing · `/app/*` platform · `/admin` Payload~~
- ~~Payload `payload` schema in Postgres~~

Details: `docs/research/2026-08-27-homepage-visual-cms-options.md`,
`docs/plans/2026-08-27-payload-cms-1b-implementation-plan.md` (paused).

## Open items

- **Nuxt homepage repo** — confirm CI access + `HOMEPAGE_IMAGE` build.
- **TEST API keys** — rotate to test-scoped credentials (audit finding #13).
- **Backup cron** — activate on TEST server (audit finding #31).
- **Storyblok preview URL** — optional: point Visual Editor preview at `home.*.nip.io` for TEST edits (production preview can stay on `lovedis.de` until cutover).

## Related docs

- `deploy/hetzner/README.md` — TEST deploy + production cutover checklist
- `docs/reports/2026-08-27-hetzner-security-audit.md`
- `docs/reports/2026-08-27-hetzner-functional-test.md`
- `docs/storyblok-baseline/` — content model reference
- `cms/README.md` — Payload scaffold (paused)
