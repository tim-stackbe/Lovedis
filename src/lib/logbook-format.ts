// Client-safe Logbuch helpers (no Prisma import). Dates are formatted in a
// fixed time zone so server render and client hydration produce the same text.

const TIME_ZONE = "Europe/Berlin";
const DAY_MS = 24 * 60 * 60 * 1000;

export const FORMER_MEMBER_NAME = "Ehemaliges Teammitglied";

export function formatLogDateTime(date: Date | string): string {
  return new Date(date).toLocaleString("de-DE", {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatLogDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("de-DE", {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** "vor 3 Tagen" / "in 2 Stunden", relative to an explicit `now` (hydration-safe). */
export function formatRelative(date: Date | string, now: number): string {
  const diffSec = Math.round((new Date(date).getTime() - now) / 1000);
  const abs = Math.abs(diffSec);
  const rtf = new Intl.RelativeTimeFormat("de", { numeric: "auto" });
  if (abs < 60) return "gerade eben";
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diffSec / 86400), "day");
  if (abs < 86400 * 365) {
    return rtf.format(Math.round(diffSec / (86400 * 30)), "month");
  }
  return rtf.format(Math.round(diffSec / (86400 * 365)), "year");
}

/** Whole days between `date` and `now` (never negative). */
export function daysSince(date: Date | string, now: number): number {
  return Math.max(0, Math.floor((now - new Date(date).getTime()) / DAY_MS));
}

/** "Letzter Kontakt vor 3 Tagen" (or the empty-state text). */
export function lastContactText(at: Date | string | null, now: number): string {
  if (!at) return "Noch kein Kontakt erfasst";
  const days = daysSince(at, now);
  if (days === 0) return "Letzter Kontakt heute";
  return days === 1
    ? "Letzter Kontakt vor 1 Tag"
    : `Letzter Kontakt vor ${days} Tagen`;
}

/** Stable month bucket key ("2026-10") in the display time zone. */
export function monthKey(date: Date | string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date(date));
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  return `${y}-${m}`;
}

export function monthLabel(date: Date | string): string {
  return new Date(date).toLocaleDateString("de-DE", {
    timeZone: TIME_ZONE,
    month: "long",
    year: "numeric",
  });
}

const pad = (n: number) => String(n).padStart(2, "0");

/** `<input type="datetime-local">` value in the BROWSER's local time. */
export function toLocalDateTimeInput(date: Date | string): string {
  const d = new Date(date);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** `<input type="date">` value in the BROWSER's local time. */
export function toLocalDateInput(date: Date | string): string {
  return toLocalDateTimeInput(date).slice(0, 10);
}

/** Local datetime-local value to ISO (empty stays empty: server uses now). */
export function localDateTimeToIso(value: string): string {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

/**
 * Local date value to ISO at the END of that local day, so a follow-up only
 * counts as overdue once its whole due day has passed.
 */
export function localDateToIso(value: string): string {
  if (!value) return "";
  const d = new Date(`${value}T23:59:59`);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}
