import type { Metadata } from "next";
import { ChallengeForm } from "@/components/challenges/ChallengeForm";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { requireTeam } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Neue Challenge" };

export default async function NewChallengePage() {
  await requireTeam();
  const partners = await prisma.user.findMany({
    where: { role: "BUSINESS_PARTNER" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, company: true },
  });
  return (
    <>
      <SectionLabel
        number="01"
        label="Challenges"
        title="Neue Challenge veröffentlichen"
      />
      <ChallengeForm partners={partners} />
    </>
  );
}
