"use client";

import { useActionState } from "react";
import { createMentor } from "@/app/actions/marketplace";
import { Button } from "@/components/ui/Button";
import {
  ErrorChip,
  Field,
  Input,
  SuccessChip,
  Textarea,
} from "@/components/ui/Field";

export function MentorCreateForm() {
  const [state, action, pending] = useActionState(createMentor, undefined);
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="mentor-name">
          <Input id="mentor-name" name="name" required placeholder="Vor- und Nachname" />
        </Field>
        <Field label="Credits pro Session" htmlFor="mentor-cost">
          <Input id="mentor-cost" name="creditCost" type="number" min={0} step={1} defaultValue={0} required />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Unternehmen" htmlFor="mentor-company">
          <Input id="mentor-company" name="company" placeholder="LOVEDIS-Unternehmenspartner" />
        </Field>
        <Field label="Funktion/Titel" htmlFor="mentor-role">
          <Input id="mentor-role" name="role" placeholder="z. B. CFO" />
        </Field>
      </div>
      <Field label="Expertise (kommagetrennt)" htmlFor="mentor-exp">
        <Input id="mentor-exp" name="expertise" placeholder="Vertrieb, Skalierung, Bau" />
      </Field>
      <Field label="Kurzprofil" htmlFor="mentor-bio">
        <Textarea id="mentor-bio" name="bio" placeholder="Hintergrund & Schwerpunkte der Mentor:in" />
      </Field>
      {state?.error && <ErrorChip>{state.error}</ErrorChip>}
      {state?.success && <SuccessChip>{state.success}</SuccessChip>}
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Speichere…" : "Mentor:in anlegen"}
        </Button>
      </div>
    </form>
  );
}
