import { z } from "zod";
import {
  CONTENT_CHANNELS,
  CONTENT_FORMATS,
  type ContentStatus,
} from "./constants";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((s) => (s === "" ? null : s))
    .nullable();

export const contentFormSchema = z.object({
  id: z.string().trim().min(1).nullable(),
  title: z.string().trim().min(3, "Titel mit mindestens 3 Zeichen angeben.").max(200),
  body: optionalText(5000),
  channel: z.enum(CONTENT_CHANNELS, { message: "Kanal auswählen." }),
  format: z
    .union([z.enum(CONTENT_FORMATS), z.literal("")])
    .transform((f) => (f === "" ? null : f)),
  plannedFor: z
    .string()
    .trim()
    .transform((s, ctx) => {
      if (s === "") return null;
      const d = new Date(s);
      if (Number.isNaN(d.getTime())) {
        ctx.addIssue({ code: "custom", message: "Ungültiges Datum." });
        return z.NEVER;
      }
      return d;
    }),
  assigneeId: optionalText(100),
  campaign: optionalText(120),
  publishedUrl: optionalText(500).refine((u) => u === null || /^https?:\/\//i.test(u), {
    message: "Link muss mit http:// oder https:// beginnen.",
  }),
});

export type ContentFormInput = z.infer<typeof contentFormSchema>;

export function parseContentForm(fd: FormData): { data?: ContentFormInput; error?: string } {
  const str = (k: string) => {
    const v = fd.get(k);
    return typeof v === "string" ? v : "";
  };
  const parsed = contentFormSchema.safeParse({
    id: str("id") || null,
    title: str("title"),
    body: str("body"),
    channel: str("channel"),
    format: str("format"),
    plannedFor: str("plannedFor"),
    assigneeId: str("assigneeId"),
    campaign: str("campaign"),
    publishedUrl: str("publishedUrl"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Eingaben prüfen." };
  return { data: parsed.data };
}

export const CONTENT_ACTIONS = ["submit", "approve", "reject", "publish", "reopen"] as const;
export type ContentAction = (typeof CONTENT_ACTIONS)[number];

const TRANSITIONS: Record<ContentAction, { from: ContentStatus[]; to: ContentStatus }> = {
  submit: { from: ["IDEA", "DRAFT"], to: "IN_REVIEW" },
  approve: { from: ["IN_REVIEW"], to: "SCHEDULED" },
  reject: { from: ["IN_REVIEW"], to: "DRAFT" },
  publish: { from: ["SCHEDULED"], to: "PUBLISHED" },
  reopen: { from: ["SCHEDULED", "PUBLISHED"], to: "DRAFT" },
};

export const CONTENT_ACTION_LABELS: Record<ContentAction, string> = {
  submit: "Zur Freigabe",
  approve: "Freigeben",
  reject: "Zurückgeben",
  publish: "Als veröffentlicht markieren",
  reopen: "Wieder öffnen",
};

/** Target status of `action`, or null when it is not allowed from `status`. */
export function nextStatus(status: string, action: ContentAction): ContentStatus | null {
  const t = TRANSITIONS[action];
  return (t.from as string[]).includes(status) ? t.to : null;
}

export function availableActions(status: string): ContentAction[] {
  return CONTENT_ACTIONS.filter((a) => nextStatus(status, a) !== null);
}
