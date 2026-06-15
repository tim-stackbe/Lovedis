"use client";

import { useActionState } from "react";
import { upsertOwnStartupProfile } from "@/app/actions/startups";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  ErrorChip,
  Field,
  Input,
  Select,
  SuccessChip,
  Textarea,
} from "@/components/ui/Field";
import type { StartupModel as Startup } from "@/generated/prisma/models";
import {
  INDUSTRIES,
  STARTUP_STAGES,
  STARTUP_STAGE_LABELS,
} from "@/lib/constants";

export function OwnProfileForm({ startup }: { startup: Startup | null }) {
  const [state, formAction, pending] = useActionState(
    upsertOwnStartupProfile,
    undefined
  );

  return (
    <Card className="p-6 sm:p-8">
      <form action={formAction} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Startup-Name" htmlFor="name">
            <Input
              id="name"
              name="name"
              defaultValue={startup?.name}
              placeholder="Quantum Robotics"
              required
            />
          </Field>
          <Field label="Website" htmlFor="website">
            <Input
              id="website"
              name="website"
              type="url"
              defaultValue={startup?.website ?? ""}
              placeholder="https://example.com"
            />
          </Field>
        </div>
        <Field label="Was macht ihr?" htmlFor="description">
          <Textarea
            id="description"
            name="description"
            defaultValue={startup?.description}
            placeholder="Beschreibe euer Produkt, eure Kunden und eure Traktion…"
            required
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Branche" htmlFor="industry">
            <Input
              id="industry"
              name="industry"
              list="profile-industries"
              defaultValue={startup?.industry}
              required
            />
            <datalist id="profile-industries">
              {INDUSTRIES.map((i) => (
                <option key={i} value={i} />
              ))}
            </datalist>
          </Field>
          <Field label="Land" htmlFor="country">
            <Input
              id="country"
              name="country"
              defaultValue={startup?.country ?? ""}
            />
          </Field>
          <Field label="Stadt" htmlFor="city">
            <Input id="city" name="city" defaultValue={startup?.city ?? ""} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="Gegründet" htmlFor="foundedYear">
            <Input
              id="foundedYear"
              name="foundedYear"
              type="number"
              min={1900}
              max={2100}
              defaultValue={startup?.foundedYear ?? ""}
            />
          </Field>
          <Field label="Teamgröße" htmlFor="teamSize">
            <Input
              id="teamSize"
              name="teamSize"
              type="number"
              min={1}
              defaultValue={startup?.teamSize ?? ""}
            />
          </Field>
          <Field label="Finanzierung (Mio. €)" htmlFor="fundingRaised">
            <Input
              id="fundingRaised"
              name="fundingRaised"
              type="number"
              step="0.1"
              min={0}
              defaultValue={startup?.fundingRaised ?? ""}
            />
          </Field>
          <Field label="Phase" htmlFor="stage">
            <Select
              id="stage"
              name="stage"
              defaultValue={startup?.stage ?? "SEED"}
            >
              {STARTUP_STAGES.map((s) => (
                <option key={s} value={s}>
                  {STARTUP_STAGE_LABELS[s]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        {state?.error && <ErrorChip>{state.error}</ErrorChip>}
        {state?.success && <SuccessChip>{state.success}</SuccessChip>}
        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending ? "Speichern…" : "Profil speichern"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
