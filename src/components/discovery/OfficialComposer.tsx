"use client";

import { BadgeCheck, Megaphone } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";
import { postOfficialUpdate } from "@/app/actions/discovery";
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

/**
 * Team-only composer for official Lovedis broadcasts. Posts created here carry
 * `isOfficial=true` and appear in EVERY user's feed regardless of follows
 * (e.g. announcements about new programs). Guarded server-side by requireTeam().
 */
export function OfficialComposer() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    postOfficialUpdate,
    undefined
  );

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-start gap-3 rounded-card border border-lv-blue-soft bg-lv-blue-soft/50 p-3">
        <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-lv-blue" />
        <p className="text-xs text-lv-secondary">
          Offizielle Beiträge des Lovedis-Teams erscheinen im Feed{" "}
          <span className="font-semibold text-lv-text">aller Accounts</span> —
          unabhängig davon, wem jemand folgt. Ideal für Ankündigungen zu neuen
          Programmen.
        </p>
      </div>
      <form ref={formRef} action={formAction} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <Field label="Titel" htmlFor="official-title">
            <Input
              id="official-title"
              name="title"
              required
              maxLength={160}
              placeholder="Neues Programm: Sales, Pricing & Growth startet"
            />
          </Field>
          <Field label="Kategorie" htmlFor="official-category">
            <Select
              id="official-category"
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
        <Field label="Ankündigung" htmlFor="official-body">
          <Textarea
            id="official-body"
            name="body"
            required
            placeholder="Was möchtest du der gesamten Plattform mitteilen?"
          />
        </Field>
        {state?.error && <ErrorChip>{state.error}</ErrorChip>}
        {state?.success && <SuccessChip>{state.success}</SuccessChip>}
        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>
            <Megaphone className="h-4 w-4" />
            {pending ? "Wird gesendet…" : "An alle senden"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
