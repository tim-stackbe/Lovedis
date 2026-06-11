import { cn } from "@/lib/utils";

export type BadgeTone =
  | "mint"
  | "blue"
  | "orange"
  | "yellow"
  | "pink"
  | "muted";

const TONES: Record<BadgeTone, string> = {
  mint: "bg-lv-mint text-lv-mint-deep",
  blue: "bg-lv-blue-soft text-lv-blue",
  orange: "bg-lv-orange-soft text-lv-orange",
  yellow: "bg-lv-yellow text-lv-yellow-deep",
  pink: "bg-lv-pink text-lv-text",
  muted: "bg-lv-surface text-lv-secondary",
};

interface BadgeProps {
  tone?: BadgeTone;
  children: React.ReactNode;
  className?: string;
}

export function Badge({ tone = "muted", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        TONES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
