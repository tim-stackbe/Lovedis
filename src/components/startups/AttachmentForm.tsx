"use client";

import { useActionState } from "react";
import { addAttachment } from "@/app/actions/startups";
import { Button } from "@/components/ui/Button";
import { ErrorChip, Field, Input, Select } from "@/components/ui/Field";

export function AttachmentForm({ startupId }: { startupId: string }) {
  const [state, formAction, pending] = useActionState(addAttachment, undefined);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="startupId" value={startupId} />
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <Field label="Name" htmlFor="attachment-name">
          <Input
            id="attachment-name"
            name="name"
            placeholder="Pitch deck Q2"
            required
          />
        </Field>
        <Field label="URL" htmlFor="attachment-url">
          <Input
            id="attachment-url"
            name="url"
            type="url"
            placeholder="https://…"
            required
          />
        </Field>
        <Field label="Typ" htmlFor="attachment-type">
          <Select id="attachment-type" name="type" defaultValue="LINK">
            <option value="LINK">Link</option>
            <option value="DOCUMENT">Dokument</option>
            <option value="DECK">Deck</option>
            <option value="OTHER">Sonstiges</option>
          </Select>
        </Field>
      </div>
      {state?.error && <ErrorChip>{state.error}</ErrorChip>}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Hinzufügen…" : "Anhang hinzufügen"}
      </Button>
    </form>
  );
}
