import type { Metadata } from "next";
import { OwnProfileForm } from "@/components/startups/OwnProfileForm";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { requireRole } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "My profile" };

export default async function ProfilePage() {
  const session = await requireRole(["STARTUP"]);

  const startup = await prisma.startup.findUnique({
    where: { ownerUserId: session.user.id },
  });

  return (
    <>
      <HeroBanner
        kicker="Self service"
        title="Your startup profile"
        subtitle="This is what partners and the scouting team see. A complete profile is required to apply to challenges."
      />
      <SectionLabel number="01" label="Profile" title="Company details" />
      <OwnProfileForm startup={startup} />
    </>
  );
}
