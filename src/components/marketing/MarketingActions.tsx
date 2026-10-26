"use client";

import { RefreshCw, Upload } from "lucide-react";
import { useActionState, useEffect, useRef, useTransition } from "react";
import { importLinkedInExport, runResendSync, saveFollowerTotal } from "@/app/actions/marketing";
import { useActionFeedback } from "@/components/insights/useActionFeedback";
import { Button } from "@/components/ui/Button";
import { ErrorChip, Field, Input } from "@/components/ui/Field";
import { toast } from "@/stores/useToast";
import { useRouter } from "next/navigation";

/** Pulls emails, suppressions and broadcasts from Resend now. */
export function ResendSyncButton({ variant = "secondary" }: { variant?: "secondary" | "white" }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const onClick = () =>
    startTransition(async () => {
      const result = await runResendSync();
      if (result.error) toast.error(result.error);
      else if (result.success) {
        toast.success(result.success);
        router.refresh();
      }
    });
  return (
    <Button onClick={onClick} disabled={pending} variant={variant} size="sm">
      <RefreshCw className={pending ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
      {pending ? "Wird abgerufen…" : "Jetzt abrufen"}
    </Button>
  );
}

export function LinkedInImportForm() {
  const [state, formAction, pending] = useActionState(importLinkedInExport, undefined);
  useActionFeedback(state);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.success) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={formAction} className="space-y-3">
      <Field
        label="Export-Dateien"
        htmlFor="li-file"
        hint="LinkedIn › Unternehmensseite › Analysen › Inhalte bzw. Follower › Exportieren. Mehrere Dateien gleichzeitig möglich, bereits importierte Beiträge werden aktualisiert."
      >
        <Input id="li-file" name="file" type="file" multiple accept=".xls,.xlsx,.csv" disabled={pending} />
      </Field>
      {state?.error && <ErrorChip>{state.error}</ErrorChip>}
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending}>
          <Upload className="h-4 w-4" />
          {pending ? "Import läuft…" : "Importieren"}
        </Button>
      </div>
    </form>
  );
}

export function FollowerTotalForm({ current }: { current: number | null }) {
  const [state, formAction, pending] = useActionState(saveFollowerTotal, undefined);
  useActionFeedback(state);
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <Field label="Follower aktuell" htmlFor="li-total" className="min-w-40 flex-1">
        <Input
          id="li-total"
          name="total"
          inputMode="numeric"
          defaultValue={current ?? ""}
          placeholder="z. B. 2418"
          disabled={pending}
        />
      </Field>
      <Button type="submit" size="sm" variant="secondary" disabled={pending}>
        {pending ? "Speichern…" : "Speichern"}
      </Button>
      {state?.error && <ErrorChip>{state.error}</ErrorChip>}
    </form>
  );
}
