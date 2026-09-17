/**
 * Provision STARTUP accounts with a one-time temp password and email invites.
 * Idempotent: re-run updates password + resends email for listed recipients.
 *
 * Usage (Hetzner TEST — run inside platform container):
 *   CONFIRM_STARTUP_INVITES=1 npx tsx prisma/provision-startup-invites.ts
 *
 * Optional env:
 *   NEXTAUTH_URL=https://app.49.13.222.76.nip.io
 *   RESEND_API_KEY=…  (falls nicht via sendEmail/.env gesetzt)
 */
import { randomBytes, randomInt } from "node:crypto";
import pg from "pg";
import bcrypt from "bcryptjs";
import { Resend } from "resend";

const LOGIN_URL =
  process.env.NEXTAUTH_URL?.replace(/\/$/, "") ??
  "https://app.49.13.222.76.nip.io";

interface Recipient {
  email: string;
  name: string;
  /** Match existing Startup.name (normalized) or create if missing. */
  startupName: string;
  /** When false, user is provisioned but not linked as Startup owner. */
  linkAsOwner?: boolean;
  /** Used only when the startup row must be created. */
  startupMeta?: {
    website?: string;
    description: string;
    industry: string;
  };
}

const RECIPIENTS: Recipient[] = [
  {
    email: "soeren.mueller@industryimpact.eu",
    name: "Sören Müller",
    startupName: "Industry Impact",
    startupMeta: {
      website: "https://industryimpact.eu",
      description:
        "Industry Impact — Teilnehmendes Startup am LOVEDIS Industrie-Programm.",
      industry: "Industrie",
    },
  },
  {
    email: "etienne@lytra.ai",
    name: "Etienne Fieg",
    startupName: "lytra",
    linkAsOwner: true,
    startupMeta: {
      website: "https://www.lytra.ai",
      description:
        "lytra ist das KI-Betriebssystem für den After-Sales im Maschinenbau.",
      industry: "Industrie",
    },
  },
  {
    email: "marcus.lange@vsight.de",
    name: "Marcus Lange",
    startupName: "VSight",
    linkAsOwner: true,
    startupMeta: {
      website: "https://vsight.de",
      description:
        "VSight ist ein Anbieter innovativer Lösungen für digitale Industrieprozesse.",
      industry: "Industrie",
    },
  },
  {
    email: "christine.lutz@great2know.de",
    name: "Christine Lutz",
    startupName: "Great2Know",
    startupMeta: {
      website: "https://great2know.de",
      description:
        "Great2Know — Teilnehmendes Startup am LOVEDIS Industrie-Programm.",
      industry: "Industrie",
    },
  },
  {
    email: "r.golomidov@credular.de",
    name: "Roman Golomidov",
    startupName: "Credular",
    startupMeta: {
      website: "https://credular.de",
      description:
        "Credular — Teilnehmendes Startup am LOVEDIS Industrie-Programm.",
      industry: "Industrie",
    },
  },
  {
    email: "momo@elephantcompany.com",
    name: "Maurice Zomorrodi",
    startupName: "Elephant Company",
    startupMeta: {
      website: "https://elephantcompany.com",
      description:
        "Elephant Company — Teilnehmendes Startup am LOVEDIS Industrie-Programm.",
      industry: "Industrie",
    },
  },
  {
    email: "jan.poguntke@lytra.de",
    name: "Jan Poguntke",
    startupName: "lytra",
    linkAsOwner: false,
  },
  {
    email: "max@stryza.com",
    name: "Max Steinhoff",
    startupName: "Stryza",
    linkAsOwner: true,
    startupMeta: {
      website: "https://de.stryza.com",
      description:
        "Stryza ist eine KI-basierte Plattform für operatives Workflow- und Kompetenzmanagement in der Produktion.",
      industry: "Industrie",
    },
  },
  {
    email: "markus@startandgrow.me",
    name: "Markus Keller",
    startupName: "Start and Grow",
    startupMeta: {
      website: "https://startandgrow.me",
      description:
        "Start and Grow — Teilnehmendes Startup am LOVEDIS Industrie-Programm.",
      industry: "Industrie",
    },
  },
  {
    email: "alex.abletshauser@epinoia.ai",
    name: "Alex Abletshauser",
    startupName: "Epinoia",
    linkAsOwner: true,
    startupMeta: {
      website: "https://epinoia.ai",
      description:
        "EPINOIA ist eine KI-gestützte Wissensmanagement-Software mit Fokus auf den technischen Mittelstand.",
      industry: "Industrie",
    },
  },
  {
    email: "friwi@epinoia.ai",
    name: "FriWi Reese",
    startupName: "Epinoia",
    linkAsOwner: false,
  },
  {
    email: "sara.jourdan@genow.ai",
    name: "Sara Jourdan",
    startupName: "Genow",
    linkAsOwner: true,
    startupMeta: {
      website: "https://genow.ai",
      description:
        "Genow ist eine KI-Plattform für komplexes und verteiltes Unternehmenswissen.",
      industry: "Industrie",
    },
  },
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

function cuid(prefix: string): string {
  return `${prefix}_${randomBytes(10).toString("hex")}`;
}

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function buildEmail(
  name: string,
  email: string,
  password: string,
  startupName: string,
  teamMember = false
): string {
  const greeting = name.trim() ? `Hallo ${name},` : "Hallo,";
  const accountLine = teamMember
    ? `Wir haben dir ein Teammitglied-Konto für ${startupName} auf LOVEDIS eingerichtet.\n\n`
    : `Wir haben dir ein Startup-Konto für ${startupName} auf LOVEDIS eingerichtet.\n\n`;
  return (
    `${greeting}\n\n` +
    accountLine +
    `Melde dich mit den folgenden Zugangsdaten an:\n\n` +
    `Anmelden:\n${LOGIN_URL}/login?callbackUrl=/change-password\n\n` +
    `E-Mail: ${email}\n` +
    `Temporäres Passwort: ${password}\n\n` +
    `Bei der ersten Anmeldung legst du dein eigenes Passwort fest. ` +
    `Das temporäre Passwort ist danach ungültig.\n\n` +
    `Bei Fragen erreichst du uns jederzeit — wir freuen uns auf die Zusammenarbeit.\n\n` +
    `Viele Grüße\nDein LOVEDIS-Team`
  );
}

async function findStartupByName(
  client: pg.Client,
  startupName: string
): Promise<{ id: string; name: string; ownerUserId: string | null } | null> {
  const norm = normalizeName(startupName);
  const all = await client.query(
    `SELECT id, name, "ownerUserId" FROM "Startup"`
  );
  for (const row of all.rows) {
    if (normalizeName(row.name as string) === norm) {
      return {
        id: row.id as string,
        name: row.name as string,
        ownerUserId: row.ownerUserId as string | null,
      };
    }
  }
  return null;
}

async function ensureStartup(
  client: pg.Client,
  spec: Recipient,
  now: Date
): Promise<{ id: string; name: string; ownerUserId: string | null }> {
  const existing = await findStartupByName(client, spec.startupName);
  if (existing) return existing;

  const meta = spec.startupMeta;
  if (!meta) {
    throw new Error(
      `Startup "${spec.startupName}" fehlt in der DB und hat kein startupMeta.`
    );
  }

  const id = cuid("su");
  await client.query(
    `INSERT INTO "Startup"
       (id, name, website, description, industry, stage, "pipelineStage",
        "isPublished", "seekingFunding", "lookingFor", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, 'SEED', 'SCREENING', false, false, '{}', $6, $6)`,
    [
      id,
      spec.startupName,
      meta.website ?? null,
      meta.description,
      meta.industry,
      now,
    ]
  );
  console.log(`  + Startup angelegt: ${spec.startupName}`);
  return { id, name: spec.startupName, ownerUserId: null };
}

async function upsertStartupUser(
  client: pg.Client,
  spec: Recipient,
  passwordHash: string,
  now: Date
): Promise<string> {
  const email = spec.email.toLowerCase();
  const existing = await client.query(`SELECT id FROM "User" WHERE email = $1`, [
    email,
  ]);

  if (existing.rowCount && existing.rowCount > 0) {
    const id = existing.rows[0].id as string;
    await client.query(
      `UPDATE "User"
       SET name = $2, role = 'STARTUP', "passwordHash" = $3, "isActive" = true,
           "approvedAt" = COALESCE("approvedAt", $4), "mustChangePassword" = true,
           "updatedAt" = $4
       WHERE id = $1`,
      [id, spec.name, passwordHash, now]
    );
    return id;
  }

  const id = cuid("usr");
  await client.query(
    `INSERT INTO "User"
       (id, email, "passwordHash", name, role, "isActive", "approvedAt",
        "mustChangePassword", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, 'STARTUP', true, $5, true, $5, $5)`,
    [id, email, passwordHash, spec.name, now]
  );
  return id;
}

async function main() {
  if (process.env.CONFIRM_STARTUP_INVITES !== "1") {
    console.log("Abbruch: Setze CONFIRM_STARTUP_INVITES=1.");
    return;
  }
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) throw new Error("RESEND_API_KEY is required.");

  const from = process.env.EMAIL_FROM?.trim() || "LOVEDIS <noreply@lovedis.de>";
  const resend = new Resend(apiKey);
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const now = new Date();
    const filter = process.env.INVITE_EMAIL?.trim().toLowerCase();
    const recipients = filter
      ? RECIPIENTS.filter((r) => r.email.toLowerCase() === filter)
      : RECIPIENTS;
    if (recipients.length === 0) {
      throw new Error(`Kein Empfänger für INVITE_EMAIL=${filter}`);
    }
    console.log(`Provisioniere ${recipients.length} Startup-Zugang/Zugänge…`);

    for (const spec of recipients) {
      const email = spec.email.toLowerCase();
      const password = generatePassword();
      const passwordHash = await bcrypt.hash(password, 10);
      const userId = await upsertStartupUser(client, spec, passwordHash, now);

      const linkAsOwner = spec.linkAsOwner !== false;
      if (linkAsOwner) {
        const startup = await ensureStartup(client, spec, now);
        if (startup.ownerUserId && startup.ownerUserId !== userId) {
          console.warn(
            `  ⚠ ${email}: Startup "${startup.name}" hat bereits Owner ${startup.ownerUserId}`
          );
        } else if (!startup.ownerUserId) {
          await client.query(
            `UPDATE "Startup" SET "ownerUserId" = $2, "updatedAt" = $3 WHERE id = $1`,
            [startup.id, userId, now]
          );
        }
      }

      const { data, error } = await resend.emails.send({
        from,
        to: email,
        subject: "Dein LOVEDIS Startup-Zugang",
        text: buildEmail(
          spec.name,
          email,
          password,
          spec.startupName,
          !linkAsOwner
        ),
      });

      if (error) {
        throw new Error(`${email}: ${error.name}: ${error.message}`);
      }

      console.log(
        `✓ ${email} — ${spec.startupName}${linkAsOwner ? " (Owner)" : " (Team)"} — Resend ${data?.id ?? "sent"}`
      );
    }

    console.log(`\nLogin-URL: ${LOGIN_URL}/login`);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
