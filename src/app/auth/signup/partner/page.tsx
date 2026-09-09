import type { Metadata } from "next";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { SignupForm } from "@/components/auth/SignupForm";

export const metadata: Metadata = { title: "Partner-Registrierung" };

export default function PartnerSignupPage() {
  return (
    <AuthLayout
      headline={["Kuratiert screenen.", "Schnell entscheiden.", "Dranbleiben."]}
      subline="Erhalte vom Lovedis-Team vorsortierte Startups, gib schnelle Verdikte ab und verfolge Check-ins — gebündelt im Partner-Hub."
    >
      <SignupForm kind="partner" />
    </AuthLayout>
  );
}
