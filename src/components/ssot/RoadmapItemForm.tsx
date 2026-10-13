"use client";

import { useActionState } from "react";
import { createRoadmapItem, updateRoadmapItem } from "@/app/actions/ssot";
import type { RoadmapItemModel } from "@/generated/prisma/models";
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
  ROADMAP_STATUSES,
  ROADMAP_STATUS_LABELS,
} from "@/lib/constants";

export function RoadmapItemForm({ item }: { item?: RoadmapItemModel }) {
  const action = item
    ? updateRoadmapItem.bind(null, item.id)
    : createRoadmapItem;
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <Field label="Titel" htmlFor={`rm-title-${item?.id ?? "new"}`}>
        <Input
          id={`rm-title-${item?.id ?? "new"}`}
          name="title"
          defaultValue={item?.title}
          placeholder="Demo Day Industrial AI 2026"
          required
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Phase" htmlFor={`rm-phase-${item?.id ?? "new"}`}>
          <Input
            id={`rm-phase-${item?.id ?? "new"}`}
            name="phase"
            defaultValue={item?.phase ?? ""}
            placeholder="Q3 2026"
          />
        </Field>
        <Field label="Status" htmlFor={`rm-status-${item?.id ?? "new"}`}>
          <Select
            id={`rm-status-${item?.id ?? "new"}`}
            name="status"
            defaultValue={item?.status ?? "PLANNED"}
          >
            {ROADMAP_STATUSES.map((s) => (
              <option key={s} value={s}>
                {ROADMAP_STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Sichtbarkeit" htmlFor={`rm-aud-${item?.id ?? "new"}`}>
          <Select
            id={`rm-aud-${item?.id ?? "new"}`}
            name="audience"
            defaultValue={item?.audience ?? "PARTNER"}
          >
            {CONTENT_AUDIENCES.map((a) => (
              <option key={a} value={a}>
                {CONTENT_AUDIENCE_LABELS[a]}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
        <Field label="Beschreibung" htmlFor={`rm-body-${item?.id ?? "new"}`}>
          <Textarea
            id={`rm-body-${item?.id ?? "new"}`}
            name="body"
            defaultValue={item?.body ?? ""}
            className="min-h-16"
          />
        </Field>
        <Field label="Reihenfolge" htmlFor={`rm-sort-${item?.id ?? "new"}`}>
          <Input
            id={`rm-sort-${item?.id ?? "new"}`}
            name="sortOrder"
            type="number"
            defaultValue={item?.sortOrder ?? 0}
          />
        </Field>
      </div>
      {state?.error && <ErrorChip>{state.error}</ErrorChip>}
      {state?.success && <SuccessChip>{state.success}</SuccessChip>}
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Speichern…" : item ? "Speichern" : "Eintrag anlegen"}
        </Button>
      </div>
    </form>
  );
}
