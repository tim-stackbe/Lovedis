import { Inbox } from "lucide-react";
import type { Metadata } from "next";
import { SupportTicketList } from "@/components/support/SupportTicketList";
import { BannerStat } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { requireRole } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { ROLE_LABELS } from "@/lib/roles";

export const metadata: Metadata = { title: "Support-Tickets" };

const TICKET_INCLUDE = {
  createdBy: {
    select: { name: true, email: true, role: true, company: true },
  },
  handledBy: { select: { name: true } },
} as const;

export default async function SupportAdminInboxPage() {
  await requireRole(["ADMIN"]);

  const tickets = await prisma.supportTicket.findMany({
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    include: TICKET_INCLUDE,
  });

  const open = tickets.filter((t) => t.status !== "RESOLVED");
  const resolved = tickets.filter((t) => t.status === "RESOLVED");
  const openCount = open.length;
  const waiting = tickets.filter((t) => t.status === "WAITING_ON_USER").length;
  const inProgress = tickets.filter((t) => t.status === "IN_PROGRESS").length;

  return (
    <>
      <HeroBanner
        kicker="Plattform"
        title="Support-Tickets"
        subtitle="Externe Nutzer melden Anliegen — beantworte sie hier als LOVEDIS-Team."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4 sm:max-w-2xl">
          <BannerStat label="Offen gesamt" value={openCount} />
          <BannerStat label="In Bearbeitung" value={inProgress} />
          <BannerStat label="Wartet auf Nutzer" value={waiting} />
          <BannerStat label="Gesamt" value={tickets.length} />
        </div>
      </HeroBanner>

      <section className="space-y-4">
        <SectionLabel number="01" label="Posteingang" title="Offene Tickets" />
        {open.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="Keine offenen Tickets"
            description="Sobald ein Startup, Partner oder Investor ein Support-Ticket erstellt, erscheint es hier."
          />
        ) : (
          <div className="space-y-3">
            {open.map((ticket) => (
              <div key={ticket.id} className="space-y-1">
                <p className="px-1 text-xs text-lv-secondary">
                  {ticket.createdBy.name ?? ticket.createdBy.email}
                  {" · "}
                  {ROLE_LABELS[ticket.createdBy.role]}
                  {ticket.createdBy.company
                    ? ` · ${ticket.createdBy.company}`
                    : ""}
                  {ticket.handledBy
                    ? ` · Bearbeiter: ${ticket.handledBy.name}`
                    : ""}
                </p>
                <SupportTicketList
                  tickets={[ticket]}
                  adminMode
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {resolved.length > 0 && (
        <section className="mt-8 space-y-4">
          <SectionLabel number="02" label="Verlauf" title="Erledigte Tickets" />
          <SupportTicketList tickets={resolved} adminMode />
        </section>
      )}
    </>
  );
}
