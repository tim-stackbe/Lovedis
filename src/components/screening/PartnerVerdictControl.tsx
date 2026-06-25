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
  /**
   * Read-only "Partner-Sicht – Vorschau" for the internal team (ADMIN/MEMBER):
   * shows the partner's verdict + note as static text, no submit. Only a
   * partner submits their own verdict (enforced server-side too).
   */
  readOnly?: boolean;
  /** Optional partner name to attribute the verdict in team preview. */
  partnerName?: string | null;
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
  readOnly = false,
  partnerName,
}: PartnerVerdictControlProps) {
  const action = submitPartnerVerdict.bind(null, { startupId, challengeId });
  const [state, formAction, pending] = useActionState(action, undefined);

  if (readOnly) {
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-xs text-lv-secondary">
          <span>{partnerName ? `${partnerName}:` : "Partner-Verdikt:"}</span>
          <PartnerVerdictBadge value={currentVerdict ?? "PENDING"} />
        </div>
        {currentNote ? (
          <p className="text-sm text-lv-text">{currentNote}</p>
        ) : (
          <p className="text-sm italic text-lv-secondary">
            Keine Notiz hinterlegt.
          </p>
        )}
      </div>
    );
  }

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
