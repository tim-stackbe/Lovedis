import { ClipboardCheck } from "lucide-react";
import type { Metadata } from "next";
import { RecommendationBadge } from "@/components/shared/badges";
import { PartnerVerdictControl } from "@/components/screening/PartnerVerdictControl";
import { EmptyState } from "@/components/ui/EmptyState";
import { BannerStat, Card } from "@/components/ui/Card";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { requirePartner } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Longlist-Screening" };

export default async function ScreeningPage() {
  const session = await requirePartner();

  // Curated, low-overload longlist: only team-screened startups that are still
  // in play. Internal scores, pipeline and notes are deliberately NOT exposed.
  const startups = await prisma.startup.findMany({
    where: {
      screenedAt: { not: null },
      pipelineStage: { notIn: ["PARTNERED", "PASSED"] },
    },
    orderBy: { screenedAt: "desc" },
    select: {
      id: true,
      name: true,
      industry: true,
      tagline: true,
      publicPitch: true,
      description: true,
      logoUrl: true,
      screenSummary: true,
      screenRecommendation: true,
      partnerReviews: {
        where: { partnerId: session.user.id, challengeId: null },
        select: { verdict: true, note: true },
      },
    },
  });

  const decided = startups.filter(
    (s) => s.partnerReviews[0] && s.partnerReviews[0].verdict !== "PENDING"
  ).length;
  const open = startups.length - decided;

  return (
    <>
      <HeroBanner
        kicker="Screening"
        title="Longlist-Screening"
        subtitle="Kuratierte Startup-Auswahl mit kurzer Einordnung. Sag uns mit einem Klick, welche Startups wir weiterverfolgen sollen."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:max-w-md">
          <BannerStat label="Vorgeschlagen" value={startups.length} />
          <BannerStat label="Offen" value={open} />
          <BannerStat label="Entschieden" value={decided} />
        </div>
      </HeroBanner>

      <SectionLabel
        number="01"
        label="Kandidaten"
        title="Für dich vorgeschlagen"
      />

      {startups.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="Noch keine Vorschläge"
          description="Sobald unser Team neue Startups eingeordnet hat, erscheinen sie hier zur Sichtung."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {startups.map((s) => {
            const review = s.partnerReviews[0];
            return (
              <Card key={s.id} className="flex flex-col p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-lg font-bold tracking-tight text-lv-text">
                      {s.name}
                    </h3>
                    <p className="text-xs font-medium uppercase tracking-wider text-lv-secondary">
                      {s.industry}
                    </p>
                  </div>
                  {s.screenRecommendation && (
                    <RecommendationBadge value={s.screenRecommendation} />
                  )}
                </div>

                <p className="mt-3 text-sm text-lv-text">
                  {s.tagline ?? s.publicPitch ?? s.description}
                </p>

                {s.screenSummary && (
                  <div className="mt-4 rounded-button bg-lv-blue-soft/60 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-lv-blue">
                      Einordnung
                    </p>
                    <p className="mt-1 text-sm text-lv-text">{s.screenSummary}</p>
                  </div>
                )}

                <div className="mt-5 border-t border-lv-border pt-4">
                  <PartnerVerdictControl
                    startupId={s.id}
                    currentVerdict={review?.verdict}
                    currentNote={review?.note}
                  />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
