import { sendEmail, type EmailSendResult } from "@/lib/email";
import { PASSWORD_RESET_TTL_MINUTES } from "@/lib/password-reset";

/**
 * Builds the absolute reset link. Mirrors how invitation-email derives the base
 * URL: NEXTAUTH_URL is the deployed origin (e.g. https://app.49.13.222.76.nip.io
 * on TEST), falling back to localhost for dev. The RAW token is placed in the
 * query string — it exists only in this link and is never persisted.
 */
function buildResetUrl(rawToken: string): string {
  const base = (process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(
    /\/$/,
    ""
  );
  return `${base}/reset-password?token=${encodeURIComponent(rawToken)}`;
}

/**
 * Sends the German "Passwort zurücksetzen" email with a single-use, short-lived
 * reset link. Called only when the address actually belongs to an account; the
 * request flow otherwise stays silent to avoid leaking whether an email exists.
 * Delivery failures are logged by the email adapter — callers should not block
 * or change their (neutral) response based on the send result.
 */
export async function sendPasswordResetEmail(opts: {
  to: string;
  /** Display name for a personal greeting (optional). */
  name?: string;
  /** The RAW reset token to embed in the link. */
  rawToken: string;
  resetUrl?: string;
}): Promise<EmailSendResult> {
  const resetUrl = opts.resetUrl ?? buildResetUrl(opts.rawToken);
  const greeting = opts.name?.trim() ? `Hallo ${opts.name},` : "Hallo,";

  return sendEmail({
    to: opts.to,
    subject: "Passwort zurücksetzen — Lovedis",
    text:
      `${greeting}\n\n` +
      `für dein Lovedis-Konto wurde das Zurücksetzen des Passworts angefordert. ` +
      `Über den folgenden Link kannst du ein neues Passwort festlegen:\n\n` +
      `${resetUrl}\n\n` +
      `Der Link ist aus Sicherheitsgründen nur ${PASSWORD_RESET_TTL_MINUTES} Minuten gültig ` +
      `und kann nur einmal verwendet werden.\n\n` +
      `Wenn du diese Anfrage nicht gestellt hast, kannst du diese E-Mail einfach ` +
      `ignorieren — dein Passwort bleibt dann unverändert.\n\n` +
      `Viele Grüße\nDein Lovedis-Team`,
  });
}
