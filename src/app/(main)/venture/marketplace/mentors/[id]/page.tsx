import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { OfferingDetail } from "@/components/marketplace/OfferingDetail";
import { requireVentureView } from "@/lib/auth-guards";
import { getOnBehalfStartups } from "@/lib/marketplace-view";
import { prisma } from "@/lib/prisma";
import { isTeamRole } from "@/lib/roles";

export const metadata: Metadata = { title: "Mentor:in" };

export default async function MentorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireVentureView();
  const teamMode = isTeamRole(session.user.role);

  const [mentor, user, startup, startups] = await Promise.all([
    prisma.mentorProfile.findUnique({ where: { id } }),
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

  if (!mentor || !mentor.isActive) notFound();

  return (
    <OfferingDetail
      offeringType="MENTOR_SESSION"
      targetId={mentor.id}
      kicker="Mentor:innen-Netzwerk"
      title={mentor.name}
      subtitle={[mentor.role, mentor.company].filter(Boolean).join(" · ") || undefined}
      description={mentor.bio ?? "Einzel-Session für ehrliches Feedback und neue Perspektiven."}
      tags={mentor.expertise}
      creditCost={mentor.creditCost}
      balance={startup?.creditAccount?.balance ?? 0}
      defaultName={user?.name ?? ""}
      defaultEmail={user?.email ?? ""}
      providerCompany={mentor.company}
      website={mentor.website}
      teamMode={teamMode}
      startups={startups}
    />
  );
}
