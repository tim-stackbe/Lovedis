/** "42 %" for a 0..1 share, or "n. v." when there is no base. */
export function formatRate(value: number | null): string {
  return value === null ? "n. v." : `${Math.round(value * 100)} %`;
}

/** "12.500 €" */
export function formatEur(value: number): string {
  return `${value.toLocaleString("de-DE")} €`;
}

/** "1 Startup" / "3 Startups" */
export function countLabel(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

/** YYYY-MM-DD for date inputs, or null. */
export function dayString(date: Date | null): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}
