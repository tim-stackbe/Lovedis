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
      },
    ];
  });

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
  ];
}
