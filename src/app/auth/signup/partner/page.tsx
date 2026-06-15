import type { Metadata } from "next";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { SignupForm } from "@/components/auth/SignupForm";

export const metadata: Metadata = { title: "Partner-Registrierung" };

export default function PartnerSignupPage() {
  return (
    <AuthLayout
      headline={["Challenges stellen.", "Startups treffen.", "PoCs bauen."]}
      subline="Bring deine Innovations-Challenges zu einem kuratierten Pool bewerteter Startups."
    >
      <SignupForm kind="partner" />
    </AuthLayout>
  );
}
