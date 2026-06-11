"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signupPartner, signupStartup } from "@/app/actions/auth";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorChip, Field, Input, SuccessChip } from "@/components/ui/Field";

interface SignupFormProps {
  kind: "partner" | "startup";
}

const COPY = {
  partner: {
    kicker: "Business Partner",
    title: "Partner-Konto erstellen",
    description:
      "Stelle Innovations-Challenges, prüfe Startup-Bewerbungen und tracke Proof-of-Concepts.",
    companyLabel: "Unternehmen",
    companyPlaceholder: "ACME Industries GmbH",
  },
  startup: {
    kicker: "Startup",
    title: "Startup-Konto erstellen",
    description:
      "Baue dein Profil auf, entdecke offene Challenges und bewirb dich direkt.",
    companyLabel: "Startup-Name",
    companyPlaceholder: "Quantum Robotics",
  },
};

export function SignupForm({ kind }: SignupFormProps) {
  const action = kind === "partner" ? signupPartner : signupStartup;
  const [state, formAction, pending] = useActionState(action, undefined);
  const copy = COPY[kind];

  return (
    <Card className="p-8">
      <p className="lv-wordmark text-xs text-lv-blue">{copy.kicker}</p>
      <h2 className="mt-2 text-2xl font-bold tracking-tight">{copy.title}</h2>
      <p className="mt-1 text-sm text-lv-secondary">{copy.description}</p>

      <form action={formAction} className="mt-6 space-y-4">
        <Field label="Vollständiger Name" htmlFor="name">
          <Input id="name" name="name" placeholder="Jane Doe" required />
        </Field>
        <Field label={copy.companyLabel} htmlFor="company">
          <Input
            id="company"
            name="company"
            placeholder={copy.companyPlaceholder}
          />
        </Field>
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
        <Field label="Passwort" htmlFor="password" hint="Mindestens 8 Zeichen.">
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            required
            minLength={8}
          />
        </Field>
        {state?.error && <ErrorChip>{state.error}</ErrorChip>}
        {state?.success && <SuccessChip>{state.success}</SuccessChip>}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Konto wird erstellt…" : "Konto erstellen"}
        </Button>
      </form>

      <div className="mt-6 border-t border-lv-border pt-5 text-center text-sm text-lv-secondary">
        Du hast schon ein Konto?{" "}
        <Link href="/login" className="font-semibold text-lv-blue hover:underline">
          Anmelden
        </Link>
      </div>
    </Card>
  );
}
