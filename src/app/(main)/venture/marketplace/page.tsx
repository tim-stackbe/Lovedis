import { ArrowRight, Coins, GraduationCap, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import {
  OfferingTypeBadge,
  SupportCategoryBadge,
} from "@/components/shared/badges";
import { PreviewBanner } from "@/components/shared/PreviewBanner";
import { BannerStat, Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { LinkButton } from "@/components/ui/Button";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { requireVentureView } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { isTeamRole } from "@/lib/roles";

export const metadata: Metadata = { title: "Marktplatz" };

function CreditTag({ cost }: { cost: number }) {
  if (cost <= 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-lv-mint px-2.5 py-0.5 text-xs font-semibold text-lv-mint-deep">
        Inklusive
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-lv-blue-soft px-2.5 py-0.5 text-xs font-semibold text-lv-blue">
      <Coins className="h-3 w-3" />
      {cost} Credits
    </span>
  );
}

export default async function MarketplacePage() {
  const session = await requireVentureView();
  const teamMode = isTeamRole(session.user.role);

  const [startup, programs, mentors, offerings] = await Promise.all([
    prisma.startup.findUnique({
      where: { ownerUserId: session.user.id },
      select: { creditAccount: { select: { balance: true } } },
    }),
    prisma.program.findMany({
      where: { status: "OPEN" },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.mentorProfile.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.supportOffering.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  const balance = startup?.creditAccount?.balance ?? 0;

  return (
    <>
      <HeroBanner
        kicker="Venture Platform"
        title="Startup-Marktplatz"
        subtitle="Wachse mit exklusiven Programmen, dem Mentor:innen-Netzwerk und individuellen Support-Angeboten — koordiniert vom Lovedis-Team."
        actions={
          <LinkButton
            href={teamMode ? "/marketplace" : "/venture/marketplace/requests"}
            variant="white"
            size="sm"
          >
            {teamMode ? "Zur Koordination" : "Meine Anfragen"}
            <ArrowRight className="h-4 w-4" />
          </LinkButton>
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:max-w-lg">
          {teamMode ? (
            <BannerStat
              label="Programme"
              value={programs.length}
              icon={GraduationCap}
            />
          ) : (
            <BannerStat label="Guthaben" value={balance} icon={Coins} />
          )}
          <BannerStat label="Mentor:innen" value={mentors.length} icon={Users} />
          <BannerStat label="Angebote" value={offerings.length} icon={Sparkles} />
        </div>
      </HeroBanner>

      {teamMode && (
        <PreviewBanner>
          Dies ist die Storefront, die Startups sehen — mit allen Partner-,
          Mentor:innen- und Programm-Karten. Über „Details & Anfrage“ kannst du
          eine Anfrage im Auftrag eines Startups senden. Credits vergibst du
          unter{" "}
          <Link
            href="/credits"
            className="font-semibold underline underline-offset-2"
          >
            Venture-Credits
          </Link>
          .
        </PreviewBanner>
      )}

      {/* Programme ---------------------------------------------------------- */}
      <section className="space-y-4">
        <SectionLabel
          number="01"
          label="Inklusive"
          title="Exklusive Programme"
        />
        {programs.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="Noch keine Programme"
            description="Sobald Programme freigeschaltet sind, erscheinen sie hier."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {programs.map((p) => (
              <Card key={p.id} className="flex flex-col p-5">
                <div className="flex items-start justify-between gap-2">
                  <OfferingTypeBadge value="PROGRAM" />
                  <CreditTag cost={0} />
                </div>
                <h3 className="mt-3 text-base font-bold text-lv-text">
                  {p.title}
                </h3>
                <p className="mt-1 flex-1 text-sm text-lv-secondary">
                  {p.summary}
                </p>
                {p.focusTags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {p.focusTags.map((t) => (
                      <span
                        key={t}
                        className="rounded-full bg-lv-surface px-2 py-0.5 text-xs text-lv-secondary"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                <Link
                  href={`/venture/marketplace/programs/${p.id}`}
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-lv-blue hover:underline"
                >
                  Details & Anfrage
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Mentor:innen ------------------------------------------------------- */}
      <section className="space-y-4">
        <SectionLabel
          number="02"
          label="Credits"
          title="Mentor:innen-Netzwerk"
        />
        {mentors.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Noch keine Mentor:innen"
            description="Das Lovedis-Team kuratiert das Mentor:innen-Netzwerk."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {mentors.map((m) => (
              <Card key={m.id} className="flex flex-col p-5">
                <div className="flex items-start justify-between gap-2">
                  <OfferingTypeBadge value="MENTOR_SESSION" />
                  <CreditTag cost={m.creditCost} />
                </div>
                <h3 className="mt-3 text-base font-bold text-lv-text">
                  {m.name}
                </h3>
                <p className="text-sm text-lv-secondary">
                  {[m.role, m.company].filter(Boolean).join(" · ")}
                </p>
                {m.expertise.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {m.expertise.map((t) => (
                      <span
                        key={t}
                        className="rounded-full bg-lv-surface px-2 py-0.5 text-xs text-lv-secondary"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                <Link
                  href={`/venture/marketplace/mentors/${m.id}`}
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-lv-blue hover:underline"
                >
                  Details & Anfrage
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Support-Angebote --------------------------------------------------- */}
      <section className="space-y-4">
        <SectionLabel
          number="03"
          label="Credits"
          title="Individuelle Support-Angebote"
        />
        {offerings.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="Noch keine Angebote"
            description="Workshops und Sparring für Fundraising, Legal, Marketing und mehr folgen."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {offerings.map((o) => (
              <Card key={o.id} className="flex flex-col p-5">
                <div className="flex items-start justify-between gap-2">
                  <SupportCategoryBadge value={o.category} />
                  <CreditTag cost={o.creditCost} />
                </div>
                <h3 className="mt-3 text-base font-bold text-lv-text">
                  {o.title}
                </h3>
                <p className="mt-1 flex-1 text-sm text-lv-secondary">
                  {o.summary}
                </p>
                {o.format && (
                  <p className="mt-2 text-xs font-medium text-lv-secondary">
                    Format: {o.format}
                  </p>
                )}
                <Link
                  href={`/venture/marketplace/support/${o.id}`}
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-lv-blue hover:underline"
                >
                  Details & Anfrage
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Card>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
