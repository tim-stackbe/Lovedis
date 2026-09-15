import type { IconRenderer } from "@/components/icons/lovedis";
import { cn } from "@/lib/utils";

/**
 * Brand-tinted pictogram tones. The semantic keys (info/success/warn/attention/
 * muted) mirror the ToneCard color system so a card and its icon chip always
 * share the same category tone; `pink` is an extra decorative brand tone.
 */
export type PictogramTone =
  | "info"
  | "success"
  | "warn"
  | "attention"
  | "muted"
  | "pink";

const TONES: Record<PictogramTone, string> = {
  info: "bg-lv-blue-soft text-lv-blue",
  success: "bg-lv-mint text-lv-mint-deep",
  warn: "bg-lv-orange-soft text-lv-orange",
  attention: "bg-lv-yellow text-lv-yellow-deep",
  muted: "bg-lv-surface text-lv-secondary",
  pink: "bg-lv-pink text-lv-blue-dark",
};

const SIZES = {
  sm: { box: "h-8 w-8", icon: "h-4 w-4" },
  md: { box: "h-10 w-10", icon: "h-5 w-5" },
  lg: { box: "h-12 w-12", icon: "h-6 w-6" },
} as const;

interface PictogramChipProps {
  /** Any Lovedis pictogram or (legacy) lucide icon component. */
  icon: IconRenderer;
  tone?: PictogramTone;
  size?: keyof typeof SIZES;
  className?: string;
}

/**
 * Rounded, brand-tinted container that turns a bare lucide icon into a cohesive
 * Lovedis pictogram. Reused across dashboard cards for a consistent look.
 */
export function PictogramChip({
  icon: Icon,
  tone = "info",
  size = "md",
  className,
}: PictogramChipProps) {
  const s = SIZES[size];
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-button",
        s.box,
        TONES[tone],
        className
      )}
    >
      <Icon className={s.icon} strokeWidth={1.75} />
    </span>
  );
}
