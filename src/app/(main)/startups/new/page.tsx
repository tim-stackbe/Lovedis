import type { Metadata } from "next";
import { StartupForm } from "@/components/startups/StartupForm";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { requireScoutModule } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Neues Startup" };

export default async function NewStartupPage() {
  await requireScoutModule();
  const campaigns = await prisma.scoutingCampaign.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  return (
    <>
      <SectionLabel
        number="01"
        label="Entdecken"
        title="Startup zum Universum hinzufügen"
      />
      <StartupForm campaigns={campaigns} />
    </>
  );
}
