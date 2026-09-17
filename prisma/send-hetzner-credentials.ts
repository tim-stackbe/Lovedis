/**
 * Reset passwords on Hetzner DB and email credentials (correct live URL).
 * Usage: CONFIRM_HETZNER_CREDENTIALS=1 npx tsx prisma/send-hetzner-credentials.ts
 */
import { execSync } from "node:child_process";
import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { Resend } from "resend";

const LOGIN_URL = "https://app.49.13.222.76.nip.io/login";
const SSH_HOST = "hetzner-lovedis";

const RECIPIENTS = [
  { email: "tim.meggert@lovedis.de", name: "Tim" },
  { email: "polina.kon@lovedis.de", name: "Polina" },
  { email: "linda.koepper@lovedis.de", name: "Linda" },
  { email: "partner.test@lovedis.de", name: "Partner Test" },
  { email: "startup.test@lovedis.de", name: "Startup Test" },
];

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

function sqlEscape(s: string): string {
  return s.replace(/'/g, "''");
}

function hetznerPsql(sql: string): void {
  execSync(
    `ssh ${SSH_HOST} 'cd /opt/lovedis && docker compose exec -T db psql -U lovedis -d lovedis -v ON_ERROR_STOP=1 -c "${sql.replace(/"/g, '\\"')}"'`,
    { stdio: "inherit" }
  );
}

function buildEmail(name: string, email: string, password: string): string {
  return (
    `Hallo ${name},\n\n` +
    `dein LOVEDIS-Plattform-Zugang ist wieder aktiv. Bitte melde dich hier an:\n\n` +
    `Login: ${LOGIN_URL}\n` +
    `E-Mail: ${email}\n` +
    `Passwort: ${password}\n\n` +
    `Bitte ändere dein Passwort nach dem Login unter Einstellungen.\n\n` +
    `Viele Grüße\nDein LOVEDIS-Team`
  );
}

async function main() {
  if (process.env.CONFIRM_HETZNER_CREDENTIALS !== "1") {
    console.log("Abbruch: Setze CONFIRM_HETZNER_CREDENTIALS=1.");
    return;
  }

  const apiKey = execSync(
    `ssh ${SSH_HOST} 'set -a && source /opt/lovedis/platform.env && printf %s "$RESEND_API_KEY"'`,
    { encoding: "utf8" }
  ).trim();
  if (!apiKey) throw new Error("RESEND_API_KEY missing on Hetzner platform.env");

  const from =
    execSync(
      `ssh ${SSH_HOST} 'set -a && source /opt/lovedis/platform.env && printf %s "${"$"}{EMAIL_FROM:-LOVEDIS <noreply@lovedis.de>}"'`,
      { encoding: "utf8" }
    ).trim() || "LOVEDIS <noreply@lovedis.de>";

  const resend = new Resend(apiKey);

  for (const r of RECIPIENTS) {
    const password = generatePassword();
    const hash = await bcrypt.hash(password, 10);
    hetznerPsql(
      `UPDATE "User" SET "passwordHash" = '${sqlEscape(hash)}', "updatedAt" = NOW() WHERE email = '${sqlEscape(r.email)}';`
    );

    const { data, error } = await resend.emails.send({
      from,
      to: r.email,
      subject: "LOVEDIS — Dein Plattform-Zugang",
      text: buildEmail(r.name, r.email, password),
    });

    if (error) throw new Error(`${r.email}: ${error.name}: ${error.message}`);
    console.log(`✓ ${r.email} — ${data?.id}`);
  }

  console.log(`\nLogin-URL: ${LOGIN_URL}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
