import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { OfferingDetail } from "@/components/marketplace/OfferingDetail";
import { SUPPORT_CATEGORY_LABELS } from "@/lib/constants";
import { requireStartup } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Support-Angebot" };

export default async function SupportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireStartup();

  const [offering, user, startup] = await Promise.all([
    prisma.supportOffering.findUnique({ where: { id } }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true },
    }),
    prisma.startup.findUnique({
      where: { ownerUserId: session.user.id },
      select: { creditAccount: { select: { balance: true } } },
    }),
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
    />
  );
}
