import type { Metadata } from "next";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { SignupForm } from "@/components/auth/SignupForm";

export const metadata: Metadata = { title: "Startup sign up" };

export default function StartupSignupPage() {
  return (
    <AuthLayout
      headline={["Show your tech.", "Win pilots.", "Grow faster."]}
      subline="Apply to corporate innovation challenges and turn your product into funded Proof-of-Concepts."
    >
      <SignupForm kind="startup" />
    </AuthLayout>
  );
}
