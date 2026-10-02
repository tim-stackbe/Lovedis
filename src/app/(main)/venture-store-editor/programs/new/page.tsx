import type { Metadata } from "next";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { ProgramForm } from "@/components/venture-store-editor/ProgramForm";
import { requireAdmin } from "@/lib/auth-guards";
import { BackToEditor } from "@/components/venture-store-editor/BackToEditor";

export const metadata: Metadata = { title: "Neues Programm" };

export default async function NewProgramPage() {
  await requireAdmin();
  return (
    <>
      <BackToEditor />
      <HeroBanner
        kicker="Venture Store Editor"
        title="Neues Programm"
        subtitle="Neue Programme starten als Entwurf, bis du den Status auf „Offen“ setzt."
      />
      <ProgramForm workshops={[]} />
    </>
  );
}
