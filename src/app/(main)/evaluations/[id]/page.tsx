import { Trash2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteEvaluation } from "@/app/actions/evaluations";
import { EvaluationForm } from "@/components/evaluations/EvaluationForm";
import { Button } from "@/components/ui/Button";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { requireScoutModule } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { scoresToMap } from "@/lib/scoring";
import { formatDate } from "@/lib/utils";

export default async function EvaluationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireScoutModule();
  const { id } = await params;

  const evaluation = await prisma.evaluation.findUnique({
    where: { id },
    include: {
      scores: true,
      startup: { select: { id: true, name: true, industry: true } },
      evaluator: { select: { name: true } },
    },
  });
  if (!evaluation) notFound();

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="lv-wordmark text-xs text-lv-blue">Bewertung</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">
            <Link
              href={`/startups/${evaluation.startup.id}`}
              className="hover:text-lv-blue"
            >
              {evaluation.startup.name}
            </Link>
          </h1>
          <p className="mt-1 text-sm text-lv-secondary">
            {evaluation.startup.industry} · von {evaluation.evaluator.name} ·
            aktualisiert {formatDate(evaluation.updatedAt)}
          </p>
        </div>
        <form action={deleteEvaluation.bind(null, evaluation.id)}>
          <Button type="submit" variant="danger" size="sm">
            <Trash2 className="h-4 w-4" />
            Löschen
          </Button>
        </form>
      </div>

      <SectionLabel
        number="02"
        label="Bewerten"
        title="Bewerte die sechs Challenge-Kriterien"
      />

      <EvaluationForm
        evaluationId={evaluation.id}
        initialScores={scoresToMap(evaluation.scores)}
        initialNotes={evaluation.notes ?? ""}
      />
    </>
  );
}
