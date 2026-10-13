"use client";

import { useActionState } from "react";
import { saveReportingMeta } from "@/app/actions/insights";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorChip, Field, Input, Select } from "@/components/ui/Field";
import {
  EVIDENCE_LABELS,
  EVIDENCE_LEVELS,
  FOLLOW_ON_ROUND_LABELS,
  FOLLOW_ON_ROUNDS,
  MATURITY_LABELS,
  MATURITY_LEVELS,
} from "@/lib/insights/stages";
import { useActionFeedback } from "./useActionFeedback";

export interface ReportingMetaValues {
  hessenBased: boolean | null;
  foundersTotal: number | null;
  foundersFemale: number | null;
  teamTotal: number | null;
  teamFemale: number | null;
  fteBaseline: number | null;
  fteBaselineOn: string | null;
  fteCurrent: number | null;
  fteCurrentOn: string | null;
  maturityStart: string | null;
  maturityCurrent: string | null;
  preFounding: boolean | null;
  followOnRound: string | null;
  followOnRoundOn: string | null;
  evidence: string | null;
}

const yesNo = (v: boolean | null | undefined) => (v === true ? "yes" : v === false ? "no" : "");

function MaturitySelect({ id, name, value }: { id: string; name: string; value: string | null }) {
  return (
    <Select id={id} name={name} defaultValue={value ?? ""}>
      <option value="">Keine Angabe</option>
      {MATURITY_LEVELS.map((m) => (
        <option key={m} value={m}>
          {MATURITY_LABELS[m]}
        </option>
      ))}
    </Select>
  );
}

function GroupTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xs font-semibold uppercase tracking-wide text-lv-secondary">{children}</h3>;
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

  const hessenDefault = yesNo(meta?.hessenBased);
  const suggestionText =
    hessenSuggestion === null
      ? "Keine Stadt im Profil hinterlegt."
      : `Vorschlag aus Stadt „${city}“: ${hessenSuggestion ? "Hessen" : "nicht Hessen"}.`;

  return (
    <Card className="p-5">
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="startupId" value={startupId} />
        <fieldset disabled={!canEdit || pending} className="space-y-4">
          <GroupTitle>Programm-Merkmale</GroupTitle>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Sitz in Hessen" htmlFor="rm-hessen" hint={suggestionText}>
              <Select id="rm-hessen" name="hessenBased" defaultValue={hessenDefault}>
                <option value="">Noch nicht bestätigt</option>
                <option value="yes">Ja, Hessen</option>
                <option value="no">Nein</option>
              </Select>
            </Field>
            <Field label="Vor-Gründungsteam" htmlFor="rm-pre" hint="Noch nicht gegründet; laut Antrag max. 10 % der Teilnehmenden.">
              <Select id="rm-pre" name="preFounding" defaultValue={yesNo(meta?.preFounding)}>
                <option value="">Keine Angabe</option>
                <option value="no">Nein, gegründet</option>
                <option value="yes">Ja, Vor-Gründung</option>
              </Select>
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
          </div>

          <GroupTitle>Team und Stellen</GroupTitle>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Gründer:innen gesamt" htmlFor="rm-ft">
              <Input id="rm-ft" name="foundersTotal" type="number" min={0} defaultValue={num(meta?.foundersTotal ?? null)} />
            </Field>
            <Field label="davon Frauen" htmlFor="rm-ff" hint="Female Founder ab 50 % Gründerinnen.">
              <Input id="rm-ff" name="foundersFemale" type="number" min={0} defaultValue={num(meta?.foundersFemale ?? null)} />
            </Field>
            <Field label="Team gesamt heute (Köpfe)" htmlFor="rm-tt" hint={profileTeamSize !== null ? `Profil: ${profileTeamSize}` : undefined}>
              <Input id="rm-tt" name="teamTotal" type="number" min={0} defaultValue={num(meta?.teamTotal ?? null)} />
            </Field>
            <Field label="davon Frauen" htmlFor="rm-tf">
              <Input id="rm-tf" name="teamFemale" type="number" min={0} defaultValue={num(meta?.teamFemale ?? null)} />
            </Field>
            <Field label="VZÄ bei Programmstart" htmlFor="rm-fb" hint="Baseline für den Job Creation Multiplier.">
              <Input id="rm-fb" name="fteBaseline" type="number" min={0} defaultValue={num(meta?.fteBaseline ?? null)} />
            </Field>
            <Field label="Stand der Baseline" htmlFor="rm-fbo">
              <Input id="rm-fbo" name="fteBaselineOn" type="date" defaultValue={meta?.fteBaselineOn ?? ""} />
            </Field>
            <Field label="VZÄ heute" htmlFor="rm-fc" hint="Vollzeitstellen, nicht Köpfe.">
              <Input id="rm-fc" name="fteCurrent" type="number" min={0} defaultValue={num(meta?.fteCurrent ?? null)} />
            </Field>
            <Field label="Stand VZÄ heute" htmlFor="rm-fco">
              <Input id="rm-fco" name="fteCurrentOn" type="date" defaultValue={meta?.fteCurrentOn ?? ""} />
            </Field>
          </div>

          <GroupTitle>Entwicklung</GroupTitle>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Reifegrad bei Programmstart" htmlFor="rm-ms">
              <MaturitySelect id="rm-ms" name="maturityStart" value={meta?.maturityStart ?? null} />
            </Field>
            <Field label="Reifegrad heute" htmlFor="rm-mc" hint="Index MVP zu Marktreife (1 bis 5).">
              <MaturitySelect id="rm-mc" name="maturityCurrent" value={meta?.maturityCurrent ?? null} />
            </Field>
            <div className="hidden sm:block" />
            <Field label="Folgefinanzierung" htmlFor="rm-fr" hint="Runde nach Programmstart.">
              <Select id="rm-fr" name="followOnRound" defaultValue={meta?.followOnRound ?? ""}>
                <option value="">Keine</option>
                {FOLLOW_ON_ROUNDS.map((r) => (
                  <option key={r} value={r}>
                    {FOLLOW_ON_ROUND_LABELS[r]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Abschluss der Runde" htmlFor="rm-fro">
              <Input id="rm-fro" name="followOnRoundOn" type="date" defaultValue={meta?.followOnRoundOn ?? ""} />
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
