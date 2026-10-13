"use client";

import { useActionState } from "react";
import { resetPassword } from "@/app/actions/auth";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorChip, Field, Input } from "@/components/ui/Field";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(resetPassword, undefined);

  return (
    <Card className="p-8">
      <p className="lv-wordmark text-xs text-lv-blue">Neues Passwort</p>
      <h2 className="mt-2 text-2xl font-bold tracking-tight">
        Passwort festlegen
      </h2>
      <p className="mt-1 text-sm text-lv-secondary">
        Lege jetzt dein neues Passwort fest. Danach kannst du dich damit
        anmelden.
      </p>

      <form action={formAction} className="mt-6 space-y-4">
        <input type="hidden" name="token" value={token} />
        <Field
          label="Neues Passwort"
          htmlFor="password"
          hint="Mindestens 8 Zeichen."
        >
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </Field>
        <Field label="Passwort bestätigen" htmlFor="confirm">
          <Input
            id="confirm"
            name="confirm"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </Field>
        {state?.error && <ErrorChip>{state.error}</ErrorChip>}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Wird gespeichert…" : "Passwort speichern"}
        </Button>
      </form>
    </Card>
  );
}
