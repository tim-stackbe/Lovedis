import { cn } from "@/lib/utils";

interface WordmarkProps {
  variant?: "default" | "light";
  className?: string;
  size?: "sm" | "md" | "lg";
}

const SIZE_CLASSES = {
  sm: "text-sm gap-1.5",
  md: "text-lg gap-2",
  lg: "text-2xl gap-2.5",
};

const DOT_SIZES = {
  sm: "w-2 h-2",
  md: "w-2.5 h-2.5",
  lg: "w-3.5 h-3.5",
};

export function Wordmark({
  variant = "default",
  size = "md",
  className,
}: WordmarkProps) {
  return (
    <span
      className={cn(
        "lv-logotype inline-flex items-center leading-none",
        SIZE_CLASSES[size],
        variant === "light" ? "text-white" : "text-lv-blue",
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
