import {
  ArrowLeft,
  Calendar,
  ExternalLink,
  Globe,
  MapPin,
  MessageSquare,
  Newspaper,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { FollowButton } from "@/components/discovery/FollowButton";
import { IntroRequestForm } from "@/components/discovery/IntroRequestForm";
import { StartupLogo } from "@/components/discovery/StartupLogo";
import { UpdateFeed } from "@/components/discovery/UpdateFeed";
import { IntroStatusBadge } from "@/components/shared/badges";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { BannerStat, Card } from "@/components/ui/Card";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { requireMarketplace } from "@/lib/auth-guards";
import { STARTUP_STAGE_LABELS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { formatMillions } from "@/lib/utils";

export const metadata: Metadata = { title: "Startup-Profil" };

export default async function DiscoverDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireMarketplace();
  const { id } = await params;

  const startup = await prisma.startup.findFirst({
    where: { id, isPublished: true },
    select: {
      id: true,
      name: true,
      tagline: true,
      description: true,
      publicPitch: true,
      logoUrl: true,
      website: true,
      industry: true,
      stage: true,
      city: true,
      country: true,
      foundedYear: true,
      teamSize: true,
      seekingFunding: true,
      seekingAmount: true,
      lookingFor: true,
      _count: { select: { followers: true } },
      attachments: {
        where: { type: { in: ["DECK", "LINK"] } },
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, url: true, type: true },
      },
      updates: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          body: true,
          category: true,
          createdAt: true,
        },
      },
    },
  });
  if (!startup) notFound();

  const [follow, intro] = await Promise.all([
    prisma.startupFollow.findUnique({
      where: { userId_startupId: { userId: session.user.id, startupId: id } },
      select: { id: true },
    }),
    prisma.introRequest.findUnique({
      where: {
        investorId_startupId: { investorId: session.user.id, startupId: id },
      },
      select: { status: true, conversationId: true },
    }),
  ]);

  const location = [startup.city, startup.country].filter(Boolean).join(", ");

  return (
    <>
      <Link
        href="/discover"
        className="inline-flex items-center gap-1.5 text-sm text-lv-secondary hover:text-lv-blue"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zum Universum
      </Link>

      <div className="rounded-card bg-lv-cover p-6 text-white shadow-card relative overflow-hidden sm:p-8">
        <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-lv-orange/40 blur-3xl" />
        <div className="absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-lv-blue-dark/40 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <StartupLogo
              name={startup.name}
              logoUrl={startup.logoUrl}
              size="lg"
              className="border-white/20"
            />
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {startup.name}
              </h1>
              {startup.tagline && (
                <p className="mt-1 max-w-xl text-sm text-white/80">
                  {startup.tagline}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge tone="pink">{startup.industry}</Badge>
                <Badge tone="blue">{STARTUP_STAGE_LABELS[startup.stage]}</Badge>
              </div>
            </div>
          </div>
          <FollowButton startupId={startup.id} initialFollowing={Boolean(follow)} />
        </div>
        <div className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <BannerStat
            icon={Users}
            label="Follower"
            value={startup._count.followers}
          />
          <BannerStat icon={Users} label="Team" value={startup.teamSize ?? "—"} />
          <BannerStat
            icon={Calendar}
            label="Gegründet"
            value={startup.foundedYear ?? "—"}
          />
          <BannerStat
            icon={Target}
            label="Sucht"
            value={
              startup.seekingFunding
                ? startup.seekingAmount
                  ? formatMillions(startup.seekingAmount)
                  : "Funding"
                : "—"
            }
          />
        </div>
      </div>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <SectionLabel number="01" label="Pitch" title="Über das Startup" />
          <Card className="p-6">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-lv-text">
              {startup.publicPitch || startup.description}
            </p>
            <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-lv-border pt-5 text-sm sm:grid-cols-3">
              {location && (
                <div>
                  <dt className="text-xs uppercase tracking-wider text-lv-secondary">
                    Standort
                  </dt>
                  <dd className="mt-1 inline-flex items-center gap-1 font-medium">
                    <MapPin className="h-3.5 w-3.5 text-lv-secondary" />
                    {location}
                  </dd>
                </div>
              )}
              {startup.teamSize && (
                <div>
                  <dt className="text-xs uppercase tracking-wider text-lv-secondary">
                    Teamgröße
                  </dt>
                  <dd className="mt-1 inline-flex items-center gap-1 font-medium">
                    <Users className="h-3.5 w-3.5 text-lv-secondary" />
                    {startup.teamSize}
                  </dd>
                </div>
              )}
              {startup.website && (
                <div>
                  <dt className="text-xs uppercase tracking-wider text-lv-secondary">
                    Website
                  </dt>
                  <dd className="mt-1 font-medium">
                    <a
                      href={startup.website}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-lv-blue hover:underline"
                    >
                      <Globe className="h-3.5 w-3.5" />
                      Öffnen
                    </a>
                  </dd>
                </div>
              )}
            </dl>
            {startup.lookingFor.length > 0 && (
              <div className="mt-5 border-t border-lv-border pt-5">
                <p className="text-xs uppercase tracking-wider text-lv-secondary">
                  Sucht aktuell
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {startup.lookingFor.map((tag) => (
                    <Badge key={tag} tone="mint">
                      {startup.seekingFunding && tag === "Funding" ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : null}
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {startup.attachments.length > 0 && (
            <Card className="divide-y divide-lv-border">
              {startup.attachments.map((a) => (
                <a
                  key={a.id}
                  href={a.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 p-4 hover:bg-lv-surface/50"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-lv-pink text-lv-text">
                    <ExternalLink className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-lv-text">
                      {a.name}
                    </span>
                    <span className="text-xs text-lv-secondary">{a.type}</span>
                  </span>
                </a>
              ))}
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <SectionLabel number="02" label="Kontakt" title="Interesse?" />
          <Card className="p-6">
            {intro ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-lv-secondary">
                    Deine Anfrage
                  </span>
                  <IntroStatusBadge value={intro.status} />
                </div>
                {intro.status === "CONNECTED" && intro.conversationId ? (
                  <LinkButton
                    href={`/messages?c=${intro.conversationId}`}
                    className="w-full"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Zur Konversation
                  </LinkButton>
                ) : intro.status === "PENDING" ? (
                  <p className="text-sm text-lv-secondary">
                    Das Lovedis-Team prüft deine Anfrage und stellt bei Eignung
                    den Kontakt her.
                  </p>
                ) : intro.status === "APPROVED" ? (
                  <p className="text-sm text-lv-secondary">
                    Angenommen — das Team koordiniert die Einführung.
                  </p>
                ) : (
                  <p className="text-sm text-lv-secondary">
                    Diese Anfrage wurde nicht weiterverfolgt.
                  </p>
                )}
              </div>
            ) : (
              <IntroRequestForm startupId={startup.id} />
            )}
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <SectionLabel number="03" label="Aktivität" title="Updates" />
        {startup.updates.length === 0 ? (
          <Card className="flex items-center gap-3 p-6 text-sm text-lv-secondary">
            <Newspaper className="h-4 w-4" />
            Noch keine Updates von diesem Startup.
          </Card>
        ) : (
          <UpdateFeed updates={startup.updates} />
        )}
      </section>
    </>
  );
}
