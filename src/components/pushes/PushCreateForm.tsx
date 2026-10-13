"use client";

import { useActionState } from "react";
import { createPush } from "@/app/actions/pushes";
import { Button } from "@/components/ui/Button";
import {
  ErrorChip,
  Field,
  Input,
  Select,
  SuccessChip,
  Textarea,
} from "@/components/ui/Field";

interface Option {
  id: string;
  label: string;
}

export function PushCreateForm({
  partners,
  startups,
}: {
  partners: Option[];
  startups: Option[];
}) {
  const [state, formAction, pending] = useActionState(createPush, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Partner" htmlFor="push-partner">
          <Select id="push-partner" name="partnerId" required defaultValue="">
            <option value="" disabled>
              Partner wählen…
            </option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Startup" htmlFor="push-startup">
          <Select id="push-startup" name="startupId" required defaultValue="">
            <option value="" disabled>
              Startup wählen…
            </option>
            {startups.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Kontext" htmlFor="push-context">
        <Textarea
          id="push-context"
          name="context"
          className="min-h-16"
          placeholder="Warum dieser Push? Was soll der Partner sich ansehen?"
        />
      </Field>
      <Field
        label="Erinnerung in Tagen"
        htmlFor="push-reminder"
        hint="Optional — plant eine automatische Check-in-Erinnerung."
      >
        <Input
          id="push-reminder"
          name="reminderInDays"
          type="number"
          min={0}
          max={365}
          placeholder="z. B. 7"
        />
      </Field>
      {state?.error && <ErrorChip>{state.error}</ErrorChip>}
      {state?.success && <SuccessChip>{state.success}</SuccessChip>}
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Pushen…" : "Startup pushen"}
        </Button>
      </div>
    </form>
  );
}
