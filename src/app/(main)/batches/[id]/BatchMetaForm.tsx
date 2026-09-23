"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";
import { deleteBatch, updateBatch } from "@/app/actions/matrix";
import type { BatchType } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorChip, Field, Input, Select, Textarea } from "@/components/ui/Field";
import { BATCH_TYPES, BATCH_TYPE_LABELS } from "@/lib/constants";
import { toast } from "@/stores/useToast";

interface BatchMeta {
  id: string;
  name: string;
  type: BatchType;
  description: string | null;
}

export function BatchMetaForm({ batch }: { batch: BatchMeta }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(updateBatch, undefined);
  const [delState, delAction, delPending] = useActionState(
    deleteBatch,
    undefined
  );
  const handled = useRef(false);
  const delHandled = useRef(false);

  useEffect(() => {
    if (state?.success && !handled.current) {
      handled.current = true;
      toast.success(state.success);
      router.refresh();
      handled.current = false;
    }
  }, [state, router]);

  useEffect(() => {
    if (delState?.success && !delHandled.current) {
      delHandled.current = true;
      toast.success(delState.success);
      router.push(delState.redirectTo ?? "/batches");
    }
  }, [delState, router]);

  return (
    <Card className="space-y-4 p-5">
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="id" value={batch.id} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="b-name">
            <Input id="b-name" name="name" defaultValue={batch.name} required />
          </Field>
          <Field label="Art" htmlFor="b-type">
            <Select id="b-type" name="type" defaultValue={batch.type}>
              {BATCH_TYPES.map((t) => (
                <option key={t} value={t}>
                  {BATCH_TYPE_LABELS[t]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Beschreibung (optional)" htmlFor="b-desc">
          <Textarea
            id="b-desc"
            name="description"
            defaultValue={batch.description ?? ""}
            className="min-h-16 text-sm"
          />
        </Field>

        {state?.error && <ErrorChip>{state.error}</ErrorChip>}

        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending ? "Speichern…" : "Speichern"}
          </Button>
        </div>
      </form>

      <div className="flex items-center justify-between gap-3 border-t border-lv-border pt-4">
        <p className="text-xs text-lv-secondary">
          Batch löschen entfernt auch alle Zuordnungen und Matrix-Bewertungen
          dieses Batches.
        </p>
        <form
          action={delAction}
          onSubmit={(e) => {
            if (
              !window.confirm(
                `Batch "${batch.name}" wirklich löschen? Alle Bewertungen dieses Batches gehen verloren.`
              )
            ) {
              e.preventDefault();
            }
          }}
        >
          <input type="hidden" name="id" value={batch.id} />
          <Button type="submit" variant="danger" size="sm" disabled={delPending}>
            <Trash2 className="h-4 w-4" />
            {delPending ? "Löschen…" : "Batch löschen"}
          </Button>
        </form>
      </div>
    </Card>
  );
}
