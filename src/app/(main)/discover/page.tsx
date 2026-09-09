import { Compass, Search } from "lucide-react";
import type { Metadata } from "next";
import type { Prisma } from "@/generated/prisma/client";
import type { StartupStage } from "@/generated/prisma/enums";
import {
  StartupCard,
  type DiscoverStartup,
} from "@/components/discovery/StartupCard";
import { BannerStat } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input, Select } from "@/components/ui/Field";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { requireMarketplace } from "@/lib/auth-guards";
import {
  LOOKING_FOR_OPTIONS,
  STARTUP_STAGES,
  STARTUP_STAGE_LABELS,
} from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Entdecken" };

interface SearchParams {
  q?: string;
  industry?: string;
  stage?: string;
  looking?: string;
}

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await requireMarketplace();
  const { q, industry, stage, looking } = await searchParams;

  const where: Prisma.StartupWhereInput = { isPublished: true };
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { tagline: { contains: q, mode: "insensitive" } },
      { publicPitch: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }
  if (industry) where.industry = industry;
  if (stage && STARTUP_STAGES.includes(stage as StartupStage)) {
    where.stage = stage as StartupStage;
  }
  if (looking) where.lookingFor = { has: looking };

  const [startups, total, industriesRaw, myFollows] = await Promise.all([
    prisma.startup.findMany({
      where,
      select: {
        id: true,
        name: true,
        tagline: true,
        description: true,
        logoUrl: true,
        industry: true,
        stage: true,
        city: true,
        country: true,
        teamSize: true,
        seekingFunding: true,
        seekingAmount: true,
        lookingFor: true,
        _count: { select: { followers: true } },
      },
      orderBy: [{ publishedAt: "desc" }, { name: "asc" }],
    }),
    prisma.startup.count({ where: { isPublished: true } }),
    prisma.startup.findMany({
      where: { isPublished: true },
      select: { industry: true },
      distinct: ["industry"],
      orderBy: { industry: "asc" },
    }),
    prisma.startupFollow.findMany({
      where: { userId: session.user.id },
      select: { startupId: true },
    }),
  ]);

  const followingSet = new Set(myFollows.map((f) => f.startupId));
  const items: DiscoverStartup[] = startups.map((s) => ({
    id: s.id,
    name: s.name,
    tagline: s.tagline,
    description: s.description,
    logoUrl: s.logoUrl,
    industry: s.industry,
    stage: s.stage,
    city: s.city,
    country: s.country,
    teamSize: s.teamSize,
    seekingFunding: s.seekingFunding,
    seekingAmount: s.seekingAmount,
    lookingFor: s.lookingFor,
    followerCount: s._count.followers,
  }));

  const seekingFunding = startups.filter((s) => s.seekingFunding).length;

  return (
    <>
      <HeroBanner
        kicker="Ökosystem"
        title="Startup-Universum entdecken"
        subtitle="Entdecke die Startups aus unserem aktuellen Industry Batch #1 zum Thema Wissensmanagement."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:max-w-md">
          <BannerStat label="Öffentliche Startups" value={total} />
          <BannerStat label="Treffer" value={items.length} />
          <BannerStat label="Sucht Funding" value={seekingFunding} />
        </div>
      </HeroBanner>

      <section className="space-y-4">
        <SectionLabel number="01" label="Entdecken" title="Öffentliche Profile" />

        <form
          method="GET"
          className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto_auto]"
        >
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-lv-secondary" />
            <Input
              name="q"
              defaultValue={q}
              placeholder="Nach Name, Tagline oder Pitch suchen…"
              className="pl-9"
            />
          </div>
          <Select name="industry" defaultValue={industry ?? ""} className="sm:w-44">
            <option value="">Alle Branchen</option>
            {industriesRaw.map((i) => (
              <option key={i.industry} value={i.industry}>
                {i.industry}
              </option>
            ))}
          </Select>
          <Select name="stage" defaultValue={stage ?? ""} className="sm:w-36">
            <option value="">Alle Phasen</option>
            {STARTUP_STAGES.map((s) => (
              <option key={s} value={s}>
                {STARTUP_STAGE_LABELS[s]}
              </option>
            ))}
          </Select>
          <Select name="looking" defaultValue={looking ?? ""} className="sm:w-40">
            <option value="">Sucht …</option>
            {LOOKING_FOR_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </Select>
          <button
            type="submit"
            className="rounded-button bg-lv-blue px-4 py-2.5 text-sm font-semibold text-white hover:bg-lv-blue-dark transition-colors"
          >
            Filtern
          </button>
        </form>

        {items.length === 0 ? (
          <EmptyState
            icon={Compass}
            title="Keine Startups gefunden"
            description="Passe deine Filter an oder schau bald wieder vorbei — das Universum wächst stetig."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((s) => (
              <StartupCard
                key={s.id}
                startup={s}
                following={followingSet.has(s.id)}
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
