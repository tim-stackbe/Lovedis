import type { Metadata } from "next";
import { HubContent } from "@/components/ssot/HubContent";
import { PreviewBanner } from "@/components/shared/PreviewBanner";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { requirePartnerView } from "@/lib/auth-guards";
import { isTeamRole } from "@/lib/roles";
import { audiencesForRole, getHubContent } from "@/lib/ssot";

export const metadata: Metadata = { title: "Partner-Hub" };

export default async function PartnerHubPage() {
  const session = await requirePartnerView();
  const teamMode = isTeamRole(session.user.role);

  // In the team preview, show exactly the partner's audience slice (PARTNER +
  // BOTH) rather than the team's full audience — a faithful "Partner-Sicht".
  const { roadmap, pages, media } = await getHubContent(
    teamMode ? ["PARTNER", "BOTH"] : audiencesForRole(session.user.role)
  );

  return (
    <>
      <HeroBanner
        kicker="Wissen"
        title="Partner-Hub"
        subtitle="Roadmap, Accelerator-Infos und Media-Kit — alles an einem Ort. Deine Single Source of Truth für die Zusammenarbeit mit Lovedis."
      />
      {teamMode && (
        <PreviewBanner title="Partner-Sicht – Vorschau">
          So sieht ein Business Partner den Partner-Hub (Roadmap, Infos &
          Media-Kit für die Partner-Zielgruppe).
        </PreviewBanner>
      )}
      <HubContent roadmap={roadmap} pages={pages} media={media} />
    </>
  );
}
