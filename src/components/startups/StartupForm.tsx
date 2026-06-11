"use client";

import { useActionState } from "react";
import { createStartup, updateStartup } from "@/app/actions/startups";
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
  PIPELINE_STAGES,
  PIPELINE_STAGE_LABELS,
  RADAR_QUADRANTS,
  RADAR_QUADRANT_LABELS,
  RADAR_RINGS,
  RADAR_RING_LABELS,
  STARTUP_STAGES,
  STARTUP_STAGE_LABELS,
} from "@/lib/constants";

interface StartupFormProps {
  startup?: Startup;
}

export function StartupForm({ startup }: StartupFormProps) {
  const action = startup
    ? updateStartup.bind(null, startup.id)
    : createStartup;
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <Card className="p-6 sm:p-8">
      <form action={formAction} className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Firmenname" htmlFor="name">
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

        <Field label="Beschreibung" htmlFor="description">
          <Textarea
            id="description"
            name="description"
            defaultValue={startup?.description}
            placeholder="Was macht das Startup, für wen – und warum jetzt?"
            required
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Branche" htmlFor="industry">
            <Input
              id="industry"
              name="industry"
              list="industries"
              defaultValue={startup?.industry}
              placeholder="Climate Tech"
              required
            />
            <datalist id="industries">
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
              placeholder="Deutschland"
            />
          </Field>
          <Field label="Stadt" htmlFor="city">
            <Input
              id="city"
              name="city"
              defaultValue={startup?.city ?? ""}
              placeholder="Berlin"
            />
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
              placeholder="2021"
            />
          </Field>
          <Field label="Teamgröße" htmlFor="teamSize">
            <Input
              id="teamSize"
              name="teamSize"
              type="number"
              min={1}
              defaultValue={startup?.teamSize ?? ""}
              placeholder="12"
            />
          </Field>
          <Field label="Funding (Mio. €)" htmlFor="fundingRaised">
            <Input
              id="fundingRaised"
              name="fundingRaised"
              type="number"
              step="0.1"
              min={0}
              defaultValue={startup?.fundingRaised ?? ""}
              placeholder="2.5"
            />
          </Field>
          <Field label="Stage" htmlFor="stage">
            <Select id="stage" name="stage" defaultValue={startup?.stage ?? "SEED"}>
              {STARTUP_STAGES.map((s) => (
                <option key={s} value={s}>
                  {STARTUP_STAGE_LABELS[s]}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Pipeline-Phase" htmlFor="pipelineStage">
            <Select
              id="pipelineStage"
              name="pipelineStage"
              defaultValue={startup?.pipelineStage ?? "DISCOVERED"}
            >
              {PIPELINE_STAGES.map((s) => (
                <option key={s} value={s}>
                  {PIPELINE_STAGE_LABELS[s]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Radar-Quadrant" htmlFor="radarQuadrant">
            <Select
              id="radarQuadrant"
              name="radarQuadrant"
              defaultValue={startup?.radarQuadrant ?? ""}
            >
              <option value="">— Nicht im Radar —</option>
              {RADAR_QUADRANTS.map((q) => (
                <option key={q} value={q}>
                  {RADAR_QUADRANT_LABELS[q]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Radar-Ring" htmlFor="radarRing">
            <Select
              id="radarRing"
              name="radarRing"
              defaultValue={startup?.radarRing ?? ""}
            >
              <option value="">— Keiner —</option>
              {RADAR_RINGS.map((r) => (
                <option key={r} value={r}>
                  {RADAR_RING_LABELS[r]}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {state?.error && <ErrorChip>{state.error}</ErrorChip>}
        {state?.success && <SuccessChip>{state.success}</SuccessChip>}

        <div className="flex justify-end gap-3">
          <Button type="submit" disabled={pending}>
            {pending
              ? "Speichern…"
              : startup
                ? "Änderungen speichern"
                : "Startup anlegen"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
