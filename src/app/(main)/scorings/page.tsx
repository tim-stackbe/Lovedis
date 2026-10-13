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

export const metadata: Metadata = { title: "Geteilte Scorings" };

export default async function ScoringsPage() {
  const session = await requireRole([
    "BUSINESS_PARTNER",
    "INVESTOR",
    "ADMIN",
    "MEMBER",
  ]);

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
        kicker="Zusammenarbeit"
        title="Geteilte Scorings"
        subtitle="Bewertungen, die das Scouting-Team mit dir geteilt hat — nur lesend, immer aktuell."
      />

      <SectionLabel
        number="01"
        label="Scorings"
        title={`${shares.length} mit dir geteilt`}
      />

      {shares.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="Noch nichts geteilt"
          description="Sobald das Scouting-Team eine Bewertung mit dir teilt, erscheint sie hier."
        />
      ) : (
        <TableCard>
          <THead>
            <tr>
              <Th>Startup</Th>
              <Th>Geteilt von</Th>
              <Th>Geteilt</Th>
              <Th>Empfehlung</Th>
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
