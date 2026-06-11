import type { Metadata } from "next";
import { StartupForm } from "@/components/startups/StartupForm";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { requireScoutModule } from "@/lib/auth-guards";

export const metadata: Metadata = { title: "New startup" };

export default async function NewStartupPage() {
  await requireScoutModule();
  return (
    <>
      <SectionLabel
        number="01"
        label="Discover"
        title="Add a startup to the universe"
      />
      <StartupForm />
    </>
  );
}
