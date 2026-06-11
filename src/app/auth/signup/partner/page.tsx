import type { Metadata } from "next";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { SignupForm } from "@/components/auth/SignupForm";

export const metadata: Metadata = { title: "Partner sign up" };

export default function PartnerSignupPage() {
  return (
    <AuthLayout
      headline={["Post challenges.", "Meet startups.", "Build PoCs."]}
      subline="Bring your innovation challenges to a curated pool of evaluated startups."
    >
      <SignupForm kind="partner" />
    </AuthLayout>
  );
}
