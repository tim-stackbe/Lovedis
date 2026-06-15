import { Share2, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import { revokeSharedScoring } from "@/app/actions/sharing";
import { ScorePill } from "@/components/shared/badges";
import {
  ShareForm,
  type ShareOptionEvaluation,
  type ShareOptionRecipient,
} from "@/components/sharing/ShareForm";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { TableCard, Td, Th, THead, Tr } from "@/components/ui/Table";
import { requireRole } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { ROLE_LABELS } from "@/lib/roles";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Geteilte Scorings" };

export default async function SharingPage() {
  await requireRole(["ADMIN"]);

  const [shares, evaluations, recipients] = await Promise.all([
    prisma.sharedScoring.findMany({
      include: {
        evaluation: {
          include: { startup: { select: { name: true } } },
        },
        recipient: { select: { name: true, role: true, company: true } },
        sharedBy: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.evaluation.findMany({
      include: {
        startup: { select: { name: true } },
        evaluator: { select: { name: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.user.findMany({
      where: {
        role: { in: ["BUSINESS_PARTNER", "INVESTOR"] },
        isActive: true,
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const evaluationOptions: ShareOptionEvaluation[] = evaluations.map((e) => ({
    id: e.id,
    label: `${e.startup.name} — ${e.overallScore.toFixed(1)}/5 (${e.evaluator.name})`,
  }));
  const recipientOptions: ShareOptionRecipient[] = recipients.map((r) => ({
    id: r.id,
    label: `${r.name}${r.company ? ` · ${r.company}` : ""} (${ROLE_LABELS[r.role]})`,
  }));

  return (
    <>
      <HeroBanner
        kicker="Plattform"
        title="Scorings teilen"
        subtitle="Gib Partnern und Investoren Lesezugriff auf ausgewählte Bewertungen."
      />

      <section className="space-y-4">
        <SectionLabel number="01" label="Teilen" title="Neue Freigabe" />
        <Card className="p-6">
          <ShareForm
            evaluations={evaluationOptions}
            recipients={recipientOptions}
          />
        </Card>
      </section>

      <section className="space-y-4">
        <SectionLabel
          number="02"
          label="Aktiv"
          title={`Aktive Freigaben (${shares.length})`}
        />
        {shares.length === 0 ? (
          <EmptyState
            icon={Share2}
            title="Keine geteilten Scorings"
            description="Teile oben eine Bewertung, um einem Partner oder Investor Zugriff zu geben."
          />
        ) : (
          <TableCard>
            <THead>
              <tr>
                <Th>Startup</Th>
                <Th>Empfänger</Th>
                <Th>Geteilt von</Th>
                <Th>Datum</Th>
                <Th className="text-right">Score</Th>
                <Th className="text-right">Entziehen</Th>
              </tr>
            </THead>
            <tbody>
              {shares.map((s) => (
                <Tr key={s.id}>
                  <Td className="font-semibold">{s.evaluation.startup.name}</Td>
                  <Td>
                    {s.recipient.name}
                    <p className="text-xs text-lv-secondary">
                      {ROLE_LABELS[s.recipient.role]}
                    </p>
                  </Td>
                  <Td className="text-lv-secondary">{s.sharedBy.name}</Td>
                  <Td className="text-lv-secondary">{formatDate(s.createdAt)}</Td>
                  <Td className="text-right">
                    <ScorePill score={s.evaluation.overallScore} />
                  </Td>
                  <Td className="text-right">
                    <form action={revokeSharedScoring.bind(null, s.id)}>
                      <button
                        type="submit"
                        className="rounded-button p-1.5 text-lv-secondary hover:bg-lv-orange-soft hover:text-lv-orange transition-colors"
                        aria-label="Freigabe entziehen"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </form>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </TableCard>
        )}
      </section>
    </>
  );
}
