"use client";

import Link from "next/link";
import { useActionState } from "react";
import { acceptInvitation } from "@/app/actions/companies";
import type { InvitationView } from "@/app/actions/companies";
import { Button, LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorChip, Field, Input, SuccessChip } from "@/components/ui/Field";
import { COMPANY_ROLE_LABELS } from "@/lib/company-roles";

/**
 * Client form for accepting a company invitation. When the invited email has no
 * account yet it collects a name + password (account creation); when an account
 * exists it just confirms the join. On success it points the user to /login.
 */
export function AcceptInviteForm({
  token,
  invitation,
}: {
  token: string;
  invitation: InvitationView;
}) {
  const [state, formAction, pending] = useActionState(
    acceptInvitation,
    undefined
  );
  const done = Boolean(state?.success);
  const needsAccount = !invitation.accountExists;

  return (
    <Card className="p-8">
      <p className="lv-wordmark text-xs text-lv-blue">Einladung</p>
      <h2 className="mt-2 text-2xl font-bold tracking-tight">
        {invitation.companyName}
      </h2>
      <p className="mt-1 text-sm text-lv-secondary">
        Du wurdest als{" "}
        <span className="font-semibold text-lv-text">
          {COMPANY_ROLE_LABELS[invitation.role]}
        </span>{" "}
        zum Team von {invitation.companyName} eingeladen.
      </p>
      <p className="mt-1 text-sm text-lv-secondary">
        Eingeladene E-Mail:{" "}
        <span className="font-medium text-lv-text">{invitation.email}</span>
      </p>

      {done ? (
        <div className="mt-6 space-y-4">
          <SuccessChip>{state?.success}</SuccessChip>
          <LinkButton href="/login" className="w-full">
            Zur Anmeldung
          </LinkButton>
        </div>
      ) : (
        <form action={formAction} className="mt-6 space-y-4">
          <input type="hidden" name="token" value={token} />
          {needsAccount && (
            <>
              <Field label="Vollständiger Name" htmlFor="name">
                <Input id="name" name="name" placeholder="Jane Doe" required />
              </Field>
              <Field
                label="Passwort"
                htmlFor="password"
                hint="Mindestens 8 Zeichen."
              >
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
            </>
          )}
          {!needsAccount && (
            <p className="text-sm text-lv-secondary">
              Für diese E-Mail besteht bereits ein Konto. Nimm die Einladung an,
              um dem Unternehmen beizutreten.
            </p>
          )}
          {state?.error && <ErrorChip>{state.error}</ErrorChip>}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending
              ? "Wird verarbeitet…"
              : needsAccount
                ? "Konto erstellen & beitreten"
                : "Einladung annehmen"}
          </Button>
        </form>
      )}

      <div className="mt-6 border-t border-lv-border pt-5 text-center text-sm text-lv-secondary">
        Schon ein Konto?{" "}
        <Link href="/login" className="font-semibold text-lv-blue hover:underline">
          Anmelden
        </Link>
      </div>
    </Card>
  );
}
