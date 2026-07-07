"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type {
  PipelineStage,
  RadarQuadrant,
  RadarRing,
  StartupStage,
} from "@/generated/prisma/enums";
import { firstZodError, type ActionState } from "@/lib/action-state";
import { requireAuth, requireScoutModule } from "@/lib/auth-guards";
import {
  PIPELINE_STAGES,
  RADAR_QUADRANTS,
  RADAR_RINGS,
  STARTUP_STAGES,
} from "@/lib/constants";
import { grantOnboardingCredits } from "@/lib/onboarding-credits";
import { prisma } from "@/lib/prisma";
import { isRecordNotFoundError } from "@/lib/prisma-errors";

const startupSchema = z.object({
  name: z.string().min(2, "Name muss mindestens 2 Zeichen lang sein").max(160),
  website: z.union([z.url(), z.literal("")]).optional(),
  description: z
    .string()
    .min(10, "Beschreibung muss mindestens 10 Zeichen lang sein"),
  industry: z.string().min(2).max(80),
  country: z.string().max(80).optional(),
  city: z.string().max(80).optional(),
  foundedYear: z.coerce.number().int().min(1900).max(2100).optional(),
  teamSize: z.coerce.number().int().min(1).max(100000).optional(),
  stage: z.enum(STARTUP_STAGES as [StartupStage, ...StartupStage[]]),
  fundingRaised: z.coerce.number().min(0).optional(),
  pipelineStage: z.enum(PIPELINE_STAGES as [PipelineStage, ...PipelineStage[]]),
  radarQuadrant: z
    .enum(RADAR_QUADRANTS as [RadarQuadrant, ...RadarQuadrant[]])
    .optional(),
  radarRing: z.enum(RADAR_RINGS as [RadarRing, ...RadarRing[]]).optional(),
  campaignId: z.string().min(1).optional(),
});

function parseStartupForm(formData: FormData) {
  return startupSchema.safeParse({
    name: formData.get("name"),
    website: formData.get("website") || "",
    description: formData.get("description"),
    industry: formData.get("industry"),
    country: formData.get("country") || undefined,
    city: formData.get("city") || undefined,
    foundedYear: formData.get("foundedYear") || undefined,
    teamSize: formData.get("teamSize") || undefined,
    stage: formData.get("stage"),
    fundingRaised: formData.get("fundingRaised") || undefined,
    pipelineStage: formData.get("pipelineStage") ?? "DISCOVERED",
    radarQuadrant: formData.get("radarQuadrant") || undefined,
    radarRing: formData.get("radarRing") || undefined,
    campaignId: formData.get("campaignId") || undefined,
  });
}

export async function createStartup(
  _prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  await requireScoutModule();
  const parsed = parseStartupForm(formData);
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  const startup = await prisma.startup.create({
    data: { ...parsed.data, website: parsed.data.website || null },
  });
  revalidatePath("/startups");
  revalidatePath("/longlist");
  revalidatePath("/pipeline");
  revalidatePath("/radar");
  redirect(`/startups/${startup.id}`);
}

export async function updateStartup(
  startupId: string,
  _prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  await requireScoutModule();
  const parsed = parseStartupForm(formData);
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  await prisma.startup.update({
    where: { id: startupId },
    data: {
      ...parsed.data,
      website: parsed.data.website || null,
      radarQuadrant: parsed.data.radarQuadrant ?? null,
      radarRing: parsed.data.radarRing ?? null,
      campaignId: parsed.data.campaignId ?? null,
    },
  });
  revalidatePath("/startups");
  revalidatePath(`/startups/${startupId}`);
  revalidatePath("/longlist");
  revalidatePath("/pipeline");
  revalidatePath("/radar");
  return { success: "Startup aktualisiert." };
}

export async function deleteStartup(startupId: string): Promise<void> {
  await requireScoutModule();
  // A stale id (already deleted elsewhere) is a no-op: the desired end state —
  // the startup being gone — already holds, so we revalidate + redirect rather
  // than 500 on P2025.
  try {
    await prisma.startup.delete({ where: { id: startupId } });
  } catch (err) {
    if (!isRecordNotFoundError(err)) throw err;
  }
  revalidatePath("/startups");
  revalidatePath("/pipeline");
  revalidatePath("/radar");
  redirect("/startups");
}

const stageSchema = z.object({
  startupId: z.string().min(1),
  stage: z.enum(PIPELINE_STAGES as [PipelineStage, ...PipelineStage[]]),
});

export async function updatePipelineStage(
  startupId: string,
  stage: string
): Promise<ActionState> {
  await requireScoutModule();
  const parsed = stageSchema.safeParse({ startupId, stage });
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  try {
    await prisma.startup.update({
      where: { id: parsed.data.startupId },
      data: { pipelineStage: parsed.data.stage },
    });
  } catch (err) {
    if (isRecordNotFoundError(err)) return { error: "Startup nicht gefunden." };
    throw err;
  }
  revalidatePath("/pipeline");
  revalidatePath("/startups");
  revalidatePath(`/startups/${startupId}`);
  return {};
}

// ---------------------------------------------------------------------------
// Contacts
// ---------------------------------------------------------------------------

const contactSchema = z.object({
  startupId: z.string().min(1),
  name: z.string().min(2).max(120),
  position: z.string().max(120).optional(),
  email: z.union([z.email(), z.literal("")]).optional(),
  phone: z.string().max(40).optional(),
  notes: z.string().max(2000).optional(),
});

export async function addContact(
  _prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  await requireScoutModule();
  const parsed = contactSchema.safeParse({
    startupId: formData.get("startupId"),
    name: formData.get("name"),
    position: formData.get("position") || undefined,
    email: formData.get("email") || "",
    phone: formData.get("phone") || undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  await prisma.contact.create({
    data: { ...parsed.data, email: parsed.data.email || null },
  });
  revalidatePath(`/startups/${parsed.data.startupId}`);
  return { success: "Kontakt hinzugefügt." };
}

export async function deleteContact(
  contactId: string,
  startupId: string
): Promise<void> {
  await requireScoutModule();
  try {
    await prisma.contact.delete({ where: { id: contactId } });
  } catch (err) {
    if (!isRecordNotFoundError(err)) throw err;
  }
  revalidatePath(`/startups/${startupId}`);
}

// ---------------------------------------------------------------------------
// Attachments
// ---------------------------------------------------------------------------

const attachmentSchema = z.object({
  startupId: z.string().min(1),
  name: z.string().min(1).max(160),
  url: z.url("Bitte gib eine gültige URL an"),
  type: z.enum(["LINK", "DOCUMENT", "DECK", "OTHER"]),
});

export async function addAttachment(
  _prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  await requireScoutModule();
  const parsed = attachmentSchema.safeParse({
    startupId: formData.get("startupId"),
    name: formData.get("name"),
    url: formData.get("url"),
    type: formData.get("type") ?? "LINK",
  });
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  await prisma.attachment.create({ data: parsed.data });
  revalidatePath(`/startups/${parsed.data.startupId}`);
  return { success: "Anhang hinzugefügt." };
}

export async function deleteAttachment(
  attachmentId: string,
  startupId: string
): Promise<void> {
  await requireScoutModule();
  try {
    await prisma.attachment.delete({ where: { id: attachmentId } });
  } catch (err) {
    if (!isRecordNotFoundError(err)) throw err;
  }
  revalidatePath(`/startups/${startupId}`);
}

// ---------------------------------------------------------------------------
// Startup self-service profile (STARTUP role)
// ---------------------------------------------------------------------------

const profileSchema = startupSchema.pick({
  name: true,
  website: true,
  description: true,
  industry: true,
  country: true,
  city: true,
  foundedYear: true,
  teamSize: true,
  stage: true,
  fundingRaised: true,
});

export async function upsertOwnStartupProfile(
  _prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const session = await requireAuth();
  if (session.user.role !== "STARTUP") {
    return { error: "Nur Startup-Konten können ein Startup-Profil bearbeiten." };
  }

  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    website: formData.get("website") || "",
    description: formData.get("description"),
    industry: formData.get("industry"),
    country: formData.get("country") || undefined,
    city: formData.get("city") || undefined,
    foundedYear: formData.get("foundedYear") || undefined,
    teamSize: formData.get("teamSize") || undefined,
    stage: formData.get("stage"),
    fundingRaised: formData.get("fundingRaised") || undefined,
  });
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  const data = { ...parsed.data, website: parsed.data.website || null };
  const existing = await prisma.startup.findUnique({
    where: { ownerUserId: session.user.id },
  });
  if (existing) {
    await prisma.startup.update({ where: { id: existing.id }, data });
  } else {
    const created = await prisma.startup.create({
      data: { ...data, ownerUserId: session.user.id },
    });
    // Newly onboarded startups receive the 12-credit onboarding balance
    // ("sponsored by LOVEDIS") via the existing ledger. Idempotent: the helper
    // guards on an existing onboarding GRANT, so this never double-grants.
    await grantOnboardingCredits(prisma, created.id, session.user.id);
  }
  revalidatePath("/profile");
  revalidatePath("/dashboard/startup");
  revalidatePath("/venture/credits");
  return { success: "Profil gespeichert." };
}
