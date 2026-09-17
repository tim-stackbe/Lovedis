/**
 * Restores Lovedis Alpha baseline accounts after accidental deletion.
 * Uses raw SQL so it works when prod schema lags behind Prisma models.
 *
 * Usage:
 *   CONFIRM_RESTORE_ACCOUNTS=1 DATABASE_URL=<target> npx tsx prisma/restore-alpha-accounts.ts
 */
import pg from "pg";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

function cuid(prefix: string): string {
  return `${prefix}_${randomBytes(10).toString("hex")}`;
}

interface AccountSpec {
  email: string;
  name: string;
  role: "ADMIN" | "BUSINESS_PARTNER" | "STARTUP";
  password: string;
  company?: string;
  companyRole?: "OWNER" | "ADMIN" | "MEMBER";
  createCompany?: { name: string; linkMatrix?: boolean };
  createStartup?: { name: string; description: string; industry: string };
}

const ACCOUNTS: AccountSpec[] = [
  {
    email: "admin@lovedis.dev",
    name: "Alex Admin",
    role: "ADMIN",
    password: "Lovedis2026!",
    company: "LOVEDIS",
  },
  {
    email: "tim.meggert@lovedis.de",
    name: "Tim Meggert",
    role: "ADMIN",
    password: "Marburg1",
    company: "LOVEDIS",
  },
  {
    email: "polina.kon@lovedis.de",
    name: "Polina Kon",
    role: "ADMIN",
    password: "pkiN?VaF9QbM7Zc",
    company: "LOVEDIS",
  },
  {
    email: "linda.koepper@lovedis.de",
    name: "Linda Köpper",
    role: "ADMIN",
    password: "PzgY%g3SNT4aEzj",
    company: "LOVEDIS",
  },
  {
    email: "partner.test@lovedis.de",
    name: "Partner Test (QA)",
    role: "BUSINESS_PARTNER",
    password: "QApartner!2026",
    company: "Test Partner (QA)",
    companyRole: "OWNER",
    createCompany: { name: "Test Partner (QA)", linkMatrix: true },
  },
  {
    email: "startup.test@lovedis.de",
    name: "Startup Test (QA)",
    role: "STARTUP",
    password: "LovedisTest2026!",
    createStartup: {
      name: "Startup Test (QA)",
      description: "QA-Test-Startup für Alpha-Validierung auf der LOVEDIS-Plattform.",
      industry: "Software",
    },
  },
];

async function upsertUser(
  client: pg.Client,
  spec: AccountSpec,
  passwordHash: string,
  now: Date,
  companyId: string | null
): Promise<string> {
  const existing = await client.query(`SELECT id FROM "User" WHERE email = $1`, [
    spec.email,
  ]);
  if (existing.rowCount && existing.rowCount > 0) {
    const id = existing.rows[0].id as string;
    await client.query(
      `UPDATE "User"
       SET name = $2, role = $3, "passwordHash" = $4, "isActive" = true,
           company = $5, "companyId" = $6, "companyRole" = $7,
           "approvedAt" = COALESCE("approvedAt", $8), "updatedAt" = $8
       WHERE id = $1`,
      [
        id,
        spec.name,
        spec.role,
        passwordHash,
        spec.company ?? null,
        companyId,
        spec.companyRole ?? null,
        now,
      ]
    );
    return id;
  }

  const id = cuid("usr");
  await client.query(
    `INSERT INTO "User"
       (id, email, "passwordHash", name, role, "isActive", company, "companyId", "companyRole",
        "createdAt", "updatedAt", "approvedAt")
     VALUES ($1, $2, $3, $4, $5, true, $6, $7, $8, $9, $9, $9)`,
    [
      id,
      spec.email,
      passwordHash,
      spec.name,
      spec.role,
      spec.company ?? null,
      companyId,
      spec.companyRole ?? null,
      now,
    ]
  );
  return id;
}

async function ensureCompany(
  client: pg.Client,
  name: string,
  now: Date,
  linkMatrix: boolean
): Promise<string> {
  const existing = await client.query(`SELECT id FROM "Company" WHERE name = $1`, [name]);
  let companyId: string;
  if (existing.rowCount && existing.rowCount > 0) {
    companyId = existing.rows[0].id as string;
  } else {
    companyId = cuid("co");
    await client.query(
      `INSERT INTO "Company" (id, name, "isActive", "createdAt", "updatedAt")
       VALUES ($1, $2, true, $3, $3)`,
      [companyId, name, now]
    );
  }

  if (linkMatrix) {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const pc = await client.query(
      `SELECT id FROM "PartnerCompany" WHERE "companyId" = $1 OR name = $2`,
      [companyId, name]
    );
    if (!pc.rowCount) {
      const pcId = cuid("pc");
      await client.query(
        `INSERT INTO "PartnerCompany" (id, name, slug, "sortOrder", "companyId", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, 0, $4, $5, $5)`,
        [pcId, name, slug, companyId, now]
      );
    } else {
      await client.query(
        `UPDATE "PartnerCompany" SET "companyId" = $2, "updatedAt" = $3 WHERE id = $1`,
        [pc.rows[0].id, companyId, now]
      );
    }
  }

  return companyId;
}

async function ensureStartup(
  client: pg.Client,
  ownerUserId: string,
  spec: NonNullable<AccountSpec["createStartup"]>,
  now: Date
): Promise<string> {
  const existing = await client.query(
    `SELECT id FROM "Startup" WHERE "ownerUserId" = $1`,
    [ownerUserId]
  );
  if (existing.rowCount && existing.rowCount > 0) {
    return existing.rows[0].id as string;
  }

  const startupId = cuid("su");
  await client.query(
    `INSERT INTO "Startup"
       (id, name, description, industry, stage, "pipelineStage", "ownerUserId",
        "isPublished", "seekingFunding", "lookingFor", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, 'SEED', 'DISCOVERED', $5, false, false, '{}', $6, $6)`,
    [startupId, spec.name, spec.description, spec.industry, ownerUserId, now]
  );
  return startupId;
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
  if (process.env.CONFIRM_RESTORE_ACCOUNTS !== "1") {
    console.log(
      "Abbruch: Setze CONFIRM_RESTORE_ACCOUNTS=1, um Konten wiederherzustellen."
    );
    return;
  }

  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const now = new Date();
    console.log("Stelle Admin- und Test-Konten wieder her…");

    for (const spec of ACCOUNTS) {
      let companyId: string | null = null;
      if (spec.createCompany) {
        companyId = await ensureCompany(
          client,
          spec.createCompany.name,
          now,
          spec.createCompany.linkMatrix ?? false
        );
      }

      const passwordHash = await bcrypt.hash(spec.password, 10);
      const userId = await upsertUser(client, spec, passwordHash, now, companyId);

      if (spec.createStartup) {
        await ensureStartup(client, userId, spec.createStartup, now);
      }

      console.log(`  ✓ ${spec.role.padEnd(16)} ${spec.email}`);
    }

    const users = await client.query(
      `SELECT email, role, name FROM "User" ORDER BY role, email`
    );
    console.log(`\nVerbleibend: ${users.rowCount} Nutzer`);
    for (const row of users.rows) {
      console.log(`  ${row.role.padEnd(16)} ${row.email} (${row.name})`);
    }
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
