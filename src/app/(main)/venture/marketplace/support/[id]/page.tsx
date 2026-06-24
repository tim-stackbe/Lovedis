import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { OfferingDetail } from "@/components/marketplace/OfferingDetail";
import { SUPPORT_CATEGORY_LABELS } from "@/lib/constants";
import { requireVentureView } from "@/lib/auth-guards";
import { getOnBehalfStartups } from "@/lib/marketplace-view";
import { prisma } from "@/lib/prisma";
import { isTeamRole } from "@/lib/roles";

export const metadata: Metadata = { title: "Support-Angebot" };

export default async function SupportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireVentureView();
  const teamMode = isTeamRole(session.user.role);

  const [offering, user, startup, startups] = await Promise.all([
    prisma.supportOffering.findUnique({ where: { id } }),
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

  if (!offering || !offering.isActive) notFound();

  const tags = [SUPPORT_CATEGORY_LABELS[offering.category]];
  if (offering.format) tags.push(offering.format);

  return (
    <OfferingDetail
      offeringType="SUPPORT"
      targetId={offering.id}
      kicker="Support-Angebot"
      title={offering.title}
      subtitle={offering.summary}
      description={offering.description}
      tags={tags}
      creditCost={offering.creditCost}
      balance={startup?.creditAccount?.balance ?? 0}
      defaultName={user?.name ?? ""}
      defaultEmail={user?.email ?? ""}
      teamMode={teamMode}
      startups={startups}
    />
  );
}
