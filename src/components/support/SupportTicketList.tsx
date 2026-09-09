import Link from "next/link";
import {
  SupportTicketCategoryBadge,
  SupportTicketStatusBadge,
} from "@/components/shared/badges";
import { Card } from "@/components/ui/Card";
import { formatDate } from "@/lib/utils";
import type {
  SupportTicketCategory,
  SupportTicketStatus,
} from "@/generated/prisma/enums";

export type SupportTicketListItem = {
  id: string;
  number: number;
  subject: string;
  category: SupportTicketCategory;
  status: SupportTicketStatus;
  updatedAt: Date;
};

export function SupportTicketList({
  tickets,
  adminMode = false,
}: {
  tickets: SupportTicketListItem[];
  adminMode?: boolean;
}) {
  return (
    <div className="space-y-3">
      {tickets.map((ticket) => (
        <Link
          key={ticket.id}
          href={
            adminMode
              ? `/support/admin/${ticket.id}`
              : `/support/${ticket.id}`
          }
          className="block transition-transform hover:-translate-y-0.5"
        >
          <Card className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-lv-secondary">
                    #{ticket.number}
                  </span>
                  <SupportTicketCategoryBadge value={ticket.category} />
                  <SupportTicketStatusBadge value={ticket.status} />
                </div>
                <p className="mt-2 font-semibold text-lv-text">
                  {ticket.subject}
                </p>
                <p className="mt-1 text-xs text-lv-secondary">
                  Aktualisiert {formatDate(ticket.updatedAt)}
                </p>
              </div>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}
