"use client";

import { useActionState } from "react";
import { saveReportingMeta } from "@/app/actions/insights";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorChip, Field, Input, Select } from "@/components/ui/Field";
import { EVIDENCE_LABELS, EVIDENCE_LEVELS } from "@/lib/insights/stages";
import { useActionFeedback } from "./useActionFeedback";

export interface ReportingMetaValues {
  hessenBased: boolean | null;
  foundersTotal: number | null;
  foundersFemale: number | null;
  teamTotal: number | null;
  teamFemale: number | null;
  fteBaseline: number | null;
  fteBaselineOn: string | null;
  evidence: string | null;
}

const num = (v: number | null) => (v === null ? "" : String(v));

export function ReportingMetaForm({
  startupId,
  meta,
  hessenSuggestion,
  city,
  profileTeamSize,
  canEdit,
}: {
  startupId: string;
  meta: ReportingMetaValues | null;
  hessenSuggestion: boolean | null;
  city: string | null;
  profileTeamSize: number | null;
  canEdit: boolean;
}) {
  const [state, formAction, pending] = useActionState(saveReportingMeta, undefined);
  useActionFeedback(state);

  const hessenDefault =
    meta?.hessenBased === true ? "yes" : meta?.hessenBased === false ? "no" : "";
  const suggestionText =
    hessenSuggestion === null
      ? "Keine Stadt im Profil hinterlegt."
      : `Vorschlag aus Stadt „${city}“: ${hessenSuggestion ? "Hessen" : "nicht Hessen"}.`;

  return (
    <Card className="p-5">
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="startupId" value={startupId} />
        <fieldset disabled={!canEdit || pending} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Sitz in Hessen" htmlFor="rm-hessen" hint={suggestionText}>
              <Select id="rm-hessen" name="hessenBased" defaultValue={hessenDefault}>
                <option value="">Noch nicht bestätigt</option>
                <option value="yes">Ja, Hessen</option>
                <option value="no">Nein</option>
              </Select>
            </Field>
            <Field label="Gründer:innen gesamt" htmlFor="rm-ft">
              <Input id="rm-ft" name="foundersTotal" type="number" min={0} defaultValue={num(meta?.foundersTotal ?? null)} />
            </Field>
            <Field label="davon Frauen" htmlFor="rm-ff" hint="Female Founder ab 50 % Gründerinnen.">
              <Input id="rm-ff" name="foundersFemale" type="number" min={0} defaultValue={num(meta?.foundersFemale ?? null)} />
            </Field>
            <Field label="Team gesamt (heute)" htmlFor="rm-tt" hint={profileTeamSize !== null ? `Profil: ${profileTeamSize}` : undefined}>
              <Input id="rm-tt" name="teamTotal" type="number" min={0} defaultValue={num(meta?.teamTotal ?? null)} />
            </Field>
            <Field label="davon Frauen" htmlFor="rm-tf">
              <Input id="rm-tf" name="teamFemale" type="number" min={0} defaultValue={num(meta?.teamFemale ?? null)} />
            </Field>
            <Field label="Nachweis" htmlFor="rm-ev">
              <Select id="rm-ev" name="evidence" defaultValue={meta?.evidence ?? ""}>
                <option value="">Keine Angabe</option>
                {EVIDENCE_LEVELS.map((e) => (
                  <option key={e} value={e}>
                    {EVIDENCE_LABELS[e]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="FTE bei Programmstart" htmlFor="rm-fb" hint="Baseline für den Job Creation Multiplier.">
              <Input id="rm-fb" name="fteBaseline" type="number" min={0} defaultValue={num(meta?.fteBaseline ?? null)} />
            </Field>
            <Field label="Stand der Baseline" htmlFor="rm-fbo">
              <Input id="rm-fbo" name="fteBaselineOn" type="date" defaultValue={meta?.fteBaselineOn ?? ""} />
            </Field>
          </div>
        </fieldset>

        {state?.error && <ErrorChip>{state.error}</ErrorChip>}

        {canEdit ? (
          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? "Speichern…" : "Speichern"}
            </Button>
          </div>
        ) : (
          <p className="text-xs text-lv-secondary">Nur Admins können diese Angaben ändern.</p>
        )}
      </form>
    </Card>
  );
}
