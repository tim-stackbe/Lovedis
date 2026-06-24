"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cancelBooking } from "@/app/actions/marketplace";

export function BookingCancelButton({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const cancel = () => {
    setError(null);
    startTransition(async () => {
      const res = await cancelBooking(bookingId);
      if (res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={cancel}
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-button border border-lv-border px-3 py-1.5 text-xs font-semibold text-lv-secondary transition-colors hover:bg-lv-orange-soft hover:text-lv-orange disabled:opacity-50"
      >
        <X className="h-3.5 w-3.5" />
        Zurückziehen
      </button>
      {error && <p className="text-xs font-medium text-lv-orange">{error}</p>}
    </div>
  );
}
