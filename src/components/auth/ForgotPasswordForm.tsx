"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset } from "@/app/actions/auth";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorChip, Field, Input, SuccessChip } from "@/components/ui/Field";

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(
    requestPasswordReset,
    undefined
  );

  return (
    <Card className="p-8">
      <p className="lv-wordmark text-xs text-lv-blue">Passwort vergessen</p>
      <h2 className="mt-2 text-2xl font-bold tracking-tight">
        Passwort zurücksetzen
      </h2>
      <p className="mt-1 text-sm text-lv-secondary">
        Gib deine E-Mail-Adresse ein. Wenn ein Konto existiert, senden wir dir
        einen Link zum Zurücksetzen deines Passworts.
      </p>

      <form action={formAction} className="mt-6 space-y-4">
        <Field label="E-Mail" htmlFor="email">
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="du@firma.de"
            autoComplete="email"
            required
          />
        </Field>
        {state?.error && <ErrorChip>{state.error}</ErrorChip>}
        {state?.success && <SuccessChip>{state.success}</SuccessChip>}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Wird gesendet…" : "Link anfordern"}
        </Button>
      </form>

      <div className="mt-6 border-t border-lv-border pt-5 text-center text-sm text-lv-secondary">
        <Link
          href="/login"
          className="font-semibold text-lv-blue hover:underline"
        >
          Zurück zur Anmeldung
        </Link>
      </div>
    </Card>
  );
}
