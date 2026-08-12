import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  upsertPartnerSideCell,
  upsertStartupSideCell,
} from "@/app/actions/matrix";
import {
  SelfServiceMatrix,
  type CounterpartyRow,
  type SideView,
} from "@/components/matrix/SelfServiceMatrix";
import { BannerStat, Card } from "@/components/ui/Card";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { requireAuth } from "@/lib/auth-guards";
import { BATCH_TYPE_LABELS } from "@/lib/constants";
import { mutualFitLevel } from "@/lib/match-matrix";
import { requireMatrixPartner, requireMatrixStartup } from "@/lib/matrix-guards";
import { prisma } from "@/lib/prisma";
import { ROLE_HOMES } from "@/lib/roles";

export const metadata: Metadata = { title: "Matrix" };

// Fields we read off a PartnerStartupMatch to build both sides.
const matchSelect = {
  startupId: true,
  partnerId: true,
  startupRelevance: true,
  partnerRelevance: true,
  startupUseCaseTypes: true,
  startupUseCaseNote: true,
  startupFollowUp: true,
  startupOpenQuestions: true,
  startupNotes: true,
  startupContacted: true,
  partnerUseCaseTypes: true,
  partnerUseCaseNote: true,
  partnerFollowUp: true,
  partnerOpenQuestions: true,
  partnerNotes: true,
  partnerContacted: true,
} as const;

type MatchRow = {
  startupId: string;
  partnerId: string;
  startupRelevance: SideView["relevance"];
  partnerRelevance: SideView["relevance"];
  startupUseCaseTypes: SideView["useCaseTypes"];
  startupUseCaseNote: string | null;
  startupFollowUp: boolean | null;
  startupOpenQuestions: string | null;
  startupNotes: string | null;
  startupContacted: boolean | null;
  partnerUseCaseTypes: SideView["useCaseTypes"];
  partnerUseCaseNote: string | null;
  partnerFollowUp: boolean | null;
  partnerOpenQuestions: string | null;
  partnerNotes: string | null;
  partnerContacted: boolean | null;
};

const EMPTY_SIDE: SideView = {
  relevance: null,
  useCaseTypes: [],
  useCaseNote: null,
  followUp: null,
  openQuestions: null,
  notes: null,
  contacted: null,
};

function startupSide(m: MatchRow | undefined): SideView {
  if (!m) return EMPTY_SIDE;
  return {
    relevance: m.startupRelevance,
    useCaseTypes: m.startupUseCaseTypes,
    useCaseNote: m.startupUseCaseNote,
    followUp: m.startupFollowUp,
    openQuestions: m.startupOpenQuestions,
    notes: m.startupNotes,
    contacted: m.startupContacted,
  };
}

function partnerSide(m: MatchRow | undefined): SideView {
  if (!m) return EMPTY_SIDE;
  return {
    relevance: m.partnerRelevance,
    useCaseTypes: m.partnerUseCaseTypes,
    useCaseNote: m.partnerUseCaseNote,
    followUp: m.partnerFollowUp,
    openQuestions: m.partnerOpenQuestions,
    notes: m.partnerNotes,
    contacted: m.partnerContacted,
  };
}

function Stats({ rows }: { rows: CounterpartyRow[] }) {
  const rated = rows.filter((r) => r.own.relevance !== null).length;
  const mutual = rows.filter(
    (r) => r.own.relevance !== null && r.other.relevance !== null
  ).length;
  const top = rows.filter(
    (r) => mutualFitLevel(r.own.relevance, r.other.relevance) === "top"
  ).length;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:max-w-2xl">
      <BannerStat label="Einträge" value={rows.length} />
      <BannerStat label="Von dir bewertet" value={rated} />
      <BannerStat label="Beidseitig" value={mutual} />
      <BannerStat label="Top-Matches" value={top} />
    </div>
  );
}

async function PartnerMatrix() {
  const { partnerCompany } = await requireMatrixPartner();

  const batches = await prisma.scoutingCampaign.findMany({
    where: { batchPartners: { some: { partnerCompanyId: partnerCompany.id } } },
    orderBy: [{ createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      type: true,
      batchStartups: {
        select: { startup: { select: { id: true, name: true, industry: true } } },
      },
      matches: {
        where: { partnerId: partnerCompany.id },
        select: matchSelect,
      },
    },
  });

  const sections = batches.map((b) => {
    const byStartup = new Map<string, MatchRow>();
    for (const m of b.matches) byStartup.set(m.startupId, m);
    const rows: CounterpartyRow[] = [...b.batchStartups]
      .sort((a, z) => a.startup.name.localeCompare(z.startup.name, "de"))
      .map((bs) => {
        const match = byStartup.get(bs.startup.id);
        return {
          id: bs.startup.id,
          name: bs.startup.name,
          sub: bs.startup.industry,
          own: partnerSide(match),
          other: startupSide(match),
        };
      });
    return { batch: b, rows };
  });

  const allRows = sections.flatMap((s) => s.rows);

  return (
    <>
      <HeroBanner
        kicker={partnerCompany.name}
        title="Startup-Matrix"
        subtitle="Bewerte je Batch die dir zugewiesenen Startups nach eurer Passung — Relevanz, mögliche Partnerschaft und konkrete Use-Cases. Andere Partner sehen deine Angaben nicht."
      >
        <Stats rows={allRows} />
      </HeroBanner>

      {sections.length === 0 ? (
        <Card className="p-8 text-center text-sm text-lv-secondary">
          Aktuell nimmst du an keinem Batch teil. Sobald das Lovedis-Team dich
          einem Programm zuweist, erscheinen die Startups hier.
        </Card>
      ) : (
        sections.map((s, i) => (
          <SelfServiceMatrix
            key={s.batch.id}
            mode="partner"
            batchId={s.batch.id}
            rows={s.rows}
            counterpartyField="startupId"
            action={upsertPartnerSideCell}
            counterpartyLabel="Startup"
            sectionNumber={String(i + 1).padStart(2, "0")}
            title={`${s.batch.name} · ${BATCH_TYPE_LABELS[s.batch.type]}`}
          />
        ))
      )}
    </>
  );
}

async function StartupMatrix() {
  const { startup } = await requireMatrixStartup();

  const batches = await prisma.scoutingCampaign.findMany({
    where: { batchStartups: { some: { startupId: startup.id } } },
    orderBy: [{ createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      type: true,
      batchPartners: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: { partnerCompany: { select: { id: true, name: true } } },
      },
      matches: {
        where: { startupId: startup.id },
        select: matchSelect,
      },
    },
  });

  const sections = batches.map((b) => {
    const byPartner = new Map<string, MatchRow>();
    for (const m of b.matches) byPartner.set(m.partnerId, m);
    const rows: CounterpartyRow[] = b.batchPartners.map((bp) => {
      const match = byPartner.get(bp.partnerCompany.id);
      return {
        id: bp.partnerCompany.id,
        name: bp.partnerCompany.name,
        own: startupSide(match),
        other: partnerSide(match),
      };
    });
    return { batch: b, rows };
  });

  const allRows = sections.flatMap((s) => s.rows);

  return (
    <>
      <HeroBanner
        kicker={startup.name}
        title="Partner-Matrix"
        subtitle="Bewerte je Batch die Partner-Unternehmen nach eurer Passung — Relevanz, mögliche Partnerschaft und konkrete Use-Cases. Deine Angaben sehen nur das Lovedis-Team und der jeweilige Partner."
      >
        <Stats rows={allRows} />
      </HeroBanner>

      {sections.length === 0 ? (
        <Card className="p-8 text-center text-sm text-lv-secondary">
          Aktuell bist du keinem Batch zugewiesen. Sobald das Lovedis-Team dich
          einem Programm hinzufügt, erscheinen die Partner hier.
        </Card>
      ) : (
        sections.map((s, i) => (
          <SelfServiceMatrix
            key={s.batch.id}
            mode="startup"
            batchId={s.batch.id}
            rows={s.rows}
            counterpartyField="partnerId"
            action={upsertStartupSideCell}
            counterpartyLabel="Partner"
            sectionNumber={String(i + 1).padStart(2, "0")}
            title={`${s.batch.name} · ${BATCH_TYPE_LABELS[s.batch.type]}`}
          />
        ))
      )}
    </>
  );
}

export default async function MatrixPage() {
  const session = await requireAuth();
  const role = session.user.role;

  if (role === "BUSINESS_PARTNER") return <PartnerMatrix />;
  if (role === "STARTUP") return <StartupMatrix />;
  // Team keeps the full internal grid; everyone else goes home.
  if (role === "ADMIN" || role === "MEMBER") redirect("/match-matrix");
  redirect(ROLE_HOMES[role]);
}
