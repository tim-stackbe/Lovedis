"use client";

import { Check, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  dismissSuggestion,
  inviteStartupToChallenge,
} from "@/app/actions/matching";

export function SuggestionActions({
  challengeId,
  startupId,
}: {
  challengeId: string;
  startupId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (
    fn: (c: string, s: string) => Promise<{ error?: string; success?: string }>
  ) => {
    setError(null);
    startTransition(async () => {
      const res = await fn(challengeId, startupId);
      if (res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => run(dismissSuggestion)}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-button border border-lv-border px-3 py-1.5 text-xs font-semibold text-lv-secondary transition-colors hover:bg-lv-surface disabled:opacity-50"
        >
          <EyeOff className="h-3.5 w-3.5" />
          Verwerfen
        </button>
        <button
          type="button"
          onClick={() => run(inviteStartupToChallenge)}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-button bg-lv-blue px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-lv-blue-dark disabled:opacity-50"
        >
          <Check className="h-3.5 w-3.5" />
          Einladen
        </button>
      </div>
      {error && <p className="text-xs font-medium text-lv-orange">{error}</p>}
    </div>
  );
}
