import Image from "next/image";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/utils";

interface StartupLogoProps {
  name: string;
  logoUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZES = {
  sm: "h-9 w-9 text-xs",
  md: "h-12 w-12 text-sm",
  lg: "h-16 w-16 text-lg",
} as const;

const PX = { sm: 36, md: 48, lg: 64 } as const;

export function StartupLogo({
  name,
  logoUrl,
  size = "md",
  className,
}: StartupLogoProps) {
  if (logoUrl) {
    return (
      <Image
        src={logoUrl}
        alt={`${name} Logo`}
        width={PX[size]}
        height={PX[size]}
        className={cn(
          "shrink-0 rounded-card border border-lv-border object-cover",
          SIZES[size],
          className
        )}
        unoptimized
      />
    );
  }
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-card bg-lv-blue-soft font-bold text-lv-blue",
        SIZES[size],
        className
      )}
      aria-hidden
    >
      {initials(name)}
    </div>
  );
}
