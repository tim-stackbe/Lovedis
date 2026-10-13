import type { Metadata } from "next";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "Anmelden" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; reset?: string }>;
}) {
  const { callbackUrl, reset } = await searchParams;
  return (
    <AuthLayout
      headline={["Entdecken.", "Bewerten.", "Partnern."]}
      subline="The LOVEDIS Ecosystem Platform"
    >
      <LoginForm callbackUrl={callbackUrl} resetSuccess={reset === "success"} />
    </AuthLayout>
  );
}
