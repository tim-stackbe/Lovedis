import type { Metadata } from "next";
import {
  PasswordForm,
  ProfileForm,
} from "@/components/settings/SettingsForms";
import { WeightsEditor } from "@/components/settings/WeightsEditor";
import { Card } from "@/components/ui/Card";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { requireAuth } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { VENTURE_SCOUT_ROLES } from "@/lib/roles";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await requireAuth();
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });
  const isScout = VENTURE_SCOUT_ROLES.includes(session.user.role);

  return (
    <>
      <HeroBanner
        kicker="Account"
        title="Settings"
        subtitle="Your profile, password and personal scoring preferences."
      />

      <section className="space-y-4">
        <SectionLabel number="01" label="Account" title="Profile" />
        <Card className="p-6">
          <ProfileForm
            name={user?.name ?? ""}
            email={user?.email ?? ""}
            company={user?.company ?? ""}
          />
        </Card>
      </section>

      <section className="space-y-4">
        <SectionLabel number="02" label="Security" title="Password" />
        <Card className="p-6">
          <PasswordForm />
        </Card>
      </section>

      {isScout && (
        <section className="space-y-4">
          <SectionLabel
            number="03"
            label="Scoring"
            title="Personal dimension weights"
          />
          <Card className="p-6">
            <WeightsEditor />
          </Card>
        </section>
      )}
    </>
  );
}
