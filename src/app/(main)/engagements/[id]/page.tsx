import { ArrowLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { EngagementStatusBadge } from "@/components/shared/badges";
import { EngagementEditor } from "@/components/engagements/EngagementEditor";
import { LinkButton } from "@/components/ui/Button";
import { BannerStat } from "@/components/ui/Card";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { requireRole } from "@/lib/auth-guards";
import { parseKpis, parseMilestones, pocProgress } from "@/lib/pocs";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Engagement" };

export default async function EngagementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireRole(["ADMIN", "MEMBER", "BUSINESS_PARTNER"]);
  const { id } = await params;

  const engagement = await prisma.engagement.findUnique({
    where: { id },
    include: {
      partner: { select: { name: true, company: true } },
      startup: { select: { name: true } },
      createdBy: { select: { name: true } },
    },
  });
  if (!engagement) notFound();

  const isTeam =
    session.user.role === "ADMIN" || session.user.role === "MEMBER";
  if (!isTeam && engagement.partnerId !== session.user.id) {
    redirect("/engagements");
  }

  const kpis = parseKpis(engagement.kpis);
  const milestones = parseMilestones(engagement.milestones);
  const progress = pocProgress(milestones);

  return (
    <>
      <HeroBanner
        kicker={`Engagement · ${engagement.startup.name}`}
        title={engagement.title}
        subtitle={`Partner: ${engagement.partner.company ?? engagement.partner.name}`}
        actions={
          <LinkButton href="/engagements" variant="white">
            <ArrowLeft className="h-4 w-4" />
            Alle Engagements
          </LinkButton>
        }
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <BannerStat label="Fortschritt" value={`${progress}%`} />
          <BannerStat label="KPIs" value={kpis.length} />
          <BannerStat label="Meilensteine" value={milestones.length} />
          <BannerStat label="Seit" value={formatDate(engagement.startDate)} />
        </div>
      </HeroBanner>

      <SectionLabel
        number="01"
        label="Status"
        title="Aktueller Stand"
        actions={<EngagementStatusBadge value={engagement.status} />}
      />

      <EngagementEditor
        engagementId={engagement.id}
        initial={{
          title: engagement.title,
          status: engagement.status,
          startDate: engagement.startDate
            ? new Date(engagement.startDate).toISOString().slice(0, 10)
            : "",
          endDate: engagement.endDate
            ? new Date(engagement.endDate).toISOString().slice(0, 10)
            : "",
          notes: engagement.notes ?? "",
          kpis,
          milestones,
        }}
      />
    </>
  );
}
