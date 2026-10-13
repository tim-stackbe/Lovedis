"use client";

import { useActionState } from "react";
import { saveBatchChallenges } from "@/app/actions/insights";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorChip } from "@/components/ui/Field";
import { useActionFeedback } from "./useActionFeedback";

export function BatchChallengeForm({
  batchId,
  challenges,
  canEdit,
}: {
  batchId: string;
  challenges: { id: string; title: string; partnerName: string | null; linked: boolean }[];
  canEdit: boolean;
}) {
  const [state, formAction, pending] = useActionState(saveBatchChallenges, undefined);
  useActionFeedback(state);

  return (
    <Card className="p-5">
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="batchId" value={batchId} />
        {challenges.length === 0 ? (
          <p className="text-sm text-lv-secondary">Es gibt noch keine Challenges.</p>
        ) : (
          <fieldset disabled={!canEdit || pending} className="grid gap-2 sm:grid-cols-2">
            {challenges.map((c) => (
              <label
                key={c.id}
                className="flex items-start gap-2 rounded-button border border-lv-border px-3 py-2 text-sm hover:bg-lv-surface"
              >
                <input
                  type="checkbox"
                  name="challengeId"
                  value={c.id}
                  defaultChecked={c.linked}
                  className="mt-0.5"
                />
                <span>
                  <span className="font-semibold text-lv-text">{c.title}</span>
                  {c.partnerName && (
                    <span className="block text-xs text-lv-secondary">{c.partnerName}</span>
                  )}
                </span>
              </label>
            ))}
          </fieldset>
        )}

        {state?.error && <ErrorChip>{state.error}</ErrorChip>}

        {canEdit ? (
          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? "Speichern…" : "Zuordnung speichern"}
            </Button>
          </div>
        ) : (
          <p className="text-xs text-lv-secondary">Nur Admins können die Zuordnung ändern.</p>
        )}
      </form>
    </Card>
  );
}
