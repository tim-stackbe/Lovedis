import { TRACKING_STRUCTURED_SELECT } from "@/lib/insights/data";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// KPI-Insights history (Plan: plan-kpi-analytics-hub, Abschnitt 4.1).
//
// The existing tools overwrite their state in place. This job READS the
// KPI-relevant fields and appends them to `MetricSnapshot` whenever they
// changed since the last stored state, so period reports and baselines become
// possible from the first run on. It never writes to any source table.
// ---------------------------------------------------------------------------

export const SNAPSHOT_ENTITY_TYPES = [
  "MATCH",
  "STARTUP",
  "BOOKING",
  "ENGAGEMENT",
  "POC",
  "TRACKING",
  "REPORTING_META",
] as const;
export type SnapshotEntityType = (typeof SNAPSHOT_ENTITY_TYPES)[number];

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export interface SnapshotRecord {
  entityType: SnapshotEntityType;
  entityId: string;
  state: { [key: string]: JsonValue };
}

/** JSON with object keys sorted, so equal states always hash equally. */
export function stableStringify(value: JsonValue): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    const keys = Object.keys(value).sort();
    return `{${keys
      .map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export async function hashState(state: SnapshotRecord["state"]): Promise<string> {
  const bytes = new TextEncoder().encode(stableStringify(state));
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Midnight UTC of the given instant (the `takenOn` calendar day). */
export function utcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** Date columns as YYYY-MM-DD so the state is plain, stably hashable JSON. */
function jsonDates(row: Record<string, string | number | boolean | Date | null>): {
  [key: string]: JsonPrimitive;
} {
  return Object.fromEntries(
    Object.entries(row).map(([k, v]) => [k, v instanceof Date ? v.toISOString().slice(0, 10) : v])
  );
}

function snapshotKey(entityType: string, entityId: string): string {
  return `${entityType}:${entityId}`;
}

/** Reads the KPI-relevant state of every tracked entity (read-only). */
export async function collectSnapshotRecords(): Promise<SnapshotRecord[]> {
  const [matches, startups, bookings, engagements, pocs, tracking, reportingMeta] = await Promise.all([
    prisma.partnerStartupMatch.findMany({
      select: {
        id: true,
        batchId: true,
        partnerId: true,
        startupId: true,
        startupRelevance: true,
        partnerRelevance: true,
        contactStatus: true,
        useCaseTypes: true,
        startupFollowUp: true,
        partnerFollowUp: true,
        startupContacted: true,
        partnerContacted: true,
        partnerInterested: true,
      },
    }),
    prisma.startup.findMany({
      select: {
        id: true,
        teamSize: true,
        stage: true,
        pipelineStage: true,
        fundingRaised: true,
        city: true,
        industry: true,
      },
    }),
    prisma.marketplaceBooking.findMany({
      select: {
        id: true,
        startupId: true,
        status: true,
        offeringType: true,
        creditCost: true,
        fixCreditCost: true,
      },
    }),
    prisma.engagement.findMany({
      select: { id: true, startupId: true, partnerId: true, status: true },
    }),
    prisma.poCPerformance.findMany({
      select: { id: true, applicationId: true, status: true },
    }),
    prisma.pipelineTracking.findMany({ select: TRACKING_STRUCTURED_SELECT }),
    prisma.startupReportingMeta.findMany({
      select: {
        id: true,
        startupId: true,
        hessenBased: true,
        foundersTotal: true,
        foundersFemale: true,
        teamTotal: true,
        teamFemale: true,
        fteBaseline: true,
        fteBaselineOn: true,
        evidence: true,
      },
    }),
  ]);

  const records: SnapshotRecord[] = [];
  for (const { id, useCaseTypes, ...m } of matches) {
    records.push({
      entityType: "MATCH",
      entityId: id,
      state: { ...m, useCaseTypes: [...useCaseTypes].sort() },
    });
  }
  for (const { id, ...s } of startups) {
    records.push({ entityType: "STARTUP", entityId: id, state: s });
  }
  for (const { id, ...b } of bookings) {
    records.push({ entityType: "BOOKING", entityId: id, state: b });
  }
  for (const { id, ...e } of engagements) {
    records.push({ entityType: "ENGAGEMENT", entityId: id, state: e });
  }
  for (const { id, ...p } of pocs) {
    records.push({ entityType: "POC", entityId: id, state: p });
  }
  for (const { id, ...t } of tracking) {
    records.push({ entityType: "TRACKING", entityId: id, state: jsonDates(t) });
  }
  for (const { id, ...m } of reportingMeta) {
    records.push({ entityType: "REPORTING_META", entityId: id, state: jsonDates(m) });
  }
  return records;
}

export interface SnapshotResult {
  takenOn: string;
  checked: number;
  written: number;
}

/**
 * Stores every record whose state differs from its latest stored state. A
 * second run on the same day replaces that day's row (one row per entity/day).
 */
export async function takeInsightsSnapshot(now: Date = new Date()): Promise<SnapshotResult> {
  const takenOn = utcDay(now);
  const records = await collectSnapshotRecords();

  const latest = await prisma.metricSnapshot.findMany({
    distinct: ["entityType", "entityId"],
    orderBy: [{ entityType: "asc" }, { entityId: "asc" }, { takenOn: "desc" }],
    select: { entityType: true, entityId: true, stateHash: true },
  });
  const latestHash = new Map(
    latest.map((r) => [snapshotKey(r.entityType, r.entityId), r.stateHash])
  );

  const changed: (SnapshotRecord & { stateHash: string })[] = [];
  for (const record of records) {
    const stateHash = await hashState(record.state);
    if (latestHash.get(snapshotKey(record.entityType, record.entityId)) !== stateHash) {
      changed.push({ ...record, stateHash });
    }
  }

  if (changed.length > 0) {
    await prisma.$transaction([
      prisma.metricSnapshot.deleteMany({
        where: {
          takenOn,
          OR: changed.map((c) => ({ entityType: c.entityType, entityId: c.entityId })),
        },
      }),
      prisma.metricSnapshot.createMany({
        data: changed.map((c) => ({
          takenOn,
          entityType: c.entityType,
          entityId: c.entityId,
          state: c.state,
          stateHash: c.stateHash,
        })),
      }),
    ]);
  }

  return {
    takenOn: takenOn.toISOString().slice(0, 10),
    checked: records.length,
    written: changed.length,
  };
}
