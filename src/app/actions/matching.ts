"use server";

import { revalidatePath } from "next/cache";
import { type ActionState } from "@/lib/action-state";
import { requireRole } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Auto-Matching triage actions (ADMIN + MEMBER only).
//
// "Einladen" routes a suggested startup onto a challenge by creating a
// ChallengeApplication on the team's behalf (reuses the existing model, so no
// extra schema). "Verwerfen" records a ChallengeMatchDismissal so the
// suggestion stops surfacing. Both are idempotent against the unique keys.
// ---------------------------------------------------------------------------

const TEAM_ROLES = ["ADMIN", "MEMBER"] as const;

/** Routes a startup onto a challenge as a team-sourced application. */
export async function inviteStartupToChallenge(
  challengeId: string,
  startupId: string
): Promise<ActionState> {
  await requireRole([...TEAM_ROLES]);

  const [challenge, startup] = await Promise.all([
    prisma.challenge.findUnique({
      where: { id: challengeId },
      select: { id: true },
    }),
    prisma.startup.findUnique({
      where: { id: startupId },
      select: { id: true, name: true },
    }),
  ]);
  if (!challenge || !startup) return { error: "Challenge oder Startup nicht gefunden." };

  const existing = await prisma.challengeApplication.findUnique({
    where: { challengeId_startupId: { challengeId, startupId } },
    select: { id: true },
  });
  if (existing) {
    return { error: "Dieses Startup ist für die Challenge bereits erfasst." };
  }

  await prisma.challengeApplication.create({
    data: {
      challengeId,
      startupId,
      status: "PENDING",
      pitch:
        "Vom Lovedis-Team über das Auto-Matching vorgeschlagen — passt laut Profil zur Challenge.",
    },
  });

  revalidatePath("/matching");
  revalidatePath(`/challenges/${challengeId}`);
  return { success: `${startup.name} zur Challenge eingeladen.` };
}

/** Hides a suggestion for a challenge so it no longer appears in the queue. */
export async function dismissSuggestion(
  challengeId: string,
  startupId: string
): Promise<ActionState> {
  const session = await requireRole([...TEAM_ROLES]);

  await prisma.challengeMatchDismissal.upsert({
    where: { challengeId_startupId: { challengeId, startupId } },
    create: { challengeId, startupId, dismissedById: session.user.id },
    update: {},
  });

  revalidatePath("/matching");
  return { success: "Vorschlag verworfen." };
}
