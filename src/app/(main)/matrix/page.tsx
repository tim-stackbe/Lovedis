import { Info } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  castPartnerVote,
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

const EMPTY_SIDE: SideView = {
  relevance: null,
  useCaseTypes: [],
  useCaseNote: null,
  followUp: null,
  openQuestions: null,
  notes: null,
  contacted: null,
  interested: null,
};

type StartupSideRow = {
  startupRelevance: SideView["relevance"];
  startupUseCaseTypes: SideView["useCaseTypes"];
  startupUseCaseNote: string | null;
  startupFollowUp: boolean | null;
  startupOpenQuestions: string | null;
  startupNotes: string | null;
  startupContacted: boolean | null;
};

function startupSide(m: StartupSideRow | undefined): SideView {
  if (!m) return EMPTY_SIDE;
  return {
    relevance: m.startupRelevance,
    useCaseTypes: m.startupUseCaseTypes,
    useCaseNote: m.startupUseCaseNote,
    followUp: m.startupFollowUp,
    openQuestions: m.startupOpenQuestions,
    notes: m.startupNotes,
    contacted: m.startupContacted,
    interested: null,
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
  const { partnerCompany, session } = await requireMatrixPartner();
  const voterId = session.user.id;

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
      // The aggregated cell (startup side + partner tally) per startup.
      matches: {
        where: { partnerId: partnerCompany.id },
        select: {
          startupId: true,
          startupRelevance: true,
          startupUseCaseTypes: true,
          startupUseCaseNote: true,
          startupFollowUp: true,
          startupOpenQuestions: true,
          startupNotes: true,
          startupContacted: true,
          partnerVotesYes: true,
          partnerVotesNo: true,
          partnerInterested: true,
        },
      },
      // THIS member's individual votes.
      partnerVotes: {
        where: { partnerId: partnerCompany.id, voterId },
        select: {
          startupId: true,
          interested: true,
          relevance: true,
          useCaseTypes: true,
          useCaseNote: true,
          followUp: true,
          openQuestions: true,
          notes: true,
          contacted: true,
        },
      },
    },
  });

  const sections = batches.map((b) => {
    const matchByStartup = new Map(b.matches.map((m) => [m.startupId, m]));
    const myVoteByStartup = new Map(b.partnerVotes.map((v) => [v.startupId, v]));
    const rows: CounterpartyRow[] = [...b.batchStartups]
      .sort((a, z) => a.startup.name.localeCompare(z.startup.name, "de"))
      .map((bs) => {
        const match = matchByStartup.get(bs.startup.id);
        const vote = myVoteByStartup.get(bs.startup.id);
        const own: SideView = vote
          ? {
              relevance: vote.relevance,
              useCaseTypes: vote.useCaseTypes,
              useCaseNote: vote.useCaseNote,
              followUp: vote.followUp,
              openQuestions: vote.openQuestions,
              notes: vote.notes,
              contacted: vote.contacted,
              interested: vote.interested,
            }
          : { ...EMPTY_SIDE };
        return {
          id: bs.startup.id,
          name: bs.startup.name,
          sub: bs.startup.industry,
          own,
          other: startupSide(match),
          tally: {
            yes: match?.partnerVotesYes ?? 0,
            no: match?.partnerVotesNo ?? 0,
            outcome: match?.partnerInterested ?? null,
          },
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
        subtitle="Jede Person aus eurem Unternehmen stimmt je Startup einzeln ab (Interesse Ja/Nein). Das Ergebnis ergibt sich aus der Mehrheit. Andere Partner sehen eure Stimmen nicht."
      >
        <Stats rows={allRows} />
      </HeroBanner>

      <div
        role="note"
        className="flex items-start gap-3 rounded-card border border-lv-blue-soft bg-lv-blue-soft px-4 py-3 text-sm text-lv-blue"
      >
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Bewerte die Startups nach Relevanz für euer Unternehmen und eure
          Herausforderungen sowie nach potentiellen gemeinsamen Use Cases. Es
          können mehrere Personen aus eurem Unternehmen eine Einschätzung
          vornehmen.
        </p>
      </div>

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
            action={castPartnerVote}
            counterpartyLabel="Startup"
            sectionNumber={String(i + 1).padStart(2, "0")}
            title={`${s.batch.name} · ${BATCH_TYPE_LABELS[s.batch.type]}`}
            showInterest
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
        select: {
          partnerId: true,
          // Startup's own side.
          startupRelevance: true,
          startupUseCaseTypes: true,
          startupUseCaseNote: true,
          startupFollowUp: true,
          startupOpenQuestions: true,
          startupNotes: true,
          startupContacted: true,
          // Partner aggregate side (from the partner company's votes).
          partnerRelevance: true,
          partnerUseCaseTypes: true,
          partnerInterested: true,
          partnerVotesYes: true,
          partnerVotesNo: true,
        },
      },
    },
  });

  const sections = batches.map((b) => {
    const byPartner = new Map(b.matches.map((m) => [m.partnerId, m]));
    const rows: CounterpartyRow[] = b.batchPartners.map((bp) => {
      const match = byPartner.get(bp.partnerCompany.id);
      const own: SideView = match
        ? {
            relevance: match.startupRelevance,
            useCaseTypes: match.startupUseCaseTypes,
            useCaseNote: match.startupUseCaseNote,
            followUp: match.startupFollowUp,
            openQuestions: match.startupOpenQuestions,
            notes: match.startupNotes,
            contacted: match.startupContacted,
            interested: null,
          }
        : { ...EMPTY_SIDE };
      const other: SideView = {
        relevance: match?.partnerRelevance ?? null,
        useCaseTypes: match?.partnerUseCaseTypes ?? [],
        useCaseNote: null,
        followUp: null,
        openQuestions: null,
        notes: null,
        contacted: null,
        interested: match?.partnerInterested ?? null,
      };
      return {
        id: bp.partnerCompany.id,
        name: bp.partnerCompany.name,
        own,
        other,
        tally: {
          yes: match?.partnerVotesYes ?? 0,
          no: match?.partnerVotesNo ?? 0,
          outcome: match?.partnerInterested ?? null,
        },
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
        subtitle="Bewerte die Partner-Unternehmen nach Relevanz für euer Startup und nach potentiellen gemeinsamen Use Cases."
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
  if (role === "ADMIN" || role === "MEMBER") redirect("/match-matrix");
  redirect(ROLE_HOMES[role]);
}
