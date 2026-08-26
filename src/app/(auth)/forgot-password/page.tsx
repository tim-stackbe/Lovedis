import type { Metadata } from "next";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = { title: "Passwort zurücksetzen" };

export default function ForgotPasswordPage() {
  return (
    <AuthLayout
      headline={["Kein Problem.", "Zurücksetzen.", "Weitermachen."]}
      subline="Wir schicken dir einen sicheren Link, mit dem du dein Passwort neu festlegen kannst."
    >
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
