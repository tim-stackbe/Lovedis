import type { Metadata } from "next";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { OfferingForm } from "@/components/venture-store-editor/OfferingForm";
import { requireAdmin } from "@/lib/auth-guards";
import { BackToEditor } from "@/components/venture-store-editor/BackToEditor";

export const metadata: Metadata = { title: "Neues Support-Angebot" };

export default async function NewOfferingPage() {
  await requireAdmin();
  return (
    <>
      <BackToEditor />
      <HeroBanner
        kicker="Venture Store Editor"
        title="Neues Support-Angebot"
        subtitle="Neue Angebote werden am Ende ihrer Kategorie einsortiert."
      />
      <OfferingForm />
    </>
  );
}
