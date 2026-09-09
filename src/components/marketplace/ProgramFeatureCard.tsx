import Link from "next/link";
import {
  ArrowRightIcon,
  CalendarIcon,
  ProfileIcon,
  StartupsIcon,
} from "@/components/icons/lovedis";
import { CreditCostBadge } from "@/components/shared/badges";

export interface ProgramCardData {
  id: string;
  title: string;
  summary: string;
  focusTags: string[];
  sessionDate: string | null;
  contactPerson: string | null;
}

/**
 * Wide, editorial featured card for an inclusive program ("Exklusive
 * Programme"). Programs cost no flexible credits, so the badge reads
 * "Inklusive". Links to the existing program detail / Anfrage flow.
 */
export function ProgramFeatureCard({ program }: { program: ProgramCardData }) {
  return (
    <Link
      href={`/venture/marketplace/programs/${program.id}`}
      className="group grid overflow-hidden rounded-card border border-lv-border bg-white shadow-card transition hover:border-lv-blue/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lv-blue/40 focus-visible:ring-offset-2 md:grid-cols-[minmax(0,16rem)_1fr]"
    >
      {/* Decorative gradient panel with the "EXKLUSIV" tag */}
      <div className="relative flex min-h-[9rem] items-center justify-center overflow-hidden bg-lv-cover p-6 text-white">
        <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-lv-orange/40 blur-3xl" />
        <StartupsIcon className="relative h-12 w-12 opacity-90" />
        <span className="lv-wordmark absolute left-4 top-4 rounded-full bg-white/15 px-2.5 py-1 text-[10px] text-white backdrop-blur">
          Exklusiv
        </span>
      </div>

      <div className="flex flex-col p-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h3 className="text-lg font-bold text-lv-text sm:text-xl">
            {program.title}
          </h3>
          <CreditCostBadge cost={0} />
        </div>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-lv-secondary">
          {program.summary}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-lv-secondary">
          {program.sessionDate && (
            <span className="flex items-center gap-1.5">
              <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-lv-blue" />
              {program.sessionDate}
            </span>
          )}
          {program.contactPerson && (
            <span className="flex items-center gap-1.5">
              <ProfileIcon className="h-3.5 w-3.5 shrink-0 text-lv-blue" />
              {program.contactPerson}
            </span>
          )}
        </div>

        {program.focusTags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {program.focusTags.map((t) => (
              <span
                key={t}
                className="rounded-full bg-lv-surface px-2 py-0.5 text-xs text-lv-secondary"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-lv-blue">
          Mehr erfahren
          <ArrowRightIcon className="h-4 w-4 transition group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
