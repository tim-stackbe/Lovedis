"use client";

import { useActionState } from "react";
import { createEngagement } from "@/app/actions/engagements";
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
import {
  ENGAGEMENT_STATUSES,
  ENGAGEMENT_STATUS_LABELS,
} from "@/lib/constants";

interface Option {
  id: string;
  label: string;
}

export function EngagementCreateForm({
  partners,
  startups,
}: {
  partners: Option[];
  startups: Option[];
}) {
  const [state, formAction, pending] = useActionState(
    createEngagement,
    undefined
  );

  return (
    <Card className="p-6 sm:p-8">
      <form action={formAction} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Partner" htmlFor="partnerId">
            <Select id="partnerId" name="partnerId" required defaultValue="">
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
          <Field label="Startup" htmlFor="startupId">
            <Select id="startupId" name="startupId" required defaultValue="">
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
        <Field label="Titel" htmlFor="title">
          <Input
            id="title"
            name="title"
            placeholder="Zusammenarbeit — Startup × Partner (Thema)"
            required
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Status" htmlFor="status">
            <Select id="status" name="status" defaultValue="ACTIVE">
              {ENGAGEMENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {ENGAGEMENT_STATUS_LABELS[s]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Startdatum" htmlFor="startDate">
            <Input id="startDate" name="startDate" type="date" />
          </Field>
        </div>
        <Field label="Notizen" htmlFor="notes">
          <Textarea
            id="notes"
            name="notes"
            placeholder="Kontext der Zusammenarbeit…"
          />
        </Field>
        {state?.error && <ErrorChip>{state.error}</ErrorChip>}
        {state?.success && <SuccessChip>{state.success}</SuccessChip>}
        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending ? "Anlegen…" : "Engagement anlegen"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
