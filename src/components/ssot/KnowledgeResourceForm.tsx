"use client";

import { useActionState } from "react";
import { createKnowledgeResource } from "@/app/actions/ssot";
import { Button } from "@/components/ui/Button";
import {
  ErrorChip,
  Field,
  Input,
  Select,
  SuccessChip,
  Textarea,
} from "@/components/ui/Field";
import {
  CONTENT_AUDIENCES,
  CONTENT_AUDIENCE_LABELS,
  KNOWLEDGE_RESOURCE_TYPES,
  KNOWLEDGE_RESOURCE_TYPE_LABELS,
} from "@/lib/constants";

export function KnowledgeResourceForm() {
  const [state, formAction, pending] = useActionState(
    createKnowledgeResource,
    undefined
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Titel" htmlFor="kr-title">
          <Input
            id="kr-title"
            name="title"
            placeholder="Zero to One — Peter Thiel"
            required
          />
        </Field>
        <Field label="Autor / Quelle (optional)" htmlFor="kr-author">
          <Input id="kr-author" name="author" placeholder="Peter Thiel" />
        </Field>
      </div>
      <Field label="Link (optional)" htmlFor="kr-url">
        <Input id="kr-url" name="url" type="url" placeholder="https://…" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Typ" htmlFor="kr-type">
          <Select id="kr-type" name="type" defaultValue="ARTICLE">
            {KNOWLEDGE_RESOURCE_TYPES.map((t) => (
              <option key={t} value={t}>
                {KNOWLEDGE_RESOURCE_TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Sichtbarkeit" htmlFor="kr-aud">
          <Select id="kr-aud" name="audience" defaultValue="BOTH">
            {CONTENT_AUDIENCES.map((a) => (
              <option key={a} value={a}>
                {CONTENT_AUDIENCE_LABELS[a]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Reihenfolge" htmlFor="kr-sort">
          <Input id="kr-sort" name="sortOrder" type="number" defaultValue={0} />
        </Field>
      </div>
      <Field label="Warum empfehlenswert? (optional)" htmlFor="kr-note">
        <Textarea id="kr-note" name="note" className="min-h-16" />
      </Field>
      {state?.error && <ErrorChip>{state.error}</ErrorChip>}
      {state?.success && <SuccessChip>{state.success}</SuccessChip>}
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Hinzufügen…" : "Empfehlung hinzufügen"}
        </Button>
      </div>
    </form>
  );
}
