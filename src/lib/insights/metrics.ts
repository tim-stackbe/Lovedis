import type {
  ApplicationStatus,
  BatchType,
  BookingStatus,
  ChallengeStatus,
  EngagementStatus,
  MarketplaceOfferingType,
  MatchContactStatus,
  MatchUseCaseType,
  PoCStatus,
  RelevanceLevel,
  SourceType,
} from "@/generated/prisma/enums";
import { isTopMatch } from "@/lib/match-matrix";

// ---------------------------------------------------------------------------
// KPI-Insights metric registry (Plan: plan-kpi-analytics-hub, Abschnitt 3).
//
// Pure functions over a plain dataset loaded read-only from the existing tools
// (match matrix, engagements, challenges/PoCs, batches, venture store). Every
// KPI the UI, the exports and later the agent API show is defined exactly once
// here, so the numbers cannot drift between surfaces. No DB access, no writes.
// ---------------------------------------------------------------------------

export interface InsightsBatch {
  id: string;
  name: string;
  type: BatchType;
  startDate: Date | null;
  endDate: Date | null;
  createdAt: Date;
}

export interface InsightsPartner {
  id: string;
  name: string;
  slug: string;
}

export interface InsightsStartup {
  id: string;
  name: string;
  industry: string;
  city: string | null;
  teamSize: number | null;
  sourceType: SourceType | null;
}

export interface InsightsMatch {
  batchId: string;
  partnerId: string;
  startupId: string;
  startupRelevance: RelevanceLevel | null;
  partnerRelevance: RelevanceLevel | null;
  contactStatus: MatchContactStatus;
  useCaseTypes: MatchUseCaseType[];
  startupFollowUp: boolean | null;
  partnerFollowUp: boolean | null;
}

/** How an engagement/challenge was attributed to a matrix partner company. */
export type PartnerResolution = "company" | "name" | "none";

export interface InsightsEngagement {
  id: string;
  title: string;
  startupId: string;
  status: EngagementStatus;
  partnerCompanyId: string | null;
  partnerResolution: PartnerResolution;
  startDate: Date | null;
  createdAt: Date;
}

export interface InsightsChallenge {
  id: string;
  title: string;
  status: ChallengeStatus;
  partnerCompanyId: string | null;
  partnerResolution: PartnerResolution;
}

export interface InsightsApplication {
  challengeId: string;
  startupId: string;
  status: ApplicationStatus;
  pocStatus: PoCStatus | null;
}

export interface InsightsBooking {
  startupId: string;
  status: BookingStatus;
  offeringType: MarketplaceOfferingType;
  /** FLEX + FIX credits of the booking (price snapshot). */
  credits: number;
  createdAt: Date;
}

export interface InsightsDataset {
  batches: InsightsBatch[];
  batchStartups: { batchId: string; startupId: string }[];
  batchPartners: { batchId: string; partnerId: string }[];
  partners: InsightsPartner[];
  startups: InsightsStartup[];
  matches: InsightsMatch[];
  engagements: InsightsEngagement[];
  challenges: InsightsChallenge[];
  applications: InsightsApplication[];
  bookings: InsightsBooking[];
}

// --- Partner attribution ----------------------------------------------------

/** Lowercase, umlauts folded, only a-z0-9 ("FingerHaus GmbH" → "fingerhausgmbh"). */
export function normalizeCompanyName(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]/g, "");
}

export interface PartnerUserRef {
  companyId: string | null;
  company: string | null;
}

/**
 * Attributes a partner-side user (engagement partner, challenge creator) to a
 * matrix partner company: first via the linked Company account, then via the
 * legacy free-text company name.
 */
export function resolvePartnerCompany(
  user: PartnerUserRef | null,
  partners: (InsightsPartner & { companyId: string | null })[]
): { partnerCompanyId: string | null; partnerResolution: PartnerResolution } {
  if (user?.companyId) {
    const linked = partners.find((p) => p.companyId === user.companyId);
    if (linked) return { partnerCompanyId: linked.id, partnerResolution: "company" };
  }
  const name = user?.company ? normalizeCompanyName(user.company) : "";
  if (name) {
    const byName = partners.find((p) => {
      const key = normalizeCompanyName(p.name);
      return key.length > 0 && (name === key || name.startsWith(key));
    });
    if (byName) return { partnerCompanyId: byName.id, partnerResolution: "name" };
  }
  return { partnerCompanyId: null, partnerResolution: "none" };
}

// --- Core definitions -------------------------------------------------------

/**
 * A "Match" (KPI): the pairing got past rating, i.e. there is contact or at
 * least one side asked for a follow-up conversation.
 */
export function isQualifiedMatch(
  m: Pick<InsightsMatch, "contactStatus" | "startupFollowUp" | "partnerFollowUp">
): boolean {
  return (
    m.contactStatus !== "NONE" ||
    m.startupFollowUp === true ||
    m.partnerFollowUp === true
  );
}

/** A matrix cell that at least one side has rated. */
export function isRatedPairing(
  m: Pick<InsightsMatch, "startupRelevance" | "partnerRelevance">
): boolean {
  return m.startupRelevance !== null || m.partnerRelevance !== null;
}

export type PilotSource = "MATRIX" | "ENGAGEMENT" | "POC";

export const PILOT_SOURCE_LABELS: Record<PilotSource, string> = {
  MATRIX: "Matrix: Pilot vereinbart",
  ENGAGEMENT: "Engagement",
  POC: "Challenge-PoC",
};

/** Booking states that count as "gebucht" (excludes declined/cancelled). */
const BOOKED_STATUSES: BookingStatus[] = [
  "REQUESTED",
  "IN_COORDINATION",
  "CONFIRMED",
  "COMPLETED",
];
/** Booking states in which credits were actually redeemed. */
const REDEEMED_STATUSES: BookingStatus[] = ["CONFIRMED", "COMPLETED"];

export function pairKey(startupId: string, partnerId: string): string {
  return `${startupId}:${partnerId}`;
}

/**
 * Every (startup, partner company) pair with a pilot / test phase, and where
 * that signal comes from: matrix "Pilot vereinbart", a non-cancelled
 * engagement attributed to the partner, or a non-cancelled PoC on one of the
 * partner's challenges.
 */
export function buildPilotIndex(ds: InsightsDataset): Map<string, PilotSource[]> {
  const index = new Map<string, PilotSource[]>();
  const add = (key: string, source: PilotSource) => {
    const list = index.get(key) ?? [];
    if (!list.includes(source)) list.push(source);
    index.set(key, list);
  };

  for (const m of ds.matches) {
    if (m.contactStatus === "PILOT_AGREED") {
      add(pairKey(m.startupId, m.partnerId), "MATRIX");
    }
  }
  for (const e of ds.engagements) {
    if (e.partnerCompanyId && e.status !== "CANCELLED") {
      add(pairKey(e.startupId, e.partnerCompanyId), "ENGAGEMENT");
    }
  }
  const challengePartner = new Map(
    ds.challenges.map((c) => [c.id, c.partnerCompanyId])
  );
  for (const a of ds.applications) {
    const partnerId = challengePartner.get(a.challengeId);
    if (partnerId && a.pocStatus && a.pocStatus !== "CANCELLED") {
      add(pairKey(a.startupId, partnerId), "POC");
    }
  }
  return index;
}

/** Share as 0..1, or null when there is no base to divide by. */
export function rate(part: number, total: number): number | null {
  return total > 0 ? part / total : null;
}

/** Sort key for "which batch came first": start date, else creation. */
function batchOrderDate(b: InsightsBatch): number {
  return (b.startDate ?? b.createdAt).getTime();
}

/** True when `date` lies inside the batch period (end day inclusive). */
export function inBatchPeriod(batch: InsightsBatch, date: Date): boolean {
  if (!batch.startDate || !batch.endDate) return true;
  const endExclusive = batch.endDate.getTime() + 24 * 60 * 60 * 1000;
  const t = date.getTime();
  return t >= batch.startDate.getTime() && t < endExclusive;
}

// --- Batch (program) KPIs ---------------------------------------------------

export interface PartnerRetention {
  previousBatchId: string;
  previousBatchName: string;
  previousPartners: number;
  retained: number;
  rate: number | null;
}

export interface BatchSummary {
  batch: InsightsBatch;
  startups: number;
  partners: number;
  ratedPairings: number;
  topMatches: number;
  matches: number;
  /** Cohort conversion: qualified matches of this batch that reached a pilot. */
  matchesWithPilot: number;
  matchToPilotRate: number | null;
  /** Distinct batch startup × batch partner pairs with any pilot signal. */
  pilotPairs: number;
  startupsWithApplication: number;
  startupsWithoutApplication: number;
  sessionsBooked: number;
  sessionsCompleted: number;
  creditsRedeemed: number;
  /** False when the batch has no start/end date, so all bookings counted. */
  periodApplied: boolean;
  retention: PartnerRetention | null;
}

export function previousBatchOfSameType(
  ds: InsightsDataset,
  batch: InsightsBatch
): InsightsBatch | null {
  const earlier = ds.batches
    .filter(
      (b) =>
        b.id !== batch.id &&
        b.type === batch.type &&
        batchOrderDate(b) < batchOrderDate(batch)
    )
    .sort((a, b) => batchOrderDate(b) - batchOrderDate(a));
  return earlier[0] ?? null;
}

export function partnerRetention(
  ds: InsightsDataset,
  batch: InsightsBatch
): PartnerRetention | null {
  const previous = previousBatchOfSameType(ds, batch);
  if (!previous) return null;
  const current = new Set(
    ds.batchPartners.filter((bp) => bp.batchId === batch.id).map((bp) => bp.partnerId)
  );
  const before = ds.batchPartners
    .filter((bp) => bp.batchId === previous.id)
    .map((bp) => bp.partnerId);
  const retained = before.filter((id) => current.has(id)).length;
  return {
    previousBatchId: previous.id,
    previousBatchName: previous.name,
    previousPartners: before.length,
    retained,
    rate: rate(retained, before.length),
  };
}

export function summarizeBatch(
  ds: InsightsDataset,
  batchId: string,
  pilots: Map<string, PilotSource[]> = buildPilotIndex(ds)
): BatchSummary | null {
  const batch = ds.batches.find((b) => b.id === batchId);
  if (!batch) return null;

  const startupIds = new Set(
    ds.batchStartups.filter((bs) => bs.batchId === batchId).map((bs) => bs.startupId)
  );
  const partnerIds = new Set(
    ds.batchPartners.filter((bp) => bp.batchId === batchId).map((bp) => bp.partnerId)
  );
  const cells = ds.matches.filter(
    (m) => m.batchId === batchId && startupIds.has(m.startupId)
  );
  const qualified = cells.filter(isQualifiedMatch);
  const matchesWithPilot = qualified.filter((m) =>
    pilots.has(pairKey(m.startupId, m.partnerId))
  ).length;

  let pilotPairs = 0;
  for (const key of pilots.keys()) {
    const [startupId, partnerId] = key.split(":");
    if (startupIds.has(startupId) && partnerIds.has(partnerId)) pilotPairs += 1;
  }

  const applicants = new Set(
    ds.applications.filter((a) => startupIds.has(a.startupId)).map((a) => a.startupId)
  );

  const periodApplied = Boolean(batch.startDate && batch.endDate);
  const bookings = ds.bookings.filter(
    (b) => startupIds.has(b.startupId) && inBatchPeriod(batch, b.createdAt)
  );

  return {
    batch,
    startups: startupIds.size,
    partners: partnerIds.size,
    ratedPairings: cells.filter(isRatedPairing).length,
    topMatches: cells.filter((m) => isTopMatch(m.startupRelevance, m.partnerRelevance))
      .length,
    matches: qualified.length,
    matchesWithPilot,
    matchToPilotRate: rate(matchesWithPilot, qualified.length),
    pilotPairs,
    startupsWithApplication: applicants.size,
    startupsWithoutApplication: startupIds.size - applicants.size,
    sessionsBooked: bookings.filter((b) => BOOKED_STATUSES.includes(b.status)).length,
    sessionsCompleted: bookings.filter((b) => b.status === "COMPLETED").length,
    creditsRedeemed: bookings
      .filter((b) => REDEEMED_STATUSES.includes(b.status))
      .reduce((sum, b) => sum + b.credits, 0),
    periodApplied,
    retention: partnerRetention(ds, batch),
  };
}

// --- Partner breakdown within a batch ---------------------------------------

export interface PartnerInBatchRow {
  partner: InsightsPartner;
  ratedPairings: number;
  topMatches: number;
  matches: number;
  pilots: number;
}

export function partnersInBatch(
  ds: InsightsDataset,
  batchId: string,
  pilots: Map<string, PilotSource[]> = buildPilotIndex(ds)
): PartnerInBatchRow[] {
  const startupIds = new Set(
    ds.batchStartups.filter((bs) => bs.batchId === batchId).map((bs) => bs.startupId)
  );
  const partnerById = new Map(ds.partners.map((p) => [p.id, p]));
  return ds.batchPartners
    .filter((bp) => bp.batchId === batchId)
    .map((bp) => partnerById.get(bp.partnerId))
    .filter((p): p is InsightsPartner => Boolean(p))
    .map((partner) => {
      const cells = ds.matches.filter(
        (m) =>
          m.batchId === batchId &&
          m.partnerId === partner.id &&
          startupIds.has(m.startupId)
      );
      let pilotCount = 0;
      for (const startupId of startupIds) {
        if (pilots.has(pairKey(startupId, partner.id))) pilotCount += 1;
      }
      return {
        partner,
        ratedPairings: cells.filter(isRatedPairing).length,
        topMatches: cells.filter((m) =>
          isTopMatch(m.startupRelevance, m.partnerRelevance)
        ).length,
        matches: cells.filter(isQualifiedMatch).length,
        pilots: pilotCount,
      };
    });
}

// --- Startup breakdown within a batch ---------------------------------------

export interface StartupInBatchRow {
  startup: InsightsStartup;
  matches: number;
  pilots: number;
  applications: number;
  sessionsCompleted: number;
  creditsRedeemed: number;
}

export function startupsInBatch(
  ds: InsightsDataset,
  batchId: string,
  pilots: Map<string, PilotSource[]> = buildPilotIndex(ds)
): StartupInBatchRow[] {
  const batch = ds.batches.find((b) => b.id === batchId);
  if (!batch) return [];
  const startupById = new Map(ds.startups.map((s) => [s.id, s]));
  return ds.batchStartups
    .filter((bs) => bs.batchId === batchId)
    .map((bs) => startupById.get(bs.startupId))
    .filter((s): s is InsightsStartup => Boolean(s))
    .map((startup) => {
      const bookings = ds.bookings.filter(
        (b) => b.startupId === startup.id && inBatchPeriod(batch, b.createdAt)
      );
      let pilotCount = 0;
      for (const key of pilots.keys()) {
        if (key.startsWith(`${startup.id}:`)) pilotCount += 1;
      }
      return {
        startup,
        matches: ds.matches.filter(
          (m) => m.batchId === batchId && m.startupId === startup.id && isQualifiedMatch(m)
        ).length,
        pilots: pilotCount,
        applications: ds.applications.filter((a) => a.startupId === startup.id).length,
        sessionsCompleted: bookings.filter((b) => b.status === "COMPLETED").length,
        creditsRedeemed: bookings
          .filter((b) => REDEEMED_STATUSES.includes(b.status))
          .reduce((sum, b) => sum + b.credits, 0),
      };
    })
    .sort((a, b) => a.startup.name.localeCompare(b.startup.name, "de"));
}

// --- Industry breakdown -----------------------------------------------------

export interface IndustryRow {
  industry: string;
  startups: number;
  matches: number;
  pilots: number;
}

export const NO_INDUSTRY_LABEL = "Ohne Branche";

/** Groups startups (optionally only those of one batch) by `industry`. */
export function industryBreakdown(
  ds: InsightsDataset,
  batchId: string | null,
  pilots: Map<string, PilotSource[]> = buildPilotIndex(ds)
): IndustryRow[] {
  const scope = batchId
    ? new Set(
        ds.batchStartups.filter((bs) => bs.batchId === batchId).map((bs) => bs.startupId)
      )
    : null;
  const rows = new Map<string, IndustryRow>();
  for (const s of ds.startups) {
    if (scope && !scope.has(s.id)) continue;
    const industry = s.industry.trim() || NO_INDUSTRY_LABEL;
    const row = rows.get(industry) ?? { industry, startups: 0, matches: 0, pilots: 0 };
    row.startups += 1;
    row.matches += ds.matches.filter(
      (m) =>
        m.startupId === s.id &&
        (!batchId || m.batchId === batchId) &&
        isQualifiedMatch(m)
    ).length;
    for (const key of pilots.keys()) {
      if (key.startsWith(`${s.id}:`)) row.pilots += 1;
    }
    rows.set(industry, row);
  }
  return [...rows.values()].sort(
    (a, b) => b.startups - a.startups || a.industry.localeCompare(b.industry, "de")
  );
}

// --- Portfolio-wide KPIs ----------------------------------------------------

/**
 * "Extern dazugekommen": a startup with a real collaboration (non-cancelled
 * engagement or accepted challenge application) that is in no ACCELERATOR batch.
 */
export function externalStartupIds(ds: InsightsDataset): Set<string> {
  const acceleratorBatches = new Set(
    ds.batches.filter((b) => b.type === "ACCELERATOR").map((b) => b.id)
  );
  const inAccelerator = new Set(
    ds.batchStartups
      .filter((bs) => acceleratorBatches.has(bs.batchId))
      .map((bs) => bs.startupId)
  );
  const collaborating = new Set<string>([
    ...ds.engagements.filter((e) => e.status !== "CANCELLED").map((e) => e.startupId),
    ...ds.applications.filter((a) => a.status === "ACCEPTED").map((a) => a.startupId),
  ]);
  return new Set([...collaborating].filter((id) => !inAccelerator.has(id)));
}

export interface PortfolioSummary {
  batches: number;
  startupsInBatches: number;
  partnersInBatches: number;
  matches: number;
  pilotPairs: number;
  engagementsActive: number;
  externalStartups: number;
}

export function summarizePortfolio(
  ds: InsightsDataset,
  pilots: Map<string, PilotSource[]> = buildPilotIndex(ds)
): PortfolioSummary {
  return {
    batches: ds.batches.length,
    startupsInBatches: new Set(ds.batchStartups.map((bs) => bs.startupId)).size,
    partnersInBatches: new Set(ds.batchPartners.map((bp) => bp.partnerId)).size,
    matches: ds.matches.filter(isQualifiedMatch).length,
    pilotPairs: pilots.size,
    engagementsActive: ds.engagements.filter((e) => e.status === "ACTIVE").length,
    externalStartups: externalStartupIds(ds).size,
  };
}

// --- Drill-down: partner company --------------------------------------------

export interface PartnerMatchRow {
  batch: InsightsBatch;
  startup: InsightsStartup;
  startupRelevance: RelevanceLevel | null;
  partnerRelevance: RelevanceLevel | null;
  contactStatus: MatchContactStatus;
  qualified: boolean;
  pilotSources: PilotSource[];
}

export interface PartnerDetail {
  partner: InsightsPartner;
  batches: { batch: InsightsBatch; startups: number; matches: number; pilots: number }[];
  matchRows: PartnerMatchRow[];
  engagements: (InsightsEngagement & { startupName: string })[];
  challenges: (InsightsChallenge & { applications: number; pocs: number })[];
  totals: { matches: number; pilots: number; startups: number };
}

export function partnerDetail(
  ds: InsightsDataset,
  partnerId: string,
  pilots: Map<string, PilotSource[]> = buildPilotIndex(ds)
): PartnerDetail | null {
  const partner = ds.partners.find((p) => p.id === partnerId);
  if (!partner) return null;
  const batchById = new Map(ds.batches.map((b) => [b.id, b]));
  const startupById = new Map(ds.startups.map((s) => [s.id, s]));

  const batches = ds.batchPartners
    .filter((bp) => bp.partnerId === partnerId)
    .map((bp) => batchById.get(bp.batchId))
    .filter((b): b is InsightsBatch => Boolean(b))
    .sort((a, b) => batchOrderDate(b) - batchOrderDate(a))
    .map((batch) => {
      const row = partnersInBatch(ds, batch.id, pilots).find(
        (r) => r.partner.id === partnerId
      );
      return {
        batch,
        startups: ds.batchStartups.filter((bs) => bs.batchId === batch.id).length,
        matches: row?.matches ?? 0,
        pilots: row?.pilots ?? 0,
      };
    });

  const matchRows: PartnerMatchRow[] = ds.matches
    .filter((m) => m.partnerId === partnerId && isRatedOrContacted(m))
    .flatMap((m) => {
      const batch = batchById.get(m.batchId);
      const startup = startupById.get(m.startupId);
      if (!batch || !startup) return [];
      return [
        {
          batch,
          startup,
          startupRelevance: m.startupRelevance,
          partnerRelevance: m.partnerRelevance,
          contactStatus: m.contactStatus,
          qualified: isQualifiedMatch(m),
          pilotSources: pilots.get(pairKey(m.startupId, partnerId)) ?? [],
        },
      ];
    })
    .sort(
      (a, b) =>
        Number(b.qualified) - Number(a.qualified) ||
        a.startup.name.localeCompare(b.startup.name, "de")
    );

  const challenges = ds.challenges
    .filter((c) => c.partnerCompanyId === partnerId)
    .map((c) => {
      const apps = ds.applications.filter((a) => a.challengeId === c.id);
      return {
        ...c,
        applications: apps.length,
        pocs: apps.filter((a) => a.pocStatus !== null).length,
      };
    });

  const pilotStartups = new Set<string>();
  for (const key of pilots.keys()) {
    const [startupId, pid] = key.split(":");
    if (pid === partnerId) pilotStartups.add(startupId);
  }

  return {
    partner,
    batches,
    matchRows,
    engagements: ds.engagements
      .filter((e) => e.partnerCompanyId === partnerId)
      .map((e) => ({ ...e, startupName: startupById.get(e.startupId)?.name ?? "?" })),
    challenges,
    totals: {
      matches: matchRows.filter((r) => r.qualified).length,
      pilots: pilotStartups.size,
      startups: new Set(matchRows.map((r) => r.startup.id)).size,
    },
  };
}

function isRatedOrContacted(m: InsightsMatch): boolean {
  return isRatedPairing(m) || isQualifiedMatch(m);
}

// --- Drill-down: startup ----------------------------------------------------

export interface StartupMatchRow {
  batch: InsightsBatch;
  partner: InsightsPartner;
  startupRelevance: RelevanceLevel | null;
  partnerRelevance: RelevanceLevel | null;
  contactStatus: MatchContactStatus;
  qualified: boolean;
  pilotSources: PilotSource[];
}

export interface StartupDetail {
  startup: InsightsStartup;
  batches: InsightsBatch[];
  isExternal: boolean;
  matchRows: StartupMatchRow[];
  engagements: (InsightsEngagement & { partnerName: string | null })[];
  applications: (InsightsApplication & { challengeTitle: string })[];
  sessionsBooked: number;
  sessionsCompleted: number;
  creditsRedeemed: number;
}

export function startupDetail(
  ds: InsightsDataset,
  startupId: string,
  pilots: Map<string, PilotSource[]> = buildPilotIndex(ds)
): StartupDetail | null {
  const startup = ds.startups.find((s) => s.id === startupId);
  if (!startup) return null;
  const batchById = new Map(ds.batches.map((b) => [b.id, b]));
  const partnerById = new Map(ds.partners.map((p) => [p.id, p]));
  const challengeById = new Map(ds.challenges.map((c) => [c.id, c]));

  const matchRows: StartupMatchRow[] = ds.matches
    .filter((m) => m.startupId === startupId && isRatedOrContacted(m))
    .flatMap((m) => {
      const batch = batchById.get(m.batchId);
      const partner = partnerById.get(m.partnerId);
      if (!batch || !partner) return [];
      return [
        {
          batch,
          partner,
          startupRelevance: m.startupRelevance,
          partnerRelevance: m.partnerRelevance,
          contactStatus: m.contactStatus,
          qualified: isQualifiedMatch(m),
          pilotSources: pilots.get(pairKey(startupId, m.partnerId)) ?? [],
        },
      ];
    })
    .sort(
      (a, b) =>
        Number(b.qualified) - Number(a.qualified) ||
        a.partner.name.localeCompare(b.partner.name, "de")
    );

  const bookings = ds.bookings.filter((b) => b.startupId === startupId);

  return {
    startup,
    batches: ds.batchStartups
      .filter((bs) => bs.startupId === startupId)
      .map((bs) => batchById.get(bs.batchId))
      .filter((b): b is InsightsBatch => Boolean(b)),
    isExternal: externalStartupIds(ds).has(startupId),
    matchRows,
    engagements: ds.engagements
      .filter((e) => e.startupId === startupId)
      .map((e) => ({
        ...e,
        partnerName: e.partnerCompanyId
          ? partnerById.get(e.partnerCompanyId)?.name ?? null
          : null,
      })),
    applications: ds.applications
      .filter((a) => a.startupId === startupId)
      .map((a) => ({
        ...a,
        challengeTitle: challengeById.get(a.challengeId)?.title ?? "?",
      })),
    sessionsBooked: bookings.filter((b) => BOOKED_STATUSES.includes(b.status)).length,
    sessionsCompleted: bookings.filter((b) => b.status === "COMPLETED").length,
    creditsRedeemed: bookings
      .filter((b) => REDEEMED_STATUSES.includes(b.status))
      .reduce((sum, b) => sum + b.credits, 0),
  };
}

// --- Data quality -----------------------------------------------------------

export interface DataQualityItem {
  key: string;
  label: string;
  /** Records with the problem. */
  count: number;
  /** Records checked. */
  total: number;
  hint: string;
}

/** What is missing in the existing data for complete KPIs (read-only check). */
export function dataQuality(ds: InsightsDataset): DataQualityItem[] {
  const batchStartupIds = new Set(ds.batchStartups.map((bs) => bs.startupId));
  const batchStartups = ds.startups.filter((s) => batchStartupIds.has(s.id));
  const acceleratorBatches = new Set(
    ds.batches.filter((b) => b.type === "ACCELERATOR").map((b) => b.id)
  );
  const acceleratorCount = new Map<string, number>();
  for (const bs of ds.batchStartups) {
    if (!acceleratorBatches.has(bs.batchId)) continue;
    acceleratorCount.set(bs.startupId, (acceleratorCount.get(bs.startupId) ?? 0) + 1);
  }

  return [
    {
      key: "engagement-partner",
      label: "Engagements ohne Partner-Unternehmen",
      count: ds.engagements.filter((e) => e.partnerResolution === "none").length,
      total: ds.engagements.length,
      hint: "Partner-Konto ist keinem Matrix-Partner zugeordnet (Unternehmen verknüpfen).",
    },
    {
      key: "engagement-partner-name",
      label: "Engagements nur per Firmenname zugeordnet",
      count: ds.engagements.filter((e) => e.partnerResolution === "name").length,
      total: ds.engagements.length,
      hint: "Zuordnung über den Freitext-Firmennamen; Unternehmens-Konto verknüpfen macht sie eindeutig.",
    },
    {
      key: "challenge-partner",
      label: "Challenges ohne Partner-Unternehmen",
      count: ds.challenges.filter((c) => c.partnerResolution === "none").length,
      total: ds.challenges.length,
      hint: "Ersteller:in gehört zu keinem Matrix-Partner (z. B. vom Team angelegt).",
    },
    {
      key: "batch-period",
      label: "Batches ohne Zeitraum",
      count: ds.batches.filter((b) => !b.startDate || !b.endDate).length,
      total: ds.batches.length,
      hint: "Ohne Start- und Enddatum zählen alle Buchungen der Batch-Startups.",
    },
    {
      key: "startup-city",
      label: "Batch-Startups ohne Stadt",
      count: batchStartups.filter((s) => !s.city?.trim()).length,
      total: batchStartups.length,
      hint: "Wird für die Hessen-Quote benötigt.",
    },
    {
      key: "startup-team-size",
      label: "Batch-Startups ohne Teamgröße",
      count: batchStartups.filter((s) => s.teamSize === null).length,
      total: batchStartups.length,
      hint: "Wird als Baseline für den Job Creation Multiplier benötigt.",
    },
    {
      key: "startup-multi-accelerator",
      label: "Startups in mehreren Accelerator-Batches",
      count: [...acceleratorCount.values()].filter((n) => n > 1).length,
      total: acceleratorCount.size,
      hint: "Buchungen werden über den Batch-Zeitraum zugeordnet; ohne Zeitraum zählen sie doppelt.",
    },
  ];
}
