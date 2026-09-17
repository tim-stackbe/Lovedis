/**
 * Real-data importer for the shared Google Sheet "Matrix_Matchmaking_TMC_2026".
 *
 * The sheet has three kinds of tabs (see the "PARTNER >>" / "Startups >>"
 * section headers in the workbook):
 *   • MATRIX          — the consolidated startup × partner master grid. Same
 *                       layout as prisma/data/match-matrix.csv, so we feed it to
 *                       the existing applyMatchMatrix() (creates PartnerCompany +
 *                       Startup rows, the team-curated combined fields and the
 *                       headline relevances).
 *   • Startup tabs    — one questionnaire per startup (rows = partners). These
 *                       are the STARTUP side (the startup's view of each partner).
 *   • Partner tabs    — one questionnaire per partner (rows = startups). These
 *                       are the PARTNER side (the partner's view of each startup).
 *
 * The two questionnaire layouts share most columns but NOT their positions, so
 * columns are resolved by header text, never by fixed index. Fully idempotent:
 * every write is an upsert on the (partnerId, startupId) key.
 *
 * Usage:
 *   DATABASE_URL=<target> npx tsx prisma/import-matrix-sheet.ts
 *
 * Override the workbook via SHEET_ID=<id>. Requires the sheet to be link-shared
 * (public CSV export), which it currently is.
 */
import Papa from "papaparse";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  applyMatchMatrix,
  ensureBatch,
  normalizeMatchKey,
  parseQuestionnaireTable,
  resolvePartnerSlug,
} from "../src/lib/match-matrix-import";

const BATCH_NAME = process.env.BATCH_NAME ?? "Love Disruption 2026";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const SHEET_ID =
  process.env.SHEET_ID ?? "1JOVddxJtNZI7vKQItNy9xW4c8U_doL773bwWLY1yrlU";

const MATRIX_GID = "1459693264";

// Startup questionnaires (rows = partners → the startup's side of each pairing).
const STARTUP_TABS: { gid: string; name: string }[] = [
  { gid: "1743515552", name: "ContainerGrid" },
  { gid: "1911733690", name: "neoBIM" },
  { gid: "252073767", name: "flinq" },
  { gid: "870351036", name: "Baurion" },
  { gid: "136584318", name: "vSight" },
  { gid: "1216370028", name: "parallelum" },
  { gid: "1580573814", name: "PreserviTec" },
  { gid: "428302755", name: "Flexxter" },
  { gid: "1147972515", name: "genow" },
  { gid: "933464817", name: "Procuras" },
  { gid: "1387557026", name: "GMS" },
  { gid: "161515454", name: "Tymba" },
];

// Partner questionnaires (rows = startups → the partner's side of each pairing).
const PARTNER_TABS: { gid: string; slug: string }[] = [
  { gid: "1791569363", slug: "weimer" },
  { gid: "448350604", slug: "innexis" },
  { gid: "1119112137", slug: "saelzer" },
];

function csvUrl(gid: string): string {
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`;
}

async function fetchCsv(gid: string): Promise<string[][]> {
  const res = await fetch(csvUrl(gid));
  if (!res.ok) throw new Error(`Fetch gid=${gid} failed: HTTP ${res.status}`);
  const text = await res.text();
  const parsed = Papa.parse<string[]>(text, { skipEmptyLines: "greedy" });
  return parsed.data;
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
  console.log(`Importiere Matrix-Sheet ${SHEET_ID}…`);

  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  const adminId = admin?.id ?? null;

  // 0) Target batch (all imported startups/partners/cells belong to it).
  const batchId = await ensureBatch(
    prisma,
    BATCH_NAME,
    "ACCELERATOR",
    "Aus dem Matchmaking-Sheet importiert."
  );
  console.log(`→ Batch: ${BATCH_NAME}`);

  // 1) Master MATRIX tab → PartnerCompany + Startup + combined team fields.
  console.log("→ MATRIX-Master…");
  const matrixTable = await fetchCsv(MATRIX_GID);
  const matrixCsv = Papa.unparse(matrixTable);
  const applied = await applyMatchMatrix(prisma, adminId, batchId, matrixCsv);
  console.log(
    `   ${applied.companies} Partner, ${applied.startupsProcessed} Startups, ${applied.matches} Zellen.`
  );

  // Lookups for the per-side upserts.
  const partners = await prisma.partnerCompany.findMany({
    select: { id: true, slug: true },
  });
  const partnerIdBySlug = new Map(partners.map((p) => [p.slug, p.id]));

  const startups = await prisma.startup.findMany({
    select: { id: true, name: true },
  });
  const startupIdByNorm = new Map(
    startups.map((s) => [normalizeMatchKey(s.name), s.id])
  );

  async function ensureStartup(name: string): Promise<string> {
    const key = normalizeMatchKey(name);
    let id = startupIdByNorm.get(key);
    if (!id) {
      const created = await prisma.startup.create({
        data: {
          name,
          description:
            "Aus der Match-Matrix (Matchmaking-Sheet) importiert. Profil noch nicht angereichert.",
          industry: "Bau & PropTech",
          pipelineStage: "DISCOVERED",
          sourceType: "OUTBOUND",
          sourceDetail: "Match-Matrix (Sheet)",
        },
        select: { id: true },
      });
      id = created.id;
      startupIdByNorm.set(key, id);
    }
    // Ensure the startup is part of this batch's matrix.
    await prisma.batchStartup.upsert({
      where: { batchId_startupId: { batchId, startupId: id } },
      update: {},
      create: { batchId, startupId: id, addedById: adminId },
    });
    return id;
  }

  let startupSideCells = 0;
  let partnerSideCells = 0;

  // 2) Startup tabs → startup side of each pairing.
  console.log("→ Startup-Fragebögen…");
  for (const tab of STARTUP_TABS) {
    const table = await fetchCsv(tab.gid);
    const rows = parseQuestionnaireTable(table);
    const startupId = await ensureStartup(tab.name);
    for (const row of rows) {
      const slug = resolvePartnerSlug(row.counterparty);
      if (!slug) continue;
      const partnerId = partnerIdBySlug.get(slug);
      if (!partnerId) continue;

      const data = {
        startupRelevance: row.relevance,
        startupUseCaseTypes: row.useCaseTypes,
        startupUseCaseNote: row.useCaseNote,
        startupFollowUp: row.followUp,
        startupOpenQuestions: row.openQuestions,
        startupNotes: row.notes,
        startupContacted: row.contacted,
        startupUpdatedAt: new Date(),
        startupUpdatedById: adminId,
      };
      await prisma.partnerStartupMatch.upsert({
        where: {
          batchId_partnerId_startupId: { batchId, partnerId, startupId },
        },
        update: data,
        create: { batchId, partnerId, startupId, ...data },
      });
      startupSideCells++;
    }
  }

  // 3) Partner tabs → partner side of each pairing.
  console.log("→ Partner-Fragebögen…");
  for (const tab of PARTNER_TABS) {
    const partnerId = partnerIdBySlug.get(tab.slug);
    if (!partnerId) {
      console.warn(`   Partner-Slug ${tab.slug} nicht gefunden — übersprungen.`);
      continue;
    }
    const table = await fetchCsv(tab.gid);
    const rows = parseQuestionnaireTable(table);
    for (const row of rows) {
      const startupId = await ensureStartup(row.counterparty);
      const data = {
        partnerRelevance: row.relevance,
        partnerUseCaseTypes: row.useCaseTypes,
        partnerUseCaseNote: row.useCaseNote,
        partnerFollowUp: row.followUp,
        partnerOpenQuestions: row.openQuestions,
        partnerNotes: row.notes,
        partnerContacted: row.contacted,
        partnerUpdatedAt: new Date(),
        partnerUpdatedById: adminId,
      };
      await prisma.partnerStartupMatch.upsert({
        where: {
          batchId_partnerId_startupId: { batchId, partnerId, startupId },
        },
        update: data,
        create: { batchId, partnerId, startupId, ...data },
      });
      partnerSideCells++;
    }
  }

  console.log(
    `Fertig: ${startupSideCells} Startup-Seiten, ${partnerSideCells} Partner-Seiten importiert.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
