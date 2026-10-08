"use client";

import { useActionState } from "react";
import { replyToSupportTicket } from "@/app/actions/support";
import { Field, Textarea, ErrorChip, SuccessChip } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import type { ActionState } from "@/lib/action-state";

export function SupportReplyComposer({
  ticketId,
  placeholder = "Deine Antwort…",
}: {
  ticketId: string;
  placeholder?: string;
}) {
  const [state, formAction, pending] = useActionState<ActionState | undefined, FormData>(
    replyToSupportTicket,
    undefined
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="ticketId" value={ticketId} />
      {state?.error && <ErrorChip>{state.error}</ErrorChip>}
      {state?.success && <SuccessChip>{state.success}</SuccessChip>}

      <Field label="Antwort" htmlFor={`reply-${ticketId}`}>
        <Textarea
          id={`reply-${ticketId}`}
          name="body"
          required
          maxLength={5000}
          placeholder={placeholder}
        />
      </Field>

      <Button type="submit" disabled={pending}>
        {pending ? "Wird gesendet…" : "Antwort senden"}
      </Button>
    </form>
  );
}
