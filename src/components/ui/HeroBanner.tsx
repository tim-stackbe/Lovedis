import { cn } from "@/lib/utils";

interface HeroBannerProps {
  kicker: string;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

/** Signature Lovedis hero banner: blue card with blurred orange orb. */
export function HeroBanner({
  kicker,
  title,
  subtitle,
  children,
  actions,
  className,
}: HeroBannerProps) {
  return (
    <div
      className={cn(
        "rounded-card bg-lv-blue text-white p-6 sm:p-8 shadow-card relative overflow-hidden",
        className
      )}
    >
      <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-lv-orange/30 blur-3xl pointer-events-none" />
      <div className="relative">
        <p className="lv-wordmark text-xs text-white/70">{kicker}</p>
        <div className="mt-3 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-2 max-w-2xl text-sm text-white/70">{subtitle}</p>
            )}
          </div>
          {actions && <div className="flex shrink-0 gap-3">{actions}</div>}
        </div>
        {children && <div className="mt-6">{children}</div>}
      </div>
    </div>
  );
}
