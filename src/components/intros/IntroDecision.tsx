"use client";

import { Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { handleIntroRequest } from "@/app/actions/discovery";
import { toast } from "@/stores/useToast";

export function IntroDecision({ introId }: { introId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const decide = (decision: "APPROVE" | "DECLINE") => {
    startTransition(async () => {
      const res = await handleIntroRequest(introId, decision);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      if (res.success) toast.success(res.success);
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => decide("DECLINE")}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-button border border-lv-border px-3 py-1.5 text-xs font-semibold text-lv-secondary transition-colors hover:bg-lv-orange-soft hover:text-lv-orange disabled:opacity-50"
        >
          <X className="h-3.5 w-3.5" />
          Ablehnen
        </button>
        <button
          type="button"
          onClick={() => decide("APPROVE")}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-button bg-lv-blue px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-lv-blue-dark disabled:opacity-50"
        >
          <Check className="h-3.5 w-3.5" />
          Verbinden
        </button>
      </div>
    </div>
  );
}
