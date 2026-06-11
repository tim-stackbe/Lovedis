"use client";

import { useActionState } from "react";
import { addContact } from "@/app/actions/startups";
import { Button } from "@/components/ui/Button";
import { ErrorChip, Field, Input, Textarea } from "@/components/ui/Field";

export function ContactForm({ startupId }: { startupId: string }) {
  const [state, formAction, pending] = useActionState(addContact, undefined);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="startupId" value={startupId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name" htmlFor="contact-name">
          <Input id="contact-name" name="name" placeholder="Jane Doe" required />
        </Field>
        <Field label="Position" htmlFor="contact-position">
          <Input id="contact-position" name="position" placeholder="CEO" />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="E-Mail" htmlFor="contact-email">
          <Input
            id="contact-email"
            name="email"
            type="email"
            placeholder="jane@startup.com"
          />
        </Field>
        <Field label="Telefon" htmlFor="contact-phone">
          <Input id="contact-phone" name="phone" placeholder="+49 …" />
        </Field>
      </div>
      <Field label="Notizen" htmlFor="contact-notes">
        <Textarea
          id="contact-notes"
          name="notes"
          className="min-h-16"
          placeholder="Auf der Slush 2026 kennengelernt…"
        />
      </Field>
      {state?.error && <ErrorChip>{state.error}</ErrorChip>}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Hinzufügen…" : "Kontakt hinzufügen"}
      </Button>
    </form>
  );
}
