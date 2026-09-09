// ---------------------------------------------------------------------------
// Email abstraction.
//
// All sending goes through the small `EmailAdapter` interface below so the
// provider can be swapped without touching call sites. When `RESEND_API_KEY`
// is set we send real email via Resend; otherwise we fall back to the console
// adapter (logs instead of sending), so in-app flows work end to end in
// development and CI without any secrets.
//
// Configuration:
//   RESEND_API_KEY  — enables real delivery via Resend when present.
//   EMAIL_FROM      — sender address (default: "Lovedis <noreply@lovedis.de>").
//                     Real delivery requires this domain to be a verified
//                     sending domain in the Resend account.
// ---------------------------------------------------------------------------

import { Resend } from "resend";

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

const DEFAULT_FROM = "Lovedis <noreply@lovedis.de>";

function fromAddress(): string {
  return process.env.EMAIL_FROM?.trim() || DEFAULT_FROM;
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
 * Resend-backed adapter. Sends real email through the Resend API. API errors
 * are caught and reported via `ok: false` so callers (reminders/cron/actions)
 * degrade gracefully instead of crashing the request.
 */
export function createResendEmailAdapter(apiKey: string): EmailAdapter {
  const client = new Resend(apiKey);
  return {
    name: "resend",
    async send(message) {
      try {
        const { data, error } = await client.emails.send({
          from: fromAddress(),
          to: message.to,
          subject: message.subject,
          text: message.text,
        });
        if (error) {
          console.error(
            `[email:resend] Versand fehlgeschlagen → ${message.to} · ${message.subject}: ${error.name}: ${error.message}`
          );
          return { ok: false, id: "resend" };
        }
        return { ok: true, id: data?.id ?? "resend" };
      } catch (err) {
        console.error(
          `[email:resend] unerwarteter Fehler → ${message.to} · ${message.subject}:`,
          err
        );
        return { ok: false, id: "resend" };
      }
    },
  };
}

/**
 * Returns the active email adapter: Resend when `RESEND_API_KEY` is set,
 * otherwise the console adapter (safe default for local/dev/CI).
 */
export function getEmailAdapter(): EmailAdapter {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (apiKey) return createResendEmailAdapter(apiKey);
  return consoleEmailAdapter;
}

export async function sendEmail(
  message: EmailMessage
): Promise<EmailSendResult> {
  return getEmailAdapter().send(message);
}
