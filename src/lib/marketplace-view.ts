import { prisma } from "@/lib/prisma";

export interface OnBehalfStartup {
  id: string;
  name: string;
  balance: number;
}

/**
 * Startups (with their current credit balance) that the internal team can pick
 * when sending a Marktplatz-Anfrage on behalf of a startup. Used by the
 * "Admin-Sicht" preview of the offering detail / booking flow.
 */
export async function getOnBehalfStartups(): Promise<OnBehalfStartup[]> {
  const startups = await prisma.startup.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      creditAccount: { select: { balance: true } },
    },
  });
  return startups.map((s) => ({
    id: s.id,
    name: s.name,
    balance: s.creditAccount?.balance ?? 0,
  }));
}
