import { ArrowRight, Coins } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { HubContent } from "@/components/ssot/HubContent";
import { Card } from "@/components/ui/Card";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { requireStartup } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { audiencesForRole, getHubContent } from "@/lib/ssot";

export const metadata: Metadata = { title: "Venture Platform" };

export default async function VenturePage() {
  const session = await requireStartup();

  const [startup, hub] = await Promise.all([
    prisma.startup.findUnique({
      where: { ownerUserId: session.user.id },
      select: { creditAccount: { select: { balance: true } } },
    }),
    getHubContent(audiencesForRole(session.user.role)),
  ]);

  const balance = startup?.creditAccount?.balance ?? 0;

  return (
    <>
      <HeroBanner
        kicker="Venture Platform"
        title="Deine Venture Platform"
        subtitle="Roadmap, Ressourcen und dein Venture-Guthaben — deine Single Source of Truth für die Zusammenarbeit mit Lovedis."
      />

      <SectionLabel number="01" label="Guthaben" title="Venture-Credits" />
      <Card className="flex flex-wrap items-center justify-between gap-4 p-6">
        <div className="flex items-center gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-card bg-lv-blue-soft text-lv-blue">
            <Coins className="h-6 w-6" />
          </div>
          <div>
            <p className="text-3xl font-bold tracking-tight text-lv-text">
              {balance}
            </p>
            <p className="text-sm text-lv-secondary">Aktuelles Guthaben</p>
          </div>
        </div>
        <Link
          href="/venture/credits"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-lv-blue hover:underline"
        >
          Historie ansehen
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Card>

      <HubContent roadmap={hub.roadmap} pages={hub.pages} media={hub.media} />
    </>
  );
}
