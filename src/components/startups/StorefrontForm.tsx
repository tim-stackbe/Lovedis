"use client";

import { Eye, EyeOff } from "lucide-react";
import { useActionState, useState } from "react";
import { updatePublicProfile } from "@/app/actions/discovery";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  ErrorChip,
  Field,
  Input,
  SuccessChip,
  Textarea,
} from "@/components/ui/Field";
import { LOOKING_FOR_OPTIONS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export interface StorefrontValues {
  tagline: string | null;
  publicPitch: string | null;
  logoUrl: string | null;
  seekingFunding: boolean;
  seekingAmount: number | null;
  lookingFor: string[];
  isPublished: boolean;
}

export function StorefrontForm({ startup }: { startup: StorefrontValues }) {
  const [state, formAction, pending] = useActionState(
    updatePublicProfile,
    undefined
  );
  const [seekingFunding, setSeekingFunding] = useState(startup.seekingFunding);
  const [published, setPublished] = useState(startup.isPublished);

  return (
    <Card className="p-6 sm:p-8">
      <form action={formAction} className="space-y-5">
        <div
          className={cn(
            "flex items-start gap-3 rounded-card border p-4",
            published
              ? "border-lv-mint bg-lv-mint/30"
              : "border-lv-border bg-lv-surface/50"
          )}
        >
          <label className="flex flex-1 cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              name="isPublished"
              defaultChecked={startup.isPublished}
              onChange={(e) => setPublished(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-lv-blue"
            />
            <span>
              <span className="flex items-center gap-1.5 text-sm font-semibold text-lv-text">
                {published ? (
                  <Eye className="h-4 w-4 text-lv-mint-deep" />
                ) : (
                  <EyeOff className="h-4 w-4 text-lv-secondary" />
                )}
                Profil im Ökosystem veröffentlichen
              </span>
              <span className="mt-0.5 block text-xs text-lv-secondary">
                Wenn aktiv, sehen Investoren und Partner dein Storefront-Profil
                unter „Entdecken“. Interne Bewertungen bleiben privat.
              </span>
            </span>
          </label>
        </div>

        <Field
          label="Tagline"
          htmlFor="tagline"
          hint="Ein Satz, der euch auf den Punkt bringt."
        >
          <Input
            id="tagline"
            name="tagline"
            defaultValue={startup.tagline ?? ""}
            maxLength={160}
            placeholder="Der Copilot für Automatisierungsingenieure."
          />
        </Field>

        <Field
          label="Öffentlicher Pitch"
          htmlFor="publicPitch"
          hint="Was Investoren und Partner sehen. Erzähl von Produkt, Traktion und Vision."
        >
          <Textarea
            id="publicPitch"
            name="publicPitch"
            defaultValue={startup.publicPitch ?? ""}
            className="min-h-32"
            placeholder="Beschreibe euer Produkt, eure Kunden, eure Traktion…"
          />
        </Field>

        <Field label="Logo-URL" htmlFor="logoUrl" hint="Optional.">
          <Input
            id="logoUrl"
            name="logoUrl"
            type="url"
            defaultValue={startup.logoUrl ?? ""}
            placeholder="https://…/logo.png"
          />
        </Field>

        <div>
          <p className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-lv-secondary">
            Wonach sucht ihr?
          </p>
          <div className="flex flex-wrap gap-2">
            {LOOKING_FOR_OPTIONS.map((o) => {
              const checked = startup.lookingFor.includes(o);
              return (
                <label
                  key={o}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-button border border-lv-border px-3 py-1.5 text-sm has-[:checked]:border-lv-blue has-[:checked]:bg-lv-blue-soft has-[:checked]:text-lv-blue"
                >
                  <input
                    type="checkbox"
                    name="lookingFor"
                    value={o}
                    defaultChecked={checked}
                    className="h-3.5 w-3.5 accent-lv-blue"
                  />
                  {o}
                </label>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex items-center gap-3 rounded-card border border-lv-border p-4">
            <input
              type="checkbox"
              name="seekingFunding"
              defaultChecked={startup.seekingFunding}
              onChange={(e) => setSeekingFunding(e.target.checked)}
              className="h-4 w-4 accent-lv-blue"
            />
            <span className="text-sm font-medium text-lv-text">
              Wir sammeln gerade Kapital ein
            </span>
          </label>
          <Field label="Ziel-Runde (Mio. €)" htmlFor="seekingAmount">
            <Input
              id="seekingAmount"
              name="seekingAmount"
              type="number"
              step="0.1"
              min={0}
              disabled={!seekingFunding}
              defaultValue={startup.seekingAmount ?? ""}
              placeholder="z. B. 5"
            />
          </Field>
        </div>

        {state?.error && <ErrorChip>{state.error}</ErrorChip>}
        {state?.success && <SuccessChip>{state.success}</SuccessChip>}
        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending ? "Speichern…" : "Storefront speichern"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
