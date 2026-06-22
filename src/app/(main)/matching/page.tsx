import { Sparkles, Target } from "lucide-react";
import type { Metadata } from "next";
import { SuggestionActions } from "@/components/matching/SuggestionActions";
import { StartupLogo } from "@/components/discovery/StartupLogo";
import { Badge } from "@/components/ui/Badge";
import { BannerStat, Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { requireRole } from "@/lib/auth-guards";
import { STARTUP_STAGE_LABELS } from "@/lib/constants";
import {
  rankStartupsForChallenge,
  type StartupForMatch,
} from "@/lib/matching";
import { prisma } from "@/lib/prisma";
import { cn, daysUntil, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Auto-Matching" };

const STARTUP_SELECT = {
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

export default async function MatchingPage() {
  await requireRole(["ADMIN", "MEMBER"]);

  const [challenges, startups] = await Promise.all([
    prisma.challenge.findMany({
      where: { status: "OPEN" },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        title: true,
        description: true,
        tags: true,
        deadline: true,
        createdBy: { select: { name: true, company: true } },
        applications: { select: { startupId: true } },
        matchDismissals: { select: { startupId: true } },
      },
    }),
    prisma.startup.findMany({ select: STARTUP_SELECT }),
  ]);

  const logoById = new Map(startups.map((s) => [s.id, s.logoUrl]));

  const queue = challenges.map((c) => {
    const exclude = new Set<string>([
      ...c.applications.map((a) => a.startupId),
      ...c.matchDismissals.map((d) => d.startupId),
    ]);
    const suggestions = rankStartupsForChallenge(
      { id: c.id, title: c.title, description: c.description, tags: c.tags },
      startups as StartupForMatch[],
      exclude
    );
    return { challenge: c, suggestions };
  });

  const totalSuggestions = queue.reduce((n, q) => n + q.suggestions.length, 0);

  return (
    <>
      <HeroBanner
        kicker="Team-Ops — Sektion 00"
        title="Auto-Matching"
        subtitle="Regelbasierte Vorschläge: zu jeder offenen Challenge die am besten passenden gescouteten Startups — mit Score und nachvollziehbarer Begründung. Ein Klick lädt ein oder verwirft."
      >
        <div className="grid grid-cols-3 gap-3 sm:max-w-md">
          <BannerStat label="Offene Challenges" value={challenges.length} icon={Target} />
          <BannerStat label="Vorschläge" value={totalSuggestions} icon={Sparkles} />
          <BannerStat label="Startups im Pool" value={startups.length} />
        </div>
      </HeroBanner>

      {challenges.length === 0 ? (
        <EmptyState
          icon={Target}
          title="Keine offenen Challenges"
          description="Sobald eine Challenge auf „Offen“ steht, schlägt das Auto-Matching hier passende Startups vor."
        />
      ) : (
        queue.map(({ challenge, suggestions }, i) => (
          <section key={challenge.id} className="space-y-4">
            <SectionLabel
              number={String(i + 1).padStart(2, "0")}
              label={challenge.createdBy.company ?? "Partner"}
              title={challenge.title}
            />

            <div className="flex flex-wrap items-center gap-2">
              {challenge.tags.map((t) => (
                <Badge key={t} tone="blue">
                  {t}
                </Badge>
              ))}
              {challenge.deadline && (
                <span className="text-xs text-lv-secondary">
                  Frist {formatDate(challenge.deadline)}
                  {(() => {
                    const until = daysUntil(challenge.deadline);
                    return until !== null && until >= 0
                      ? ` · in ${until} T.`
                      : "";
                  })()}
                </span>
              )}
            </div>

            {suggestions.length === 0 ? (
              <Card className="p-6 text-sm text-lv-secondary">
                Aktuell keine passenden Startups im Pool — alle Treffer sind
                bereits eingeladen oder verworfen.
              </Card>
            ) : (
              <Card className="divide-y divide-lv-border">
                {suggestions.map(({ startup, score, reasons }) => (
                  <div
                    key={startup.id}
                    className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="flex items-start gap-3">
                      <StartupLogo
                        name={startup.name}
                        logoUrl={logoById.get(startup.id) ?? null}
                      />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-bold text-lv-text">
                            {startup.name}
                          </p>
                          <Badge tone="muted">
                            {STARTUP_STAGE_LABELS[startup.stage]}
                          </Badge>
                          <span className="text-xs text-lv-secondary">
                            {startup.industry}
                          </span>
                        </div>
                        <ul className="mt-2 space-y-1">
                          {reasons.map((r, idx) => (
                            <li
                              key={idx}
                              className="flex items-start gap-1.5 text-xs text-lv-secondary"
                            >
                              <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-lv-blue" />
                              {r}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 sm:flex-col sm:items-end">
                      <MatchScore score={score} />
                      <SuggestionActions
                        challengeId={challenge.id}
                        startupId={startup.id}
                      />
                    </div>
                  </div>
                ))}
              </Card>
            )}
          </section>
        ))
      )}
    </>
  );
}

function MatchScore({ score }: { score: number }) {
  const tone =
    score >= 60
      ? "bg-lv-mint text-lv-mint-deep"
      : score >= 35
        ? "bg-lv-blue-soft text-lv-blue"
        : "bg-lv-yellow text-lv-yellow-deep";
  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "inline-flex min-w-12 items-center justify-center rounded-full px-2.5 py-1 text-sm font-bold tabular-nums",
          tone
        )}
      >
        {score}
      </span>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-lv-secondary">
        Match
      </span>
    </div>
  );
}
