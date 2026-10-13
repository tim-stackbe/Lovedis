import { z } from "zod";
import type { ProgramStatus, SupportCategory } from "@/generated/prisma/enums";
import { PROGRAM_STATUSES, SUPPORT_CATEGORIES } from "@/lib/constants";
import { workshopSchema, type ProgramWorkshop } from "@/lib/program-workshops";

// ---------------------------------------------------------------------------
// Venture Store editor (ADMIN): form validation + mapping to DB values. Kept
// free of Prisma/Next imports so it can be unit-tested directly.
// ---------------------------------------------------------------------------

export const EDITOR_PATH = "/venture-store-editor";

/** Normalizes line endings so paragraphs (blank lines) survive round trips. */
function multiline(max: number, min: number, minMessage: string) {
  return z
    .string()
    .transform((s) => s.replace(/\r\n?/g, "\n").trim())
    .pipe(
      z
        .string()
        .min(min, minMessage)
        .max(max, `Text ist zu lang (max. ${max} Zeichen).`)
    );
}

/** Optional single-line text: empty input becomes null. */
function optionalText(max: number) {
  return z
    .string()
    .trim()
    .max(max, `Eingabe ist zu lang (max. ${max} Zeichen).`)
    .transform((s) => (s === "" ? null : s));
}

const creditsSchema = z.coerce
  .number({ message: "Credits müssen eine Zahl sein." })
  .int("Credits müssen eine ganze Zahl sein.")
  .min(0, "Credits dürfen nicht negativ sein.")
  .max(1000, "Credits sind zu hoch.");

export const offeringEditorSchema = z.object({
  title: z.string().trim().min(3, "Titel ist zu kurz.").max(160, "Titel ist zu lang."),
  category: z.enum(SUPPORT_CATEGORIES as [SupportCategory, ...SupportCategory[]], {
    message: "Bitte wähle eine Kategorie.",
  }),
  summary: z.string().trim().min(3, "Teaser ist zu kurz.").max(280, "Teaser ist zu lang."),
  description: multiline(8000, 10, "Beschreibung ist zu kurz."),
  format: optionalText(120),
  providerCompany: optionalText(160),
  contactPerson: optionalText(160),
  website: optionalText(300).refine(
    (v) => v === null || /^https?:\/\/\S+$/.test(v),
    "Website muss mit http:// oder https:// beginnen."
  ),
  sessionDate: optionalText(160),
  creditCost: creditsSchema,
  isActive: z.boolean(),
});

export type OfferingEditorValues = z.infer<typeof offeringEditorSchema>;

/** Reads the offering editor form into raw values for `offeringEditorSchema`. */
export function offeringFormInput(formData: FormData) {
  return {
    title: String(formData.get("title") ?? ""),
    category: formData.get("category"),
    summary: String(formData.get("summary") ?? ""),
    description: String(formData.get("description") ?? ""),
    format: String(formData.get("format") ?? ""),
    providerCompany: String(formData.get("providerCompany") ?? ""),
    contactPerson: String(formData.get("contactPerson") ?? ""),
    website: String(formData.get("website") ?? ""),
    sessionDate: String(formData.get("sessionDate") ?? ""),
    creditCost: formData.get("creditCost") ?? "0",
    isActive: formData.get("isActive") === "on",
  };
}

/** One workshop row as edited in the form (all strings, empty = unset). */
export interface WorkshopFormRow {
  title: string;
  date: string;
  startTime: string;
  format: "" | "ONLINE" | "ON_SITE";
  location: string;
  locationUrl: string;
  description: string;
}

export function emptyWorkshopRow(): WorkshopFormRow {
  return {
    title: "",
    date: "",
    startTime: "",
    format: "",
    location: "",
    locationUrl: "",
    description: "",
  };
}

/** Stored workshop → editable form row. */
export function workshopToFormRow(w: ProgramWorkshop): WorkshopFormRow {
  return {
    title: w.title,
    date: w.date ?? "",
    startTime: w.startTime ?? "",
    format: w.format ?? "",
    location: w.location ?? "",
    locationUrl: w.locationUrl ?? "",
    description: w.description ?? "",
  };
}

export type WorkshopsResult =
  | { ok: true; workshops: ProgramWorkshop[]; sessions: string[] }
  | { ok: false; error: string };

/**
 * Converts the serialized workshop rows into the Program.workshops JSON and
 * the matching `sessions` titles (kept in sync, same order). Rows without any
 * content are skipped; every other row needs a title and valid fields.
 */
export function workshopsFromForm(raw: unknown): WorkshopsResult {
  let rows: unknown = raw;
  if (typeof raw === "string") {
    if (raw.trim() === "") rows = [];
    else {
      try {
        rows = JSON.parse(raw);
      } catch {
        return { ok: false, error: "Workshops konnten nicht gelesen werden." };
      }
    }
  }
  if (!Array.isArray(rows)) {
    return { ok: false, error: "Workshops konnten nicht gelesen werden." };
  }

  const workshops: ProgramWorkshop[] = [];
  for (const [index, row] of rows.entries()) {
    const r = (row ?? {}) as Partial<Record<keyof WorkshopFormRow, unknown>>;
    const str = (v: unknown) =>
      typeof v === "string" ? v.replace(/\r\n?/g, "\n").trim() : "";
    const candidate = {
      title: str(r.title),
      date: str(r.date) || undefined,
      startTime: str(r.startTime) || undefined,
      format: str(r.format) || undefined,
      location: str(r.location) || undefined,
      locationUrl: str(r.locationUrl) || undefined,
      description: str(r.description) || undefined,
    };
    const hasContent = Object.values(candidate).some(Boolean);
    if (!hasContent) continue;

    const label = `Workshop ${index + 1}`;
    if (!candidate.title) {
      return { ok: false, error: `${label}: Titel fehlt.` };
    }
    const parsed = workshopSchema.safeParse(candidate);
    if (!parsed.success) {
      const field = parsed.error.issues[0]?.path[0];
      const messages: Record<string, string> = {
        date: "Datum ist ungültig.",
        startTime: "Uhrzeit ist ungültig (HH:MM).",
        format: "Bitte Online oder Vor Ort wählen.",
        locationUrl: "Location-Link muss eine gültige URL sein.",
      };
      return {
        ok: false,
        error: `${label}: ${messages[String(field)] ?? "Eingabe ist ungültig."}`,
      };
    }
    const clean = Object.fromEntries(
      Object.entries(parsed.data).filter(([, v]) => v !== undefined)
    ) as ProgramWorkshop;
    workshops.push(clean);
  }

  return { ok: true, workshops, sessions: workshops.map((w) => w.title) };
}

export const programEditorSchema = z.object({
  title: z.string().trim().min(3, "Titel ist zu kurz.").max(160, "Titel ist zu lang."),
  summary: z.string().trim().min(3, "Teaser ist zu kurz.").max(280, "Teaser ist zu lang."),
  description: multiline(8000, 10, "Beschreibung ist zu kurz."),
  focusTags: z
    .string()
    .max(500, "Fokus-Tags sind zu lang.")
    .transform((raw) => splitTags(raw)),
  status: z.enum(PROGRAM_STATUSES as [ProgramStatus, ...ProgramStatus[]], {
    message: "Bitte wähle einen Status.",
  }),
  contactPerson: optionalText(160),
  sessionDate: optionalText(160),
  format: optionalText(160),
  comingSoon: z.boolean(),
  fixCreditCost: creditsSchema,
});

export type ProgramEditorValues = z.infer<typeof programEditorSchema>;

/** Reads the program editor form into raw values for `programEditorSchema`. */
export function programFormInput(formData: FormData) {
  return {
    title: String(formData.get("title") ?? ""),
    summary: String(formData.get("summary") ?? ""),
    description: String(formData.get("description") ?? ""),
    focusTags: String(formData.get("focusTags") ?? ""),
    status: formData.get("status"),
    contactPerson: String(formData.get("contactPerson") ?? ""),
    sessionDate: String(formData.get("sessionDate") ?? ""),
    format: String(formData.get("format") ?? ""),
    comingSoon: formData.get("comingSoon") === "on",
    fixCreditCost: formData.get("fixCreditCost") ?? "0",
  };
}

export function splitTags(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 12);
}

/**
 * Moves one item up or down within its (sortOrder-ordered) group and returns
 * the sortOrder updates needed. The group's existing sortOrder values are
 * reused in order, so the group keeps its position relative to other groups;
 * duplicates are spread out so the new order is unambiguous.
 */
export function reorderSortOrders(
  items: { id: string; sortOrder: number }[],
  id: string,
  direction: "up" | "down"
): { id: string; sortOrder: number }[] {
  const index = items.findIndex((i) => i.id === id);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= items.length) return [];

  const order = [...items];
  [order[index], order[target]] = [order[target], order[index]];

  const values = items.map((i) => i.sortOrder).sort((a, b) => a - b);
  for (let i = 1; i < values.length; i++) {
    if (values[i] <= values[i - 1]) values[i] = values[i - 1] + 1;
  }

  return order.flatMap((item, i) =>
    item.sortOrder === values[i] ? [] : [{ id: item.id, sortOrder: values[i] }]
  );
}
