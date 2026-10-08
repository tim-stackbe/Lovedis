"use client";

import { useActionState } from "react";
import { changePassword } from "@/app/actions/auth";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorChip, Field, Input, SuccessChip } from "@/components/ui/Field";

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changePassword, undefined);

  return (
    <Card className="p-8">
      <p className="lv-wordmark text-xs text-lv-blue">Erster Login</p>
      <h2 className="mt-2 text-2xl font-bold tracking-tight">
        Passwort festlegen
      </h2>
      <p className="mt-1 text-sm text-lv-secondary">
        Dein Konto wurde mit einem temporären Passwort angelegt. Bitte lege jetzt
        dein eigenes Passwort fest, um fortzufahren.
      </p>

      <form action={formAction} className="mt-6 space-y-4">
        <Field label="Neues Passwort" htmlFor="password" hint="Mindestens 8 Zeichen.">
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
        {state?.success && <SuccessChip>{state.success}</SuccessChip>}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Wird gespeichert…" : "Passwort speichern"}
        </Button>
      </form>
    </Card>
  );
}
