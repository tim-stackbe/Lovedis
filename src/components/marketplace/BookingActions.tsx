"use client";

import { ArrowRight, Check, CheckCheck, X } from "lucide-react";
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

type Action = "COORDINATE" | "CONFIRM" | "DECLINE" | "COMPLETE" | "CANCEL";

const BTN_BASE =
  "inline-flex items-center gap-1.5 rounded-button px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50";

export function BookingActions({
  bookingId,
  status,
}: {
  bookingId: string;
  status: BookingStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (action: Action) => {
    setError(null);
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
      if (res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex flex-wrap justify-end gap-2">
        {status === "REQUESTED" && (
          <>
            <button
              type="button"
              onClick={() => run("DECLINE")}
              disabled={pending}
              className={`${BTN_BASE} border border-lv-border text-lv-secondary hover:bg-lv-orange-soft hover:text-lv-orange`}
            >
              <X className="h-3.5 w-3.5" />
              Ablehnen
            </button>
            <button
              type="button"
              onClick={() => run("COORDINATE")}
              disabled={pending}
              className={`${BTN_BASE} bg-lv-blue text-white hover:bg-lv-blue-dark`}
            >
              <ArrowRight className="h-3.5 w-3.5" />
              In Koordination nehmen
            </button>
          </>
        )}
        {status === "IN_COORDINATION" && (
          <>
            <button
              type="button"
              onClick={() => run("DECLINE")}
              disabled={pending}
              className={`${BTN_BASE} border border-lv-border text-lv-secondary hover:bg-lv-orange-soft hover:text-lv-orange`}
            >
              <X className="h-3.5 w-3.5" />
              Ablehnen
            </button>
            <button
              type="button"
              onClick={() => run("CONFIRM")}
              disabled={pending}
              className={`${BTN_BASE} bg-lv-blue text-white hover:bg-lv-blue-dark`}
            >
              <Check className="h-3.5 w-3.5" />
              Bestätigen (Credits einlösen)
            </button>
          </>
        )}
        {status === "CONFIRMED" && (
          <>
            <button
              type="button"
              onClick={() => run("CANCEL")}
              disabled={pending}
              className={`${BTN_BASE} border border-lv-border text-lv-secondary hover:bg-lv-orange-soft hover:text-lv-orange`}
            >
              <X className="h-3.5 w-3.5" />
              Stornieren (Rückbuchung)
            </button>
            <button
              type="button"
              onClick={() => run("COMPLETE")}
              disabled={pending}
              className={`${BTN_BASE} bg-lv-mint text-lv-mint-deep hover:bg-lv-mint/70`}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Abschließen
            </button>
          </>
        )}
      </div>
      {error && <p className="text-xs font-medium text-lv-orange">{error}</p>}
    </div>
  );
}
