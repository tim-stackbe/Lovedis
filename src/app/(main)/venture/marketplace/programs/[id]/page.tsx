import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { OfferingDetail } from "@/components/marketplace/OfferingDetail";
import { requireStartup } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Programm" };

export default async function ProgramDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireStartup();

  const [program, user, startup] = await Promise.all([
    prisma.program.findUnique({ where: { id } }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true },
    }),
    prisma.startup.findUnique({
      where: { ownerUserId: session.user.id },
      select: { creditAccount: { select: { balance: true } } },
    }),
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
    />
  );
}
