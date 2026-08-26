import type { Metadata } from "next";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { ChangePasswordForm } from "@/components/auth/ChangePasswordForm";
import { requireAuth } from "@/lib/auth-guards";

export const metadata: Metadata = { title: "Passwort festlegen" };

export default async function ChangePasswordPage() {
  // Requires a valid session (redirects to /login otherwise). Reachable by any
  // signed-in user; the middleware forces first-login accounts here.
  await requireAuth();
  return (
    <AuthLayout
      headline={["Sicher.", "Persönlich.", "Startklar."]}
      subline="Lege dein eigenes Passwort fest, um deinen Zugang zu aktivieren."
    >
      <ChangePasswordForm />
    </AuthLayout>
  );
}
