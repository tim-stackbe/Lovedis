"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cancelBooking } from "@/app/actions/marketplace";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { toast } from "@/stores/useToast";

export function BookingCancelButton({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  const cancel = () => {
    startTransition(async () => {
      const res = await cancelBooking(bookingId);
      setConfirming(false);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      if (res.success) toast.success(res.success);
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => setConfirming(true)}
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-button border border-lv-border px-3 py-1.5 text-xs font-semibold text-lv-secondary transition-colors hover:bg-lv-orange-soft hover:text-lv-orange disabled:opacity-50"
      >
        <X className="h-3.5 w-3.5" />
        Zurückziehen
      </button>

      <ConfirmDialog
        open={confirming}
        title="Anfrage zurückziehen?"
        description="Deine Anfrage wird storniert. Du kannst jederzeit eine neue Anfrage stellen."
        confirmLabel="Zurückziehen"
        tone="danger"
        pending={pending}
        onConfirm={cancel}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}
