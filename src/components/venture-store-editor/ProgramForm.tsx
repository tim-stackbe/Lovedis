"use client";

import { useRouter } from "next/navigation";
import { startTransition, useActionState, useEffect } from "react";
import { saveProgram } from "@/app/actions/venture-store-editor";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  ErrorChip,
  Field,
  Input,
  Label,
  Select,
  SuccessChip,
  Textarea,
} from "@/components/ui/Field";
import { WorkshopEditor } from "@/components/venture-store-editor/WorkshopEditor";
import type { ProgramModel } from "@/generated/prisma/models";
import { PROGRAM_STATUSES, PROGRAM_STATUS_LABELS } from "@/lib/constants";
import type { WorkshopFormRow } from "@/lib/venture-store-editor";

export function ProgramForm({
  program,
  workshops,
  createdNotice,
}: {
  program?: ProgramModel;
  workshops: WorkshopFormRow[];
  createdNotice?: boolean;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    saveProgram.bind(null, program?.id ?? null),
    undefined
  );

  useEffect(() => {
    if (state?.redirectTo) router.push(state.redirectTo);
  }, [state, router]);

  return (
    <Card className="p-6 sm:p-8">
      <form
        className="space-y-5"
        onSubmit={(e) => {
          // Submitting manually keeps the typed values when validation fails
          // (a form `action` would reset uncontrolled fields).
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          startTransition(() => formAction(data));
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Titel" htmlFor="title">
            <Input
              id="title"
              name="title"
              required
              maxLength={160}
              defaultValue={program?.title}
              placeholder="z. B. Sales, Pricing & Growth"
            />
          </Field>
          <Field
            label="Status"
            htmlFor="status"
            hint="Nur Programme mit Status „Offen“ erscheinen im Venture Store."
          >
            <Select id="status" name="status" defaultValue={program?.status ?? "DRAFT"}>
              {PROGRAM_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {PROGRAM_STATUS_LABELS[s]}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Teaser" htmlFor="summary" hint="Ein Satz für Karte und Kopfbereich.">
          <Input
            id="summary"
            name="summary"
            required
            maxLength={280}
            defaultValue={program?.summary}
          />
        </Field>

        <Field
          label="Beschreibung"
          htmlFor="description"
          hint="Leerzeile zwischen zwei Absätzen; Zeilenumbrüche bleiben erhalten."
        >
          <Textarea
            id="description"
            name="description"
            required
            className="min-h-48"
            defaultValue={program?.description}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Format" htmlFor="format" hint="z. B. 4 Wochen · Online">
            <Input id="format" name="format" maxLength={160} defaultValue={program?.format ?? ""} />
          </Field>
          <Field label="Termin" htmlFor="sessionDate" hint="Freitext, optional.">
            <Input
              id="sessionDate"
              name="sessionDate"
              maxLength={160}
              defaultValue={program?.sessionDate ?? ""}
            />
          </Field>
          <Field label="Kontakt" htmlFor="contactPerson">
            <Input
              id="contactPerson"
              name="contactPerson"
              maxLength={160}
              defaultValue={program?.contactPerson ?? ""}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Fokus-Tags" htmlFor="focusTags" hint="Kommagetrennt, z. B. Sales, Pricing, Growth">
            <Input
              id="focusTags"
              name="focusTags"
              defaultValue={program?.focusTags.join(", ") ?? ""}
            />
          </Field>
          <Field
            label="Fix-Credits bei Anmeldung"
            htmlFor="fixCreditCost"
            hint="Ganze Zahl, 0 = ohne Fix-Kontingent."
          >
            <Input
              id="fixCreditCost"
              name="fixCreditCost"
              type="number"
              min={0}
              step={1}
              required
              defaultValue={program?.fixCreditCost ?? 0}
            />
          </Field>
        </div>

        <label className="flex items-center gap-2 text-sm font-medium text-lv-text">
          <input
            type="checkbox"
            name="comingSoon"
            defaultChecked={program?.comingSoon ?? false}
            className="h-4 w-4 accent-lv-blue"
          />
          „Coming Soon“-Sticker anzeigen (Anmeldung bleibt möglich)
        </label>

        <div>
          <Label>Workshops</Label>
          <WorkshopEditor initial={workshops} />
        </div>

        {createdNotice && !state && <SuccessChip>Programm angelegt.</SuccessChip>}
        {state?.error && <ErrorChip>{state.error}</ErrorChip>}
        {state?.success && !state.redirectTo && <SuccessChip>{state.success}</SuccessChip>}
        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending ? "Speichern…" : program ? "Änderungen speichern" : "Programm anlegen"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
