"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type {
  MatchContactStatus,
  MatchUseCaseType,
  RelevanceLevel,
} from "@/generated/prisma/enums";
import { firstZodError, type ActionState } from "@/lib/action-state";
import { requireScoutModule } from "@/lib/auth-guards";
import {
  MATCH_CONTACT_STATUSES,
  MATCH_USE_CASE_TYPES,
  RELEVANCE_LEVELS,
} from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { isRecordNotFoundError } from "@/lib/prisma-errors";

// ---------------------------------------------------------------------------
// Match-Matrix maintenance. The internal team (requireScoutModule = ADMIN +
// MEMBER) keeps the matrix up to date, mirroring the shared Excel/Sheet. This
// MVP is team-editable only. Partner-/startup-side SELF-input (both-sided
// feedback) is a documented PHASE-2 follow-up (see docs/plan-match-matrix.md)
// and is deliberately NOT built here.
// ---------------------------------------------------------------------------

const relevanceEnum = z.enum(
  RELEVANCE_LEVELS as [RelevanceLevel, ...RelevanceLevel[]]
);

const upsertSchema = z.object({
  partnerId: z.string().min(1, "Partner ist erforderlich."),
  startupId: z.string().min(1, "Startup ist erforderlich."),
  // Empty select → null (clears the relevance).
  startupRelevance: relevanceEnum.nullable(),
  partnerRelevance: relevanceEnum.nullable(),
  useCaseTypes: z.array(
    z.enum(MATCH_USE_CASE_TYPES as [MatchUseCaseType, ...MatchUseCaseType[]])
  ),
  useCaseNote: z.string().trim().max(2000).optional(),
  nextSteps: z.string().trim().max(2000).optional(),
  contactStatus: z.enum(
    MATCH_CONTACT_STATUSES as [MatchContactStatus, ...MatchContactStatus[]]
  ),
});

function optionalRelevance(value: FormDataEntryValue | null): RelevanceLevel | null {
  const raw = typeof value === "string" ? value.trim() : "";
  return raw ? (raw as RelevanceLevel) : null;
}

/**
 * Upserts a single (partner × startup) matrix cell on the
 * @@unique([partnerId, startupId]) key — atomic and idempotent. Records which
 * team member last touched it (updatedById). Guarded by requireScoutModule.
 */
export async function upsertMatchCell(
  _prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const session = await requireScoutModule();

  const parsed = upsertSchema.safeParse({
    partnerId: formData.get("partnerId"),
    startupId: formData.get("startupId"),
    startupRelevance: optionalRelevance(formData.get("startupRelevance")),
    partnerRelevance: optionalRelevance(formData.get("partnerRelevance")),
    useCaseTypes: formData.getAll("useCaseTypes"),
    useCaseNote: formData.get("useCaseNote") || undefined,
    nextSteps: formData.get("nextSteps") || undefined,
    contactStatus: formData.get("contactStatus") || "NONE",
  });
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  const { partnerId, startupId } = parsed.data;

  // Verify both foreign keys up front so a bad id surfaces as a friendly
  // message rather than an FK violation.
  const [partner, startup] = await Promise.all([
    prisma.partnerCompany.findUnique({
      where: { id: partnerId },
      select: { id: true },
    }),
    prisma.startup.findUnique({
      where: { id: startupId },
      select: { id: true },
    }),
  ]);
  if (!partner) return { error: "Partner-Unternehmen nicht gefunden." };
  if (!startup) return { error: "Startup nicht gefunden." };

  const data = {
    startupRelevance: parsed.data.startupRelevance,
    partnerRelevance: parsed.data.partnerRelevance,
    useCaseTypes: parsed.data.useCaseTypes,
    useCaseNote: parsed.data.useCaseNote ?? null,
    nextSteps: parsed.data.nextSteps ?? null,
    contactStatus: parsed.data.contactStatus,
    updatedById: session.user.id,
  };

  try {
    await prisma.partnerStartupMatch.upsert({
      where: { partnerId_startupId: { partnerId, startupId } },
      update: data,
      create: { partnerId, startupId, ...data },
    });
  } catch (err) {
    if (isRecordNotFoundError(err)) {
      return { error: "Eintrag nicht gefunden." };
    }
    throw err;
  }

  revalidatePath("/match-matrix");
  return { success: "Matrix-Zelle gespeichert." };
}
