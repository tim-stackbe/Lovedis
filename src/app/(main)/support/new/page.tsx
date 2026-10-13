import type { Metadata } from "next";
import { SupportTicketForm } from "@/components/support/SupportTicketForm";
import { Card } from "@/components/ui/Card";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { LinkButton } from "@/components/ui/Button";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { requireSupportCreator } from "@/lib/auth-guards";

export const metadata: Metadata = { title: "Neues Support-Ticket" };

export default async function NewSupportTicketPage() {
  await requireSupportCreator();

  return (
    <>
      <HeroBanner
        kicker="Hilfe"
        title="Neues Support-Ticket"
        subtitle="Beschreibe dein Anliegen — das LOVEDIS-Team meldet sich per Ticket bei dir."
        actions={
          <LinkButton href="/support" variant="white" size="sm">
            Zurück zur Übersicht
          </LinkButton>
        }
      />

      <SectionLabel number="01" label="Anliegen" title="Ticket erstellen" />
      <Card className="p-6">
        <SupportTicketForm />
      </Card>
    </>
  );
}
