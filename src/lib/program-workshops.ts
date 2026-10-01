import { z } from "zod";

// ---------------------------------------------------------------------------
// Program workshops — the per-session details of a workshop series, stored as
// JSON on Program.workshops. `description` is plain text: blank lines separate
// paragraphs, a leading "### " marks a sub-heading and **…** marks bold text.
// ---------------------------------------------------------------------------

export const workshopSchema = z.object({
  title: z.string().min(1),
  /** ISO date, e.g. "2026-11-12". */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  /** Local start time, e.g. "11:00". */
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  format: z.enum(["ONLINE", "ON_SITE"]).optional(),
  location: z.string().optional(),
  locationUrl: z.url().optional(),
  description: z.string().optional(),
});

export type ProgramWorkshop = z.infer<typeof workshopSchema>;

export const WORKSHOP_FORMAT_LABELS: Record<
  NonNullable<ProgramWorkshop["format"]>,
  string
> = {
  ONLINE: "Online",
  ON_SITE: "Vor Ort",
};

/** Parses the Program.workshops JSON; invalid entries are dropped. */
export function parseWorkshops(value: unknown): ProgramWorkshop[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const parsed = workshopSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}

/** Detailed workshops when present, otherwise the bare `sessions` titles. */
export function programWorkshops(program: {
  workshops: unknown;
  sessions: string[];
}): ProgramWorkshop[] {
  const detailed = parseWorkshops(program.workshops);
  return detailed.length > 0
    ? detailed
    : program.sessions.map((title) => ({ title }));
}

const WEEKDAYS = ["So.", "Mo.", "Di.", "Mi.", "Do.", "Fr.", "Sa."];

/** "Do., 12.11.2026 · 11:00 Uhr" — or null when no date is set. */
export function formatWorkshopWhen(workshop: ProgramWorkshop): string | null {
  if (!workshop.date) return null;
  const [y, m, d] = workshop.date.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  const date = `${weekday}, ${String(d).padStart(2, "0")}.${String(m).padStart(2, "0")}.${y}`;
  return workshop.startTime ? `${date} · ${workshop.startTime} Uhr` : date;
}

export type DescriptionBlock =
  | { kind: "heading"; text: string }
  | { kind: "paragraph"; segments: { text: string; bold: boolean }[] };

/** Splits a workshop description into headings and paragraphs with bold runs. */
export function parseDescription(text: string): DescriptionBlock[] {
  return text
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      if (block.startsWith("### ")) {
        return { kind: "heading" as const, text: block.slice(4).trim() };
      }
      const segments = block
        .split(/(\*\*[^*]+\*\*)/)
        .filter(Boolean)
        .map((part) =>
          part.startsWith("**") && part.endsWith("**")
            ? { text: part.slice(2, -2), bold: true }
            : { text: part, bold: false }
        );
      return { kind: "paragraph" as const, segments };
    });
}
