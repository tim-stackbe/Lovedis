import { sendEmail, type EmailSendResult } from "@/lib/email";

function buildLoginUrl(): string {
  const base = (
    process.env.NEXTAUTH_URL ?? "http://localhost:3000"
  ).replace(/\/$/, "");
  return `${base}/login`;
}

/**
 * Sends the standard registration confirmation after a Lovedis account is
 * created. Failures are logged by the email adapter; callers should not
 * block user creation on a failed send.
 */
export async function sendRegistrationConfirmationEmail(opts: {
  to: string;
  name: string;
  loginUrl?: string;
}): Promise<EmailSendResult> {
  const loginUrl = opts.loginUrl ?? buildLoginUrl();
  const greeting = opts.name.trim() ? `Hallo ${opts.name},` : "Hallo,";

  return sendEmail({
    to: opts.to,
    subject: "Willkommen bei Lovedis — Registrierung bestätigt",
    text:
      `${greeting}\n\n` +
      `willkommen bei Lovedis! Dein Konto wurde erfolgreich angelegt.\n\n` +
      `Du kannst dich ab sofort mit deiner E-Mail-Adresse anmelden:\n` +
      `${loginUrl}\n\n` +
      `Bei Fragen erreichst du uns jederzeit — wir freuen uns auf die Zusammenarbeit.\n\n` +
      `Viele Grüße\nDein Lovedis-Team`,
  });
}
