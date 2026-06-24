import type { ContentAudience, UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

/**
 * Audience values a given role may read. Partners see PARTNER + BOTH content;
 * startups see STARTUP + BOTH. The internal team can preview everything.
 */
export function audiencesForRole(role: UserRole): ContentAudience[] {
  if (role === "STARTUP") return ["STARTUP", "BOTH"];
  if (role === "BUSINESS_PARTNER") return ["PARTNER", "BOTH"];
  return ["PARTNER", "STARTUP", "BOTH"];
}

/**
 * Read-only SSOT bundle (Notion replacement): roadmap, published content pages
 * and media assets filtered to the audiences the viewer is allowed to see.
 */
export async function getHubContent(audiences: ContentAudience[]) {
  const [roadmap, pages, media] = await Promise.all([
    prisma.roadmapItem.findMany({
      where: { audience: { in: audiences } },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.contentPage.findMany({
      where: { audience: { in: audiences }, isPublished: true },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    }),
    prisma.mediaAsset.findMany({
      where: { audience: { in: audiences } },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  return { roadmap, pages, media };
}
