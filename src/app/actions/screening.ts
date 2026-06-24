"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { PartnerVerdict, Recommendation } from "@/generated/prisma/enums";
import { firstZodError, type ActionState } from "@/lib/action-state";
import { requirePartner, requireTeam } from "@/lib/auth-guards";
import { PARTNER_VERDICTS, RECOMMENDATION_ORDER } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Polina "Erst-Einordnung" — set by the internal team on a startup. Lightweight
// and deliberately separate from the deep Evaluation/Score model.
// ---------------------------------------------------------------------------

const polinaSchema = z.object({
  startupId: z.string().min(1),
  summary: z.string().max(2000).optional(),
  recommendation: z
    .enum(RECOMMENDATION_ORDER as [Recommendation, ...Recommendation[]])
    .optional(),
});

export async function savePolinaScreen(
  _prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const session = await requireTeam();
  const parsed = polinaSchema.safeParse({
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
  if (parsed.data.challengeId) {
    const challenge = await prisma.challenge.findFirst({
      where: { id: parsed.data.challengeId, createdById: session.user.id },
      select: { id: true },
    });
    if (!challenge) return { error: "Use-Case nicht gefunden." };
  }

  // Compound-unique with a nullable column can't be upserted directly, so we
  // find-then-write (nulls compare as distinct in Postgres).
  const existing = await prisma.partnerStartupReview.findFirst({
    where: {
      partnerId: session.user.id,
      startupId: parsed.data.startupId,
      challengeId: parsed.data.challengeId,
    },
    select: { id: true },
  });

  if (existing) {
    await prisma.partnerStartupReview.update({
      where: { id: existing.id },
      data: { verdict: parsed.data.verdict, note: parsed.data.note ?? null },
    });
  } else {
    await prisma.partnerStartupReview.create({
      data: {
        partnerId: session.user.id,
        startupId: parsed.data.startupId,
        challengeId: parsed.data.challengeId,
        verdict: parsed.data.verdict,
        note: parsed.data.note ?? null,
      },
    });
  }

  revalidatePath("/screening");
  revalidatePath("/use-cases");
  revalidatePath("/longlist");
  return { success: "Verdikt gespeichert." };
}
