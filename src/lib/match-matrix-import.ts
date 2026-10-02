import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import Papa from "papaparse";
import type { PrismaClient } from "@/generated/prisma/client";
import type {
  BatchType,
  MatchContactStatus,
  MatchUseCaseType,
  RelevanceLevel,
} from "@/generated/prisma/enums";
import {
  PARTNER_COMPANIES,
  parseContactStatus,
  parseRelevance,
  parseUseCaseTypes,
} from "@/lib/match-matrix";

// ---------------------------------------------------------------------------
// Match-Matrix CSV importer. Turns the shared Google-Sheet "Matrix" tab into
// the initial PartnerStartupMatch dataset. NODE-ONLY (uses node:fs + papaparse)
// — imported exclusively by the seed, the standalone import/migration scripts
// and the unit tests, NEVER by the client bundle or the RSC page.
//
// Sheet layout (verbatim in prisma/data/match-matrix.csv):
//   row 0  → partner header  (col 1 FingerHaus, col 7 Lupp, …; 6 cols/partner)
//   row 1  → field header    (Startup, Partner, Use-Case, Next steps, Intro…)
//   row 2+ → one startup per row
// Per partner p (0-based) the five fields start at column 1 + p*6:
//   +0 Startup-relevance · +1 Partner-relevance · +2 Use-Case ·
//   +3 Next steps · +4 Intro Mail / Calls   (+5 is a blank separator column)
// ---------------------------------------------------------------------------

/** Columns each partner block spans in the sheet (5 fields + 1 separator). */
const COLS_PER_PARTNER = 6;
/** Column index of the first partner's first field. */
const FIRST_PARTNER_COL = 1;
/** First data row (rows 0/1 are the two header rows). */
const FIRST_DATA_ROW = 2;

/**
 * Defaults used when a sheet startup does not yet exist in the DB. We CREATE a
 * minimal Startup (rather than skipping) so the matrix is fully functional; the
 * placeholder description/industry make clear the profile still needs curation.
 */
export const MATCH_MATRIX_STARTUP_DEFAULTS = {
  description:
    "Aus der Match-Matrix (Partner-Matchmaking-Sheet) importiert. Profil noch nicht angereichert.",
  industry: "Bau & PropTech",
} as const;

export interface ParsedMatchCell {
  partnerSlug: string;
  startupRelevance: RelevanceLevel | null;
  partnerRelevance: RelevanceLevel | null;
  useCaseTypes: MatchUseCaseType[];
  useCaseNote: string | null;
  nextSteps: string | null;
  contactStatus: MatchContactStatus;
}

export interface ParsedStartupRow {
  startupName: string;
  /** Only pairings that carry any data (fully-empty cells are dropped). */
  cells: ParsedMatchCell[];
}

export interface ParsedMatchMatrix {
  rows: ParsedStartupRow[];
  /** Startups present in the sheet but with no data in any partner column. */
  skipped: string[];
}

/** Reads the bundled source CSV from prisma/data/match-matrix.csv. */
export function loadMatchMatrixCsv(): string {
  const path = fileURLToPath(
    new URL("../../prisma/data/match-matrix.csv", import.meta.url)
  );
  return readFileSync(path, "utf8");
}

function clean(value: string | undefined): string {
  return (value ?? "").trim();
}

/**
 * Parses the sheet CSV into structured rows. A cell is kept only when it has
 * any data (relevance, a use-case, next steps or a contact hint). Startups with
 * no data in any column land in `skipped`.
 */
export function parseMatchMatrixCsv(csv: string = loadMatchMatrixCsv()): ParsedMatchMatrix {
  const parsed = Papa.parse<string[]>(csv.trim(), {
    skipEmptyLines: "greedy",
  });
  const table = parsed.data;

  const rows: ParsedStartupRow[] = [];
  const skipped: string[] = [];

  for (let r = FIRST_DATA_ROW; r < table.length; r++) {
    const record = table[r];
    const startupName = clean(record[0]);
    if (!startupName) continue;

    const cells: ParsedMatchCell[] = [];
    PARTNER_COMPANIES.forEach((partner, p) => {
      const base = FIRST_PARTNER_COL + p * COLS_PER_PARTNER;
      const startupRelevance = parseRelevance(record[base]);
      const partnerRelevance = parseRelevance(record[base + 1]);
      const useCaseRaw = clean(record[base + 2]);
      const nextStepsRaw = clean(record[base + 3]);
      const introRaw = clean(record[base + 4]);

      const useCaseTypes = parseUseCaseTypes(useCaseRaw);
      const contactStatus = parseContactStatus(nextStepsRaw, introRaw);
      // Keep the full human-readable context; the intro column is rarely used
      // but occasionally carries extra info we don't want to lose.
      const nextSteps =
        [nextStepsRaw, introRaw].filter(Boolean).join(" · ") || null;

      const hasData =
        startupRelevance !== null ||
        partnerRelevance !== null ||
        useCaseTypes.length > 0 ||
        Boolean(useCaseRaw) ||
        Boolean(nextSteps) ||
        contactStatus !== "NONE";
      if (!hasData) return;

      cells.push({
        partnerSlug: partner.slug,
        startupRelevance,
        partnerRelevance,
        useCaseTypes,
        useCaseNote: useCaseRaw || null,
        nextSteps,
        contactStatus,
      });
    });

    if (cells.length === 0) {
      skipped.push(startupName);
    } else {
      rows.push({ startupName, cells });
    }
  }

  return { rows, skipped };
}

// ---------------------------------------------------------------------------
// Questionnaire tabs (the per-startup / per-partner Google-Sheet tabs).
//
// Unlike the master "Matrix" grid above, each questionnaire tab is one party's
// view: rows are the counterparties, columns are the self-service fields. The
// two layouts (startup tab vs partner tab) share most columns but NOT their
// order, so columns are resolved by HEADER TEXT. Pure + node-safe (no fetch)
// so scripts fetch the CSV and the unit tests exercise the parser directly.
// ---------------------------------------------------------------------------

/** Diacritic-folded, alphanumeric-only, lower-cased key for fuzzy matching. */
export function normalizeMatchKey(s: string): string {
  return (s ?? "")
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]/g, "");
}

/** "Ja…" → true, "Nein…" → false, anything else → null. */
export function parseTriBool(raw: string | null | undefined): boolean | null {
  const v = normalizeMatchKey(raw ?? "");
  if (v.startsWith("ja")) return true;
  if (v.startsWith("nein")) return false;
  return null;
}

/** Maps a free-text "Firma" cell to one of the five partner slugs (or null). */
export function resolvePartnerSlug(firma: string): string | null {
  const n = normalizeMatchKey(firma);
  return PARTNER_COMPANIES.find((p) => n.includes(p.slug))?.slug ?? null;
}

export interface ParsedQuestionnaireRow {
  counterparty: string;
  relevance: RelevanceLevel | null;
  useCaseTypes: MatchUseCaseType[];
  useCaseNote: string | null;
  followUp: boolean | null;
  openQuestions: string | null;
  notes: string | null;
  contacted: boolean | null;
}

/**
 * Parses a questionnaire tab (startup OR partner) into per-row side input,
 * resolving columns by header text so the differing layouts both work. Skips
 * the "Weitere …" placeholder rows the sheet keeps for future entries.
 */
export function parseQuestionnaireTable(
  table: string[][]
): ParsedQuestionnaireRow[] {
  const headerIdx = table.findIndex(
    (r) => normalizeMatchKey(r[0] ?? "") === "firma"
  );
  if (headerIdx === -1) return [];
  const header = table[headerIdx].map((c) => normalizeMatchKey(c));

  const find = (...keys: string[]) =>
    header.findIndex((h) => keys.some((k) => h.includes(k)));

  const col = {
    contacted: find("erstkontakt", "gespraech"),
    relevance: find("relevanz"),
    followUp: find("folgegespraech"),
    openQuestions: find("offengeblieben", "welcheinfo", "welchefragen"),
    useCaseTypes: find("artderpartnerschaft"),
    useCaseNote: find("konkreteusecases", "usecases"),
    notes: find("sonstigeanmerkungen"),
  };

  const rows: ParsedQuestionnaireRow[] = [];
  for (let r = headerIdx + 1; r < table.length; r++) {
    const record = table[r];
    const counterparty = clean(record[0]);
    if (!counterparty) continue;
    const nn = normalizeMatchKey(counterparty);
    if (nn.startsWith("weitere") || nn.startsWith("weiteres")) continue;

    const at = (i: number) => (i >= 0 ? clean(record[i]) : "");
    rows.push({
      counterparty,
      relevance: parseRelevance(at(col.relevance)),
      useCaseTypes: parseUseCaseTypes(at(col.useCaseTypes)),
      useCaseNote: at(col.useCaseNote) || null,
      followUp: parseTriBool(at(col.followUp)),
      openQuestions: at(col.openQuestions) || null,
      notes: at(col.notes) || null,
      contacted: parseTriBool(at(col.contacted)),
    });
  }
  return rows;
}

export interface ApplyMatchMatrixResult {
  companies: number;
  matches: number;
  startupsProcessed: number;
  startupsCreated: string[];
  startupsMatched: string[];
  skipped: string[];
}

/**
 * Idempotently applies the parsed matrix to a database for ONE batch: upserts
 * the five PartnerCompany rows (natural key = slug) and adds them as the batch's
 * columns (BatchPartner), find-or-creates each sheet startup by name and adds it
 * to the batch (BatchStartup), and upserts one PartnerStartupMatch per (batch,
 * company, startup) cell. Safe to re-run; shared by prisma/seed.ts and
 * prisma/apply-match-matrix.ts.
 */
/**
 * Find-or-create a batch by name (idempotent). Used by the importer/seed to get
 * a target batch for applyMatchMatrix without duplicating rows on re-run.
 */
export async function ensureBatch(
  db: PrismaClient,
  name: string,
  type: BatchType = "ACCELERATOR",
  description?: string
): Promise<string> {
  const existing = await db.scoutingCampaign.findFirst({
    where: { name },
    select: { id: true },
  });
  if (existing) return existing.id;
  const created = await db.scoutingCampaign.create({
    data: { name, type, description: description ?? null },
    select: { id: true },
  });
  return created.id;
}

export async function applyMatchMatrix(
  db: PrismaClient,
  updatedById: string | null,
  batchId: string,
  csv?: string
): Promise<ApplyMatchMatrixResult> {
  const { rows, skipped } = parseMatchMatrixCsv(csv);

  // 1) Partner companies (natural key: slug), sortOrder = column order; each is
  //    also a column of this batch's matrix.
  const slugToId = new Map<string, string>();
  for (const [index, company] of PARTNER_COMPANIES.entries()) {
    const record = await db.partnerCompany.upsert({
      where: { slug: company.slug },
      update: { name: company.name, sortOrder: index },
      create: { name: company.name, slug: company.slug, sortOrder: index },
      select: { id: true },
    });
    slugToId.set(company.slug, record.id);
    await db.batchPartner.upsert({
      where: {
        batchId_partnerCompanyId: { batchId, partnerCompanyId: record.id },
      },
      update: { sortOrder: index },
      create: { batchId, partnerCompanyId: record.id, sortOrder: index },
    });
  }

  // 2) Startups + batch membership + match cells.
  const startupsCreated: string[] = [];
  const startupsMatched: string[] = [];
  let matches = 0;

  for (const row of rows) {
    let startup = await db.startup.findFirst({
      where: { name: row.startupName },
      select: { id: true },
    });
    if (startup) {
      startupsMatched.push(row.startupName);
    } else {
      startup = await db.startup.create({
        data: {
          name: row.startupName,
          description: MATCH_MATRIX_STARTUP_DEFAULTS.description,
          industry: MATCH_MATRIX_STARTUP_DEFAULTS.industry,
          pipelineStage: "DISCOVERED",
          sourceType: "OUTBOUND",
          sourceDetail: "Match-Matrix (Sheet)",
        },
        select: { id: true },
      });
      startupsCreated.push(row.startupName);
    }

    await db.batchStartup.upsert({
      where: { batchId_startupId: { batchId, startupId: startup.id } },
      update: {},
      create: { batchId, startupId: startup.id, addedById: updatedById },
    });

    for (const cell of row.cells) {
      const partnerId = slugToId.get(cell.partnerSlug);
      if (!partnerId) continue;
      await db.partnerStartupMatch.upsert({
        where: {
          batchId_partnerId_startupId: {
            batchId,
            partnerId,
            startupId: startup.id,
          },
        },
        update: {
          startupRelevance: cell.startupRelevance,
          partnerRelevance: cell.partnerRelevance,
          useCaseTypes: cell.useCaseTypes,
          useCaseNote: cell.useCaseNote,
          nextSteps: cell.nextSteps,
          contactStatus: cell.contactStatus,
          updatedById,
        },
        create: {
          batchId,
          partnerId,
          startupId: startup.id,
          startupRelevance: cell.startupRelevance,
          partnerRelevance: cell.partnerRelevance,
          useCaseTypes: cell.useCaseTypes,
          useCaseNote: cell.useCaseNote,
          nextSteps: cell.nextSteps,
          contactStatus: cell.contactStatus,
          updatedById,
        },
      });
      matches++;
    }
  }

  return {
    companies: PARTNER_COMPANIES.length,
    matches,
    startupsProcessed: rows.length,
    startupsCreated,
    startupsMatched,
    skipped,
  };
}
