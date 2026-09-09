"use client";

import { useActionState } from "react";
import { createMediaAsset } from "@/app/actions/ssot";
import { Button } from "@/components/ui/Button";
import {
  ErrorChip,
  Field,
  Input,
  Select,
  SuccessChip,
} from "@/components/ui/Field";
import {
  CONTENT_AUDIENCES,
  CONTENT_AUDIENCE_LABELS,
} from "@/lib/constants";

const ASSET_TYPES = ["DOCUMENT", "DECK", "LINK", "OTHER"] as const;
const ASSET_TYPE_LABELS: Record<(typeof ASSET_TYPES)[number], string> = {
  DOCUMENT: "Dokument",
  DECK: "Deck",
  LINK: "Link",
  OTHER: "Sonstiges",
};

export function MediaAssetForm() {
  const [state, formAction, pending] = useActionState(
    createMediaAsset,
    undefined
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="ma-name">
          <Input
            id="ma-name"
            name="name"
            placeholder="Lovedis Logo-Paket"
            required
          />
        </Field>
        <Field label="URL" htmlFor="ma-url">
          <Input
            id="ma-url"
            name="url"
            type="url"
            placeholder="https://…"
            required
          />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Typ" htmlFor="ma-type">
          <Select id="ma-type" name="type" defaultValue="DOCUMENT">
            {ASSET_TYPES.map((t) => (
              <option key={t} value={t}>
                {ASSET_TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Sichtbarkeit" htmlFor="ma-aud">
          <Select id="ma-aud" name="audience" defaultValue="PARTNER">
            {CONTENT_AUDIENCES.map((a) => (
              <option key={a} value={a}>
                {CONTENT_AUDIENCE_LABELS[a]}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      {state?.error && <ErrorChip>{state.error}</ErrorChip>}
      {state?.success && <SuccessChip>{state.success}</SuccessChip>}
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Hinzufügen…" : "Asset hinzufügen"}
        </Button>
      </div>
    </form>
  );
}
