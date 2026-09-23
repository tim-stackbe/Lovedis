"use client";

import { useActionState } from "react";
import { createSupportTicket } from "@/app/actions/support";
import { Field, Input, Select, Textarea, ErrorChip, SuccessChip } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { SUPPORT_TICKET_CATEGORIES, SUPPORT_TICKET_CATEGORY_LABELS } from "@/lib/constants";
import type { ActionState } from "@/lib/action-state";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function SupportTicketForm() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ActionState | undefined, FormData>(
    createSupportTicket,
    undefined
  );

  useEffect(() => {
    if (state?.redirectTo) {
      router.push(state.redirectTo);
    }
  }, [state?.redirectTo, router]);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && <ErrorChip>{state.error}</ErrorChip>}
      {state?.success && !state.redirectTo && (
        <SuccessChip>{state.success}</SuccessChip>
      )}

      <Field label="Betreff" htmlFor="subject">
        <Input
          id="subject"
          name="subject"
          required
          maxLength={200}
          placeholder="Kurze Beschreibung deines Anliegens"
        />
      </Field>

      <Field label="Kategorie" htmlFor="category">
        <Select id="category" name="category" required defaultValue="OTHER">
          {SUPPORT_TICKET_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {SUPPORT_TICKET_CATEGORY_LABELS[cat]}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="Nachricht"
        htmlFor="body"
        hint="Beschreibe dein Anliegen so genau wie möglich — das LOVEDIS-Team antwortet dir hier im Ticket."
      >
        <Textarea
          id="body"
          name="body"
          required
          minLength={10}
          maxLength={5000}
          placeholder="Wobei können wir dir helfen?"
        />
      </Field>

      <Button type="submit" disabled={pending}>
        {pending ? "Wird gesendet…" : "Ticket erstellen"}
      </Button>
    </form>
  );
}
