import { Heart, Trash2, Users } from "lucide-react";
import type { Metadata } from "next";
import { deleteStartupUpdate } from "@/app/actions/discovery";
import { OwnProfileForm } from "@/components/startups/OwnProfileForm";
import { StorefrontForm } from "@/components/startups/StorefrontForm";
import { UpdateComposer } from "@/components/startups/UpdateComposer";
import {
  IntroStatusBadge,
  UPDATE_CATEGORY_TONES,
  UpdateCategoryBadge,
} from "@/components/shared/badges";
import { BannerStat, ToneCard, Card } from "@/components/ui/Card";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Timeline, TimelineItem } from "@/components/ui/Timeline";
import { requireRole } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Mein Profil" };

export default async function ProfilePage() {
  const session = await requireRole(["STARTUP", "ADMIN", "MEMBER"]);

  const startup = await prisma.startup.findUnique({
    where: { ownerUserId: session.user.id },
    include: {
      _count: { select: { followers: true } },
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
      introRequests: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          createdAt: true,
          investor: { select: { name: true, company: true } },
        },
      },
    },
  });

  const followerCount = startup?._count.followers ?? 0;
  const introCount = startup?.introRequests.length ?? 0;

  return (
    <>
      <HeroBanner
        kicker="Self-Service"
        title="Dein Startup-Profil"
        subtitle="Pflege deine Daten, veröffentliche ein Storefront-Profil für Investoren und halte deine Follower mit Updates auf dem Laufenden."
      >
        {startup && (
          <div className="grid grid-cols-2 gap-3 sm:max-w-md">
            <BannerStat icon={Users} label="Follower" value={followerCount} />
            <BannerStat icon={Heart} label="Intro-Anfragen" value={introCount} />
          </div>
        )}
      </HeroBanner>

      <section className="space-y-4">
        <SectionLabel number="01" label="Profil" title="Unternehmensdaten" />
        <OwnProfileForm startup={startup} />
      </section>

      {startup ? (
        <>
          <section className="space-y-4">
            <SectionLabel
              number="02"
              label="Storefront"
              title="Öffentliches Investoren-Profil"
            />
            <StorefrontForm
              startup={{
                tagline: startup.tagline,
                publicPitch: startup.publicPitch,
                logoUrl: startup.logoUrl,
                seekingFunding: startup.seekingFunding,
                seekingAmount: startup.seekingAmount,
                lookingFor: startup.lookingFor,
                isPublished: startup.isPublished,
              }}
            />
          </section>

          <section className="space-y-4">
            <SectionLabel number="03" label="Traktion" title="Dein Netzwerk" />
            <div className="grid gap-4 sm:grid-cols-2">
              <ToneCard
                tone={followerCount > 0 ? "success" : "muted"}
                label="Follower"
                value={followerCount}
                sub="Investoren & Partner folgen dir"
              />
              <ToneCard
                tone={introCount > 0 ? "attention" : "muted"}
                label="Intro-Anfragen"
                value={introCount}
                sub="über das Lovedis-Team"
              />
            </div>
            {introCount > 0 && (
              <Card className="divide-y divide-lv-border">
                {startup.introRequests.map((r) => {
                  const revealed =
                    r.status === "APPROVED" || r.status === "CONNECTED";
                  return (
                    <div
                      key={r.id}
                      className="flex items-center justify-between gap-3 p-4"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-lv-pink text-lv-text">
                          <Heart className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-lv-text">
                            {revealed
                              ? (r.investor.company ?? r.investor.name)
                              : "Investor-Interesse"}
                          </p>
                          <p className="text-xs text-lv-secondary">
                            {revealed
                              ? formatDate(r.createdAt)
                              : "In Prüfung durch das Lovedis-Team"}
                          </p>
                        </div>
                      </div>
                      <IntroStatusBadge value={r.status} />
                    </div>
                  );
                })}
              </Card>
            )}
          </section>

          <section className="space-y-4">
            <SectionLabel number="04" label="Updates" title="Halte Follower auf dem Laufenden" />
            <UpdateComposer />
            {startup.updates.length > 0 && (
              <Card className="p-6 sm:p-7">
                <Timeline>
                  {startup.updates.map((u) => (
                    <TimelineItem
                      key={u.id}
                      marker={UPDATE_CATEGORY_TONES[u.category]}
                      meta={
                        <>
                          <UpdateCategoryBadge value={u.category} />
                          <span className="text-xs text-lv-secondary">
                            {formatDate(u.createdAt)}
                          </span>
                        </>
                      }
                      title={u.title}
                      action={
                        <form action={deleteStartupUpdate.bind(null, u.id)}>
                          <button
                            type="submit"
                            className="rounded-button p-1.5 text-lv-secondary transition-colors hover:bg-lv-orange-soft hover:text-lv-orange"
                            aria-label={`„${u.title}“ löschen`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </form>
                      }
                    >
                      <p className="line-clamp-2">{u.body}</p>
                    </TimelineItem>
                  ))}
                </Timeline>
              </Card>
            )}
          </section>
        </>
      ) : (
        <Card className="flex items-center gap-3 p-6 text-sm text-lv-secondary">
          <Users className="h-4 w-4" />
          Lege oben dein Unternehmensprofil an, um dein öffentliches
          Storefront-Profil und Updates freizuschalten.
        </Card>
      )}
    </>
  );
}
