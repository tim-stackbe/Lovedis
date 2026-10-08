import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Integration test harness.
//
// These helpers run REAL Prisma queries against a DISPOSABLE local Postgres
// database (see README in tests/). We refuse to run against anything that does
// not look like a local `_test` database, so a mis-set DATABASE_URL can never
// point the destructive TRUNCATE at a dev/prod database.
// ---------------------------------------------------------------------------

const url = process.env.DATABASE_URL ?? "";
const isLocalTestDb =
  /(localhost|127\.0\.0\.1)/.test(url) && /_test(\b|\?|$)/.test(url);

if (!isLocalTestDb) {
  throw new Error(
    `Refusing to run integration tests: DATABASE_URL must be a local "_test" ` +
      `database (got: ${url || "<empty>"}). Start the dev DB and create ` +
      `lovedis_test, then run "npm test".`
  );
}

/** Truncates every table so each test starts from a clean, deterministic slate. */
export async function resetDb(): Promise<void> {
  const rows = await prisma.$queryRawUnsafe<{ tablename: string }[]>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`
  );
  const tables = rows
    .map((r) => `"public"."${r.tablename}"`)
    .filter((t) => !t.includes("_prisma_migrations"));
  if (tables.length === 0) return;
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${tables.join(", ")} RESTART IDENTITY CASCADE`
  );
}

let userSeq = 0;

/** Creates a user with sensible defaults; approved unless overridden. */
export async function createUser(overrides: {
  role?: "ADMIN" | "MEMBER" | "BUSINESS_PARTNER" | "INVESTOR" | "STARTUP";
  email?: string;
  name?: string;
  isActive?: boolean;
  approvedAt?: Date | null;
} = {}) {
  userSeq += 1;
  const unique = `${userSeq}-${Math.random().toString(36).slice(2, 8)}`;
  return prisma.user.create({
    data: {
      email: overrides.email ?? `user${unique}@test.local`,
      name: overrides.name ?? `User ${userSeq}`,
      passwordHash: "x",
      role: overrides.role ?? "ADMIN",
      isActive: overrides.isActive ?? true,
      approvedAt:
        overrides.approvedAt === undefined ? new Date() : overrides.approvedAt,
    },
  });
}

/**
 * Creates a startup plus a credit account seeded to `balance`. The whole balance
 * is treated as FLEX (the free contingent) so mentor/support redemptions work by
 * default; use `createStartupWithBuckets` when a FIX split is needed.
 */
export async function createStartupWithBalance(balance: number) {
  const startup = await prisma.startup.create({
    data: {
      name: `Startup ${Math.random().toString(36).slice(2, 8)}`,
      description: "Test startup",
      industry: "AI",
    },
  });
  const account = await prisma.creditAccount.create({
    data: { startupId: startup.id, balance, flexBalance: balance },
  });
  return { startup, account };
}

/** Creates a startup + account with explicit FIX/FLEX bucket balances. */
export async function createStartupWithBuckets(opts: {
  fix: number;
  flex: number;
}) {
  const startup = await prisma.startup.create({
    data: {
      name: `Startup ${Math.random().toString(36).slice(2, 8)}`,
      description: "Test startup",
      industry: "AI",
    },
  });
  const account = await prisma.creditAccount.create({
    data: {
      startupId: startup.id,
      balance: opts.fix + opts.flex,
      fixBalance: opts.fix,
      flexBalance: opts.flex,
    },
  });
  return { startup, account };
}

/** Creates an OPEN program with a given FIX credit cost. */
export async function createProgram(opts: {
  createdById: string;
  fixCreditCost?: number;
}) {
  return prisma.program.create({
    data: {
      title: `Programm ${Math.random().toString(36).slice(2, 8)}`,
      summary: "Test-Programm",
      description: "Ein Test-Programm.",
      status: "OPEN",
      fixCreditCost: opts.fixCreditCost ?? 0,
      createdById: opts.createdById,
    },
  });
}

/** Creates a marketplace PROGRAM booking in a given status. */
export async function createProgramBooking(opts: {
  startupId: string;
  programId: string;
  requestedById: string;
  status:
    | "REQUESTED"
    | "IN_COORDINATION"
    | "CONFIRMED"
    | "COMPLETED"
    | "DECLINED"
    | "CANCELLED";
  fixCreditCost: number;
  creditTransactionId?: string | null;
}) {
  return prisma.marketplaceBooking.create({
    data: {
      offeringType: "PROGRAM",
      status: opts.status,
      startupId: opts.startupId,
      requestedById: opts.requestedById,
      programId: opts.programId,
      message: "Bitte um Aufnahme ins Programm.",
      contactName: "Test Contact",
      contactEmail: "contact@test.local",
      creditCost: 0,
      fixCreditCost: opts.fixCreditCost,
      creditTransactionId: opts.creditTransactionId ?? null,
    },
  });
}

/** Creates an active mentor profile with the given credit cost. */
export async function createMentor(creditCost: number) {
  return prisma.mentorProfile.create({
    data: { name: "Mentor", creditCost, isActive: true },
  });
}

/** Creates a marketplace booking for a mentor session in a given status. */
export async function createMentorBooking(opts: {
  startupId: string;
  mentorId: string;
  requestedById: string;
  status:
    | "REQUESTED"
    | "IN_COORDINATION"
    | "CONFIRMED"
    | "COMPLETED"
    | "DECLINED"
    | "CANCELLED";
  creditCost: number;
  creditTransactionId?: string | null;
}) {
  return prisma.marketplaceBooking.create({
    data: {
      offeringType: "MENTOR_SESSION",
      status: opts.status,
      startupId: opts.startupId,
      requestedById: opts.requestedById,
      mentorId: opts.mentorId,
      message: "Bitte um eine Session zum Thema Go-to-Market.",
      contactName: "Test Contact",
      contactEmail: "contact@test.local",
      creditCost: opts.creditCost,
      creditTransactionId: opts.creditTransactionId ?? null,
    },
  });
}

export { prisma };
