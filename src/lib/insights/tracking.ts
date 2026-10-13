import { z } from "zod";
import {
  pairKey,
  rate,
  type DataQualityItem,
  type InsightsDataset,
  type InsightsReportingMeta,
  type InsightsStartup,
  type InsightsTracking,
  type PilotSource,
} from "@/lib/insights/metrics";
import {
  effectiveStage,
  EVIDENCE_LEVELS,
  OUTCOMES,
  STAGES,
  stageRank,
  SUPPORT_INTENSITIES,
  TRACKS,
  type Outcome,
  type Stage,
} from "@/lib/insights/stages";

// ---------------------------------------------------------------------------
// KPI-Insights Phase 2 metrics and form parsing (Plan: plan-kpi-analytics-hub
// 4.2 to 4.4). Pure functions over the same read-only dataset as ./metrics.ts
// plus the three additive tables. Definitions decided on 2026-10-13:
//   Female Founder = at least 50 % of the founders are women.
//   Hessen = confirmed by the team; Startup.city only yields a suggestion.
// ---------------------------------------------------------------------------

// --- Hessen -----------------------------------------------------------------

/** Normalized names of Hessian cities and larger towns (suggestion only). */
const HESSEN_CITY_KEYS = [
  "frankfurt",
  "wiesbaden",
  "kassel",
  "darmstadt",
  "offenbach",
  "hanau",
  "giessen",
  "marburg",
  "fulda",
  "ruesselsheim",
  "badhomburg",
  "wetzlar",
  "oberursel",
  "rodgau",
  "dreieich",
  "bensheim",
  "hofheim",
  "maintal",
  "langen",
  "neuisenburg",
  "limburg",
  "badvilbel",
  "eschborn",
  "friedberg",
  "dietzenbach",
  "moerfeldenwalldorf",
  "kelsterbach",
  "taunusstein",
  "idstein",
  "badnauheim",
  "griesheim",
  "weiterstadt",
  "viernheim",
  "heppenheim",
  "bebra",
  "badhersfeld",
  "baunatal",
  "korbach",
];

function normalizeCity(city: string): string {
  return city
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z]/g, "");
}

/** Hessen suggestion from the free-text city; null when the city is empty. */
export function suggestHessen(city: string | null): boolean | null {
  const key = city ? normalizeCity(city) : "";
  if (!key) return null;
  // "Frankfurt (Oder)" is in Brandenburg.
  if (key.startsWith("frankfurtoder")) return false;
  return HESSEN_CITY_KEYS.some((c) => key.startsWith(c));
}

// --- Per-startup facts ------------------------------------------------------

/** null when the founder counts are missing. */
export function isFemaleFounder(meta: InsightsReportingMeta | undefined): boolean | null {
  if (!meta || !meta.foundersTotal || meta.foundersFemale === null) return null;
  return meta.foundersFemale * 2 >= meta.foundersTotal;
}

/**
 * Jobs created since the program-start baseline. Current team size is the
 * reported team size, else the startup profile's teamSize.
 */
export function jobsCreated(
  meta: InsightsReportingMeta | undefined,
  startup: InsightsStartup | undefined
): number | null {
  const current = meta?.teamTotal ?? startup?.teamSize ?? null;
  const baseline = meta?.fteBaseline ?? null;
  if (current === null || baseline === null) return null;
  return current - baseline;
}

// --- Batch scope ------------------------------------------------------------

function batchScope(ds: InsightsDataset, batchId: string) {
  return {
    startupIds: new Set(
      ds.batchStartups.filter((bs) => bs.batchId === batchId).map((bs) => bs.startupId)
    ),
    partnerIds: new Set(
      ds.batchPartners.filter((bp) => bp.batchId === batchId).map((bp) => bp.partnerId)
    ),
  };
}

/**
 * Tracking entries that belong to a batch: explicitly assigned, or an entry
 * without batch (Basis or 1:1) whose startup and partner are both in the
 * batch. Same pair scope as the pilot index, so the funnel stays consistent.
 */
export function trackingInBatch(ds: InsightsDataset, batchId: string): InsightsTracking[] {
  const { startupIds, partnerIds } = batchScope(ds, batchId);
  return ds.tracking.filter(
    (t) =>
      t.batchId === batchId ||
      (t.batchId === null &&
        startupIds.has(t.startupId) &&
        t.partnerCompanyId !== null &&
        partnerIds.has(t.partnerCompanyId))
  );
}

export interface BatchReporting {
  startupsWithMeta: number;
  hessenConfirmed: number;
  /** Not yet confirmed, but the city suggests Hessen. */
  hessenSuggested: number;
  femaleFounders: number;
  startupsWithFounderData: number;
  /** Women in the teams of all startups with team data, 0..1. */
  femaleTeamShare: number | null;
  jobsCreated: number;
  startupsWithJobData: number;
  challenges: number;
  /** Linked challenges with an accepted application or a PoC. */
  challengesCovered: number;
  pilotPairs: number;
  /** Pilot pairs that reached LOI or later. */
  dealPairs: number;
  contractPairs: number;
  pilotToDealRate: number | null;
  revenueEur: number;
  revenuePairs: number;
  marketReadyStartups: number;
  trackingEntries: number;
}

export function summarizeBatchReporting(
  ds: InsightsDataset,
  batchId: string,
  pilots: Map<string, PilotSource[]>
): BatchReporting {
  const { startupIds, partnerIds } = batchScope(ds, batchId);
  const metaByStartup = new Map(ds.reportingMeta.map((m) => [m.startupId, m]));
  const startupById = new Map(ds.startups.map((s) => [s.id, s]));

  let startupsWithMeta = 0;
  let hessenConfirmed = 0;
  let hessenSuggested = 0;
  let femaleFounders = 0;
  let startupsWithFounderData = 0;
  let teamTotal = 0;
  let teamFemale = 0;
  let jobs = 0;
  let startupsWithJobData = 0;
  for (const id of startupIds) {
    const meta = metaByStartup.get(id);
    const startup = startupById.get(id);
    if (meta) startupsWithMeta += 1;
    if (meta?.hessenBased === true) hessenConfirmed += 1;
    if ((meta?.hessenBased ?? null) === null && suggestHessen(startup?.city ?? null)) {
      hessenSuggested += 1;
    }
    const female = isFemaleFounder(meta);
    if (female !== null) startupsWithFounderData += 1;
    if (female) femaleFounders += 1;
    if (meta?.teamTotal && meta.teamFemale !== null) {
      teamTotal += meta.teamTotal;
      teamFemale += meta.teamFemale;
    }
    const created = jobsCreated(meta, startup);
    if (created !== null) {
      startupsWithJobData += 1;
      jobs += created;
    }
  }

  const challengeIds = new Set(
    ds.batchChallenges.filter((l) => l.batchId === batchId).map((l) => l.challengeId)
  );
  const covered = new Set(
    ds.applications
      .filter(
        (a) =>
          challengeIds.has(a.challengeId) &&
          (a.status === "ACCEPTED" || (a.pocStatus !== null && a.pocStatus !== "CANCELLED"))
      )
      .map((a) => a.challengeId)
  );

  const entries = trackingInBatch(ds, batchId);
  const bestRank = new Map<string, number>();
  for (const t of entries) {
    if (!t.partnerCompanyId) continue;
    const key = pairKey(t.startupId, t.partnerCompanyId);
    bestRank.set(key, Math.max(bestRank.get(key) ?? 0, stageRank(effectiveStage(t))));
  }
  const pilotPairKeys = [...pilots.keys()].filter((key) => {
    const [startupId, partnerId] = key.split(":");
    return startupIds.has(startupId) && partnerIds.has(partnerId);
  });
  const reached = (key: string, stage: Stage) => (bestRank.get(key) ?? 0) >= stageRank(stage);
  const dealPairs = pilotPairKeys.filter((k) => reached(k, "LOI")).length;

  return {
    startupsWithMeta,
    hessenConfirmed,
    hessenSuggested,
    femaleFounders,
    startupsWithFounderData,
    femaleTeamShare: rate(teamFemale, teamTotal),
    jobsCreated: jobs,
    startupsWithJobData,
    challenges: challengeIds.size,
    challengesCovered: covered.size,
    pilotPairs: pilotPairKeys.length,
    dealPairs,
    contractPairs: pilotPairKeys.filter((k) => reached(k, "CONTRACT")).length,
    pilotToDealRate: rate(dealPairs, pilotPairKeys.length),
    revenueEur: entries.reduce((sum, t) => sum + (t.revenueEur ?? 0), 0),
    revenuePairs: [...bestRank.values()].filter((r) => r >= stageRank("REVENUE")).length,
    marketReadyStartups: new Set(
      entries.filter((t) => t.outcome === "MARKET_READY").map((t) => t.startupId)
    ).size,
    trackingEntries: entries.length,
  };
}

// --- 1:1 Accelerator --------------------------------------------------------

export interface OneOnOneSummary {
  entries: number;
  /** Entries per furthest reached stage. */
  byStage: Record<Stage, number>;
  reachedPilot: number;
  reachedContract: number;
  pilotRate: number | null;
  pilotToContractRate: number | null;
  revenueEur: number;
  costs: { partner: number; lovedis: number; startup: number };
  outcomes: Record<Outcome, number>;
}

export function summarizeOneOnOne(ds: InsightsDataset): OneOnOneSummary {
  const entries = ds.tracking.filter((t) => t.track === "ONE_ON_ONE");
  const byStage = Object.fromEntries(STAGES.map((s) => [s, 0])) as Record<Stage, number>;
  const outcomes = Object.fromEntries(OUTCOMES.map((o) => [o, 0])) as Record<Outcome, number>;
  let reachedPilot = 0;
  let reachedContract = 0;
  for (const t of entries) {
    const stage = effectiveStage(t);
    byStage[stage] += 1;
    if (stageRank(stage) >= stageRank("PILOT")) reachedPilot += 1;
    if (stageRank(stage) >= stageRank("CONTRACT")) reachedContract += 1;
    if (t.outcome && t.outcome in outcomes) outcomes[t.outcome as Outcome] += 1;
  }
  const sum = (pick: (t: InsightsTracking) => number | null) =>
    entries.reduce((total, t) => total + (pick(t) ?? 0), 0);
  return {
    entries: entries.length,
    byStage,
    reachedPilot,
    reachedContract,
    pilotRate: rate(reachedPilot, entries.length),
    pilotToContractRate: rate(reachedContract, reachedPilot),
    revenueEur: sum((t) => t.revenueEur),
    costs: {
      partner: sum((t) => t.costPartnerEur),
      lovedis: sum((t) => t.costLovedisEur),
      startup: sum((t) => t.costStartupEur),
    },
    outcomes,
  };
}

// --- Data quality (Phase 2 additions) ----------------------------------------

export function trackingDataQuality(ds: InsightsDataset): DataQualityItem[] {
  const batchStartupIds = new Set(ds.batchStartups.map((bs) => bs.startupId));
  const metaByStartup = new Map(ds.reportingMeta.map((m) => [m.startupId, m]));
  const accelerators = ds.batches.filter((b) => b.type === "ACCELERATOR");
  const linkedBatches = new Set(ds.batchChallenges.map((l) => l.batchId));
  return [
    {
      key: "startup-reporting-meta",
      label: "Batch-Startups ohne Förder-Merkmale",
      count: [...batchStartupIds].filter((id) => {
        const meta = metaByStartup.get(id);
        return !meta || meta.hessenBased === null || isFemaleFounder(meta) === null;
      }).length,
      total: batchStartupIds.size,
      hint: "Hessen bestätigen und Gründer:innen erfassen (Insights, Startup-Ansicht).",
    },
    {
      key: "startup-fte-baseline",
      label: "Batch-Startups ohne FTE-Baseline",
      count: [...batchStartupIds].filter((id) => metaByStartup.get(id)?.fteBaseline == null)
        .length,
      total: batchStartupIds.size,
      hint: "Teamgröße bei Programmstart; ohne sie gibt es keinen Job Creation Multiplier.",
    },
    {
      key: "batch-challenges",
      label: "Accelerator-Batches ohne zugeordnete Challenges",
      count: accelerators.filter((b) => !linkedBatches.has(b.id)).length,
      total: accelerators.length,
      hint: "Challenges unter Insights, Zuordnungen dem Batch zuweisen.",
    },
    {
      key: "tracking-partner",
      label: "Tracking-Einträge ohne Partner",
      count: ds.tracking.filter((t) => !t.partnerCompanyId).length,
      total: ds.tracking.length,
      hint: "Ohne Partner zählt der Eintrag nicht im Pilot- und Vertrags-Funnel.",
    },
  ];
}

// --- Form parsing -----------------------------------------------------------

const emptyToUndefined = (v: unknown) =>
  v === null || v === undefined || (typeof v === "string" && v.trim() === "") ? undefined : v;

const optionalInt = (max: number) =>
  z.preprocess(
    emptyToUndefined,
    z.coerce
      .number({ message: "Bitte eine Zahl eingeben." })
      .int("Bitte eine ganze Zahl eingeben.")
      .min(0, "Werte dürfen nicht negativ sein.")
      .max(max, `Höchstens ${max.toLocaleString("de-DE")}.`)
      .optional()
  );

const optionalDate = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Datum im Format JJJJ-MM-TT angeben.")
    .refine((s) => !Number.isNaN(Date.parse(`${s}T00:00:00Z`)), "Ungültiges Datum.")
    .optional()
);

const optionalText = (max: number) =>
  z.preprocess(emptyToUndefined, z.string().trim().max(max, `Höchstens ${max} Zeichen.`).optional());

const optionalId = z.preprocess(emptyToUndefined, z.string().min(1).max(64).optional());

const optionalEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z.preprocess(emptyToUndefined, z.enum(values).optional());

const checkbox = z.preprocess((v) => v === "on" || v === "true", z.boolean());

function toDate(s: string | undefined): Date | null {
  return s ? new Date(`${s}T00:00:00.000Z`) : null;
}

function formObject(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of fd.entries()) {
    if (typeof value === "string") out[key] = value;
  }
  return out;
}

type ParseResult<T> = { data: T; error?: undefined } | { data?: undefined; error: string };

function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Ungültige Eingabe.";
}

const reportingMetaSchema = z
  .object({
    startupId: z.string().min(1, "Startup fehlt."),
    hessenBased: z.preprocess(emptyToUndefined, z.enum(["yes", "no"]).optional()),
    foundersTotal: optionalInt(100),
    foundersFemale: optionalInt(100),
    teamTotal: optionalInt(100_000),
    teamFemale: optionalInt(100_000),
    fteBaseline: optionalInt(100_000),
    fteBaselineOn: optionalDate,
    evidence: optionalEnum(EVIDENCE_LEVELS),
  })
  .refine(
    (v) => v.foundersFemale === undefined || v.foundersTotal === undefined || v.foundersFemale <= v.foundersTotal,
    "Gründerinnen können nicht mehr sein als Gründer:innen gesamt."
  )
  .refine(
    (v) => v.foundersFemale === undefined || v.foundersTotal !== undefined,
    "Bitte auch die Gesamtzahl der Gründer:innen angeben."
  )
  .refine(
    (v) => v.teamFemale === undefined || v.teamTotal === undefined || v.teamFemale <= v.teamTotal,
    "Frauen im Team können nicht mehr sein als das Team gesamt."
  );

export interface ReportingMetaInput {
  startupId: string;
  hessenBased: boolean | null;
  foundersTotal: number | null;
  foundersFemale: number | null;
  teamTotal: number | null;
  teamFemale: number | null;
  fteBaseline: number | null;
  fteBaselineOn: Date | null;
  evidence: string | null;
}

export function parseReportingMetaForm(fd: FormData): ParseResult<ReportingMetaInput> {
  const parsed = reportingMetaSchema.safeParse(formObject(fd));
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const v = parsed.data;
  return {
    data: {
      startupId: v.startupId,
      hessenBased: v.hessenBased === undefined ? null : v.hessenBased === "yes",
      foundersTotal: v.foundersTotal ?? null,
      foundersFemale: v.foundersFemale ?? null,
      teamTotal: v.teamTotal ?? null,
      teamFemale: v.teamFemale ?? null,
      fteBaseline: v.fteBaseline ?? null,
      fteBaselineOn: toDate(v.fteBaselineOn),
      evidence: v.evidence ?? null,
    },
  };
}

const MAX_EUR = 1_000_000_000;
const LONG_TEXT = 4000;

const trackingSchema = z
  .object({
    track: z.enum(TRACKS, { message: "Programm wählen." }),
    startupId: z.string().min(1, "Startup wählen."),
    partnerCompanyId: optionalId,
    batchId: optionalId,
    challengeId: optionalId,
    engagementId: optionalId,
    stage: z.enum(STAGES, { message: "Stufe wählen." }),
    introByLovedisOn: optionalDate,
    pilotStartOn: optionalDate,
    loiOn: optionalDate,
    contractOn: optionalDate,
    firstRevenueOn: optionalDate,
    revenueEur: optionalInt(MAX_EUR),
    collaborationForm: optionalText(200),
    supportIntensity: optionalEnum(SUPPORT_INTENSITIES),
    ndaSigned: checkbox,
    ipAgreement: checkbox,
    coInnovationAgreement: checkbox,
    useCase: optionalText(LONG_TEXT),
    goal: optionalText(LONG_TEXT),
    kpis: optionalText(LONG_TEXT),
    startOn: optionalDate,
    endOn: optionalDate,
    resourcesPartner: optionalText(LONG_TEXT),
    costPartnerEur: optionalInt(MAX_EUR),
    costLovedisEur: optionalInt(MAX_EUR),
    costStartupEur: optionalInt(MAX_EUR),
    outcome: optionalEnum(OUTCOMES),
  })
  .refine((v) => !v.startOn || !v.endOn || v.endOn >= v.startOn, "Das Ende liegt vor dem Start.");

export interface TrackingInput {
  track: string;
  startupId: string;
  partnerCompanyId: string | null;
  batchId: string | null;
  challengeId: string | null;
  engagementId: string | null;
  stage: string;
  introByLovedisOn: Date | null;
  pilotStartOn: Date | null;
  loiOn: Date | null;
  contractOn: Date | null;
  firstRevenueOn: Date | null;
  revenueEur: number | null;
  collaborationForm: string | null;
  supportIntensity: string | null;
  ndaSigned: boolean;
  ipAgreement: boolean;
  coInnovationAgreement: boolean;
  useCase: string | null;
  goal: string | null;
  kpis: string | null;
  startOn: Date | null;
  endOn: Date | null;
  resourcesPartner: string | null;
  costPartnerEur: number | null;
  costLovedisEur: number | null;
  costStartupEur: number | null;
  outcome: string | null;
}

export function parseTrackingForm(fd: FormData): ParseResult<TrackingInput> {
  const raw = formObject(fd);
  // Unchecked checkboxes are absent from FormData.
  for (const key of ["ndaSigned", "ipAgreement", "coInnovationAgreement"]) raw[key] ??= "";
  const parsed = trackingSchema.safeParse(raw);
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const v = parsed.data;
  return {
    data: {
      track: v.track,
      startupId: v.startupId,
      partnerCompanyId: v.partnerCompanyId ?? null,
      batchId: v.batchId ?? null,
      challengeId: v.challengeId ?? null,
      engagementId: v.engagementId ?? null,
      stage: v.stage,
      introByLovedisOn: toDate(v.introByLovedisOn),
      pilotStartOn: toDate(v.pilotStartOn),
      loiOn: toDate(v.loiOn),
      contractOn: toDate(v.contractOn),
      firstRevenueOn: toDate(v.firstRevenueOn),
      revenueEur: v.revenueEur ?? null,
      collaborationForm: v.collaborationForm ?? null,
      supportIntensity: v.supportIntensity ?? null,
      ndaSigned: v.ndaSigned,
      ipAgreement: v.ipAgreement,
      coInnovationAgreement: v.coInnovationAgreement,
      useCase: v.useCase ?? null,
      goal: v.goal ?? null,
      kpis: v.kpis ?? null,
      startOn: toDate(v.startOn),
      endOn: toDate(v.endOn),
      resourcesPartner: v.resourcesPartner ?? null,
      costPartnerEur: v.costPartnerEur ?? null,
      costLovedisEur: v.costLovedisEur ?? null,
      costStartupEur: v.costStartupEur ?? null,
      outcome: v.outcome ?? null,
    },
  };
}
