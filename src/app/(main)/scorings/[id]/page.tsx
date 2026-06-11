import { notFound } from "next/navigation";
import { ScoringReadOnly } from "@/components/sharing/ScoringReadOnly";
import { Card } from "@/components/ui/Card";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { requireRole } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { scoresToMap } from "@/lib/scoring";
import { formatDate } from "@/lib/utils";

export default async function SharedScoringDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireRole(["BUSINESS_PARTNER", "INVESTOR"]);
  const { id } = await params;

  const share = await prisma.sharedScoring.findUnique({
    where: { id },
    include: {
      evaluation: {
        include: {
          scores: true,
          startup: { select: { name: true, industry: true } },
          evaluator: { select: { name: true } },
        },
      },
      sharedBy: { select: { name: true } },
    },
  });
  if (!share || share.recipientId !== session.user.id) notFound();

  const e = share.evaluation;

  return (
    <>
      <SectionLabel
        number="01"
        label="Shared scoring"
        title={`${e.startup.name} — evaluated by ${e.evaluator.name}`}
      />

      {share.message && (
        <Card className="border-lv-blue-soft bg-lv-blue-soft p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-lv-blue/70">
            Message from {share.sharedBy.name} · {formatDate(share.createdAt)}
          </p>
          <p className="mt-2 text-sm text-lv-blue">{share.message}</p>
        </Card>
      )}

      <ScoringReadOnly
        startupName={e.startup.name}
        industry={e.startup.industry}
        scores={scoresToMap(e.scores)}
        overallScore={e.overallScore}
        potential={e.potential}
        feasibility={e.feasibility}
        recommendation={e.recommendation}
        notes={e.notes}
      />
    </>
  );
}
