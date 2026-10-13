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
import { isTeamRole } from "@/lib/roles";
import { formatDate, truncate } from "@/lib/utils";

export const metadata: Metadata = { title: "Meine Bewerbungen" };

export default async function ApplicationsPage() {
  const session = await requireRole(["STARTUP", "ADMIN", "MEMBER"]);

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

  // This page is the STARTUP-owned "Meine Bewerbungen" view: it resolves the
  // startup by `ownerUserId`, so the internal team (who has no Startup row)
  // legitimately sees nothing here. Rather than leave them on a dead end, point
  // them at the cross-challenge overview that actually answers their question.
  const isTeamPreview = isTeamRole(session.user.role);

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

      {applications.length === 0 && isTeamPreview ? (
        <EmptyState
          icon={Building2}
          title="Startup-Sicht ohne eigenes Startup"
          description="Diese Seite zeigt die Bewerbungen des eingeloggten Startups — als Team hast du keine. Alle Bewerbungen aller Startups liegen in der Challenge-Bewerbungen-Übersicht."
          action={
            <LinkButton href="/challenge-applications">
              Alle Challenge-Bewerbungen
            </LinkButton>
          }
        />
      ) : applications.length === 0 ? (
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
