"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ChallengeStatus } from "@/generated/prisma/enums";
import { firstZodError, type ActionState } from "@/lib/action-state";
import { isPartnerApproved, requireAuth, requireRole } from "@/lib/auth-guards";
import { CHALLENGE_STATUSES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

const challengeSchema = z.object({
  title: z.string().min(4, "Titel muss mindestens 4 Zeichen lang sein").max(200),
  description: z
    .string()
    .min(20, "Beschreibung muss mindestens 20 Zeichen lang sein")
    .max(8000),
  status: z.enum(CHALLENGE_STATUSES as [ChallengeStatus, ...ChallengeStatus[]]),
  deadline: z.string().optional(),
  tags: z.string().max(400).optional(),
});

function parseChallengeForm(formData: FormData) {
  return challengeSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    status: formData.get("status") ?? "DRAFT",
    deadline: formData.get("deadline") || undefined,
    tags: formData.get("tags") || undefined,
  });
}

function toTags(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 10);
}

export async function createChallenge(
  _prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const session = await requireRole(["ADMIN", "BUSINESS_PARTNER"]);
  // A pending partner cannot create use-cases/challenges until approved.
  if (
    session.user.role === "BUSINESS_PARTNER" &&
    !(await isPartnerApproved(session.user.id))
  ) {
    return { error: "Dein Partner-Konto ist noch nicht freigegeben." };
  }
  const parsed = parseChallengeForm(formData);
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  const challenge = await prisma.challenge.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      status: parsed.data.status,
      deadline: parsed.data.deadline ? new Date(parsed.data.deadline) : null,
      tags: toTags(parsed.data.tags),
      createdById: session.user.id,
    },
  });
  revalidatePath("/challenges");
  redirect(`/challenges/${challenge.id}`);
}

/** Loads a challenge and asserts the session user may manage it. */
async function getManagedChallenge(challengeId: string) {
  const session = await requireRole(["ADMIN", "BUSINESS_PARTNER"]);
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    select: { id: true, createdById: true },
  });
  if (!challenge) return { session, challenge: null };
  if (
    session.user.role !== "ADMIN" &&
    challenge.createdById !== session.user.id
  ) {
    return { session, challenge: null };
  }
  return { session, challenge };
}

export async function updateChallenge(
  challengeId: string,
  _prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const { challenge } = await getManagedChallenge(challengeId);
  if (!challenge)
    return { error: "Challenge nicht gefunden oder nicht deine eigene." };

  const parsed = parseChallengeForm(formData);
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  await prisma.challenge.update({
    where: { id: challengeId },
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      status: parsed.data.status,
      deadline: parsed.data.deadline ? new Date(parsed.data.deadline) : null,
      tags: toTags(parsed.data.tags),
    },
  });
  revalidatePath("/challenges");
  revalidatePath(`/challenges/${challengeId}`);
  return { success: "Challenge aktualisiert." };
}

export async function updateChallengeStatus(
  challengeId: string,
  status: ChallengeStatus
): Promise<ActionState> {
  const { challenge } = await getManagedChallenge(challengeId);
  if (!challenge)
    return { error: "Challenge nicht gefunden oder nicht deine eigene." };
  const parsed = z
    .enum(CHALLENGE_STATUSES as [ChallengeStatus, ...ChallengeStatus[]])
    .safeParse(status);
  if (!parsed.success) return { error: "Ungültiger Status." };

  await prisma.challenge.update({
    where: { id: challengeId },
    data: { status: parsed.data },
  });
  revalidatePath("/challenges");
  revalidatePath(`/challenges/${challengeId}`);
  return {};
}

export async function deleteChallenge(challengeId: string): Promise<void> {
  const { challenge } = await getManagedChallenge(challengeId);
  if (!challenge) redirect("/challenges");
  await prisma.challenge.delete({ where: { id: challengeId } });
  revalidatePath("/challenges");
  redirect("/challenges");
}

// ---------------------------------------------------------------------------
// Applications
// ---------------------------------------------------------------------------

const applySchema = z.object({
  challengeId: z.string().min(1),
  pitch: z
    .string()
    .min(30, "Pitch muss mindestens 30 Zeichen lang sein")
    .max(5000),
});

export async function applyToChallenge(
  _prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const session = await requireAuth();
  if (session.user.role !== "STARTUP") {
    return { error: "Nur Startup-Konten können sich auf Challenges bewerben." };
  }

  const parsed = applySchema.safeParse({
    challengeId: formData.get("challengeId"),
    pitch: formData.get("pitch"),
  });
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  const startup = await prisma.startup.findUnique({
    where: { ownerUserId: session.user.id },
    select: { id: true },
  });
  if (!startup) {
    return {
      error:
        "Vervollständige dein Startup-Profil, bevor du dich auf eine Challenge bewirbst.",
    };
  }

  const challenge = await prisma.challenge.findUnique({
    where: { id: parsed.data.challengeId },
    select: { status: true },
  });
  if (!challenge || challenge.status !== "OPEN") {
    return { error: "Diese Challenge ist nicht für Bewerbungen geöffnet." };
  }

  const existing = await prisma.challengeApplication.findUnique({
    where: {
      challengeId_startupId: {
        challengeId: parsed.data.challengeId,
        startupId: startup.id,
      },
    },
  });
  if (existing)
    return { error: "Du hast dich bereits auf diese Challenge beworben." };

  await prisma.challengeApplication.create({
    data: {
      challengeId: parsed.data.challengeId,
      startupId: startup.id,
      pitch: parsed.data.pitch,
    },
  });
  revalidatePath("/challenges");
  revalidatePath(`/challenges/${parsed.data.challengeId}`);
  revalidatePath("/applications");
  return { success: "Bewerbung abgeschickt." };
}

export async function decideApplication(
  applicationId: string,
  decision: "ACCEPTED" | "REJECTED"
): Promise<ActionState> {
  const session = await requireRole(["ADMIN", "BUSINESS_PARTNER"]);
  const parsed = z.enum(["ACCEPTED", "REJECTED"]).safeParse(decision);
  if (!parsed.success) return { error: "Ungültige Entscheidung." };

  const application = await prisma.challengeApplication.findUnique({
    where: { id: applicationId },
    include: {
      challenge: { select: { id: true, title: true, createdById: true } },
      startup: { select: { name: true } },
      poc: { select: { id: true } },
    },
  });
  if (!application) return { error: "Bewerbung nicht gefunden." };
  if (
    session.user.role !== "ADMIN" &&
    application.challenge.createdById !== session.user.id
  ) {
    return {
      error:
        "Du kannst nur über Bewerbungen auf deine eigenen Challenges entscheiden.",
    };
  }

  await prisma.challengeApplication.update({
    where: { id: applicationId },
    data: { status: parsed.data },
  });

  // Accepted applications spawn a PoC tracked by the challenge owner.
  if (parsed.data === "ACCEPTED" && !application.poc) {
    await prisma.poCPerformance.create({
      data: {
        applicationId,
        title: `PoC — ${application.startup.name} × ${application.challenge.title}`,
        trackedById: application.challenge.createdById,
      },
    });
  }

  revalidatePath(`/challenges/${application.challenge.id}`);
  revalidatePath("/challenges");
  revalidatePath("/applications");
  revalidatePath("/pocs");
  return {};
}
