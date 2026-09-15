# Self‑hostable visual/inline CMS options for the lovedis.de homepage

> **Type:** Orientation / advisory brief — *no implementation, no migration.*
> **Date:** 2026‑08‑27
> **Question:** "We edit the lovedis.de homepage in Storyblok's Visual Editor and love the
> live inline editing. Storyblok is SaaS‑only. Is there a self‑hostable, Storyblok‑like
> visual editor we could run on our Hetzner box to edit the Nuxt homepage the same way?"

---

## 1. Your current setup (grounded in the repo)

| Piece | Reality today | Source in repo |
|---|---|---|
| **Homepage `lovedis.de`** | **Nuxt (Vue 3)**, SSG, originally on Cloudflare; content from **Storyblok (SaaS)**. Now also runs as a `homepage` Docker container on the Hetzner TEST box. | `docs/architecture/plan-mara-homepage-merge.md` ("Current state"); `docs/reports/2026-08-27-hetzner-security-audit.md` (`home.*` host, Nuxt CSP) |
| **Platform (this repo, "Mara")** | **Next.js 16 + React 19** (RSC/Server Actions), **NextAuth v5**, **Prisma 7**, **Tailwind v4**; DB currently **Neon Postgres** (`@prisma/adapter-neon`, plus `@prisma/adapter-pg`). | `package.json`, `src/`, `prisma/` |
| **Hosting** | Single Hetzner **VPS**, **Docker Compose** (`caddy` + `platform` + `homepage` + `db postgres:18`), Caddy auto‑TLS. | `deploy/hetzner/docker-compose.yml`, `Caddyfile`, security audit |
| **Storyblok content** | Space `LOVEDIS` (id `288104308443570`, EU). **126 stories + 7 folders.** Content types: `partner` (42), `page` (27), `event` (13), `news-post` (9), `blog-post` (3), plus `site-settings`, `seo-settings`, `legal-page`. Homepage bloks: `hero`, `homepage-partners-section`, `why-join-us-section`, `programs-section`, `bento-box`, `ecosystem-diagram-*`, `homepage-events-section`, `cta-section`, etc. | `docs/storyblok-baseline/*` (exported baseline) |

### ⚠️ Two important corrections to the premise

1. **Payload is *decided*, not yet *installed*.** The task assumed the platform "already uses
   Payload CMS." It does **not** — `payload` is absent from `package.json`, `package-lock.json`,
   and `node_modules`. What exists is a **locked architectural decision** in
   `docs/architecture/plan-mara-homepage-merge.md`: *"Replace Storyblok with **Payload CMS 3**,
   embedded in the Next.js app,"* self‑host everything on Hetzner (Coolify + CI‑built image,
   Postgres 17 on a Cloud Volume, media on Hetzner Object Storage). So Payload is the front‑runner
   *on paper*, but it's greenfield work, not an existing asset to reuse.
2. **You don't (didn't) control the Nuxt source.** The merge plan states you *"only have Storyblok
   access, not the Nuxt repo."* A `homepage` container now runs on the TEST box, but any option
   that relies on instrumenting the Nuxt front‑end assumes you can edit that Nuxt code. Confirm
   this before betting on a "keep Nuxt" path.

**Bottom line:** you already self‑host the *front‑end* on Hetzner. What lives in the cloud today is
only Storyblok's **editor + content store**. The question is which self‑hostable tool can replace
*that* while preserving the click‑on‑the‑page editing experience.

---

## 2. The options (verified against 2026 sources)

### Storyblok itself — the baseline
- **Self‑hostable?** ❌ **No.** SaaS‑only; no on‑prem edition, no Docker image, no self‑managed
  deployment ([TECHSY 2026](https://techsy.io/en/blog/storyblok-guide),
  [DXP Scorecard](https://www.dxpscorecard.com/platform/storyblok)).
- **Visual editing:** Best‑in‑class WYSIWYG live inline editor — the bar everything else is measured against.
- **Nuxt fit:** Excellent (official `@storyblok/nuxt`).
- **Note:** Your **front‑end can stay self‑hosted on Hetzner**; only the editor/content is cloud. A
  true self‑hosted *clone* of the Visual Editor does not exist.

### Directus — closest self‑hosted match for a Nuxt front‑end
- **Self‑hostable?** ✅ Yes (Docker; needs Postgres/MySQL/SQLite).
- **Visual editing:** Native **Visual Editor + Live Preview**. Click‑to‑edit overlay on your own
  site rendered in an iframe — conceptually the closest thing to Storyblok's UX. Admin (Studio) is
  itself **Vue‑based**.
- **Nuxt fit:** ✅ **First‑class & official.** `@directus/visual-editing` + `setAttr()` /
  `data-directus` attributes; iframe auto‑detection; `refreshNuxtData()` on save, no full reload
  ([Directus × Nuxt Visual Editor](https://directus.com/docs/frameworks/nuxt/visual-editor),
  [Live Preview](https://directus.com/docs/frameworks/nuxt/live-preview-setup),
  community [Nuxt Directus SDK](https://www.nuxt-directus-sdk.com/guide/visual-editor.html)).
- **Licensing:** Open‑core under **BSL 1.1** (free to self‑host under the usage/revenue limits; a
  commercial license applies above them). Verify against current revenue thresholds.
- **Hetzner footprint:** One Node container + a DB. Light.
- **Migration from Storyblok:** **M** — model collections, transform richtext/assets, instrument the
  Nuxt components with `data-directus` attributes.

### Strapi 5 — self‑hostable, but the *good* preview is paid
- **Self‑hostable?** ✅ Yes (Node + DB).
- **Visual editing:** **Preview** exists; on the **Free** plan it's **full‑screen only**. The
  Storyblok‑like **Live Preview** (side‑by‑side + double‑click‑to‑edit **in context**) requires a
  paid **Growth/Enterprise** license ([Strapi Preview docs](https://docs.strapi.io/cms/features/preview),
  [release roundup 2026](https://strapi.io/blog/strapi-release-roundup-everything-that-changed-between-march-and-june-2026)).
- **Nuxt fit:** Good data integration via `@nuxtjs/strapi`; preview wired through a Nuxt
  `?preview=true` route. Admin is **React**.
- **Migration:** **M**. Weaker than Directus for the *visual* goal unless you pay.

### Payload CMS 3 — your own locked choice; React‑centric but Vue‑capable
- **Self‑hostable?** ✅ Yes (Node + Postgres). It's the CMS your merge plan already selected.
- **Visual editing:** **Live Preview** via iframe + `window.postMessage`. Two modes:
  - **Server‑side live preview** (React Server Components only, e.g. Next.js App Router) — the
    smoothest experience.
  - **Client‑side live preview** — **officially supports Vue 3 / Nuxt 3** via
    **`@payloadcms/live-preview-vue`** and its `useLivePreview` composable
    ([Payload client live preview docs](https://payloadcms.com/docs/live-preview/client),
    [npm @payloadcms/live-preview-vue](https://www.npmjs.com/package/@payloadcms/live-preview-vue),
    [Prismic 2026 Nuxt CMS comparison](https://prismic.io/blog/best-headless-cms-for-nuxt)).
- **Two ways to use it here:**
  - **(A) Consolidate** the homepage into the Next/Payload app (the merge plan) → richest,
    server‑side live preview, one stack, one DB, one `/admin`. Requires **rebuilding the Nuxt
    homepage in React**.
  - **(B) Keep Nuxt**, run Payload **headless**; Nuxt fetches via REST/GraphQL (`useAsyncData`) and
    uses `@payloadcms/live-preview-vue` for **client‑side** live preview. No official Nuxt module or
    starter — you wire the plugin yourself.
- **Nuxt caveats:** No official Nuxt module/starter; **server‑side** live preview is React‑only, so
  the Nuxt path is client‑side only (good, but a notch below Storyblok/Directus polish).
- **Migration:** **M** (headless‑to‑Nuxt) / **L** (full homepage rebuild in React).

### TinaCMS — true inline editing, but **React‑only for the visual part**
- **Self‑hostable?** ✅ Yes (Git‑backed; self‑hosted backend = DB + auth layer).
- **Visual editing:** Genuine Storyblok‑like **inline/contextual** editing (site in iframe + sidebar,
  click‑to‑focus) — **but only in React** (Next.js first‑class; Astro via React islands).
- **Nuxt/Vue fit:** ❌ **Visual editing not supported.** Vue is explicitly *"in our backlog."* Only
  the non‑visual "basic editor" works with Nuxt
  ([Tina Vue docs](https://tina.io/docs/contextual-editing/vue),
  [Tina frameworks](https://tina.io/docs/integration/frameworks),
  [Lucky Media review 2026](https://www.luckymedia.dev/insights/tina-cms)).
- **Verdict:** Great UX, wrong framework for a Nuxt front‑end. Only relevant if you go React anyway
  (and even then Payload is the stronger fit here).

### Builder.io & Plasmic — great visual builders, self‑host story is the catch
- **Builder.io:** Excellent visual editor, **supports Vue/Nuxt**; SDK is MIT open source, **but the
  editor/platform is SaaS** — not self‑hostable ([BuilderIO/builder](https://github.com/BuilderIO/builder/)).
- **Plasmic:** **Open‑source SDK**, offers **on‑premise/behind‑firewall deployment**, but is
  **React‑only** (no Vue/Nuxt) ([Plasmic](https://www.plasmic.app/),
  [MakerStack review 2026](https://makerstack.co/reviews/plasmic-review/)). So: self‑host yes, Nuxt no.
- **Verdict:** Neither gives you *self‑host + Nuxt + Storyblok‑like editing* together.

### Decap CMS / Sveltia CMS — git‑based, lightweight, *not truly visual*
- **Self‑hostable?** ✅ "Semi": a CDN‑served single‑page app + content in **your Git repo**; no DB,
  no server to maintain.
- **Visual editing:** ❌ Not inline/on‑page. It's a **form‑based** editor with preview panes.
- **Nuxt fit:** Framework‑agnostic (works with any SSG). **Sveltia** is the modern, actively
  maintained successor to Decap/Netlify CMS (GA targeted **late 2026**)
  ([Sveltia CMS](https://sveltiacms.app/en/), [GitHub](https://github.com/sveltia/sveltia-cms)).
- **Verdict:** Nice, cheap, git‑friendly — but doesn't reproduce the Storyblok "edit the live page"
  feel. Mention only if editors accept a forms UI.

### Other 2026 mentions
- **OpenPage** (MIT, JSON‑first, self‑host) — **React** only.
- **Nitropage** (self‑host) — **SolidJS** only.
- **Silex** — open‑source self‑hostable static‑site visual editor (different model).
- None of these fit a Nuxt/Vue + Storyblok‑like requirement better than Directus or Payload.

---

## 3. Comparison table

| Tool | Self‑host? | Visual/inline editing vs Storyblok | Nuxt/Vue fit | Licensing / cost | Hetzner footprint | Migration effort |
|---|---|---|---|---|---|---|
| **Storyblok** (baseline) | ❌ SaaS‑only | ⭐ Best‑in‑class | ⭐ Official `@storyblok/nuxt` | Proprietary SaaS subscription | Front‑end only (editor in cloud) | — (stay put) |
| **Directus** | ✅ | ⭐ Very close (click‑to‑edit overlay) | ⭐ First‑class official Nuxt Visual Editor | BSL 1.1 (free under revenue cap) | Node + DB | **M** |
| **Payload 3** | ✅ | Good; ⭐ if homepage is React (server‑side), good client‑side for Nuxt | React‑first; **Vue via `@payloadcms/live-preview-vue`** | Open source (MIT) | Node + Postgres | **M** (headless) / **L** (rebuild) |
| **Strapi 5** | ✅ | Basic free; ⭐ Live Preview is **paid** | Good data (`@nuxtjs/strapi`); React admin | Open core; Live Preview = paid tier | Node + DB | **M** |
| **TinaCMS** | ✅ | ⭐ Inline — **React only** | ❌ No visual editing for Vue/Nuxt | Open source / TinaCloud | Node + DB + Git | n/a for Nuxt |
| **Builder.io** | ❌ SaaS | ⭐ Great, supports Vue | ✅ Vue/Nuxt | MIT SDK, **SaaS platform** | Front‑end only | — |
| **Plasmic** | ✅ (on‑prem) | ⭐ Great — **React only** | ❌ No Vue/Nuxt | Open‑source SDK | Node + DB | n/a for Nuxt |
| **Decap / Sveltia** | ✅ (git‑based) | ❌ Form‑based, not inline | ✅ Framework‑agnostic | Open source (free) | Static app + Git repo | **S–M** |

Legend: ⭐ = strong. Effort **S/M/L** = Small / Medium / Large.

---

## 4. Recommendation (tailored, ranked)

Your constraints: **(a)** Nuxt/Vue homepage, **(b)** an existing architectural decision to adopt
**Payload** for the platform and drop Storyblok, **(c)** self‑hosting on Hetzner with Docker/Caddy
already in place.

### 🥇 Option 1 — Go with your own plan: **Payload CMS 3** (effort **M→L**)
Payload is already your locked decision and it's genuinely a good fit for a self‑hosted Hetzner box.
Two flavours, pick based on how attached you are to Nuxt:

- **1A — Consolidate homepage into the Next/Payload app** *(the merge plan; effort **L**)*.
  One stack, one DB, one `/admin`, and the **best visual editing** (server‑side live preview with
  React Server Components). Cost: **rebuild the Nuxt homepage in React**. Best long‑term "one system"
  outcome; highest up‑front work. This is what `plan-mara-homepage-merge.md` already prescribes.
- **1B — Keep Nuxt, Payload headless** *(effort **M**)*. Nuxt fetches Payload via REST/GraphQL and
  uses **`@payloadcms/live-preview-vue`** for client‑side live preview. Preserves your Vue front‑end
  and avoids a rewrite; downside is a self‑wired integration (no official Nuxt module) and
  client‑side‑only preview (a notch below Storyblok polish). Good **stepping stone** toward 1A.

*Why #1:* it consolidates onto a single self‑hosted stack you've already chosen, and Payload's Vue
live‑preview package means you are **not** forced to rewrite in React on day one.

### 🥈 Option 2 — **Directus** if "keep Nuxt + Storyblok‑like UX" is the priority (effort **M**)
If the top goal is *"the same click‑on‑the‑page editing, self‑hosted, with the Nuxt front‑end
untouched‑as‑much‑as‑possible,"* Directus is the closest match: **official Nuxt Visual Editor**,
Vue‑based admin, light Hetzner footprint. **Trade‑off:** it introduces a **second CMS** alongside the
Payload you plan for the platform (two systems, two content stores) — good for the homepage in
isolation, less good for consolidation. Also check the **BSL license** revenue thresholds.

### 🥉 Option 3 — **Keep Storyblok (SaaS)** as the baseline (effort **S / ~zero**)
Least effort, best editor, keeps the exact workflow your editors love. **Not self‑hosted** — content
lives in Storyblok's cloud (EU region) and you keep paying the subscription. Perfectly valid if
self‑hosting isn't a hard requirement; the front‑end already runs on your Hetzner box.

**Not recommended for your case:** TinaCMS, Plasmic (React‑only → wrong for Nuxt), Builder.io
(SaaS), Decap/Sveltia (not truly inline/visual), Strapi (its visual Live Preview is paid and it adds
a React admin without the Payload synergy).

---

## 5. Effort / complexity at a glance

| Path | Effort | Main work |
|---|---|---|
| Keep Storyblok SaaS | **S** | None (baseline) |
| Payload **headless** + Nuxt live‑preview (1B) | **M** | Model collections, migrate content, wire Nuxt plugin + `useLivePreview`, instrument components |
| Directus + Nuxt Visual Editor (2) | **M** | Stand up Directus + DB, model collections, migrate content, add `data-directus` attributes in Nuxt |
| Payload **consolidation** / homepage rebuild (1A) | **L** | Everything in the merge plan: rebuild homepage in React, migrate content + DB, cutover |

All migration paths reuse the exported **`docs/storyblok-baseline/*`** (stories, components, site
settings) as the source of truth for modelling and diffing.

---

## 6. Key decision questions for you

1. **Is self‑hosting a hard requirement** (data sovereignty / privacy / cost), or is EU‑region SaaS
   acceptable? If SaaS is fine, *keeping Storyblok is the cheapest, best‑UX answer.*
2. **One system or two?** Do you want the homepage CMS to be the **same** as the platform CMS
   (→ Payload, consolidate) or is a **dedicated** homepage CMS acceptable (→ Directus)?
3. **How attached are you to Nuxt/Vue?** Willing to rebuild the homepage in React for the best
   Payload experience (1A), or must the Vue front‑end stay (→ 1B or Directus)?
4. **Do you actually control the Nuxt source** to instrument it for visual editing? (The merge plan
   says you historically only had Storyblok access.)
5. **How non‑technical are the editors?** Do they need true click‑on‑page inline editing (Storyblok /
   Directus / Payload live preview), or is a clean forms UI enough (→ Decap/Sveltia, cheaper)?
6. **Git‑based vs database‑based content?** Git (Sveltia/Tina) gives versioned, reviewable content
   but a less "live" feel; database (Payload/Directus/Strapi) matches Storyblok's model.
7. **Budget for paid tiers?** Relevant only if Strapi's paid Live Preview were on the table.

> **This is an orientation brief only — no migration is recommended to execute now.** The purpose is
> to let you choose a direction with eyes open. If/when you decide, the natural next step is a small
> spike of the top pick (e.g. Payload headless + Nuxt live preview, *or* Directus Visual Editor)
> against a couple of real homepage bloks from `docs/storyblok-baseline/`.

---

## Sources

- Storyblok is SaaS‑only: [TECHSY guide 2026](https://techsy.io/en/blog/storyblok-guide),
  [DXP Scorecard](https://www.dxpscorecard.com/platform/storyblok),
  [Hygraph alternatives](https://hygraph.com/blog/storyblok-alternative)
- Directus Visual Editor / Live Preview for Nuxt:
  [Visual Editor × Nuxt](https://directus.com/docs/frameworks/nuxt/visual-editor),
  [Live Preview setup](https://directus.com/docs/frameworks/nuxt/live-preview-setup),
  [Live Preview guide](https://directus.com/docs/guides/content/live-preview),
  [Nuxt Directus SDK](https://www.nuxt-directus-sdk.com/guide/visual-editor.html)
- Strapi 5 Preview (free full‑screen vs paid Live Preview):
  [Strapi Preview docs](https://docs.strapi.io/cms/features/preview),
  [Release roundup Mar–Jun 2026](https://strapi.io/blog/strapi-release-roundup-everything-that-changed-between-march-and-june-2026),
  [@nuxtjs/strapi guide](https://strapi.io/blog/nuxt-vue-framework-explained-guide)
- Payload Live Preview (+ Vue/Nuxt support):
  [Overview](https://payloadcms.com/docs/live-preview/overview),
  [Server‑side (React)](https://payloadcms.com/docs/live-preview/server),
  [Client‑side (React/Vue)](https://payloadcms.com/docs/live-preview/client),
  [`@payloadcms/live-preview-vue` on npm](https://www.npmjs.com/package/@payloadcms/live-preview-vue),
  [Prismic: Best Headless CMS for Nuxt 2026](https://prismic.io/blog/best-headless-cms-for-nuxt)
- TinaCMS Vue/Nuxt status (visual editing React‑only):
  [Vue docs (backlog)](https://tina.io/docs/contextual-editing/vue),
  [Frameworks](https://tina.io/docs/integration/frameworks),
  [Lucky Media review 2026](https://www.luckymedia.dev/insights/tina-cms)
- Builder.io / Plasmic (SaaS vs on‑prem, framework support):
  [BuilderIO/builder (MIT SDK)](https://github.com/BuilderIO/builder/),
  [Plasmic (on‑prem, React‑only)](https://www.plasmic.app/),
  [MakerStack Plasmic review 2026](https://makerstack.co/reviews/plasmic-review/)
- Decap / Sveltia (git‑based, not inline):
  [Sveltia CMS](https://sveltiacms.app/en/), [Sveltia on GitHub](https://github.com/sveltia/sveltia-cms),
  [Architecture](https://sveltiacms.app/en/docs/architecture)
- Open‑source CMS landscape 2026:
  [FocusReactive comparison](https://focusreactive.com/blog/compare-open-source-cms-in-2026/)

*Internal references:* `docs/architecture/plan-mara-homepage-merge.md`,
`docs/storyblok-baseline/`, `deploy/hetzner/`, `docs/reports/2026-08-27-hetzner-security-audit.md`.

---

# Payload CMS — Optionen im Detail

> Vertiefung zur Frage *"Was gibt es für Payload-CMS-Optionen?"* — weiterhin **nur Orientierung**,
> keine Umsetzung. Kontext: Homepage = Nuxt + Storyblok, Plattform = Next.js/React, self-hosted auf
> Hetzner (Docker/Caddy/Postgres). **Payload ist noch nicht installiert**, aber im Merge-Plan als
> Ziel-CMS festgelegt.

## 1) Architektur- / Integrations-Optionen (die zentrale Weggabelung)

Payload 3 ist als **Next.js-Plugin/-App** gebaut: es lebt im Next-App-Router und stellt `/admin`,
REST- und GraphQL-API bereit. Wie ihr eure Homepage damit editiert, hängt an der Integration.

### 1A — Homepage in die Next.js-App konsolidieren (Payload embedded) · Aufwand **L**
- **Was:** Die Homepage wird als React/Next-Frontend im selben Repo/Deploy wie Payload gebaut. Genau
  das beschreibt `plan-mara-homepage-merge.md` (eine App: `/` Marketing, `/app/*` Plattform,
  `/admin` Payload).
- **Editing-Erlebnis:** **Bestes** – **Server-Side Live Preview** (React Server Components):
  Redakteur:innen bearbeiten Felder im `/admin` und sehen die **echte Seite** live im iframe, ohne
  Speichern/Reload; per `router.refresh()` werden die Server-Components neu gerendert
  ([Payload Server-Side Live Preview](https://payloadcms.com/docs/live-preview/server)). Kommt dem
  Storyblok-Gefühl am nächsten, inkl. Draft-Preview.
- **Kosten:** Nuxt-Homepage muss **in React neu gebaut** werden.
- **Vorteil:** Ein Stack, ein Deploy, eine DB, ein Login, gemeinsame Tailwind-Tokens.

### 1B — Nuxt behalten, Payload headless + Vue-Live-Preview · Aufwand **M**
- **Was:** Payload läuft als eigener Dienst (Container). Nuxt bleibt das Frontend und holt Inhalte
  über REST/GraphQL (`useAsyncData`/`$fetch`).
- **Editing-Erlebnis:** **Client-Side Live Preview** offiziell für Vue 3 / Nuxt 3 via
  **`@payloadcms/live-preview-vue`** (`useLivePreview`-Composable): Seite lädt im iframe des Admin,
  Änderungen werden per `postMessage` live in den Frontend-State gemergt
  ([Payload Client Live Preview](https://payloadcms.com/docs/live-preview/client),
  [npm](https://www.npmjs.com/package/@payloadcms/live-preview-vue)). Gut, aber eine Stufe unter
  1A/Storyblok (client-side, kein offizielles Nuxt-Modul/Starter → Plugin selbst verdrahten).
- **Vorteil:** **Kein Rewrite**, Vue-Frontend bleibt. Guter Zwischenschritt Richtung 1A.

### 1C — Payload als reine Headless-API (ohne Live Preview) · Aufwand **S–M**
- **Was:** Payload nur als Content-Backend; Nuxt rendert; **Redakteur:innen arbeiten ausschließlich
  im `/admin`** (Formular-UI mit Feldern/Blocks), **nicht auf der Seite**.
- **Editing-Erlebnis:** Kein On-Page-Editing, keine Live-Vorschau der echten Seite – nur die
  Admin-Oberfläche (plus optional Draft/Publish). **Am weitesten von Storyblok entfernt**, aber am
  schnellsten aufgesetzt und am wenigsten Frontend-Kopplung.
- **Vorteil:** Minimaler Integrationsaufwand; ihr könnt später auf 1B/1A upgraden.

**Kurz zu den drei Editing-Stufen:** *Plain Admin* (1C, Formular) → *Live Preview* (1B, echte Seite
im iframe, live, client-side) → *On-Page/Server-Side Live Preview* (1A, echte Seite live, am
nahtlosesten). Ein echtes „direkt im Text auf der Seite klicken & tippen" wie bei Storyblok/Directus
ist bei Payload primär über die Live-Preview-Ansicht im Admin realisiert, nicht als frei
überlagernder Editor auf der Live-Domain.

## 2) Hosting-Optionen

- **Self-host auf eurem Hetzner-Server (empfohlen):** Payload ist **Open Source (MIT)** und voll
  self-hostbar. Es läuft als weiterer Node-Container **neben** `platform`/`homepage`/`db` in eurem
  bestehenden Docker-Compose hinter Caddy. Gibt euch **Datenhoheit** (Inhalte in eurer DB, kein
  Vendor-Lock-in). Footprint: 1 Node-Prozess (~ moderat RAM) + DB. Auf CX32/CAX21 (8 GB) problemlos,
  v. a. weil Builds in CI laufen.
- **Payload Cloud:** **Gibt es 2026 nicht mehr** – es existiert **kein** von Payload gehosteter Tier;
  ihr hostet selbst ([DEV 2026](https://dev.to/nayankyada/payload-cms-pricing-2026-the-real-infrastructure-cost-breakdown-172j),
  [Payload 2026 Trade-offs](https://gautamkhorana.com/blog/payload-cms-2026/)).
- **Andere PaaS (Railway/Fly/Vercel):** Möglich, aber für euch unnötig – ihr habt Hetzner + Docker
  bereits. Nur relevant, wenn ihr Betrieb auslagern wollt.

## 3) Datenbank-Optionen

Payload ist DB-agnostisch über **Database Adapter**: **Postgres** (Drizzle), **MongoDB** (Mongoose),
**SQLite** (Drizzle) ([DB Overview](https://github.com/payloadcms/payload/blob/3.x/docs/database/overview.mdx)).
Fast alle Features (Localization, Arrays, **Blocks**) laufen in allen Adaptern.

- **Empfehlung: Postgres** (`@payloadcms/db-postgres`). Ihr **betreibt bereits Postgres** auf Hetzner
  – natürlicher Fit, ein DB-System weniger. Payload kann in ein **eigenes Schema** (`payload`) neben
  dem Plattform-Schema (`public`) → saubere Trennung, gleiche DB-Instanz (genau wie im Merge-Plan
  vorgesehen). Relationales Modell passt gut zu strukturiertem Marketing-Content.
- MongoDB nur, wenn ihr sehr viele dynamische/verschachtelte Felder hättet und DDL-Migrationen
  vermeiden wollt – für euch nicht nötig.

## 4) Editing-/UX-Features, die man kennen sollte

- **Live Preview** – siehe 1A/1B (server- vs. client-side).
- **Draft/Publish + Versionen + Autosave** – Entwürfe, Versionshistorie, Autosave-Intervall (macht
  Server-Side-Preview „snappier").
- **Lexical Rich-Text-Editor** – moderner, erweiterbarer Editor; Storyblok-Richtext → **Lexical**
  muss beim Import transformiert werden.
- **Blocks-Field** – **das direkte Analog zu Storyblok-„Bloks"/Komponenten**: frei anordbare,
  wiederholbare Content-Bausteine (Hero, Bento, Partner-Section …) → Layout-Building für Seiten.
- **Media/Uploads** – über Storage-Adapter. **Cloudflare R2** (habt ihr schon) via
  **`@payloadcms/storage-s3`** (S3-kompatibel, `region: 'auto'`, `forcePathStyle: true`); alternativ
  **Hetzner Object Storage** (ebenfalls S3-kompatibel) – beide passen
  ([Storage Adapters](https://payloadcms.com/docs/upload/storage-adapters)).
- **Localization / i18n** – **eingebaut**: `localization` (Feld-Level-Übersetzung pro Locale) für den
  Content + `i18n` für die Admin-Oberfläche. **Wichtig, da die Homepage mehrsprachig ist** – Payload
  deckt das nativ ab (Storyblok macht i18n ebenfalls feld-basiert → gut mappbar). *Hinweis:* bei
  **lokalisierten Blocks** gab es historisch Fallback-Bugs, die bis Ende 2025 gefixt wurden – aktuelle
  Version nehmen ([Issue #13663](https://github.com/payloadcms/payload/issues/13663)).
- **Access Control / Rollen** – granulare Rechte pro Collection/Feld; separate **Users**-Collection
  für Redakteur:innen (getrennt von NextAuth-Plattform-Usern, wie im Plan).

## 5) Migration von Storyblok → Payload (nur high-level)

- **Mapping:** Storyblok **Bloks** → Payload **Blocks** (im `layout`-Feld einer `Pages`-Collection);
  **Stories** → Einträge in Collections; **globale Inhalte** (`site-settings`, Navigation) →
  **Globals**; `partner`/`event`/`speaker`/`news-post`/`blog-post` → eigene Collections.
- **Quelle:** die vorhandenen Exporte in **`docs/storyblok-baseline/*`** (`components.json` =
  Content-Modell, `home.story.json`, `page.*.json`, `site-settings.json`) als Referenz zum Modellieren
  und späteren Diffen.
- **Umfang:** 126 Stories + 7 Folder; Content-Typen u. a. `partner` (42), `page` (27), `event` (13).
- **Haupt-Gotchas:** Richtext **→ Lexical** transformieren; Assets → **Media** (nach R2/Hetzner
  hochladen, URLs umschreiben); **mehrsprachige** Felder korrekt auf Payload-Locales abbilden;
  verschachtelte Bloks → Block-Struktur; referenzielle Beziehungen (Partner/Events) auflösen. Import
  am besten über Payloads **Local API**. Grober Aufwand der Content-Migration: **M**.

## 6) Empfehlung für euch (gerankt)

Rahmen: mehrsprachige Homepage, **Postgres + R2 bereits vorhanden**, Hetzner-Self-host, Payload im
Plan bereits gesetzt.

1. **🥇 Zielbild: 1A (Konsolidierung in Next/Payload) + Postgres + Hetzner-Self-host.** Bestes
   Editing (Server-Side Live Preview), ein Stack, deckt Multilang + Media (R2/Hetzner) nativ ab.
   Aufwand **L** (Homepage-Rewrite in React). Das ist die im Merge-Plan bereits getroffene Richtung.
2. **🥈 Pragmatischer Einstieg: 1B (Nuxt behalten, Payload headless + `live-preview-vue`) + Postgres +
   Hetzner.** Kein Rewrite, brauchbare Live-Vorschau, ihr lernt Payload am echten Content. Aufwand
   **M**. Sauberer Zwischenschritt, später auf 1A migrierbar.
3. **🥉 Minimal: 1C (Payload nur Headless, Admin-only Editing).** Schnell live, aber kein On-Page-/
   Live-Editing → am weitesten von der geliebten Storyblok-UX entfernt. Aufwand **S–M**. Nur, wenn die
   Redaktion mit reiner Formular-UI zufrieden ist.

**Für alle Varianten gleich:** DB = **Postgres** (eigenes `payload`-Schema), Hosting = **Hetzner
self-host** (Container neben den bestehenden), Media = **R2 oder Hetzner Object Storage** via
`@payloadcms/storage-s3`, i18n = **Payload Localization**.

**Grober Ablauf (high-level, keine Umsetzung jetzt):** (1) Payload in die Next-App scaffolden +
Postgres-Adapter/`payload`-Schema, (2) Collections/Globals/Blocks aus `storyblok-baseline` modellieren,
(3) Storage-Adapter (R2/Hetzner) + Localization konfigurieren, (4) Content-Import via Local API +
Diff gegen Baseline, (5) Frontend anbinden – 1A: Homepage in React neu bauen / 1B: Nuxt + Vue-Live-
Preview, (6) Draft/Publish + Rollen testen, (7) Cutover.

**Entscheidungsfragen:**
- **React-Rewrite der Homepage akzeptabel?** Ja → 1A (bestes Ergebnis). Nein → 1B.
- **Braucht ihr echtes On-Page-Editing** oder reicht **Admin + Live-Vorschau**? On-Page-Gefühl → 1A;
  Vorschau ok → 1B; nur Formular ok → 1C.
- **Eine App oder zwei Dienste** dauerhaft? Konsolidierung (1A) vs. getrennt (1B/1C).
- **Wer pflegt Multilang** und wie viele Locales? (Beeinflusst Modellierung der Localization.)

## Quellen (Payload-Teil)

- Live Preview (Server/Client/Vue): [Overview](https://payloadcms.com/docs/live-preview/overview),
  [Server-Side](https://payloadcms.com/docs/live-preview/server),
  [Client-Side (React/Vue)](https://payloadcms.com/docs/live-preview/client),
  [`@payloadcms/live-preview-vue`](https://www.npmjs.com/package/@payloadcms/live-preview-vue)
- DB-Adapter (Postgres/MongoDB/SQLite), Blocks, Localization:
  [Database Overview](https://github.com/payloadcms/payload/blob/3.x/docs/database/overview.mdx),
  [llms-full.txt](https://payloadcms.com/llms-full.txt)
- Kein Payload Cloud 2026 / MIT / Kosten:
  [DEV: Payload Pricing 2026](https://dev.to/nayankyada/payload-cms-pricing-2026-the-real-infrastructure-cost-breakdown-172j),
  [Payload in 2026](https://gautamkhorana.com/blog/payload-cms-2026/)
- Media/Storage (R2 via S3-Adapter):
  [Storage Adapters](https://payloadcms.com/docs/upload/storage-adapters),
  [R2/S3-Guide](https://payloadcms.com/posts/guides/how-to-configure-file-storage-in-payload-with-vercel-blob-r2-and-uploadthing)
- Lokalisierte Blocks – Fallback-Fix Ende 2025:
  [Issue #13663](https://github.com/payloadcms/payload/issues/13663)

---

# Payload auf dem Hetzner-Deployment — einfachste Lösung für Redakteure

> **Fokus:** Payload konkret in **euer bestehendes Hetzner-Docker-Deployment** einbauen, damit
> **nicht-technische Kolleg:innen die lovedis.de-Homepage bearbeiten** können — **so einfach wie
> möglich** (für die Redaktion *und* im Betrieb). Weiterhin **nur Plan, keine Umsetzung.**

## Ausgangslage (aus dem Repo / Security-Audit)

Aktueller Stack auf dem Hetzner-Server (`/opt/lovedis`, Docker Compose):
`caddy` + `platform` (Next.js, `app.<ip>.nip.io`) + `homepage` (Nuxt/Vue, `home.<ip>.nip.io`) +
`db` (postgres:18). Nur 22/80/443 offen, DB **nicht** nach außen gepublished, Caddy Auto-TLS.
Media liegt auf **R2/S3**. **Payload ist noch nicht installiert.** Die `deploy/hetzner/.env.example`
sieht Payload bereits vor (`PAYLOAD_SECRET`, `schema=payload`, `S3_*`). **DB-Backups fehlen aktuell**
(Security-Audit Finding #31).

## Die 3 realistischen Editier-Stufen (Redaktions-UX vs. Aufwand)

| Stufe | Was die Redaktion sieht | Nuxt-Umbau? | Aufwand | Nähe zu Storyblok |
|---|---|---|---|---|
| **1 · Admin-only (headless)** | Nur `/admin`: Formulare + **Blocks** anlegen/ordnen. Keine Live-Ansicht der echten Seite. | nur Datenanbindung an Payload-API | **S–M** | niedrig |
| **2 · Admin + Live Preview** ⭐ | `/admin` **mit Vorschau-Pane**: die **echte Homepage** lädt im iframe und aktualisiert sich **live** beim Tippen (`@payloadcms/live-preview-vue`). | ja: Nuxt holt Content von Payload + `useLivePreview` einbauen | **M** | hoch (fast wie Storyblok) |
| **3 · Echtes On-Page-Editing** | Direkt auf der gerenderten Seite klicken/tippen (Server-Side Live Preview). | **komplett**: Homepage in **React** neu bauen, in die Payload/Next-App integriert | **L** | am höchsten |
| **Storyblok heute** (Referenz) | Bester visueller Editor, aber SaaS | — | — | — |

Quellen: [Client-Side Live Preview (React/Vue)](https://payloadcms.com/docs/live-preview/client),
[`@payloadcms/live-preview-vue`](https://www.npmjs.com/package/@payloadcms/live-preview-vue),
[Server-Side Live Preview](https://payloadcms.com/docs/live-preview/server).

**Sweet Spot = Stufe 2.** Sie gibt der Redaktion ein echtes Live-Gefühl (Vorschau der echten Seite,
Änderungen sofort sichtbar) **ohne** die Nuxt-Homepage komplett in React neu zu bauen. Stufe 1 ist der
schnellste MVP (kann man zuerst live nehmen und Live Preview später ergänzen); Stufe 3 ist die
schönste UX, aber teuer und nur beim Konsolidieren in die Next-App sinnvoll.

## Wie es in den Hetzner-Stack passt (minimaler Betrieb)

**Empfohlen: Payload als eigener, kleiner Container `cms`** — eine schlanke Next.js-App, die nur
`/admin` + Payload-API hostet (Payload 3 ist Next-nativ). So bleibt eure `platform`- und
`homepage`-Container unberührt, und ihr fügt genau **einen** Dienst hinzu.

- **Container:** neuer Service `cms` (Node, Port 3000) neben `platform`/`homepage`/`db`.
- **Caddy-Route:** eigene Subdomain, z. B. `cms.<ip>.nip.io` (später `cms.lovedis.de`):

```caddyfile
cms.lovedis.de {
	encode zstd gzip
	reverse_proxy cms:3000
}
```

- **DB:** **die vorhandene Postgres** wiederverwenden — Payload in **eigene Datenbank oder eigenes
  Schema** (`payload`), getrennt vom Plattform-Schema (`public`). Ein DB-System, ein Backup deckt
  alles ab. (Postgres-Adapter `@payloadcms/db-postgres`.)
- **Media:** die **vorhandene R2/S3** über `@payloadcms/storage-s3` (R2: `region:'auto'`,
  `forcePathStyle:true`) — keine neue Infrastruktur ([Storage Adapters](https://payloadcms.com/docs/upload/storage-adapters)).
- **Env (neu):** `PAYLOAD_SECRET`, `DATABASE_URL` (…`?schema=payload`), `S3_*` — alles im
  `.env.example` bereits vorgesehen.
- **Compose-Skizze:**

```yaml
  cms:
    image: ${CMS_IMAGE}          # eigenes CI-Image (Payload/Next), analog zu platform
    restart: unless-stopped
    env_file: .env
    expose: ["3000"]             # nur intern; Caddy terminiert TLS
    depends_on:
      db: { condition: service_healthy }
```

- **Content-Fluss (Stufe 1/2):** Nuxt-Homepage holt Inhalte statt von Storyblok künftig von der
  **Payload-API** (`useAsyncData`/`$fetch`); für Stufe 2 zusätzlich `useLivePreview` +
  `livePreview.url` in Payload auf die Nuxt-URL zeigen.

**Alternative (Stufe 3):** Homepage **in die `platform`-Next-App konsolidieren** und Payload dort
einbetten → bestes On-Page-Editing, aber Nuxt-Rewrite (**L**). Nur sinnvoll, wenn ihr ohnehin weg von
Nuxt wollt (deckt sich mit `plan-mara-homepage-merge.md`). **Einfachste Gesamtlösung ist der eigene
`cms`-Container (Stufe 1→2), nicht die Konsolidierung.**

### Betriebs-Einfachheit
- **Auth ist eingebaut:** Payload bringt eine **Users-Collection mit Rollen** mit → Kolleg:innen
  bekommen eigene Accounts (z. B. Rolle „editor"), granulare Access-Control pro Collection/Feld. Kein
  separates Login-System nötig.
- **Backups:** Payload-Daten liegen in derselben Postgres → **ein** `pg_dump`-Cron sichert Plattform +
  CMS. Das schließt zugleich die **fehlenden Backups** aus dem Audit (Finding #31); Vorlage liegt
  unter `deploy/hetzner/backup-postgres.sh`.
- **Footprint:** ein zusätzlicher Node-Container (grob ein paar hundert MB RAM). Auf eurem Server
  (8 GB, Builds in CI) unkritisch.

## Empfehlung (eine klare Lösung)

**Payload als eigener `cms`-Container (headless), Postgres-Schema `payload`, R2/S3-Uploads, Caddy-
Subdomain `cms.lovedis.de` — Redaktions-UX = Stufe 2 (Admin + Live Preview) mit der bestehenden
Nuxt-Homepage.** Aufwand **M**.

- **Warum:** einfachster Betrieb (ein Container, alles Vorhandene wiederverwendet, ein Backup) **und**
  eine für Kolleg:innen sehr einfache, Storyblok-ähnliche Live-Vorschau — **ohne** teuren React-Rewrite.
- **Haupt-Tradeoff:** Live Preview ist **client-side** (minimal weniger nahtlos als Storyblok/Server-
  Side) und man muss die **Nuxt-Homepage instrumentieren** (Content aus Payload + `useLivePreview`).
  Setzt voraus, dass ihr den **Nuxt-Quellcode kontrolliert**.
- **Pragmatischer Startpunkt:** zuerst **Stufe 1** (Admin-only) live nehmen → Redaktion kann sofort
  editieren → dann **Live Preview (Stufe 2)** nachrüsten. Reduziert Risiko.

### High-Level-Schritte (keine Umsetzung jetzt)
1. Kleine **Payload/Next-App** anlegen (`create-payload-app`, Blank), Postgres-Adapter + Schema
   `payload`, `@payloadcms/storage-s3` auf R2/S3.
2. **CI-Image** bauen/pushen (analog `platform`); `cms`-Service + Caddy-Route + Env ergänzen.
3. **Content-Modell** aus `docs/storyblok-baseline/*` ableiten: `Pages` (Blocks = Storyblok-Bloks),
   `Globals` (Navigation/`site-settings`), `partner`/`event`/… als Collections; **Localization**
   (Locales der Homepage) aktivieren.
4. **Redaktions-Accounts** + Rolle „editor" anlegen (Access-Control).
5. **Content-Migration** (einmalig) via Local API aus der Baseline: Richtext → **Lexical**, Assets →
   **Media/R2**, Multilang → Locales. **Aufwand M.**
6. **Nuxt** auf Payload-API umstellen; für Stufe 2 `useLivePreview` + `livePreview.url` konfigurieren.
7. **Backup-Cron** aktivieren (Finding #31), Restore testen; dann `cms.lovedis.de` produktiv.

### Entscheidungsfragen (die wirklich zählen)
1. **Nuxt behalten** (eigener `cms`-Container, Stufe 1/2) **oder** in die Next-App **konsolidieren**
   (Stufe 3, Rewrite)? → bestimmt Aufwand M vs. L.
2. **Reicht Admin + Live Preview** (Stufe 2) oder braucht die Redaktion **echtes On-Page-Editing**
   (Stufe 3)?
3. **Kontrolliert ihr den Nuxt-Quellcode?** (Nötig, um Live Preview/Content-Anbindung einzubauen.)
4. **Subdomain** fürs CMS: `cms.lovedis.de` (Vorschlag) und wann von `*.nip.io` auf die echte Domain?
5. **Eigene DB oder eigenes Schema** in der bestehenden Postgres? (Empfehlung: gleiches DB-Cluster,
   Schema `payload`.)
6. **Wie viele Locales / Rollen** braucht die Redaktion?

## Quellen (dieser Abschnitt)

- Payload Next-nativ / self-host / MIT (kein Payload Cloud 2026):
  [Payload in 2026](https://gautamkhorana.com/blog/payload-cms-2026/),
  [Pricing 2026](https://dev.to/nayankyada/payload-cms-pricing-2026-the-real-infrastructure-cost-breakdown-172j)
- Live Preview (Vue/Client vs. Server):
  [Client-Side](https://payloadcms.com/docs/live-preview/client),
  [Server-Side](https://payloadcms.com/docs/live-preview/server),
  [`@payloadcms/live-preview-vue`](https://www.npmjs.com/package/@payloadcms/live-preview-vue)
- DB-Adapter Postgres / Blocks / Localization:
  [Database Overview](https://github.com/payloadcms/payload/blob/3.x/docs/database/overview.mdx)
- Media R2/S3: [Storage Adapters](https://payloadcms.com/docs/upload/storage-adapters)
- Intern: `deploy/hetzner/docker-compose.yml`, `Caddyfile`, `.env.example`,
  `docs/reports/2026-08-27-hetzner-security-audit.md` (Finding #31), `docs/storyblok-baseline/`.
