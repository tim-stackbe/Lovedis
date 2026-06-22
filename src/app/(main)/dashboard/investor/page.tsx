import { Compass, Newspaper } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { StartupLogo } from "@/components/discovery/StartupLogo";
import { UpdateFeed, type FeedUpdate } from "@/components/discovery/UpdateFeed";
import {
  IntroStatusBadge,
  PoCStatusBadge,
  RecommendationBadge,
  ScorePill,
} from "@/components/shared/badges";
import { BannerStat, Card, ToneCard } from "@/components/ui/Card";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { LinkButton } from "@/components/ui/Button";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { TableCard, Td, Th, THead, Tr } from "@/components/ui/Table";
import { requireRole } from "@/lib/auth-guards";
import { parseMilestones, pocProgress } from "@/lib/pocs";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Investor-Dashboard" };

export default async function InvestorDashboard() {
  const session = await requireRole(["INVESTOR"]);
  const userId = session.user.id;

  const [pocs, shares, follows, introRequests] = await Promise.all([
    prisma.poCPerformance.findMany({
      where: { trackedById: userId },
      include: {
        application: {
          include: {
            startup: { select: { name: true, industry: true } },
            challenge: { select: { title: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.sharedScoring.findMany({
      where: { recipientId: userId },
      include: {
        evaluation: {
          include: {
            startup: { select: { name: true, industry: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.startupFollow.findMany({
      where: { userId },
      select: { startupId: true },
    }),
    prisma.introRequest.findMany({
      where: { investorId: userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        conversationId: true,
        startup: { select: { id: true, name: true } },
      },
    }),
  ]);

  const followedIds = follows.map((f) => f.startupId);

  const [feedUpdates, recommended] = await Promise.all([
    followedIds.length
      ? prisma.startupUpdate.findMany({
          where: { startupId: { in: followedIds } },
          orderBy: { createdAt: "desc" },
          take: 4,
          select: {
            id: true,
            title: true,
            body: true,
            category: true,
            createdAt: true,
            startup: { select: { id: true, name: true, logoUrl: true } },
          },
        })
      : Promise.resolve([]),
    prisma.startup.findMany({
      where: { isPublished: true, id: { notIn: followedIds } },
      orderBy: { publishedAt: "desc" },
      take: 4,
      select: {
        id: true,
        name: true,
        tagline: true,
        logoUrl: true,
        industry: true,
      },
    }),
  ]);

  const avgScore =
    shares.length > 0
      ? shares.reduce((a, s) => a + s.evaluation.overallScore, 0) /
        shares.length
      : 0;
  const openIntros = introRequests.filter(
    (r) => r.status === "PENDING" || r.status === "APPROVED"
  ).length;

  const feedItems: FeedUpdate[] = feedUpdates.map((u) => ({
    id: u.id,
    title: u.title,
    body: u.body,
    category: u.category,
    createdAt: u.createdAt,
    startup: u.startup,
  }));

  return (
    <>
      <HeroBanner
        kicker="Sektion 00 — Investor"
        title={`Willkommen, ${session.user.name?.split(" ")[0]}`}
        subtitle="Dein Hub: folge Startups, verfolge ihre Updates und vertiefe dein Portfolio aus Piloten und Scorings."
        actions={
          <LinkButton href="/discover" variant="white">
            <Compass className="h-4 w-4" />
            Startups entdecken
          </LinkButton>
        }
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <BannerStat label="Ich folge" value={followedIds.length} />
          <BannerStat label="Intro-Anfragen" value={introRequests.length} />
          <BannerStat label="Getrackte PoCs" value={pocs.length} />
          <BannerStat label="Ø Score" value={avgScore.toFixed(1)} />
        </div>
      </HeroBanner>

      <section className="space-y-4">
        <SectionLabel number="01" label="Ökosystem" title="Dein Netzwerk" />
        <div className="grid gap-4 sm:grid-cols-3">
          <ToneCard
            tone={followedIds.length > 0 ? "info" : "muted"}
            label="Beobachtet"
            value={followedIds.length}
            sub="Startups, denen du folgst"
          />
          <ToneCard
            tone={openIntros > 0 ? "attention" : "muted"}
            label="Offene Intros"
            value={openIntros}
            sub="in Anbahnung"
          />
          <ToneCard
            tone="success"
            label="Neue Updates"
            value={feedItems.length}
            sub="von deinen Startups"
          />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <SectionLabel number="02" label="Feed" title="Updates deiner Startups" />
          {feedItems.length === 0 ? (
            <Card className="flex flex-col items-start gap-3 p-6 text-sm text-lv-secondary">
              <span className="inline-flex items-center gap-2">
                <Newspaper className="h-4 w-4" />
                Noch keine Updates — folge Startups, um ihren Neuigkeiten zu
                folgen.
              </span>
              <LinkButton href="/discover" size="sm" variant="secondary">
                <Compass className="h-4 w-4" />
                Entdecken
              </LinkButton>
            </Card>
          ) : (
            <>
              <UpdateFeed updates={feedItems} />
              <Link
                href="/feed"
                className="text-sm font-semibold text-lv-blue hover:underline"
              >
                Ganzen Feed ansehen →
              </Link>
            </>
          )}
        </div>

        <div className="space-y-4">
          <SectionLabel
            number="03"
            label="Anbahnung"
            title="Deine Intro-Anfragen"
          />
          {introRequests.length === 0 ? (
            <Card className="p-6 text-sm text-lv-secondary">
              Noch keine Intros angefragt. Auf einem öffentlichen Profil kannst
              du über das Lovedis-Team eine Einführung anfragen.
            </Card>
          ) : (
            <Card className="divide-y divide-lv-border">
              {introRequests.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between gap-3 p-4"
                >
                  <div>
                    <Link
                      href={`/discover/${r.startup.id}`}
                      className="text-sm font-semibold text-lv-text hover:text-lv-blue"
                    >
                      {r.startup.name}
                    </Link>
                    {r.status === "CONNECTED" && r.conversationId && (
                      <Link
                        href={`/messages?c=${r.conversationId}`}
                        className="ml-2 text-xs font-semibold text-lv-blue hover:underline"
                      >
                        Chat öffnen
                      </Link>
                    )}
                  </div>
                  <IntroStatusBadge value={r.status} />
                </div>
              ))}
            </Card>
          )}

          {recommended.length > 0 && (
            <>
              <SectionLabel
                number="04"
                label="Neu"
                title="Neu im Universum"
              />
              <Card className="divide-y divide-lv-border">
                {recommended.map((s) => (
                  <Link
                    key={s.id}
                    href={`/discover/${s.id}`}
                    className="flex items-center gap-3 p-4 hover:bg-lv-surface/50"
                  >
                    <StartupLogo name={s.name} logoUrl={s.logoUrl} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-lv-text">
                        {s.name}
                      </p>
                      <p className="truncate text-xs text-lv-secondary">
                        {s.tagline ?? s.industry}
                      </p>
                    </div>
                  </Link>
                ))}
              </Card>
            </>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <SectionLabel number="05" label="Piloten" title="Getrackte PoCs" />
        {pocs.length === 0 ? (
          <Card className="p-6 text-sm text-lv-secondary">
            Dir sind noch keine PoCs zugewiesen.
          </Card>
        ) : (
          <TableCard>
            <THead>
              <tr>
                <Th>Startup</Th>
                <Th>Challenge</Th>
                <Th>Fortschritt</Th>
                <Th>Aktualisiert</Th>
                <Th className="text-right">Status</Th>
              </tr>
            </THead>
            <tbody>
              {pocs.map((p) => {
                const progress = pocProgress(parseMilestones(p.milestones));
                return (
                  <Tr key={p.id}>
                    <Td>
                      <Link
                        href={`/pocs/${p.id}`}
                        className="font-semibold hover:text-lv-blue"
                      >
                        {p.application.startup.name}
                      </Link>
                      <p className="text-xs text-lv-secondary">
                        {p.application.startup.industry}
                      </p>
                    </Td>
                    <Td className="text-lv-secondary">
                      {p.application.challenge.title}
                    </Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-lv-surface">
                          <div
                            className="h-full rounded-full bg-lv-blue"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-xs tabular-nums text-lv-secondary">
                          {progress}%
                        </span>
                      </div>
                    </Td>
                    <Td className="text-lv-secondary">
                      {formatDate(p.updatedAt)}
                    </Td>
                    <Td className="text-right">
                      <PoCStatusBadge value={p.status} />
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </TableCard>
        )}
      </section>

      <section className="space-y-4">
        <SectionLabel
          number="06"
          label="Insights"
          title="Mit dir geteilte Scorings"
        />
        {shares.length === 0 ? (
          <Card className="p-6 text-sm text-lv-secondary">
            Noch keine Scorings mit dir geteilt.
          </Card>
        ) : (
          <TableCard>
            <THead>
              <tr>
                <Th>Startup</Th>
                <Th>Geteilt</Th>
                <Th>Empfehlung</Th>
                <Th className="text-right">Score</Th>
              </tr>
            </THead>
            <tbody>
              {shares.map((s) => (
                <Tr key={s.id}>
                  <Td>
                    <Link
                      href={`/scorings/${s.id}`}
                      className="font-semibold hover:text-lv-blue"
                    >
                      {s.evaluation.startup.name}
                    </Link>
                    <p className="text-xs text-lv-secondary">
                      {s.evaluation.startup.industry}
                    </p>
                  </Td>
                  <Td className="text-lv-secondary">{formatDate(s.createdAt)}</Td>
                  <Td>
                    <RecommendationBadge value={s.evaluation.recommendation} />
                  </Td>
                  <Td className="text-right">
                    <ScorePill score={s.evaluation.overallScore} />
                  </Td>
                </Tr>
              ))}
            </tbody>
          </TableCard>
        )}
      </section>
    </>
  );
}
