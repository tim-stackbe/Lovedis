"use client";

import { useActionState } from "react";
import { changeOwnPassword, updateOwnProfile } from "@/app/actions/users";
import { Button } from "@/components/ui/Button";
import {
  ErrorChip,
  Field,
  Input,
  SuccessChip,
} from "@/components/ui/Field";

export function ProfileForm({
  name,
  email,
  company,
}: {
  name: string;
  email: string;
  company: string;
}) {
  const [state, formAction, pending] = useActionState(
    updateOwnProfile,
    undefined
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="settings-name">
          <Input
            id="settings-name"
            name="name"
            defaultValue={name}
            required
          />
        </Field>
        <Field label="E-Mail" htmlFor="settings-email">
          <Input id="settings-email" value={email} disabled />
        </Field>
      </div>
      <Field label="Unternehmen" htmlFor="settings-company">
        <Input id="settings-company" name="company" defaultValue={company} />
      </Field>
      {state?.error && <ErrorChip>{state.error}</ErrorChip>}
      {state?.success && <SuccessChip>{state.success}</SuccessChip>}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}

export function PasswordForm() {
  const [state, formAction, pending] = useActionState(
    changeOwnPassword,
    undefined
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Current password" htmlFor="current-password">
          <Input
            id="current-password"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
          />
        </Field>
        <Field label="New password" htmlFor="new-password-field">
          <Input
            id="new-password-field"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
          />
        </Field>
      </div>
      {state?.error && <ErrorChip>{state.error}</ErrorChip>}
      {state?.success && <SuccessChip>{state.success}</SuccessChip>}
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Updating…" : "Change password"}
      </Button>
    </form>
  );
}
