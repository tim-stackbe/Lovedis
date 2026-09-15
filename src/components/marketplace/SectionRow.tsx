import { CardTrack } from "@/components/marketplace/CardTrack";

interface SectionRowProps {
  title: string;
  subtitle?: string;
  /** Optional accessible label override for the scroll region. */
  ariaLabel?: string;
  children: React.ReactNode;
}

/**
 * Editorial section with a title + subtitle header and a horizontally
 * scrollable card track underneath ("Netflix-row" style). Server component;
 * the interactive scrolling lives in the client `CardTrack`.
 */
export function SectionRow({
  title,
  subtitle,
  ariaLabel,
  children,
}: SectionRowProps) {
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-lv-text sm:text-2xl">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-1 text-sm text-lv-secondary">{subtitle}</p>
          )}
        </div>
      </div>
      <CardTrack ariaLabel={ariaLabel ?? title}>{children}</CardTrack>
    </section>
  );
}
