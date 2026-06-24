import { Sparkles, Target } from "lucide-react";
import type { Metadata } from "next";
import { ApplicationStatusBadge } from "@/components/shared/badges";
import { PartnerVerdictControl } from "@/components/screening/PartnerVerdictControl";
import { StartupLogo } from "@/components/discovery/StartupLogo";
import { Badge } from "@/components/ui/Badge";
import { BannerStat, Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { requirePartner } from "@/lib/auth-guards";
import {
  rankStartupsForChallenge,
  type StartupForMatch,
} from "@/lib/use-case-suggestions";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Use-Case-Bewertung" };

const CANDIDATE_SELECT = {
  id: true,
  name: true,
  industry: true,
  description: true,
  tagline: true,
  publicPitch: true,
  lookingFor: true,
  stage: true,
  pipelineStage: true,
  logoUrl: true,
} as const;

export default async function UseCasesPage() {
  const session = await requirePartner();

  const [challenges, candidates] = await Promise.all([
    prisma.challenge.findMany({
      where: { createdById: session.user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        tags: true,
        applications: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            status: true,
            startup: {
              select: {
                id: true,
                name: true,
                industry: true,
                tagline: true,
                publicPitch: true,
                description: true,
                logoUrl: true,
              },
            },
          },
        },
        partnerReviews: {
          where: { partnerId: session.user.id },
          select: { startupId: true, verdict: true, note: true },
        },
      },
    }),
    // Curated candidate pool for suggestions (screened or published, still open).
    prisma.startup.findMany({
      where: {
        pipelineStage: { notIn: ["PARTNERED", "PASSED"] },
        OR: [{ screenedAt: { not: null } }, { isPublished: true }],
      },
      select: CANDIDATE_SELECT,
    }),
  ]);

  const totalApps = challenges.reduce((n, c) => n + c.applications.length, 0);
  const totalDecided = challenges.reduce(
    (n, c) =>
      n + c.partnerReviews.filter((r) => r.verdict !== "PENDING").length,
    0
  );

  return (
    <>
      <HeroBanner
        kicker="Screening"
        title="Use-Case-Bewertung"
        subtitle="Deine Use-Cases (Challenges) und die zugeordneten Startups — bewerte mit einem Klick, welche du je Use-Case weiterverfolgen willst."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:max-w-md">
          <BannerStat label="Use-Cases" value={challenges.length} icon={Target} />
          <BannerStat label="Zugeordnet" value={totalApps} />
          <BannerStat label="Bewertet" value={totalDecided} />
        </div>
      </HeroBanner>

      {challenges.length === 0 ? (
        <EmptyState
          icon={Target}
          title="Noch keine Use-Cases"
          description="Lege eine Challenge an, um Startups einem Use-Case zuzuordnen und zu bewerten."
        />
      ) : (
        challenges.map((c, i) => {
          const reviewByStartup = new Map(
            c.partnerReviews.map((r) => [r.startupId, r])
          );
          const appliedIds = new Set(c.applications.map((a) => a.startup.id));
          const suggestions = rankStartupsForChallenge(
            { id: c.id, title: c.title, description: c.description, tags: c.tags },
            candidates as StartupForMatch[],
            appliedIds
          ).slice(0, 3);

          return (
            <section key={c.id} className="space-y-4">
              <SectionLabel
                number={String(i + 1).padStart(2, "0")}
                label="Use-Case"
                title={c.title}
              />
              <div className="flex flex-wrap items-center gap-2">
                {c.tags.map((t) => (
                  <Badge key={t} tone="blue">
                    {t}
                  </Badge>
                ))}
              </div>

              {c.applications.length === 0 ? (
                <Card className="p-6 text-sm text-lv-secondary">
                  Noch keine Startups zugeordnet.
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {c.applications.map((a) => {
                    const review = reviewByStartup.get(a.startup.id);
                    return (
                      <Card key={a.id} className="flex flex-col p-5">
                        <div className="flex items-start gap-3">
                          <StartupLogo
                            name={a.startup.name}
                            logoUrl={a.startup.logoUrl}
                            size="sm"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-bold text-lv-text">
                                {a.startup.name}
                              </p>
                              <ApplicationStatusBadge value={a.status} />
                            </div>
                            <p className="text-xs text-lv-secondary">
                              {a.startup.industry}
                            </p>
                          </div>
                        </div>
                        <p className="mt-3 text-sm text-lv-text">
                          {a.startup.tagline ??
                            a.startup.publicPitch ??
                            a.startup.description}
                        </p>
                        <div className="mt-4 border-t border-lv-border pt-4">
                          <PartnerVerdictControl
                            startupId={a.startup.id}
                            challengeId={c.id}
                            currentVerdict={review?.verdict}
                            currentNote={review?.note}
                          />
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}

              {suggestions.length > 0 && (
                <Card className="p-5">
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-lv-secondary">
                    <Sparkles className="h-3.5 w-3.5 text-lv-blue" />
                    Passende Vorschläge
                  </p>
                  <div className="mt-3 grid gap-4 md:grid-cols-2">
                    {suggestions.map(({ startup, reasons }) => {
                      const review = reviewByStartup.get(startup.id);
                      return (
                        <div
                          key={startup.id}
                          className="rounded-button border border-lv-border p-4"
                        >
                          <p className="text-sm font-bold text-lv-text">
                            {startup.name}
                            <span className="ml-2 text-xs font-normal text-lv-secondary">
                              {startup.industry}
                            </span>
                          </p>
                          <ul className="mt-2 space-y-1">
                            {reasons.slice(0, 2).map((r, idx) => (
                              <li
                                key={idx}
                                className="flex items-start gap-1.5 text-xs text-lv-secondary"
                              >
                                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-lv-blue" />
                                {r}
                              </li>
                            ))}
                          </ul>
                          <div className="mt-3 border-t border-lv-border pt-3">
                            <PartnerVerdictControl
                              startupId={startup.id}
                              challengeId={c.id}
                              currentVerdict={review?.verdict}
                              currentNote={review?.note}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}
            </section>
          );
        })
      )}
    </>
  );
}
