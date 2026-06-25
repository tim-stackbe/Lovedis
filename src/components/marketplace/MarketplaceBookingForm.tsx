"use client";

import { Send } from "lucide-react";
import { useActionState, useState } from "react";
import type { MarketplaceOfferingType } from "@/generated/prisma/enums";
import { requestBooking } from "@/app/actions/marketplace";
import { Button } from "@/components/ui/Button";
import {
  ErrorChip,
  Field,
  Input,
  Select,
  SuccessChip,
  Textarea,
} from "@/components/ui/Field";

interface OnBehalfStartup {
  id: string;
  name: string;
  balance: number;
}

interface Props {
  offeringType: MarketplaceOfferingType;
  targetId: string;
  creditCost: number;
  /** Startup self-service: own balance + prefilled contact. */
  balance: number;
  defaultName: string;
  defaultEmail: string;
  /** When true, the internal team books on behalf of a selected startup. */
  teamMode?: boolean;
  startups?: OnBehalfStartup[];
}

export function MarketplaceBookingForm({
  offeringType,
  targetId,
  creditCost,
  balance,
  defaultName,
  defaultEmail,
  teamMode = false,
  startups = [],
}: Props) {
  const [state, formAction, pending] = useActionState(requestBooking, undefined);
  const [selectedStartupId, setSelectedStartupId] = useState("");

  if (state?.success) {
    return <SuccessChip>{state.success}</SuccessChip>;
  }

  // In team mode the relevant balance is the selected startup's balance.
  const selectedStartup = teamMode
    ? startups.find((s) => s.id === selectedStartupId)
    : undefined;
  const effectiveBalance = teamMode ? selectedStartup?.balance ?? 0 : balance;
  const showBalance = !teamMode || Boolean(selectedStartup);
  const insufficient =
    creditCost > 0 && showBalance && effectiveBalance < creditCost;
  const blockSubmit = teamMode && !selectedStartupId;

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="offeringType" value={offeringType} />
      <input type="hidden" name="targetId" value={targetId} />

      {teamMode && (
        <Field
          label="Startup (Anfrage im Auftrag)"
          htmlFor="onBehalfStartupId"
          hint="Als Team-Mitglied buchst du im Namen eines Startups. Die Credits werden dem gewählten Startup belastet."
        >
          <Select
            id="onBehalfStartupId"
            name="onBehalfStartupId"
            required
            value={selectedStartupId}
            onChange={(e) => setSelectedStartupId(e.target.value)}
          >
            <option value="" disabled>
              Startup wählen…
            </option>
            {startups.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {s.balance} Credits
              </option>
            ))}
          </Select>
        </Field>
      )}

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
            erst nach Bestätigung eingelöst.
            {showBalance ? (
              <>
                {" "}
                Guthaben: {effectiveBalance}.
                {insufficient && " Das Guthaben reicht aktuell nicht aus."}
              </>
            ) : (
              " Wähle ein Startup, um das Guthaben zu prüfen."
            )}
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
      <Button
        type="submit"
        disabled={pending || blockSubmit || insufficient}
        className="w-full"
      >
        <Send className="h-4 w-4" />
        {pending
          ? "Wird gesendet…"
          : teamMode
            ? "Anfrage im Auftrag senden"
            : "Anfrage senden"}
      </Button>
    </form>
  );
}
