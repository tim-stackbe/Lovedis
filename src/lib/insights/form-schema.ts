import { z } from "zod";

// Shared zod helpers for the KPI-Insights forms (empty inputs mean "not set").

export const emptyToUndefined = (v: unknown) =>
  v === null || v === undefined || (typeof v === "string" && v.trim() === "") ? undefined : v;

export const optionalInt = (max: number) =>
  z.preprocess(
    emptyToUndefined,
    z.coerce
      .number({ message: "Bitte eine Zahl eingeben." })
      .int("Bitte eine ganze Zahl eingeben.")
      .min(0, "Werte dürfen nicht negativ sein.")
      .max(max, `Höchstens ${max.toLocaleString("de-DE")}.`)
      .optional()
  );

export const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Datum im Format JJJJ-MM-TT angeben.")
  .refine((s) => !Number.isNaN(Date.parse(`${s}T00:00:00Z`)), "Ungültiges Datum.");

export const optionalDate = z.preprocess(emptyToUndefined, dateString.optional());

export const optionalText = (max: number) =>
  z.preprocess(emptyToUndefined, z.string().trim().max(max, `Höchstens ${max} Zeichen.`).optional());

export const optionalId = z.preprocess(emptyToUndefined, z.string().min(1).max(64).optional());

export const optionalEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z.preprocess(emptyToUndefined, z.enum(values).optional());

export const checkbox = z.preprocess((v) => v === "on" || v === "true", z.boolean());

export function toDate(s: string | undefined): Date | null {
  return s ? new Date(`${s}T00:00:00.000Z`) : null;
}

export function formObject(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of fd.entries()) {
    if (typeof value === "string") out[key] = value;
  }
  return out;
}

export type ParseResult<T> = { data: T; error?: undefined } | { data?: undefined; error: string };

export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Ungültige Eingabe.";
}
