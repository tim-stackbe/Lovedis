/**
 * Regenerates passwords for restored accounts and emails credentials via Resend.
 *
 * Usage:
 *   CONFIRM_SEND_CREDENTIALS=1 DATABASE_URL=<target> RESEND_API_KEY=<key> \
 *     NEXTAUTH_URL=https://app.lovedis.de npx tsx prisma/send-restored-credentials.ts
 */
import pg from "pg";
import bcrypt from "bcryptjs";
import { randomInt } from "node:crypto";
import { Resend } from "resend";

const LOWER = "abcdefghijkmnpqrstuvwxyz";
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const DIGITS = "23456789";
const SYMBOLS = "!@#$%*?";
const ALL = LOWER + UPPER + DIGITS;

function pick(alphabet: string): string {
  return alphabet[randomInt(alphabet.length)];
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

const RECIPIENTS: { email: string; name: string }[] = [
  { email: "tim.meggert@lovedis.de", name: "Tim" },
  { email: "polina.kon@lovedis.de", name: "Polina" },
  { email: "linda.koepper@lovedis.de", name: "Linda" },
  { email: "partner.test@lovedis.de", name: "Partner Test" },
  { email: "startup.test@lovedis.de", name: "Startup Test" },
];

function loginUrl(): string {
  const base = (
    process.env.NEXTAUTH_URL ??
    process.env.PROD_NEXTAUTH_URL ??
    "https://app.lovedis.de"
  ).replace(/\/$/, "");
  return `${base}/login`;
}

function buildEmail(name: string, email: string, password: string): string {
  return (
    `Hallo ${name},\n\n` +
    `dein LOVEDIS-Plattform-Zugang wurde wiederhergestellt. ` +
    `Bitte melde dich mit den folgenden Zugangsdaten an und ändere dein Passwort ` +
    `anschließend unter Einstellungen (oder nutze „Passwort vergessen“, falls nötig).\n\n` +
    `Login: ${loginUrl()}\n` +
    `E-Mail: ${email}\n` +
    `Neues Passwort: ${password}\n\n` +
    `Bei Fragen melde dich beim LOVEDIS-Team.\n\n` +
    `Viele Grüße\nDein LOVEDIS-Team`
  );
}

async function main() {
  if (process.env.CONFIRM_SEND_CREDENTIALS !== "1") {
    console.log("Abbruch: Setze CONFIRM_SEND_CREDENTIALS=1.");
    return;
  }
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) throw new Error("RESEND_API_KEY is required.");

  const from = process.env.EMAIL_FROM?.trim() || "LOVEDIS <noreply@lovedis.de>";
  const resend = new Resend(apiKey);
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const results: { email: string; ok: boolean; id?: string; error?: string }[] = [];

  try {
    for (const recipient of RECIPIENTS) {
      const exists = await client.query(`SELECT id FROM "User" WHERE email = $1`, [
        recipient.email,
      ]);
      if (!exists.rowCount) {
        results.push({ email: recipient.email, ok: false, error: "user not found" });
        continue;
      }

      const password = generatePassword();
      const hash = await bcrypt.hash(password, 10);
      await client.query(
        `UPDATE "User" SET "passwordHash" = $2, "updatedAt" = NOW() WHERE email = $1`,
        [recipient.email, hash]
      );

      const { data, error } = await resend.emails.send({
        from,
        to: recipient.email,
        subject: "LOVEDIS — Dein wiederhergestellter Plattform-Zugang",
        text: buildEmail(recipient.name, recipient.email, password),
      });

      if (error) {
        results.push({
          email: recipient.email,
          ok: false,
          error: `${error.name}: ${error.message}`,
        });
      } else {
        results.push({ email: recipient.email, ok: true, id: data?.id });
        console.log(`✓ ${recipient.email} — Resend ${data?.id ?? "sent"}`);
      }
    }
  } finally {
    await client.end();
  }

  const failed = results.filter((r) => !r.ok);
  if (failed.length) {
    console.error("Fehler:", failed);
    process.exit(1);
  }
  console.log(`Fertig: ${results.length} E-Mails versendet.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
