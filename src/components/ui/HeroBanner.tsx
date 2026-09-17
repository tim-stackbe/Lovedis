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
        "rounded-card bg-lv-cover text-white p-6 sm:p-8 shadow-card relative overflow-hidden",
        className
      )}
    >
      {/* Warm orange orb echoing the gradient's far edge */}
      <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-lv-orange/40 blur-3xl pointer-events-none" />
      {/* Subtle indigo depth in the lower-left */}
      <div className="absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-lv-blue-dark/40 blur-3xl pointer-events-none" />
      <div className="relative">
        <p className="lv-wordmark text-xs text-white/75">{kicker}</p>
        <div className="mt-3 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-4xl">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/80">
                {subtitle}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex flex-wrap gap-3 sm:shrink-0">{actions}</div>
          )}
        </div>
        {children && <div className="mt-6">{children}</div>}
      </div>
    </div>
  );
}
