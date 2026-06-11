import { BarChart3 } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { RecommendationBadge, ScorePill } from "@/components/shared/badges";
import { EmptyState } from "@/components/ui/EmptyState";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { TableCard, Td, Th, THead, Tr } from "@/components/ui/Table";
import { requireRole } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Shared scorings" };

export default async function ScoringsPage() {
  const session = await requireRole(["BUSINESS_PARTNER", "INVESTOR"]);

  const shares = await prisma.sharedScoring.findMany({
    where: { recipientId: session.user.id },
    include: {
      evaluation: {
        include: { startup: { select: { name: true, industry: true } } },
      },
      sharedBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <HeroBanner
        kicker="Collaboration"
        title="Shared scorings"
        subtitle="Evaluations the scouting team has shared with you — read-only, always up to date."
      />

      <SectionLabel
        number="01"
        label="Scorings"
        title={`${shares.length} shared with you`}
      />

      {shares.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="Nothing shared yet"
          description="When the scouting team shares an evaluation with you, it appears here."
        />
      ) : (
        <TableCard>
          <THead>
            <tr>
              <Th>Startup</Th>
              <Th>Shared by</Th>
              <Th>Shared</Th>
              <Th>Recommendation</Th>
              <Th className="text-right">Score</Th>
            </tr>
          </THead>
          <tbody>
            {shares.map((s) => (
              <Tr key={s.id}>
                <Td>
                  <Link
                    href={`/scorings/${s.id}`}
                    className="font-semibold hover:text-lv-blue"
                  >
                    {s.evaluation.startup.name}
                  </Link>
                  <p className="text-xs text-lv-secondary">
                    {s.evaluation.startup.industry}
                  </p>
                </Td>
                <Td className="text-lv-secondary">{s.sharedBy.name}</Td>
                <Td className="text-lv-secondary">{formatDate(s.createdAt)}</Td>
                <Td>
                  <RecommendationBadge value={s.evaluation.recommendation} />
                </Td>
                <Td className="text-right">
                  <ScorePill score={s.evaluation.overallScore} />
                </Td>
              </Tr>
            ))}
          </tbody>
        </TableCard>
      )}
    </>
  );
}
