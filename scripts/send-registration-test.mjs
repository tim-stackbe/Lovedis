#!/usr/bin/env node
/**
 * One-off: send a registration confirmation email (same content as production).
 * Usage: node scripts/send-registration-test.mjs [email] [name]
 * Requires RESEND_API_KEY and optionally EMAIL_FROM, NEXTAUTH_URL in env.
 */
import { Resend } from "resend";

const to = process.argv[2] ?? "tim.meggert@lovedis.de";
const name = process.argv[3] ?? "Tim";
const from =
  process.env.EMAIL_FROM?.trim() || "Lovedis <noreply@lovedis.de>";
const base = (
  process.env.NEXTAUTH_URL ?? "http://localhost:3000"
).replace(/\/$/, "");
const loginUrl = `${base}/login`;
const greeting = name.trim() ? `Hallo ${name},` : "Hallo,";
const text =
  `${greeting}\n\n` +
  `willkommen bei Lovedis! Dein Konto wurde erfolgreich angelegt.\n\n` +
  `Du kannst dich ab sofort mit deiner E-Mail-Adresse anmelden:\n` +
  `${loginUrl}\n\n` +
  `Bei Fragen erreichst du uns jederzeit — wir freuen uns auf die Zusammenarbeit.\n\n` +
  `Viele Grüße\nDein Lovedis-Team`;

const apiKey = process.env.RESEND_API_KEY?.trim();
if (!apiKey) {
  console.error("RESEND_API_KEY is not set");
  process.exit(1);
}

const client = new Resend(apiKey);
const { data, error } = await client.emails.send({
  from,
  to,
  subject: "Willkommen bei Lovedis — Registrierung bestätigt",
  text,
});

if (error) {
  console.error("Send failed:", error.name, error.message);
  process.exit(1);
}

console.log("Sent registration confirmation to", to, "id:", data?.id ?? "(none)");
