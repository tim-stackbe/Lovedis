"use client";

import { NotebookPen } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createLogEntry } from "@/app/actions/logbook";
import { Button } from "@/components/ui/Button";
import { ErrorChip, Input, Textarea } from "@/components/ui/Field";
import type { LogEntryType } from "@/generated/prisma/enums";
import {
  LOG_ENTRY_MANUAL_TYPES,
  LOG_ENTRY_TYPE_LABELS,
  LOG_REF_TYPE_LABELS,
  type LogRefType,
} from "@/lib/constants";
import { localDateToIso } from "@/lib/logbook-format";
import { cn } from "@/lib/utils";
import { toast } from "@/stores/useToast";

interface LogQuickAddProps {
  startupId: string;
  /** Optional platform context; resolved and verified on the server. */
  refType?: LogRefType;
  refId?: string | null;
  /** For an empty matrix cell (no match row yet): partner + batch ids. */
  partnerCompanyId?: string;
  batchId?: string;
  /** Short context shown in the form, e.g. the partner or offering name. */
  contextName?: string;
  defaultType?: LogEntryType;
  /** Collapsed button label. */
  label?: string;
  /** Start expanded (e.g. inside the drawer). */
  defaultOpen?: boolean;
  onCreated?: () => void;
  className?: string;
}

/**
 * Compact Logbuch entry form for use outside the logbook page (ADMIN only:
 * render it only for admin sessions; the action is requireAdmin either way).
 */
export function LogQuickAdd({
  startupId,
  refType,
  refId,
  partnerCompanyId,
  batchId,
  contextName,
  defaultType = "NOTE",
  label = "Notiz ins Logbuch",
  defaultOpen = false,
  onCreated,
  className,
}: LogQuickAddProps) {
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen);
  const [formKey, setFormKey] = useState(0);
  const [type, setType] = useState<LogEntryType>(defaultType);
  const [followUp, setFollowUp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => setOpen(true)}
        className={className}
      >
        <NotebookPen className="h-3.5 w-3.5" />
        {label}
      </Button>
    );
  }

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createLogEntry(undefined, formData);
      if (res.error) {
        setError(res.error);
        return;
      }
      setError(null);
      toast.success(res.success ?? "Eintrag gespeichert.");
      setFollowUp("");
      setType(defaultType);
      setFormKey((k) => k + 1);
      if (!defaultOpen) setOpen(false);
      onCreated?.();
      router.refresh();
    });
  };

  return (
    <form
      key={formKey}
      onSubmit={onSubmit}
      className={cn(
        "space-y-2.5 rounded-card border border-lv-border bg-white p-3.5",
        className
      )}
    >
      <input type="hidden" name="startupId" value={startupId} />
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="assignSelf" value="1" />
      <input type="hidden" name="followUpAt" value={localDateToIso(followUp)} />
      {refType && <input type="hidden" name="refType" value={refType} />}
      {refId && <input type="hidden" name="refId" value={refId} />}
      {partnerCompanyId && (
        <input type="hidden" name="partnerCompanyId" value={partnerCompanyId} />
      )}
      {batchId && <input type="hidden" name="batchId" value={batchId} />}

      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-lv-secondary">
          Logbuch (nur Admins)
          {refType && (
            <span className="ml-1 normal-case tracking-normal text-lv-blue">
              · {LOG_REF_TYPE_LABELS[refType]}
              {contextName ? `: ${contextName}` : ""}
            </span>
          )}
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Typ">
        {LOG_ENTRY_MANUAL_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={t === type}
            onClick={() => setType(t)}
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-colors",
              t === type
                ? "border-lv-blue bg-lv-blue-soft text-lv-blue"
                : "border-lv-border text-lv-secondary hover:bg-lv-surface"
            )}
          >
            {LOG_ENTRY_TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      <Textarea
        name="body"
        required
        maxLength={10000}
        className="min-h-20 text-sm"
        placeholder="Was ist passiert? Sachlich bleiben, keine sensiblen Daten (Art. 9 DSGVO)."
        aria-label="Eintrag"
      />
      <div className="grid gap-2 sm:grid-cols-[1fr_150px]">
        <Input
          name="nextStep"
          maxLength={500}
          placeholder="Nächster Schritt (optional)"
          aria-label="Nächster Schritt"
          className="text-sm"
        />
        <Input
          type="date"
          value={followUp}
          onChange={(e) => setFollowUp(e.target.value)}
          aria-label="Follow-up am"
          className="text-sm"
        />
      </div>

      {error && <ErrorChip>{error}</ErrorChip>}

      <div className="flex justify-end gap-2">
        {!defaultOpen && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              setOpen(false);
              setError(null);
            }}
            disabled={pending}
          >
            Abbrechen
          </Button>
        )}
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Speichern…" : "Speichern"}
        </Button>
      </div>
    </form>
  );
}
