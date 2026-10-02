# Lovedis — Hetzner TEST Server Functional / QA Test Report

- **Date / time:** 2026-08-27, ~10:22–10:40 UTC (12:22–12:40 CEST)
- **Tester:** Automated functional/QA agent (read code + live HTTPS + read-only DB inspection)
- **Scope:** Full end-to-end functional test of all user-facing platform functions. Security audit handled separately (`docs/reports/2026-08-27-hetzner-security-audit.md`).
- **Environment (TEST only — Neon/production/Dedalus untouched):**
  - Platform: `https://app.49.13.222.76.nip.io`
  - Homepage: `https://home.49.13.222.76.nip.io`
  - Host: Hetzner `deploy@49.13.222.76` (`lovedis-prod`), Docker Compose stack
- **Commit under test:** `d8c2df2` (`feat/hetzner-deploy` HEAD; merged into Dedalus as `a7332d3`)
  - Verified: SHA-256 of deployed `/opt/lovedis/platform/src/{app/actions/auth.ts, middleware.ts, app/actions/companies.ts, lib/password-reset.ts}` is **byte-identical** to local `HEAD d8c2df2`. Behavioral confirmation: self-service reset feature live, legacy invite route removed (404).
- **Ground rules honored:** No code edits, no deploy/rebuild, no push. Throwaway test users/tokens created in the TEST DB and **fully cleaned up**. Real users' passwords never modified. Real emails sent only to `tim.meggert+…@lovedis.de` (plus-addressing). No secrets/raw tokens/hashes printed.

---

## Result summary — PASS/FAIL per functional area

| # | Functional area | Result | Evidence (summary) |
|---|-----------------|--------|--------------------|
| 1 | Infrastructure / health | **PASS** | `/api/health` 200 `{status:ok, database:up}`; all 4 containers `Up … (healthy)`; homepage 302→`/de`→200; platform 200/redirects; valid Let's Encrypt TLS. |
| 2 | Auth & session | **PASS** (1 minor defect noted) | All 5 roles login → single-hop role home; unauth protected → 307 `/login?callbackUrl`; bad/nonexistent creds rejected (no session, no enumeration); logout clears session. Defect D-1: `/api/session-clear` redirect points at internal origin. |
| 3 | Registration | **PASS** | Self-signup partner → pending (`approvedAt` null) → `/pending`; self-signup startup → approved → `/dashboard/startup`; admin `createUser` → approved user; confirmation emails delivered via Resend. |
| 4 | Partner invite + first-login change | **PASS** | Invitee = `BUSINESS_PARTNER` + `companyRole MEMBER` + scoped to inviting company + `mustChangePassword`; temp pw works; single-hop `/change-password`; legacy `/auth/invite/*` = 404. |
| 5 | First-login gate | **PASS** | `mustChangePassword` user forced to `/change-password` from every route; after change → role home; old temp pw rejected. |
| 6 | Password reset lifecycle + edges | **PASS** | Neutral response both ways (no enumeration); token issued/emailed; valid link → `/login?reset=success`; new pw works/old rejected; single-use, expired, throttle, and single-live-token invariants all enforced. |
| 7 | Role dashboards & authz | **PASS** | Every role's dashboard + core routes 200; authz matrix enforces least-privilege at BOTH nav (307) and server-action level (blocked, no write). |
| 8 | Email deliverability (Resend) | **PASS** | Resend configured (`RESEND_API_KEY`, `EMAIL_FROM=Lovedis <noreply@lovedis.de>`, domain verified). 8/8 QA emails `last_event: delivered` with message IDs. |
| 9 | Data integrity / regression | **PASS** | End state = original 5 users / 6 companies / 0 reset tokens; 5 real users unmodified; no genuine product 5xx in `logs --since 45m` (only expected `CredentialsSignin` from deliberate bad-login tests). |

**Overall: PASS.** One minor, low-severity defect (D-1) found; does not block any primary user flow.

---

## Detailed evidence

### 1. Infrastructure / health — PASS
- `GET /api/health` → **200** `{"status":"ok","database":"up",…}`.
- `docker compose ps`: `caddy` Up 2 days; `db` (postgres:18) Up 2 days (healthy); `homepage` Up 2 days (healthy); `platform` Up 17 hours (healthy).
- Homepage `home.*` `/` → 302 → `/de` → **200**. Platform `app.*` reachable.
- TLS (read-only `openssl s_client`): both hosts served by **Let's Encrypt** (`CN=YE1`), subjects `app.…`/`home.…`, validity **2026-08-24 → 2026-11-22**.

### 2. Auth & session — PASS (defect D-1)
- Login via NextAuth credentials for throwaway users of every role; `GET /` single-hop:
  - ADMIN → 307 `/dashboard/admin` (200); MEMBER → `/dashboard/member` (200); BUSINESS_PARTNER → `/dashboard/partner` (200); INVESTOR → `/dashboard/investor` (200); STARTUP → `/dashboard/startup` (200).
- Unauthenticated protected routes → **307** `/login?callbackUrl=%2F…` (verified `/dashboard/admin`, `/users`, `/change-password`).
- Wrong password → 302 `/login?error=CredentialsSignin`, **no** session cookie. Nonexistent user → identical error (no user enumeration).
- Logout (`/api/auth/signout`) → 302 `/login`; subsequent `GET /` → 307 `/login` (session invalidated).
- **Defect D-1 (Minor):** `GET /api/session-clear` correctly deletes all `authjs.session-token[.n]` cookies but its `Location` header is `https://0.0.0.0:3000/login` (internal container origin) instead of the public host. See Defects.

### 3. Registration — PASS
- **Self-signup partner** (`/auth/signup/partner`, live server-action POST): 303 → `/pending`; DB row `BUSINESS_PARTNER`, `approvedAt` null (pending), active. Pending gate confirmed: that session on `/dashboard/partner` and `/screening` → 307 `/pending`; `/pending` → 200.
- **Self-signup startup** (`/auth/signup/startup`): 303 → `/dashboard/startup`; DB row `STARTUP`, approved (not pending), active.
- **Admin `createUser`** (`/users`, as ADMIN): "Nutzer erstellt"; DB row `INVESTOR`, approved, active.
- **Confirmation email** sent for each (Resend, see §8).

### 4. Partner invite + first-login change — PASS
- `inviteEmployee` (as ADMIN, into existing "Test Partner (QA)" company): invitee DB row = `role BUSINESS_PARTNER`, `companyRole MEMBER`, `companyId` = inviting company, `mustChangePassword=true`, approved, active — exactly per spec.
- Invitation email delivered with temporary password (extracted from the email to `tim.meggert+qa-invite@…`).
- **Temp pw login** authenticates; login-action lands on `/change-password` in a **single 303** (both with and without `callbackUrl=/change-password`) — no chained redirect / "page can't load".
- **Change-password** → 303 `/dashboard/partner`; DB `mustChangePassword=false`, `passwordChangedAt` set.
- Old temp pw **rejected**; new pw works and no longer gated.
- Legacy `GET /auth/invite/<token>` → **404**.

### 5. First-login gate — PASS
- With a `mustChangePassword` session, every surface bounced to `/change-password`: `/` → 307, `/dashboard/partner` → 307, `/settings` → 307; `/change-password` → 200.
- After completing the change → role home; old temp pw rejected (covered in §4).

### 6. Password reset — full lifecycle + edge cases — PASS
- `/forgot-password` & `/reset-password` reachable **unauthenticated** (200; reset page 200 even with bogus token).
- **Existing** account → neutral message + exactly **1** token in DB + reset email delivered.
- **Nonexistent** account → **identical** neutral message + **0** tokens + **no** email (no enumeration).
- **Valid link** → reset action → 303 `/login?reset=success`; DB token `usedAt` set, user `passwordChangedAt` updated.
- New pw works; **old pw rejected**.
- **Single-use:** reusing the same token → rejected ("Link ungültig oder abgelaufen").
- **Expired:** DB-seeded token with past `expiresAt` → reset rejected.
- **Throttle:** 3 rapid `forgot-password` submits → all neutral 200 but only **1** token and **1** email issued.
- **Single-live-token:** after throttle window bypass, a fresh request replaced the outstanding token (count stays 1, hash prefix changed `b105a53c…` → `7eb0875e…`); prior token invalidated.

### 7. Role dashboards & authz — PASS
Authz matrix (200 = allowed, 307 = redirected to own role home = denied):

| Route | ADMIN | MEMBER | PARTNER | INVESTOR | STARTUP |
|-------|:-----:|:------:|:-------:|:--------:|:-------:|
| `/users` | 200 | 307 | 307 | 307 | 307 |
| `/companies` | 200 | 307 | 307 | 307 | 307 |
| `/sharing` | 200 | 307 | 307 | 307 | 307 |
| `/startups` (team) | 200 | 200 | 307 | 307 | 307 |
| `/hub-admin` (team) | 200 | 200 | 307 | 307 | 307 |
| `/screening` (partner-view) | 200 | 200 | 200 | 307 | 307 |
| `/use-cases` (partner-view) | 200 | 200 | 200 | 307 | 307 |
| `/venture` (venture-view) | 200 | 200 | 307 | 307 | 200 |
| `/discover` (marketplace) | 200 | 200 | 200 | 200 | 307 |
| `/feed` (feed) | 200 | 200 | 200 | 200 | 200 |
| `/settings` | 200 | 200 | 200 | 200 | 200 |

- Additional per-role core routes returned 200 for their owner role: ADMIN `/match-matrix, /pipeline, /reports, /intros, /credits, /marketplace, /engagements, /pushes, /longlist, /evaluations, /compare, /radar, /batches`; PARTNER `/pocs, /challenges, /scorings, /messages, /partner-hub, /check-ins, /engagements`; INVESTOR `/pocs, /scorings, /messages`; STARTUP `/applications, /profile, /challenges, /venture/marketplace, /venture/credits, /venture/marketplace/requests`; MEMBER `/intros, /match-matrix, /pocs, /challenges, /profile, /applications`.
- **Server-action authz (defense-in-depth):** a STARTUP session POSTing the admin `createUser` action → 303 to its own dashboard and **no** user created (DB count 0). Confirms guards enforce at the action layer, not just navigation.
- **Expected 307s (not failures):** `/matrix` returned 307 for all throwaway users because it requires a provisioned partner-company or startup entity (ADMIN/MEMBER are intentionally routed to `/match-matrix`); `/team` 307 for the company-less throwaway partner (requires company membership).

### 8. Email deliverability (Resend) — PASS
Resend is the active adapter (`RESEND_API_KEY` set; `EMAIL_FROM=Lovedis <noreply@lovedis.de>`; domain verified — sends accepted). All QA emails to `tim.meggert+…@lovedis.de` show `last_event: delivered`:

| Type | Resend message id | Status |
|------|-------------------|--------|
| Deliverability probe | `80751597-3085-46c7-8a36-035545a211fd` | delivered |
| Registration confirmation (self-signup partner) | `87d28ebf-5140-46ef-93af-69626a5044ec` | delivered |
| Registration confirmation (self-signup startup) | `4a7cad23-5b31-495e-8907-29269a16bfca` | delivered |
| Registration confirmation (admin createUser) | `8a78777e-3fdd-4ed4-84e4-884c613a0e1f` | delivered |
| Partner invitation (temp password) | `2bdd7da8-ba7e-48d5-a9cc-ee2c5f83e9c0` | delivered |
| Password reset link | `7e520bcd-e85f-4633-baac-1bccfc88aa91` | delivered |
| Password reset link (throttle test #1) | `7b314ae5-dcdb-4b57-8492-3da5e0954ee7` | delivered |
| Password reset link (reissue after window) | `3f1db805-41ec-4a09-acfd-38856723d4fe` | delivered |

0 send failures; no `Versand fehlgeschlagen` in logs.

### 9. Data integrity / regression — PASS
- **5 real users** present and unmodified (roles/companyRole/active/pending all intact; `mustChangePassword=false`): `admin@lovedis.dev` (ADMIN), `partner.test@lovedis.de` (BUSINESS_PARTNER/OWNER), `polina.kon@lovedis.de` (ADMIN), `startup.test@lovedis.de` (STARTUP), `tim.meggert@lovedis.de` (ADMIN). No real-user password was ever changed. *(Note: `polina.kon` already had a non-null `passwordChangedAt` before testing — pre-existing baseline state, not caused here.)*
- **6 companies** intact/active; "Test Partner (QA)" restored to its original single member (OWNER) after cleanup.
- **Logs** (`docker compose logs --since 45m platform`): 0 × `500/502/503`; no Prisma/unhandled/TypeError. The only `[auth][error] CredentialsSignin` lines correspond 1:1 to the deliberate bad-password / nonexistent-user / old-password login tests — test-harness artifacts, not product errors.

---

## Failures / Defects

### D-1 (Minor / low severity) — `/api/session-clear` redirects to internal origin
- **Observed:** `GET https://app.49.13.222.76.nip.io/api/session-clear` returns `307` with `Location: https://0.0.0.0:3000/login`. Cookie deletion itself works correctly (all `authjs.session-token` variants cleared).
- **Impact:** Low. This route is only reached automatically by `requireAuth()` when a JWT is cryptographically valid but its user id no longer exists in the DB (e.g. after a re-seed). In that edge case the browser would be sent to the unreachable `0.0.0.0:3000` host, defeating the intended auto-recovery (user can still recover by manually visiting `/login`). No impact on normal login/logout.
- **Root cause:** `src/app/api/session-clear/route.ts` builds the redirect with `new URL("/login", request.url)`. In a route handler behind Caddy, `request.url` reflects the internal upstream origin (`0.0.0.0:3000`) rather than the public host. Middleware redirects are unaffected because they use `nextUrl` (which honors forwarded host).
- **Recommended fix:** Derive the redirect base from a trusted public origin instead of `request.url` — e.g. `new URL("/login", process.env.NEXTAUTH_URL ?? request.url)`, or read `x-forwarded-host`/`x-forwarded-proto`, or configure Caddy to `header_up Host {host}`.

No other failures found.

---

## Coverage

### Functions / routes exercised live
- **Health/infra:** `/api/health`, homepage `/`→`/de`, TLS, container health.
- **Auth:** NextAuth CSRF + credentials callback (all 5 roles), `login` server action (incl. `mustChangePassword` single-hop + `callbackUrl`), `/api/auth/signout`, `/api/session-clear`, wrong/nonexistent credential rejection.
- **Registration:** `signupPartner`, `signupStartup`, admin `createUser` (all via live progressive-enhancement server-action POST).
- **Invite / first-login:** `inviteEmployee`, `changePassword`, first-login middleware gate, legacy `/auth/invite/*` 404.
- **Password reset:** `requestPasswordReset`, `resetPassword` (valid/reused/expired/throttled/single-live-token), `/forgot-password`, `/reset-password`.
- **Authz / dashboards:** all 5 role dashboards + ~40 core routes; nav-level and server-action-level denial checks.
- **Email:** Resend adapter (POST probe + all app-triggered types) via Resend API status.

### Not exercised live (and why)
- **Row-level admin/company mutations** — `approvePartner`, `updateUserRole`, `toggleUserActive`, `changeEmployeeCompanyRole`, `setEmployeeActive`, `removeEmployee`, `moveEmployee`, `updateCompany` submit: these are dispatched as client-invoked server actions with **no** no-JS fallback form carrying the encrypted action ref in the page HTML, so they can't be replayed over raw HTTPS. Verified indirectly by code review + shared guard functions (`authorizePlatformAdmin`/`authorizeCompanyManagement`/`requireRole`) + the live pending-gate behavior. Recommend a follow-up UI/browser pass for these.
- **Deep feature record mutations** inside dashboards (creating startups/scorings/matrix votes/marketplace bookings/messages, etc.): dashboards and feature index routes were loaded (200) and authz-gated, but per-record create/update flows were not each triggered to avoid polluting test data and because they are beyond the "primary auth/onboarding" flows in scope. `/matrix` self-service pages correctly 307 for accounts without a provisioned partner-company/startup entity.
- **In-IDE browser:** unavailable/flaky (tab creation failed); all verification done via HTTPS + NextAuth flows + live server-action replay + read-only DB inspection + Resend API.

---

## Cleanup confirmation
- Throwaway data created during testing: 5 role login users (`qa_login_*@qa.local`), 4 email-flow users (`tim.meggert+qa1p/qa1s/qa-admincreate/qa-invite@lovedis.de`), and their password-reset tokens (incl. one seeded expired token).
- **All deleted.** Post-cleanup DB verification:
  - Users total = **5** (the original real users only); stray QA users = **0**.
  - Companies total = **6**; "Test Partner (QA)" back to **1** member.
  - PasswordResetToken total = **0**.
- No code, config, image, or deploy changes were made. `git status`/`git diff` show no modifications to tracked files (only this new report + pre-existing untracked files).
- **Neon / production / Dedalus were never touched** — all actions were confined to the Hetzner TEST stack.
- Local temp files containing tokens/temp passwords were deleted; SSH connection multiplexer closed. No secrets, raw tokens, or password hashes are included in this report.
