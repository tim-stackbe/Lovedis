import { sendEmail, type EmailSendResult } from "@/lib/email";

function buildLoginUrl(): string {
  const base = (
    process.env.NEXTAUTH_URL ?? "http://localhost:3000"
  ).replace(/\/$/, "");
  return `${base}/login`;
}

/**
 * Sends the partner "Zugang eingerichtet" invitation email. The invited account
 * is created immediately with a temporary single-sign-on password and the
 * first-login password-change gate (`mustChangePassword = true`); this email
 * hands the invitee their login URL, email and that temporary password, and
 * tells them they will set their own password on first login. Delivery failures
 * are logged by the email adapter; callers should not block provisioning on a
 * failed send.
 */
export async function sendPartnerInvitationEmail(opts: {
  to: string;
  /** Display name of the invited person. */
  name: string;
  /** Company/partner account the invitee is being added to. */
  companyName: string;
  /** Name of the person who invited them (for a personal greeting). */
  invitedByName?: string;
  /** The temporary single-sign-on password to include in the email. */
  tempPassword: string;
  loginUrl?: string;
}): Promise<EmailSendResult> {
  const loginUrl = opts.loginUrl ?? buildLoginUrl();
  const greeting = opts.name.trim() ? `Hallo ${opts.name},` : "Hallo,";
  const invitedBy = opts.invitedByName?.trim()
    ? `${opts.invitedByName} hat dich`
    : "Du wurdest";

  return sendEmail({
    to: opts.to,
    subject: `Dein Zugang zu ${opts.companyName} auf Lovedis`,
    text:
      `${greeting}\n\n` +
      `${invitedBy} zum Team von ${opts.companyName} auf Lovedis eingeladen. ` +
      `Wir haben dir bereits ein Konto eingerichtet — du kannst dich sofort anmelden.\n\n` +
      `Anmelden:\n${loginUrl}\n\n` +
      `E-Mail: ${opts.to}\n` +
      `Temporäres Passwort: ${opts.tempPassword}\n\n` +
      `Aus Sicherheitsgründen wirst du bei der ersten Anmeldung aufgefordert, ` +
      `ein eigenes Passwort festzulegen. Das temporäre Passwort ist danach ungültig.\n\n` +
      `Bei Fragen erreichst du uns jederzeit — wir freuen uns auf die Zusammenarbeit.\n\n` +
      `Viele Grüße\nDein Lovedis-Team`,
  });
}
