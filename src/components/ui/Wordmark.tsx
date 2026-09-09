import Image from "next/image";
import { cn } from "@/lib/utils";

interface WordmarkProps {
  variant?: "default" | "light";
  className?: string;
  size?: "sm" | "md" | "lg";
  priority?: boolean;
}

/** Intrinsic logo aspect ratio (4033 × 1150 ≈ 3.51:1). */
const LOGO_ASPECT = 4033 / 1150;

const SIZE_HEIGHTS: Record<NonNullable<WordmarkProps["size"]>, number> = {
  sm: 20,
  md: 28,
  lg: 40,
};

export function Wordmark({
  variant = "default",
  size = "md",
  className,
  priority = false,
}: WordmarkProps) {
  const height = SIZE_HEIGHTS[size];
  const width = Math.round(height * LOGO_ASPECT);
  const src =
    variant === "light"
      ? "/brand/lovedis-logo-white.png"
      : "/brand/lovedis-logo.png";

  return (
    <Image
      data-lv-logo
      src={src}
      alt="LOVEDIS"
      width={width}
      height={height}
      priority={priority}
      className={cn("inline-block w-auto select-none", className)}
      style={{ height }}
    />
  );
}
