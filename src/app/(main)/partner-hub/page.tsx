import type { Metadata } from "next";
import { HubContent } from "@/components/ssot/HubContent";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { requirePartner } from "@/lib/auth-guards";
import { audiencesForRole, getHubContent } from "@/lib/ssot";

export const metadata: Metadata = { title: "Partner-Hub" };

export default async function PartnerHubPage() {
  const session = await requirePartner();
  const { roadmap, pages, media } = await getHubContent(
    audiencesForRole(session.user.role)
  );

  return (
    <>
      <HeroBanner
        kicker="Wissen"
        title="Partner-Hub"
        subtitle="Roadmap, Accelerator-Infos und Media-Kit — alles an einem Ort. Deine Single Source of Truth für die Zusammenarbeit mit Lovedis."
      />
      <HubContent roadmap={roadmap} pages={pages} media={media} />
    </>
  );
}
