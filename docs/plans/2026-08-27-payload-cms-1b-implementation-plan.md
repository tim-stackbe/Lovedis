# Payload CMS on Hetzner — Architecture Option **1B** Implementation Plan

> **Status (2026-09-05): PAUSED / superseded.** We keep **Storyblok** for homepage content.
> Active plan: `docs/architecture/plan-mara-homepage-merge.md` (Hetzner hybrid). This document
> is kept for reference if Payload is revisited later.

> **Type:** Implementation plan (step-by-step, executable) — *no code was changed, nothing installed, nothing deployed by this document.*
> **Date:** 2026-08-27
> **Option:** **1B — Keep the Nuxt homepage, run Payload headless in its own container**, with client-side Live Preview via `@payloadcms/live-preview-vue`, reusing the existing Postgres (separate `payload` schema) and existing R2/S3 object storage, behind Caddy on a `cms.` subdomain.
> **Basis:** `docs/research/2026-08-27-homepage-visual-cms-options.md` (esp. *"Payload auf dem Hetzner-Deployment"*), grounded in the current repo, deploy files, Storyblok baseline and security audit.

All config/compose/Caddy/TypeScript snippets below are **ILLUSTRATIVE EXAMPLES** for planning. They are starting points to adapt during implementation, not drop-in files.

---

## 0. Repo facts this plan is grounded in (read before executing)

| Fact | Value | Source in repo |
|---|---|---|
| Platform stack | **Next.js `^16.2.9`, React `^19.2.7`, Prisma `^7.8.0`, NextAuth `5.0.0-beta.31`**; Prisma uses the **`public`** schema; DB adapters `@prisma/adapter-neon` + `@prisma/adapter-pg` | `package.json` |
| Payload today | **Not installed** — `payload*` absent from `package.json` | `package.json`, research brief §"Zwei wichtige Korrekturen" |
| Homepage | **Nuxt (Vue 3)**, content from **Storyblok** — **source is NOT in this repo** (separate repo; no `nuxt.config.*`, `app.vue`, `pages/` present here) | Glob for `nuxt.config.*` / `app.vue` → 0 results; research brief |
| Repo deploy compose | `caddy` + `app` (`${APP_IMAGE}`) + `db` **postgres:17**; app on internal `:3000`, DB **not** host-published | `deploy/hetzner/docker-compose.yml` |
| Repo Caddyfile | `lovedis.de, www.lovedis.de → reverse_proxy app:3000`; auto-TLS via Let's Encrypt (`email ops@lovedis.de`) | `deploy/hetzner/Caddyfile` |
| **LIVE server compose** (differs) | `/opt/lovedis/docker-compose.yml`: `caddy` + `platform` (`app.<ip>.nip.io`) + `homepage` (`home.<ip>.nip.io`) + `db` **postgres:18**; DB on Cloud Volume `/mnt/pgdata`, unpublished; UFW 22/80/443 only | Security audit report header + findings #1, #7 |
| Env template | Already reserves `PAYLOAD_SECRET`, `DATABASE_URL=...?schema=public` (comment notes *"Payload is configured for the `payload` schema"*), `S3_*` (media), `BACKUP_S3_*` + `BACKUP_ENCRYPTION_PASSPHRASE` + `BACKUP_RETENTION_DAYS` | `deploy/hetzner/.env.example` |
| Backup script | `backup-postgres.sh`: `pg_dump` (whole DB) → gzip → GPG(AES256) → S3, with retention prune; **cron not yet active** | `deploy/hetzner/backup-postgres.sh`; audit finding #31 |
| CI/CD template | GitHub Actions builds image → GHCR → SSH `docker compose pull && up -d` → `prisma migrate deploy` + `payload migrate` | `deploy/hetzner/github-actions-deploy.yml.example` |
| Storyblok baseline | Exported model + stories under `docs/storyblok-baseline/*` (`components.json`, `home.story.json`, `site-settings.json`, `space.json`, page exports, `stories-index.json`) | `docs/storyblok-baseline/README.md` |
| Locales | Storyblok space: **default = German (`de`)**, additional = **English (`en`)** | `docs/storyblok-baseline/space.json` (`languages:[{code:'en'}]`, `default_lang: German`) |
| Homepage story shape | story `component: page`, `body` = 10 blocks: `hero`, `benefits-bento`, `programs-section`, `challenges-section`, `why-join-us-section`, `key-topics-slider-section`, `homepage-partners-section`, `ecosystem-diagram-section`, `homepage-events-section`, `cta-section` | `docs/storyblok-baseline/home.story.json` |
| Site globals | `site-settings` blok has `navbar`, `footer`, `ui_labels`, `redirects`, `showNavbar/showFooter`, `hide*Routes`, default links; plus `seo-settings` | `docs/storyblok-baseline/site-settings.json` |
| Relevant audit findings | **#10** platform `app.*` has no CSP (homepage does); **#31** no DB backups configured | `docs/reports/2026-08-27-hetzner-security-audit.md` |

> ⚠️ **Two compose files exist.** This plan **targets the live server stack** at `/opt/lovedis/` (caddy + platform + homepage + db). The repo `deploy/hetzner/*` files are reference templates and lag behind the server; when editing, mirror the change into the repo templates too so they don't drift further.

---

## 1. Overview & scope

**What 1B delivers**

- A new, small **`cms` container** running Payload 3 (Next-native) that serves **only** `/admin` (the editor UI) + Payload's **REST/GraphQL** content API. Reachable at **`cms.lovedis.de`** (test: `cms.<ip>.nip.io`) behind the existing Caddy.
- The existing **Nuxt homepage is kept** and switched from Storyblok to Payload as its content source.
- Editors get **Admin editing** + **client-side Live Preview**: the real homepage loads inside the Admin's preview pane and updates live as they type, via `@payloadcms/live-preview-vue`'s `useLivePreview`.
- **Reuses existing infra:** same Postgres instance (isolated in a `payload` schema), same S3-compatible object storage (R2 / Hetzner Object Storage) for media, same Caddy for TLS + security headers.

**Target editing UX** (the research brief's "Stufe 2 — sweet spot"): non-technical colleagues log into `/admin`, edit fields/blocks, and see the actual Nuxt homepage update live in a side preview. Publishing is draft → publish.

**What stays unchanged**

- The **Nuxt homepage app** stays Vue/Nuxt (no React rewrite — that is option 1A, explicitly out of scope here).
- The **platform** (`platform`/`app` Next.js container, Prisma on `public` schema, NextAuth) is untouched except for the shared DB and Caddy files.
- The **`db`** and **`caddy`** services keep their roles; we add one service and one Caddy site block.

**Explicit non-goals:** no homepage React rewrite; no server-side Live Preview (React-only); no merging Payload into the `platform` app; no change to platform auth.

---

## 2. Prerequisites & decisions to confirm

Confirm these **before** implementation starts:

1. **Nuxt source control** — 1B requires editing the Nuxt homepage (data layer + a preview route + `useLivePreview`). The homepage source is **not in this repo**; confirm the team owns/controls that repo and can ship changes. *(Research brief flags this as historically Storyblok-only access.)*
2. **Nuxt version** — cannot be determined from this repo. Confirm it is **Nuxt 3 or 4 (Vue 3)** — `@payloadcms/live-preview-vue` targets Vue 3 / Nuxt 3. Record the exact version and package manager.
3. **Subdomain + DNS** — production `cms.lovedis.de`; test `cms.<server-ip>.nip.io`. Add a DNS `A`/`AAAA` record for `cms.lovedis.de` → server IP so Caddy can issue TLS. Decide when to cut `*.nip.io` → real domain.
4. **Locales** — confirm the content locale set. Baseline implies **`de` (default) + `en`**. Confirm whether more will be added; this drives Payload `localization`.
5. **Editor roles** — confirm the role model (proposed: `admin` for the team, `editor` for colleagues who can edit/publish content but not manage users/settings). Confirm who gets which.
6. **DB isolation choice** — **separate `payload` schema on the same Postgres DB** (recommended, one backup covers everything) **vs.** a separate database. This plan assumes **`payload` schema**.
7. **Storage target** — confirm which S3-compatible bucket Payload media uses: **Cloudflare R2** (`region:'auto'`, `forcePathStyle:true`) or **Hetzner Object Storage** (the repo `.env.example` uses Hetzner `S3_*` vars). Reuse existing creds/bucket where possible; a dedicated `lovedis-media` bucket/prefix is recommended.
8. **Registry** — confirm GHCR (or other) for the new `cms` image, consistent with the platform image pipeline.

---

## 3. Payload app scaffold

### 3.1 Packages & versions

Scaffold a standalone Payload 3 app (its own repo or a `cms/` subfolder in this monorepo — decide in §2). Use `create-payload-app` (Blank + Postgres) then pin versions.

- **Runtime:** **Node 22 LTS** (Payload 3 requires Node ≥ 20; match the platform's runtime major).
- **Core:** `payload` **3.x** (latest stable at scaffold time — **pin the exact resolved version**, e.g. `payload@3.x.y`).
- **Next adapter:** `@payloadcms/next` (same 3.x line as `payload`).
- **DB adapter:** `@payloadcms/db-postgres` (Drizzle/pg under the hood).
- **Storage:** `@payloadcms/storage-s3`.
- **Rich text:** `@payloadcms/richtext-lexical`.
- **Live Preview (frontend, in the Nuxt repo):** `@payloadcms/live-preview-vue` (provides `useLivePreview`). *(Verified: Payload docs, `3.x` branch — Vue/Nuxt is client-side only.)*
- Peer deps as required by `@payloadcms/next`: `next`, `react`, `react-dom`, `graphql`, `sharp` (image processing for uploads).

> Keep all `payload*` package versions on the **same minor** to avoid adapter mismatches. Pin exact versions in `package.json` (no floating ranges for the Payload packages).

### 3.2 Project layout (illustrative)

```
cms/
├─ src/
│  ├─ payload.config.ts          # single source of truth
│  ├─ collections/
│  │  ├─ Pages.ts                # Blocks-based `layout` field (mirrors Storyblok bloks)
│  │  ├─ Media.ts                # uploads → R2/S3
│  │  ├─ Users.ts                # editors + roles/access control
│  │  ├─ Partners.ts  Events.ts  NewsPosts.ts  BlogPosts.ts  LegalPages.ts ...
│  ├─ globals/
│  │  ├─ SiteSettings.ts         # navbar/footer/ui_labels
│  │  └─ SeoSettings.ts
│  ├─ blocks/                    # Hero, BenefitsBento, ProgramsSection, ... (Storyblok bloks)
│  ├─ fields/                    # shared field builders (link, seo, media, richtext)
│  └─ app/(payload)/...          # Next App Router mount for /admin + API (from create-payload-app)
├─ Dockerfile                    # multi-stage, standalone (mirrors platform Dockerfile)
├─ next.config.mjs               # output: 'standalone'
├─ package.json
└─ .env.example                  # documents required env (no secrets)
```

### 3.3 `payload.config.ts` (illustrative)

```ts
// EXAMPLE — adapt during implementation.
import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { s3Storage } from '@payloadcms/storage-s3'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { Pages } from './collections/Pages'
import { Media } from './collections/Media'
import { Users } from './collections/Users'
// ...other collections/globals

export default buildConfig({
  serverURL: process.env.PAYLOAD_PUBLIC_SERVER_URL, // https://cms.lovedis.de
  admin: {
    user: Users.slug,
    // Live Preview points the Admin preview pane at the Nuxt homepage preview route:
    livePreview: {
      url: ({ data, locale }) =>
        `${process.env.HOMEPAGE_URL}/preview` +
        `?secret=${process.env.PREVIEW_SECRET}` +
        `&slug=${data?.slug ?? 'home'}&locale=${locale?.code ?? 'de'}`,
      collections: ['pages'],
      breakpoints: [
        { name: 'mobile', width: 375, height: 667, label: 'Mobile' },
        { name: 'desktop', width: 1440, height: 900, label: 'Desktop' },
      ],
    },
  },
  editor: lexicalEditor({}),
  collections: [Pages, Media, Users /* , Partners, Events, ... */],
  globals: [/* SiteSettings, SeoSettings */],
  localization: {
    locales: [
      { code: 'de', label: 'Deutsch' },
      { code: 'en', label: 'English' },
    ],
    defaultLocale: 'de',
    fallback: true,
  },
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URI }, // ...?schema=payload
    schemaName: 'payload', // isolate Payload's tables in their own schema
  }),
  plugins: [
    s3Storage({
      collections: { media: true },
      bucket: process.env.S3_BUCKET!,
      config: {
        endpoint: process.env.S3_ENDPOINT,
        region: process.env.S3_REGION, // 'auto' for R2
        forcePathStyle: true,          // required for R2 / most S3-compatible
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID!,
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
        },
      },
    }),
  ],
  secret: process.env.PAYLOAD_SECRET!,
  cors: [process.env.HOMEPAGE_URL!],        // allow the Nuxt origin to call the API
  csrf: [process.env.HOMEPAGE_URL!],
})
```

### 3.4 Pages collection with a Blocks `layout` field (illustrative)

Mirror the Storyblok homepage: a `Pages` collection whose `layout` is a **Blocks** field, one block per Storyblok blok (start with the 10 homepage blocks, expand later). Enable **drafts** so Live Preview can show unpublished content.

```ts
// EXAMPLE — collections/Pages.ts
import type { CollectionConfig } from 'payload'
import { Hero, BenefitsBento, ProgramsSection, ChallengesSection,
  WhyJoinUsSection, KeyTopicsSliderSection, HomepagePartnersSection,
  EcosystemDiagramSection, HomepageEventsSection, CtaSection } from '../blocks'

export const Pages: CollectionConfig = {
  slug: 'pages',
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'slug', '_status'] },
  versions: { drafts: { autosave: { interval: 375 } } }, // draft/publish + autosave
  access: {
    read: ({ req }) => Boolean(req.user) || { _status: { equals: 'published' } },
    create: ({ req }) => req.user?.role === 'admin' || req.user?.role === 'editor',
    update: ({ req }) => req.user?.role === 'admin' || req.user?.role === 'editor',
    delete: ({ req }) => req.user?.role === 'admin',
  },
  fields: [
    { name: 'title', type: 'text', required: true, localized: true },
    { name: 'slug', type: 'text', required: true, unique: true, index: true },
    { name: 'layout', type: 'blocks', localized: true, blocks: [
      Hero, BenefitsBento, ProgramsSection, ChallengesSection, WhyJoinUsSection,
      KeyTopicsSliderSection, HomepagePartnersSection, EcosystemDiagramSection,
      HomepageEventsSection, CtaSection,
    ]},
    // SEO group: seo_title, seo_description, og_image (relationship → media)
  ],
}
```

### 3.5 Media, Users, Globals (illustrative sketch)

- **Media** (`collections/Media.ts`): `upload: true` with `alt` (localized) + optional `caption`; storage handled by the `s3Storage` plugin (§5). Generate a small set of `imageSizes` matching the homepage's responsive needs.
- **Users** (`collections/Users.ts`): `auth: true`, a `role` select (`admin` | `editor`), access control that only `admin` can create/edit users. Separate from platform NextAuth users.
- **Globals:** `SiteSettings` (navbar, footer, ui_labels, feature toggles) and `SeoSettings`, both `localized` where the Storyblok fields are `translatable`.

```ts
// EXAMPLE — collections/Users.ts (roles + access)
export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  access: {
    create: ({ req }) => req.user?.role === 'admin',
    update: ({ req, id }) => req.user?.role === 'admin' || req.user?.id === id,
    delete: ({ req }) => req.user?.role === 'admin',
  },
  fields: [
    { name: 'name', type: 'text' },
    { name: 'role', type: 'select', required: true, defaultValue: 'editor',
      options: [{ label: 'Admin', value: 'admin' }, { label: 'Editor', value: 'editor' }],
      access: { update: ({ req }) => req.user?.role === 'admin' } },
  ],
}
```

---

## 4. Database (existing Postgres, `payload` schema)

**Goal:** Payload coexists with the platform's Prisma `public` schema on the **same Postgres instance**, with zero table collisions.

1. **Connection string** — Payload gets its own env `DATABASE_URI` pointing at the same DB with the `payload` schema, e.g.
   `postgresql://lovedis:***@db:5432/lovedis?schema=payload`
   (the platform keeps `DATABASE_URL=...?schema=public`). The `db` service hostname on the compose network is `db` (unchanged).
2. **Schema isolation** — set `schemaName: 'payload'` in `postgresAdapter` (see §3.3). Payload/Drizzle creates and manages **only** the `payload` schema; Prisma continues to own `public`. No shared tables → no collisions.
3. **One-time schema creation** — ensure the `payload` schema exists before first migrate (Payload/Drizzle can create it, or run `CREATE SCHEMA IF NOT EXISTS payload;` once). The DB user already has rights (same `POSTGRES_USER`).
4. **Migrations** — use Payload's migration workflow:
   - Dev: `payload generate:types` + `payload migrate:create` to produce SQL migrations from config changes.
   - Deploy: run **`payload migrate`** on release (the CI template already calls a `payload migrate` step — wire it to the `cms` container: `docker compose exec -T cms payload migrate`).
5. **Coexistence with Prisma** — Prisma migrations (`prisma migrate deploy`) run against `public` only and never touch `payload`; Payload migrations run against `payload` only. Keep the two migration pipelines independent (platform CI vs. cms CI).
6. **Connection budget** — Postgres 17/18 default `max_connections` is finite; the `cms` pool adds connections. Set a modest Payload pool max (e.g. `max: 10`) so `platform` + `cms` + backups stay within limits.

---

## 5. Media / storage (existing R2/S3 via `@payloadcms/storage-s3`)

Reuse the existing S3-compatible storage — **do not** provision new infra.

- Wire the **`s3Storage`** plugin for the `Media` collection (see §3.3).
- **Env (reuse existing `S3_*` names from `.env.example`):** `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`.
- **R2 specifics:** `region: 'auto'`, `forcePathStyle: true`, endpoint `https://<accountid>.r2.cloudflarestorage.com`. **Hetzner Object Storage:** `region: '<region>'`, `forcePathStyle: true`, endpoint `https://<region>.your-objectstorage.com` (matches the repo template).
- **Public URLs / base:** decide how media is served publicly — either the bucket's public endpoint / R2 public bucket URL, or a CDN/custom domain (e.g. `media.lovedis.de`). Set Payload's media base URL accordingly so the Nuxt homepage renders correct `<img src>`s. Ensure the chosen public base is allowed by the homepage CSP `img-src`.
- **Bucket hygiene:** prefer a dedicated bucket or key prefix (e.g. `cms/`) distinct from platform assets; confirm CORS on the bucket allows the homepage + cms origins if media is fetched cross-origin.
- **Security:** per audit finding #13, TEST must use **test-scoped, rotated** keys distinct from production.

---

## 6. Containerization & deploy

### 6.1 `cms` Dockerfile (illustrative)

Multi-stage, standalone output — mirror the platform Dockerfile pattern (build in CI, run `node server.js`).

```dockerfile
# EXAMPLE — cms/Dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build            # next build (payload) → .next standalone

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S nodejs && adduser -S payload -G nodejs
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
USER payload                 # non-root, consistent with platform/homepage
EXPOSE 3000
CMD ["node", "server.js"]
```

### 6.2 New `cms` service in compose (illustrative — server stack)

Add to `/opt/lovedis/docker-compose.yml` (and mirror into `deploy/hetzner/docker-compose.yml`):

```yaml
# EXAMPLE — new service, alongside caddy/platform/homepage/db
  cms:
    image: ${CMS_IMAGE}          # e.g. ghcr.io/<owner>/lovedis-cms:latest (built + pushed by CI)
    restart: unless-stopped
    env_file: cms.env            # dedicated env (secrets NOT committed)
    expose:
      - "3000"                   # internal only; Caddy terminates TLS
    depends_on:
      db:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/admin/login"]
      interval: 30s
      timeout: 5s
      retries: 5
```

- **`cms.env`** (mode `600`, owned by `deploy`, **never committed**) holds: `PAYLOAD_SECRET`, `DATABASE_URI=...?schema=payload`, `PAYLOAD_PUBLIC_SERVER_URL=https://cms.lovedis.de`, `HOMEPAGE_URL=https://lovedis.de`, `PREVIEW_SECRET`, `S3_*`. Keep it separate from `platform.env` to limit blast radius (audit findings #13/#14).
- **No host port publish** — only Caddy reaches it over the internal compose network. DB stays unpublished (audit #1/#7).

### 6.3 Caddy site block for `cms.lovedis.de` (illustrative)

Add to `/opt/lovedis/Caddyfile`, consistent with the existing `home.*` block (which already ships a strong CSP + security headers — audit #9). This also satisfies the spirit of finding #10 by giving the new subdomain a CSP from day one.

```caddyfile
# EXAMPLE — cms subdomain (prod). For test use: cms.<ip>.nip.io { ... }
cms.lovedis.de {
	encode zstd gzip
	reverse_proxy cms:3000

	header {
		Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
		X-Content-Type-Options "nosniff"
		Referrer-Policy "strict-origin-when-cross-origin"
		Permissions-Policy "geolocation=(), microphone=(), camera=()"
		# Admin must embed the homepage preview in an iframe → frame-ancestors self
		# and allow the homepage to be framed by the admin (see homepage note in §7).
		Content-Security-Policy "default-src 'self'; img-src 'self' data: blob: https:; media-src 'self' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; connect-src 'self'; font-src 'self' data:; frame-src 'self' https://lovedis.de; frame-ancestors 'self'"
		-Server
	}
}
```

> **CSP caveat:** Payload's Admin (React) may require `'unsafe-inline'`/`'unsafe-eval'` in `script-src`; start **report-only**, tighten iteratively (mirror how the platform CSP rollout is recommended in audit #10). The homepage side needs a matching change so the Admin origin may frame it (see §7).

### 6.4 Deploy steps (mirror platform/homepage)

1. **CI** builds `cms` image → pushes to GHCR (extend the workflow in `github-actions-deploy.yml.example` with a second build/tag `lovedis-cms`).
2. On the server (`/opt/lovedis`): update `docker-compose.yml` + `Caddyfile` (rsync from repo templates or edit in place), create `cms.env`.
3. `docker compose pull cms`
4. `docker compose up -d cms caddy` (Caddy reload picks up the new site + issues TLS for `cms.lovedis.de`).
5. `docker compose exec -T cms payload migrate` (create the `payload` schema + tables on first run).
6. Create the first admin user (via `/admin` first-run, or a one-off `payload` script).
7. Smoke test: `https://cms.lovedis.de/admin` loads, login works, health/preview reachable.

---

## 7. Nuxt Live Preview integration (the 1B core)

This is the work in the **Nuxt homepage repo**. Two capabilities: (a) fetch content from Payload instead of Storyblok, (b) client-side Live Preview.

### 7.1 Switch content source Storyblok → Payload

- **API client:** create a small Payload client wrapper using Nuxt `useAsyncData`/`$fetch` against Payload REST (`GET {PAYLOAD_URL}/api/pages?where[slug][equals]=home&locale=de&depth=2&draft=false`) or GraphQL. Framework-agnostic — no official Nuxt module needed.
- **Runtime config:** add `NUXT_PUBLIC_PAYLOAD_URL` (e.g. `https://cms.lovedis.de`) and keep locale handling. Retire `STORYBLOK_*` usage once cutover completes (keep behind a flag during parallel run — see §8).
- **Rendering:** map each Payload `layout` block `blockType` to the existing Nuxt block components (they already exist for the Storyblok bloks; you mostly change the **data shape** feeding them, not the components). A `components/payload/BlockRenderer.vue` switch mirrors the current `components/storyblok/*` dispatch.
- **Rich text:** render Lexical JSON (see §8 for migration). Use a Lexical→HTML/Vue renderer (Payload provides serializers; or a light custom renderer for the node types actually used).
- **Draft vs published:** default site fetches **published** (`draft=false`). The preview route fetches **drafts** (`draft=true`) with auth (below).

### 7.2 Add a preview route + `useLivePreview`

- **Preview route:** add `pages/preview.vue` (route `/preview`). It:
  1. Validates `?secret=<PREVIEW_SECRET>` (reject otherwise) — this is the value Payload's `livePreview.url` appends (§3.3).
  2. Fetches initial **draft** data for the requested `slug`/`locale` from Payload (authenticated draft read).
  3. Passes `initialData` into `useLivePreview` and renders the normal block components with the live `data`.

```vue
<!-- EXAMPLE — pages/preview.vue (Nuxt homepage repo) -->
<script setup lang="ts">
import { useLivePreview } from '@payloadcms/live-preview-vue'
const route = useRoute()
const config = useRuntimeConfig()
// 1) guard on the shared preview secret
if (route.query.secret !== config.public.previewSecret) throw createError({ statusCode: 401 })
// 2) fetch initial draft data
const { data: initial } = await useAsyncData(() =>
  $fetch(`${config.public.payloadUrl}/api/pages`, {
    query: { 'where[slug][equals]': route.query.slug ?? 'home',
             locale: route.query.locale ?? 'de', draft: true, depth: 2 },
    credentials: 'include',
  }))
// 3) live sync from the Admin via postMessage
const { data } = useLivePreview({
  initialData: initial.value?.docs?.[0],
  serverURL: config.public.payloadUrl,
  depth: 2,
})
</script>
<template>
  <BlockRenderer v-if="data" :blocks="data.layout" :locale="route.query.locale" />
</template>
```

### 7.3 Wiring the Admin preview pane

- Payload `admin.livePreview.url` returns the homepage preview URL with `slug`, `locale`, and `secret` (§3.3). The Admin loads that URL in an **iframe** and streams field changes via `window.postMessage`; `useLivePreview` merges them into `data`.
- **Cross-origin framing:** the homepage (`lovedis.de`) must **allow** being framed by the CMS origin. Today the homepage sends `X-Frame-Options: SAMEORIGIN` + CSP (audit #9). For the preview route specifically, relax framing to permit the CMS origin, e.g. drop `X-Frame-Options` on `/preview` and set `Content-Security-Policy: frame-ancestors 'self' https://cms.lovedis.de` for that route (do **not** loosen it site-wide).
- **CORS:** Payload `cors`/`csrf` must include the homepage origin (§3.3) so the preview route's authenticated draft fetches succeed.

### 7.4 Auth / preview-secret handling

- **`PREVIEW_SECRET`** shared between Payload (`cms.env`) and Nuxt (`NUXT_*` runtime config); the `/preview` route rejects requests without it.
- **Draft reads** require an authenticated Payload session or token. Simplest: the editor is already logged into `/admin` (same-site cookie) and the iframe request carries it (`credentials: 'include'` + proper CORS/`SameSite`). If cookie sharing across subdomains is awkward, use a scoped API key/token for draft reads. Confirm cookie domain strategy (`cms.lovedis.de` vs `lovedis.de` are different sites → likely need token-based draft fetch or a same-origin proxy).

**Concrete Nuxt changes summary:** add `@payloadcms/live-preview-vue`; add a Payload API client + runtime config; add `pages/preview.vue`; add a `BlockRenderer` mapping Payload block types to existing components; add a Lexical renderer; relax framing/CSP on `/preview` only; feature-flag Storyblok vs Payload during parallel run.

---

## 8. Content modeling & migration from Storyblok

### 8.1 Mapping table (Storyblok → Payload)

| Storyblok (source) | Kind | Payload target | Notes |
|---|---|---|---|
| `page` (story, e.g. `home`) | content type | **`Pages` collection**, `layout` = Blocks | `home.story.json`: `component:page`, `body[]` → `layout[]` |
| `homepage` | content type | fold into `Pages` (or dedicated global) | one homepage entry |
| `body[]` bloks: `hero`, `benefits-bento`, `programs-section`, `challenges-section`, `why-join-us-section`, `key-topics-slider-section`, `homepage-partners-section`, `ecosystem-diagram-section`, `homepage-events-section`, `cta-section` | nestable bloks | **Blocks** in `Pages.layout` | one Payload `Block` per blok; start with these 10 |
| `site-settings` (navbar, footer, ui_labels, redirects, toggles) | global story | **`SiteSettings` global** | localize `translatable` subfields |
| `seo-settings` / per-story `seo_*`, `og_image` | settings / fields | **`SeoSettings` global** + SEO field group on `Pages` | `og_image` → relationship to `Media` |
| `partner` (42) | content type | **`Partners` collection** | resolve references from sections |
| `event` (13), `event-speaker`, `event-agenda-item` | content type + nested | **`Events` collection** (+ array/blocks) | `docs/storyblok-baseline/events/*.mapi.json` |
| `news-post` (9) | content type | **`NewsPosts` collection** | |
| `blog-post` (3) | content type | **`BlogPosts` collection** | |
| `legal-page` | content type | **`LegalPages` collection** | richtext heavy |
| `challenge`, `Startup`, `Press Release`, `key-topic-detail-page`, `key-topics-page` | content types | own collections (later phases) | not needed for homepage cutover |
| `*-listing` (blog/events/news/partners/challenges) | listing pages | `Pages` entries or collection-driven list blocks | |
| Nestable UI bloks (`benefit-card`, `program-card`, `faq-item`, `logo-item`, `footer-column`, `navbar-link`, …) | nested bloks | **sub-blocks / arrays** within parent blocks/globals | ~170 components total in `components.json` — model incrementally |
| Storyblok **richtext** field | field type | **Lexical** (`@payloadcms/richtext-lexical`) | transform on import (§8.3) |
| Storyblok **asset** (`og_image`, images) | field type | **`Media`** upload (R2/S3) | download → upload → rewrite URL |
| `translatable:true` fields / `en` language | i18n | **Payload `localized: true`** + locales `de`/`en` | default `de`, fallback on |
| `multilink` fields | field type | link field group (internal ref / external url) | reusable `link` field builder |

> The full model in `components.json` has ~170 components; **do not** build all of them up front. Model the **homepage's 10 blocks + `SiteSettings`/`SeoSettings` + `Media`/`Users`** first; add other collections per phase.

### 8.2 Migration approach (script)

- Write a **one-off Node migration script** using Payload's **Local API** (`getPayload({ config })`) run inside/against the `cms` container — no HTTP overhead, bypasses access control for the import.
- **Input:** the exported baseline JSON in `docs/storyblok-baseline/*` (`home.story.json`, `page.*.json`, `site-settings.json`, `stories-index.json`, `events/*.mapi.json`). This is the **source of truth** for the first pass; a later pass can re-pull live Storyblok for freshest content and `diff`.
- **Order:** (1) `Media` (download each Storyblok asset → upload to R2/S3 → keep an old-URL→new-Media-id map); (2) leaf collections (`Partners`, `Events`, …); (3) `Pages` (build `layout` blocks, resolving media + relationships via the maps); (4) `Globals` (`SiteSettings`, `SeoSettings`).
- **Per-locale:** import `de` (default) first, then `en` via Payload's localized update on the same doc id.
- **Idempotency:** key upserts by `slug`/original Storyblok `uuid` (store the source uuid in a hidden field) so re-runs update rather than duplicate.

### 8.3 Key transforms / gotchas

- **Richtext → Lexical:** Storyblok richtext (ProseMirror-ish JSON) must be converted to Lexical's node tree. Write a small mapper for the node/mark types actually used (paragraph, headings, bold/italic/link, lists, images). Budget time here — it's the fiddliest part.
- **Assets:** rewrite every asset URL to the new Media record's URL; handle alt text (localized).
- **Multilang:** map Storyblok's field-level translations to Payload localized fields; verify fallback behavior. *(Historic Payload bug with localized **Blocks** fallbacks was fixed by late 2025 — use current 3.x; research brief cites issue #13663.)*
- **References:** resolve `partner`/`event` references inside sections to Payload relationship fields.

### 8.4 Effort estimate

- Model the 10 homepage blocks + globals + Media/Users: **M**.
- Migration script + Lexical transform + asset re-upload for the homepage + globals: **M**.
- Remaining collections (partners/events/news/blog/legal/challenges/etc.) + their content: **M→L** (incremental, post-cutover).

### 8.5 Cutover strategy

1. **Run in parallel:** Payload live at `cms.lovedis.de`; homepage still served from Storyblok in production, but able to read Payload behind a **feature flag** (`NUXT_PUBLIC_CONTENT_SOURCE=storyblok|payload`).
2. **Verify:** compare Payload-rendered homepage vs the Storyblok baseline screenshot (`docs/storyblok-baseline/lovedis-homepage-baseline-fullpage.png`) and JSON diffs; check all 10 blocks + both locales.
3. **Switch:** flip the flag to `payload` for the homepage; monitor.
4. **Fallback:** keep Storyblok + the flag for a defined window (e.g. 2–4 weeks) so you can revert instantly; only decommission Storyblok once confident.

---

## 9. Editor onboarding (runbook)

1. **Accounts:** an `admin` creates each colleague as a `Users` entry with role `editor` (invite/temp password). Editors can create/update/publish content, not manage users or (optionally) settings.
2. **Login:** `https://cms.lovedis.de/admin`.
3. **Edit with Live Preview:** open a page (e.g. Home) → the preview pane shows the real homepage; edit fields/blocks → preview updates live (client-side). Reorder blocks by drag; add blocks from the block picker.
4. **Media:** upload images in the Media library or inline; alt text per locale.
5. **Locales:** switch the locale selector (`de`/`en`) to edit each language; unfilled fields fall back to default.
6. **Publish:** content saves as **draft** (autosave); click **Publish** to make it live. The public homepage reads published content; the preview reads drafts.
7. **Roles/permissions recap:** `editor` = content CRUD + publish; `admin` = everything incl. users, globals, destructive deletes.

---

## 10. Backups & ops

- **Backups (closes audit finding #31):** `deploy/hetzner/backup-postgres.sh` already `pg_dump`s the **whole database**, so it **covers both `public` and `payload` schemas automatically** — no per-schema change needed. **Action:** activate the cron on the server: `0 3 * * * /opt/lovedis/deploy/hetzner/backup-postgres.sh >> /var/log/lovedis-backup.log 2>&1`, ensure `aws` CLI + `BACKUP_*` env are set, and **test a restore** (the script documents the restore command). *(Optional: verify the dump is a full-DB dump, not `-n public`; it is — no `-n` flag is passed.)*
- **Resource footprint:** one extra Node container. Payload/Next idle ≈ **250–500 MB RAM**, modest CPU (builds happen in CI, not on the box). On the 8 GB CX32/CAX21 this is comfortable alongside `platform` + `homepage` + `db`. Add a small pool cap (§4.6) and monitor DB connections.
- **Health/monitoring:** the `cms` healthcheck hits `/admin/login`; add `cms` to whatever uptime monitoring watches `app.*`/`home.*`. Watch container logs (json-file rotation already configured per audit #15).
- **Rollback plan:** the homepage content-source flag (§8.5) reverts to Storyblok instantly. For the service: `docker compose stop cms` (removing the Caddy block if needed) leaves platform + homepage fully intact — `cms` is additive and isolated. DB rollback = restore from the nightly encrypted dump.
- **Security follow-through:** dedicated `cms.env` (not shared with `platform.env`/`db`) per audit #13/#14; test-scoped rotated S3 keys per #13; CSP on the new subdomain from day one per #10.

---

## 11. Phased rollout

| Phase | Scope | Effort | Definition of Done |
|---|---|---|---|
| **Phase 1 — Admin-only editing live** | Scaffold Payload; `cms` container + Caddy `cms.` block + TLS; Postgres `payload` schema + `payload migrate`; R2/S3 media; `Pages` (homepage 10 blocks) + `SiteSettings`/`SeoSettings` + `Media` + `Users`/roles; import homepage content (`de`+`en`); create editor accounts. **Homepage still on Storyblok.** | **M** | Editors log into `cms.lovedis.de/admin`, edit the homepage's blocks + globals in both locales, upload media to R2/S3, publish drafts; nightly backup cron active + restore tested. |
| **Phase 2 — Live Preview** | Nuxt: add Payload API client + `/preview` route + `useLivePreview`; Payload `livePreview.url`; framing/CSP + CORS for preview; preview-secret + draft auth. | **M** | Editing a page in `/admin` shows the real Nuxt homepage updating live in the preview pane (draft content), both locales, mobile+desktop breakpoints. |
| **Phase 3 — Full migration + homepage cutover** | Migrate remaining collections (partners/events/news/blog/legal/challenges/listings…) + content; switch the homepage's **public** content source Storyblok → Payload behind the flag; verify vs baseline; keep Storyblok as fallback, then decommission. | **L** | Public `lovedis.de` renders from Payload for all migrated pages/locales; visual + JSON parity vs baseline; Storyblok fallback window elapses and Storyblok is retired. |

**Suggested sequence & checkpoints:** Phase 1 → *checkpoint: colleagues editing + backups verified* → Phase 2 → *checkpoint: Live Preview accepted by editors* → Phase 3 → *checkpoint: parity verified, then cutover, then decommission Storyblok*. Phase 1 already delivers colleague value (the fastest win); Phases 2–3 raise UX and complete the migration.

---

## 12. Risks & open questions

**Risks**
- **Nuxt source access/version** — 1B is blocked without control of the Nuxt repo and a Vue 3 / Nuxt 3 base. *(Prereq §2.1–2.2.)*
- **Cross-subdomain cookies for draft preview** — `cms.lovedis.de` and `lovedis.de` are different sites; sharing the admin session to the iframe for draft reads may need a token or same-origin proxy (§7.4).
- **Framing/CSP tension** — allowing the Admin to iframe the homepage preview while keeping `X-Frame-Options`/CSP strict elsewhere requires a route-scoped exception (§7.3), plus Admin CSP tuning (report-only first).
- **Lexical transform fidelity** — richtext conversion is the most error-prone migration step; budget iteration (§8.3).
- **Model breadth** — ~170 Storyblok components; over-modeling early wastes effort. Mitigate by phasing (homepage first).
- **DB connection pressure** — three app pools + backups on one Postgres; cap the cms pool (§4.6).

**Open questions to confirm**
1. Do we control the Nuxt homepage repo, and what exact Nuxt/Vue version? (§2.1/2.2)
2. Storage target for media — **R2** or **Hetzner Object Storage** — and public URL/CDN base? (§2.7/§5)
3. Locale set final = `de` + `en` only? (§2.4)
4. Role model = `admin`/`editor` as proposed? Who gets which? (§2.5)
5. `payload` **schema** on the shared DB (recommended) or a separate DB? (§2.6)
6. Draft-preview auth approach: shared cookie vs. scoped token vs. same-origin proxy? (§7.4)
7. When to move `cms.<ip>.nip.io` → `cms.lovedis.de` (DNS + TLS)? (§2.3)
8. Registry/CI for the `cms` image (GHCR alongside platform)? (§2.8/§6.4)

---

## Sources

**Repo (read for this plan):** `docs/research/2026-08-27-homepage-visual-cms-options.md`; `deploy/hetzner/{docker-compose.yml,Caddyfile,.env.example,backup-postgres.sh,README.md,github-actions-deploy.yml.example}`; `docs/reports/2026-08-27-hetzner-security-audit.md`; `docs/storyblok-baseline/{README.md,components.json,home.story.json,site-settings.json,space.json,stories-index.json,events/*}`; `package.json`; `docs/architecture/plan-mara-homepage-merge.md`.

**Payload (verified 2026-08-27):**
- Client-side Live Preview + `@payloadcms/live-preview-vue` / `useLivePreview` (Vue/Nuxt = client-side only): [Payload docs — Client-side Live Preview](https://payloadcms.com/docs/live-preview/client), [`3.x` client.mdx](https://github.com/payloadcms/payload/blob/3.x/docs/live-preview/client.mdx), [npm `@payloadcms/live-preview-vue`](https://www.npmjs.com/package/@payloadcms/live-preview-vue)
- S3 storage adapter (R2 `region:'auto'`, `forcePathStyle:true`): [Payload Storage Adapters](https://payloadcms.com/docs/upload/storage-adapters)
- Postgres adapter / DB overview (schema isolation, Drizzle): [Database Overview](https://github.com/payloadcms/payload/blob/3.x/docs/database/overview.mdx)
- Localized Blocks fallback fix (use current 3.x): [Issue #13663](https://github.com/payloadcms/payload/issues/13663)
- Server-side Live Preview is React-only (why 1B is client-side): [Payload docs — Server-side](https://payloadcms.com/docs/live-preview/server); [Prismic — Best Vue Headless CMS 2026](https://prismic.io/blog/best-vue-headless-cms)
