"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * Marks the one-time DSGVO data-sharing notice as acknowledged for the current
 * user by stamping `dataSharingNoticeAckAt`. Idempotent: only writes when still
 * null, so re-submits are harmless. After this, the info modal no longer shows.
 */
export async function acknowledgeDataSharingNotice(): Promise<{ ok: boolean }> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false };

  await prisma.user.updateMany({
    where: { id: userId, dataSharingNoticeAckAt: null },
    data: { dataSharingNoticeAckAt: new Date() },
  });

  // Refresh the authenticated shell so the modal (rendered in the layout) drops.
  revalidatePath("/", "layout");
  return { ok: true };
}
