/**
 * Provision ADMIN accounts with a one-time temp password and email invite.
 *
 * Usage:
 *   CONFIRM_ADMIN_INVITE=1 INVITE_EMAIL=moritz.mueller@lovedis.de \
 *     npx tsx prisma/provision-admin-invite.ts
 *
 * Optional: INVITE_NAME="Moritz Müller" (default derived from email local part)
 */
import { randomBytes, randomInt } from "node:crypto";
import pg from "pg";
import bcrypt from "bcryptjs";
import { Resend } from "resend";

const LOGIN_URL =
  process.env.NEXTAUTH_URL?.replace(/\/$/, "") ??
  "https://app.49.13.222.76.nip.io";

const LOWER = "abcdefghijkmnpqrstuvwxyz";
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const DIGITS = "23456789";
const SYMBOLS = "!@#$%*?";
const ALL = LOWER + UPPER + DIGITS;

function pick(a: string) {
  return a[randomInt(a.length)];
}

function generatePassword(length = 14): string {
  const chars = [pick(LOWER), pick(UPPER), pick(DIGITS), pick(SYMBOLS)];
  while (chars.length < length) chars.push(pick(ALL));
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

function cuid(prefix: string): string {
  return `${prefix}_${randomBytes(10).toString("hex")}`;
}

function defaultNameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? email;
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

function buildEmail(name: string, email: string, password: string): string {
  const greeting = name.trim() ? `Hallo ${name},` : "Hallo,";
  return (
    `${greeting}\n\n` +
    `wir haben dir einen Admin-Zugang zur LOVEDIS-Plattform eingerichtet.\n\n` +
    `Melde dich mit den folgenden Zugangsdaten an:\n\n` +
    `Anmelden:\n${LOGIN_URL}/login?callbackUrl=/change-password\n\n` +
    `E-Mail: ${email}\n` +
    `Temporäres Passwort: ${password}\n\n` +
    `Bei der ersten Anmeldung legst du dein eigenes Passwort fest. ` +
    `Das temporäre Passwort ist danach ungültig.\n\n` +
    `Bei Fragen erreichst du uns jederzeit.\n\n` +
    `Viele Grüße\nDein LOVEDIS-Team`
  );
}

async function main() {
  if (process.env.CONFIRM_ADMIN_INVITE !== "1") {
    console.log("Abbruch: Setze CONFIRM_ADMIN_INVITE=1.");
    return;
  }

  const email = process.env.INVITE_EMAIL?.trim().toLowerCase();
  if (!email) throw new Error("INVITE_EMAIL is required.");

  const name = process.env.INVITE_NAME?.trim() || defaultNameFromEmail(email);
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) throw new Error("RESEND_API_KEY is required.");

  const from = process.env.EMAIL_FROM?.trim() || "LOVEDIS <noreply@lovedis.de>";
  const resend = new Resend(apiKey);
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const now = new Date();
    const password = generatePassword();
    const passwordHash = await bcrypt.hash(password, 10);

    const existing = await client.query(`SELECT id FROM "User" WHERE email = $1`, [
      email,
    ]);

    if (existing.rowCount && existing.rowCount > 0) {
      const id = existing.rows[0].id as string;
      await client.query(
        `UPDATE "User"
         SET name = $2, role = 'ADMIN', "passwordHash" = $3, "isActive" = true,
             company = COALESCE(company, 'LOVEDIS'), "approvedAt" = COALESCE("approvedAt", $4),
             "mustChangePassword" = true, "updatedAt" = $4
         WHERE id = $1`,
        [id, name, passwordHash, now]
      );
    } else {
      const id = cuid("usr");
      await client.query(
        `INSERT INTO "User"
           (id, email, "passwordHash", name, role, "isActive", company, "approvedAt",
            "mustChangePassword", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, 'ADMIN', true, 'LOVEDIS', $5, true, $5, $5)`,
        [id, email, passwordHash, name, now]
      );
    }

    const { data, error } = await resend.emails.send({
      from,
      to: email,
      subject: "Dein LOVEDIS Admin-Zugang",
      text: buildEmail(name, email, password),
    });

    if (error) throw new Error(`${error.name}: ${error.message}`);

    console.log(`✓ ${email} — ADMIN — Resend ${data?.id ?? "sent"}`);
    console.log(`Login-URL: ${LOGIN_URL}/login`);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
