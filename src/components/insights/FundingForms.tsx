"use client";

import { Copy, Trash2 } from "lucide-react";
import { startTransition, useActionState, useEffect, useRef, type FormEvent } from "react";
import {
  createFeedbackSurvey,
  deleteFundingEvent,
  saveFundingEvent,
  saveFundingScope,
  setFeedbackSurveyClosed,
  submitFeedback,
} from "@/app/actions/funding";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { ActionState } from "@/lib/action-state";
import { ErrorChip, Field, Input, Select, Textarea } from "@/components/ui/Field";
import {
  EVENT_SOURCE_LABELS,
  EVENT_SOURCES,
  FUNDING_EVENT_CONFIG,
  FUNDING_EVENT_KINDS,
  FUNDING_FORMAT_CONFIG,
  FUNDING_FORMATS,
  type ScopeKind,
} from "@/lib/insights/funding";
import { toast } from "@/stores/useToast";
import { useActionFeedback } from "./useActionFeedback";

/**
 * Submits without React's automatic form reset, so a validation error does
 * not wipe what was already entered.
 */
function submitKeepingValues(action: (fd: FormData) => void) {
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => action(fd));
  };
}

/** Clears a "create" form once its action succeeded. */
function useResetOnSuccess(state: ActionState | undefined, enabled: boolean) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (enabled && state?.success) ref.current?.reset();
  }, [state, enabled]);
  return ref;
}

/** One batch or program row: pick the funded format it counts for. */
export function FundingScopeForm({
  kind,
  refId,
  format,
  canEdit,
}: {
  kind: ScopeKind;
  refId: string;
  format: string | null;
  canEdit: boolean;
}) {
  const [state, formAction, pending] = useActionState(saveFundingScope, undefined);
  useActionFeedback(state);
  const options = FUNDING_FORMATS.filter((f) => FUNDING_FORMAT_CONFIG[f].kind === kind);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="refId" value={refId} />
      <Select
        name="format"
        defaultValue={format ?? ""}
        disabled={!canEdit || pending}
        aria-label="Format"
        className="min-w-56"
      >
        <option value="">Nicht gefördert</option>
        {options.map((f) => (
          <option key={f} value={f}>
            {FUNDING_FORMAT_CONFIG[f].label}
          </option>
        ))}
      </Select>
      {canEdit && (
        <Button type="submit" size="sm" variant="secondary" disabled={pending}>
          {pending ? "Speichern…" : "Speichern"}
        </Button>
      )}
      {state?.error && <ErrorChip>{state.error}</ErrorChip>}
    </form>
  );
}

export interface FundingEventValues {
  id: string;
  kind: string;
  title: string;
  heldOn: string;
  attendees: number;
  source: string;
  note: string | null;
}

/** Create a new event count (no `event`) or edit an existing one. */
export function FundingEventForm({ event, canEdit }: { event?: FundingEventValues; canEdit: boolean }) {
  const [state, formAction, pending] = useActionState(saveFundingEvent, undefined);
  useActionFeedback(state);
  const prefix = event ? `ev-${event.id}` : "ev-new";
  const formRef = useResetOnSuccess(state, !event);

  return (
    <form ref={formRef} onSubmit={submitKeepingValues(formAction)} className="space-y-3">
      {event && <input type="hidden" name="id" value={event.id} />}
      <fieldset disabled={!canEdit || pending} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <Field label="Art" htmlFor={`${prefix}-kind`} className="lg:col-span-2">
          <Select id={`${prefix}-kind`} name="kind" defaultValue={event?.kind ?? "DEMO_DAY"}>
            {FUNDING_EVENT_KINDS.map((k) => (
              <option key={k} value={k}>
                {FUNDING_EVENT_CONFIG[k].label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Titel" htmlFor={`${prefix}-title`} className="lg:col-span-2">
          <Input id={`${prefix}-title`} name="title" defaultValue={event?.title ?? ""} placeholder="z. B. Demo Day Construction" />
        </Field>
        <Field label="Datum" htmlFor={`${prefix}-on`}>
          <Input id={`${prefix}-on`} name="heldOn" type="date" defaultValue={event?.heldOn ?? ""} />
        </Field>
        <Field label="Teilnehmende" htmlFor={`${prefix}-n`}>
          <Input id={`${prefix}-n`} name="attendees" type="number" min={0} defaultValue={event?.attendees ?? ""} />
        </Field>
        <Field label="Quelle" htmlFor={`${prefix}-src`} className="lg:col-span-2">
          <Select id={`${prefix}-src`} name="source" defaultValue={event?.source ?? "LUMA"}>
            {EVENT_SOURCES.map((s) => (
              <option key={s} value={s}>
                {EVENT_SOURCE_LABELS[s]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Notiz" htmlFor={`${prefix}-note`} className="lg:col-span-4">
          <Input id={`${prefix}-note`} name="note" defaultValue={event?.note ?? ""} placeholder="optional, z. B. Stand Check-in-Liste" />
        </Field>
      </fieldset>
      {state?.error && <ErrorChip>{state.error}</ErrorChip>}
      {canEdit && (
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Speichern…" : event ? "Speichern" : "Veranstaltung eintragen"}
          </Button>
        </div>
      )}
    </form>
  );
}

export function DeleteFundingEventButton({ id }: { id: string }) {
  const [state, formAction, pending] = useActionState(deleteFundingEvent, undefined);
  useActionFeedback(state);
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!window.confirm("Veranstaltung wirklich löschen?")) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <Button type="submit" size="sm" variant="danger" disabled={pending}>
        <Trash2 className="h-3.5 w-3.5" />
        Löschen
      </Button>
      {state?.error && <ErrorChip>{state.error}</ErrorChip>}
    </form>
  );
}

export function FeedbackSurveyCreateForm({
  scopes,
}: {
  scopes: { value: string; label: string; group: "Batches" | "Programme" }[];
}) {
  const [state, formAction, pending] = useActionState(createFeedbackSurvey, undefined);
  useActionFeedback(state);
  const groups = (["Batches", "Programme"] as const).map((g) => ({
    group: g,
    items: scopes.filter((s) => s.group === g),
  }));
  const formRef = useResetOnSuccess(state, true);

  return (
    <Card className="p-5">
      <form ref={formRef} onSubmit={submitKeepingValues(formAction)} className="space-y-3">
        <fieldset disabled={pending} className="grid gap-3 sm:grid-cols-3">
          <Field label="Für" htmlFor="fs-scope">
            <Select id="fs-scope" name="scope" defaultValue="">
              <option value="" disabled>
                Batch oder Programm wählen
              </option>
              {groups.map(
                (g) =>
                  g.items.length > 0 && (
                    <optgroup key={g.group} label={g.group}>
                      {g.items.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </optgroup>
                  )
              )}
            </Select>
          </Field>
          <Field label="Titel" htmlFor="fs-title">
            <Input id="fs-title" name="title" placeholder="z. B. Abschluss-Feedback Industry" />
          </Field>
          <Field label="Offen bis" htmlFor="fs-closes" hint="Leer lassen, um von Hand zu schließen.">
            <Input id="fs-closes" name="closesOn" type="date" />
          </Field>
        </fieldset>
        {state?.error && <ErrorChip>{state.error}</ErrorChip>}
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Öffnen…" : "Umfrage öffnen"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

export function FeedbackSurveyToggle({ id, open }: { id: string; open: boolean }) {
  const [state, formAction, pending] = useActionState(setFeedbackSurveyClosed, undefined);
  useActionFeedback(state);
  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="close" value={open ? "true" : "false"} />
      <Button type="submit" size="sm" variant="secondary" disabled={pending}>
        {open ? "Schließen" : "Wieder öffnen"}
      </Button>
      {state?.error && <ErrorChip>{state.error}</ErrorChip>}
    </form>
  );
}

export function CopyLinkButton({ path }: { path: string }) {
  const onClick = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      toast.success("Link kopiert.");
    } catch {
      toast.error("Kopieren nicht möglich.");
    }
  };
  return (
    <Button type="button" size="sm" variant="ghost" onClick={onClick}>
      <Copy className="h-3.5 w-3.5" />
      Link kopieren
    </Button>
  );
}

export interface FeedbackAnswer {
  recommend: number;
  overall: number;
  goodText: string | null;
  improveText: string | null;
}

/** Startup-facing survey: NPS question, overall rating and two open questions. */
export function FeedbackForm({
  surveyId,
  programName,
  answer,
}: {
  surveyId: string;
  programName: string;
  answer: FeedbackAnswer | null;
}) {
  const [state, formAction, pending] = useActionState(submitFeedback, undefined);
  useActionFeedback(state);

  return (
    <Card className="p-5">
      <form onSubmit={submitKeepingValues(formAction)} className="space-y-5">
        <input type="hidden" name="surveyId" value={surveyId} />
        <fieldset disabled={pending} className="space-y-5">
          <div>
            <p className="text-sm font-semibold text-lv-text">
              Wie wahrscheinlich ist es, dass du {programName} einem anderen Startup empfiehlst?
            </p>
            <p className="mb-2 text-xs text-lv-secondary">0 = sehr unwahrscheinlich, 10 = sehr wahrscheinlich</p>
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: 11 }, (_, n) => (
                <label key={n} className="cursor-pointer">
                  <input
                    type="radio"
                    name="recommend"
                    value={n}
                    defaultChecked={answer?.recommend === n}
                    className="peer sr-only"
                  />
                  <span className="flex h-9 w-9 items-center justify-center rounded-button border border-lv-border text-sm font-semibold text-lv-secondary transition-colors peer-checked:border-lv-blue peer-checked:bg-lv-blue peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-lv-blue/40 hover:bg-lv-surface">
                    {n}
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold text-lv-text">Wie bewertest du das Programm insgesamt?</p>
            <div className="flex flex-wrap gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <label key={n} className="cursor-pointer">
                  <input
                    type="radio"
                    name="overall"
                    value={n}
                    defaultChecked={answer?.overall === n}
                    className="peer sr-only"
                  />
                  <span className="flex h-9 min-w-9 items-center justify-center rounded-button border border-lv-border px-3 text-sm font-semibold text-lv-secondary transition-colors peer-checked:border-lv-blue peer-checked:bg-lv-blue peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-lv-blue/40 hover:bg-lv-surface">
                    {n}
                  </span>
                </label>
              ))}
            </div>
            <p className="mt-1 text-xs text-lv-secondary">1 = schlecht, 5 = sehr gut</p>
          </div>
          <Field label="Was hat dir besonders geholfen?" htmlFor="fb-good">
            <Textarea id="fb-good" name="goodText" rows={3} defaultValue={answer?.goodText ?? ""} />
          </Field>
          <Field label="Was sollten wir verbessern?" htmlFor="fb-improve">
            <Textarea id="fb-improve" name="improveText" rows={3} defaultValue={answer?.improveText ?? ""} />
          </Field>
        </fieldset>
        {state?.error && <ErrorChip>{state.error}</ErrorChip>}
        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending ? "Senden…" : answer ? "Antwort aktualisieren" : "Feedback senden"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
