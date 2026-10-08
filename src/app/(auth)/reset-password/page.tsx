import type { Metadata } from "next";
import Link from "next/link";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { Card } from "@/components/ui/Card";
import { findRedeemableResetToken } from "@/lib/password-reset";

export const metadata: Metadata = { title: "Neues Passwort festlegen" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  // Validate the raw token up front so an invalid/expired link shows a clear
  // message instead of an unusable form. The form re-verifies on submit, so
  // this is purely UX (no security relies on the page-load check alone).
  const valid = token ? await findRedeemableResetToken(token) : null;

  return (
    <AuthLayout
      headline={["Sicher.", "Persönlich.", "Startklar."]}
      subline="Lege dein neues Passwort fest und melde dich anschließend wieder an."
    >
      {valid && token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <Card className="p-8">
          <p className="lv-wordmark text-xs text-lv-blue">Passwort vergessen</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight">
            Link ungültig oder abgelaufen
          </h2>
          <p className="mt-1 text-sm text-lv-secondary">
            Dieser Link zum Zurücksetzen des Passworts ist nicht mehr gültig.
            Links sind aus Sicherheitsgründen nur begrenzt gültig und können nur
            einmal verwendet werden. Bitte fordere einen neuen Link an.
          </p>
          <div className="mt-6 border-t border-lv-border pt-5 text-center text-sm text-lv-secondary">
            <Link
              href="/forgot-password"
              className="font-semibold text-lv-blue hover:underline"
            >
              Neuen Link anfordern
            </Link>
          </div>
        </Card>
      )}
    </AuthLayout>
  );
}
