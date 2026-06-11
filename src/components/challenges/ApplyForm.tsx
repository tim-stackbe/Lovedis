"use client";

import { useActionState } from "react";
import { applyToChallenge } from "@/app/actions/challenges";
import { Button } from "@/components/ui/Button";
import {
  ErrorChip,
  Field,
  SuccessChip,
  Textarea,
} from "@/components/ui/Field";

export function ApplyForm({ challengeId }: { challengeId: string }) {
  const [state, formAction, pending] = useActionState(
    applyToChallenge,
    undefined
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="challengeId" value={challengeId} />
      <Field
        label="Your pitch"
        htmlFor="pitch"
        hint="Why is your startup the right fit for this challenge? (min. 30 characters)"
      >
        <Textarea
          id="pitch"
          name="pitch"
          className="min-h-32"
          placeholder="We solve exactly this problem by…"
          required
          minLength={30}
        />
      </Field>
      {state?.error && <ErrorChip>{state.error}</ErrorChip>}
      {state?.success && <SuccessChip>{state.success}</SuccessChip>}
      <Button type="submit" disabled={pending}>
        {pending ? "Submitting…" : "Submit application"}
      </Button>
    </form>
  );
}
