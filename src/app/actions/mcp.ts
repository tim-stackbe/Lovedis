"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/** Disconnects one MCP connection (OAuth grant) of the current user. */
export async function revokeMcpConnection(formData: FormData): Promise<void> {
  const session = await auth();
  const userId = session?.user?.id;
  const grantId = formData.get("grantId");
  if (!userId || typeof grantId !== "string") return;

  await prisma.oAuthGrant.updateMany({
    where: { id: grantId, userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  revalidatePath("/settings");
}
