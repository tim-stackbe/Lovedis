"use client";

import { useActionState } from "react";
import { createChallenge, updateChallenge } from "@/app/actions/challenges";
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
import type { ChallengeModel as Challenge } from "@/generated/prisma/models";
import {
  CHALLENGE_STATUSES,
  CHALLENGE_STATUS_LABELS,
} from "@/lib/constants";

export function ChallengeForm({ challenge }: { challenge?: Challenge }) {
  const action = challenge
    ? updateChallenge.bind(null, challenge.id)
    : createChallenge;
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <Card className="p-6 sm:p-8">
      <form action={formAction} className="space-y-5">
        <Field label="Title" htmlFor="title">
          <Input
            id="title"
            name="title"
            defaultValue={challenge?.title}
            placeholder="Predictive maintenance for production lines"
            required
          />
        </Field>
        <Field label="Description" htmlFor="description">
          <Textarea
            id="description"
            name="description"
            defaultValue={challenge?.description}
            className="min-h-36"
            placeholder="Describe the problem, the context and what a successful pilot looks like…"
            required
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Status" htmlFor="status">
            <Select
              id="status"
              name="status"
              defaultValue={challenge?.status ?? "DRAFT"}
            >
              {CHALLENGE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {CHALLENGE_STATUS_LABELS[s]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Deadline" htmlFor="deadline">
            <Input
              id="deadline"
              name="deadline"
              type="date"
              defaultValue={
                challenge?.deadline
                  ? new Date(challenge.deadline).toISOString().slice(0, 10)
                  : ""
              }
            />
          </Field>
          <Field
            label="Tags"
            htmlFor="tags"
            hint="Comma-separated, e.g. AI, IoT"
          >
            <Input
              id="tags"
              name="tags"
              defaultValue={challenge?.tags.join(", ")}
              placeholder="AI, Manufacturing"
            />
          </Field>
        </div>
        {state?.error && <ErrorChip>{state.error}</ErrorChip>}
        {state?.success && <SuccessChip>{state.success}</SuccessChip>}
        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending
              ? "Saving…"
              : challenge
                ? "Save changes"
                : "Create challenge"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
