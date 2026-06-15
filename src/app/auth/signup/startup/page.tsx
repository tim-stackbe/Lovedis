import type { Metadata } from "next";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { SignupForm } from "@/components/auth/SignupForm";

export const metadata: Metadata = { title: "Startup-Registrierung" };

export default function StartupSignupPage() {
  return (
    <AuthLayout
      headline={["Zeig deine Tech.", "Gewinn Piloten.", "Wachse schneller."]}
      subline="Bewirb dich auf Corporate-Innovations-Challenges und mach aus deinem Produkt finanzierte Proof-of-Concepts."
    >
      <SignupForm kind="startup" />
    </AuthLayout>
  );
}
