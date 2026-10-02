/**
 * Emergency restore for admin@lovedis.dev after accidental deletion.
 * Uses raw SQL so it works even when prod schema lags behind Prisma models.
 *
 * Usage:
 *   CONFIRM_RESTORE_ADMIN=1 DATABASE_URL=<target> npx tsx prisma/restore-admin.ts
 */
import pg from "pg";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

const ADMIN_EMAIL = "admin@lovedis.dev";
const ADMIN_NAME = "Alex Admin";
const DEFAULT_PASSWORD = "Lovedis2026!";

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
  if (process.env.CONFIRM_RESTORE_ADMIN !== "1") {
    console.log(
      "Abbruch: Setze CONFIRM_RESTORE_ADMIN=1, um admin@lovedis.dev wiederherzustellen."
    );
    return;
  }

  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const existing = await client.query(`SELECT id, role FROM "User" WHERE email = $1`, [
      ADMIN_EMAIL,
    ]);
    if (existing.rowCount && existing.rowCount > 0) {
      console.log(`${ADMIN_EMAIL} existiert bereits (role: ${existing.rows[0].role}).`);
      return;
    }

    const id = `usr_${randomBytes(8).toString("hex")}`;
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
    const now = new Date();

    await client.query(
      `INSERT INTO "User" (id, email, "passwordHash", name, role, "isActive", company, "createdAt", "updatedAt", "approvedAt")
       VALUES ($1, $2, $3, $4, 'ADMIN', true, 'LOVEDIS', $5, $5, $5)`,
      [id, ADMIN_EMAIL, passwordHash, ADMIN_NAME, now]
    );

    console.log(`Admin wiederhergestellt: ${ADMIN_EMAIL}`);
    console.log(
      "Hinweis: Passwort auf Seed-Default zurückgesetzt (siehe README). Bitte nach Login ändern."
    );
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
