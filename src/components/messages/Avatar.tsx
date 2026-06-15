import { avatarTone } from "@/lib/messages";
import { cn, initials } from "@/lib/utils";

type Size = "sm" | "md" | "lg";

const SIZES: Record<Size, string> = {
  sm: "h-8 w-8 text-[11px]",
  md: "h-10 w-10 text-xs",
  lg: "h-11 w-11 text-sm",
};

export function Avatar({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: Size;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-bold",
        SIZES[size],
        avatarTone(name),
        className
      )}
    >
      {initials(name)}
    </span>
  );
}
