"use client";

import { Trash2 } from "lucide-react";
import { useActionState, useState } from "react";
import { deleteTracking, saveTracking } from "@/app/actions/insights";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorChip, Field, Input, Select, Textarea } from "@/components/ui/Field";
import type { InsightsFormOptions } from "@/lib/insights/data";
import {
  OUTCOME_LABELS,
  OUTCOMES,
  STAGE_LABELS,
  STAGES,
  SUPPORT_INTENSITIES,
  SUPPORT_INTENSITY_LABELS,
  TRACK_LABELS,
  TRACKS,
} from "@/lib/insights/stages";
import { useActionFeedback } from "./useActionFeedback";

/** Form values: dates as YYYY-MM-DD, numbers as numbers, absent as null. */
export interface TrackingValues {
  id: string | null;
  track: string;
  startupId: string;
  partnerCompanyId: string | null;
  batchId: string | null;
  challengeId: string | null;
  engagementId: string | null;
  stage: string;
  introByLovedisOn: string | null;
  pilotStartOn: string | null;
  loiOn: string | null;
  contractOn: string | null;
  firstRevenueOn: string | null;
  revenueEur: number | null;
  collaborationForm: string | null;
  supportIntensity: string | null;
  ndaSigned: boolean;
  ipAgreement: boolean;
  coInnovationAgreement: boolean;
  useCase: string | null;
  goal: string | null;
  kpis: string | null;
  startOn: string | null;
  endOn: string | null;
  resourcesPartner: string | null;
  costPartnerEur: number | null;
  costLovedisEur: number | null;
  costStartupEur: number | null;
  outcome: string | null;
}

const text = (v: string | number | null) => (v === null ? "" : String(v));

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-lv-text">{title}</h3>
      <div className="grid gap-4 sm:grid-cols-3">{children}</div>
    </div>
  );
}

export function TrackingForm({
  values,
  options,
  canEdit,
}: {
  values: TrackingValues;
  options: InsightsFormOptions;
  canEdit: boolean;
}) {
  const [state, formAction, pending] = useActionState(saveTracking, undefined);
  const [delState, delAction, delPending] = useActionState(deleteTracking, undefined);
  useActionFeedback(state);
  useActionFeedback(delState);
  const [startupId, setStartupId] = useState(values.startupId);
  const engagements = options.engagements.filter((e) => e.startupId === startupId);

  return (
    <Card className="space-y-4 p-5">
      <form action={formAction} className="space-y-6">
        {values.id && <input type="hidden" name="id" value={values.id} />}
        <fieldset disabled={!canEdit || pending} className="space-y-6">
          <Group title="Zuordnung">
            <Field label="Programm" htmlFor="t-track">
              <Select id="t-track" name="track" defaultValue={values.track}>
                {TRACKS.map((t) => (
                  <option key={t} value={t}>
                    {TRACK_LABELS[t]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Startup" htmlFor="t-startup">
              <Select
                id="t-startup"
                name="startupId"
                value={startupId}
                onChange={(e) => setStartupId(e.target.value)}
                required
              >
                <option value="">Startup wählen</option>
                {options.startups.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Partner" htmlFor="t-partner">
              <Select id="t-partner" name="partnerCompanyId" defaultValue={values.partnerCompanyId ?? ""}>
                <option value="">Kein Partner</option>
                {options.partners.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Batch" htmlFor="t-batch" hint="Leer lassen beim 1:1 Accelerator.">
              <Select id="t-batch" name="batchId" defaultValue={values.batchId ?? ""}>
                <option value="">Kein Batch</option>
                {options.batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Challenge" htmlFor="t-challenge">
              <Select id="t-challenge" name="challengeId" defaultValue={values.challengeId ?? ""}>
                <option value="">Keine Challenge</option>
                {options.challenges.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Engagement" htmlFor="t-engagement" hint="Wird nur angezeigt, nicht verändert.">
              <Select id="t-engagement" name="engagementId" defaultValue={values.engagementId ?? ""} key={startupId}>
                <option value="">Kein Engagement</option>
                {engagements.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title}
                  </option>
                ))}
              </Select>
            </Field>
          </Group>

          <Group title="Fortschritt">
            <Field label="Stufe" htmlFor="t-stage" hint="Ein eingetragenes Datum hebt die Stufe automatisch an.">
              <Select id="t-stage" name="stage" defaultValue={values.stage}>
                {STAGES.map((s) => (
                  <option key={s} value={s}>
                    {STAGE_LABELS[s]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Intro durch LOVEDIS am" htmlFor="t-intro">
              <Input id="t-intro" name="introByLovedisOn" type="date" defaultValue={text(values.introByLovedisOn)} />
            </Field>
            <Field label="Pilot gestartet am" htmlFor="t-pilot">
              <Input id="t-pilot" name="pilotStartOn" type="date" defaultValue={text(values.pilotStartOn)} />
            </Field>
            <Field label="LOI am" htmlFor="t-loi">
              <Input id="t-loi" name="loiOn" type="date" defaultValue={text(values.loiOn)} />
            </Field>
            <Field label="Vertrag am" htmlFor="t-contract">
              <Input id="t-contract" name="contractOn" type="date" defaultValue={text(values.contractOn)} />
            </Field>
            <Field label="Erster Umsatz am" htmlFor="t-rev-on">
              <Input id="t-rev-on" name="firstRevenueOn" type="date" defaultValue={text(values.firstRevenueOn)} />
            </Field>
            <Field label="Umsatz mit Partner (EUR)" htmlFor="t-rev">
              <Input id="t-rev" name="revenueEur" type="number" min={0} defaultValue={text(values.revenueEur)} />
            </Field>
            <Field label="Outcome" htmlFor="t-outcome">
              <Select id="t-outcome" name="outcome" defaultValue={values.outcome ?? ""}>
                <option value="">Noch offen</option>
                {OUTCOMES.map((o) => (
                  <option key={o} value={o}>
                    {OUTCOME_LABELS[o]}
                  </option>
                ))}
              </Select>
            </Field>
          </Group>

          <Group title="Zusammenarbeit">
            <Field label="Form der Zusammenarbeit" htmlFor="t-form">
              <Input id="t-form" name="collaborationForm" maxLength={200} defaultValue={text(values.collaborationForm)} />
            </Field>
            <Field label="Betreuungsintensität" htmlFor="t-intensity">
              <Select id="t-intensity" name="supportIntensity" defaultValue={values.supportIntensity ?? ""}>
                <option value="">Keine Angabe</option>
                {SUPPORT_INTENSITIES.map((s) => (
                  <option key={s} value={s}>
                    {SUPPORT_INTENSITY_LABELS[s]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Verträge">
              <div className="space-y-1.5 pt-1 text-sm">
                {(
                  [
                    ["ndaSigned", "NDA", values.ndaSigned],
                    ["ipAgreement", "IP-Vereinbarung", values.ipAgreement],
                    ["coInnovationAgreement", "Co-Innovation", values.coInnovationAgreement],
                  ] as const
                ).map(([name, label, checked]) => (
                  <label key={name} className="flex items-center gap-2">
                    <input type="checkbox" name={name} defaultChecked={checked} />
                    {label}
                  </label>
                ))}
              </div>
            </Field>
            <Field label="Start" htmlFor="t-start">
              <Input id="t-start" name="startOn" type="date" defaultValue={text(values.startOn)} />
            </Field>
            <Field label="Ende" htmlFor="t-end">
              <Input id="t-end" name="endOn" type="date" defaultValue={text(values.endOn)} />
            </Field>
            <div />
            <Field label="Use Case" htmlFor="t-usecase" className="sm:col-span-3">
              <Textarea id="t-usecase" name="useCase" maxLength={4000} className="min-h-16 text-sm" defaultValue={text(values.useCase)} />
            </Field>
            <Field label="Ziel" htmlFor="t-goal" className="sm:col-span-3">
              <Textarea id="t-goal" name="goal" maxLength={4000} className="min-h-16 text-sm" defaultValue={text(values.goal)} />
            </Field>
            <Field label="KPIs" htmlFor="t-kpis" className="sm:col-span-3">
              <Textarea id="t-kpis" name="kpis" maxLength={4000} className="min-h-16 text-sm" defaultValue={text(values.kpis)} />
            </Field>
            <Field label="Ressourcen des Partners" htmlFor="t-res" className="sm:col-span-3">
              <Textarea id="t-res" name="resourcesPartner" maxLength={4000} className="min-h-16 text-sm" defaultValue={text(values.resourcesPartner)} />
            </Field>
          </Group>

          <Group title="Kosten (EUR)">
            <Field label="Partner" htmlFor="t-cost-p">
              <Input id="t-cost-p" name="costPartnerEur" type="number" min={0} defaultValue={text(values.costPartnerEur)} />
            </Field>
            <Field label="LOVEDIS" htmlFor="t-cost-l">
              <Input id="t-cost-l" name="costLovedisEur" type="number" min={0} defaultValue={text(values.costLovedisEur)} />
            </Field>
            <Field label="Startup" htmlFor="t-cost-s">
              <Input id="t-cost-s" name="costStartupEur" type="number" min={0} defaultValue={text(values.costStartupEur)} />
            </Field>
          </Group>
        </fieldset>

        {state?.error && <ErrorChip>{state.error}</ErrorChip>}

        {canEdit ? (
          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? "Speichern…" : values.id ? "Speichern" : "Anlegen"}
            </Button>
          </div>
        ) : (
          <p className="text-xs text-lv-secondary">Nur Admins können Tracking-Einträge ändern.</p>
        )}
      </form>

      {canEdit && values.id && (
        <div className="flex items-center justify-between gap-3 border-t border-lv-border pt-4">
          <p className="text-xs text-lv-secondary">
            Löscht nur diesen Tracking-Eintrag. Matrix, Engagements und Challenges bleiben unverändert.
          </p>
          <form
            action={delAction}
            onSubmit={(e) => {
              if (!window.confirm("Tracking-Eintrag wirklich löschen?")) e.preventDefault();
            }}
          >
            <input type="hidden" name="id" value={values.id} />
            <Button type="submit" variant="danger" size="sm" disabled={delPending}>
              <Trash2 className="h-4 w-4" />
              {delPending ? "Löschen…" : "Löschen"}
            </Button>
          </form>
        </div>
      )}
      {delState?.error && <ErrorChip>{delState.error}</ErrorChip>}
    </Card>
  );
}
