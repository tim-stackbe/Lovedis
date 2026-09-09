"use client";

import {
  ArrowRightIcon,
  CheckCheckIcon,
  CheckIcon,
  CloseIcon,
} from "@/components/icons/lovedis";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { BookingStatus } from "@/generated/prisma/enums";
import {
  cancelBooking,
  completeBooking,
  confirmBooking,
  declineBooking,
  takeBookingIntoCoordination,
} from "@/app/actions/marketplace";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { toast } from "@/stores/useToast";

type Action = "COORDINATE" | "CONFIRM" | "DECLINE" | "COMPLETE" | "CANCEL";

const BTN_BASE =
  "inline-flex items-center gap-1.5 rounded-button px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50";

/** Actions that spend/refund credits or reject a request need a confirm step. */
const CONFIRMS: Partial<
  Record<
    Action,
    {
      title: string;
      description: string;
      confirmLabel: string;
      tone: "primary" | "danger";
    }
  >
> = {
  CONFIRM: {
    title: "Buchung bestätigen?",
    description:
      "Mit der Bestätigung werden die Venture Credits des Startups eingelöst. Dieser Schritt löst eine Buchung im Credit-Ledger aus.",
    confirmLabel: "Bestätigen",
    tone: "primary",
  },
  DECLINE: {
    title: "Anfrage ablehnen?",
    description:
      "Die Anfrage wird abgelehnt und das Startup entsprechend informiert.",
    confirmLabel: "Ablehnen",
    tone: "danger",
  },
  CANCEL: {
    title: "Buchung stornieren?",
    description:
      "Bei einer bereits bestätigten Buchung werden die eingelösten Credits zurückgebucht.",
    confirmLabel: "Stornieren",
    tone: "danger",
  },
};

export function BookingActions({
  bookingId,
  status,
}: {
  bookingId: string;
  status: BookingStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState<Action | null>(null);

  const run = (action: Action) => {
    startTransition(async () => {
      const res =
        action === "COORDINATE"
          ? await takeBookingIntoCoordination(bookingId)
          : action === "CONFIRM"
            ? await confirmBooking(bookingId)
            : action === "DECLINE"
              ? await declineBooking(bookingId)
              : action === "COMPLETE"
                ? await completeBooking(bookingId)
                : await cancelBooking(bookingId);
      setConfirming(null);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      if (res.success) toast.success(res.success);
      router.refresh();
    });
  };

  /** Gate consequential actions behind the confirm dialog; run others directly. */
  const trigger = (action: Action) => {
    if (CONFIRMS[action]) {
      setConfirming(action);
    } else {
      run(action);
    }
  };

  const confirmConfig = confirming ? CONFIRMS[confirming] : null;

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex flex-wrap justify-end gap-2">
        {status === "REQUESTED" && (
          <>
            <button
              type="button"
              onClick={() => trigger("DECLINE")}
              disabled={pending}
              className={`${BTN_BASE} border border-lv-border text-lv-secondary hover:bg-lv-orange-soft hover:text-lv-orange`}
            >
              <CloseIcon className="h-3.5 w-3.5" />
              Ablehnen
            </button>
            <button
              type="button"
              onClick={() => trigger("COORDINATE")}
              disabled={pending}
              className={`${BTN_BASE} bg-lv-blue text-white hover:bg-lv-blue-dark`}
            >
              <ArrowRightIcon className="h-3.5 w-3.5" />
              In Koordination nehmen
            </button>
          </>
        )}
        {status === "IN_COORDINATION" && (
          <>
            <button
              type="button"
              onClick={() => trigger("DECLINE")}
              disabled={pending}
              className={`${BTN_BASE} border border-lv-border text-lv-secondary hover:bg-lv-orange-soft hover:text-lv-orange`}
            >
              <CloseIcon className="h-3.5 w-3.5" />
              Ablehnen
            </button>
            <button
              type="button"
              onClick={() => trigger("CONFIRM")}
              disabled={pending}
              className={`${BTN_BASE} bg-lv-blue text-white hover:bg-lv-blue-dark`}
            >
              <CheckIcon className="h-3.5 w-3.5" />
              Bestätigen (Credits einlösen)
            </button>
          </>
        )}
        {status === "CONFIRMED" && (
          <>
            <button
              type="button"
              onClick={() => trigger("CANCEL")}
              disabled={pending}
              className={`${BTN_BASE} border border-lv-border text-lv-secondary hover:bg-lv-orange-soft hover:text-lv-orange`}
            >
              <CloseIcon className="h-3.5 w-3.5" />
              Stornieren (Rückbuchung)
            </button>
            <button
              type="button"
              onClick={() => trigger("COMPLETE")}
              disabled={pending}
              className={`${BTN_BASE} bg-lv-mint text-lv-mint-deep hover:bg-lv-mint/70`}
            >
              <CheckCheckIcon className="h-3.5 w-3.5" />
              Abschließen
            </button>
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirming !== null}
        title={confirmConfig?.title ?? ""}
        description={confirmConfig?.description}
        confirmLabel={confirmConfig?.confirmLabel}
        tone={confirmConfig?.tone}
        pending={pending}
        onConfirm={() => confirming && run(confirming)}
        onCancel={() => setConfirming(null)}
      />
    </div>
  );
}
