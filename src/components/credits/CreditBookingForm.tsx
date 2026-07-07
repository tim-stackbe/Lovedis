"use client";

import { useActionState } from "react";
import { bookCreditTransaction } from "@/app/actions/credits";
import { CREDIT_TX_TYPES, CREDIT_TX_TYPE_LABELS } from "@/lib/constants";
import { CREDIT_BUCKET_LABELS } from "@/lib/credit-buckets";
import { Button } from "@/components/ui/Button";
import {
  ErrorChip,
  Field,
  Input,
  Select,
  SuccessChip,
} from "@/components/ui/Field";

interface Option {
  id: string;
  label: string;
}

export function CreditBookingForm({ startups }: { startups: Option[] }) {
  const [state, formAction, pending] = useActionState(
    bookCreditTransaction,
    undefined
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Startup" htmlFor="credit-startup">
          <Select id="credit-startup" name="startupId" required defaultValue="">
            <option value="" disabled>
              Startup wählen…
            </option>
            {startups.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Art" htmlFor="credit-type">
          <Select id="credit-type" name="type" defaultValue="GRANT">
            {CREDIT_TX_TYPES.map((t) => (
              <option key={t} value={t}>
                {CREDIT_TX_TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Topf"
          htmlFor="credit-bucket"
          hint="Flexibel = frei einsetzbar (Mentor:innen/Support). Fix = reserviertes Programm-Kontingent."
        >
          <Select id="credit-bucket" name="bucket" defaultValue="FLEX">
            <option value="FLEX">{CREDIT_BUCKET_LABELS.FLEX}</option>
            <option value="FIX">{CREDIT_BUCKET_LABELS.FIX}</option>
          </Select>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Betrag (Credits)"
          htmlFor="credit-amount"
          hint="Positive Zahl. Bei Korrektur ist auch ein negativer Wert erlaubt."
        >
          <Input
            id="credit-amount"
            name="amount"
            type="number"
            step={1}
            required
            placeholder="z. B. 100"
          />
        </Field>
        <Field label="Grund" htmlFor="credit-reason">
          <Input
            id="credit-reason"
            name="reason"
            required
            maxLength={280}
            placeholder="z. B. Onboarding-Bonus"
          />
        </Field>
      </div>
      {state?.error && <ErrorChip>{state.error}</ErrorChip>}
      {state?.success && <SuccessChip>{state.success}</SuccessChip>}
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Buche…" : "Buchung erfassen"}
        </Button>
      </div>
    </form>
  );
}
