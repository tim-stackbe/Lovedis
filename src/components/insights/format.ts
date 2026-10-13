/** "42 %" for a 0..1 share, or "n. v." when there is no base. */
export function formatRate(value: number | null): string {
  return value === null ? "n. v." : `${Math.round(value * 100)} %`;
}
