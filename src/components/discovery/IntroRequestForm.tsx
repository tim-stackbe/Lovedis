"use client";

import { Handshake } from "lucide-react";
import { useActionState } from "react";
import { requestIntro } from "@/app/actions/discovery";
import { Button } from "@/components/ui/Button";
import { ErrorChip, Field, SuccessChip, Textarea } from "@/components/ui/Field";

export function IntroRequestForm({ startupId }: { startupId: string }) {
  const action = requestIntro.bind(null, startupId);
  const [state, formAction, pending] = useActionState(action, undefined);

  if (state?.success) {
    return <SuccessChip>{state.success}</SuccessChip>;
  }

  return (
    <form action={formAction} className="space-y-3">
      <Field
        label="Warum interessierst du dich?"
        htmlFor="message"
        hint="Das Lovedis-Team prüft deine Anfrage und stellt bei Eignung den Kontakt her."
      >
        <Textarea
          id="message"
          name="message"
          placeholder="Kurz zu eurer These, Ticketgröße und warum dieses Startup passt…"
          required
        />
      </Field>
      {state?.error && <ErrorChip>{state.error}</ErrorChip>}
      <Button type="submit" disabled={pending} className="w-full">
        <Handshake className="h-4 w-4" />
        {pending ? "Wird gesendet…" : "Intro anfragen"}
      </Button>
    </form>
  );
}
