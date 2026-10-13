import { Layers } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/Badge";
import { BannerStat, Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { requireScoutModule } from "@/lib/auth-guards";
import { BATCH_TYPE_LABELS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { BatchCreateForm } from "./BatchCreateForm";

export const metadata: Metadata = { title: "Batches" };

export default async function BatchesPage() {
  const session = await requireScoutModule();
  const isAdmin = session.user.role === "ADMIN";

  const batches = await prisma.scoutingCampaign.findMany({
    orderBy: [{ createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      type: true,
      description: true,
      _count: { select: { batchStartups: true, batchPartners: true } },
    },
  });

  return (
    <>
      <HeroBanner
        kicker="Matchmaking"
        title="Batches & Programme"
        subtitle="Jede Match-Matrix gehört zu einem Batch (Accelerator, Industrieprogramm …). Lege Batches an und weise ihnen Startups und Partner-Unternehmen zu — nur die zugewiesenen Startups erscheinen in der Matrix des jeweiligen Partners."
      >
        <div className="grid grid-cols-2 gap-3 sm:max-w-xs">
          <BannerStat label="Batches" value={batches.length} />
        </div>
      </HeroBanner>

      {isAdmin && (
        <>
          <SectionLabel number="01" label="Anlegen" title="Neuen Batch erstellen" />
          <BatchCreateForm />
        </>
      )}

      <SectionLabel number={isAdmin ? "02" : "01"} label="Übersicht" title="Alle Batches" />
      {batches.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="Noch keine Batches"
          description={
            isAdmin
              ? "Lege oben deinen ersten Batch an und weise ihm Startups sowie Partner zu."
              : "Sobald ein Admin einen Batch anlegt, erscheint er hier."
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {batches.map((b) => (
            <Link key={b.id} href={`/batches/${b.id}`}>
              <Card className="h-full space-y-3 p-5 transition-shadow hover:shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-bold text-lv-text">{b.name}</h3>
                  <Badge tone="blue">{BATCH_TYPE_LABELS[b.type]}</Badge>
                </div>
                {b.description && (
                  <p className="line-clamp-2 text-sm text-lv-secondary">
                    {b.description}
                  </p>
                )}
                <div className="flex gap-4 text-xs text-lv-secondary">
                  <span>{b._count.batchStartups} Startups</span>
                  <span>{b._count.batchPartners} Partner</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
