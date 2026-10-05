"use client";

import { ChevronDown, ShieldAlert } from "lucide-react";
import { useState, useSyncExternalStore, useTransition } from "react";
import { createLogEntry, updateLogEntry } from "@/app/actions/logbook";
import { Button } from "@/components/ui/Button";
import { ErrorChip, Field, Input, Select, Textarea } from "@/components/ui/Field";
import type { LogEntryType } from "@/generated/prisma/enums";
import {
  LOG_ENTRY_MANUAL_TYPES,
  LOG_ENTRY_TYPE_LABELS,
  LOG_ENTRY_TYPE_TONES,
} from "@/lib/constants";
import type { LogEntryView } from "@/lib/logbook";
import {
  localDateTimeToIso,
  localDateToIso,
  toLocalDateInput,
  toLocalDateTimeInput,
} from "@/lib/logbook-format";
import { cn } from "@/lib/utils";
import { toast } from "@/stores/useToast";
import type { LogContext } from "./types";

const CHIP_TONES: Record<string, string> = {
  muted: "border-lv-secondary/40 bg-lv-surface text-lv-text",
  blue: "border-lv-blue bg-lv-blue-soft text-lv-blue",
  mint: "border-lv-mint-deep bg-lv-mint text-lv-mint-deep",
  yellow: "border-lv-yellow-deep bg-lv-yellow text-lv-yellow-deep",
  pink: "border-lv-text/30 bg-lv-pink text-lv-text",
  orange: "border-lv-orange bg-lv-orange-soft text-lv-orange",
};

// "Now" as a datetime-local value in the browser's zone. Read through
// useSyncExternalStore so SSR renders "" (server falls back to now) and the
// client fills in its local time without a hydration mismatch.
let cachedNow: string | null = null;
const subscribeNoop = () => () => {};
const getClientNow = () => (cachedNow ??= toLocalDateTimeInput(new Date()));
const getServerNow = () => "";

interface LogComposerProps {
  ctx: LogContext;
  /** When set, the composer edits this entry instead of creating one. */
  entry?: LogEntryView;
  onDone?: () => void;
}

/** Create/edit form for a manual Logbuch entry. Remounts after a successful create. */
export function LogComposer(props: LogComposerProps) {
  const [formKey, setFormKey] = useState(0);
  return (
    <ComposerForm
      key={formKey}
      {...props}
      onCreated={() => {
        cachedNow = null;
        setFormKey((k) => k + 1);
      }}
    />
  );
}

function ComposerForm({
  ctx,
  entry,
  onDone,
  onCreated,
}: LogComposerProps & { onCreated: () => void }) {
  const isEdit = !!entry;
  const clientNow = useSyncExternalStore(subscribeNoop, getClientNow, getServerNow);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<LogEntryType>(entry?.type ?? "NOTE");
  const [occurred, setOccurred] = useState<string | null>(
    entry ? toLocalDateTimeInput(entry.occurredAt) : null
  );
  const [followUp, setFollowUp] = useState(
    entry?.followUpAt ? toLocalDateInput(entry.followUpAt) : ""
  );
  const [showParticipants, setShowParticipants] = useState(
    !!entry &&
      (entry.contactIds.length > 0 ||
        entry.teamParticipantIds.length > 0 ||
        !!entry.externalParticipants)
  );
  const occurredValue = occurred ?? clientNow;
  const idPrefix = entry ? `log-${entry.id}` : "log-new";

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = isEdit
        ? await updateLogEntry(undefined, formData)
        : await createLogEntry(undefined, formData);
      if (res.error) {
        setError(res.error);
        return;
      }
      setError(null);
      if (res.success) toast.success(res.success);
      if (!isEdit) onCreated();
      onDone?.();
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {isEdit ? (
        <input type="hidden" name="entryId" value={entry.id} />
      ) : (
        <input type="hidden" name="startupId" value={ctx.startupId} />
      )}
      <input type="hidden" name="type" value={type} />
      <input
        type="hidden"
        name="occurredAt"
        value={localDateTimeToIso(occurredValue)}
      />
      <input type="hidden" name="followUpAt" value={localDateToIso(followUp)} />

      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Typ">
        {LOG_ENTRY_MANUAL_TYPES.map((t) => {
          const active = t === type;
          return (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setType(t)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                active
                  ? CHIP_TONES[LOG_ENTRY_TYPE_TONES[t]]
                  : "border-lv-border text-lv-secondary hover:bg-lv-surface"
              )}
            >
              {LOG_ENTRY_TYPE_LABELS[t]}
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-[220px_1fr]">
        <Field label="Wann?" htmlFor={`${idPrefix}-when`}>
          <Input
            id={`${idPrefix}-when`}
            type="datetime-local"
            value={occurredValue}
            onChange={(e) => setOccurred(e.target.value)}
          />
        </Field>
        <Field label="Titel (optional)" htmlFor={`${idPrefix}-title`}>
          <Input
            id={`${idPrefix}-title`}
            name="title"
            maxLength={200}
            defaultValue={entry?.title ?? ""}
            placeholder="z. B. Intro-Call mit CEO"
          />
        </Field>
      </div>

      <Field
        label="Was ist passiert?"
        htmlFor={`${idPrefix}-body`}
        hint="Markdown: **fett**, Listen mit „- “, Überschriften mit „## “."
      >
        <Textarea
          id={`${idPrefix}-body`}
          name="body"
          required
          maxLength={10000}
          defaultValue={entry?.body ?? ""}
          placeholder="Kernpunkte, Eindrücke, Vereinbarungen …"
        />
      </Field>

      <div className="rounded-button border border-lv-border">
        <button
          type="button"
          onClick={() => setShowParticipants((v) => !v)}
          aria-expanded={showParticipants}
          className="flex w-full items-center justify-between px-3.5 py-2.5 text-xs font-semibold uppercase tracking-wider text-lv-secondary"
        >
          Teilnehmende
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform",
              showParticipants && "rotate-180"
            )}
          />
        </button>
        {/* Kept mounted (only hidden) so the checkboxes are still submitted. */}
        <div
          className={cn(
            "space-y-3 border-t border-lv-border px-3.5 py-3",
            !showParticipants && "hidden"
          )}
        >
          <CheckboxGroup
            label="Startup-Kontakte"
            name="contactIds"
            empty="Noch keine Kontakte beim Startup hinterlegt."
            options={ctx.contacts.map((c) => ({
              id: c.id,
              label: c.position ? `${c.name} (${c.position})` : c.name,
            }))}
            selected={entry?.contactIds ?? []}
          />
          <CheckboxGroup
            label="Team"
            name="teamParticipantIds"
            empty="Keine aktiven Admins."
            options={ctx.admins.map((a) => ({ id: a.id, label: a.name }))}
            selected={entry?.teamParticipantIds ?? []}
          />
          <Field label="Externe" htmlFor={`${idPrefix}-external`}>
            <Input
              id={`${idPrefix}-external`}
              name="externalParticipants"
              maxLength={500}
              defaultValue={entry?.externalParticipants ?? ""}
              placeholder="z. B. Max Muster (Partner AG)"
            />
          </Field>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_180px_200px]">
        <Field label="Nächster Schritt" htmlFor={`${idPrefix}-next`}>
          <Input
            id={`${idPrefix}-next`}
            name="nextStep"
            maxLength={500}
            defaultValue={entry?.nextStep ?? ""}
            placeholder="z. B. Pitch Deck nachreichen"
          />
        </Field>
        <Field label="Follow-up am" htmlFor={`${idPrefix}-due`}>
          <Input
            id={`${idPrefix}-due`}
            type="date"
            value={followUp}
            onChange={(e) => setFollowUp(e.target.value)}
          />
        </Field>
        <Field label="Zuständig" htmlFor={`${idPrefix}-assignee`}>
          <Select
            id={`${idPrefix}-assignee`}
            name="followUpAssigneeId"
            defaultValue={entry ? (entry.followUpAssignee?.id ?? "") : ctx.viewerId}
          >
            <option value="">Niemand</option>
            {ctx.admins.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <p className="flex items-start gap-2 text-xs text-lv-secondary">
        <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Bitte sachlich und beruflich bleiben. Keine besonders sensiblen Daten
        (Art. 9 DSGVO) wie Gesundheit, Religion oder politische Meinung erfassen.
      </p>

      {error && <ErrorChip>{error}</ErrorChip>}

      <div className="flex justify-end gap-2">
        {isEdit && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onDone}
            disabled={pending}
          >
            Abbrechen
          </Button>
        )}
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Speichern…" : isEdit ? "Änderungen speichern" : "Eintrag speichern"}
        </Button>
      </div>
    </form>
  );
}

function CheckboxGroup({
  label,
  name,
  options,
  selected,
  empty,
}: {
  label: string;
  name: string;
  options: { id: string; label: string }[];
  selected: string[];
  empty: string;
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-lv-secondary">
        {label}
      </legend>
      {options.length === 0 ? (
        <p className="text-xs text-lv-secondary">{empty}</p>
      ) : (
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          {options.map((o) => (
            <label key={o.id} className="inline-flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                name={name}
                value={o.id}
                defaultChecked={selected.includes(o.id)}
                className="h-4 w-4 accent-lv-blue"
              />
              {o.label}
            </label>
          ))}
        </div>
      )}
    </fieldset>
  );
}
