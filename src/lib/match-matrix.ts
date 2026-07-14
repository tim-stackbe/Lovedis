import type {
  MatchContactStatus,
  MatchUseCaseType,
  RelevanceLevel,
} from "@/generated/prisma/enums";

// ---------------------------------------------------------------------------
// Match-Matrix — pure domain helpers (no DB, no CSV parser, no server-only
// imports) so this module is safely importable from the RSC page, the client
// filter/edit components, the seed/import scripts and the unit tests alike.
//
// The heavier CSV importer (papaparse + the embedded sheet + applyMatchMatrix)
// lives in `match-matrix-import.ts` and is only pulled into scripts/tests.
// ---------------------------------------------------------------------------

/**
 * The five Lovedis corporate partners, in matrix column order. Kept as the
 * single source of truth for both the seed/import (natural key = slug) and the
 * UI column order. `sortOrder` mirrors the array index.
 */
export const PARTNER_COMPANIES = [
  { name: "FingerHaus", slug: "fingerhaus" },
  { name: "Lupp", slug: "lupp" },
  { name: "Weimer", slug: "weimer" },
  { name: "INNEXIS", slug: "innexis" },
  { name: "Sälzer", slug: "saelzer" },
] as const;

export type PartnerSlug = (typeof PARTNER_COMPANIES)[number]["slug"];

// --- Parsing / mapping ------------------------------------------------------

/** Maps the German relevance labels (Hoch/Mittel/Niedrig) to the enum. */
export function parseRelevance(raw: string | null | undefined): RelevanceLevel | null {
  const value = (raw ?? "").trim().toLowerCase();
  if (value.startsWith("hoch")) return "HIGH";
  if (value.startsWith("mittel")) return "MEDIUM";
  if (value.startsWith("niedrig")) return "LOW";
  return null;
}

// Ordered substring → enum rules. Order only matters for the canonical output
// order (see parseUseCaseTypes); matching itself is independent per rule.
const USE_CASE_RULES: { type: MatchUseCaseType; test: RegExp }[] = [
  // "Pilotprojekt", "Pilotprojekte", the "Pilotprojket" sheet typo, "Pilot".
  { type: "PILOT", test: /pilot/i },
  // "Co-Development", "Co Development", "Co-Dev".
  { type: "CO_DEVELOPMENT", test: /co[\s-]?dev/i },
  // "Kundenbeziehung", "Kundenbez.".
  { type: "CUSTOMER_RELATION", test: /kundenbez/i },
  // "White-label", "White label", "Whitelabel".
  { type: "WHITE_LABEL", test: /white[\s-]?label/i },
  // "Technologielizenz", "Technologie-Lizenz", "Tech-Lizenz".
  { type: "TECH_LICENSE", test: /techno?logie?[\s-]?lizenz|tech[\s-]?lizenz/i },
  { type: "SPARRING", test: /sparring/i },
];

/**
 * Parses a free-text use-case cell (which may combine several types, e.g.
 * "Pilotprojekt, Co-Development" or "Kundenbeziehung / White-label / …") into a
 * de-duplicated list of MatchUseCaseType, in the canonical PILOT→…→SPARRING
 * order. The original text is kept verbatim elsewhere (useCaseNote).
 */
export function parseUseCaseTypes(raw: string | null | undefined): MatchUseCaseType[] {
  const text = raw ?? "";
  const result: MatchUseCaseType[] = [];
  for (const rule of USE_CASE_RULES) {
    if (rule.test.test(text) && !result.includes(rule.type)) {
      result.push(rule.type);
    }
  }
  return result;
}

/**
 * Derives the contact status from the combined "Next steps" + "Intro Mail /
 * Calls" free text. Picks the furthest-along signal it can find (a cell that
 * mentions both "in Kontakt" and "Pilot vereinbart" is PILOT_AGREED).
 */
export function parseContactStatus(
  ...parts: (string | null | undefined)[]
): MatchContactStatus {
  const text = parts.filter(Boolean).join(" ").toLowerCase();
  if (!text.trim()) return "NONE";
  // "Pilot(projekt) vereinbart".
  if (/pilot\w*\s+vereinbart/.test(text)) return "PILOT_AGREED";
  // "Folgetermin", "Call(s)", "Termin (vereinbart/ausgemacht)".
  if (/folgetermin|folgetermine|\bcall\b|calls|\btermin\b/.test(text)) {
    return "FOLLOW_UP";
  }
  if (/in kontakt|im kontakt|in loop|im loop/.test(text)) return "IN_CONTACT";
  return "NONE";
}

// --- Top-Match derivation ---------------------------------------------------

/** A cell is a "Top-Match" when BOTH sides rate the fit as Hoch (HIGH). */
export function isTopMatch(
  startupRelevance: RelevanceLevel | null | undefined,
  partnerRelevance: RelevanceLevel | null | undefined
): boolean {
  return startupRelevance === "HIGH" && partnerRelevance === "HIGH";
}

// --- Mutual-fit heatmap encoding -------------------------------------------
//
// The matrix is read heatmap-first: instead of crowding each cell with two
// relevance pills, we collapse Startup- + Partner-Relevanz into a single
// "mutual fit" signal that drives the cell's colour intensity. The individual
// S/P levels are still surfaced as a tiny two-dot indicator and in the detail
// drawer.

export type MutualFitLevel = "top" | "strong" | "moderate" | "weak" | "none";

const RELEVANCE_SCORE: Record<RelevanceLevel, number> = {
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

/**
 * Collapses the two-sided relevance into one heatmap tier:
 * - `top`      — both sides Hoch (the Top-Match, strongest mint).
 * - `strong`   — one side Hoch, the other Mittel (score ≥ 5).
 * - `moderate` — solid overlap, e.g. Mittel/Mittel or Hoch/Niedrig (score ≥ 3).
 * - `weak`     — thin / one-sided-low signal (score ≥ 1).
 * - `none`     — neither side rated.
 */
export function mutualFitLevel(
  startupRelevance: RelevanceLevel | null | undefined,
  partnerRelevance: RelevanceLevel | null | undefined
): MutualFitLevel {
  if (!startupRelevance && !partnerRelevance) return "none";
  if (isTopMatch(startupRelevance, partnerRelevance)) return "top";
  const score =
    (startupRelevance ? RELEVANCE_SCORE[startupRelevance] : 0) +
    (partnerRelevance ? RELEVANCE_SCORE[partnerRelevance] : 0);
  if (score >= 5) return "strong";
  if (score >= 3) return "moderate";
  return "weak";
}

// --- View model + filtering -------------------------------------------------

/** A single (startup × partner) cell as consumed by the UI. */
export interface MatchCellView {
  /** Match row id, or null when no data exists yet for this pairing. */
  id: string | null;
  partnerSlug: string;
  startupRelevance: RelevanceLevel | null;
  partnerRelevance: RelevanceLevel | null;
  useCaseTypes: MatchUseCaseType[];
  useCaseNote: string | null;
  nextSteps: string | null;
  contactStatus: MatchContactStatus;
}

export interface MatchRowView {
  startupId: string;
  startupName: string;
  /** One cell per partner, in PARTNER_COMPANIES order (null = no data). */
  cells: (MatchCellView | null)[];
}

export interface MatchFilters {
  /** Restrict to a single partner column (by slug), or null for all. */
  partnerSlug: string | null;
  /** Restrict to cells that include this use-case type, or null for all. */
  useCase: MatchUseCaseType | null;
  /** Only show pairings where both sides are Hoch. */
  onlyTopMatch: boolean;
}

export const EMPTY_FILTERS: MatchFilters = {
  partnerSlug: null,
  useCase: null,
  onlyTopMatch: false,
};

/** True when a cell has any content at all (used to skip fully-empty cells). */
export function cellHasData(cell: MatchCellView | null): cell is MatchCellView {
  if (!cell) return false;
  return (
    cell.startupRelevance !== null ||
    cell.partnerRelevance !== null ||
    cell.useCaseTypes.length > 0 ||
    Boolean(cell.useCaseNote) ||
    Boolean(cell.nextSteps) ||
    cell.contactStatus !== "NONE"
  );
}

/** Whether a cell satisfies the content filters (use-case + top-match). */
export function cellPassesContentFilters(
  cell: MatchCellView | null,
  filters: Pick<MatchFilters, "useCase" | "onlyTopMatch">
): boolean {
  if (!cellHasData(cell)) return false;
  if (filters.useCase && !cell.useCaseTypes.includes(filters.useCase)) {
    return false;
  }
  if (
    filters.onlyTopMatch &&
    !isTopMatch(cell.startupRelevance, cell.partnerRelevance)
  ) {
    return false;
  }
  return true;
}

/**
 * Applies the active filters to the matrix. Partner filtering hides columns;
 * use-case / top-match filtering keeps a startup row only when at least one of
 * its still-visible cells passes the content filters. Rows keep their full cell
 * array (aligned to PARTNER_COMPANIES) so the caller can decide which columns
 * to render.
 */
export function filterRows(
  rows: MatchRowView[],
  filters: MatchFilters
): MatchRowView[] {
  const noContentFilter = !filters.useCase && !filters.onlyTopMatch;
  return rows.filter((row) => {
    const visibleCells = filters.partnerSlug
      ? row.cells.filter((c) => c?.partnerSlug === filters.partnerSlug)
      : row.cells;
    // With a partner filter but no content filter, keep the row only if it has
    // any data in that column.
    if (noContentFilter) {
      return visibleCells.some((c) => cellHasData(c));
    }
    return visibleCells.some((c) => cellPassesContentFilters(c, filters));
  });
}
