import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  SupportTicketCategoryBadge,
  SupportTicketStatusBadge,
} from "@/components/shared/badges";
import { SupportReplyComposer } from "@/components/support/SupportReplyComposer";
import { SupportTicketThread } from "@/components/support/SupportTicketThread";
import { Card } from "@/components/ui/Card";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { LinkButton } from "@/components/ui/Button";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { requireSupportCreator } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    select: { number: true, subject: true },
  });
  if (!ticket) return { title: "Support-Ticket" };
  return { title: `Ticket #${ticket.number}` };
}

export default async function SupportTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSupportCreator();
  const { id } = await params;

  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { name: true } } },
      },
    },
  });

  if (!ticket || ticket.createdById !== session.user.id) {
    notFound();
  }

  const canReply = ticket.status !== "RESOLVED";

  return (
    <>
      <HeroBanner
        kicker={`Ticket #${ticket.number}`}
        title={ticket.subject}
        subtitle={`Erstellt ${formatDate(ticket.createdAt)} · Support vom LOVEDIS-Team`}
        actions={
          <LinkButton href="/support" variant="white" size="sm">
            Alle Tickets
          </LinkButton>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <SupportTicketCategoryBadge value={ticket.category} />
          <SupportTicketStatusBadge value={ticket.status} />
        </div>
      </HeroBanner>

      <SectionLabel number="01" label="Verlauf" title="Konversation" />
      <SupportTicketThread messages={ticket.messages} />

      {canReply ? (
        <section className="mt-8 space-y-4">
          <SectionLabel number="02" label="Antwort" title="Nachricht senden" />
          <Card className="p-6">
            <SupportReplyComposer ticketId={ticket.id} />
          </Card>
        </section>
      ) : (
        <Card className="mt-8 p-5 text-sm text-lv-secondary">
          Dieses Ticket ist erledigt. Bei weiteren Fragen kannst du ein{" "}
          <Link href="/support/new" className="font-semibold text-lv-blue hover:underline">
            neues Ticket
          </Link>{" "}
          erstellen.
        </Card>
      )}
    </>
  );
}
