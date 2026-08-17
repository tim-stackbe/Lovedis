import type { ComponentType } from "react";

/**
 * Props every hand-authored Lovedis pictogram accepts. The root `<svg>` inherits
 * `currentColor` for its primary forms, so the icon adapts to its context
 * (white on a blue chip when active, blue/secondary when inactive). `className`
 * always passes through to the root so callers can size/tint via Tailwind.
 */
export interface LovedisIconProps {
  /** Rendered width/height in px (or any CSS length). Default 24. */
  size?: number | string;
  className?: string;
}

/**
 * Structural type shared by both the bespoke Lovedis glyphs and `lucide-react`
 * icons. Used by container components (PictogramChip, EmptyState) so they can
 * accept either family during the migration without widening to `any`.
 */
export type IconRenderer = ComponentType<{
  className?: string;
  size?: number | string;
  strokeWidth?: number | string;
}>;

/**
 * Brand coral accent. Reads the Tailwind v4 theme token so the accent tracks the
 * brand palette, with a hard fallback for non-CSS-var environments.
 */
export const LV_CORAL = "var(--color-lv-orange, #ff5736)";
