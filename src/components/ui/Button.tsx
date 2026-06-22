import Link from "next/link";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "white" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-lv-blue text-white font-semibold shadow-sm shadow-lv-blue/20 hover:bg-lv-blue-dark",
  secondary:
    "border border-lv-border text-lv-text font-medium hover:bg-lv-surface hover:border-lv-secondary/30",
  ghost: "text-lv-text hover:bg-lv-surface",
  white:
    "bg-white text-lv-blue font-semibold shadow-sm hover:bg-lv-blue-soft",
  danger:
    "bg-lv-orange-soft text-lv-orange font-semibold hover:bg-lv-orange hover:text-white",
};

const SIZES: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2.5 text-sm",
  lg: "px-5 py-3 text-base",
};

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-button cursor-pointer whitespace-nowrap transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lv-blue/40 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(BASE, VARIANTS[variant], SIZES[size], className)}
      {...props}
    />
  );
}

interface LinkButtonProps extends React.ComponentProps<typeof Link> {
  variant?: Variant;
  size?: Size;
  className?: string;
}

export function LinkButton({
  variant = "primary",
  size = "md",
  className,
  ...props
}: LinkButtonProps) {
  return (
    <Link
      className={cn(BASE, VARIANTS[variant], SIZES[size], className)}
      {...props}
    />
  );
}
