import { cn } from "@/lib/utils";

interface WordmarkProps {
  variant?: "default" | "light";
  className?: string;
  size?: "sm" | "md" | "lg";
}

const SIZE_CLASSES = {
  sm: "text-xs gap-1.5",
  md: "text-sm gap-2",
  lg: "text-lg gap-2.5",
};

const DOT_SIZES = {
  sm: "w-2 h-2",
  md: "w-2.5 h-2.5",
  lg: "w-3 h-3",
};

export function Wordmark({
  variant = "default",
  size = "md",
  className,
}: WordmarkProps) {
  return (
    <span
      data-lv-logo
      className={cn(
        "lv-wordmark inline-flex items-center",
        SIZE_CLASSES[size],
        variant === "light" ? "text-white" : "text-lv-text",
        className
      )}
    >
      <span
        className={cn("rounded-full bg-lv-orange shrink-0", DOT_SIZES[size])}
      />
      LOVEDIS
    </span>
  );
}
