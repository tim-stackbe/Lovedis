"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import type { ActionState } from "@/lib/action-state";
import { requireAdmin } from "@/lib/auth-guards";
import { CONTENT_ACTIONS, nextStatus, parseContentForm, type ContentAction } from "@/lib/marketing/content";
import { parseLinkedInSheets, type SheetRows } from "@/lib/marketing/linkedin-import";
import { notifyCriticalFailures } from "@/lib/marketing/notify";
import { syncResend } from "@/lib/marketing/resend-sync";
import { syncUmami, umamiConfig } from "@/lib/marketing/umami";
import { prisma } from "@/lib/prisma";

// Writes go ONLY to the Marketing tables (MarketingIntegration, MarketingEmail,
// LinkedInPost, LinkedInFollowerDay, WebTrafficDay, ContentItem).

const MAX_IMPORT_BYTES = 10 * 1024 * 1024;

function revalidateMarketing() {
  revalidatePath("/marketing", "layout");
}

export async function runMarketingSync(): Promise<ActionState> {
  await requireAdmin();
  const resend = await syncResend();
  const umami = umamiConfig() ? await syncUmami() : null;
  if (resend.ok) await notifyCriticalFailures();
  revalidateMarketing();
  if (!resend.ok) return { error: `Resend-Abruf fehlgeschlagen: ${resend.error}` };
  if (umami && !umami.ok) return { error: `Umami-Abruf fehlgeschlagen: ${umami.error}` };
  return {
    success:
      `Abgerufen: ${resend.emails} Mails aus Resend, davon ${resend.created} neu` +
      (umami ? `, ${umami.visitors30.toLocaleString("de-DE")} Website-Besucher in 30 Tagen.` : "."),
  };
}

export async function importLinkedInExport(
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();
  const files = formData.getAll("file").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { error: "Bitte eine Export-Datei (XLS, XLSX oder CSV) auswählen." };
  if (files.some((f) => f.size > MAX_IMPORT_BYTES)) return { error: "Datei ist größer als 10 MB." };

  const XLSX = await import("xlsx");
  const sheets: SheetRows[] = [];
  for (const file of files) {
    try {
      const book = XLSX.read(new Uint8Array(await file.arrayBuffer()), { type: "array", cellDates: true });
      for (const name of book.SheetNames) {
        sheets.push({
          name: `${file.name} › ${name}`,
          rows: XLSX.utils.sheet_to_json<unknown[]>(book.Sheets[name], { header: 1, raw: true, defval: "" }),
        });
      }
    } catch {
      return { error: `„${file.name}“ konnte nicht gelesen werden.` };
    }
  }

  const parsed = parseLinkedInSheets(sheets);
  if (parsed.recognized.length === 0) {
    return {
      error:
        "Keine LinkedIn-Daten erkannt. Erwartet wird der Export aus Page Analytics (Inhalte oder Follower) mit Spalten wie „Post link“ und „Impressions“.",
    };
  }

  for (const p of parsed.posts) {
    const { postKey, ...data } = p;
    await prisma.linkedInPost.upsert({ where: { postKey }, create: { postKey, ...data }, update: data });
  }
  for (const f of parsed.followers) {
    await prisma.linkedInFollowerDay.upsert({
      where: { day: f.day },
      create: f,
      update: { organic: f.organic, sponsored: f.sponsored },
    });
  }
  await prisma.marketingIntegration.upsert({
    where: { provider: "LINKEDIN" },
    create: { provider: "LINKEDIN", lastSyncAt: new Date(), lastError: null },
    update: { lastSyncAt: new Date(), lastError: null },
  });

  revalidateMarketing();
  const parts = [
    parsed.posts.length > 0 && `${parsed.posts.length} Beiträge`,
    parsed.followers.length > 0 && `${parsed.followers.length} Follower-Tage`,
  ].filter(Boolean);
  return {
    success: `Import fertig: ${parts.join(" und ") || "keine Zeilen"}${
      parsed.skippedRows > 0 ? `, ${parsed.skippedRows} Zeilen ohne Link oder Datum übersprungen` : ""
    }.`,
  };
}

export async function saveFollowerTotal(
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();
  const total = Number(String(formData.get("total") ?? "").replace(/\D/g, ""));
  if (!Number.isInteger(total) || total <= 0) return { error: "Bitte die aktuelle Follower-Zahl eintragen." };

  const current = await prisma.marketingIntegration.findUnique({ where: { provider: "LINKEDIN" } });
  const meta = {
    ...((current?.meta as Record<string, unknown> | null) ?? {}),
    followerTotal: total,
    followerTotalAt: new Date().toISOString(),
  } as Prisma.InputJsonValue;
  await prisma.marketingIntegration.upsert({
    where: { provider: "LINKEDIN" },
    create: { provider: "LINKEDIN", meta },
    update: { meta },
  });
  revalidateMarketing();
  return { success: "Follower-Zahl gespeichert." };
}

export async function saveContentItem(
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const session = await requireAdmin();
  const parsed = parseContentForm(formData);
  if (!parsed.data) return { error: parsed.error };
  const { id, ...data } = parsed.data;

  if (data.assigneeId) {
    const assignee = await prisma.user.findFirst({
      where: { id: data.assigneeId, role: "ADMIN" },
      select: { id: true },
    });
    if (!assignee) return { error: "Verantwortliche Person nicht gefunden." };
  }

  if (id) {
    const existing = await prisma.contentItem.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return { error: "Eintrag nicht gefunden." };
    await prisma.contentItem.update({ where: { id }, data });
  } else {
    await prisma.contentItem.create({
      data: { ...data, status: "IDEA", createdById: session.user.id },
    });
  }
  revalidateMarketing();
  return { success: id ? "Beitrag gespeichert." : "Beitrag angelegt." };
}

export async function changeContentStatus(id: string, action: ContentAction, note?: string): Promise<ActionState> {
  const session = await requireAdmin();
  if (!(CONTENT_ACTIONS as readonly string[]).includes(action)) return { error: "Unbekannte Aktion." };
  const item = await prisma.contentItem.findUnique({ where: { id } });
  if (!item) return { error: "Eintrag nicht gefunden." };
  const to = nextStatus(item.status, action);
  if (!to) return { error: "Dieser Schritt ist im aktuellen Status nicht möglich." };
  if (action === "reject" && !note?.trim()) return { error: "Bitte kurz begründen, was geändert werden soll." };

  await prisma.contentItem.update({
    where: { id },
    data: {
      status: to,
      ...(action === "approve" && { approvedById: session.user.id, approvedAt: new Date(), reviewNote: note?.trim() || null }),
      ...(action === "reject" && { approvedById: null, approvedAt: null, reviewNote: note!.trim() }),
      ...(action === "reopen" && { approvedById: null, approvedAt: null }),
    },
  });
  revalidateMarketing();
  const messages: Record<ContentAction, string> = {
    submit: "Zur Freigabe eingereicht.",
    approve: "Freigegeben.",
    reject: "Zurückgegeben.",
    publish: "Als veröffentlicht markiert.",
    reopen: "Wieder geöffnet.",
  };
  return { success: messages[action] };
}

export async function deleteContentItem(id: string): Promise<ActionState> {
  await requireAdmin();
  await prisma.contentItem.deleteMany({ where: { id } });
  revalidateMarketing();
  return { success: "Beitrag gelöscht." };
}
