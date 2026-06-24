"use client";

import { Check, X } from "lucide-react";
import { useActionState } from "react";
import { submitPartnerVerdict } from "@/app/actions/screening";
import type { PartnerVerdict } from "@/generated/prisma/enums";
import { PartnerVerdictBadge } from "@/components/shared/badges";
import { Button } from "@/components/ui/Button";
import { ErrorChip, SuccessChip, Textarea } from "@/components/ui/Field";

interface PartnerVerdictControlProps {
  startupId: string;
  challengeId?: string | null;
  currentVerdict?: PartnerVerdict;
  currentNote?: string | null;
}

/**
 * Curated, low-overload verdict control for partners: an optional short note
 * plus two clear actions — "Weitermachen" or "Nicht weiter". No internal
 * scores, pipeline or notes are exposed here.
 */
export function PartnerVerdictControl({
  startupId,
  challengeId = null,
  currentVerdict,
  currentNote,
}: PartnerVerdictControlProps) {
  const action = submitPartnerVerdict.bind(null, { startupId, challengeId });
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="space-y-3">
      {currentVerdict && currentVerdict !== "PENDING" && (
        <div className="flex items-center gap-2 text-xs text-lv-secondary">
          <span>Dein Verdikt:</span>
          <PartnerVerdictBadge value={currentVerdict} />
        </div>
      )}
      <Textarea
        name="note"
        defaultValue={currentNote ?? ""}
        className="min-h-16 text-sm"
        placeholder="Kurze Einordnung (optional)…"
      />
      {state?.error && <ErrorChip>{state.error}</ErrorChip>}
      {state?.success && <SuccessChip>{state.success}</SuccessChip>}
      <div className="flex gap-2">
        <Button
          type="submit"
          name="verdict"
          value="CONTINUE"
          size="sm"
          disabled={pending}
          className="flex-1"
        >
          <Check className="h-4 w-4" />
          Weitermachen
        </Button>
        <Button
          type="submit"
          name="verdict"
          value="PASS"
          variant="danger"
          size="sm"
          disabled={pending}
          className="flex-1"
        >
          <X className="h-4 w-4" />
          Nicht weiter
        </Button>
      </div>
    </form>
  );
}
