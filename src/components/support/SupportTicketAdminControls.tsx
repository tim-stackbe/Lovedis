"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  assignSupportTicket,
  updateSupportTicketStatus,
} from "@/app/actions/support";
import { Field, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import {
  SUPPORT_TICKET_STATUSES,
  SUPPORT_TICKET_STATUS_LABELS,
} from "@/lib/constants";
import type { SupportTicketStatus } from "@/generated/prisma/enums";
import { toast } from "@/stores/useToast";

export function SupportTicketAdminControls({
  ticketId,
  status,
}: {
  ticketId: string;
  status: SupportTicketStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const changeStatus = (next: SupportTicketStatus) => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("ticketId", ticketId);
      fd.set("status", next);
      const res = await updateSupportTicketStatus(undefined, fd);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(res.success ?? "Status aktualisiert.");
      router.refresh();
    });
  };

  const takeOver = () => {
    startTransition(async () => {
      const res = await assignSupportTicket(ticketId);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(res.success ?? "Ticket übernommen.");
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <Field label="Status" htmlFor={`status-${ticketId}`} className="sm:min-w-56">
        <Select
          id={`status-${ticketId}`}
          value={status}
          disabled={pending}
          onChange={(e) => changeStatus(e.target.value as SupportTicketStatus)}
        >
          {SUPPORT_TICKET_STATUSES.map((s) => (
            <option key={s} value={s}>
              {SUPPORT_TICKET_STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
      </Field>

      <div className="flex flex-wrap gap-2">
        {status !== "RESOLVED" && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={pending}
            onClick={takeOver}
          >
            Übernehmen
          </Button>
        )}
        {status !== "RESOLVED" && (
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={() => changeStatus("RESOLVED")}
          >
            Als erledigt markieren
          </Button>
        )}
      </div>
    </div>
  );
}
