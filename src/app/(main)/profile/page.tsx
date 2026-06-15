import type { Metadata } from "next";
import { OwnProfileForm } from "@/components/startups/OwnProfileForm";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { requireRole } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Mein Profil" };

export default async function ProfilePage() {
  const session = await requireRole(["STARTUP"]);

  const startup = await prisma.startup.findUnique({
    where: { ownerUserId: session.user.id },
  });

  return (
    <>
      <HeroBanner
        kicker="Self-Service"
        title="Dein Startup-Profil"
        subtitle="Das sehen Partner und das Scouting-Team. Ein vollständiges Profil ist Voraussetzung, um dich auf Challenges zu bewerben."
      />
      <SectionLabel number="01" label="Profil" title="Unternehmensdaten" />
      <OwnProfileForm startup={startup} />
    </>
  );
}
