# Lovedis — Startup Evaluation & Tech Scouting Platform

**Lovedis** is a multi-role platform for venture scouts (discover → evaluate → pipeline →
report) plus a two-sided collaboration layer (challenges, applications, PoC tracking,
shared scorings), built with the Lovedis design system.

## Tech stack

- **Next.js 16** (App Router, Turbopack, RSC + Server Actions), **React 19**, **TypeScript**
- **NextAuth v5** (Credentials provider, JWT sessions, bcryptjs)
- **PostgreSQL 17** via **Prisma 7** with the `@prisma/adapter-pg` driver adapter
- **Tailwind CSS v4** with the custom Lovedis design tokens (`lv` namespace)
- `lucide-react`, `cmdk`, `recharts`, `@dnd-kit`, Zustand (persisted), Zod
- Exports: jsPDF + html2canvas (PDF), xlsx (Excel), papaparse (CSV)

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Set `DATABASE_URL`, `NEXTAUTH_SECRET` (e.g. `openssl rand -base64 32`) and `NEXTAUTH_URL`.

### 3. Database

Either point `DATABASE_URL` at any PostgreSQL 17 instance, **or** use the bundled local dev
database (PostgreSQL 17 binaries ship with the `embedded-postgres` dev dependency — no
Docker or system install needed):

```bash
npm run db:start    # init (first run) + start Postgres 17 on localhost:5433
```

Then push the schema and seed demo data:

```bash
npm run db:push
npm run db:seed
```

Or all three in one go: `npm run db:setup`. Stop the local database with `npm run db:stop`.

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Demo accounts

All seeded accounts use the password **`Lovedis2026!`**:

| Role | Email | Home |
|---|---|---|
| Admin | `admin@lovedis.dev` | `/dashboard/admin` |
| Member (Scout) | `member@lovedis.dev` | `/dashboard/member` |
| Business Partner | `partner@lovedis.dev` | `/dashboard/partner` |
| Investor | `investor@lovedis.dev` | `/dashboard/investor` |
| Startup | `startup@lovedis.dev` | `/dashboard/startup` |

Public self-signup exists for partners (`/auth/signup/partner`) and startups
(`/auth/signup/startup`).

## Architecture notes

- **Two NextAuth configs**: `src/auth.config.ts` is Edge-safe and powers `src/middleware.ts`
  (JWT-only check); `src/auth.ts` adds the Credentials provider with bcrypt + Prisma lookup.
  The role rides in the JWT and is exposed as `session.user.role`.
- **Server Actions are the only write API** (`src/app/actions/*.ts`), grouped by domain.
  Every action re-checks `auth()` + role, validates with Zod, writes via Prisma and calls
  `revalidatePath`. The only REST routes are `/api/auth/[...nextauth]` and `/api/health`.
- **Role gating** via `lib/auth-guards.ts` (`requireAuth`, `requireRole`,
  `requireScoutModule`); the Venture Scout module (`/startups`, `/evaluations`, `/compare`,
  `/pipeline`, `/radar`, `/reports`) is restricted to `ADMIN` + `MEMBER`.
- **Scoring engine** (`lib/scoring.ts` + `lib/constants.ts`): 7 weighted dimensions →
  weighted overall score (0–5), Potential × Feasibility → quadrant (Money Maker / Dreamer /
  Solid Bet / Pass), recommendation mapping (`STRONG_YES` … `STRONG_NO`). Per-user weight
  overrides live in the persisted Zustand store (`stores/useAppStore.ts`) and are applied
  client-side.
- Generated Prisma client lives in `src/generated/prisma/` (gitignored); regenerate with
  `npm run prisma:generate`.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` / `npm start` | Production build / serve |
| `npm run db:start` / `db:stop` | Local PostgreSQL 17 |
| `npm run db:push` | Push Prisma schema |
| `npm run db:seed` | Seed demo data |
| `npm run prisma:generate` | Regenerate Prisma client |
| `npm run lint` | ESLint |
