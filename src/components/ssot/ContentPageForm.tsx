"use client";

import { useActionState } from "react";
import { createContentPage, updateContentPage } from "@/app/actions/ssot";
import type { ContentPageModel } from "@/generated/prisma/models";
import { Button } from "@/components/ui/Button";
import {
  ErrorChip,
  Field,
  Input,
  Label,
  Select,
  SuccessChip,
  Textarea,
} from "@/components/ui/Field";
import {
  CONTENT_AUDIENCES,
  CONTENT_AUDIENCE_LABELS,
} from "@/lib/constants";

export function ContentPageForm({ page }: { page?: ContentPageModel }) {
  const action = page
    ? updateContentPage.bind(null, page.id)
    : createContentPage;
  const [state, formAction, pending] = useActionState(action, undefined);
  const uid = page?.id ?? "new";

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Titel" htmlFor={`cp-title-${uid}`}>
          <Input
            id={`cp-title-${uid}`}
            name="title"
            defaultValue={page?.title}
            placeholder="So läuft unser Accelerator"
            required
          />
        </Field>
        <Field
          label="Slug"
          htmlFor={`cp-slug-${uid}`}
          hint="z. B. accelerator-ablauf"
        >
          <Input
            id={`cp-slug-${uid}`}
            name="slug"
            defaultValue={page?.slug}
            placeholder="accelerator-ablauf"
            required
          />
        </Field>
      </div>
      <Field
        label="Inhalt (Markdown)"
        htmlFor={`cp-body-${uid}`}
        hint="Unterstützt: # Überschriften, **fett**, - Listen"
      >
        <Textarea
          id={`cp-body-${uid}`}
          name="body"
          defaultValue={page?.body}
          className="min-h-40 font-mono text-xs"
          required
        />
      </Field>
      <div className="grid items-end gap-4 sm:grid-cols-3">
        <Field label="Sichtbarkeit" htmlFor={`cp-aud-${uid}`}>
          <Select
            id={`cp-aud-${uid}`}
            name="audience"
            defaultValue={page?.audience ?? "PARTNER"}
          >
            {CONTENT_AUDIENCES.map((a) => (
              <option key={a} value={a}>
                {CONTENT_AUDIENCE_LABELS[a]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Reihenfolge" htmlFor={`cp-sort-${uid}`}>
          <Input
            id={`cp-sort-${uid}`}
            name="sortOrder"
            type="number"
            defaultValue={page?.sortOrder ?? 0}
          />
        </Field>
        <label className="flex items-center gap-2 pb-2.5">
          <input
            type="checkbox"
            name="isPublished"
            defaultChecked={page?.isPublished ?? false}
            className="h-4 w-4 accent-lv-blue"
          />
          <Label className="mb-0">Veröffentlicht</Label>
        </label>
      </div>
      {state?.error && <ErrorChip>{state.error}</ErrorChip>}
      {state?.success && <SuccessChip>{state.success}</SuccessChip>}
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Speichern…" : page ? "Speichern" : "Seite anlegen"}
        </Button>
      </div>
    </form>
  );
}
