import { cn } from "@/lib/utils";

/**
 * Vertical activity timeline matching the storefront mockup's "Aktivität"
 * section: a hairline rail with category-colored markers and clean rows.
 */
export function Timeline({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <ol
      className={cn(
        "relative ml-1.5 space-y-5 border-l border-lv-border pl-7",
        className
      )}
    >
      {children}
    </ol>
  );
}

/** Tailwind classes for the marker dot, keyed to the same tones as badges. */
const MARKER_TONES: Record<string, string> = {
  mint: "bg-lv-mint-deep",
  blue: "bg-lv-blue",
  orange: "bg-lv-orange",
  yellow: "bg-lv-yellow-deep",
  pink: "bg-lv-pink",
  muted: "bg-lv-secondary",
};

interface TimelineItemProps {
  /** Tone of the rail marker; mirrors the row's category badge. */
  marker?: keyof typeof MARKER_TONES;
  /** Optional leading visual (e.g. a StartupLogo) shown before the text. */
  leading?: React.ReactNode;
  /** Badge + date row above the title. */
  meta?: React.ReactNode;
  title: React.ReactNode;
  /** Optional trailing element (e.g. a delete action). */
  action?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function TimelineItem({
  marker = "blue",
  leading,
  meta,
  title,
  action,
  children,
  className,
}: TimelineItemProps) {
  return (
    <li className={cn("relative", className)}>
      <span
        className={cn(
          "absolute -left-[33px] top-1.5 h-3 w-3 rounded-full ring-4 ring-white",
          MARKER_TONES[marker]
        )}
        aria-hidden
      />
      <div className="flex items-start gap-3">
        {leading && <div className="shrink-0">{leading}</div>}
        <div className="min-w-0 flex-1">
          {meta && (
            <div className="flex flex-wrap items-center gap-2">{meta}</div>
          )}
          <p className="mt-1 text-sm font-bold leading-snug text-lv-text">
            {title}
          </p>
          {children && (
            <div className="mt-1 text-sm leading-relaxed text-lv-secondary">
              {children}
            </div>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </li>
  );
}
