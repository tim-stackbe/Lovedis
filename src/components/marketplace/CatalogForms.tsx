"use client";

import { useActionState } from "react";
import {
  createMentor,
  createOffering,
  createProgram,
} from "@/app/actions/marketplace";
import { SUPPORT_CATEGORIES, SUPPORT_CATEGORY_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/Button";
import {
  ErrorChip,
  Field,
  Input,
  Select,
  SuccessChip,
  Textarea,
} from "@/components/ui/Field";

export function ProgramCreateForm() {
  const [state, action, pending] = useActionState(createProgram, undefined);
  return (
    <form action={action} className="space-y-4">
      <Field label="Titel" htmlFor="prog-title">
        <Input id="prog-title" name="title" required placeholder="z. B. Sales, Pricing & Growth" />
      </Field>
      <Field label="Teaser" htmlFor="prog-summary">
        <Input id="prog-summary" name="summary" required maxLength={280} placeholder="Ein-Satz-Teaser für die Karte" />
      </Field>
      <Field label="Beschreibung" htmlFor="prog-desc">
        <Textarea id="prog-desc" name="description" required placeholder="Worum geht es im Programm?" />
      </Field>
      <Field label="Fokus-Tags (kommagetrennt)" htmlFor="prog-tags">
        <Input id="prog-tags" name="focusTags" placeholder="Sales, Pricing, Growth" />
      </Field>
      {state?.error && <ErrorChip>{state.error}</ErrorChip>}
      {state?.success && <SuccessChip>{state.success}</SuccessChip>}
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Speichere…" : "Programm anlegen"}
        </Button>
      </div>
    </form>
  );
}

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

export function OfferingCreateForm() {
  const [state, action, pending] = useActionState(createOffering, undefined);
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Titel" htmlFor="off-title">
          <Input id="off-title" name="title" required placeholder="z. B. Cap-Table-Sparring" />
        </Field>
        <Field label="Kategorie" htmlFor="off-cat">
          <Select id="off-cat" name="category" defaultValue="FUNDRAISING">
            {SUPPORT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {SUPPORT_CATEGORY_LABELS[c]}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Format" htmlFor="off-format">
          <Input id="off-format" name="format" placeholder="Workshop · Sparring · 1:1" />
        </Field>
        <Field label="Credits pro Buchung" htmlFor="off-cost">
          <Input id="off-cost" name="creditCost" type="number" min={0} step={1} defaultValue={0} required />
        </Field>
      </div>
      <Field label="Teaser" htmlFor="off-summary">
        <Input id="off-summary" name="summary" required maxLength={280} placeholder="Ein-Satz-Teaser für die Karte" />
      </Field>
      <Field label="Beschreibung" htmlFor="off-desc">
        <Textarea id="off-desc" name="description" required placeholder="Was beinhaltet das Angebot?" />
      </Field>
      {state?.error && <ErrorChip>{state.error}</ErrorChip>}
      {state?.success && <SuccessChip>{state.success}</SuccessChip>}
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Speichere…" : "Angebot anlegen"}
        </Button>
      </div>
    </form>
  );
}
