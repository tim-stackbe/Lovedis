import type { Metadata } from "next";
import { ChallengeForm } from "@/components/challenges/ChallengeForm";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { requireRole } from "@/lib/auth-guards";

export const metadata: Metadata = { title: "New challenge" };

export default async function NewChallengePage() {
  await requireRole(["ADMIN", "BUSINESS_PARTNER"]);
  return (
    <>
      <SectionLabel
        number="01"
        label="Challenges"
        title="Post a new challenge"
      />
      <ChallengeForm />
    </>
  );
}
