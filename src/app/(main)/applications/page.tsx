import { Building2 } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { ApplicationStatusBadge } from "@/components/shared/badges";
import { LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { TableCard, Td, Th, THead, Tr } from "@/components/ui/Table";
import { requireRole } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { formatDate, truncate } from "@/lib/utils";

export const metadata: Metadata = { title: "Meine Bewerbungen" };

export default async function ApplicationsPage() {
  const session = await requireRole(["STARTUP"]);

  const startup = await prisma.startup.findUnique({
    where: { ownerUserId: session.user.id },
    select: {
      applications: {
        include: {
          challenge: {
            select: {
              id: true,
              title: true,
              createdBy: { select: { name: true, company: true } },
            },
          },
          poc: { select: { id: true, status: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  const applications = startup?.applications ?? [];
  const accepted = applications.filter((a) => a.status === "ACCEPTED").length;

  return (
    <>
      <HeroBanner
        kicker="Chancen"
        title="Meine Bewerbungen"
        subtitle={`${applications.length} eingereicht · ${accepted} angenommen`}
        actions={
          <LinkButton href="/challenges" variant="white">
            Challenges entdecken
          </LinkButton>
        }
      />

      <SectionLabel number="01" label="Bewerbungen" title="Status-Überblick" />

      {applications.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Noch keine Bewerbungen"
          description="Entdecke offene Challenges und reiche deinen ersten Pitch ein."
          action={<LinkButton href="/challenges">Offene Challenges</LinkButton>}
        />
      ) : (
        <TableCard>
          <THead>
            <tr>
              <Th>Challenge</Th>
              <Th>Partner</Th>
              <Th>Pitch</Th>
              <Th>Eingereicht</Th>
              <Th className="text-right">Status</Th>
            </tr>
          </THead>
          <tbody>
            {applications.map((a) => (
              <Tr key={a.id}>
                <Td>
                  <Link
                    href={`/challenges/${a.challenge.id}`}
                    className="font-semibold hover:text-lv-blue"
                  >
                    {a.challenge.title}
                  </Link>
                </Td>
                <Td className="text-lv-secondary">
                  {a.challenge.createdBy.company ?? a.challenge.createdBy.name}
                </Td>
                <Td className="text-lv-secondary">{truncate(a.pitch, 60)}</Td>
                <Td className="text-lv-secondary">{formatDate(a.createdAt)}</Td>
                <Td className="text-right">
                  <ApplicationStatusBadge value={a.status} />
                </Td>
              </Tr>
            ))}
          </tbody>
        </TableCard>
      )}
    </>
  );
}
