import {
  ArrowRightIcon,
  GraduationCapIcon,
  VentureIcon,
  type IconRenderer,
} from "@/components/icons/lovedis";
import { CreditBudgetBreakdown } from "@/components/credits/CreditBudgetBreakdown";
import { LinkButton } from "@/components/ui/Button";
import { PictogramChip } from "@/components/ui/PictogramChip";
import type { CreditBudgetView } from "@/lib/credit-buckets";

interface MarketplaceHeroProps {
  budget: CreditBudgetView;
  teamMode: boolean;
  /** Partner/investor browse mode: catalog widget, no budget, no requests link. */
  viewOnly?: boolean;
  programCount: number;
  offeringCount: number;
}

/** Small labelled stat used inside the team-preview hero widget. */
function WidgetStat({
  icon: Icon,
  label,
  value,
}: {
  icon: IconRenderer;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <PictogramChip icon={Icon} tone="info" size="sm" />
      <span>
        <span className="block text-lg font-bold leading-none text-lv-text">
          {value}
        </span>
        <span className="text-xs text-lv-secondary">{label}</span>
      </span>
    </div>
  );
}

/**
 * Editorial gradient hero for the Startup Support Marketplace storefront. On the
 * left a heading + subline; on the right an embedded white credit-budget widget
 * that reuses `CreditBudgetBreakdown` (bar variant). In
 * the internal team's admin preview the budget (which is empty for team
 * accounts) is swapped for a catalog-overview widget.
 */
export function MarketplaceHero({
  budget,
  teamMode,
  viewOnly = false,
  programCount,
  offeringCount,
}: MarketplaceHeroProps) {
  const showCatalogWidget = teamMode || viewOnly;
  return (
    <section className="relative overflow-hidden rounded-card bg-lv-cover p-6 text-white shadow-card sm:p-8 lg:p-10">
      {/* Warm orange orb echoing the gradient's far edge */}
      <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-lv-orange/40 blur-3xl" />
      {/* Subtle indigo depth in the lower-left */}
      <div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-lv-blue-dark/40 blur-3xl" />

      <div className="relative grid gap-6 lg:grid-cols-[1.5fr_1fr] lg:items-center">
        <div>
          <p className="lv-wordmark text-xs text-white/75">
            LOVEDIS Startup Support Marketplace
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Wachse mit deinen Venture Credits
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/80 sm:text-base">
            Nutze deine Venture Credits für exklusive Programme rund um{" "}
            <strong className="font-semibold text-white">KI &amp; Tech</strong>{" "}
            und{" "}
            <strong className="font-semibold text-white">Sales &amp; Growth</strong>
            , um zentrale Wachstumsfelder deines Startups gezielt
            weiterzuentwickeln. Greife ergänzend auf unser Expert:innen-Netzwerk
            für individuelle Sessions zu.
          </p>
          {!viewOnly && (
            <div className="mt-6">
              <LinkButton
                href={teamMode ? "/marketplace" : "/venture/marketplace/requests"}
                variant="white"
                size="md"
              >
                {teamMode ? "Zur Koordination" : "Meine Anfragen"}
                <ArrowRightIcon className="h-4 w-4" />
              </LinkButton>
            </div>
          )}
        </div>

        {/* Budget widget (startup) / catalog overview (team preview) */}
        <div className="rounded-card bg-white/95 p-5 text-lv-text shadow-card backdrop-blur sm:p-6">
          {showCatalogWidget ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-wider text-lv-secondary">
                Katalog-Überblick
              </p>
              <p className="mt-1 text-sm text-lv-secondary">
                {teamMode
                  ? "Admin-Vorschau: Startups sehen hier ihr Credit-Budget."
                  : "Buchbar für Startups im Programm."}
              </p>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <WidgetStat
                  icon={GraduationCapIcon}
                  label="Programme"
                  value={programCount}
                />
                <WidgetStat
                  icon={VentureIcon}
                  label="Angebote"
                  value={offeringCount}
                />
              </div>
            </>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-wider text-lv-secondary">
                Dein Credit-Budget
              </p>
              <p className="mt-1 text-3xl font-bold tracking-tight">
                {budget.remaining}{" "}
                <span className="text-lg font-semibold text-lv-secondary">
                  von {budget.total} Credits
                </span>
              </p>
              <CreditBudgetBreakdown budget={budget} variant="bar" className="mt-4" />
            </>
          )}
        </div>
      </div>
    </section>
  );
}
