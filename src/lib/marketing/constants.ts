import type { BadgeTone } from "@/components/ui/Badge";

export const EMAIL_CATEGORIES = [
  "INVITE",
  "PASSWORD",
  "CONTACT",
  "SUPPORT",
  "REMINDER",
  "NEWSLETTER",
  "OTHER",
] as const;
export type EmailCategory = (typeof EMAIL_CATEGORIES)[number];

export const EMAIL_CATEGORY_LABELS: Record<EmailCategory, string> = {
  INVITE: "Einladungen & Zugänge",
  PASSWORD: "Passwort zurücksetzen",
  CONTACT: "Kontaktformular Homepage",
  SUPPORT: "Support-Tickets",
  REMINDER: "Erinnerungen",
  NEWSLETTER: "Newsletter",
  OTHER: "Sonstige",
};

/** Categories whose failed deliveries mean a lost lead or an unanswered user. */
export const CRITICAL_EMAIL_CATEGORIES: EmailCategory[] = ["CONTACT", "SUPPORT"];

export const EMAIL_EVENT_LABELS: Record<string, string> = {
  queued: "In Warteschlange",
  scheduled: "Geplant",
  sent: "Versendet",
  delivered: "Zugestellt",
  delivery_delayed: "Verzögert",
  opened: "Geöffnet",
  clicked: "Geklickt",
  bounced: "Bounce",
  suppressed: "Gesperrt",
  complained: "Spam-Beschwerde",
  failed: "Fehlgeschlagen",
  canceled: "Abgebrochen",
};

export const CONTENT_STATUSES = ["IDEA", "DRAFT", "IN_REVIEW", "SCHEDULED", "PUBLISHED"] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

export const CONTENT_STATUS_CONFIG: Record<ContentStatus, { label: string; tone: BadgeTone }> = {
  IDEA: { label: "Idee", tone: "muted" },
  DRAFT: { label: "Entwurf", tone: "muted" },
  IN_REVIEW: { label: "In Freigabe", tone: "yellow" },
  SCHEDULED: { label: "Geplant", tone: "blue" },
  PUBLISHED: { label: "Veröffentlicht", tone: "mint" },
};

export const CONTENT_CHANNELS = ["LINKEDIN", "NEWSLETTER", "WEBSITE", "EVENT", "OTHER"] as const;
export type ContentChannel = (typeof CONTENT_CHANNELS)[number];

export const CONTENT_CHANNEL_LABELS: Record<ContentChannel, string> = {
  LINKEDIN: "LinkedIn",
  NEWSLETTER: "Newsletter",
  WEBSITE: "Website",
  EVENT: "Event",
  OTHER: "Sonstiges",
};

export const CONTENT_FORMATS = ["TEXT", "IMAGE", "CAROUSEL", "VIDEO", "ARTICLE", "EVENT"] as const;
export type ContentFormat = (typeof CONTENT_FORMATS)[number];

export const CONTENT_FORMAT_LABELS: Record<ContentFormat, string> = {
  TEXT: "Text",
  IMAGE: "Bild",
  CAROUSEL: "Dokument / Karussell",
  VIDEO: "Video",
  ARTICLE: "Artikel",
  EVENT: "Event",
};

export const INTEGRATION_PROVIDERS = ["RESEND", "LINKEDIN", "UMAMI", "LUMA"] as const;
export type IntegrationProvider = (typeof INTEGRATION_PROVIDERS)[number];

/** LinkedIn data older than this many days triggers an import reminder. */
export const LINKEDIN_STALE_DAYS = 8;
