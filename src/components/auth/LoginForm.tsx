"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login } from "@/app/actions/auth";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorChip, Field, Input, SuccessChip } from "@/components/ui/Field";

export function LoginForm({
  callbackUrl,
  resetSuccess = false,
}: {
  callbackUrl?: string;
  resetSuccess?: boolean;
}) {
  const [state, formAction, pending] = useActionState(login, undefined);

  return (
    <Card className="p-8">
      <p className="lv-wordmark text-xs text-lv-blue">Willkommen zurück</p>
      <h2 className="mt-2 text-2xl font-bold tracking-tight">Anmelden</h2>
      <p className="mt-1 text-sm text-lv-secondary">
        Melde dich mit deinem Lovedis-Konto an.
      </p>

      {resetSuccess && (
        <div className="mt-4">
          <SuccessChip>
            Dein Passwort wurde geändert. Bitte melde dich mit deinem neuen
            Passwort an.
          </SuccessChip>
        </div>
      )}

      <form action={formAction} className="mt-6 space-y-4">
        {callbackUrl && (
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
        )}
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
        <Field label="Passwort" htmlFor="password">
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
        </Field>
        {state?.error && <ErrorChip>{state.error}</ErrorChip>}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Anmeldung läuft…" : "Anmelden"}
        </Button>
      </form>

      <div className="mt-4 text-center text-sm">
        <Link
          href="/forgot-password"
          className="font-semibold text-lv-blue hover:underline"
        >
          Passwort vergessen?
        </Link>
      </div>

      <div className="mt-6 border-t border-lv-border pt-5 text-center text-sm text-lv-secondary">
        Neu hier?{" "}
        <Link
          href="/auth/signup/startup"
          className="font-semibold text-lv-blue hover:underline"
        >
          Registriere dich als Startup
        </Link>{" "}
        oder{" "}
        <Link
          href="/auth/signup/partner"
          className="font-semibold text-lv-blue hover:underline"
        >
          als Business Partner
        </Link>
        .
      </div>
    </Card>
  );
}
