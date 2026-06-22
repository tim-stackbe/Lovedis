"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { UpdateCategory } from "@/generated/prisma/enums";
import { firstZodError, type ActionState } from "@/lib/action-state";
import { requireMarketplace, requireRole } from "@/lib/auth-guards";
import { UPDATE_CATEGORIES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Following (investors & partners)
// ---------------------------------------------------------------------------

/** Toggle follow state for a published startup; returns the new state. */
export async function toggleFollow(
  startupId: string
): Promise<{ following?: boolean; error?: string }> {
  const session = await requireMarketplace();

  const startup = await prisma.startup.findUnique({
    where: { id: startupId },
    select: { isPublished: true },
  });
  if (!startup?.isPublished) return { error: "Startup nicht gefunden." };

  const existing = await prisma.startupFollow.findUnique({
    where: { userId_startupId: { userId: session.user.id, startupId } },
    select: { id: true },
  });

  if (existing) {
    await prisma.startupFollow.delete({ where: { id: existing.id } });
  } else {
    await prisma.startupFollow.create({
      data: { userId: session.user.id, startupId },
    });
  }

  revalidatePath("/discover");
  revalidatePath(`/discover/${startupId}`);
  revalidatePath("/feed");
  revalidatePath("/dashboard/investor");
  return { following: !existing };
}

// ---------------------------------------------------------------------------
// Intro requests (investor expresses interest → team brokers)
// ---------------------------------------------------------------------------

const introSchema = z.object({
  startupId: z.string().min(1),
  message: z
    .string()
    .trim()
    .min(10, "Bitte beschreibe dein Interesse in mindestens 10 Zeichen.")
    .max(2000, "Nachricht ist zu lang."),
});

export async function requestIntro(
  startupId: string,
  _prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const session = await requireMarketplace();

  const parsed = introSchema.safeParse({
    startupId,
    message: formData.get("message"),
  });
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  const startup = await prisma.startup.findUnique({
    where: { id: startupId },
    select: { isPublished: true },
  });
  if (!startup?.isPublished) return { error: "Startup nicht gefunden." };

  const existing = await prisma.introRequest.findUnique({
    where: {
      investorId_startupId: { investorId: session.user.id, startupId },
    },
    select: { id: true },
  });
  if (existing) {
    return { error: "Du hast für dieses Startup bereits eine Intro angefragt." };
  }

  await prisma.introRequest.create({
    data: {
      investorId: session.user.id,
      startupId,
      message: parsed.data.message,
    },
  });

  revalidatePath(`/discover/${startupId}`);
  revalidatePath("/dashboard/investor");
  revalidatePath("/intros");
  return { success: "Intro angefragt — das Lovedis-Team meldet sich." };
}

/** Team brokering: approve (opens a chat) or decline an intro request. */
export async function handleIntroRequest(
  introId: string,
  decision: "APPROVE" | "DECLINE"
): Promise<ActionState> {
  const session = await requireRole(["ADMIN", "MEMBER"]);

  const intro = await prisma.introRequest.findUnique({
    where: { id: introId },
    include: {
      startup: { select: { id: true, name: true, ownerUserId: true } },
    },
  });
  if (!intro) return { error: "Anfrage nicht gefunden." };
  if (intro.status !== "PENDING") {
    return { error: "Diese Anfrage wurde bereits bearbeitet." };
  }

  if (decision === "DECLINE") {
    await prisma.introRequest.update({
      where: { id: introId },
      data: { status: "DECLINED", handledById: session.user.id },
    });
    revalidatePath("/intros");
    revalidatePath("/dashboard/investor");
    return { success: "Anfrage abgelehnt." };
  }

  // Approve: if the startup has an owner account, open a direct conversation
  // between the investor and the startup and mark the intro CONNECTED.
  let conversationId: string | null = null;
  const ownerId = intro.startup.ownerUserId;
  if (ownerId && ownerId !== intro.investorId) {
    const existing = await prisma.conversation.findFirst({
      where: {
        AND: [
          { participants: { some: { userId: intro.investorId } } },
          { participants: { some: { userId: ownerId } } },
        ],
      },
      select: { id: true, _count: { select: { participants: true } } },
    });
    if (existing && existing._count.participants === 2) {
      conversationId = existing.id;
    } else {
      const created = await prisma.conversation.create({
        data: {
          participants: {
            create: [{ userId: intro.investorId }, { userId: ownerId }],
          },
        },
        select: { id: true },
      });
      conversationId = created.id;
    }
  }

  await prisma.introRequest.update({
    where: { id: introId },
    data: {
      status: conversationId ? "CONNECTED" : "APPROVED",
      handledById: session.user.id,
      conversationId,
    },
  });

  revalidatePath("/intros");
  revalidatePath("/dashboard/investor");
  revalidatePath("/messages");
  return {
    success: conversationId
      ? `Verbunden — eine Konversation mit ${intro.startup.name} wurde eröffnet.`
      : "Angenommen. Das Startup hat noch kein Konto für einen Direkt-Chat.",
  };
}

// ---------------------------------------------------------------------------
// Startup updates (owner posts to the following feed)
// ---------------------------------------------------------------------------

const updateSchema = z.object({
  title: z.string().trim().min(3, "Titel ist zu kurz.").max(160),
  body: z.string().trim().min(10, "Bitte schreibe etwas mehr.").max(4000),
  category: z.enum(UPDATE_CATEGORIES as [UpdateCategory, ...UpdateCategory[]]),
});

async function ownedStartupOrError(userId: string) {
  return prisma.startup.findUnique({
    where: { ownerUserId: userId },
    select: { id: true },
  });
}

export async function postStartupUpdate(
  _prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const session = await requireRole(["STARTUP"]);

  const startup = await ownedStartupOrError(session.user.id);
  if (!startup) {
    return { error: "Lege zuerst dein Startup-Profil an." };
  }

  const parsed = updateSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    category: formData.get("category") ?? "GENERAL",
  });
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  await prisma.startupUpdate.create({
    data: {
      startupId: startup.id,
      authorId: session.user.id,
      title: parsed.data.title,
      body: parsed.data.body,
      category: parsed.data.category,
    },
  });

  revalidatePath("/profile");
  revalidatePath(`/discover/${startup.id}`);
  revalidatePath("/feed");
  return { success: "Update veröffentlicht." };
}

export async function deleteStartupUpdate(updateId: string): Promise<void> {
  const session = await requireRole(["STARTUP"]);
  const startup = await ownedStartupOrError(session.user.id);
  if (!startup) return;
  await prisma.startupUpdate.deleteMany({
    where: { id: updateId, startupId: startup.id },
  });
  revalidatePath("/profile");
  revalidatePath(`/discover/${startup.id}`);
  revalidatePath("/feed");
}

// ---------------------------------------------------------------------------
// Public storefront (curated fields + publish toggle)
// ---------------------------------------------------------------------------

const storefrontSchema = z.object({
  tagline: z.string().trim().max(160).optional(),
  publicPitch: z.string().trim().max(4000).optional(),
  logoUrl: z.union([z.url(), z.literal("")]).optional(),
  seekingFunding: z.boolean(),
  seekingAmount: z.coerce.number().min(0).max(100000).optional(),
  lookingFor: z.array(z.string().min(1).max(40)).max(8),
  isPublished: z.boolean(),
});

export async function updatePublicProfile(
  _prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const session = await requireRole(["STARTUP"]);

  const startup = await prisma.startup.findUnique({
    where: { ownerUserId: session.user.id },
    select: { id: true, publishedAt: true },
  });
  if (!startup) {
    return { error: "Lege zuerst dein Startup-Profil an." };
  }

  const parsed = storefrontSchema.safeParse({
    tagline: formData.get("tagline") || undefined,
    publicPitch: formData.get("publicPitch") || undefined,
    logoUrl: formData.get("logoUrl") || "",
    seekingFunding: formData.get("seekingFunding") === "on",
    seekingAmount: formData.get("seekingAmount") || undefined,
    lookingFor: formData.getAll("lookingFor").map(String),
    isPublished: formData.get("isPublished") === "on",
  });
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  await prisma.startup.update({
    where: { id: startup.id },
    data: {
      tagline: parsed.data.tagline ?? null,
      publicPitch: parsed.data.publicPitch ?? null,
      logoUrl: parsed.data.logoUrl || null,
      seekingFunding: parsed.data.seekingFunding,
      seekingAmount: parsed.data.seekingFunding
        ? (parsed.data.seekingAmount ?? null)
        : null,
      lookingFor: parsed.data.lookingFor,
      isPublished: parsed.data.isPublished,
      publishedAt:
        parsed.data.isPublished && !startup.publishedAt
          ? new Date()
          : parsed.data.isPublished
            ? undefined
            : null,
    },
  });

  revalidatePath("/profile");
  revalidatePath("/dashboard/startup");
  revalidatePath(`/discover/${startup.id}`);
  revalidatePath("/discover");
  return {
    success: parsed.data.isPublished
      ? "Storefront gespeichert und veröffentlicht."
      : "Storefront gespeichert (nicht öffentlich).",
  };
}
