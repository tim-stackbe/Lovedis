"use client";

import { Send } from "lucide-react";
import { useActionState } from "react";
import type { MarketplaceOfferingType } from "@/generated/prisma/enums";
import { requestBooking } from "@/app/actions/marketplace";
import { Button } from "@/components/ui/Button";
import {
  ErrorChip,
  Field,
  Input,
  SuccessChip,
  Textarea,
} from "@/components/ui/Field";

interface Props {
  offeringType: MarketplaceOfferingType;
  targetId: string;
  creditCost: number;
  balance: number;
  defaultName: string;
  defaultEmail: string;
}

export function MarketplaceBookingForm({
  offeringType,
  targetId,
  creditCost,
  balance,
  defaultName,
  defaultEmail,
}: Props) {
  const [state, formAction, pending] = useActionState(requestBooking, undefined);

  if (state?.success) {
    return <SuccessChip>{state.success}</SuccessChip>;
  }

  const insufficient = creditCost > 0 && balance < creditCost;

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="offeringType" value={offeringType} />
      <input type="hidden" name="targetId" value={targetId} />

      <div
        className={
          "rounded-button px-3.5 py-2.5 text-sm " +
          (creditCost > 0
            ? insufficient
              ? "bg-lv-orange-soft text-lv-orange"
              : "bg-lv-blue-soft text-lv-blue"
            : "bg-lv-mint/50 text-lv-mint-deep")
        }
      >
        {creditCost > 0 ? (
          <>
            <span className="font-semibold">{creditCost} Credits</span> — werden
            erst nach Bestätigung eingelöst. Dein Guthaben: {balance}.
            {insufficient && " Dein Guthaben reicht aktuell nicht aus."}
          </>
        ) : (
          <>Im Programm enthalten — keine Credits.</>
        )}
      </div>

      <Field
        label="Anliegen / Wunsch-Session"
        htmlFor="message"
        hint="Das Lovedis-Team koordiniert Matching & Termin mit dem Partner."
      >
        <Textarea
          id="message"
          name="message"
          placeholder="Worum geht es konkret? Was möchtest du aus der Session mitnehmen?"
          required
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Kontaktname" htmlFor="contactName">
          <Input
            id="contactName"
            name="contactName"
            defaultValue={defaultName}
            required
          />
        </Field>
        <Field label="Kontakt-E-Mail" htmlFor="contactEmail">
          <Input
            id="contactEmail"
            name="contactEmail"
            type="email"
            defaultValue={defaultEmail}
            required
          />
        </Field>
      </div>

      <Field
        label="Wunschtermin (optional)"
        htmlFor="preferredAt"
        hint="z. B. „nächste Woche Di/Mi nachmittags“"
      >
        <Input
          id="preferredAt"
          name="preferredAt"
          placeholder="Wunschtermin(e) als Freitext"
        />
      </Field>

      {state?.error && <ErrorChip>{state.error}</ErrorChip>}
      <Button type="submit" disabled={pending} className="w-full">
        <Send className="h-4 w-4" />
        {pending ? "Wird gesendet…" : "Anfrage senden"}
      </Button>
    </form>
  );
}
