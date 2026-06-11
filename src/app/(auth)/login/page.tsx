import type { Metadata } from "next";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  return (
    <AuthLayout
      headline={["Discover.", "Evaluate.", "Partner up."]}
      subline="The scouting workbench for innovation engineers — from first signal to signed Proof-of-Concept."
    >
      <LoginForm callbackUrl={callbackUrl} />
    </AuthLayout>
  );
}
