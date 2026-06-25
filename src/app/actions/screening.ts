"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { PartnerVerdict, Recommendation } from "@/generated/prisma/enums";
import { firstZodError, type ActionState } from "@/lib/action-state";
import { requirePartner, requireTeam } from "@/lib/auth-guards";
import { PARTNER_VERDICTS, RECOMMENDATION_ORDER } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Internal team's lightweight "Erst-Einordnung" — set by the internal team on a
// startup. Deliberately separate from the deep Evaluation/Score model.
// ---------------------------------------------------------------------------

const initialAssessmentSchema = z.object({
  startupId: z.string().min(1),
  summary: z.string().max(2000).optional(),
  recommendation: z
    .enum(RECOMMENDATION_ORDER as [Recommendation, ...Recommendation[]])
    .optional(),
});

export async function saveInitialAssessment(
  _prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const session = await requireTeam();
  const parsed = initialAssessmentSchema.safeParse({
    startupId: formData.get("startupId"),
    summary: formData.get("summary") || undefined,
    recommendation: formData.get("recommendation") || undefined,
  });
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  const hasContent = Boolean(parsed.data.summary || parsed.data.recommendation);
  await prisma.startup.update({
    where: { id: parsed.data.startupId },
    data: {
      screenSummary: parsed.data.summary ?? null,
      screenRecommendation: parsed.data.recommendation ?? null,
      screenedAt: hasContent ? new Date() : null,
      screenedById: hasContent ? session.user.id : null,
    },
  });

  revalidatePath("/longlist");
  revalidatePath("/screening");
  revalidatePath(`/startups/${parsed.data.startupId}`);
  return { success: "Einordnung gespeichert." };
}

// ---------------------------------------------------------------------------
// Partner verdict — lightweight "weitermachen / nicht weiter". Optionally tied
// to a challenge (Use-Case-Bewertung, Journey 1b). One verdict per
// (partner, startup, challenge).
// ---------------------------------------------------------------------------

const verdictSchema = z.object({
  startupId: z.string().min(1),
  challengeId: z.string().min(1).nullable(),
  verdict: z.enum(PARTNER_VERDICTS as [PartnerVerdict, ...PartnerVerdict[]]),
  note: z.string().max(2000).optional(),
});

/**
 * Records (or updates) the calling partner's verdict for a startup. Bound to
 * `{ startupId, challengeId }` by the client; verdict + note come from the
 * submitted form so two submit buttons can drive the same form.
 */
export async function submitPartnerVerdict(
  ctx: { startupId: string; challengeId: string | null },
  _prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const session = await requirePartner();
  const parsed = verdictSchema.safeParse({
    startupId: ctx.startupId,
    challengeId: ctx.challengeId,
    verdict: formData.get("verdict"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  // The startup must exist; the optional challenge must be the partner's own.
  const startup = await prisma.startup.findUnique({
    where: { id: parsed.data.startupId },
    select: { id: true },
  });
  if (!startup) return { error: "Startup nicht gefunden." };

  if (parsed.data.challengeId) {
    const challenge = await prisma.challenge.findFirst({
      where: { id: parsed.data.challengeId, createdById: session.user.id },
      select: { id: true },
    });
    if (!challenge) return { error: "Use-Case nicht gefunden." };
  }

  const partnerId = session.user.id;
  const { startupId, challengeId, verdict } = parsed.data;
  const note = parsed.data.note ?? null;

  if (challengeId) {
    // Keyed (Use-Case) path: the compound unique is fully populated, so a
    // single upsert dedupes atomically.
    await prisma.partnerStartupReview.upsert({
      where: {
        partnerId_startupId_challengeId: { partnerId, startupId, challengeId },
      },
      update: { verdict, note },
      create: { partnerId, startupId, challengeId, verdict, note },
    });
  } else {
    // Longlist path: challengeId is null, and Postgres treats nulls as distinct
    // in the compound unique, so the find-then-write can race into two rows.
    // Guard it with a Serializable transaction; if two first-time verdicts
    // collide, the loser hits a write conflict and we retry once into an update.
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        await prisma.$transaction(
          async (tx) => {
            const existing = await tx.partnerStartupReview.findFirst({
              where: { partnerId, startupId, challengeId: null },
              select: { id: true },
            });
            if (existing) {
              await tx.partnerStartupReview.update({
                where: { id: existing.id },
                data: { verdict, note },
              });
            } else {
              await tx.partnerStartupReview.create({
                data: { partnerId, startupId, challengeId: null, verdict, note },
              });
            }
          },
          { isolationLevel: "Serializable" }
        );
        break;
      } catch (err) {
        // P2034 = write conflict / serialization failure. Retry once; the row
        // now exists so the second pass updates instead of inserting.
        const code =
          typeof err === "object" && err !== null && "code" in err
            ? (err as { code?: string }).code
            : undefined;
        if (code === "P2034" && attempt === 0) continue;
        throw err;
      }
    }
  }

  revalidatePath("/screening");
  revalidatePath("/use-cases");
  revalidatePath("/longlist");
  return { success: "Verdikt gespeichert." };
}
