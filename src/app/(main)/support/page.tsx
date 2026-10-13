import { HelpIcon } from "@/components/icons/lovedis";
import type { Metadata } from "next";
import { SupportTicketList } from "@/components/support/SupportTicketList";
import { BannerStat } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { LinkButton } from "@/components/ui/Button";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { requireSupportCreator } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Support" };

export default async function SupportPage() {
  const session = await requireSupportCreator();

  const tickets = await prisma.supportTicket.findMany({
    where: { createdById: session.user.id },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      number: true,
      subject: true,
      category: true,
      status: true,
      updatedAt: true,
    },
  });

  const open = tickets.filter((t) => t.status !== "RESOLVED").length;
  const resolved = tickets.filter((t) => t.status === "RESOLVED").length;

  return (
    <>
      <HeroBanner
        kicker="Hilfe"
        title="Support"
        subtitle="Melde Anliegen an das LOVEDIS-Team — wir antworten dir direkt hier im Ticket."
        actions={
          <LinkButton href="/support/new" variant="white" size="sm">
            Neues Ticket
          </LinkButton>
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:max-w-md">
          <BannerStat label="Offen" value={open} />
          <BannerStat label="Erledigt" value={resolved} />
          <BannerStat label="Gesamt" value={tickets.length} />
        </div>
      </HeroBanner>

      <SectionLabel number="01" label="Tickets" title="Meine Support-Tickets" />

      {tickets.length === 0 ? (
        <EmptyState
          icon={HelpIcon}
          title="Noch keine Tickets"
          description="Du hast noch kein Support-Ticket erstellt. Bei Fragen zu Konto, Plattform oder Marktplatz helfen wir dir gerne weiter."
          action={
            <LinkButton href="/support/new" variant="primary" size="sm">
              Ticket erstellen
            </LinkButton>
          }
        />
      ) : (
        <>
          {open > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-lv-secondary">
                Offen ({open})
              </h3>
              <SupportTicketList
                tickets={tickets.filter((t) => t.status !== "RESOLVED")}
              />
            </div>
          )}
          {resolved > 0 && (
            <div className="mt-8 space-y-4">
              <h3 className="text-sm font-semibold text-lv-secondary">
                Erledigt ({resolved})
              </h3>
              <SupportTicketList
                tickets={tickets.filter((t) => t.status === "RESOLVED")}
              />
            </div>
          )}
        </>
      )}
    </>
  );
}
