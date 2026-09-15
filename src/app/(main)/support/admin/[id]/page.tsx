import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  SupportTicketCategoryBadge,
  SupportTicketStatusBadge,
} from "@/components/shared/badges";
import { SupportReplyComposer } from "@/components/support/SupportReplyComposer";
import { SupportTicketAdminControls } from "@/components/support/SupportTicketAdminControls";
import { SupportTicketThread } from "@/components/support/SupportTicketThread";
import { Card } from "@/components/ui/Card";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { LinkButton } from "@/components/ui/Button";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { requireRole } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { ROLE_LABELS } from "@/lib/roles";
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
  return { title: `Admin · Ticket #${ticket.number}` };
}

export default async function SupportAdminDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["ADMIN"]);
  const { id } = await params;

  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          company: true,
        },
      },
      handledBy: { select: { name: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { name: true } } },
      },
    },
  });

  if (!ticket) {
    notFound();
  }

  const canReply = ticket.status !== "RESOLVED";

  return (
    <>
      <HeroBanner
        kicker={`Ticket #${ticket.number}`}
        title={ticket.subject}
        subtitle={`Erstellt ${formatDate(ticket.createdAt)} · ${ROLE_LABELS[ticket.createdBy.role]}`}
        actions={
          <LinkButton href="/support/admin" variant="white" size="sm">
            Zur Inbox
          </LinkButton>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <SupportTicketCategoryBadge value={ticket.category} />
          <SupportTicketStatusBadge value={ticket.status} />
        </div>
      </HeroBanner>

      <SectionLabel number="01" label="Kontext" title="Nutzer" />
      <Card className="p-5">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-lv-secondary">
              Name
            </dt>
            <dd className="mt-1 font-medium text-lv-text">
              {ticket.createdBy.name ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-lv-secondary">
              E-Mail
            </dt>
            <dd className="mt-1 font-medium text-lv-text">
              {ticket.createdBy.email}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-lv-secondary">
              Rolle
            </dt>
            <dd className="mt-1 font-medium text-lv-text">
              {ROLE_LABELS[ticket.createdBy.role]}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-lv-secondary">
              Unternehmen
            </dt>
            <dd className="mt-1 font-medium text-lv-text">
              {ticket.createdBy.company ?? "—"}
            </dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-lv-secondary">
          <Link
            href={`/users?search=${encodeURIComponent(ticket.createdBy.email)}`}
            className="font-semibold text-lv-blue hover:underline"
          >
            In Nutzerverwaltung ansehen
          </Link>
          {ticket.handledBy && (
            <span className="ml-3">
              Bearbeiter: {ticket.handledBy.name}
            </span>
          )}
        </p>
      </Card>

      <section className="mt-8 space-y-4">
        <SectionLabel number="02" label="Status" title="Bearbeitung" />
        <Card className="p-5">
          <SupportTicketAdminControls
            ticketId={ticket.id}
            status={ticket.status}
          />
        </Card>
      </section>

      <section className="mt-8 space-y-4">
        <SectionLabel number="03" label="Verlauf" title="Konversation" />
        <SupportTicketThread messages={ticket.messages} />
      </section>

      {canReply && (
        <section className="mt-8 space-y-4">
          <SectionLabel
            number="04"
            label="Antwort"
            title="Als LOVEDIS-Team antworten"
          />
          <Card className="p-6">
            <SupportReplyComposer
              ticketId={ticket.id}
              placeholder="Deine Antwort an den Nutzer…"
            />
          </Card>
        </section>
      )}
    </>
  );
}
