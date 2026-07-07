import Link from "next/link";
import { ArrowRight, Building2, CalendarClock } from "lucide-react";
import type { SupportCategory } from "@/generated/prisma/enums";
import { CreditCostBadge, SupportCategoryBadge } from "@/components/shared/badges";

export interface OfferingCardData {
  id: string;
  title: string;
  category: SupportCategory;
  summary: string;
  format: string | null;
  providerCompany: string | null;
  creditCost: number;
}

/** Support-offering card for the category tracks. Links to the detail. */
export function OfferingCard({ offering }: { offering: OfferingCardData }) {
  return (
    <Link
      href={`/venture/marketplace/support/${offering.id}`}
      className="group flex w-72 shrink-0 snap-start flex-col rounded-card border border-lv-border bg-white p-5 shadow-card transition hover:border-lv-blue/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lv-blue/40 focus-visible:ring-offset-2"
    >
      <div className="flex items-start justify-between gap-2">
        <SupportCategoryBadge value={offering.category} />
        <CreditCostBadge cost={offering.creditCost} />
      </div>

      <h3 className="mt-3 line-clamp-2 text-base font-bold text-lv-text">
        {offering.title}
      </h3>
      <p className="mt-1 line-clamp-2 flex-1 text-sm text-lv-secondary">
        {offering.summary}
      </p>

      <div className="mt-3 space-y-1">
        {offering.providerCompany && (
          <p className="flex items-center gap-1.5 text-xs text-lv-secondary">
            <Building2 className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{offering.providerCompany}</span>
          </p>
        )}
        {offering.format && (
          <p className="flex items-center gap-1.5 text-xs text-lv-secondary">
            <CalendarClock className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{offering.format}</span>
          </p>
        )}
      </div>

      <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-lv-blue">
        Details &amp; Anfrage
        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
