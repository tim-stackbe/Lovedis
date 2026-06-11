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

export const metadata: Metadata = { title: "My applications" };

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
        kicker="Opportunities"
        title="My applications"
        subtitle={`${applications.length} submitted · ${accepted} accepted`}
        actions={
          <LinkButton href="/challenges" variant="white">
            Browse challenges
          </LinkButton>
        }
      />

      <SectionLabel number="01" label="Applications" title="Status overview" />

      {applications.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No applications yet"
          description="Browse open challenges and submit your first pitch."
          action={<LinkButton href="/challenges">Open challenges</LinkButton>}
        />
      ) : (
        <TableCard>
          <THead>
            <tr>
              <Th>Challenge</Th>
              <Th>Partner</Th>
              <Th>Pitch</Th>
              <Th>Submitted</Th>
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
