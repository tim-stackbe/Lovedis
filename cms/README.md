# Lovedis CMS (Payload 3, headless)

A self-hostable, **headless** [Payload CMS 3](https://payloadcms.com) app (Next.js
App Router, Next-native admin) that serves the editor UI at `/admin` plus Payload's
REST/GraphQL content API. It is the content backend for the **lovedis.de** homepage
(**Option 1B** — keep the Nuxt homepage, run Payload headless in its own container).

> Phase 1 scope: scaffold, homepage content model, homepage import, local build.
> The Nuxt live-preview integration and the server deploy are separate follow-ups.

## Stack

| Piece | Choice |
|---|---|
| Runtime | Node 22 (matches the platform image) |
| Framework | Next.js `16.2.9`, React `19.2.7` |
| CMS | `payload` `3.88.0` + `@payloadcms/next` |
| DB | `@payloadcms/db-postgres` — same Postgres as the platform, isolated **`payload`** schema |
| Storage | `@payloadcms/storage-s3` — Cloudflare R2 / Hetzner Object Storage |
| Rich text | `@payloadcms/richtext-lexical` |
| Locales | `de` (default) + `en` |

## Project layout

```
cms/
├─ src/
│  ├─ payload.config.ts       # single source of truth (db, storage, locales, i18n)
│  ├─ access/roles.ts         # admin/editor access control
│  ├─ collections/            # Pages, Media, Partners, Events, Users
│  ├─ globals/                # Navigation, SiteSettings
│  ├─ blocks/                 # the 10 homepage blocks (mirror Storyblok bloks)
│  ├─ fields/                 # shared link + seo field builders
│  └─ app/(payload)/…         # Next App Router mount for /admin + /api
├─ scripts/
│  ├─ import-homepage.ts      # seed the home page (de+en) from the Storyblok baseline
│  └─ seed-users.ts           # create initial admin + editor from env
├─ Dockerfile                 # multi-stage standalone (mirrors the platform)
├─ next.config.mjs            # output: 'standalone' + withPayload
└─ .env.example               # required env (placeholders only — never commit secrets)
```

## Content model ↔ Storyblok baseline

| Storyblok | Payload |
|---|---|
| `page` story (`home`) | `pages` collection, `layout` = Blocks |
| homepage bloks (10) | `blocks/*` → `hero`, `benefitsBento`, `programsSection`, `challengesSection`, `whyJoinUsSection`, `keyTopicsSliderSection`, `homepagePartnersSection`, `ecosystemDiagramSection`, `homepageEventsSection`, `ctaSection` |
| `site-settings.navbar` | `navigation` global |
| `site-settings` footer + toggles | `site-settings` global |
| `partner` / `event` | `partners` / `events` collections |
| Storyblok richtext | Lexical (converted on import) |
| Storyblok assets | `media` collection (S3/R2) |
| `translatable` fields / `en` | Payload `localized: true` + locales `de`/`en` |

## Local development

```bash
cd cms
cp .env.example .env          # then fill in DATABASE_URI, PAYLOAD_SECRET, etc.
npm install

# Point DATABASE_URI at a local Postgres with a `payload` schema, e.g.
#   postgresql://lovedis:lovedis@localhost:5434/lovedis?schema=payload
# For local uploads without S3, set DISABLE_S3_STORAGE=true (writes to ./media).

npm run migrate:create        # generate the initial SQL migration
npm run migrate               # apply migrations (creates the `payload` schema + tables)
npm run seed:users            # create admin + editor (reads CMS_* env)
npm run import:homepage       # import the homepage content (de + en)
npm run dev                   # http://localhost:3001/admin
```

## Scripts

| Script | Purpose |
|---|---|
| `dev` / `build` / `start` | Next.js dev / production build / serve |
| `lint` / `typecheck` | ESLint (next config) / `tsc --noEmit` |
| `generate:types` | write `src/payload-types.ts` |
| `generate:importmap` | regenerate the admin import map |
| `migrate` / `migrate:create` | Payload/Drizzle migrations (own `payload` schema) |
| `import:homepage` | seed the home page from `docs/storyblok-baseline/home.story.json` |
| `seed:users` | create the initial admin + editor accounts |

## Database isolation

Payload manages **only** the `payload` schema (`schemaName: 'payload'`). The
platform's Prisma continues to own `public`. One Postgres instance, one nightly
backup covers both. The pool is capped (`PAYLOAD_DB_POOL_MAX`, default 10) so the
platform + cms + backups stay within Postgres `max_connections`.

## Deploy (server — separate follow-up, not part of Phase 1)

The image is built in CI and run as the `cms` service behind Caddy at
`cms.lovedis.de` (see `deploy/hetzner/`). On first release:
`docker compose exec -T cms npm run migrate` creates the schema + tables. See the
repo's deploy docs and `.env.example` for the exact env var names required.
