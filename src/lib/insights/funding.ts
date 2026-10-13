import { z } from "zod";
import {
  dateString,
  emptyToUndefined,
  firstIssue,
  formObject,
  optionalDate,
  optionalText,
  toDate,
  type ParseResult,
} from "@/lib/insights/form-schema";
import {
  buildPilotIndex,
  pairKey,
  rate,
  type InsightsDataset,
  type PilotSource,
} from "@/lib/insights/metrics";
import { maturityScore } from "@/lib/insights/stages";
import { jobsCreated, summarizeBatchReporting, summarizeOneOnOne } from "@/lib/insights/tracking";

// ---------------------------------------------------------------------------
// KPI-Insights Phase 3: Verwendungsnachweis for the Hessen Agentur grant
// (Antrag StuP, Abschnitt 3.1). Pure functions over the read-only dataset plus
// the Phase 3 tables (FundingScopeItem, FundingEventCount, FeedbackSurvey,
// FeedbackResponse). Events are tracked in Luma/Attio and only entered here
// as attendee counts.
// ---------------------------------------------------------------------------

export const FUNDING_PERIOD = {
  start: new Date("2026-04-15T00:00:00.000Z"),
  end: new Date("2027-02-28T00:00:00.000Z"),
  reportDue: new Date("2027-04-30T00:00:00.000Z"),
};

/** Antrag: Start-ups dürfen höchstens 5 Jahre alt sein. */
export const MAX_STARTUP_AGE_YEARS = 5;
/** Antrag: Vor-Gründungsteams höchstens 10 % der Teilnehmenden. */
export const MAX_PRE_FOUNDING_SHARE = 0.1;
export const ONE_ON_ONE_MAX_STARTUPS = 6;
export const ONE_ON_ONE_AID_EUR = 9243;

export const SCOPE_KINDS = ["BATCH", "PROGRAM"] as const;
export type ScopeKind = (typeof SCOPE_KINDS)[number];

export const FUNDING_FORMATS = [
  "CONSTRUCTION",
  "INDUSTRY",
  "HEALTH_TECH",
  "PROGRAM_1",
  "PROGRAM_2",
  "PROGRAM_3",
] as const;
export type FundingFormat = (typeof FUNDING_FORMATS)[number];

export interface FundingFormatConfig {
  label: string;
  kind: ScopeKind;
  /** Planned participants (Antrag 3.1). */
  target: number;
  /** Beihilfewert per participating startup. */
  aidEur: number;
  plannedPeriod: string;
}

export const FUNDING_FORMAT_CONFIG: Record<FundingFormat, FundingFormatConfig> = {
  CONSTRUCTION: { label: "Construction Accelerator", kind: "BATCH", target: 12, aidEur: 2979, plannedPeriod: "Mai bis September 2026" },
  INDUSTRY: { label: "Industry Accelerator", kind: "BATCH", target: 12, aidEur: 2910, plannedPeriod: "September bis Dezember 2026" },
  HEALTH_TECH: { label: "Health Tech Accelerator", kind: "BATCH", target: 12, aidEur: 3007, plannedPeriod: "September 2026 bis Januar 2027" },
  PROGRAM_1: { label: "Weiteres Programm 1", kind: "PROGRAM", target: 15, aidEur: 301, plannedPeriod: "im Förderzeitraum" },
  PROGRAM_2: { label: "Weiteres Programm 2", kind: "PROGRAM", target: 15, aidEur: 842, plannedPeriod: "im Förderzeitraum" },
  PROGRAM_3: { label: "Weiteres Programm 3", kind: "PROGRAM", target: 15, aidEur: 842, plannedPeriod: "im Förderzeitraum" },
};

export const FUNDING_EVENT_KINDS = ["DEMO_DAY", "FLAGSHIP", "CXO_DINNER", "PITCH_MATCHMAKING", "OTHER"] as const;
export type FundingEventKind = (typeof FUNDING_EVENT_KINDS)[number];

export interface FundingEventConfig {
  label: string;
  /** Planned number of events, if the Antrag names one. */
  planned: number | null;
  /** Target attendees per event. */
  min: number | null;
  max: number | null;
}

export const FUNDING_EVENT_CONFIG: Record<FundingEventKind, FundingEventConfig> = {
  DEMO_DAY: { label: "Demo Day", planned: 3, min: 50, max: 70 },
  FLAGSHIP: { label: "LOVE DISRUPTION (Flagship)", planned: 1, min: 275, max: null },
  CXO_DINNER: { label: "CxO-Dinner (DISRUPT FROM THE CORE)", planned: null, min: 40, max: 50 },
  PITCH_MATCHMAKING: { label: "Pitching & Matchmaking (DISRUPT FROM THE CORE)", planned: null, min: 20, max: 30 },
  OTHER: { label: "Sonstige Veranstaltung", planned: null, min: null, max: null },
};

export const EVENT_SOURCES = ["LUMA", "ATTIO", "OTHER"] as const;
export type EventSource = (typeof EVENT_SOURCES)[number];
export const EVENT_SOURCE_LABELS: Record<EventSource, string> = {
  LUMA: "Luma",
  ATTIO: "Attio",
  OTHER: "Andere Quelle",
};

/** Venture-Store bookings that count as participation. */
const PARTICIPATING_BOOKING = new Set(["CONFIRMED", "COMPLETED"]);

// --- Dataset ------------------------------------------------------------------

export interface FundingScopeRef {
  kind: string;
  refId: string;
  format: string;
}

export interface FundingEvent {
  id: string;
  kind: string;
  title: string;
  heldOn: Date;
  attendees: number;
  source: string;
}

export interface FundingSurvey {
  id: string;
  title: string;
  scopeKind: string;
  refId: string;
  closesOn: Date | null;
  closedAt: Date | null;
  createdAt: Date;
}

export interface FundingResponse {
  surveyId: string;
  startupId: string;
  recommend: number;
  overall: number;
}

export interface FundingDataset {
  scope: FundingScopeRef[];
  programs: { id: string; title: string; status: string }[];
  programBookings: { programId: string; startupId: string; status: string }[];
  activeMentors: number;
  foundedYears: { startupId: string; foundedYear: number | null }[];
  events: FundingEvent[];
  surveys: FundingSurvey[];
  responses: FundingResponse[];
}

// --- Helpers --------------------------------------------------------------------

export function labelOfFormat(format: string): string {
  return format in FUNDING_FORMAT_CONFIG ? FUNDING_FORMAT_CONFIG[format as FundingFormat].label : format;
}

export function labelOfEventKind(kind: string): string {
  return kind in FUNDING_EVENT_CONFIG ? FUNDING_EVENT_CONFIG[kind as FundingEventKind].label : kind;
}

/** Whole days from `today` until `target` (negative once passed). */
export function daysUntil(target: Date, today: Date): number {
  const startOfToday = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.round((target.getTime() - startOfToday) / 86_400_000);
}

function programParticipants(
  fd: Pick<FundingDataset, "programBookings">,
  programIds: Set<string>
): Set<string> {
  return new Set(
    fd.programBookings
      .filter((b) => programIds.has(b.programId) && PARTICIPATING_BOOKING.has(b.status))
      .map((b) => b.startupId)
  );
}

/** Startups that may answer a survey: batch members or program participants. */
export function surveyEligibleStartupIds(
  survey: Pick<FundingSurvey, "scopeKind" | "refId">,
  ds: Pick<InsightsDataset, "batchStartups">,
  fd: Pick<FundingDataset, "programBookings">
): Set<string> {
  if (survey.scopeKind === "BATCH") {
    return new Set(ds.batchStartups.filter((bs) => bs.batchId === survey.refId).map((bs) => bs.startupId));
  }
  return programParticipants(fd, new Set([survey.refId]));
}

export function isSurveyOpen(survey: Pick<FundingSurvey, "closesOn" | "closedAt">, today: Date): boolean {
  if (survey.closedAt) return false;
  return survey.closesOn === null || daysUntil(survey.closesOn, today) >= 0;
}

export interface FeedbackSummary {
  responses: number;
  /** Mean of the 0..10 recommendation question (Antrag: NPS ≥ 7). */
  recommendAvg: number | null;
  /** Classic NPS: promoters (9, 10) minus detractors (0 to 6), in points. */
  npsClassic: number | null;
  overallAvg: number | null;
}

export function summarizeFeedback(responses: FundingResponse[]): FeedbackSummary {
  const n = responses.length;
  if (n === 0) return { responses: 0, recommendAvg: null, npsClassic: null, overallAvg: null };
  const promoters = responses.filter((r) => r.recommend >= 9).length;
  const detractors = responses.filter((r) => r.recommend <= 6).length;
  const avg = (pick: (r: FundingResponse) => number) => responses.reduce((s, r) => s + pick(r), 0) / n;
  return {
    responses: n,
    recommendAvg: avg((r) => r.recommend),
    npsClassic: Math.round(((promoters - detractors) / n) * 100),
    overallAvg: avg((r) => r.overall),
  };
}

// --- Report -----------------------------------------------------------------------

export type KpiStatus = "reached" | "progress" | "missing" | "warning" | "info";

export const KPI_STATUS_LABELS: Record<KpiStatus, string> = {
  reached: "erreicht",
  progress: "läuft",
  missing: "keine Daten",
  warning: "prüfen",
  info: "Stand",
};

export interface FundingKpiRow {
  key: string;
  label: string;
  target: string;
  actual: string;
  source: string;
  note: string;
  status: KpiStatus;
}

export interface FundingFormatRow {
  format: FundingFormat | "ONE_ON_ONE";
  label: string;
  refs: { id: string; name: string }[];
  participants: number;
  target: number;
  aidEur: number;
  aidTotalEur: number;
}

export interface FundingBeneficiary {
  startupId: string;
  startupName: string;
  format: string;
  formatLabel: string;
  aidEur: number;
}

export interface FundingCheck {
  key: string;
  label: string;
  count: number;
  total: number;
  hint: string;
  /** "error" breaks an Antrag rule, "todo" only blocks a complete report. */
  severity: "error" | "todo";
}

export interface FundingEventGroup {
  kind: FundingEventKind;
  label: string;
  events: FundingEvent[];
  attendees: number;
  planned: number | null;
  min: number | null;
  max: number | null;
  /** Events below the minimum attendees. */
  belowMin: number;
}

export interface FundingReport {
  today: Date;
  daysToPeriodEnd: number;
  daysToReportDue: number;
  kpis: FundingKpiRow[];
  formats: FundingFormatRow[];
  beneficiaries: FundingBeneficiary[];
  checks: FundingCheck[];
  events: FundingEventGroup[];
  participantIds: Set<string>;
  feedback: FeedbackSummary;
}

const formatNumber = (n: number, digits = 0) =>
  n.toLocaleString("de-DE", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const percentText = (r: number | null) => (r === null ? "n. v." : `${formatNumber(r * 100)} %`);

function targetStatus(actual: number, target: number, hasData: boolean): KpiStatus {
  if (!hasData) return "missing";
  return actual >= target ? "reached" : "progress";
}

export function buildFundingReport(
  ds: InsightsDataset,
  fd: FundingDataset,
  today: Date = new Date(),
  pilots: Map<string, PilotSource[]> = buildPilotIndex(ds)
): FundingReport {
  const batchById = new Map(ds.batches.map((b) => [b.id, b]));
  const programById = new Map(fd.programs.map((p) => [p.id, p]));
  const startupById = new Map(ds.startups.map((s) => [s.id, s]));
  const metaByStartup = new Map(ds.reportingMeta.map((m) => [m.startupId, m]));

  // Formats and their participants.
  const formats: FundingFormatRow[] = [];
  const beneficiaries: FundingBeneficiary[] = [];
  const participantIds = new Set<string>();
  const acceleratorStartups = new Set<string>();
  const acceleratorBatchIds: string[] = [];
  let programParticipantCount = 0;

  for (const format of FUNDING_FORMATS) {
    const config = FUNDING_FORMAT_CONFIG[format];
    const refs = fd.scope
      .filter((s) => s.format === format && s.kind === config.kind)
      .flatMap((s) => {
        const name = config.kind === "BATCH" ? batchById.get(s.refId)?.name : programById.get(s.refId)?.title;
        return name ? [{ id: s.refId, name }] : [];
      });
    const refIds = new Set(refs.map((r) => r.id));
    const startups =
      config.kind === "BATCH"
        ? new Set(ds.batchStartups.filter((bs) => refIds.has(bs.batchId)).map((bs) => bs.startupId))
        : programParticipants(fd, refIds);
    if (config.kind === "BATCH") {
      acceleratorBatchIds.push(...refIds);
      for (const id of startups) acceleratorStartups.add(id);
    } else {
      programParticipantCount += startups.size;
    }
    for (const id of startups) {
      participantIds.add(id);
      beneficiaries.push({
        startupId: id,
        startupName: startupById.get(id)?.name ?? id,
        format,
        formatLabel: config.label,
        aidEur: config.aidEur,
      });
    }
    formats.push({
      format,
      label: config.label,
      refs,
      participants: startups.size,
      target: config.target,
      aidEur: config.aidEur,
      aidTotalEur: startups.size * config.aidEur,
    });
  }

  const oneOnOneStartups = new Set(ds.tracking.filter((t) => t.track === "ONE_ON_ONE").map((t) => t.startupId));
  for (const id of oneOnOneStartups) {
    participantIds.add(id);
    beneficiaries.push({
      startupId: id,
      startupName: startupById.get(id)?.name ?? id,
      format: "ONE_ON_ONE",
      formatLabel: "1:1 Akzelerator",
      aidEur: ONE_ON_ONE_AID_EUR,
    });
  }
  formats.push({
    format: "ONE_ON_ONE",
    label: "1:1 Akzelerator",
    refs: [],
    participants: oneOnOneStartups.size,
    target: ONE_ON_ONE_MAX_STARTUPS,
    aidEur: ONE_ON_ONE_AID_EUR,
    aidTotalEur: oneOnOneStartups.size * ONE_ON_ONE_AID_EUR,
  });
  beneficiaries.sort((a, b) => a.startupName.localeCompare(b.startupName, "de") || a.format.localeCompare(b.format));

  // Pilots and contracts in the accelerator batches (pair union across batches).
  const pilotPairs = new Set<string>();
  let basisContractPairs = 0;
  for (const batchId of new Set(acceleratorBatchIds)) {
    const startupIds = new Set(ds.batchStartups.filter((bs) => bs.batchId === batchId).map((bs) => bs.startupId));
    const partnerIds = new Set(ds.batchPartners.filter((bp) => bp.batchId === batchId).map((bp) => bp.partnerId));
    for (const key of pilots.keys()) {
      const [startupId, partnerId] = key.split(":");
      if (startupIds.has(startupId) && partnerIds.has(partnerId)) pilotPairs.add(pairKey(startupId, partnerId));
    }
    basisContractPairs += summarizeBatchReporting(ds, batchId, pilots).contractPairs;
  }
  const oneOnOne = summarizeOneOnOne(ds);

  // Events.
  const events: FundingEventGroup[] = FUNDING_EVENT_KINDS.map((kind) => {
    const config = FUNDING_EVENT_CONFIG[kind];
    const list = fd.events
      .filter((e) => e.kind === kind)
      .sort((a, b) => a.heldOn.getTime() - b.heldOn.getTime());
    return {
      kind,
      label: config.label,
      events: list,
      attendees: list.reduce((s, e) => s + e.attendees, 0),
      planned: config.planned,
      min: config.min,
      max: config.max,
      belowMin: config.min === null ? 0 : list.filter((e) => e.attendees < config.min!).length,
    };
  });
  const eventRow = (group: FundingEventGroup): FundingKpiRow => {
    const range = group.max === null ? `${group.min}` : `${group.min} bis ${group.max}`;
    const n = group.events.length;
    const status: KpiStatus =
      n === 0
        ? "missing"
        : group.belowMin > 0 || (group.planned !== null && n < group.planned)
          ? "progress"
          : "reached";
    return {
      key: `event-${group.kind}`,
      label: `Teilnehmende ${group.kind === "DEMO_DAY" ? "Demo Days" : group.label}`,
      target: `${range} je Veranstaltung${group.planned ? `, ${group.planned} geplant` : ""}`,
      actual:
        n === 0
          ? "noch nicht eingetragen"
          : group.events.map((e) => formatNumber(e.attendees)).join(" / "),
      source: "Luma / Attio (manuell)",
      note: n > 0 ? `${n} erfasst, zusammen ${formatNumber(group.attendees)} Teilnehmende` : "",
      status,
    };
  };

  // Feedback over all surveys.
  const feedback = summarizeFeedback(fd.responses);

  // Development facts of all funded participants.
  const metas = [...participantIds].map((id) => metaByStartup.get(id));
  const withMaturity = metas.filter(
    (m) => maturityScore(m?.maturityStart ?? null) !== null && maturityScore(m?.maturityCurrent ?? null) !== null
  );
  const maturityStartAvg =
    withMaturity.length > 0
      ? withMaturity.reduce((s, m) => s + maturityScore(m!.maturityStart)!, 0) / withMaturity.length
      : null;
  const maturityNowAvg =
    withMaturity.length > 0
      ? withMaturity.reduce((s, m) => s + maturityScore(m!.maturityCurrent)!, 0) / withMaturity.length
      : null;
  const marketReady = metas.filter((m) => m?.maturityCurrent === "MARKET_READY").length;

  const withRound = metas.filter((m) => m?.followOnRound === "SEED" || m?.followOnRound === "SERIES_A").length;
  const jobsData = metas.map((m) => jobsCreated(m)).filter((j): j is number => j !== null);
  const jobsTotal = jobsData.reduce((s, j) => s + j, 0);

  const basisPilotCount = pilotPairs.size;
  const pilotsTotal = basisPilotCount + oneOnOne.reachedPilot;
  const contractsTotal = basisContractPairs + oneOnOne.reachedContract;

  const kpis: FundingKpiRow[] = [
    {
      key: "accelerator-startups",
      label: "Start-ups in den Basis-Akzeleratoren",
      target: "36 (3 × 12)",
      actual: formatNumber(acceleratorStartups.size),
      source: "Batches (Formate zugeordnet)",
      note: formats
        .filter((f) => FUNDING_FORMAT_CONFIG[f.format as FundingFormat]?.kind === "BATCH")
        .map((f) => `${f.label}: ${f.participants}`)
        .join(", "),
      status: targetStatus(acceleratorStartups.size, 36, acceleratorBatchIds.length > 0),
    },
    {
      key: "one-on-one-startups",
      label: "Start-ups im 1:1 Akzelerator",
      target: `bis ${ONE_ON_ONE_MAX_STARTUPS}`,
      actual: formatNumber(oneOnOneStartups.size),
      source: "Pipeline-Tracking (1:1)",
      note: "",
      status:
        oneOnOneStartups.size > ONE_ON_ONE_MAX_STARTUPS ? "warning" : oneOnOneStartups.size === 0 ? "missing" : "reached",
    },
    {
      key: "program-participants",
      label: "Teilnehmende weitere Start-up Programme",
      target: "45 (3 × 15)",
      actual: formatNumber(programParticipantCount),
      source: "Venture-Store-Buchungen (bestätigt oder abgeschlossen)",
      note: formats
        .filter((f) => FUNDING_FORMAT_CONFIG[f.format as FundingFormat]?.kind === "PROGRAM")
        .map((f) => `${f.label}: ${f.participants}`)
        .join(", "),
      status: targetStatus(
        programParticipantCount,
        45,
        fd.scope.some((s) => s.kind === "PROGRAM")
      ),
    },
    {
      key: "mentors",
      label: "Mentor:innen & Expert:innen",
      target: "21 bis 60",
      actual: formatNumber(fd.activeMentors),
      source: "Expert:innen-Netzwerk (aktive Profile)",
      note: "",
      status: targetStatus(fd.activeMentors, 21, fd.activeMentors > 0),
    },
    ...events.filter((g) => g.kind !== "OTHER").map(eventRow),
    {
      key: "pilots",
      label: "Pilotierungen nach dem Basis-Akzelerator",
      target: "mindestens 3",
      actual: formatNumber(basisPilotCount),
      source: "Pilot-Index (Matrix, Engagement, PoC, Tracking)",
      note: "Startup × Partner im selben Batch",
      status: targetStatus(basisPilotCount, 3, acceleratorBatchIds.length > 0),
    },
    {
      key: "nps",
      label: "Net Promoter Score",
      target: "mindestens 7 (Skala 0 bis 10)",
      actual: feedback.recommendAvg === null ? "n. v." : formatNumber(feedback.recommendAvg, 1),
      source: "Feedback-Umfrage auf der Plattform",
      note:
        feedback.responses > 0
          ? `${feedback.responses} ${feedback.responses === 1 ? "Antwort" : "Antworten"}, klassischer NPS ${feedback.npsClassic}`
          : "",
      status: feedback.recommendAvg === null ? "missing" : feedback.recommendAvg >= 7 ? "reached" : "progress",
    },
    {
      key: "program-rating",
      label: "Bewertung des Programms",
      target: "Fragebogen und Interviews",
      actual: feedback.overallAvg === null ? "n. v." : `${formatNumber(feedback.overallAvg, 1)} von 5`,
      source: "Feedback-Umfrage auf der Plattform",
      note: "Interviews außerhalb der Plattform",
      status: feedback.overallAvg === null ? "missing" : "info",
    },
    {
      key: "maturity",
      label: "Technologischer Erfolg: MVP zu Marktreife",
      target: "Index-Score",
      actual:
        maturityStartAvg === null
          ? "n. v."
          : `${formatNumber(maturityStartAvg, 1)} zu ${formatNumber(maturityNowAvg!, 1)}`,
      source: "Reifegrad je Startup (1 Idee bis 5 Marktreife)",
      note: `${withMaturity.length} von ${participantIds.size} mit Start und heute, ${marketReady} marktreif`,
      status: withMaturity.length === 0 ? "missing" : "info",
    },
    {
      key: "pilot-to-contract",
      label: "Pilot-to-Contract-Ratio",
      target: "Erhebung 12 Monate nach Programmende",
      actual: percentText(rate(contractsTotal, pilotsTotal)),
      source: "Pipeline-Tracking",
      note: `Zwischenstand: ${contractsTotal} Verträge aus ${pilotsTotal} Piloten (Basis ${basisContractPairs}/${basisPilotCount}, 1:1 ${oneOnOne.reachedContract}/${oneOnOne.reachedPilot})`,
      status: pilotsTotal === 0 ? "missing" : "info",
    },
    {
      key: "follow-on",
      label: "Follow-on Funding Rate",
      target: "Seed oder Series A binnen 12 Monaten",
      actual: percentText(rate(withRound, participantIds.size)),
      source: "Förder-Merkmale (Folgefinanzierung)",
      note: `${withRound} von ${participantIds.size} Teilnehmenden`,
      status: participantIds.size === 0 ? "missing" : "info",
    },
    {
      key: "jobs",
      label: "Job Creation Multiplier",
      target: "neue VZÄ pro Start-up binnen 2 Jahren",
      actual: jobsData.length === 0 ? "n. v." : formatNumber(jobsTotal / jobsData.length, 1),
      source: "Förder-Merkmale (VZÄ bei Start und heute)",
      note: `${formatNumber(jobsTotal)} neue VZÄ bei ${jobsData.length} von ${participantIds.size} Start-ups mit Daten`,
      status: jobsData.length === 0 ? "missing" : "info",
    },
  ];

  // Compliance and completeness checks.
  const participants = [...participantIds];
  const foundedYear = new Map(fd.foundedYears.map((f) => [f.startupId, f.foundedYear]));
  const minYear = FUNDING_PERIOD.start.getUTCFullYear() - MAX_STARTUP_AGE_YEARS;
  const preFounding = participants.filter((id) => metaByStartup.get(id)?.preFounding === true).length;
  const scopedBatches = [...new Set(acceleratorBatchIds)].map((id) => batchById.get(id)!).filter(Boolean);
  const formatsInScope = new Set(fd.scope.map((s) => s.format));
  const multiFormat = new Set(
    participants.filter((id) => beneficiaries.filter((b) => b.startupId === id).length > 1)
  );

  const checks: FundingCheck[] = [
    {
      key: "startup-age",
      label: `Teilnehmende älter als ${MAX_STARTUP_AGE_YEARS} Jahre (gegründet vor ${minYear})`,
      count: participants.filter((id) => {
        const y = foundedYear.get(id);
        return y != null && y < minYear;
      }).length,
      total: participants.length,
      hint: `Gründung ${minYear} bitte mit genauem Datum prüfen.`,
      severity: "error",
    },
    {
      key: "startup-founded-missing",
      label: "Teilnehmende ohne Gründungsjahr",
      count: participants.filter((id) => foundedYear.get(id) == null).length,
      total: participants.length,
      hint: "Im Startup-Profil pflegen; nötig für die Altersgrenze.",
      severity: "todo",
    },
    {
      key: "pre-founding-share",
      label: `Vor-Gründungsteams über ${formatNumber(MAX_PRE_FOUNDING_SHARE * 100)} %`,
      count: preFounding,
      total: participants.length,
      hint:
        participants.length > 0 && preFounding / participants.length > MAX_PRE_FOUNDING_SHARE
          ? "Anteil liegt über der Grenze aus dem Antrag."
          : "Anteil liegt innerhalb der Grenze.",
      severity: participants.length > 0 && preFounding / participants.length > MAX_PRE_FOUNDING_SHARE ? "error" : "todo",
    },
    {
      key: "pre-founding-missing",
      label: "Teilnehmende ohne Angabe zur Vor-Gründung",
      count: participants.filter((id) => (metaByStartup.get(id)?.preFounding ?? null) === null).length,
      total: participants.length,
      hint: "In den Förder-Merkmalen des Startups eintragen.",
      severity: "todo",
    },
    {
      key: "one-on-one-hessen",
      label: "1:1 Start-ups ohne bestätigten Sitz in Hessen",
      count: [...oneOnOneStartups].filter((id) => metaByStartup.get(id)?.hessenBased !== true).length,
      total: oneOnOneStartups.size,
      hint: "Ansiedlung in Hessen ist Kriterium für den 1:1 Akzelerator.",
      severity: "todo",
    },
    {
      key: "one-on-one-max",
      label: `Mehr als ${ONE_ON_ONE_MAX_STARTUPS} Start-ups im 1:1 Akzelerator`,
      count: Math.max(0, oneOnOneStartups.size - ONE_ON_ONE_MAX_STARTUPS),
      total: oneOnOneStartups.size,
      hint: "Antrag: bis zu 6 Start-ups.",
      severity: "error",
    },
    {
      key: "batch-dates",
      label: "Zugeordnete Batches ohne Start- und Enddatum",
      count: scopedBatches.filter((b) => !b.startDate || !b.endDate).length,
      total: scopedBatches.length,
      hint: "Ohne Zeitraum lässt sich die Durchführung im Förderzeitraum nicht belegen.",
      severity: "todo",
    },
    {
      key: "batch-outside-period",
      label: "Zugeordnete Batches außerhalb des Förderzeitraums",
      count: scopedBatches.filter(
        (b) =>
          (b.startDate && b.startDate.getTime() < FUNDING_PERIOD.start.getTime()) ||
          (b.endDate && b.endDate.getTime() > FUNDING_PERIOD.end.getTime())
      ).length,
      total: scopedBatches.length,
      hint: "Förderzeitraum 15.04.2026 bis 28.02.2027.",
      severity: "error",
    },
    {
      key: "formats-unmapped",
      label: "Formate ohne zugeordneten Batch oder Programm",
      count: FUNDING_FORMATS.filter((f) => !formatsInScope.has(f)).length,
      total: FUNDING_FORMATS.length,
      hint: "Unter „Formate zuordnen“ verknüpfen.",
      severity: "todo",
    },
    {
      key: "multi-format",
      label: "Start-ups in mehreren geförderten Formaten",
      count: multiFormat.size,
      total: participants.length,
      hint: "Beihilfewerte addieren sich (De-minimis prüfen).",
      severity: "todo",
    },
  ];

  return {
    today,
    daysToPeriodEnd: daysUntil(FUNDING_PERIOD.end, today),
    daysToReportDue: daysUntil(FUNDING_PERIOD.reportDue, today),
    kpis,
    formats,
    beneficiaries,
    checks,
    events,
    participantIds,
    feedback,
  };
}

// --- Form parsing -------------------------------------------------------------------

const scopeSchema = z.object({
  kind: z.enum(SCOPE_KINDS, { message: "Art fehlt." }),
  refId: z.string().min(1, "Batch oder Programm fehlt.").max(64),
  format: z.preprocess(emptyToUndefined, z.enum(FUNDING_FORMATS, { message: "Unbekanntes Format." }).optional()),
});

export interface ScopeInput {
  kind: ScopeKind;
  refId: string;
  /** null removes the assignment. */
  format: FundingFormat | null;
}

export function parseScopeForm(fd: FormData): ParseResult<ScopeInput> {
  const parsed = scopeSchema.safeParse(formObject(fd));
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const { kind, refId, format } = parsed.data;
  if (format && FUNDING_FORMAT_CONFIG[format].kind !== kind) {
    return { error: kind === "BATCH" ? "Batches gehören zu einem Akzelerator-Format." : "Programme gehören zu einem Programm-Format." };
  }
  return { data: { kind, refId, format: format ?? null } };
}

const eventSchema = z.object({
  kind: z.enum(FUNDING_EVENT_KINDS, { message: "Art der Veranstaltung wählen." }),
  title: z.string().trim().min(1, "Titel fehlt.").max(200, "Höchstens 200 Zeichen."),
  heldOn: z.string({ message: "Datum fehlt." }).pipe(dateString),
  attendees: z.coerce
    .number({ message: "Teilnehmerzahl eingeben." })
    .int("Bitte eine ganze Zahl eingeben.")
    .min(0, "Werte dürfen nicht negativ sein.")
    .max(100_000, "Höchstens 100.000."),
  source: z.enum(EVENT_SOURCES, { message: "Quelle wählen." }),
  note: optionalText(1000),
});

export interface EventInput {
  kind: FundingEventKind;
  title: string;
  heldOn: Date;
  attendees: number;
  source: EventSource;
  note: string | null;
}

export function parseEventForm(fd: FormData): ParseResult<EventInput> {
  const values = formObject(fd);
  if (!values.attendees?.trim()) return { error: "Teilnehmerzahl eingeben." };
  const parsed = eventSchema.safeParse(values);
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const v = parsed.data;
  return {
    data: {
      kind: v.kind,
      title: v.title,
      heldOn: toDate(v.heldOn)!,
      attendees: v.attendees,
      source: v.source,
      note: v.note ?? null,
    },
  };
}

const surveySchema = z.object({
  scopeKind: z.enum(SCOPE_KINDS, { message: "Batch oder Programm wählen." }),
  refId: z.string().min(1, "Batch oder Programm wählen.").max(64),
  title: z.string().trim().min(1, "Titel fehlt.").max(200, "Höchstens 200 Zeichen."),
  closesOn: optionalDate,
});

export interface SurveyInput {
  scopeKind: ScopeKind;
  refId: string;
  title: string;
  closesOn: Date | null;
}

export function parseSurveyForm(fd: FormData): ParseResult<SurveyInput> {
  const values = formObject(fd);
  const [scopeKind, ...rest] = (values.scope ?? "").split(":");
  const parsed = surveySchema.safeParse({ ...values, scopeKind, refId: rest.join(":") });
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const v = parsed.data;
  return { data: { scopeKind: v.scopeKind, refId: v.refId, title: v.title, closesOn: toDate(v.closesOn) } };
}

const scale = (min: number, max: number, message: string) =>
  z.preprocess(
    emptyToUndefined,
    z.coerce.number({ message }).int(message).min(min, message).max(max, message)
  );

const responseSchema = z.object({
  surveyId: z.string().min(1, "Umfrage fehlt.").max(64),
  recommend: scale(0, 10, "Bitte die Weiterempfehlung von 0 bis 10 wählen."),
  overall: scale(1, 5, "Bitte eine Gesamtbewertung von 1 bis 5 wählen."),
  goodText: optionalText(2000),
  improveText: optionalText(2000),
});

export interface ResponseInput {
  surveyId: string;
  recommend: number;
  overall: number;
  goodText: string | null;
  improveText: string | null;
}

export function parseResponseForm(fd: FormData): ParseResult<ResponseInput> {
  const parsed = responseSchema.safeParse(formObject(fd));
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const v = parsed.data;
  return {
    data: {
      surveyId: v.surveyId,
      recommend: v.recommend,
      overall: v.overall,
      goodText: v.goodText ?? null,
      improveText: v.improveText ?? null,
    },
  };
}
