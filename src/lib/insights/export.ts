import {
  APPLICATION_STATUS_LABELS,
  BATCH_TYPE_LABELS,
  BOOKING_STATUS_LABELS,
  ENGAGEMENT_STATUS_LABELS,
  MARKETPLACE_OFFERING_TYPE_LABELS,
  MATCH_CONTACT_STATUS_LABELS,
  POC_STATUS_LABELS,
  RELEVANCE_LABELS,
} from "@/lib/constants";
import {
  buildPilotIndex,
  isQualifiedMatch,
  pairKey,
  PILOT_SOURCE_LABELS,
  summarizeBatch,
  type InsightsDataset,
} from "@/lib/insights/metrics";
import {
  effectiveStage,
  EVIDENCE_LABELS,
  FOLLOW_ON_ROUND_LABELS,
  labelOf,
  MATURITY_LABELS,
  OUTCOME_LABELS,
  STAGE_LABELS,
  SUPPORT_INTENSITY_LABELS,
  TRACK_LABELS,
} from "@/lib/insights/stages";
import { isFemaleFounder, jobsCreated, summarizeBatchReporting } from "@/lib/insights/tracking";
import {
  EVENT_SOURCE_LABELS,
  KPI_STATUS_LABELS,
  type FundingDataset,
  type FundingReport,
} from "@/lib/insights/funding";

// ---------------------------------------------------------------------------
// Flat "fact" sheets for the XLSX export, meant to be pivoted in Excel. Only
// structured columns (ids, names, statuses, counts); free-text notes from the
// matrix or engagements are never part of the dataset, so they cannot leak.
// ---------------------------------------------------------------------------

export type ExportCell = string | number;
export interface ExportSheet {
  name: string;
  rows: Record<string, ExportCell>[];
}

function day(date: Date | null): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

function percent(value: number | null): ExportCell {
  return value === null ? "" : Math.round(value * 1000) / 10;
}

export function buildExportSheets(ds: InsightsDataset): ExportSheet[] {
  const pilots = buildPilotIndex(ds);
  const batchById = new Map(ds.batches.map((b) => [b.id, b]));
  const partnerById = new Map(ds.partners.map((p) => [p.id, p]));
  const startupById = new Map(ds.startups.map((s) => [s.id, s]));
  const challengeById = new Map(ds.challenges.map((c) => [c.id, c]));

  const batchRows = ds.batches.flatMap((b) => {
    const s = summarizeBatch(ds, b.id, pilots);
    if (!s) return [];
    const r = summarizeBatchReporting(ds, b.id, pilots);
    return [
      {
        Batch: b.name,
        Typ: BATCH_TYPE_LABELS[b.type],
        Start: day(b.startDate),
        Ende: day(b.endDate),
        Startups: s.startups,
        Partner: s.partners,
        "Bewertete Paarungen": s.ratedPairings,
        Matches: s.matches,
        "Matches mit Pilot": s.matchesWithPilot,
        "Match zu Pilot (%)": percent(s.matchToPilotRate),
        "Pilot-Paare": s.pilotPairs,
        "Startups mit Challenge-Bewerbung": s.startupsWithApplication,
        "Startups ohne Challenge-Bewerbung": s.startupsWithoutApplication,
        "Sessions gebucht": s.sessionsBooked,
        "Sessions abgeschlossen": s.sessionsCompleted,
        "Credits eingelöst": s.creditsRedeemed,
        "Partner-Retention (%)": percent(s.retention?.rate ?? null),
        "Retention ggü. Batch": s.retention?.previousBatchName ?? "",
        "Hessen (bestätigt)": r.hessenConfirmed,
        "Female Founder": r.femaleFounders,
        "Frauenanteil Team (%)": percent(r.femaleTeamShare),
        "Jobs seit Baseline": r.jobsCreated,
        Challenges: r.challenges,
        "Challenges abgedeckt": r.challengesCovered,
        "Pilot-Paare mit LOI/Vertrag": r.dealPairs,
        "Pilot-Paare mit Vertrag": r.contractPairs,
        "Pilot zu LOI/Vertrag (%)": percent(r.pilotToDealRate),
        "Umsatz mit Partnern (EUR)": r.revenueEur,
        "Startups Marktreife": r.marketReadyStartups,
      },
    ];
  });

  const metaByStartup = new Map(ds.reportingMeta.map((m) => [m.startupId, m]));
  const batchStartupIds = new Set(ds.batchStartups.map((bs) => bs.startupId));
  const featureRows = ds.startups
    .filter((s) => batchStartupIds.has(s.id) || metaByStartup.has(s.id))
    .map((s) => {
      const meta = metaByStartup.get(s.id);
      const female = isFemaleFounder(meta);
      const jobs = jobsCreated(meta);
      return {
        Startup: s.name,
        Batches: ds.batchStartups
          .filter((bs) => bs.startupId === s.id)
          .map((bs) => batchById.get(bs.batchId)?.name ?? "")
          .join(", "),
        Stadt: s.city ?? "",
        Hessen: meta?.hessenBased === true ? "ja" : meta?.hessenBased === false ? "nein" : "offen",
        "Gründer:innen": meta?.foundersTotal ?? "",
        "davon Frauen": meta?.foundersFemale ?? "",
        "Female Founder": female === null ? "" : female ? 1 : 0,
        "Team gesamt": meta?.teamTotal ?? "",
        "Team Frauen": meta?.teamFemale ?? "",
        "Vor-Gründung": meta?.preFounding === true ? "ja" : meta?.preFounding === false ? "nein" : "",
        "VZÄ Baseline": meta?.fteBaseline ?? "",
        "Baseline am": day(meta?.fteBaselineOn ?? null),
        "VZÄ heute": meta?.fteCurrent ?? "",
        "VZÄ heute am": day(meta?.fteCurrentOn ?? null),
        "Neue VZÄ": jobs ?? "",
        "Reifegrad Start": labelOf(MATURITY_LABELS, meta?.maturityStart ?? null),
        "Reifegrad heute": labelOf(MATURITY_LABELS, meta?.maturityCurrent ?? null),
        Folgefinanzierung: labelOf(FOLLOW_ON_ROUND_LABELS, meta?.followOnRound ?? null),
        "Runde am": day(meta?.followOnRoundOn ?? null),
        Nachweis: labelOf(EVIDENCE_LABELS, meta?.evidence ?? null),
      };
    });

  const trackingRows = ds.tracking.map((t) => ({
    Programm: labelOf(TRACK_LABELS, t.track),
    Batch: t.batchId ? batchById.get(t.batchId)?.name ?? "" : "",
    Startup: startupById.get(t.startupId)?.name ?? "",
    Partner: t.partnerCompanyId ? partnerById.get(t.partnerCompanyId)?.name ?? "" : "",
    Challenge: t.challengeId ? challengeById.get(t.challengeId)?.title ?? "" : "",
    "Stufe (erreicht)": STAGE_LABELS[effectiveStage(t)],
    "Intro durch LOVEDIS": day(t.introByLovedisOn),
    "Pilot ab": day(t.pilotStartOn),
    LOI: day(t.loiOn),
    Vertrag: day(t.contractOn),
    "Erster Umsatz": day(t.firstRevenueOn),
    "Umsatz (EUR)": t.revenueEur ?? "",
    Betreuungsintensität: labelOf(SUPPORT_INTENSITY_LABELS, t.supportIntensity),
    NDA: t.ndaSigned ? 1 : 0,
    "IP-Vereinbarung": t.ipAgreement ? 1 : 0,
    "Co-Innovation": t.coInnovationAgreement ? 1 : 0,
    Start: day(t.startOn),
    Ende: day(t.endOn),
    "Kosten Partner (EUR)": t.costPartnerEur ?? "",
    "Kosten LOVEDIS (EUR)": t.costLovedisEur ?? "",
    "Kosten Startup (EUR)": t.costStartupEur ?? "",
    Outcome: labelOf(OUTCOME_LABELS, t.outcome),
  }));

  const matchRows = ds.matches.flatMap((m) => {
    const batch = batchById.get(m.batchId);
    const partner = partnerById.get(m.partnerId);
    const startup = startupById.get(m.startupId);
    if (!batch || !partner || !startup) return [];
    const sources = pilots.get(pairKey(m.startupId, m.partnerId)) ?? [];
    return [
      {
        Batch: batch.name,
        Startup: startup.name,
        Branche: startup.industry,
        Partner: partner.name,
        "Relevanz Startup": m.startupRelevance ? RELEVANCE_LABELS[m.startupRelevance] : "",
        "Relevanz Partner": m.partnerRelevance ? RELEVANCE_LABELS[m.partnerRelevance] : "",
        Kontaktstatus: MATCH_CONTACT_STATUS_LABELS[m.contactStatus],
        "Match (KPI)": isQualifiedMatch(m) ? 1 : 0,
        "Pilot (KPI)": sources.length > 0 ? 1 : 0,
        "Pilot-Quelle": sources.map((s) => PILOT_SOURCE_LABELS[s]).join(", "),
      },
    ];
  });

  const collaborationRows = [
    ...ds.engagements.map((e) => ({
      Art: "Engagement",
      Startup: startupById.get(e.startupId)?.name ?? "",
      Partner: e.partnerCompanyId ? partnerById.get(e.partnerCompanyId)?.name ?? "" : "",
      Titel: e.title,
      Status: ENGAGEMENT_STATUS_LABELS[e.status],
      Start: day(e.startDate),
    })),
    ...ds.applications.map((a) => {
      const challenge = challengeById.get(a.challengeId);
      return {
        Art: "Challenge-Bewerbung",
        Startup: startupById.get(a.startupId)?.name ?? "",
        Partner: challenge?.partnerCompanyId
          ? partnerById.get(challenge.partnerCompanyId)?.name ?? ""
          : "",
        Titel: challenge?.title ?? "",
        Status: a.pocStatus
          ? `PoC: ${POC_STATUS_LABELS[a.pocStatus]}`
          : APPLICATION_STATUS_LABELS[a.status],
        Start: "",
      };
    }),
  ];

  const bookingRows = ds.bookings.map((b) => ({
    Startup: startupById.get(b.startupId)?.name ?? "",
    Art: MARKETPLACE_OFFERING_TYPE_LABELS[b.offeringType],
    Status: BOOKING_STATUS_LABELS[b.status],
    Credits: b.credits,
    Angefragt: day(b.createdAt),
  }));

  return [
    { name: "Batch-KPIs", rows: batchRows },
    { name: "Matches", rows: matchRows },
    { name: "Kooperationen", rows: collaborationRows },
    { name: "Buchungen", rows: bookingRows },
    { name: "Pipeline-Tracking", rows: trackingRows },
    { name: "Förder-Merkmale", rows: featureRows },
  ];
}

/** Workbook for the Verwendungsnachweis (Phase 3), next to the Förder-Merkmale. */
export function buildFundingSheets(ds: InsightsDataset, fd: FundingDataset, report: FundingReport): ExportSheet[] {
  const metaByStartup = new Map(ds.reportingMeta.map((m) => [m.startupId, m]));
  const foundedYear = new Map(fd.foundedYears.map((f) => [f.startupId, f.foundedYear]));
  const yesNo = (v: boolean | null | undefined) => (v === true ? "ja" : v === false ? "nein" : "");

  return [
    {
      name: "Verwendungsnachweis",
      rows: report.kpis.map((k) => ({
        KPI: k.label,
        Soll: k.target,
        Ist: k.actual,
        Status: KPI_STATUS_LABELS[k.status],
        Quelle: k.source,
        Hinweis: k.note,
      })),
    },
    {
      name: "Formate",
      rows: report.formats.map((f) => ({
        Format: f.label,
        Zugeordnet: f.refs.map((r) => r.name).join(", "),
        Teilnehmende: f.participants,
        Soll: f.target,
        "Beihilfewert je Startup (EUR)": f.aidEur,
        "Beihilfe gesamt (EUR)": f.aidTotalEur,
      })),
    },
    {
      name: "Begünstigte",
      rows: report.beneficiaries.map((b) => {
        const meta = metaByStartup.get(b.startupId);
        return {
          Startup: b.startupName,
          Format: b.formatLabel,
          "Beihilfewert (EUR)": b.aidEur,
          Gründungsjahr: foundedYear.get(b.startupId) ?? "",
          Hessen: yesNo(meta?.hessenBased),
          "Vor-Gründung": yesNo(meta?.preFounding),
        };
      }),
    },
    {
      name: "Veranstaltungen",
      rows: report.events.flatMap((g) =>
        g.events.map((e) => ({
          Art: g.label,
          Titel: e.title,
          Datum: day(e.heldOn),
          Teilnehmende: e.attendees,
          "Soll je Veranstaltung": g.min === null ? "" : g.max === null ? `${g.min}` : `${g.min} bis ${g.max}`,
          Quelle: labelOf(EVENT_SOURCE_LABELS, e.source),
        }))
      ),
    },
    {
      name: "Prüfpunkte",
      rows: report.checks.map((c) => ({
        Prüfung: c.label,
        Betroffen: c.count,
        Gesamt: c.total,
        Art: c.severity === "error" ? "Regel aus dem Antrag" : "Datenpflege",
        Hinweis: c.hint,
      })),
    },
  ];
}
