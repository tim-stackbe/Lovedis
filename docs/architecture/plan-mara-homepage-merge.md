# Plan — Merge Mara Platform + lovedis.de Homepage (with design refresh)

> Status: **Decided, not yet started.** Saved for later. See diagram:
> `docs/architecture/lovedis-architecture.jpg` (source: `lovedis-architecture.svg`).
> Deploy artifacts: `deploy/hetzner/`.

## Goal
Unify the marketing homepage and the Mara platform into **one Next.js app**, refresh the
design, drop Storyblok, and **self-host everything on Hetzner** (incl. the database) —
while keeping a great editing experience for non-technical marketing/ops people.

## Decisions locked
- **CMS:** Replace Storyblok with **Payload CMS 3**, embedded in the Next.js app.
- **Editors:** Non-technical people edit content via a proper UI (`/admin`) — no code/PRs.
- **Hosting:** **Hetzner Cloud — a single Cloud Server (VPS)**. Not Webhosting (too limited: 384 MB memory, PHP-process caps, `next build` would OOM), not Dedicated (overkill).
  - **Size:** **CX32** (x86, 4 vCPU / 8 GB / 80 GB) **or CAX21** (ARM, cheaper, same specs). 8 GB is enough because **builds run in CI**, not on the server.
- **Database:** **Self-hosted PostgreSQL 17 on the same VPS** (Docker). No external DB anymore (was Neon).
  - Driver switches from `@prisma/adapter-neon` → **`@prisma/adapter-pg`** (already a dependency).
  - Data lives on a **Hetzner Cloud Volume** (survives server rebuild, snapshot-able).
  - Payload → `schema=payload` (Drizzle); app → `schema=public` (Prisma).
- **Media:** **Hetzner Object Storage (S3-compatible)** via Payload's S3 storage adapter (replaces the earlier Vercel Blob idea).
- **Backups:** **Nightly `pg_dump`, encrypted, to Hetzner Object Storage**; plus Hetzner Cloud server snapshots as a coarse net; optional WAL archiving (pgBackRest/wal-g) for PITR later. **Restores must be tested.**
- **Auth:** Keep **NextAuth v5 (JWT)** for platform users; separate **Payload Users** collection for content editors.
- **Routing (single origin `lovedis.de`):** `/` marketing · `/app/*` platform · `/admin` Payload.
- **Design:** Ship the refresh (Concept A/B mockups) as shared **Tailwind v4 tokens**.
- **Content freshness:** ISR + **on-demand revalidation** (publish → `revalidateTag`).
- **Build/CI + orchestration:** GitHub Actions builds a Docker image (`prisma generate` + `next build` standalone) and pushes it to a registry (GHCR). **Coolify** on the VPS pulls that prebuilt image and runs it — git-push-style deploys, auto-TLS, managed Postgres + scheduled backups, one-click rollbacks. 8 GB suffices because builds run in CI, not on the box.

## Current state (for reference)
- **Homepage `lovedis.de`:** Nuxt (Vue) + Storyblok, SSG, on Cloudflare. We only have Storyblok access, not the Nuxt repo → rebuilding in Next.js regains frontend control.
- **Mara platform (this repo):** Next.js 16 + React 19 (RSC, Server Actions), NextAuth v5, Prisma 7, Tailwind v4. Already ships `@prisma/adapter-pg` (local PG) alongside the Neon adapter.

## Target architecture
See `docs/architecture/lovedis-architecture.jpg`. One Next.js app on a Hetzner Cloud VPS:
- Marketing (`/`, RSC + ISR), Platform (`/app/*`, role-gated), Payload editor (`/admin`), `/api/revalidate` + `/api/auth` + `/api/health`.
- Shared server layer: Payload (Local API) + NextAuth (JWT) + Server Actions.
- On the VPS (Docker): **Caddy** (Auto-TLS reverse proxy) + **Next.js app** + **PostgreSQL 17** (data on Cloud Volume).
- External Hetzner service: **Object Storage (S3)** for media + nightly DB backups.

## Server stack (on the VPS)
```text
Hetzner Cloud VPS (Ubuntu 24.04 + Docker)
├─ Caddy            → Auto-TLS (Let's Encrypt), reverse proxy → app:3000
├─ Next.js 16 app   → Payload CMS embedded, runs `node server.js`
├─ PostgreSQL 17    → data on /mnt/pgdata (Hetzner Cloud Volume)
└─ (optional) Redis → caching / sessions
   Media + backups  → Hetzner Object Storage (S3-compatible)
```

## Payload data model (mapped from Storyblok)
- **Globals:** `SiteSettings`, `Navigation`.
- **Collections:** `Pages` (flexible blocks), `Events` (agenda items **+ a real `stage` field**), `Speakers`, `Partners`, `Media`, `Users` (editors).

## Migrations (one-time)
- **Content:** Export Storyblok stories/components → transform (richtext → Lexical, assets → Media) → import into Payload via Local API. Diff against `docs/storyblok-baseline/`.
- **Database:** `pg_dump` from Neon → `pg_restore` into on-server PostgreSQL; verify row counts.

## Rollout (strangler-fig, low risk)
1. **Provision** Hetzner VPS + Cloud Volume + Object Storage; harden (SSH keys, firewall, non-root, fail2ban, unattended-upgrades); install Docker + Caddy.
2. **Scaffold** Payload in the repo; stand up Postgres container; wire CI image build + SSH deploy.
3. **Model + import** collections; verify content in `/admin`.
4. **Rebuild homepage** in React from Payload, screen-by-screen, applying the design refresh; validate vs baseline screenshots.
5. **Wire platform** under `/app/*` with NextAuth; shared design tokens.
6. **Cutover** `lovedis.de` DNS → VPS IP; retire Nuxt + Storyblok + Neon.

## What's needed to actually deploy
- A **Hetzner Cloud server** (you create it) **or** a **Hetzner Cloud API token** (I provision via `hcloud`).
- **SSH access** to the server (my key authorized) — no SSH, no deploy.
- **DNS control** for `lovedis.de` (to point at the server at cutover).
- **Hetzner Object Storage** credentials (S3 access key/secret + endpoint).

## Runbook — optimal Hetzner deploy (Coolify + CI-built image, 8 GB)

**Target:** one Hetzner Cloud VPS (**CX32** x86 or **CAX21** ARM · 8 GB) + Cloud Volume (Postgres data) + Object Storage (media & backups). Image built in **CI**, run by **Coolify**.

### 0. Access needed first
Hetzner server *or* API token · SSH key authorized · DNS control for `lovedis.de` · Object Storage creds (endpoint + key/secret) · GHCR registry access · Resend API key.

### 1. Provision
- Create server (Ubuntu 24.04); attach a **Cloud Volume**, format + mount at `/mnt/pgdata` (add to `/etc/fstab`).
- Hetzner **Firewall**: allow 22 / 80 / 443 only. Set reverse DNS on the IP.

### 2. Harden
- SSH keys only (disable password login), non-root sudo user, `ufw`, `fail2ban`, `unattended-upgrades`.

### 3. Install Coolify
- Run the Coolify install script. Expose the dashboard on `deploy.lovedis.de` with its own TLS; enable 2FA.

### 4. CI image (GitHub Actions)
- `Dockerfile`: node base → `prisma generate` → `next build` (`output: 'standalone'`) → runtime image runs `node server.js` on `:3000`.
- Workflow builds + pushes `ghcr.io/OWNER/lovedis:<sha>` and `:latest` on push to `main`. (Adapt `deploy/hetzner/github-actions-deploy.yml.example` to **build+push only** — Coolify does the deploy via webhook.)

### 5. App in Coolify
- New resource → **Docker Image** from GHCR (private-registry creds) → `ghcr.io/OWNER/lovedis:latest`, port `3000`, domain `lovedis.de` (Coolify issues TLS).
- **Env:** `DATABASE_URL` (→ Coolify Postgres), `NEXTAUTH_URL=https://lovedis.de`, `NEXTAUTH_SECRET`, `PAYLOAD_SECRET`, `S3_*` (media), `RESEND_API_KEY`, `EMAIL_FROM`.
- Health check: `/api/health`. Enable **auto-deploy** on new `:latest` (CI webhook).

### 6. Postgres + backups
- Coolify → **PostgreSQL 17** database; bind its data dir to `/mnt/pgdata` (Cloud Volume).
- Schemas: `public` (Prisma) + `payload` (Payload).
- Enable Coolify **scheduled backups → Object Storage** (keep `deploy/hetzner/backup-postgres.sh` as a second belt-and-braces cron if wanted).

### 7. Migrations
- After first deploy: `prisma migrate deploy` + Payload migrations (via Coolify exec). Seed if needed.

### 8. Data + content migration (one-time)
- **DB:** `pg_dump` from Neon → restore into Coolify Postgres; verify row counts.
- **Content:** run Storyblok → Payload import; verify in `/admin`; diff vs `docs/storyblok-baseline/`.

### 9. Cutover
- Lower DNS TTL ahead of time → point `lovedis.de` A/AAAA at the server IP → verify TLS → smoke-test marketing + `/app/*` + `/admin` + a Resend test mail.
- Decommission Nuxt + Storyblok + Neon after a grace period.

### 10. Verify + operate
- Test a **deploy + rollback** in Coolify; test a **backup restore**; set up uptime + error alerting.

## Open items to confirm when we resume
- Final domain shape: `lovedis.de/app/*` (single origin) vs `app.lovedis.de` (subdomain).
- Container registry choice (GHCR vs Hetzner) for CI image.
- CAX21 (ARM) vs CX32 (x86) — ARM is cheaper and fine for Node; x86 maximally compatible.
- Deploy style: **decided → Coolify + CI-built image (8 GB).** Plain Docker Compose templates stay in `deploy/hetzner/` as a minimal fallback.
- **Email sending: leaning toward [Resend](https://resend.com)** (keep in mind as the email solution) — modern API, React-Email templates, EU region available. Wire it via the existing drop-in `EmailAdapter` in `src/lib/email.ts` (SMTP or `RESEND_API_KEY`), and configure Payload's email with the same. Still need SPF/DKIM/DMARC on a sending subdomain (e.g. `mail.lovedis.de`).

## Related design assets
- `assets/lovedis-refresh-concept-a-bright.png` — bright/playful direction.
- `assets/lovedis-refresh-concept-b-dark.png` — dark/neon direction.
- Brand tokens: Electric Indigo `#2926E5`, Pink `#FFDBF5`, Coral `#FF5736`, Mint `#00B97E`, black/white; font *Greed Standard* + IBM Plex Mono.
