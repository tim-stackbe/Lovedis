"use client";

import { Send } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";
import { postStartupUpdate } from "@/app/actions/discovery";
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
import { UPDATE_CATEGORIES, UPDATE_CATEGORY_LABELS } from "@/lib/constants";

export function UpdateComposer() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    postStartupUpdate,
    undefined
  );

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  return (
    <Card className="p-6">
      <form ref={formRef} action={formAction} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <Field label="Titel" htmlFor="title">
            <Input
              id="title"
              name="title"
              required
              maxLength={160}
              placeholder="Series-A-Runde geschlossen"
            />
          </Field>
          <Field label="Kategorie" htmlFor="category">
            <Select
              id="category"
              name="category"
              defaultValue="GENERAL"
              className="sm:w-44"
            >
              {UPDATE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {UPDATE_CATEGORY_LABELS[c]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Was gibt es Neues?" htmlFor="body">
          <Textarea
            id="body"
            name="body"
            required
            placeholder="Teile Meilensteine, Finanzierungen oder Produktnews mit deinen Followern…"
          />
        </Field>
        {state?.error && <ErrorChip>{state.error}</ErrorChip>}
        {state?.success && <SuccessChip>{state.success}</SuccessChip>}
        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>
            <Send className="h-4 w-4" />
            {pending ? "Wird veröffentlicht…" : "Update veröffentlichen"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
