import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { TrackingForm, type TrackingValues } from "@/components/insights/TrackingForm";
import { LinkButton } from "@/components/ui/Button";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { requireScoutModule } from "@/lib/auth-guards";
import { loadInsightsFormOptions } from "@/lib/insights/data";
import { TRACKS } from "@/lib/insights/stages";

export const metadata: Metadata = { title: "Insights · Neuer Tracking-Eintrag" };

export default async function NewTrackingPage({
  searchParams,
}: {
  searchParams: Promise<{ startup?: string; partner?: string; batch?: string; track?: string }>;
}) {
  const session = await requireScoutModule();
  if (session.user.role !== "ADMIN") redirect("/insights/tracking");
  const params = await searchParams;
  const options = await loadInsightsFormOptions();

  const pick = (id: string | undefined, list: { id: string }[]) =>
    id && list.some((x) => x.id === id) ? id : null;
  const values: TrackingValues = {
    id: null,
    track: (TRACKS as readonly string[]).includes(params.track ?? "") ? params.track! : "BASIS",
    startupId: pick(params.startup, options.startups) ?? "",
    partnerCompanyId: pick(params.partner, options.partners),
    batchId: pick(params.batch, options.batches),
    challengeId: null,
    engagementId: null,
    stage: "MATCH",
    introByLovedisOn: null,
    pilotStartOn: null,
    loiOn: null,
    contractOn: null,
    firstRevenueOn: null,
    revenueEur: null,
    collaborationForm: null,
    supportIntensity: null,
    ndaSigned: false,
    ipAgreement: false,
    coInnovationAgreement: false,
    useCase: null,
    goal: null,
    kpis: null,
    startOn: null,
    endOn: null,
    resourcesPartner: null,
    costPartnerEur: null,
    costLovedisEur: null,
    costStartupEur: null,
    outcome: null,
  };

  return (
    <>
      <HeroBanner
        kicker="Insights · Tracking"
        title="Neuer Tracking-Eintrag"
        subtitle="Ein Eintrag beschreibt die Zusammenarbeit eines Startups mit einem Partner im Basis-Accelerator oder im 1:1 Accelerator."
        actions={
          <LinkButton href="/insights/tracking" variant="white">
            <ArrowLeft className="h-4 w-4" />
            Tracking
          </LinkButton>
        }
      />
      <TrackingForm values={values} options={options} canEdit />
    </>
  );
}
