"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { firstZodError, type ActionState } from "@/lib/action-state";
import { requireScoutModule } from "@/lib/auth-guards";
import { SCORE_DIMENSIONS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import {
  computeOverallScore,
  deriveRecommendation,
  isChallengeFitGated,
  type DimensionScores,
} from "@/lib/scoring";

export async function createEvaluation(startupId: string): Promise<void> {
  const session = await requireScoutModule();

  const startup = await prisma.startup.findUnique({
    where: { id: startupId },
    select: { id: true },
  });
  if (!startup) redirect("/startups");

  const evaluation = await prisma.evaluation.create({
    data: {
      startupId,
      evaluatorId: session.user.id,
      scores: {
        create: SCORE_DIMENSIONS.map((dimension) => ({
          dimension,
          value: 0,
        })),
      },
    },
  });
  revalidatePath("/evaluations");
  revalidatePath(`/startups/${startupId}`);
  redirect(`/evaluations/${evaluation.id}`);
}

const scoreValue = z.coerce.number().int().min(0).max(5);
const scoresSchema = z.object({
  CHALLENGE_FIT: scoreValue,
  MATURITY_FEASIBILITY: scoreValue,
  TEAM_EXECUTION: scoreValue,
  MARKET_SCALABILITY: scoreValue,
  STRATEGIC_ECOSYSTEM_FIT: scoreValue,
  TRACTION_REFERENCES: scoreValue,
});

const updateSchema = z.object({
  notes: z.string().max(8000).optional(),
});

export async function updateEvaluation(
  evaluationId: string,
  _prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const session = await requireScoutModule();

  const evaluation = await prisma.evaluation.findUnique({
    where: { id: evaluationId },
    select: { id: true, startupId: true, evaluatorId: true },
  });
  if (!evaluation) return { error: "Bewertung nicht gefunden." };
  if (
    session.user.role !== "ADMIN" &&
    evaluation.evaluatorId !== session.user.id
  ) {
    return { error: "Du kannst nur deine eigenen Bewertungen bearbeiten." };
  }

  const parsedScores = scoresSchema.safeParse(
    Object.fromEntries(SCORE_DIMENSIONS.map((d) => [d, formData.get(d)]))
  );
  if (!parsedScores.success) return { error: firstZodError(parsedScores.error) };

  const parsedNotes = updateSchema.safeParse({
    notes: formData.get("notes") || undefined,
  });
  if (!parsedNotes.success) return { error: firstZodError(parsedNotes.error) };

  const scores = parsedScores.data as DimensionScores;
  const overallScore = computeOverallScore(scores);
  const recommendation = deriveRecommendation(
    overallScore,
    isChallengeFitGated(scores)
  );

  await prisma.$transaction([
    ...SCORE_DIMENSIONS.map((dimension) =>
      prisma.score.upsert({
        where: {
          evaluationId_dimension: { evaluationId, dimension },
        },
        create: { evaluationId, dimension, value: scores[dimension] ?? 0 },
        update: { value: scores[dimension] ?? 0 },
      })
    ),
    prisma.evaluation.update({
      where: { id: evaluationId },
      data: {
        overallScore,
        recommendation,
        notes: parsedNotes.data.notes ?? null,
      },
    }),
  ]);

  revalidatePath("/evaluations");
  revalidatePath(`/evaluations/${evaluationId}`);
  revalidatePath(`/startups/${evaluation.startupId}`);
  revalidatePath("/compare");
  revalidatePath("/reports");
  return { success: "Bewertung gespeichert." };
}

export async function deleteEvaluation(evaluationId: string): Promise<void> {
  const session = await requireScoutModule();
  const evaluation = await prisma.evaluation.findUnique({
    where: { id: evaluationId },
    select: { evaluatorId: true, startupId: true },
  });
  if (!evaluation) redirect("/evaluations");
  if (
    session.user.role !== "ADMIN" &&
    evaluation.evaluatorId !== session.user.id
  ) {
    redirect("/evaluations");
  }
  await prisma.evaluation.delete({ where: { id: evaluationId } });
  revalidatePath("/evaluations");
  revalidatePath(`/startups/${evaluation.startupId}`);
  redirect("/evaluations");
}
