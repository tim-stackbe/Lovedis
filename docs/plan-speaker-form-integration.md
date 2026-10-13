# Plan: Speaker-Anmeldung — Mockup → echte Seite (Integration)

**Status:** Planning doc (no code yet)
**Mockup:** `docs/mockups/lovedis-speaker-form.html` (self-contained HTML + vanilla JS)
**Author scope:** Turn the LOVEDIS "Speaker-Anmeldung" mockup into a real, publicly reachable
page inside this repo, wired to Prisma/Postgres, with a persisted submission + email
notification, following the codebase's existing form/action patterns.

---

## 0. Deployment target & domain — ⚠️ DECISION #1 (decide before any build)

**This is the single most important open question. It does not change the application code, but
it determines *where the form actually lives* and must be settled first.**

### The two Cloudflare accounts (confirmed)

| Account ID | What it is | Relevance |
|---|---|---|
| `e29e8d605f10dc5e6748aa6966033539` | The user's dashboard account — where **this repo's worker deploys**. **Exactly matches** `account_id` in `wrangler.jsonc`. | This is what "the site" the user sees in their dashboard refers to: the **staging platform worker**. |
| `9337dd36…` (referenced in `wrangler.jsonc` comments) | A **separate** account hosting the **public `lovedis.de` homepage** (the Nuxt site). | The real public marketing domain lives here — a **different repo and account**. |

### What building into THIS repo actually gets you

Per the explicit comments in `wrangler.jsonc`, the worker `lovedis-platform-staging` is
**intentionally isolated**:
- Deploys **only** to a `*.workers.dev` subdomain.
- Has **no `route` / no custom domain**.
- **Deliberately does not touch** the live `lovedis.de` zone or its DNS.

**Consequence to state plainly:** if we build the speaker form into this repo and deploy it, it
becomes reachable at the staging **`*.workers.dev`** URL — **not** on the public
**`lovedis.de`** website. That `*.workers.dev` URL is publicly reachable and perfectly fine for a
first real version, internal review, or a hand-out link, but it is **not** the branded public
domain.

### THE primary decision: staging platform vs. live homepage

The user's stated requirement is that **all functions of the form must work on the real public
`lovedis.de` homepage** — not merely on staging. That makes the primary decision:

> **Option 1 — Staging platform (fast):** build in THIS Next.js repo and ship to
> `*.workers.dev` (§1–§11). Fully functional, but the form lives on the staging URL, **not** on
> `lovedis.de`.
>
> **Option 2 — Live homepage (the requirement):** get all functions running on the actual
> `lovedis.de` site. Because a functional form needs a backend (validation, DB storage, R2 image
> upload, email), a static/marketing page cannot do this alone — it requires real backend work on
> or for the homepage. **This path is now fully detailed in §12.**

These are not mutually exclusive: Option 1 can ship first as an internal/preview version while
Option 2 (the real deliverable) is unblocked.

### ⛔ What blocks the live-homepage path (Option 2) today

The live homepage is a **separate Nuxt 3 repo on a separate Cloudflare account (`9337dd36…`)**
that is **NOT in this workspace**. Before any Option-2 work can start, the user must provide:
- **Access to the Nuxt homepage repository** (source needed to add the form/component and/or
  Nitro server routes). Without it the agent cannot implement on the homepage.
- **Confirmation of the homepage account's backend capabilities** (§12): does that Nuxt site
  already have a database? Is R2 enabled on account `9337dd36…`? Is there an email provider? These
  are currently **UNKNOWN** and gate the architecture choice.

### Recommendation framing

- **If speed matters and staging is acceptable for now:** do Option 1 (§1–§11) — everything is
  already actionable in this repo.
- **To satisfy the actual requirement ("all functions on the real homepage"):** Option 2 (§12) —
  **recommended architecture: B** (self-contained in the Nuxt site via Nitro server routes), once
  repo access + backend capabilities are confirmed. See §12 for A/B/C tradeoffs.

### Cloudflare setup — who does what

The agent **cannot** log into the Cloudflare dashboard (Google login is manual). So provisioning
is split:

**User actions (dashboard / manual — only the user can do these):**
- Log into Cloudflare (the `e29e8d605f10dc5e6748aa6966033539` account) as needed.
- **Decide the deployment target** (staging `*.workers.dev` vs. mapping a real domain vs. Nuxt).
- **If (and only if) R2 is chosen for photos:** create the R2 bucket (e.g.
  `lovedis-speaker-uploads`), enable R2 on the account, and make/note its public base URL.
- Provide any **secrets/values** the code needs (e.g. `R2_PUBLIC_BASE`, a team notification
  address `SPEAKER_NOTIFY_EMAIL`, and later an email-provider key) — set via `wrangler secret` or
  the dashboard.
- Run the actual **deploy** (`npm run cf:deploy`) and any DNS/route mapping, if/when desired.

**Agent actions (code / repo — no dashboard access needed):**
- Edit `wrangler.jsonc` to add the R2 binding **once the user confirms R2 + bucket name** (a
  binding referencing a non-existent bucket would fail at deploy, so this waits on the user step).
- Write all application code (route, form, server action, Prisma model, R2 helper behind a
  runtime guard, email calls).
- Update `prisma/schema.prisma` and run `npm run db:push` + `npm run prisma:generate` locally.
- Add env-var placeholders to `.env.example` and reference them in code.

---

## 1. Summary & recommended target

**Recommendation: build it in THIS repo (Next.js App Router) as a new *public* route
`/speaker`, backed by a server action + a new `SpeakerApplication` Prisma model.**

Why this repo and not the public Nuxt `lovedis.de` site:

- **Evidence this repo is the internal Next.js platform, not the marketing site.**
  `README.md` describes "Lovedis — Plattform für Startup-Bewertung & Tech-Scouting" (Next.js 16,
  NextAuth v5, Prisma 7). `design-reference/DESIGN.md` explicitly states the public
  `lovedis.de/de` site is **Nuxt 3 + Tailwind** and is a *separate* codebase.
  `wrangler.jsonc` is even more explicit: it's an **isolated staging worker**
  (`lovedis-platform-staging`, `workers.dev` only) that "INTENTIONALLY [has] no `route`/`routes`
  and no custom domain so it never touches the live lovedis.de zone or its DNS."
- **The mockup is already LOVEDIS-branded with this repo's exact tokens.** The mockup CSS
  variables (`--blue:#2926E5`, `--orange:#FF5736`, `--mint:#C0FCD8`, `--surface:#F4F4F8`, radii
  12/16/24px, Inter font) map 1:1 onto this repo's Tailwind theme in `src/app/globals.css`
  (`--color-lv-blue:#2926e5`, `--color-lv-orange:#ff5736`, `--color-lv-mint:#c0fcd8`,
  `--color-lv-surface:#f4f4f8`, `rounded-card`, `rounded-button`) and the `HeroBanner`
  component (`bg-lv-cover` gradient + orange orb). Re-implementing here is a near-mechanical
  restyle onto existing primitives.
- **All required infra already exists here:** server actions (`src/app/actions/*`), the
  `useActionState` + `ActionState` form pattern, Prisma + Postgres, an email abstraction
  (`src/lib/email.ts`), and a Cloudflare deploy pipeline. The Nuxt site would need a brand-new
  backend endpoint + DB wiring that doesn't exist in that repo (or at least isn't visible here).
- **A public-but-unauthenticated route is a first-class pattern here** — the middleware already
  supports an allowlist (`PUBLIC_PATHS` in `src/middleware.ts`), and standalone public/semi-public
  pages already live outside the `(main)` app shell (`/login`, `/auth/*`, `/pending`, `/odie`).

**One honest caveat — see the prominent §0:** the configured worker
(`account_id e29e8d605f10dc5e6748aa6966033539`) is *staging on `workers.dev`*, intentionally
isolated from the public `lovedis.de` zone (which is a separate Nuxt site on account
`9337dd36…`). So building here makes the form live at the staging **`*.workers.dev`** URL, **not**
on `lovedis.de`. Reaching the real public domain is a **separate deploy/DNS/account decision**
(route mapping) or a port to Nuxt (§12) — the application code below is identical either way.
**This deployment target is decision #1 (§0) and should be confirmed before build.**

---

## 2. Assumptions & open questions

Defaults are chosen so implementation is not blocked; each can be revisited.

| # | Assumption (default) | Alternative / question |
|---|---|---|
| A1 | Route is **`/speaker`**, public, no login, no app shell. | Could be `/events/speaker-2026` or locale-prefixed `/de/speaker`. |
| A2 | Submissions persist to a new **`SpeakerApplication`** table; no admin UI in scope (query via DB / a later `(main)` list page). | Do we need an internal review screen now? (Assumed: later.) |
| A3 | Photo upload approach is **OPEN / deferred by the user** ("later, plan first"). Both options stay documented — R2 (§5) or photo-optional/URL fallback (§5) — with **no default chosen yet**. | Which one? R2 needs a user-provisioned bucket (§0). Decide alongside deployment target. |
| A4 | On submit we send **two emails** via `sendEmail`: a confirmation to the speaker (Du-form) and a notification to a team inbox (`SPEAKER_NOTIFY_EMAIL`). Console adapter in dev = no real send. | Which team address? Do we need HTML mail (currently text-only)? |
| A5 | Sentence limits (bio ≤5, meaning ≤2) are **soft** server-side (warn/allow), **hard** only on character length, matching the mockup's non-blocking counter. | Make them hard limits? (Assumed no.) |
| A6 | German **Du-form** copy, single locale (`lang="de"` in `src/app/layout.tsx`). No i18n routing in this repo. | The Nuxt site uses `/de`; not relevant here. |
| A7 | Basic anti-spam: honeypot field + per-IP soft rate-limit. No captcha initially. | Add Turnstile later if abused. |

---

## 3. Architecture overview

```
Browser (public, no auth)
   │  GET /speaker
   ▼
src/app/speaker/page.tsx  (Server Component: HeroBanner + <SpeakerForm/>)
   │  renders
   ▼
src/components/speaker/SpeakerForm.tsx  ("use client")
   │  useActionState(submitSpeakerApplication, undefined)
   │  <form action={formAction} encType="multipart/form-data">
   ▼
src/app/actions/speaker.ts  ("use server")
   │  1. (spam) honeypot + rate-limit
   │  2. Zod parse FormData  ── invalid ──▶ { error }  (ErrorChip)
   │  3. photo: validate type/size ──▶ upload to R2 (or fallback URL) ──▶ photoUrl
   │  4. prisma.speakerApplication.create({...})
   │  5. sendEmail(confirmation) + sendEmail(team notification)
   │  6. return { success } ─────────────▶ SuccessChip + success card
   ▼
Postgres (Prisma)             Cloudflare R2 (photo bytes)         Email adapter
 SpeakerApplication row        speaker/<id>.<ext>                 (console → real later)
```

Middleware change: add `/speaker` to `PUBLIC_PATHS` so unauthenticated users aren't bounced to
`/login`.

---

## 4. Step-by-step implementation plan

Each step is small, references exact files, and mirrors an existing pattern.

### Step 1 — Make the route public (middleware allowlist)
- **Edit** `src/middleware.ts`: add `"/speaker"` to the `PUBLIC_PATHS` array (next to `/login`,
  `/auth`, `/odie`). `isPublicPath` already matches exact + `/speaker/...` subpaths.
- No change needed to `src/auth.config.ts` (it only powers the JWT check; the allowlist lives in
  middleware). Note: the matcher already excludes static image extensions, so R2/served images
  are unaffected.
- **Why:** the same mechanism that keeps `/odie` reachable "with or without a session."

### Step 2 — Create the page (Server Component, outside `(main)`)
- **Create** `src/app/speaker/page.tsx`. Put it at the app root (a sibling of `pending/`,
  `odie/`), **not** under `(main)/` — the `(main)/layout.tsx` calls `requireApprovedAccess()`
  and would force login + render the internal `AppShell`. A top-level route uses only the root
  `src/app/layout.tsx` (Inter font, `lang="de"`).
- Compose the hero with the existing `HeroBanner` (`src/components/ui/HeroBanner.tsx`):
  `kicker="SPEAKER · LOVEDIS"`, `title="Speaker-Anmeldung"`,
  `subtitle="We Love Disruption – sei als Speaker:in Teil davon."` — this reproduces the mockup
  hero (blue→orange gradient + orange orb) with zero new CSS.
- Add page `metadata` (title `"Speaker-Anmeldung"`) like other pages do.
- Render `<SpeakerForm />` inside a `max-w-[700px]` wrapper (mockup `--content: 700px`).

Illustrative stub:

```tsx
// src/app/speaker/page.tsx
import type { Metadata } from "next";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { SpeakerForm } from "@/components/speaker/SpeakerForm";

export const metadata: Metadata = { title: "Speaker-Anmeldung" };

export default function SpeakerPage() {
  return (
    <main className="mx-auto max-w-[760px] px-4 py-10 sm:py-16">
      <HeroBanner
        kicker="SPEAKER · LOVEDIS"
        title="Speaker-Anmeldung"
        subtitle="We Love Disruption – sei als Speaker:in Teil davon."
      />
      <SpeakerForm />
    </main>
  );
}
```

### Step 3 — Build the client form component
- **Create** `src/components/speaker/SpeakerForm.tsx` (`"use client"`), mirroring
  `src/components/challenges/ApplyForm.tsx` and `src/components/ssot/MediaAssetForm.tsx`:
  - `const [state, formAction, pending] = useActionState(submitSpeakerApplication, undefined);`
  - `<form action={formAction} encType="multipart/form-data" className="...">`
  - Use `Field` + `Input` + `Textarea` from `src/components/ui/Field.tsx` for every text field
    (`vorname`, `nachname`, `jobtitel`, `organisation`, `email`, `handy`, `bio`, `meaning`),
    keeping the mockup's two-column rows via `grid gap-4 sm:grid-cols-2` (as `MediaAssetForm`
    does).
  - File input: reuse the mockup's UX (hidden `<input type="file" accept="image/*">` + a
    styled "Datei auswählen" button + filename + thumbnail preview via `FileReader`). This is
    client-only sugar; the actual `File` rides in the `FormData`.
  - Sentence counters for `bio` (max 5) and `meaning` (max 2): port the mockup's `countSentences`
    into a tiny local helper for the live counter (display-only).
  - Consent checkbox (`consent`, required) + optional `template` checkbox — plain inputs, same as
    the `isPublished === "on"` convention already used in `ssot.ts`.
  - Honeypot: a visually-hidden `<input name="company_website">` (see §9).
  - Errors/success: `{state?.error && <ErrorChip>{state.error}</ErrorChip>}` and
    `{state?.success && <SuccessChip>{state.success}</SuccessChip>}` — exactly as `ApplyForm`.
  - Submit: `<Button type="submit" disabled={pending}>{pending ? "Wird gesendet…" : "Informationen abschicken"}</Button>`.
- **Success UI:** when `state?.success`, swap the form for the mint success card (mockup
  `.success`), reproduced with `bg-lv-mint rounded-card p-...` and a `<dl>` summary. Because the
  server action returns only `{ success }` (not the echoed data), the simplest match is to keep a
  local snapshot of the submitted values in component state right before submit and render the
  summary from that, OR keep it simple: show a generic "Vielen Dank!" success card (the persisted
  data + confirmation email already capture the details). **Default: generic success card**
  (less state juggling); echoing the summary is a nice-to-have.

Signature the component targets:

```ts
// src/app/actions/speaker.ts
export async function submitSpeakerApplication(
  _prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState>;
```

### Step 4 — Server action with validation + persistence
- **Create** `src/app/actions/speaker.ts` (`"use server"`), mirroring the structure of
  `src/app/actions/challenges.ts` / `ssot.ts`:
  - Import `{ firstZodError, type ActionState }` from `@/lib/action-state`, `{ prisma }`,
    `{ sendEmail }`, and (later) the R2 helper.
  - **No `requireAuth`/`requireRole`** here (this is the one public write action) — instead lean
    on Zod + spam guards. This is a deliberate, documented deviation from "every action re-checks
    auth" because the form is intentionally public.
  - Zod schema (see §7) + `safeParse`; on failure `return { error: firstZodError(parsed.error) }`.
  - Handle the photo (§5) → `photoUrl` (or `null` in fallback mode).
  - `await prisma.speakerApplication.create({ data: {...} })`.
  - `await sendEmail(...)` for confirmation + team notification (§Step 6). Wrap sends in
    try/catch so a mail failure never fails the submission.
  - `return { success: "Vielen Dank! Deine Anmeldung ist eingegangen." }`.
- No `revalidatePath` needed unless we add an internal list page (then revalidate `/speaker-admin`
  or similar).

### Step 5 — Prisma model + push
- **Edit** `prisma/schema.prisma`: add the `SpeakerApplication` model (see §6) at the end,
  following the file's conventions (`cuid()` id, `createdAt/updatedAt`, `@@index`).
- **Apply the schema.** This repo has **no `prisma/migrations/` folder** — the workflow is
  `prisma db push` (`package.json` → `"db:push": "prisma db push"`), with `prisma.config.ts`
  pointing at `prisma/schema.prisma` and `DATABASE_URL`. So:
  - Local: `npm run db:push` (updates the dev DB) then `npm run prisma:generate` (regenerates the
    client into `src/generated/prisma`, which is gitignored — `npm run build` also runs
    `prisma generate`).
  - Prod/preview (Neon): run `prisma db push` against the Neon `DATABASE_URL` as part of release,
    consistent with how the current schema is deployed (no migration files are committed).

### Step 6 — Email notification
- Use the existing `sendEmail` from `src/lib/email.ts` (console adapter today; swappable via
  `getEmailAdapter`). Two messages:
  - **To the speaker** (`data.email`): Du-form confirmation ("Danke, {vorname}! Wir haben deine
    Speaker-Anmeldung erhalten…").
  - **To the team** (`process.env.SPEAKER_NOTIFY_EMAIL`): summary of the submission + link to the
    photo.
- Text-only bodies (the adapter's `EmailMessage` is `{to, subject, text}`). HTML is explicitly a
  "later concern" per the file's own comment — don't gold-plate.
- To actually deliver in prod, wire a provider in `getEmailAdapter()` (the file already sketches
  `if (process.env.RESEND_API_KEY) return resendAdapter;`) — out of scope but noted.

### Step 7 — Wire tests (see §8) and lint
- Add a unit test for the schema/action and (optionally) an integration test that hits a real
  local `_test` DB. Run `npm run test` (Vitest) and `npm run lint`.

---

## 5. File upload deep-dive (the risky part) — ⚠️ DECISION #2 (OPEN / deferred)

> **The photo-upload approach is deliberately deferred by the user ("later, plan first").**
> Both options below are documented as viable; **neither is chosen as the default yet.** The
> choice is coupled to §0 (R2 requires a user-provisioned bucket on the Cloudflare account).

**Finding: there is no blob/object storage configured in this repo today.**
- `wrangler.jsonc` declares only an `ASSETS` binding (OpenNext's static assets, read-only) — **no
  `r2_buckets`, no KV, no D1**.
- `MediaAsset` (`prisma/schema.prisma`) and `createMediaAsset` (`src/app/actions/ssot.ts`) store a
  **URL string only** (`z.url(...)`), never a file. `MediaAssetForm.tsx` collects a URL, not an
  upload.
- `public/mentors/*.jpg|avif|png` are **committed static files**, not user uploads.
- The Worker runtime has **no local disk** and OpenNext runs on `workerd`; you cannot write to the
  filesystem, and large request bodies are constrained.

So the photo upload genuinely needs a decision. Two viable paths (choice OPEN — see the note
above):

### Option A — Cloudflare R2 bucket binding
1. **User step (dashboard, see §0):** provision an R2 bucket (e.g. `lovedis-speaker-uploads`) on
   the Cloudflare account `e29e8d605f10dc5e6748aa6966033539` and note its public base URL. The
   agent cannot do this (manual Google login).
2. **Agent step — edit `wrangler.jsonc`** to add the binding (only *after* the user confirms the
   bucket exists; a binding to a missing bucket fails at deploy):
   ```jsonc
   "r2_buckets": [
     { "binding": "SPEAKER_UPLOADS", "bucket_name": "lovedis-speaker-uploads" }
   ]
   ```
3. Access it inside the server action via OpenNext's Cloudflare context:
   ```ts
   import { getCloudflareContext } from "@opennextjs/cloudflare";
   // ...
   const { env } = getCloudflareContext();
   const key = `speaker/${id}.${ext}`;
   await env.SPEAKER_UPLOADS.put(key, await file.arrayBuffer(), {
     httpMetadata: { contentType: file.type },
   });
   const photoUrl = `${process.env.R2_PUBLIC_BASE}/${key}`; // public bucket / CDN base
   ```
   (Add a `worker-configuration.d.ts` / typed `env` for the binding; `@opennextjs/cloudflare` is
   already a dependency.) For local `npm run dev` (plain Node, not workerd),
   `getCloudflareContext` isn't available — guard with the same `navigator.userAgent ===
   "Cloudflare-Workers"` check used in `src/lib/prisma.ts`, and in dev write to
   `public/uploads/` or just use the fallback.
4. Enforce limits **before** upload: `file.type` starts with `image/`, size ≤ ~5 MB (Workers body
   limits + DB hygiene), allowed extensions jpg/png/webp.

**Body-size note:** Next.js server actions cap `FormData` body size (default 1 MB). Set
`serverActions: { bodySizeLimit: "6mb" }` in `next.config` for the photo, and keep the client
`accept="image/*"` + a client-side size check for good UX.

### Option B — photo optional / URL (no new infra)
- Make `photoUrl` **optional** in the schema and either
  (a) accept a pasted image URL (identical to the `MediaAsset` pattern — zero new infra), or
  (b) accept the file but only in dev, and defer real storage.
- This keeps the whole flow (validation, persistence, email, success UI) shippable **with no
  Cloudflare/R2 dependency at all**. The client photo field stays `required` visually; server
  treats it as optional. Useful if the user wants to ship before deciding on storage — but the
  choice between A and B is **left open** per the deferral above.

Alternative considered & rejected for now: **store bytes in Postgres** (`Bytes` column /
base64). Works without extra infra but bloats the DB, strains the Neon serverless driver on
Workers, and is awkward to serve back — only worth it if R2 is truly off the table.

---

## 6. Data model (proposed schema block)

Add to `prisma/schema.prisma`:

```prisma
// ---------------------------------------------------------------------------
// Speaker-Anmeldung (public speaker registration form → /speaker)
// Publicly writable via src/app/actions/speaker.ts (the one unauthenticated
// write action). No relations; a flat capture of the form submission.
// ---------------------------------------------------------------------------
model SpeakerApplication {
  id               String   @id @default(cuid())
  firstName        String   // Vorname
  lastName         String   // Nachname
  jobTitle         String   // Jobtitel
  organisation     String   // Organisation
  email            String   // E-Mail-Adresse
  phone            String   // Handynummer
  bio              String   // Kurzbiographie (≤ ~5 Sätze, soft)
  meaningOfLovedis String   // "Was bedeutet LOVEDIS für dich?" (≤ ~2 Sätze, soft)
  photoUrl         String?  // R2 object URL (nullable during URL/optional fallback)
  consent          Boolean  @default(false) // Datennutzung — required true at submit
  wantsSocialTemplate Boolean @default(false) // "Vorlage für soziale Medien"
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  @@index([email])
  @@index([createdAt])
}
```

Field mapping (mockup `name` → column): `vorname→firstName`, `nachname→lastName`,
`jobtitel→jobTitle`, `organisation→organisation`, `email→email`, `handy→phone`, `bio→bio`,
`meaning→meaningOfLovedis`, `foto→photoUrl`, `consent→consent`, `template→wantsSocialTemplate`.

---

## 7. Validation matrix (field → client rule → server rule)

Server rules use Zod (mirror `challenges.ts` / `auth.ts`); messages are German Du-form and flow
through `firstZodError`.

| Field | Client (mockup) | Server (Zod) |
|---|---|---|
| `vorname` | required, non-empty | `z.string().trim().min(1, "Bitte gib deinen Vornamen ein.").max(80)` |
| `nachname` | required, non-empty | `z.string().trim().min(1, "Bitte gib deinen Nachnamen ein.").max(80)` |
| `jobtitel` | required | `z.string().trim().min(1, "Bitte gib deinen Jobtitel ein.").max(120)` |
| `organisation` | required | `z.string().trim().min(1, "Bitte gib deine Organisation ein.").max(160)` |
| `email` | required + regex `^[^\s@]+@[^\s@]+\.[^\s@]{2,}$` | `z.email("Bitte gib eine gültige E-Mail-Adresse ein.")` (transform `toLowerCase`) |
| `handy` | required + `^\+?[0-9]{6,15}$` after stripping ` -().` | `z.string().trim().min(1).transform(strip).refine(/^\+?[0-9]{6,15}$/, "Bitte gib eine gültige Handynummer ein.")` |
| `bio` | required; **soft** ≤5 sentences (counter only) | `z.string().trim().min(1, "Bitte füge eine kurze Biographie hinzu.").max(1500)` (length hard, sentence count soft/ignored) |
| `meaning` | required; **soft** ≤2 sentences | `z.string().trim().min(1, "Bitte beantworte diese Frage.").max(600)` |
| `foto` | required; `type` starts `image/` | R2 mode: `File`, `type.startsWith("image/")`, `size ≤ 5MB`, ext in {jpg,jpeg,png,webp}, else `"Bitte lade eine Bilddatei hoch (JPG, PNG oder WebP, max. 5 MB)."` · Fallback: optional |
| `consent` | required checked | `z.literal("on", { message: "Bitte stimme der Nutzung deiner Daten zu." })` (or `=== "on"`) |
| `template` | optional | `z.boolean()` via `formData.get("template") === "on"` (like `isPublished` in `ssot.ts`) |
| `company_website` (honeypot) | — (hidden) | must be empty; else silently drop as spam |

Sentence limits stay **soft** on the server (per A5): we don't reject; we cap raw length only.

---

## 8. Testing plan (Vitest)

Setup already exists: `vitest.config.ts` (`@` alias, node env, `tests/**/*.test.ts`,
`fileParallelism:false`, `DATABASE_URL` → local `_test` DB), unit tests mock Prisma/auth-guards
(`tests/unit/validation.test.ts`), integration tests hit a real local DB via
`tests/helpers/db.ts` (`resetDb`, `createUser`) — see `tests/integration/onboarding-credits.test.ts`.

**Unit — `tests/unit/speaker.test.ts`** (mirror `validation.test.ts`):
- Mock `next/cache`, `@/lib/prisma`, `@/lib/email`, and (if used) the R2 helper.
- Build a `FormData` and call `submitSpeakerApplication(undefined, fd)`.
- Assert: missing required field → `{ error }` with the exact German message; bad email/phone →
  correct message; honeypot filled → treated as spam (no `prisma.create`); happy path →
  `prisma.speakerApplication.create` called with mapped fields + `sendEmail` invoked +
  `{ success }` returned. Also a direct `firstZodError` test like the existing suite.

**Integration — `tests/integration/speaker-application.test.ts`** (mirror
`onboarding-credits.test.ts`):
- `beforeEach(resetDb)`, `afterAll(prisma.$disconnect)`.
- Submit a valid `FormData` (photo mocked / URL fallback so no R2 needed) and assert a
  `SpeakerApplication` row exists with the expected values and `consent === true`.
- Assert a duplicate-safe / spam case doesn't write.
- Keep email as the console adapter (default) or spy on `sendEmail`.

Run: `npm run test`. Ensure the local DB is up (`npm run db:start`) for the integration file.

---

## 9. Accessibility, i18n, spam / rate-limit / consent-GDPR

**Accessibility**
- Every `Field` renders a `<label htmlFor>` bound to the input `id` (built into
  `src/components/ui/Field.tsx`) — keep ids matching (`for`/`id`) as in the mockup.
- File input: keep it a real focusable `<input type="file">`; the "Datei auswählen" button should
  `aria-controls` it or simply trigger `.click()` while the input stays keyboard-reachable.
- Errors: render `ErrorChip` with `role="alert"` (add to the component or wrap) so screen readers
  announce server errors; associate field-level messages via `aria-describedby` where feasible.
- Consent checkbox must be reachable and its label clickable (native `<label>` wrapping, like the
  mockup).
- Focus management: on error, keep the mockup's behavior of focusing the first invalid field
  (client enhancement) but ensure it degrades gracefully (server-rendered error is enough).

**i18n / copy / tone**
- German **Du-form**, gender-inclusive ("Speaker:in"), matching `DESIGN.md` §7 and the mockup.
- Single locale: root layout is `lang="de"` (`src/app/layout.tsx`); this repo has **no locale
  routing** (the `/de` prefix belongs to the Nuxt site). Keep copy inline; no i18n framework
  needed.

**Spam / rate-limit**
- **Honeypot** hidden field (`company_website`) — reject silently if filled (cheapest, effective).
- **Soft rate-limit** by IP: read `x-forwarded-for` in the action (available on Workers) and
  throttle (e.g. Cloudflare KV counter or a small in-memory/DB check). If out of scope for v1,
  document as a fast-follow; honeypot alone covers most bot noise.
- Optional later: Cloudflare **Turnstile** (fits the CF platform) if abuse appears.

**Consent / GDPR**
- `consent` is **required = true** to submit and stored as a boolean (auditable) alongside
  `createdAt`. Consider also storing `consentTextVersion` if the consent wording will change.
- The mockup already links "Datenschutzbestimmungen" — replace the `#` placeholder with the real
  privacy URL.
- Phone-number purpose is stated inline (event-only) — keep that hint text.
- Data minimization: we store only what the form asks. Add a retention note (e.g. purge after the
  2026 event) to the privacy policy; not a code task.

---

## 10. Rollout / deploy (OpenNext / wrangler) & env vars

**Build/deploy pipeline (already defined in `package.json`):**
- `npm run cf:build` → `prisma generate && opennextjs-cloudflare build`
- `npm run cf:preview` → local Workers preview
- `npm run cf:deploy` → `opennextjs-cloudflare build && opennextjs-cloudflare deploy`
- `wrangler.jsonc` targets the isolated **staging** worker (`workers.dev`, no custom domain).

**Deploy target reminder (see §0):** `wrangler.jsonc` points at the isolated staging worker on
account `e29e8d605f10dc5e6748aa6966033539` and serves only `*.workers.dev` — **not** the public
`lovedis.de` domain (separate Nuxt site on account `9337dd36…`). Deploying here does **not** put
the form on the public website; that's a separate route/DNS decision (or the Nuxt port, §12).

**Rollout steps:**
1. Merge schema + code. Run `prisma db push` against each target DB (dev, then Neon
   preview/prod) — no migration files are committed in this repo, so `db push` is the mechanism.
2. **Photo storage (DECISION #2, §5 — currently OPEN):** if R2 is chosen, the **user** creates
   the bucket + sets `R2_PUBLIC_BASE` (§0), then the **agent** adds the `r2_buckets` binding to
   `wrangler.jsonc`; if the URL/optional option is chosen, no Cloudflare step is needed.
3. **User runs** `npm run cf:deploy`. Verify `/speaker` loads unauthenticated (middleware
   allowlist) and a test submission persists + logs the console email.
4. **Public-URL decision (DECISION #1, §0):** the staging worker URL is `*.workers.dev`. For a
   branded `lovedis.de` address, either attach a route/custom domain to a dedicated (non-staging)
   worker — explicitly avoided by the current `wrangler.jsonc` — or port to Nuxt (§12). Confirm
   with the owner before pointing any lovedis.de DNS.

**Env vars needed:**

| Var | Purpose | Where |
|---|---|---|
| `DATABASE_URL` | Postgres/Neon (already used) | existing |
| `SPEAKER_NOTIFY_EMAIL` | team inbox for notifications | new |
| `R2_PUBLIC_BASE` | public base URL for R2 objects (R2 mode) | new (R2 only) |
| `RESEND_API_KEY` (or provider) | real email delivery (optional) | new (optional) |
| `SPEAKER_UPLOADS` (binding) | R2 bucket binding in `wrangler.jsonc` | new (R2 only) |

Local dev: add `SPEAKER_NOTIFY_EMAIL` to `.env` (and document in `.env.example`); email uses the
console adapter, so no secret required to test end-to-end.

---

## 11. Effort estimate & risks

| Step | Effort | Risk |
|---|---|---|
| 1. Middleware allowlist | 5 min | Trivial. |
| 2. Page + HeroBanner | ~0.5 h | Low — reuses existing component. |
| 3. Client form component | ~2–3 h | Low/med — most work is porting fields, counters, file-preview UX to `Field`/`Button`. |
| 4. Server action + Zod | ~1.5 h | Low — direct analog of `challenges.ts`. |
| 5. Prisma model + `db push` | ~0.5 h | Low — but remember client regen + Neon push in prod. |
| 6. Email (2 messages) | ~0.5 h | Low — console adapter today; **real delivery is a separate task** (provider wiring). |
| 7. Photo upload — **OPEN (§5)** | Option A (R2) ~2–4 h · Option B (URL/optional) ~15 min | **Highest.** Option A = new infra (user-provisioned bucket + binding, `getCloudflareContext`, body-size limit, dev vs workerd branch). Option B = no Cloudflare dependency. **Choice deferred.** |
| 8. Tests (unit + integration) | ~1.5 h | Low — templates exist. |
| 9. A11y/spam polish | ~1 h | Low. |
| **Total (Option A / R2)** | **~1.5 days** | requires user R2 setup (§0) |
| **Total (Option B / URL-optional)** | **~1 day** | ships with no upload infra |

**Top risks & mitigations**
- **Deployment target (DECISION #1, §0)** → building here ships to staging `*.workers.dev`, not
  `lovedis.de`. Confirm the intended public home before build; reaching the real domain is a
  separate route/DNS/account step or the Nuxt port (§12).
- **Photo upload (DECISION #2, §5 — OPEN)** on Workers (no disk, body limits, dev≠prod runtime) →
  choice deferred; Option A (R2) needs user-provisioned infra + the `navigator.userAgent` runtime
  guard used in `src/lib/prisma.ts`, Option B (URL/optional) avoids it entirely.
- **Server-action body size** default 1 MB rejects photos (Option A only) → raise `bodySizeLimit`
  and cap client-side.
- **Public write action** (no auth) → honeypot + rate-limit + strict Zod; document the deliberate
  omission of `requireAuth`.
- **Email deliverability** → console adapter is a no-op; wire a real provider before relying on
  confirmations.

---

## 12. Getting ALL functions working on the live `lovedis.de` homepage (Option 2 — the requirement)

**Goal (user's explicit requirement):** every function of the form must work on the *real* public
homepage `lovedis.de`, not just on staging — i.e. client-side field validation, required
enforcement, email/phone format checks, sentence-limit counters, **photo upload with preview +
real storage**, required-consent gating, and submit → **store submission** → **confirmation
email** → success card.

**Why this needs real backend work (not just a page):** a functional form cannot run on a static
marketing page alone. Persisting a submission, storing an uploaded image, and sending email all
require a server: an HTTP endpoint + a datastore + object storage (R2) + an email sender. So every
architecture below adds a backend somewhere.

### 12.0 Hard prerequisites (blockers) — what the USER must provide first

The live homepage is a **separate Nuxt 3 repo on a separate Cloudflare account (`9337dd36…`)** and
is **NOT in this workspace**. None of the Option-2 work can begin until the user provides:

1. **Access to the Nuxt homepage repository** — clone/URL/permission. The agent has never seen it,
   so everything about its stack below the "it's Nuxt 3 + Tailwind" fact (from `DESIGN.md`) is
   **UNKNOWN**: does it already have a database? an ORM? an email provider? existing
   `server/api/*` routes? deployment target (Cloudflare Pages vs. Workers/Nitro preset)?
2. **Backend capabilities on account `9337dd36…`:** is **R2 enabled**? Is there an existing
   **database** (and its type/driver)? Is there an **email provider / API key**? These determine
   which architecture is even possible and must be confirmed (dashboard actions are the user's to
   perform — the agent cannot log into Cloudflare).
3. **Secrets/bindings** for whichever storage/email is chosen (R2 bucket name + public base URL,
   DB connection string, email API key), set via `wrangler secret` / the Nuxt project's env.

Until (1) and (2) are answered, §12 is a **plan, not an executable task**.

---

### Architecture A — Form on the Nuxt homepage + a backend endpoint

Put the form UI on `lovedis.de` and POST to a backend endpoint. Two sub-variants for the backend.

**Frontend (both variants):**
- Rebuild the mockup as a Vue SFC/component (e.g. `pages/speaker.vue` or a section component)
  using the homepage's own Tailwind tokens (`DESIGN.md` `ups-*`: `ups-orange #FF5736`, `ups-pink`,
  `ups-light-green`, radii `rounded-sm/md/lg`, Greed Standard font). The mockup's vanilla-JS
  validation, sentence counters, file preview (`FileReader`) and success-card flow port almost
  verbatim into `<script setup>` — the branding already matches the homepage.
- Client behaviors (validation, required, email/phone regex, counters, consent gating, preview)
  are pure front-end and work regardless of backend choice.

**Variant A1 — Standalone backend on the homepage account (`9337dd36…`):**
- A Cloudflare Worker (or the Nuxt site's own Nitro server route, which overlaps with Architecture
  B) exposes `POST /api/speaker`.
- **Storage of submissions:** a datastore on account `9337dd36…` — options: **D1** (SQLite, native
  to Workers, simplest for a single form), **KV** (only if we just need fire-and-forget records),
  or an external Postgres. Recommendation: **D1** for a self-contained form unless the homepage
  already has a DB.
- **Photo upload:** **R2 bucket on account `9337dd36…`** (`env.SPEAKER_UPLOADS.put(...)`), public
  base URL stored with the record.
- **Email:** an email provider callable from the Worker (Resend/Postmark/SES/MailChannels) →
  confirmation to speaker + notification to team.
- Same-origin (form and endpoint both under `lovedis.de`) ⇒ **no CORS** concerns.

**Variant A2 — Reuse THIS Next.js app as the backend (cross-origin, spans two accounts):**
- The homepage form POSTs cross-origin to the platform worker's public action/endpoint on account
  `e29e8d605f10dc5e6748aa6966033539` (e.g. a dedicated `POST /api/speaker` API route added
  alongside the existing `/api/health`, since browser cross-origin POSTs to a Server Action are
  awkward — expose a plain route handler instead).
- **CORS:** the platform worker must send `Access-Control-Allow-Origin: https://lovedis.de` (+
  handle preflight `OPTIONS`, allowed headers/methods). Multipart photo upload is a "non-simple"
  request ⇒ preflight required.
- **Public access:** the endpoint is unauthenticated (add its path to `PUBLIC_PATHS` in
  `src/middleware.ts`, like `/speaker`). Harden with honeypot + rate-limit + strict Zod + an
  `Origin` allowlist check.
- **Storage/photo/email:** reuse this repo's Prisma `SpeakerApplication` + Postgres, R2 on the
  platform account, and `sendEmail` — i.e. everything from §4–§6 already planned here.
- **Downside:** data now lives on the *platform* account/DB, not the homepage account; the feature
  **spans two Cloudflare accounts** (operational + ownership ambiguity), and CORS/preflight adds
  fragility. The photo is stored on the platform account's R2, not the homepage's.

**Work items (A):**
- *Agent (needs homepage repo access):* build the Vue component; (A1) write the Worker/Nitro
  endpoint + D1 schema + R2 put + email; (A2) add a CORS-enabled `POST /api/speaker` route + CORS
  middleware in THIS repo, plus the Prisma model/action from §4–§6.
- *User:* grant repo access; (A1) enable R2 + create bucket + create D1 DB + email key on
  `9337dd36…`; (A2) accept cross-account data flow, provide the homepage's deploy access, set the
  `Origin`/secret values.

**Effort:** A1 ≈ **2–4 days** (new backend on an unknown repo). A2 ≈ **1–2 days** of new work on
top of §1–§11 (mostly the CORS route + wiring the homepage form), but with the cross-account
tradeoff.

**Pros/Cons:**
- A1 — Pro: self-contained on the homepage account, same-origin (no CORS), clean ownership. Con:
  most new backend code; depends on unknown homepage stack.
- A2 — Pro: reuses this repo's fully-planned backend (fastest to *functional*). Con: two accounts,
  CORS/preflight, data lives off the homepage account; weakest "truly on the homepage" story for
  the data layer.

---

### Architecture B — Rebuild fully inside the Nuxt site (Nitro `server/api/*`) — RECOMMENDED

Everything self-contained on the homepage account `9337dd36…`: the Vue form **and** its backend
live in the Nuxt repo.

- **Frontend:** the same Vue component as Architecture A (port of the mockup).
- **Backend:** a **Nitro server route** `server/api/speaker.post.ts` that:
  - parses the multipart form (`readMultipartFormData` / `readBody`),
  - **validates with Zod** — mirror the §7 validation matrix (required, email, phone regex,
    length caps; sentence limits soft) so client and server rules match,
  - **stores the submission** in the homepage's datastore — **UNKNOWN whether the Nuxt site has a
    DB; needs repo access to confirm.** If none exists, provision **Cloudflare D1** (simplest,
    native) or reuse an existing DB. Store consent boolean + timestamp for GDPR.
  - **uploads the photo to an R2 bucket on account `9337dd36…`** (Nitro binding, `event.context`
    / `hubBlob` if using NuxtHub, or a raw R2 binding), storing the resulting URL,
  - **sends email** (confirmation + team notification) via a provider available to the site,
  - returns JSON → the Vue component shows the success card.
- Same-origin ⇒ **no CORS**. Spam/GDPR handled exactly as §9 (honeypot, rate-limit, consent
  stored, privacy link).

**Work items (B):**
- *Agent (needs homepage repo access):* Vue component; `server/api/speaker.post.ts` (Zod +
  storage + R2 + email); DB schema/migration for the chosen store; env/binding wiring in the Nuxt
  project's `nuxt.config`/`wrangler`.
- *User:* grant repo access; confirm/enable on `9337dd36…`: a database (or approve D1), R2 bucket,
  email provider + key; set secrets; deploy.

**Effort:** ≈ **2–4 days**, dominated by unknowns in the homepage stack (DB presence, deploy
preset, R2/email availability). Drops toward the low end if the Nuxt site already has a DB + email.

**Pros/Cons:** Pro — the cleanest "all functions truly on the real homepage" outcome; single
account, single origin, no cross-account data flow, owned by the homepage. Con — most dependent on
homepage repo access + capabilities (all currently UNKNOWN); duplicates logic that also exists in
this repo.

**→ Recommended** as the way to genuinely satisfy "all functions on the real homepage," *provided*
the user grants repo access and the homepage account supports DB + R2 + email.

---

### Architecture C — Keep the functional form on THIS Next.js app, surface it on `lovedis.de` (brief)

Build the fully-functional form exactly as §1–§11 (staging platform), then make it *appear* on the
homepage via one of:
- **Link/CTA** from `lovedis.de` to the platform URL (or a friendly custom subdomain like
  `speaker.lovedis.de` mapped to the platform worker — a DNS/route action on the homepage zone),
- or **embed via `<iframe>`** on a homepage page.

**Work items (C):** *Agent:* §1–§11 as-is (optionally style for embedding). *User:* add the link,
or map a subdomain (DNS on the `lovedis.de` zone → the platform worker/account), or add the iframe
to the Nuxt site.

**Effort:** ≈ **§1–§11 effort + ~0.5 day** for subdomain/iframe wiring.

**Pros/Cons:** Pro — least new work; reuses everything already planned; no homepage repo access
needed if just linking. Con — it is **not truly "on the homepage"**: a subdomain/iframe still
points at the platform app/account; iframes bring styling/UX, cookie/`SameSite`, CSP
(`frame-ancestors`), and accessibility caveats. Good as an interim bridge, weak as the final
answer to the stated requirement.

---

### 12.x Recommendation

- **To satisfy the requirement cleanly: Architecture B** (self-contained Nitro backend on the
  homepage account) — *once repo access + DB/R2/email capabilities are confirmed*.
- **If those are slow to obtain but the requirement is firm: Architecture A2** gets all functions
  working on the homepage *frontend* fastest by reusing this repo's backend (accepting CORS +
  cross-account data).
- **Architecture C** is the pragmatic bridge (ship §1–§11 now, link/subdomain from the homepage)
  while B is unblocked — but flag clearly that it isn't literally on-homepage.

All three still reuse the §7 validation matrix, §9 spam/GDPR guidance, and §5 R2/upload thinking;
only the *host* of the backend changes.

---

## Appendix — key files touched/created

**Create**
- `src/app/speaker/page.tsx`
- `src/components/speaker/SpeakerForm.tsx`
- `src/app/actions/speaker.ts`
- `src/lib/r2.ts` (R2 mode only — thin `putSpeakerPhoto` helper)
- `tests/unit/speaker.test.ts`, `tests/integration/speaker-application.test.ts`

**Edit**
- `src/middleware.ts` (add `/speaker` to `PUBLIC_PATHS`)
- `prisma/schema.prisma` (add `SpeakerApplication`)
- `wrangler.jsonc` (R2 binding — R2 mode only)
- `next.config.*` (`serverActions.bodySizeLimit` for photo)
- `.env.example` (`SPEAKER_NOTIFY_EMAIL`, `R2_PUBLIC_BASE`)
- `src/lib/email.ts` (optional: wire a real provider in `getEmailAdapter`)

**Mirror (patterns to follow, unchanged)**
- Form: `src/components/challenges/ApplyForm.tsx`, `src/components/ssot/MediaAssetForm.tsx`
- Action: `src/app/actions/challenges.ts`, `src/app/actions/ssot.ts`, `src/lib/action-state.ts`
- UI: `src/components/ui/{Field,Button,HeroBanner}.tsx`, tokens in `src/app/globals.css`
- Public route: `src/middleware.ts`, `src/app/pending/page.tsx`, `src/app/odie/page.tsx`
- Tests: `tests/unit/validation.test.ts`, `tests/integration/onboarding-credits.test.ts`,
  `tests/helpers/db.ts`

---

## ✅ Awaiting your OK on

Before any code/infra work begins, please confirm:

- [ ] **(a) PRIMARY — staging platform vs. live homepage (§0):**
  - **Option 1 — Staging (fast):** ship the fully-functional form to the platform's
    `*.workers.dev` URL on account `e29e8d605f10dc5e6748aa6966033539` (§1–§11). *Not* on
    `lovedis.de`.
  - **Option 2 — Live homepage (your stated requirement):** get all functions running on the real
    `lovedis.de` site (§12). **Recommended architecture: B** (self-contained Nitro backend on the
    homepage account).
- [ ] **(b) BLOCKER for Option 2 (§12.0):** grant **access to the Nuxt homepage repo** (account
  `9337dd36…`, not in this workspace) **and** confirm that account's backend capabilities —
  **does the homepage have a database? Is R2 enabled? Is there an email provider?** (Currently
  **UNKNOWN**; Option 2 cannot start without these.)
- [ ] **(c) Photo-upload approach (§5, OPEN):** Cloudflare R2 (you create the bucket; agent wires
  the binding + code) **or** photo-optional / image URL (no object storage). On Option 2 this R2
  lives on the homepage account `9337dd36…`.

The staging plan (§1–§11) is ready to implement as soon as (a)=Option 1 and (c) are settled. The
live-homepage plan (§12) is fully specified but **blocked on (b)** — repo access + confirmed
DB/R2/email on account `9337dd36…`.