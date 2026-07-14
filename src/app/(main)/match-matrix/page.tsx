import type { Metadata } from "next";
import { BannerStat } from "@/components/ui/Card";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { requireScoutModule } from "@/lib/auth-guards";
import {
  cellHasData,
  isTopMatch,
  PARTNER_COMPANIES,
  type MatchCellView,
  type MatchRowView,
} from "@/lib/match-matrix";
import { prisma } from "@/lib/prisma";
import { MatchMatrixBoard, type PartnerColumn } from "./MatchMatrixBoard";

export const metadata: Metadata = { title: "Match-Matrix" };

export default async function MatchMatrixPage() {
  // Team-only: this surface contains internal cross-partner data and must NOT
  // be exposed to partners/startups/investors.
  await requireScoutModule();

  const [companies, matches] = await Promise.all([
    prisma.partnerCompany.findMany({
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, slug: true },
    }),
    prisma.partnerStartupMatch.findMany({
      select: {
        id: true,
        partnerId: true,
        startupRelevance: true,
        partnerRelevance: true,
        useCaseTypes: true,
        useCaseNote: true,
        nextSteps: true,
        contactStatus: true,
        startup: { select: { id: true, name: true } },
      },
    }),
  ]);

  // Keep the canonical column order from PARTNER_COMPANIES, but only include
  // companies that actually exist in the DB (seeded via the import).
  const partners: PartnerColumn[] = PARTNER_COMPANIES.map((c) =>
    companies.find((db) => db.slug === c.slug)
  ).filter((c): c is PartnerColumn => Boolean(c));

  const partnerIndexById = new Map(partners.map((p, i) => [p.id, i]));

  // Group matches by startup, projecting each into the aligned cells array.
  const rowsByStartup = new Map<string, MatchRowView>();
  for (const m of matches) {
    const partnerIndex = partnerIndexById.get(m.partnerId);
    if (partnerIndex === undefined) continue;
    let row = rowsByStartup.get(m.startup.id);
    if (!row) {
      row = {
        startupId: m.startup.id,
        startupName: m.startup.name,
        cells: Array<MatchCellView | null>(partners.length).fill(null),
      };
      rowsByStartup.set(m.startup.id, row);
    }
    row.cells[partnerIndex] = {
      id: m.id,
      partnerSlug: partners[partnerIndex].slug,
      startupRelevance: m.startupRelevance,
      partnerRelevance: m.partnerRelevance,
      useCaseTypes: m.useCaseTypes,
      useCaseNote: m.useCaseNote,
      nextSteps: m.nextSteps,
      contactStatus: m.contactStatus,
    };
  }

  const rows = [...rowsByStartup.values()].sort((a, b) =>
    a.startupName.localeCompare(b.startupName, "de")
  );

  const pairings = matches.filter((m) =>
    cellHasData({
      id: m.id,
      partnerSlug: "",
      startupRelevance: m.startupRelevance,
      partnerRelevance: m.partnerRelevance,
      useCaseTypes: m.useCaseTypes,
      useCaseNote: m.useCaseNote,
      nextSteps: m.nextSteps,
      contactStatus: m.contactStatus,
    })
  ).length;
  const topMatches = matches.filter((m) =>
    isTopMatch(m.startupRelevance, m.partnerRelevance)
  ).length;

  return (
    <>
      <HeroBanner
        kicker="Venture Scout"
        title="Match-Matrix"
        subtitle="Beidseitige Passung zwischen Startups und Partnern auf einen Blick — die Zellfarbe zeigt die gegenseitige Passung, Details je Paarung per Klick."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:max-w-2xl">
          <BannerStat label="Startups" value={rows.length} />
          <BannerStat label="Partner" value={partners.length} />
          <BannerStat label="Paarungen" value={pairings} />
          <BannerStat label="Top-Matches" value={topMatches} />
        </div>
      </HeroBanner>

      <MatchMatrixBoard partners={partners} rows={rows} />
    </>
  );
}
