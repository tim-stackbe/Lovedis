import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons/lovedis";
import { CreditCostBadge } from "@/components/shared/badges";
import { initials } from "@/lib/utils";

export interface MentorCardData {
  id: string;
  name: string;
  company: string | null;
  role: string | null;
  expertise: string[];
  photoUrl: string | null;
  creditCost: number;
}

function MentorAvatar({
  name,
  photoUrl,
}: {
  name: string;
  photoUrl: string | null;
}) {
  if (photoUrl) {
    return (
      <Image
        src={photoUrl}
        alt={`Foto von ${name}`}
        width={48}
        height={48}
        className="h-12 w-12 shrink-0 rounded-full object-cover"
        unoptimized
      />
    );
  }
  return (
    <span
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-lv-blue-soft text-sm font-bold text-lv-blue"
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

/** Mentor card for the "Mentor:innen-Netzwerk" track. Links to the detail. */
export function MentorCard({ mentor }: { mentor: MentorCardData }) {
  const subline = [mentor.role, mentor.company].filter(Boolean).join(" · ");
  return (
    <Link
      href={`/venture/marketplace/mentors/${mentor.id}`}
      className="group flex w-72 shrink-0 snap-start flex-col rounded-card border border-lv-border bg-white p-5 shadow-card transition hover:border-lv-blue/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lv-blue/40 focus-visible:ring-offset-2"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <MentorAvatar name={mentor.name} photoUrl={mentor.photoUrl} />
          <div className="min-w-0">
            <p className="truncate font-bold text-lv-text">{mentor.name}</p>
            {subline && (
              <p className="truncate text-xs text-lv-secondary">{subline}</p>
            )}
          </div>
        </div>
        <CreditCostBadge cost={mentor.creditCost} />
      </div>

      {mentor.expertise.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {mentor.expertise.slice(0, 3).map((t) => (
            <span
              key={t}
              className="rounded-full bg-lv-surface px-2 py-0.5 text-xs text-lv-secondary"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-lv-blue">
        Details &amp; Anfrage
        <ArrowRightIcon className="h-4 w-4 transition group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
