import { AppShell } from "@/components/layout/AppShell";
import type { PaletteStartup } from "@/components/layout/CommandPalette";
import { DataSharingNotice } from "@/components/legal/DataSharingNotice";
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

  // One-time DSGVO data-sharing notice: shown until the user acknowledges it.
  // Existing users are backfilled to now() at rollout, so only new users (e.g.
  // invited accounts on their first login) see it.
  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { dataSharingNoticeAckAt: true },
  });
  const showDataSharingNotice = currentUser?.dataSharingNoticeAckAt == null;

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
      {showDataSharingNotice && <DataSharingNotice />}
    </AppShell>
  );
}
