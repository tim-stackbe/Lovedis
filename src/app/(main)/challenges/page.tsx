import { Plus, Target } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import type { Prisma } from "@/generated/prisma/client";
import { ShareChallengeButton } from "@/components/challenges/ShareChallengeButton";
import {
  ApplicationStatusBadge,
  ChallengeStatusBadge,
} from "@/components/shared/badges";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { requireRole } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { formatDate, truncate } from "@/lib/utils";

export const metadata: Metadata = { title: "Challenges" };

const COPY = {
  ADMIN: {
    title: "Alle Challenges",
    subtitle: "Plattformweiter Überblick über jede Partner-Challenge.",
  },
  BUSINESS_PARTNER: {
    title: "Meine Challenges",
    subtitle:
      "Stelle Innovations-Challenges und prüfe die Startups, die sich bewerben.",
  },
  STARTUP: {
    title: "Offene Challenges",
    subtitle:
      "Entdecke Corporate-Innovations-Challenges und pitche deine Lösung.",
  },
} as const;

export default async function ChallengesPage() {
  const session = await requireRole(["ADMIN", "BUSINESS_PARTNER", "STARTUP"]);
  const role = session.user.role as keyof typeof COPY;

  const where: Prisma.ChallengeWhereInput =
    role === "BUSINESS_PARTNER"
      ? { createdById: session.user.id }
      : role === "STARTUP"
        ? { status: { in: ["OPEN", "IN_REVIEW", "CLOSED"] } }
        : {};

  const challenges = await prisma.challenge.findMany({
    where,
    include: {
      createdBy: { select: { name: true, company: true } },
      _count: { select: { applications: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  // For startups: own application status per challenge.
  let myApplications = new Map<string, string>();
  if (role === "STARTUP") {
    const myStartup = await prisma.startup.findUnique({
      where: { ownerUserId: session.user.id },
      select: {
        applications: { select: { challengeId: true, status: true } },
      },
    });
    myApplications = new Map(
      myStartup?.applications.map((a) => [a.challengeId, a.status]) ?? []
    );
  }

  const canCreate = role === "ADMIN" || role === "BUSINESS_PARTNER";

  return (
    <>
      <HeroBanner
        kicker="Challenge-System"
        title={COPY[role].title}
        subtitle={COPY[role].subtitle}
        actions={
          canCreate ? (
            <LinkButton href="/challenges/new" variant="white">
              <Plus className="h-4 w-4" />
              Neue Challenge
            </LinkButton>
          ) : undefined
        }
      />

      <SectionLabel
        number="01"
        label="Challenges"
        title={`${challenges.length} Challenge${challenges.length === 1 ? "" : "s"}`}
      />

      {challenges.length === 0 ? (
        <EmptyState
          icon={Target}
          title="Noch keine Challenges"
          description={
            canCreate
              ? "Stelle deine erste Innovations-Challenge und erhalte Startup-Bewerbungen."
              : "Gerade gibt es keine Challenges — schau bald wieder vorbei."
          }
          action={
            canCreate ? (
              <LinkButton href="/challenges/new">
                <Plus className="h-4 w-4" />
                Neue Challenge
              </LinkButton>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {challenges.map((c) => {
            const applied = myApplications.get(c.id);
            return (
              <Card
                key={c.id}
                className="flex flex-col p-5 transition-shadow hover:shadow-card"
              >
                <div className="flex items-start justify-between gap-3">
                  <Link
                    href={`/challenges/${c.id}`}
                    className="text-base font-bold leading-snug hover:text-lv-blue"
                  >
                    {c.title}
                  </Link>
                  <div className="flex shrink-0 items-center gap-2">
                    <ChallengeStatusBadge value={c.status} />
                    <ShareChallengeButton
                      title={c.title}
                      challengeId={c.id}
                      variant="ghost"
                    />
                  </div>
                </div>
                <p className="mt-2 flex-1 text-sm text-lv-secondary">
                  {truncate(c.description, 160)}
                </p>
                {c.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {c.tags.map((t) => (
                      <Badge key={t} tone="blue">
                        {t}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="mt-4 flex items-center justify-between border-t border-lv-border pt-3 text-xs text-lv-secondary">
                  <span>
                    {c.createdBy.company ?? c.createdBy.name}
                    {c.deadline && ` · Frist ${formatDate(c.deadline)}`}
                  </span>
                  {role === "STARTUP" ? (
                    applied ? (
                      <ApplicationStatusBadge
                        value={applied as "PENDING" | "ACCEPTED" | "REJECTED"}
                      />
                    ) : (
                      <span className="font-semibold text-lv-blue">
                        {c.status === "OPEN" ? "Bewirb dich jetzt →" : ""}
                      </span>
                    )
                  ) : (
                    <span>
                      {c._count.applications} Bewerbung
                      {c._count.applications === 1 ? "" : "en"}
                    </span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
