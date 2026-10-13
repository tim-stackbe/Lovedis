import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { LinkButton } from "@/components/ui/Button";
import { EditorDeleteButton } from "@/components/venture-store-editor/EditorActions";
import { ProgramForm } from "@/components/venture-store-editor/ProgramForm";
import { requireAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { programWorkshops } from "@/lib/program-workshops";
import { workshopToFormRow } from "@/lib/venture-store-editor";
import { BackToEditor } from "@/components/venture-store-editor/BackToEditor";

export const metadata: Metadata = { title: "Programm bearbeiten" };

export default async function EditProgramPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const { created } = await searchParams;
  const [program, bookings] = await Promise.all([
    prisma.program.findUnique({ where: { id } }),
    prisma.marketplaceBooking.count({ where: { programId: id } }),
  ]);
  if (!program) notFound();

  return (
    <>
      <BackToEditor />
      <HeroBanner
        kicker="Venture Store Editor"
        title={program.title}
        subtitle={
          bookings > 0
            ? `${bookings} ${bookings === 1 ? "Anmeldung" : "Anmeldungen"} vorhanden. Änderungen gelten sofort im Venture Store.`
            : "Änderungen gelten sofort im Venture Store."
        }
        actions={
          program.status === "OPEN" ? (
            <LinkButton
              href={`/venture/marketplace/programs/${program.id}`}
              variant="white"
              size="sm"
            >
              Detailseite ansehen
            </LinkButton>
          ) : undefined
        }
      />
      <ProgramForm
        program={program}
        workshops={programWorkshops(program).map(workshopToFormRow)}
        createdNotice={created === "1"}
      />
      <Card className="p-6">
        <EditorDeleteButton kind="program" id={program.id} title={program.title} />
      </Card>
    </>
  );
}
