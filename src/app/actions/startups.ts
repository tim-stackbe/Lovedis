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
import { prisma } from "@/lib/prisma";

const startupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(160),
  website: z.union([z.url(), z.literal("")]).optional(),
  description: z.string().min(10, "Description must be at least 10 characters"),
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
    },
  });
  revalidatePath("/startups");
  revalidatePath(`/startups/${startupId}`);
  revalidatePath("/pipeline");
  revalidatePath("/radar");
  return { success: "Startup updated." };
}

export async function deleteStartup(startupId: string): Promise<void> {
  await requireScoutModule();
  await prisma.startup.delete({ where: { id: startupId } });
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

  await prisma.startup.update({
    where: { id: parsed.data.startupId },
    data: { pipelineStage: parsed.data.stage },
  });
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
  return { success: "Contact added." };
}

export async function deleteContact(
  contactId: string,
  startupId: string
): Promise<void> {
  await requireScoutModule();
  await prisma.contact.delete({ where: { id: contactId } });
  revalidatePath(`/startups/${startupId}`);
}

// ---------------------------------------------------------------------------
// Attachments
// ---------------------------------------------------------------------------

const attachmentSchema = z.object({
  startupId: z.string().min(1),
  name: z.string().min(1).max(160),
  url: z.url("Please provide a valid URL"),
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
  return { success: "Attachment added." };
}

export async function deleteAttachment(
  attachmentId: string,
  startupId: string
): Promise<void> {
  await requireScoutModule();
  await prisma.attachment.delete({ where: { id: attachmentId } });
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
    return { error: "Only startup accounts can edit a startup profile." };
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
    await prisma.startup.create({
      data: { ...data, ownerUserId: session.user.id },
    });
  }
  revalidatePath("/profile");
  revalidatePath("/dashboard/startup");
  return { success: "Profile saved." };
}
