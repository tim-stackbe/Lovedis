import { sendEmail, type EmailSendResult } from "@/lib/email";

function buildLoginUrl(): string {
  const base = (
    process.env.NEXTAUTH_URL ?? "http://localhost:3000"
  ).replace(/\/$/, "");
  return `${base}/login?callbackUrl=/change-password`;
}

/**
 * Sends a startup onboarding email with a temporary password. The account is
 * provisioned with `mustChangePassword = true`; the invitee sets their own
 * password on first login.
 */
export async function sendStartupInvitationEmail(opts: {
  to: string;
  name: string;
  startupName?: string;
  tempPassword: string;
  loginUrl?: string;
}): Promise<EmailSendResult> {
  const loginUrl = opts.loginUrl ?? buildLoginUrl();
  const greeting = opts.name.trim() ? `Hallo ${opts.name},` : "Hallo,";
  const startupLine = opts.startupName?.trim()
    ? `Wir haben dir ein Startup-Konto für ${opts.startupName} auf LOVEDIS eingerichtet.\n\n`
    : `Wir haben dir ein Startup-Konto auf LOVEDIS eingerichtet.\n\n`;

  return sendEmail({
    to: opts.to,
    subject: "Dein LOVEDIS Startup-Zugang",
    text:
      `${greeting}\n\n` +
      `${startupLine}` +
      `Melde dich mit den folgenden Zugangsdaten an:\n\n` +
      `Anmelden:\n${loginUrl}\n\n` +
      `E-Mail: ${opts.to}\n` +
      `Temporäres Passwort: ${opts.tempPassword}\n\n` +
      `Bei der ersten Anmeldung legst du dein eigenes Passwort fest. ` +
      `Das temporäre Passwort ist danach ungültig.\n\n` +
      `Bei Fragen erreichst du uns jederzeit — wir freuen uns auf die Zusammenarbeit.\n\n` +
      `Viele Grüße\nDein LOVEDIS-Team`,
  });
}
