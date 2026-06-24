"use client";

import { Plus, Trash2 } from "lucide-react";
import { useActionState, useState } from "react";
import { updateEngagement } from "@/app/actions/engagements";
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
import type { EngagementStatus } from "@/generated/prisma/enums";
import {
  ENGAGEMENT_STATUSES,
  ENGAGEMENT_STATUS_LABELS,
} from "@/lib/constants";
import { kpiProgress, type Kpi, type Milestone } from "@/lib/pocs";
import { cn } from "@/lib/utils";

interface EngagementEditorProps {
  engagementId: string;
  initial: {
    title: string;
    status: EngagementStatus;
    startDate: string;
    endDate: string;
    notes: string;
    kpis: Kpi[];
    milestones: Milestone[];
  };
}

export function EngagementEditor({
  engagementId,
  initial,
}: EngagementEditorProps) {
  const action = updateEngagement.bind(null, engagementId);
  const [state, formAction, pending] = useActionState(action, undefined);
  const [kpis, setKpis] = useState<Kpi[]>(initial.kpis);
  const [milestones, setMilestones] = useState<Milestone[]>(initial.milestones);

  const setKpi = (i: number, patch: Partial<Kpi>) =>
    setKpis((ks) => ks.map((k, idx) => (idx === i ? { ...k, ...patch } : k)));
  const setMilestone = (i: number, patch: Partial<Milestone>) =>
    setMilestones((ms) =>
      ms.map((m, idx) => (idx === i ? { ...m, ...patch } : m))
    );

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="kpis" value={JSON.stringify(kpis)} />
      <input
        type="hidden"
        name="milestones"
        value={JSON.stringify(milestones)}
      />

      <Card className="space-y-5 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Titel" htmlFor="eng-title">
            <Input
              id="eng-title"
              name="title"
              defaultValue={initial.title}
              required
            />
          </Field>
          <Field label="Status" htmlFor="eng-status">
            <Select id="eng-status" name="status" defaultValue={initial.status}>
              {ENGAGEMENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {ENGAGEMENT_STATUS_LABELS[s]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Startdatum" htmlFor="eng-start">
            <Input
              id="eng-start"
              name="startDate"
              type="date"
              defaultValue={initial.startDate}
            />
          </Field>
          <Field label="Enddatum" htmlFor="eng-end">
            <Input
              id="eng-end"
              name="endDate"
              type="date"
              defaultValue={initial.endDate}
            />
          </Field>
        </div>
        <Field label="Notizen" htmlFor="eng-notes">
          <Textarea
            id="eng-notes"
            name="notes"
            defaultValue={initial.notes}
            placeholder="Status-Updates, Blocker, Learnings…"
          />
        </Field>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <Label className="mb-0">KPIs</Label>
          <button
            type="button"
            onClick={() =>
              setKpis((ks) => [
                ...ks,
                { name: "", target: 100, current: 0, unit: "%" },
              ])
            }
            className="inline-flex items-center gap-1 rounded-button bg-lv-blue-soft px-2.5 py-1.5 text-xs font-semibold text-lv-blue hover:bg-lv-blue hover:text-white transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            KPI hinzufügen
          </button>
        </div>
        <div className="mt-4 space-y-3">
          {kpis.length === 0 && (
            <p className="text-sm text-lv-secondary">Noch keine KPIs definiert.</p>
          )}
          {kpis.map((kpi, i) => {
            const progress = kpiProgress(kpi);
            return (
              <div
                key={i}
                className="rounded-button border border-lv-border p-3"
              >
                <div className="grid gap-2 sm:grid-cols-[1fr_100px_100px_80px_auto]">
                  <Input
                    value={kpi.name}
                    onChange={(e) => setKpi(i, { name: e.target.value })}
                    placeholder="KPI-Name"
                  />
                  <Input
                    type="number"
                    value={kpi.current}
                    onChange={(e) =>
                      setKpi(i, { current: Number(e.target.value) })
                    }
                    placeholder="Aktuell"
                  />
                  <Input
                    type="number"
                    value={kpi.target}
                    onChange={(e) =>
                      setKpi(i, { target: Number(e.target.value) })
                    }
                    placeholder="Ziel"
                  />
                  <Input
                    value={kpi.unit}
                    onChange={(e) => setKpi(i, { unit: e.target.value })}
                    placeholder="Einheit"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setKpis((ks) => ks.filter((_, idx) => idx !== i))
                    }
                    className="rounded-button p-2 text-lv-secondary hover:bg-lv-orange-soft hover:text-lv-orange transition-colors"
                    aria-label="KPI entfernen"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-lv-surface">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        progress >= 100
                          ? "bg-lv-mint-deep"
                          : progress >= 50
                            ? "bg-lv-blue"
                            : "bg-lv-orange"
                      )}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold tabular-nums text-lv-secondary">
                    {progress}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <Label className="mb-0">Meilensteine</Label>
          <button
            type="button"
            onClick={() =>
              setMilestones((ms) => [
                ...ms,
                {
                  title: "",
                  dueDate: new Date().toISOString().slice(0, 10),
                  done: false,
                },
              ])
            }
            className="inline-flex items-center gap-1 rounded-button bg-lv-blue-soft px-2.5 py-1.5 text-xs font-semibold text-lv-blue hover:bg-lv-blue hover:text-white transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Meilenstein hinzufügen
          </button>
        </div>
        <div className="mt-4 space-y-2">
          {milestones.length === 0 && (
            <p className="text-sm text-lv-secondary">Noch keine Meilensteine.</p>
          )}
          {milestones.map((m, i) => (
            <div
              key={i}
              className="grid items-center gap-2 rounded-button border border-lv-border p-3 sm:grid-cols-[auto_1fr_150px_auto]"
            >
              <input
                type="checkbox"
                checked={m.done}
                onChange={(e) => setMilestone(i, { done: e.target.checked })}
                className="h-4 w-4 accent-lv-blue"
              />
              <Input
                value={m.title}
                onChange={(e) => setMilestone(i, { title: e.target.value })}
                placeholder="Meilenstein"
                className={cn(m.done && "line-through text-lv-secondary")}
              />
              <Input
                type="date"
                value={m.dueDate}
                onChange={(e) => setMilestone(i, { dueDate: e.target.value })}
              />
              <button
                type="button"
                onClick={() =>
                  setMilestones((ms) => ms.filter((_, idx) => idx !== i))
                }
                className="rounded-button p-2 text-lv-secondary hover:bg-lv-orange-soft hover:text-lv-orange transition-colors"
                aria-label="Meilenstein entfernen"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </Card>

      {state?.error && <ErrorChip>{state.error}</ErrorChip>}
      {state?.success && <SuccessChip>{state.success}</SuccessChip>}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Speichern…" : "Engagement speichern"}
        </Button>
      </div>
    </form>
  );
}
