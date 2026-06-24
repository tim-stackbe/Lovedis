// ---------------------------------------------------------------------------
// Email abstraction.
//
// No email provider is wired in this repo yet. All sending goes through the
// small `EmailAdapter` interface below so a real provider (Resend / Postmark /
// SES / SMTP) can be dropped in later without touching call sites. The default
// adapter just logs to the console (no-op), so the in-app flows work end to end
// in development without any secrets.
//
// To wire a real provider: implement `EmailAdapter.send`, set the relevant
// env vars (e.g. RESEND_API_KEY) and return the provider adapter from
// `getEmailAdapter()`. See docs/mara-implementation-notes.md.
// ---------------------------------------------------------------------------

export interface EmailMessage {
  to: string;
  subject: string;
  /** Plain-text body (kept simple; HTML is a later concern). */
  text: string;
}

export interface EmailSendResult {
  ok: boolean;
  /** Provider message id when available; the adapter name otherwise. */
  id: string;
}

export interface EmailAdapter {
  readonly name: string;
  send(message: EmailMessage): Promise<EmailSendResult>;
}

/**
 * Default no-op adapter: logs the message instead of sending it. Safe for
 * local/dev and CI; clearly flagged so it is never mistaken for real delivery.
 */
export const consoleEmailAdapter: EmailAdapter = {
  name: "console",
  async send(message) {
    console.info(
      `[email:console] (kein echter Versand) → ${message.to} · ${message.subject}\n${message.text}`
    );
    return { ok: true, id: `console-${Date.now()}` };
  },
};

/**
 * Returns the active email adapter. Swap the implementation here once a
 * provider is configured. Falls back to the console adapter.
 */
export function getEmailAdapter(): EmailAdapter {
  // Example future wiring:
  //   if (process.env.RESEND_API_KEY) return resendAdapter;
  return consoleEmailAdapter;
}

export async function sendEmail(
  message: EmailMessage
): Promise<EmailSendResult> {
  return getEmailAdapter().send(message);
}
