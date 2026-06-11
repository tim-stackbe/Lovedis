"use client";

import { useActionState } from "react";
import { shareScoring } from "@/app/actions/sharing";
import { Button } from "@/components/ui/Button";
import {
  ErrorChip,
  Field,
  Input,
  Select,
  SuccessChip,
} from "@/components/ui/Field";

export interface ShareOptionEvaluation {
  id: string;
  label: string;
}

export interface ShareOptionRecipient {
  id: string;
  label: string;
}

interface ShareFormProps {
  evaluations: ShareOptionEvaluation[];
  recipients: ShareOptionRecipient[];
}

export function ShareForm({ evaluations, recipients }: ShareFormProps) {
  const [state, formAction, pending] = useActionState(shareScoring, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Bewertung" htmlFor="share-evaluation">
          <Select id="share-evaluation" name="evaluationId" required>
            <option value="">Bewertung auswählen…</option>
            {evaluations.map((e) => (
              <option key={e.id} value={e.id}>
                {e.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Empfänger" htmlFor="share-recipient">
          <Select id="share-recipient" name="recipientId" required>
            <option value="">Partner oder Investor auswählen…</option>
            {recipients.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Nachricht (optional)" htmlFor="share-message">
        <Input
          id="share-message"
          name="message"
          placeholder="Das passt perfekt zu eurer Fertigungs-These…"
        />
      </Field>
      {state?.error && <ErrorChip>{state.error}</ErrorChip>}
      {state?.success && <SuccessChip>{state.success}</SuccessChip>}
      <Button type="submit" disabled={pending}>
        {pending ? "Teilen…" : "Scoring teilen"}
      </Button>
    </form>
  );
}
