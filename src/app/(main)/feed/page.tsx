import { Compass, Newspaper, Users } from "lucide-react";
import type { Metadata } from "next";
import { UpdateFeed, type FeedUpdate } from "@/components/discovery/UpdateFeed";
import { LinkButton } from "@/components/ui/Button";
import { BannerStat } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { requireMarketplace } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Feed" };

export default async function FeedPage() {
  const session = await requireMarketplace();

  const follows = await prisma.startupFollow.findMany({
    where: { userId: session.user.id },
    select: { startupId: true },
  });
  const startupIds = follows.map((f) => f.startupId);

  const updates = startupIds.length
    ? await prisma.startupUpdate.findMany({
        where: { startupId: { in: startupIds } },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          title: true,
          body: true,
          category: true,
          createdAt: true,
          startup: { select: { id: true, name: true, logoUrl: true } },
        },
      })
    : [];

  const items: FeedUpdate[] = updates.map((u) => ({
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
        kicker="Ökosystem"
        title="Dein Feed"
        subtitle="Die neuesten Updates der Startups, denen du folgst — Meilensteine, Finanzierungen, Produktnews."
        actions={
          <LinkButton href="/discover" variant="white">
            <Compass className="h-4 w-4" />
            Mehr entdecken
          </LinkButton>
        }
      >
        <div className="grid grid-cols-2 gap-3 sm:max-w-md">
          <BannerStat icon={Users} label="Ich folge" value={startupIds.length} />
          <BannerStat icon={Newspaper} label="Updates" value={items.length} />
        </div>
      </HeroBanner>

      <section className="space-y-4">
        <SectionLabel number="01" label="Aktivität" title="Neueste Updates" />
        {items.length === 0 ? (
          <EmptyState
            icon={startupIds.length === 0 ? Compass : Newspaper}
            title={
              startupIds.length === 0
                ? "Du folgst noch keinem Startup"
                : "Noch keine Updates"
            }
            description={
              startupIds.length === 0
                ? "Entdecke das Startup-Universum und folge den Teams, die dich interessieren — ihre Updates erscheinen dann hier."
                : "Die Startups, denen du folgst, haben noch nichts gepostet. Schau bald wieder vorbei."
            }
            action={
              <LinkButton href="/discover">
                <Compass className="h-4 w-4" />
                Startups entdecken
              </LinkButton>
            }
          />
        ) : (
          <UpdateFeed updates={items} />
        )}
      </section>
    </>
  );
}
