"use client";

import { Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { decideApplication } from "@/app/actions/challenges";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";
import { toast } from "@/stores/useToast";

/**
 * ADMIN-only accept/reject with optional internal DECISION note (Logbuch).
 */
export function ChallengeApplicationDecide({
  applicationId,
}: {
  applicationId: string;
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [pending, startTransition] = useTransition();

  const run = (decision: "ACCEPTED" | "REJECTED") => {
    startTransition(async () => {
      const trimmed = note.trim();
      const res = await decideApplication(
        applicationId,
        decision,
        trimmed || undefined
      );
      if (res.error) {
        toast.error(res.error);
        return;
      }
      setNote("");
      setShowNote(false);
      router.refresh();
    });
  };

  return (
    <div className="mt-4 space-y-3">
      {!showNote ? (
        <button
          type="button"
          onClick={() => setShowNote(true)}
          className="text-xs font-semibold text-lv-blue hover:underline"
        >
          Interne Entscheidungsnotiz (Logbuch, optional)
        </button>
      ) : (
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={5000}
          className="min-h-20 text-sm"
          placeholder="Nur für Admins im Startup-Logbuch. Keine sensiblen Daten (Art. 9 DSGVO)."
          aria-label="Interne Entscheidungsnotiz"
        />
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={() => run("ACCEPTED")}
        >
          <Check className="h-4 w-4" />
          Annehmen
        </Button>
        <Button
          type="button"
          variant="danger"
          size="sm"
          disabled={pending}
          onClick={() => run("REJECTED")}
        >
          <X className="h-4 w-4" />
          Ablehnen
        </Button>
      </div>
    </div>
  );
}
