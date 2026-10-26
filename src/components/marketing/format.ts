export function fmtInt(n: number): string {
  return n.toLocaleString("de-DE");
}

/** "+12 %" / "-3 %", or null without a comparison base. */
export function fmtChange(value: number | null): string | null {
  if (value === null) return null;
  const pct = Math.round(value * 100);
  return `${pct > 0 ? "+" : ""}${pct} %`;
}

/** One decimal for engagement rates: "4,1 %". */
export function fmtRate1(value: number | null): string {
  return value === null ? "n. v." : `${(value * 100).toLocaleString("de-DE", { maximumFractionDigits: 1, minimumFractionDigits: 1 })} %`;
}

/** Calendar days are stored as UTC midnight, so format them in UTC. */
export function fmtDay(d: Date | null, withYear = true): string {
  if (!d) return "ohne Datum";
  return d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    ...(withYear && { year: "numeric" }),
    timeZone: "UTC",
  });
}

export function fmtDateTime(d: Date | null): string {
  if (!d) return "nie";
  return d.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
  });
}
