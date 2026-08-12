"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";
import { createBatch } from "@/app/actions/matrix";
import type { BatchType } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorChip, Field, Input, Select, Textarea } from "@/components/ui/Field";
import { BATCH_TYPES, BATCH_TYPE_LABELS } from "@/lib/constants";
import { toast } from "@/stores/useToast";

export function BatchCreateForm() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(createBatch, undefined);
  const handled = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success && !handled.current) {
      handled.current = true;
      toast.success(state.success);
      formRef.current?.reset();
      if (state.redirectTo) router.push(state.redirectTo);
      else router.refresh();
    }
  }, [state, router]);

  return (
    <Card className="p-5">
      <form ref={formRef} action={formAction} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="batch-name">
            <Input
              id="batch-name"
              name="name"
              placeholder="z. B. Love Disruption 2026"
              required
            />
          </Field>
          <Field label="Art" htmlFor="batch-type">
            <Select id="batch-type" name="type" defaultValue={"ACCELERATOR" satisfies BatchType}>
              {BATCH_TYPES.map((t) => (
                <option key={t} value={t}>
                  {BATCH_TYPE_LABELS[t]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Beschreibung (optional)" htmlFor="batch-desc">
          <Textarea
            id="batch-desc"
            name="description"
            className="min-h-16 text-sm"
            placeholder="Worum geht es in diesem Batch / Programm?"
          />
        </Field>

        {state?.error && <ErrorChip>{state.error}</ErrorChip>}

        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>
            <Plus className="h-4 w-4" />
            {pending ? "Anlegen…" : "Batch anlegen"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
