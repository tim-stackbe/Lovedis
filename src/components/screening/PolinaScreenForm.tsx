"use client";

import { useActionState } from "react";
import { savePolinaScreen } from "@/app/actions/screening";
import type { Recommendation } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/Button";
import {
  ErrorChip,
  Field,
  Select,
  SuccessChip,
  Textarea,
} from "@/components/ui/Field";
import { RECOMMENDATION_LABELS, RECOMMENDATION_ORDER } from "@/lib/constants";

interface PolinaScreenFormProps {
  startupId: string;
  summary?: string | null;
  recommendation?: Recommendation | null;
}

/**
 * Team-side capture of Polina's lightweight "Erst-Einordnung": a short
 * summary plus an Ampel/recommendation. Kept separate from the deep scoring.
 */
export function PolinaScreenForm({
  startupId,
  summary,
  recommendation,
}: PolinaScreenFormProps) {
  const [state, formAction, pending] = useActionState(
    savePolinaScreen,
    undefined
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="startupId" value={startupId} />
      <Field label="Einordnung (1–2 Sätze)" htmlFor="screen-summary">
        <Textarea
          id="screen-summary"
          name="summary"
          defaultValue={summary ?? ""}
          className="min-h-20"
          placeholder="Kurze Einordnung für Partner — was ist spannend, wo liegt der Fit?"
        />
      </Field>
      <Field label="Empfehlung" htmlFor="screen-recommendation">
        <Select
          id="screen-recommendation"
          name="recommendation"
          defaultValue={recommendation ?? ""}
        >
          <option value="">— keine —</option>
          {RECOMMENDATION_ORDER.map((r) => (
            <option key={r} value={r}>
              {RECOMMENDATION_LABELS[r]}
            </option>
          ))}
        </Select>
      </Field>
      {state?.error && <ErrorChip>{state.error}</ErrorChip>}
      {state?.success && <SuccessChip>{state.success}</SuccessChip>}
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Speichern…" : "Einordnung speichern"}
        </Button>
      </div>
    </form>
  );
}
