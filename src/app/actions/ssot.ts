"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type {
  AttachmentType,
  ContentAudience,
  KnowledgeResourceType,
  RoadmapStatus,
} from "@/generated/prisma/enums";
import { firstZodError, type ActionState } from "@/lib/action-state";
import { requireTeam } from "@/lib/auth-guards";
import {
  CONTENT_AUDIENCES,
  KNOWLEDGE_RESOURCE_TYPES,
  ROADMAP_STATUSES,
} from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { isRecordNotFoundError } from "@/lib/prisma-errors";

const audienceEnum = z.enum(
  CONTENT_AUDIENCES as [ContentAudience, ...ContentAudience[]]
);

function revalidateHub() {
  revalidatePath("/hub-admin");
  revalidatePath("/partner-hub");
  revalidatePath("/venture");
}

// ---------------------------------------------------------------------------
// Roadmap items
// ---------------------------------------------------------------------------

const roadmapSchema = z.object({
  title: z.string().min(2).max(200),
  body: z.string().max(4000).optional(),
  phase: z.string().max(80).optional(),
  status: z.enum(ROADMAP_STATUSES as [RoadmapStatus, ...RoadmapStatus[]]),
  audience: audienceEnum,
  sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
});

export async function createRoadmapItem(
  _prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  await requireTeam();
  const parsed = roadmapSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body") || undefined,
    phase: formData.get("phase") || undefined,
    status: formData.get("status") ?? "PLANNED",
    audience: formData.get("audience") ?? "PARTNER",
    sortOrder: formData.get("sortOrder") || undefined,
  });
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  await prisma.roadmapItem.create({
    data: {
      title: parsed.data.title,
      body: parsed.data.body ?? null,
      phase: parsed.data.phase ?? null,
      status: parsed.data.status,
      audience: parsed.data.audience,
      sortOrder: parsed.data.sortOrder ?? 0,
    },
  });
  revalidateHub();
  return { success: "Roadmap-Eintrag angelegt." };
}

export async function updateRoadmapItem(
  id: string,
  _prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  await requireTeam();
  const parsed = roadmapSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body") || undefined,
    phase: formData.get("phase") || undefined,
    status: formData.get("status") ?? "PLANNED",
    audience: formData.get("audience") ?? "PARTNER",
    sortOrder: formData.get("sortOrder") || undefined,
  });
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  try {
    await prisma.roadmapItem.update({
      where: { id },
      data: {
        title: parsed.data.title,
        body: parsed.data.body ?? null,
        phase: parsed.data.phase ?? null,
        status: parsed.data.status,
        audience: parsed.data.audience,
        sortOrder: parsed.data.sortOrder ?? 0,
      },
    });
  } catch (err) {
    if (isRecordNotFoundError(err)) {
      return { error: "Roadmap-Eintrag nicht gefunden." };
    }
    throw err;
  }
  revalidateHub();
  return { success: "Roadmap-Eintrag aktualisiert." };
}

export async function deleteRoadmapItem(id: string): Promise<void> {
  await requireTeam();
  try {
    await prisma.roadmapItem.delete({ where: { id } });
  } catch (err) {
    if (!isRecordNotFoundError(err)) throw err;
  }
  revalidateHub();
}

// ---------------------------------------------------------------------------
// Content pages (Markdown)
// ---------------------------------------------------------------------------

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const contentSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(slugRegex, "Slug: nur Kleinbuchstaben, Zahlen und Bindestriche"),
  title: z.string().min(2).max(200),
  body: z.string().min(1).max(20000),
  audience: audienceEnum,
  isPublished: z.boolean(),
  sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
});

function parseContent(formData: FormData) {
  return contentSchema.safeParse({
    slug: formData.get("slug"),
    title: formData.get("title"),
    body: formData.get("body"),
    audience: formData.get("audience") ?? "PARTNER",
    isPublished: formData.get("isPublished") === "on",
    sortOrder: formData.get("sortOrder") || undefined,
  });
}

export async function createContentPage(
  _prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  await requireTeam();
  const parsed = parseContent(formData);
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  const existing = await prisma.contentPage.findUnique({
    where: { slug: parsed.data.slug },
    select: { id: true },
  });
  if (existing) return { error: "Slug ist bereits vergeben." };

  await prisma.contentPage.create({
    data: {
      slug: parsed.data.slug,
      title: parsed.data.title,
      body: parsed.data.body,
      audience: parsed.data.audience,
      isPublished: parsed.data.isPublished,
      sortOrder: parsed.data.sortOrder ?? 0,
    },
  });
  revalidateHub();
  return { success: "Inhaltsseite angelegt." };
}

export async function updateContentPage(
  id: string,
  _prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  await requireTeam();
  const parsed = parseContent(formData);
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  const clash = await prisma.contentPage.findFirst({
    where: { slug: parsed.data.slug, NOT: { id } },
    select: { id: true },
  });
  if (clash) return { error: "Slug ist bereits vergeben." };

  try {
    await prisma.contentPage.update({
      where: { id },
      data: {
        slug: parsed.data.slug,
        title: parsed.data.title,
        body: parsed.data.body,
        audience: parsed.data.audience,
        isPublished: parsed.data.isPublished,
        sortOrder: parsed.data.sortOrder ?? 0,
      },
    });
  } catch (err) {
    if (isRecordNotFoundError(err)) {
      return { error: "Inhaltsseite nicht gefunden." };
    }
    throw err;
  }
  revalidateHub();
  return { success: "Inhaltsseite aktualisiert." };
}

export async function deleteContentPage(id: string): Promise<void> {
  await requireTeam();
  try {
    await prisma.contentPage.delete({ where: { id } });
  } catch (err) {
    if (!isRecordNotFoundError(err)) throw err;
  }
  revalidateHub();
}

// ---------------------------------------------------------------------------
// Media assets
// ---------------------------------------------------------------------------

const mediaSchema = z.object({
  name: z.string().min(2).max(160),
  url: z.url("Bitte gib eine gültige URL an"),
  type: z.enum(["LINK", "DOCUMENT", "DECK", "OTHER"]),
  audience: audienceEnum,
});

export async function createMediaAsset(
  _prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  await requireTeam();
  const parsed = mediaSchema.safeParse({
    name: formData.get("name"),
    url: formData.get("url"),
    type: (formData.get("type") as AttachmentType) ?? "DOCUMENT",
    audience: formData.get("audience") ?? "PARTNER",
  });
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  await prisma.mediaAsset.create({ data: parsed.data });
  revalidateHub();
  return { success: "Asset hinzugefügt." };
}

export async function deleteMediaAsset(id: string): Promise<void> {
  await requireTeam();
  try {
    await prisma.mediaAsset.delete({ where: { id } });
  } catch (err) {
    if (!isRecordNotFoundError(err)) throw err;
  }
  revalidateHub();
}

// ---------------------------------------------------------------------------
// Knowledge-Board resources (curated book/video/article recommendations)
// ---------------------------------------------------------------------------

const knowledgeSchema = z.object({
  title: z.string().min(2).max(200),
  url: z.url("Bitte gib eine gültige URL an").optional().or(z.literal("")),
  author: z.string().max(160).optional(),
  type: z.enum(
    KNOWLEDGE_RESOURCE_TYPES as [
      KnowledgeResourceType,
      ...KnowledgeResourceType[],
    ]
  ),
  note: z.string().max(2000).optional(),
  audience: audienceEnum,
  sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
});

function parseKnowledge(formData: FormData) {
  return knowledgeSchema.safeParse({
    title: formData.get("title"),
    url: formData.get("url") || undefined,
    author: formData.get("author") || undefined,
    type: formData.get("type") ?? "ARTICLE",
    note: formData.get("note") || undefined,
    audience: formData.get("audience") ?? "BOTH",
    sortOrder: formData.get("sortOrder") || undefined,
  });
}

export async function createKnowledgeResource(
  _prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  await requireTeam();
  const parsed = parseKnowledge(formData);
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  await prisma.knowledgeResource.create({
    data: {
      title: parsed.data.title,
      url: parsed.data.url ? parsed.data.url : null,
      author: parsed.data.author ?? null,
      type: parsed.data.type,
      note: parsed.data.note ?? null,
      audience: parsed.data.audience,
      sortOrder: parsed.data.sortOrder ?? 0,
    },
  });
  revalidateHub();
  return { success: "Empfehlung hinzugefügt." };
}

export async function deleteKnowledgeResource(id: string): Promise<void> {
  await requireTeam();
  try {
    await prisma.knowledgeResource.delete({ where: { id } });
  } catch (err) {
    if (!isRecordNotFoundError(err)) throw err;
  }
  revalidateHub();
}
