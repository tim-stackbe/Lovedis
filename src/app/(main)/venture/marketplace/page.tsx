import {
  GraduationCapIcon,
  UsersIcon,
  VentureIcon,
} from "@/components/icons/lovedis";
import Link from "next/link";
import type { Metadata } from "next";
import type { SupportCategory } from "@/generated/prisma/enums";
import { CardTrack } from "@/components/marketplace/CardTrack";
import { MarketplaceHero } from "@/components/marketplace/MarketplaceHero";
import { MentorCard } from "@/components/marketplace/MentorCard";
import { OfferingCard } from "@/components/marketplace/OfferingCard";
import { ProgramFeatureCard } from "@/components/marketplace/ProgramFeatureCard";
import { SectionRow } from "@/components/marketplace/SectionRow";
import { PreviewBanner } from "@/components/shared/PreviewBanner";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireVentureView } from "@/lib/auth-guards";
import { SUPPORT_CATEGORIES, SUPPORT_CATEGORY_LABELS } from "@/lib/constants";
import { deriveCreditBudget } from "@/lib/credit-buckets";
import { prisma } from "@/lib/prisma";
import { isTeamRole } from "@/lib/roles";

export const metadata: Metadata = { title: "Marktplatz" };

export default async function MarketplacePage() {
  const session = await requireVentureView();
  const teamMode = isTeamRole(session.user.role);

  const [startup, programs, mentors, offerings] = await Promise.all([
    prisma.startup.findUnique({
      where: { ownerUserId: session.user.id },
      select: {
        creditAccount: {
          select: { balance: true, fixBalance: true, flexBalance: true },
        },
      },
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

  const budget = deriveCreditBudget(startup?.creditAccount);

  // Group offerings by category so each category becomes its own editorial row.
  const offeringsByCategory = SUPPORT_CATEGORIES.map((category) => ({
    category,
    items: offerings.filter((o) => o.category === category),
  })).filter((group) => group.items.length > 0);

  return (
    <>
      <MarketplaceHero
        budget={budget}
        teamMode={teamMode}
        programCount={programs.length}
        mentorCount={mentors.length}
        offeringCount={offerings.length}
      />

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

      {/* Exklusive Programme — wide featured card(s) --------------------------- */}
      <section className="space-y-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-lv-text sm:text-2xl">
            Exklusive Programme
          </h2>
          <p className="mt-1 text-sm text-lv-secondary">
            Sorgfältig kuratierte Programme für deinen Wachstumsschub — keine
            Credits erforderlich.
          </p>
        </div>
        {programs.length === 0 ? (
          <EmptyState
            icon={GraduationCapIcon}
            title="Noch keine Programme"
            description="Sobald Programme freigeschaltet sind, erscheinen sie hier."
          />
        ) : (
          <div className="space-y-4">
            {programs.map((p) => (
              <ProgramFeatureCard
                key={p.id}
                program={{
                  id: p.id,
                  title: p.title,
                  summary: p.summary,
                  focusTags: p.focusTags,
                  sessionDate: p.sessionDate,
                  contactPerson: p.contactPerson,
                }}
              />
            ))}
          </div>
        )}
      </section>

      {/* Mentor:innen-Netzwerk — horizontal track ----------------------------- */}
      {mentors.length === 0 ? (
        <section className="space-y-3">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-lv-text sm:text-2xl">
              Mentor:innen-Netzwerk
            </h2>
            <p className="mt-1 text-sm text-lv-secondary">
              Erfahrene Expert:innen, die dich weiterbringen.
            </p>
          </div>
          <EmptyState
            icon={UsersIcon}
            title="Noch keine Mentor:innen"
            description="Das Lovedis-Team kuratiert das Mentor:innen-Netzwerk."
          />
        </section>
      ) : (
        <SectionRow
          title="Mentor:innen-Netzwerk"
          subtitle="Erfahrene Expert:innen, die dich weiterbringen."
        >
          {mentors.map((m) => (
            <MentorCard
              key={m.id}
              mentor={{
                id: m.id,
                name: m.name,
                company: m.company,
                role: m.role,
                expertise: m.expertise,
                photoUrl: m.photoUrl,
                creditCost: m.creditCost,
              }}
            />
          ))}
        </SectionRow>
      )}

      {/* Support-Angebote — one row per category ------------------------------ */}
      <section className="space-y-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-lv-text sm:text-2xl">
            Support-Angebote
          </h2>
          <p className="mt-1 text-sm text-lv-secondary">
            Die besten Services für jede Phase deines Startups — nach Kategorie.
          </p>
        </div>
        {offeringsByCategory.length === 0 ? (
          <EmptyState
            icon={VentureIcon}
            title="Noch keine Angebote"
            description="Workshops und Sparring für Fundraising, Legal, Marketing und mehr folgen."
          />
        ) : (
          offeringsByCategory.map(({ category, items }) => (
            <CategoryRow key={category} category={category} items={items} />
          ))
        )}
      </section>
    </>
  );
}

/** A single support category as a labelled horizontal track. */
function CategoryRow({
  category,
  items,
}: {
  category: SupportCategory;
  items: {
    id: string;
    title: string;
    category: SupportCategory;
    summary: string;
    format: string | null;
    providerCompany: string | null;
    creditCost: number;
  }[];
}) {
  const label = SUPPORT_CATEGORY_LABELS[category];
  return (
    <div className="space-y-2">
      <div className="flex items-baseline gap-2">
        <h3 className="text-base font-bold text-lv-text">{label}</h3>
        <span className="text-xs text-lv-secondary">
          {items.length} {items.length === 1 ? "Angebot" : "Angebote"}
        </span>
      </div>
      <CardTrack ariaLabel={`Support-Angebote: ${label}`}>
        {items.map((o) => (
          <OfferingCard
            key={o.id}
            offering={{
              id: o.id,
              title: o.title,
              category: o.category,
              summary: o.summary,
              format: o.format,
              providerCompany: o.providerCompany,
              creditCost: o.creditCost,
            }}
          />
        ))}
      </CardTrack>
    </div>
  );
}
