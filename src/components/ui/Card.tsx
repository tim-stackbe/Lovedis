import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { PictogramChip } from "@/components/ui/PictogramChip";

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-white border border-lv-border rounded-card shadow-card",
        className
      )}
      {...props}
    />
  );
}

type Tone = "success" | "info" | "warn" | "attention" | "muted";

const TONES: Record<Tone, { card: string; label: string; value: string }> = {
  success: {
    card: "border-lv-mint bg-lv-mint/40",
    label: "text-lv-mint-deep/80",
    value: "text-lv-mint-deep",
  },
  info: {
    card: "border-lv-blue-soft bg-lv-blue-soft",
    label: "text-lv-blue/70",
    value: "text-lv-blue",
  },
  warn: {
    card: "border-lv-orange-soft bg-lv-orange-soft",
    label: "text-lv-orange/80",
    value: "text-lv-orange",
  },
  attention: {
    card: "border-lv-yellow bg-lv-yellow/50",
    label: "text-lv-yellow-deep/80",
    value: "text-lv-yellow-deep",
  },
  muted: {
    card: "border-lv-border bg-white",
    label: "text-lv-secondary",
    value: "text-lv-text",
  },
};

interface ToneCardProps {
  tone?: Tone;
  label: string;
  value: React.ReactNode;
  sub?: string;
  /** Optional lucide icon rendered as a brand-tinted pictogram chip. */
  icon?: LucideIcon;
  className?: string;
}

/** Status KPI card with semantic tone colors. */
export function ToneCard({
  tone = "muted",
  label,
  value,
  sub,
  icon,
  className,
}: ToneCardProps) {
  const t = TONES[tone];
  return (
    <div
      className={cn("rounded-card border p-5 shadow-card", t.card, className)}
    >
      <div className="flex items-start justify-between gap-3">
        <p
          className={cn(
            "text-xs font-semibold uppercase tracking-wider",
            t.label
          )}
        >
          {label}
        </p>
        {icon && <PictogramChip icon={icon} tone={tone} size="sm" />}
      </div>
      <p className={cn("mt-2 text-3xl font-bold tracking-tight", t.value)}>
        {value}
      </p>
      {sub && <p className={cn("mt-1 text-xs", t.label)}>{sub}</p>}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  className?: string;
}

/** Translucent frosted stat chip for use on the gradient hero banner. */
export function BannerStat({ label, value, icon: Icon, className }: StatCardProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-button border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-md transition-colors hover:bg-white/15",
        className
      )}
    >
      {Icon && (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-button bg-white/15 text-white">
          <Icon className="h-4 w-4" />
        </span>
      )}
      <span className="min-w-0">
        <span className="block text-[11px] font-semibold uppercase tracking-wider text-white/70">
          {label}
        </span>
        <span className="mt-0.5 block truncate text-2xl font-bold leading-tight text-white">
          {value}
        </span>
      </span>
    </div>
  );
}
