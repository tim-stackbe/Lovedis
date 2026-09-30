import {
  GraduationCapIcon,
  VentureIcon,
} from "@/components/icons/lovedis";
import { Info as InfoIcon } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import type { SupportCategory } from "@/generated/prisma/enums";
import { CardTrack } from "@/components/marketplace/CardTrack";
import { MarketplaceHero } from "@/components/marketplace/MarketplaceHero";
import { OfferingCard } from "@/components/marketplace/OfferingCard";
import { ProgramFeatureCard } from "@/components/marketplace/ProgramFeatureCard";
import { PreviewBanner } from "@/components/shared/PreviewBanner";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireVentureView } from "@/lib/auth-guards";
import { SUPPORT_CATEGORIES, SUPPORT_CATEGORY_LABELS } from "@/lib/constants";
import { deriveCreditBudget } from "@/lib/credit-buckets";
import { prisma } from "@/lib/prisma";
import { isTeamRole } from "@/lib/roles";

export const metadata: Metadata = { title: "Startup Support Marketplace" };
export default async function MarketplacePage() {
  const session = await requireVentureView();
  const teamMode = isTeamRole(session.user.role);

  const [startup, programs, offerings] = await Promise.all([
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
        offeringCount={offerings.length}
      />

      <div
        role="note"
        className="flex items-start gap-3 rounded-card border border-lv-blue-soft bg-lv-blue-soft px-5 py-4 text-sm leading-relaxed text-lv-blue"
      >
        <InfoIcon className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Du bekommst{" "}
          <strong>10 Venture Credits für dein individuelles Programm</strong>,
          sponsored by LOVEDIS. <strong>So geht&apos;s:</strong> Session
          anfragen, Bedarf angeben, LOVEDIS koordiniert Matching und Termin.
          Credits werden nach Bestätigung eingelöst.
        </p>
      </div>

      {teamMode && (
        <PreviewBanner>
          Dies ist die Storefront, die Startups sehen — mit allen Programm- und
          Angebots-Karten. Über „Details & Anfrage“ kannst du
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
            Für Startups in diesem Programm kostenlos — keine Credits
            erforderlich.
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
                  format: p.format,
                  sessionCount: p.sessions.length,
                  comingSoon: p.comingSoon,
                }}
              />
            ))}
          </div>
        )}
      </section>

      {/* Support-Angebote — one row per category ------------------------------ */}
      <section className="space-y-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-lv-text sm:text-2xl">
            Individuelle Support Angebote
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-lv-secondary">
            Buche gemeinsame Workshops, individuelle Sparring Sessions oder
            Expert:innen Support flexibel über deine Venture Credits. Erhalte
            ehrliches Feedback, neue Perspektiven und praxisnahe Einblicke.
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
