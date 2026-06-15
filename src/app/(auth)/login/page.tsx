import type { Metadata } from "next";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "Anmelden" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  return (
    <AuthLayout
      headline={["Entdecken.", "Bewerten.", "Partnern."]}
      subline="Die Scouting-Workbench für Innovation Engineers — vom ersten Signal bis zum unterschriebenen Proof-of-Concept."
    >
      <LoginForm callbackUrl={callbackUrl} />
    </AuthLayout>
  );
}
