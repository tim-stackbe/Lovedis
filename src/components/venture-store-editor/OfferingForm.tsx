"use client";

import { useRouter } from "next/navigation";
import { startTransition, useActionState, useEffect } from "react";
import { saveOffering } from "@/app/actions/venture-store-editor";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  ErrorChip,
  Field,
  Input,
  Select,
  SuccessChip,
  Textarea,
} from "@/components/ui/Field";
import type { SupportOfferingModel } from "@/generated/prisma/models";
import { SUPPORT_CATEGORIES, SUPPORT_CATEGORY_LABELS } from "@/lib/constants";

export function OfferingForm({
  offering,
  createdNotice,
}: {
  offering?: SupportOfferingModel;
  createdNotice?: boolean;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    saveOffering.bind(null, offering?.id ?? null),
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
              defaultValue={offering?.title}
              placeholder="z. B. Pitch Deck Review"
            />
          </Field>
          <Field label="Kategorie" htmlFor="category">
            <Select
              id="category"
              name="category"
              defaultValue={offering?.category ?? "FUNDRAISING"}
            >
              {SUPPORT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {SUPPORT_CATEGORY_LABELS[c]}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field
          label="Teaser"
          htmlFor="summary"
          hint="Ein Satz für Karte und Kopfbereich der Detailseite."
        >
          <Input
            id="summary"
            name="summary"
            required
            maxLength={280}
            defaultValue={offering?.summary}
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
            defaultValue={offering?.description}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Format" htmlFor="format" hint="z. B. 1:1 Online Workshop (~2h)">
            <Input id="format" name="format" maxLength={120} defaultValue={offering?.format ?? ""} />
          </Field>
          <Field label="Credits pro Buchung" htmlFor="creditCost" hint="Ganze Zahl, 0 oder mehr.">
            <Input
              id="creditCost"
              name="creditCost"
              type="number"
              min={0}
              step={1}
              required
              defaultValue={offering?.creditCost ?? 0}
            />
          </Field>
          <Field label="Termin" htmlFor="sessionDate" hint="Freitext, optional.">
            <Input
              id="sessionDate"
              name="sessionDate"
              maxLength={160}
              defaultValue={offering?.sessionDate ?? ""}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Anbieter" htmlFor="providerCompany">
            <Input
              id="providerCompany"
              name="providerCompany"
              maxLength={160}
              defaultValue={offering?.providerCompany ?? ""}
            />
          </Field>
          <Field label="Kontakt" htmlFor="contactPerson" hint="Mehrere Personen mit Komma trennen.">
            <Input
              id="contactPerson"
              name="contactPerson"
              maxLength={160}
              defaultValue={offering?.contactPerson ?? ""}
            />
          </Field>
          <Field label="Website" htmlFor="website">
            <Input
              id="website"
              name="website"
              type="url"
              maxLength={300}
              placeholder="https://"
              defaultValue={offering?.website ?? ""}
            />
          </Field>
        </div>

        <label className="flex items-center gap-2 text-sm font-medium text-lv-text">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={offering?.isActive ?? true}
            className="h-4 w-4 accent-lv-blue"
          />
          Im Venture Store sichtbar
        </label>

        {createdNotice && !state && <SuccessChip>Support-Angebot angelegt.</SuccessChip>}
        {state?.error && <ErrorChip>{state.error}</ErrorChip>}
        {state?.success && !state.redirectTo && <SuccessChip>{state.success}</SuccessChip>}
        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending ? "Speichern…" : offering ? "Änderungen speichern" : "Angebot anlegen"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
