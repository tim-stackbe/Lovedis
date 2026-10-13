// ---------------------------------------------------------------------------
// KPI-Insights Phase 2 vocabulary (Plan: plan-kpi-analytics-hub 4.2 and 4.3).
// The new tables store these values as plain strings so no Postgres enum (and
// no migration of an existing type) is needed; this module is the only place
// that defines them.
// ---------------------------------------------------------------------------

export const TRACKS = ["BASIS", "ONE_ON_ONE"] as const;
export type Track = (typeof TRACKS)[number];
export const TRACK_LABELS: Record<Track, string> = {
  BASIS: "Basis-Accelerator",
  ONE_ON_ONE: "1:1 Accelerator",
};

export const STAGES = ["MATCH", "INTRO", "PILOT", "LOI", "CONTRACT", "REVENUE"] as const;
export type Stage = (typeof STAGES)[number];
export const STAGE_LABELS: Record<Stage, string> = {
  MATCH: "Match",
  INTRO: "Intro",
  PILOT: "Pilot / Testphase",
  LOI: "LOI",
  CONTRACT: "Vertrag",
  REVENUE: "Umsatz",
};

export const SUPPORT_INTENSITIES = ["LOW", "MEDIUM", "HIGH"] as const;
export type SupportIntensity = (typeof SUPPORT_INTENSITIES)[number];
export const SUPPORT_INTENSITY_LABELS: Record<SupportIntensity, string> = {
  LOW: "Gering",
  MEDIUM: "Mittel",
  HIGH: "Hoch",
};

export const OUTCOMES = ["MVP", "MARKET_READY", "FUNDING_READY"] as const;
export type Outcome = (typeof OUTCOMES)[number];
export const OUTCOME_LABELS: Record<Outcome, string> = {
  MVP: "MVP erreicht",
  MARKET_READY: "Marktreife",
  FUNDING_READY: "Funding-ready",
};

export const EVIDENCE_LEVELS = ["SELF_REPORTED", "VERIFIED"] as const;
export type EvidenceLevel = (typeof EVIDENCE_LEVELS)[number];
export const EVIDENCE_LABELS: Record<EvidenceLevel, string> = {
  SELF_REPORTED: "Selbst gemeldet",
  VERIFIED: "Belegt",
};

/** Label lookup that tolerates unknown stored strings. */
export function labelOf<T extends string>(labels: Record<T, string>, value: string | null): string {
  if (!value) return "";
  return (labels as Record<string, string>)[value] ?? value;
}

/** Position in the funnel; unknown values rank lowest. */
export function stageRank(stage: string): number {
  return Math.max(0, (STAGES as readonly string[]).indexOf(stage));
}

interface StageInput {
  stage: string;
  introByLovedisOn: Date | null;
  pilotStartOn: Date | null;
  loiOn: Date | null;
  contractOn: Date | null;
  firstRevenueOn: Date | null;
  revenueEur: number | null;
}

/**
 * The furthest stage an entry demonstrably reached: the chosen stage, raised
 * by any milestone date that was filled in (a contract date implies at least
 * CONTRACT even if the stage select was not updated).
 */
export function effectiveStage(t: StageInput): Stage {
  let rank = stageRank(t.stage);
  const raise = (stage: Stage, reached: boolean) => {
    if (reached) rank = Math.max(rank, stageRank(stage));
  };
  raise("INTRO", t.introByLovedisOn !== null);
  raise("PILOT", t.pilotStartOn !== null);
  raise("LOI", t.loiOn !== null);
  raise("CONTRACT", t.contractOn !== null);
  raise("REVENUE", t.firstRevenueOn !== null || (t.revenueEur ?? 0) > 0);
  return STAGES[rank];
}
