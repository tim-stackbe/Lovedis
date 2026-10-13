import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { OfferingDetail } from "@/components/marketplace/OfferingDetail";
import { requireVentureStoreView } from "@/lib/auth-guards";
import { getOnBehalfStartups } from "@/lib/marketplace-view";
import { prisma } from "@/lib/prisma";
import { programWorkshops } from "@/lib/program-workshops";
import { isTeamRole, isVentureStoreViewOnly } from "@/lib/roles";

export const metadata: Metadata = { title: "Programm" };

export default async function ProgramDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireVentureStoreView();
  const teamMode = isTeamRole(session.user.role);
  const viewOnly = isVentureStoreViewOnly(session.user.role);

  const [program, user, startup, startups] = await Promise.all([
    prisma.program.findUnique({ where: { id } }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true },
    }),
    prisma.startup.findUnique({
      where: { ownerUserId: session.user.id },
      select: { creditAccount: { select: { balance: true } } },
    }),
    teamMode ? getOnBehalfStartups() : Promise.resolve([]),
  ]);

  if (!program || program.status !== "OPEN") notFound();

  return (
    <OfferingDetail
      offeringType="PROGRAM"
      targetId={program.id}
      kicker="Exklusives Programm"
      title={program.title}
      subtitle={program.summary}
      description={program.description}
      tags={program.focusTags}
      creditCost={0}
      balance={startup?.creditAccount?.balance ?? 0}
      defaultName={user?.name ?? ""}
      defaultEmail={user?.email ?? ""}
      contactPerson={program.contactPerson}
      sessionDate={program.sessionDate}
      format={program.format}
      workshops={programWorkshops(program)}
      comingSoon={program.comingSoon}
      teamMode={teamMode}
      viewOnly={viewOnly}
      startups={startups}
    />
  );
}
