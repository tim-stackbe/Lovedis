import { AppShell } from "@/components/layout/AppShell";
import type { PaletteStartup } from "@/components/layout/CommandPalette";
import { requireApprovedAccess } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { VENTURE_SCOUT_ROLES } from "@/lib/roles";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireApprovedAccess();
  const role = session.user.role;

  let startups: PaletteStartup[] = [];
  if (VENTURE_SCOUT_ROLES.includes(role)) {
    startups = await prisma.startup.findMany({
      select: { id: true, name: true, industry: true },
      orderBy: { name: "asc" },
      take: 100,
    });
  }

  return (
    <AppShell
      userName={session.user.name ?? "Nutzer"}
      role={role}
      startups={startups}
    >
      {children}
    </AppShell>
  );
}
