import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { LinkButton } from "@/components/ui/Button";
import { EditorDeleteButton } from "@/components/venture-store-editor/EditorActions";
import { OfferingForm } from "@/components/venture-store-editor/OfferingForm";
import { requireAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { BackToEditor } from "@/components/venture-store-editor/BackToEditor";

export const metadata: Metadata = { title: "Support-Angebot bearbeiten" };

export default async function EditOfferingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const { created } = await searchParams;
  const [offering, bookings] = await Promise.all([
    prisma.supportOffering.findUnique({ where: { id } }),
    prisma.marketplaceBooking.count({ where: { offeringId: id } }),
  ]);
  if (!offering) notFound();

  return (
    <>
      <BackToEditor />
      <HeroBanner
        kicker="Venture Store Editor"
        title={offering.title}
        subtitle={
          bookings > 0
            ? `${bookings} ${bookings === 1 ? "Buchung" : "Buchungen"} vorhanden. Änderungen gelten sofort, gebuchte Preise bleiben unverändert.`
            : "Änderungen gelten sofort im Venture Store."
        }
        actions={
          offering.isActive ? (
            <LinkButton
              href={`/venture/marketplace/support/${offering.id}`}
              variant="white"
              size="sm"
            >
              Detailseite ansehen
            </LinkButton>
          ) : undefined
        }
      />
      <OfferingForm offering={offering} createdNotice={created === "1"} />
      <Card className="p-6">
        <EditorDeleteButton kind="offering" id={offering.id} title={offering.title} />
      </Card>
    </>
  );
}
