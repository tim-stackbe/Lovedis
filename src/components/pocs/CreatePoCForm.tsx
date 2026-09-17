"use client";

import { useActionState, useState } from "react";
import { createPoC } from "@/app/actions/pocs";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  ErrorChip,
  Field,
  Input,
  Select,
  SuccessChip,
} from "@/components/ui/Field";

export interface ApplicationOption {
  id: string;
  label: string;
  /** The challenge's owning partner — pre-selected as the default tracker. */
  defaultTrackerId: string | null;
  /** Suggested title, consistent with the historic `PoC — …` format. */
  defaultTitle: string;
}

export interface TrackerOption {
  id: string;
  label: string;
}

/**
 * ADMIN-only control to open a PoC for an ACCEPTED application that does not yet
 * have one. Purely the affordance — `createPoC` re-validates
 * `requireRole(["ADMIN"])` and the ACCEPTED/duplicate rules server-side.
 *
 * The tracker defaults to the challenge's owning partner (the historic
 * auto-create behaviour) when that partner is an eligible tracker; the admin
 * may pick any active partner/investor instead. The title pre-fills with the
 * `PoC — <startup> × <challenge>` default and stays editable.
 */
export function CreatePoCForm({
  applications,
  trackers,
}: {
  applications: ApplicationOption[];
  trackers: TrackerOption[];
}) {
  const [state, formAction, pending] = useActionState(createPoC, undefined);

  const firstApp = applications[0]!;
  const [applicationId, setApplicationId] = useState(firstApp.id);
  const initialTracker =
    firstApp.defaultTrackerId &&
    trackers.some((t) => t.id === firstApp.defaultTrackerId)
      ? firstApp.defaultTrackerId
      : "";
  const [trackerId, setTrackerId] = useState(initialTracker);
  const [title, setTitle] = useState(firstApp.defaultTitle);

  const onApplicationChange = (id: string) => {
    setApplicationId(id);
    const app = applications.find((a) => a.id === id);
    if (!app) return;
    setTitle(app.defaultTitle);
    if (app.defaultTrackerId && trackers.some((t) => t.id === app.defaultTrackerId)) {
      setTrackerId(app.defaultTrackerId);
    }
  };

  return (
    <Card className="p-6 sm:p-8">
      <form action={formAction} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Angenommene Bewerbung" htmlFor="poc-application">
            <Select
              id="poc-application"
              name="applicationId"
              required
              value={applicationId}
              onChange={(e) => onApplicationChange(e.target.value)}
            >
              {applications.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Tracker:in" htmlFor="poc-tracker">
            <Select
              id="poc-tracker"
              name="trackerId"
              required
              value={trackerId}
              onChange={(e) => setTrackerId(e.target.value)}
            >
              <option value="" disabled>
                Partner oder Investor wählen…
              </option>
              {trackers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Titel" htmlFor="poc-create-title">
          <Input
            id="poc-create-title"
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </Field>
        {state?.error && <ErrorChip>{state.error}</ErrorChip>}
        {state?.success && <SuccessChip>{state.success}</SuccessChip>}
        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending ? "Anlegen…" : "PoC anlegen"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
