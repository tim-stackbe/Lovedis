import { ArrowRightIcon, CreditsIcon } from "@/components/icons/lovedis";
import Link from "next/link";
import type { Metadata } from "next";
import { CreditBudgetBreakdown } from "@/components/credits/CreditBudgetBreakdown";
import { HubContent } from "@/components/ssot/HubContent";
import { PreviewBanner } from "@/components/shared/PreviewBanner";
import { Card } from "@/components/ui/Card";
import { PictogramChip } from "@/components/ui/PictogramChip";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { requireVentureView } from "@/lib/auth-guards";
import { deriveCreditBudget } from "@/lib/credit-buckets";
import { prisma } from "@/lib/prisma";
import { isTeamRole } from "@/lib/roles";
import { audiencesForRole, getHubContent } from "@/lib/ssot";

export const metadata: Metadata = { title: "Venture Platform" };

export default async function VenturePage() {
  const session = await requireVentureView();
  const teamMode = isTeamRole(session.user.role);

  const [startup, hub] = await Promise.all([
    prisma.startup.findUnique({
      where: { ownerUserId: session.user.id },
      select: {
        creditAccount: {
          select: { balance: true, fixBalance: true, flexBalance: true },
        },
      },
    }),
    // In the team preview, pin to the startup audience slice (STARTUP + BOTH)
    // for a faithful "Startup-Sicht", like partner-hub does for its preview.
    getHubContent(
      teamMode ? ["STARTUP", "BOTH"] : audiencesForRole(session.user.role)
    ),
  ]);

  const budget = deriveCreditBudget(startup?.creditAccount);

  return (
    <>
      <HeroBanner
        kicker="Venture Platform"
        title="Deine Accelerator Übersicht"
        subtitle="Roadmap, Ressourcen und dein Venture-Guthaben — deine Single Source of Truth für die Zusammenarbeit mit Lovedis."
      />

      {teamMode && (
        <PreviewBanner>
          Startup-Sicht auf die Venture Platform. Das Guthaben unten ist die
          persönliche Startup-Ansicht (für dein Team-Konto leer). Guthaben
          vergibst und verwaltest du unter{" "}
          <Link
            href="/credits"
            className="font-semibold underline underline-offset-2"
          >
            Venture-Credits
          </Link>
          .
        </PreviewBanner>
      )}

      <SectionLabel number="01" label="Guthaben" title="Venture-Credits" />
      <Card className="flex flex-wrap items-center justify-between gap-4 p-6">
        <div className="flex items-center gap-4">
          <PictogramChip icon={CreditsIcon} tone="info" size="lg" />
          <div>
            <p className="text-3xl font-bold tracking-tight text-lv-text">
              {budget.remaining}{" "}
              <span className="text-lg font-semibold text-lv-secondary">
                von {budget.total}
              </span>
            </p>
            <p className="text-sm text-lv-secondary">Guthaben verfügbar</p>
            <CreditBudgetBreakdown budget={budget} className="mt-1" />
          </div>
        </div>
        <Link
          href="/venture/credits"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-lv-blue hover:underline"
        >
          Historie ansehen
          <ArrowRightIcon className="h-4 w-4" />
        </Link>
      </Card>

      <HubContent
        roadmap={hub.roadmap}
        pages={hub.pages}
        media={hub.media}
        knowledge={hub.knowledge}
      />
    </>
  );
}
