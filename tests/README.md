# Tests

Automated test suite for the Lovedis platform, built on **Vitest** (TS-native,
fast, ESM-friendly — a good fit for this Next.js 16 / TypeScript project).

## Running

```bash
# one-off run
npm test

# watch mode
npm run test:watch
```

If the local Node toolchain isn't on your PATH:

```bash
export PATH="$PWD/.tools/node/bin:$PATH"
```

Everything runs **offline** and **deterministic** — no network access, and the
suite never touches the Neon prod/preview database.

## Database strategy — real integration against a disposable local Postgres

The critical logic (atomic credit debit, booking lifecycle, refunds) is
DB-heavy and its correctness lives at the **transaction/SQL level** (guarded
`updateMany(balance gte cost)`, row claims under Read Committed). Mocking Prisma
would assert *that we call the right query* but not *that the guard actually
prevents overspend*. Since a **local Postgres is available** (the bundled dev DB
on `localhost:5433`), we run true integration tests instead.

- Integration tests run against a **separate, disposable** database
  `lovedis_test` on the local dev server — **never** the app DB `lovedis`, and
  **never** the Neon prod/preview DB.
- `tests/helpers/db.ts` refuses to run unless `DATABASE_URL` points at a
  `localhost` database whose name ends in `_test` (a hard safety net against a
  mis-set URL), and `TRUNCATE`s all tables between tests for a clean slate.
- The framework/session edges (`next/cache`, `@/lib/auth-guards`) are mocked so
  the tests focus on the DB behaviour; the Prisma queries and Postgres
  transactions run for real.

### One-time setup for integration tests

```bash
npm run db:start   # start the bundled local Postgres 17 (port 5433)

# create the disposable test database (idempotent)
node -e 'const {Client}=require("pg");(async()=>{const c=new Client("postgresql://lovedis:lovedis@localhost:5433/lovedis");await c.connect();const e=await c.query("select 1 from pg_database where datname=$1",["lovedis_test"]);if(!e.rowCount)await c.query("CREATE DATABASE lovedis_test");await c.end();})()'

# sync the schema into the test DB
npx prisma db push --url "postgresql://lovedis:lovedis@localhost:5433/lovedis_test"
```

The test DB URL defaults to
`postgresql://lovedis:lovedis@localhost:5433/lovedis_test` and can be overridden
via the `TEST_DATABASE_URL` env var (see `vitest.config.ts`).

## What's covered

### Integration (real Postgres) — `tests/integration/`

- **`credits.test.ts` — credit ledger floor** (`bookCreditTransaction`)
  - positive GRANT applies + writes a ledger row
  - SPEND below zero is blocked and writes **no** ledger row (balance kept)
  - SPEND within balance applies
  - negative ADJUSTMENT below the floor is blocked; positive one applies
  - amount 0 / unknown startup return clean errors
- **`marketplace.test.ts` — redeem-on-confirm + refunds** (`confirmBooking`,
  `cancelBooking`)
  - debits exactly the cost on `IN_COORDINATION → CONFIRMED` and links the SPEND
  - insufficient balance → error, booking stays `IN_COORDINATION`, no ledger row
  - only confirms from `IN_COORDINATION` (a `REQUESTED` booking is rejected)
  - double-confirm is a no-op (debits once)
  - 0-credit program confirms without touching the ledger
  - **concurrency:** two confirms on one account with balance for only one — the
    guarded `updateMany` lets exactly one win, balance stays ≥ 0, one SPEND
  - CONFIRMED cancel refunds as a positive ADJUSTMENT
  - COMPLETED bookings cannot be cancelled (no refund)
  - no double-refund on a second cancel

### Unit (mocked) — `tests/unit/`

- **`auth-guards.test.ts`** — `requireAuth` re-reads `isActive` + `role` from the
  DB and overwrites the JWT snapshot; a demoted admin (JWT ADMIN / DB MEMBER) is
  rejected by `requireRole`; inactive user and missing user are redirected.
- **`partner-approval.test.ts`** — self-registered partner is created
  `approvedAt: null`; startups / admin-created users are approved immediately;
  `createChallenge` and `submitPartnerVerdict` refuse unapproved partners;
  `approvePartner` is ADMIN-only, sets `approvedAt`, and maps P2025 to a
  friendly error.
- **`validation.test.ts`** — `firstZodError` returns the clean message with no
  `path:` prefix; `isRecordNotFoundError` duck-types P2025; `updateUserRole`
  rejects invalid roles / self-edits and maps P2025 to a friendly error.

### Note on atomicity

The concurrency test exercises the real guard, but absolute atomicity is a
DB-level property (transaction isolation + row locks). It is verified here
against local Postgres — not against production.
