import type { ReactNode } from "react";
import { LV_BLUE, LV_CORAL, LV_PAPER, type LovedisIconProps } from "./types";

/**
 * ---------------------------------------------------------------------------
 * Lovedis bespoke pictogram family — "Concept B: Sticker Pop"
 * ---------------------------------------------------------------------------
 * Hand-authored, on-brand pictograms drawn as playful vinyl "stickers" — NOT
 * recoloured generic monoline icons.
 *
 * Shared art direction (kept identical across EVERY metaphor glyph so the set
 * reads as one designed family):
 *  - Grid: 24×24 viewBox, artwork kept within ~2px optical padding.
 *  - Outline: ONE uniform, chunky, rounded royal-blue outline is the defining
 *    trait (`SW`, round caps + joins, generous corner radii) — think badge /
 *    sticker, never a thin hairline.
 *  - Two-tone flat fills: bold royal blue (`LV_BLUE`) is dominant, coral
 *    (`LV_CORAL`) is the lively secondary, white (`LV_PAPER`) is the interior
 *    "paper" / negative space. No gradients, no shadows (the chip/card behind
 *    the icon owns the background).
 *  - Signature heart: the logo's heart recurs as a small coral spark/detail in
 *    many glyphs (rocket, wallet, calendar, profile, matrix cell, …) — the
 *    bespoke brand tie.
 *  - Because the set is intentionally COLOURFUL, metaphor glyphs paint their own
 *    blue/coral fills instead of inheriting `currentColor`. Pure UI CONTROLS
 *    (chevrons, close, arrows, check, plus, menu, search, help, logout) stay
 *    monochrome `currentColor` so they adapt to their context (button text,
 *    white-on-dark, muted chips) — same chunky rounded weight, no shouting.
 * ---------------------------------------------------------------------------
 */

const BLUE = LV_BLUE;
const CORAL = LV_CORAL;
const PAPER = LV_PAPER;

/** Uniform sticker outline weight. */
const SW = 2;

/** Spread for a royal-blue sticker outline (used with an explicit `fill`). */
const edge = {
  stroke: BLUE,
  strokeWidth: SW,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/** Spread for monochrome UI-control strokes that follow `currentColor`. */
const ctrl = {
  stroke: "currentColor",
  strokeWidth: 2.2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  fill: "none",
} as const;

/** Shared root: fixes the viewBox, passes className/size. */
function Svg({
  size = 24,
  className,
  children,
}: LovedisIconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      focusable={false}
    >
      {children}
    </svg>
  );
}

/**
 * The signature coral heart, placed by centre point + width so every glyph can
 * drop in a consistent brand spark. Optional stroke lets it read as a knockout
 * (white outline) when it sits on a coral/blue mass.
 */
function Heart({
  cx,
  cy,
  w = 8,
  fill = CORAL,
  stroke,
  strokeWidth,
}: {
  cx: number;
  cy: number;
  w?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}) {
  const s = w / 17;
  const tx = cx - 12 * s;
  const ty = cy - 12.15 * s;
  return (
    <path
      d="M12 20.3C11.2 19.6 3.5 14.2 3.5 8.7 3.5 6 5.6 4 8.2 4 10 4 11.3 4.9 12 6.1 12.7 4.9 14 4 15.8 4 18.4 4 20.5 6 20.5 8.7 20.5 14.2 12.8 19.6 12 20.3Z"
      transform={`translate(${tx} ${ty}) scale(${s})`}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
    />
  );
}

/* ------------------------------------------------------------------ */
/* Sourcing & core                                                     */
/* ------------------------------------------------------------------ */

export function DashboardIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="3" width="18" height="18" rx="4" fill={PAPER} {...edge} />
      <path d="M12 4V20" {...edge} />
      <path d="M4 12H20" {...edge} />
      <Heart cx={7.6} cy={7.9} w={5.4} />
      <rect x="13.6" y="8" width="1.7" height="2.6" rx="0.8" fill={BLUE} />
      <rect x="15.9" y="6.4" width="1.7" height="4.2" rx="0.8" fill={BLUE} />
      <rect x="18.2" y="5" width="1.7" height="5.6" rx="0.8" fill={BLUE} />
      <circle cx="7.6" cy="16.4" r="2.9" fill={BLUE} />
      <path d="M7.6 16.4V13.5A2.9 2.9 0 0 1 10.5 16.4Z" fill={CORAL} />
      <path
        d="M14 15H19.4M14 17.4H19.4M14 19.8H17.6"
        stroke={BLUE}
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function StartupsIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <path
        d="M8.7 12.6C6.9 13.2 5.7 14.8 5.4 17 7.1 16.6 8.2 15.8 8.9 15Z"
        fill={CORAL}
        {...edge}
      />
      <path
        d="M15.3 12.6C17.1 13.2 18.3 14.8 18.6 17 16.9 16.6 15.8 15.8 15.1 15Z"
        fill={CORAL}
        {...edge}
      />
      <path
        d="M12 2.6C14.7 5 16 8.4 16 11.6 16 13 15.7 14.2 15.2 15.2H8.8C8.3 14.2 8 13 8 11.6 8 8.4 9.3 5 12 2.6Z"
        fill={PAPER}
        {...edge}
      />
      <circle cx="12" cy="9" r="1.9" fill={BLUE} />
      <path
        d="M10.4 15.4C10.7 17.6 11.2 19.2 12 20.8 12.8 19.2 13.3 17.6 13.6 15.4Z"
        fill={CORAL}
        {...edge}
      />
      <Heart cx={18.6} cy={5} w={4} />
    </Svg>
  );
}

export function LonglistIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="3.2" fill={PAPER} {...edge} />
      <path
        d="M10 8H16.6M10 12H16.6M10 16H16.6"
        stroke={BLUE}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M6 7.6 7 8.7 8.9 6.6"
        stroke={CORAL}
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="7.3" cy="12" r="1.15" fill={BLUE} />
      <circle cx="7.3" cy="16" r="1.15" fill={BLUE} />
    </Svg>
  );
}

export function EvaluationsIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <path d="M3 20.6H21" stroke={BLUE} strokeWidth={SW} strokeLinecap="round" />
      <rect x="3.6" y="11.4" width="4.4" height="7.6" rx="1.8" fill={PAPER} {...edge} />
      <rect x="9.8" y="8" width="4.4" height="11" rx="1.8" fill={BLUE} {...edge} />
      <rect x="16" y="4.4" width="4.4" height="14.6" rx="1.8" fill={CORAL} {...edge} />
    </Svg>
  );
}

export function CompareIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <rect x="3.4" y="6.5" width="7" height="13" rx="2.4" fill={BLUE} {...edge} />
      <rect x="13.6" y="4.5" width="7" height="15" rx="2.4" fill={PAPER} {...edge} />
      <Heart cx={12} cy={11.6} w={7.4} fill={CORAL} stroke={PAPER} strokeWidth={1.4} />
    </Svg>
  );
}

export function RadarIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <circle cx="11.5" cy="12.5" r="8.6" fill={PAPER} {...edge} />
      <circle cx="11.5" cy="12.5" r="4.9" fill={PAPER} {...edge} />
      <circle cx="11.5" cy="12.5" r="1.9" fill={CORAL} />
      <path d="M11.5 12.5 18 6" stroke={BLUE} strokeWidth={SW} strokeLinecap="round" />
      <Heart cx={19} cy={5} w={4.2} />
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/* Matchmaking                                                         */
/* ------------------------------------------------------------------ */

export function BatchesIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <rect x="3.6" y="13.6" width="16.8" height="5.4" rx="2" fill={CORAL} {...edge} />
      <rect x="3.6" y="8.8" width="16.8" height="5.4" rx="2" fill={BLUE} {...edge} />
      <rect x="3.6" y="4" width="16.8" height="5.4" rx="2" fill={PAPER} {...edge} />
      <Heart cx={16.8} cy={6.7} w={3.8} />
    </Svg>
  );
}

export function MatchMatrixIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="3" width="18" height="18" rx="4" fill={PAPER} {...edge} />
      <rect x="5.5" y="5.5" width="3.4" height="3.4" rx="1" fill={BLUE} />
      <rect x="10.3" y="5.5" width="3.4" height="3.4" rx="1" fill={CORAL} />
      <rect x="15.1" y="5.5" width="3.4" height="3.4" rx="1" fill={BLUE} />
      <rect x="5.5" y="10.3" width="3.4" height="3.4" rx="1" fill={CORAL} />
      <rect x="10.3" y="10.3" width="3.4" height="3.4" rx="1" fill={CORAL} />
      <rect x="15.1" y="10.3" width="3.4" height="3.4" rx="1" fill={CORAL} />
      <rect x="5.5" y="15.1" width="3.4" height="3.4" rx="1" fill={BLUE} />
      <rect x="10.3" y="15.1" width="3.4" height="3.4" rx="1" fill={CORAL} />
      <rect x="15.1" y="15.1" width="3.4" height="3.4" rx="1" fill={BLUE} />
      <Heart cx={12} cy={12} w={2.9} fill={PAPER} />
    </Svg>
  );
}

export function UseCasesIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <path
        d="M12 3C8.4 3 5.6 5.7 5.6 9.1 5.6 11.4 6.8 13 8 14.2 8.7 14.9 9.2 15.6 9.4 16.5H14.6C14.8 15.6 15.3 14.9 16 14.2 17.2 13 18.4 11.4 18.4 9.1 18.4 5.7 15.6 3 12 3Z"
        fill={PAPER}
        {...edge}
      />
      <path d="M9.6 18.6H14.4" {...edge} />
      <path d="M10.5 20.8H13.5" {...edge} />
      <Heart cx={12} cy={9} w={5.2} />
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/* Collaboration                                                       */
/* ------------------------------------------------------------------ */

export function EngagementsIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <circle cx="8.8" cy="12" r="5" fill="none" stroke={BLUE} strokeWidth={SW} />
      <circle cx="15.2" cy="12" r="5" fill="none" stroke={CORAL} strokeWidth={SW} />
      <Heart cx={12} cy={12} w={4.6} />
    </Svg>
  );
}

export function PushesIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <path
        d="M20.4 4 3.8 10.6C3 10.9 3 12 3.8 12.3L9.6 14.4 11.7 20.2C12 21 13.1 21 13.4 20.2Z"
        fill={PAPER}
        {...edge}
      />
      <path d="M9.6 14.4 20.4 4 13.4 20.2Z" fill={CORAL} {...edge} />
    </Svg>
  );
}

export function ScreeningIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <rect x="4.4" y="3.5" width="12" height="16" rx="2.6" fill={PAPER} {...edge} />
      <path
        d="M7.4 8H12.4M7.4 11H10.6"
        stroke={BLUE}
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <circle cx="14.6" cy="14.4" r="4" fill={PAPER} {...edge} />
      <path d="M17.5 17.3 20.4 20.2" stroke={CORAL} strokeWidth={SW} strokeLinecap="round" />
    </Svg>
  );
}

export function CheckInsIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <path
        d="M12 21C12 21 5 15.4 5 9.9 5 6 8.1 3 12 3 15.9 3 19 6 19 9.9 19 15.4 12 21 12 21Z"
        fill={PAPER}
        {...edge}
      />
      <Heart cx={12} cy={9.6} w={5.6} />
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/* Roadmap & knowledge                                                 */
/* ------------------------------------------------------------------ */

export function SsotIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <path
        d="M12 6.4C10 5 7.4 4.6 4.6 5.2V17.8C7.4 17.2 10 17.6 12 19 14 17.6 16.6 17.2 19.4 17.8V5.2C16.6 4.6 14 5 12 6.4Z"
        fill={PAPER}
        {...edge}
      />
      <path d="M12 6.4V19" {...edge} />
      <path d="M14.4 3.4H18V9L16.2 7.8 14.4 9Z" fill={CORAL} {...edge} />
    </Svg>
  );
}

export function PartnerHubIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <path d="M3.4 20.4H15.4" {...edge} />
      <rect x="4.2" y="4" width="3.9" height="15.4" rx="1.4" fill={BLUE} {...edge} />
      <rect x="8.7" y="4" width="3.9" height="15.4" rx="1.4" fill={PAPER} {...edge} />
      <rect
        x="15.2"
        y="5.6"
        width="3.7"
        height="14.4"
        rx="1.4"
        fill={CORAL}
        {...edge}
        transform="rotate(12 17 12.8)"
      />
      <Heart cx={10.65} cy={7.8} w={2.9} />
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/* Marketplace & credits                                               */
/* ------------------------------------------------------------------ */

export function CreditsIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <ellipse cx="12" cy="15.6" rx="7.4" ry="2.9" fill={PAPER} {...edge} />
      <ellipse cx="12" cy="11.6" rx="7.4" ry="2.9" fill={BLUE} {...edge} />
      <ellipse cx="12" cy="7.6" rx="7.4" ry="2.9" fill={PAPER} {...edge} />
      <Heart cx={12} cy={7.5} w={4} />
    </Svg>
  );
}

export function InboxIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <rect x="3.4" y="4.5" width="17.2" height="15" rx="3" fill={PAPER} {...edge} />
      <path d="M3.6 13.5H8L9.4 15.6H14.6L16 13.5H20.4" {...edge} />
      <path d="M12 5.6V9.8" stroke={CORAL} strokeWidth={SW} strokeLinecap="round" />
      <path
        d="M9.9 8 12 10.1 14.1 8"
        stroke={CORAL}
        strokeWidth={SW}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

export function StorefrontIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <path
        d="M4.6 10H19.4V18.4A1.6 1.6 0 0 1 17.8 20H6.2A1.6 1.6 0 0 1 4.6 18.4Z"
        fill={PAPER}
        {...edge}
      />
      <path
        d="M3.4 6.6A1.8 1.8 0 0 1 5.2 4.8H18.8A1.8 1.8 0 0 1 20.6 6.6V9.2A0.8 0.8 0 0 1 19.8 10H4.2A0.8 0.8 0 0 1 3.4 9.2Z"
        fill={CORAL}
        {...edge}
      />
      <path d="M8.4 4.9V10M13.6 4.9V10" stroke={PAPER} strokeWidth="1.6" />
      <path
        d="M9.6 20V14.6A2.4 2.4 0 0 1 14.4 14.6V20Z"
        fill={PAPER}
        {...edge}
      />
      <Heart cx={12} cy={16} w={3.4} />
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/* Tracking                                                            */
/* ------------------------------------------------------------------ */

export function PipelineIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <rect x="3.4" y="4" width="17.2" height="16" rx="3" fill={PAPER} {...edge} />
      <rect x="5.4" y="6.6" width="3.6" height="7" rx="1.2" fill={BLUE} />
      <rect x="10.2" y="6.6" width="3.6" height="4.4" rx="1.2" fill={CORAL} />
      <rect x="15" y="6.6" width="3.6" height="5.6" rx="1.2" fill={BLUE} />
    </Svg>
  );
}

export function ReportsIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <path
        d="M6.5 3H13L18 8V19.5A1.5 1.5 0 0 1 16.5 21H6.5A1.5 1.5 0 0 1 5 19.5V4.5A1.5 1.5 0 0 1 6.5 3Z"
        fill={PAPER}
        {...edge}
      />
      <path d="M13 3V8H18" {...edge} />
      <rect x="8" y="14" width="1.8" height="3.4" rx="0.7" fill={BLUE} />
      <rect x="10.6" y="12" width="1.8" height="5.4" rx="0.7" fill={BLUE} />
      <rect x="13.2" y="13" width="1.8" height="4.4" rx="0.7" fill={CORAL} />
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/* Ecosystem                                                           */
/* ------------------------------------------------------------------ */

export function DiscoverIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.8" fill={PAPER} {...edge} />
      <path d="M15.7 8.3 13.2 13.2 8.3 15.7 10.8 10.8Z" fill={CORAL} {...edge} />
      <circle cx="12" cy="12" r="1.15" fill={BLUE} />
    </Svg>
  );
}

export function FeedIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <path
        d="M16.8 8H18.2A2.4 2.4 0 0 1 20.6 10.4V16.6A2.4 2.4 0 0 1 18.2 19"
        {...edge}
        fill="none"
      />
      <rect x="3.4" y="5" width="13.4" height="14" rx="2.6" fill={PAPER} {...edge} />
      <rect x="6" y="8" width="5" height="4.4" rx="1.2" fill={CORAL} />
      <path
        d="M12.8 8.6H14.4M12.8 11H14.4"
        stroke={BLUE}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path d="M6 15.4H14.2" stroke={BLUE} strokeWidth="1.7" strokeLinecap="round" />
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/* Partner / startup functions                                         */
/* ------------------------------------------------------------------ */

export function PartnerDashboardIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <path
        d="M8.8 7.4V6A2 2 0 0 1 10.8 4H13.2A2 2 0 0 1 15.2 6V7.4"
        {...edge}
        fill="none"
      />
      <rect x="3.4" y="7.4" width="17.2" height="12.2" rx="2.8" fill={PAPER} {...edge} />
      <Heart cx={12} cy={12.6} w={4.6} />
    </Svg>
  );
}

export function ChallengesIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <path d="M6 3V21" {...edge} />
      <path d="M6.8 4.2H17.4L14.8 7.8 17.4 11.4H6.8Z" fill={CORAL} {...edge} />
    </Svg>
  );
}

export function PocsIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <path
        d="M9.6 3.4H14.4M10.4 3.6V9.2L5.9 16.8A2 2 0 0 0 7.6 20H16.4A2 2 0 0 0 18.1 16.8L13.6 9.2V3.6"
        fill={PAPER}
        {...edge}
      />
      <path
        d="M8.2 14H15.8L17.5 16.9A1.8 1.8 0 0 1 15.9 19.6H8.1A1.8 1.8 0 0 1 6.5 16.9Z"
        fill={CORAL}
        {...edge}
      />
      <Heart cx={12} cy={17} w={3.2} fill={PAPER} />
    </Svg>
  );
}

export function ScoringsIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <path
        d="M4 17.6A8 8 0 0 1 20 17.6"
        fill="none"
        stroke={BLUE}
        strokeWidth={SW}
        strokeLinecap="round"
      />
      <path
        d="M4 17.6A8 8 0 0 1 8.7 10.3"
        fill="none"
        stroke={CORAL}
        strokeWidth={SW}
        strokeLinecap="round"
      />
      <path d="M12 17.6 16 11.6" stroke={BLUE} strokeWidth={SW} strokeLinecap="round" />
      <circle cx="12" cy="17.6" r="1.9" fill={CORAL} />
    </Svg>
  );
}

export function MessagesIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <path
        d="M3.6 6.6A2.6 2.6 0 0 1 6.2 4H17.8A2.6 2.6 0 0 1 20.4 6.6V12.6A2.6 2.6 0 0 1 17.8 15.2H9.5L5.4 18.6V15.2H6.2A2.6 2.6 0 0 1 3.6 12.6Z"
        fill={PAPER}
        {...edge}
      />
      <circle cx="9" cy="9.6" r="1.2" fill={BLUE} />
      <circle cx="12" cy="9.6" r="1.2" fill={BLUE} />
      <Heart cx={15.3} cy={9.6} w={3} />
    </Svg>
  );
}

export function StartupDashboardIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <path d="M3.4 11.4 12 4 20.6 11.4" fill="none" {...edge} />
      <path
        d="M5.6 9.8V18.4A1.6 1.6 0 0 0 7.2 20H16.8A1.6 1.6 0 0 0 18.4 18.4V9.8"
        fill={PAPER}
        {...edge}
      />
      <Heart cx={12} cy={13.8} w={4.8} />
    </Svg>
  );
}

export function ApplicationsIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <path
        d="M6.5 3H13L18 8V19.5A1.5 1.5 0 0 1 16.5 21H6.5A1.5 1.5 0 0 1 5 19.5V4.5A1.5 1.5 0 0 1 6.5 3Z"
        fill={PAPER}
        {...edge}
      />
      <path d="M13 3V8H18" {...edge} />
      <path
        d="M8 14.6 10.4 17 15 12"
        stroke={CORAL}
        strokeWidth={SW}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

export function ProfileIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="8.4" r="4" fill={BLUE} {...edge} />
      <path
        d="M4.6 20C4.6 15.8 7.9 13.2 12 13.2 16.1 13.2 19.4 15.8 19.4 20Z"
        fill={BLUE}
        {...edge}
      />
      <circle cx="17.6" cy="17.4" r="3.6" fill={PAPER} {...edge} />
      <Heart cx={17.6} cy={17.4} w={4.1} />
    </Svg>
  );
}

export function VentureIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <path
        d="M11 3C11.5 7.9 12.1 8.5 17 9 12.1 9.5 11.5 10.1 11 15 10.5 10.1 9.9 9.5 5 9 9.9 8.5 10.5 7.9 11 3Z"
        fill={BLUE}
        {...edge}
      />
      <path
        d="M17.4 13C17.7 15.3 18.1 15.7 20.4 16 18.1 16.3 17.7 16.7 17.4 19 17.1 16.7 16.7 16.3 14.4 16 16.7 15.7 17.1 15.3 17.4 13Z"
        fill={CORAL}
        {...edge}
      />
    </Svg>
  );
}

export function RequestsIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <rect x="3.4" y="5.4" width="17.2" height="13" rx="2.8" fill={PAPER} {...edge} />
      <path d="M4.4 7 12 12 19.6 7" {...edge} fill="none" />
      <Heart cx={18.4} cy={6.4} w={4.6} />
    </Svg>
  );
}

export function WalletIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <path
        d="M4 8A2.4 2.4 0 0 1 6.4 5.6H17.6A2 2 0 0 1 19.6 7.6V17.4A2.4 2.4 0 0 1 17.2 19.8H6.4A2.4 2.4 0 0 1 4 17.4Z"
        fill={BLUE}
        {...edge}
      />
      <path
        d="M13.6 11.4H20.6V15.4H13.6A2 2 0 0 1 13.6 11.4Z"
        fill={PAPER}
        {...edge}
      />
      <circle cx="16.4" cy="13.4" r="1.3" fill={CORAL} />
      <circle cx="16.5" cy="5.6" r="3.6" fill={CORAL} {...edge} />
      <Heart cx={16.5} cy={5.5} w={3.6} fill={PAPER} />
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/* Platform                                                            */
/* ------------------------------------------------------------------ */

export function IntrosIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <circle cx="8.4" cy="8.6" r="3.3" fill={BLUE} {...edge} />
      <path
        d="M3 19.4C3 15.8 5.4 13.4 8.4 13.4 11.4 13.4 13.8 15.8 13.8 19.4Z"
        fill={BLUE}
        {...edge}
      />
      <circle cx="17" cy="10" r="2.6" fill={PAPER} {...edge} />
      <path
        d="M19 5.4V9.4M17 7.4H21"
        stroke={CORAL}
        strokeWidth={SW}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function CompaniesIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <path d="M3.4 20.6H20.6" {...edge} />
      <path
        d="M5 20.4V6.4A1.6 1.6 0 0 1 6.6 4.8H13A1.6 1.6 0 0 1 14.6 6.4V20.4Z"
        fill={PAPER}
        {...edge}
      />
      <path
        d="M14.6 20.4V9.8H18.2A1.6 1.6 0 0 1 19.8 11.4V20.4Z"
        fill={BLUE}
        {...edge}
      />
      <rect x="7.4" y="7.4" width="2" height="2" rx="0.5" fill={BLUE} />
      <rect x="10.4" y="7.4" width="2" height="2" rx="0.5" fill={BLUE} />
      <rect x="7.4" y="11" width="2" height="2" rx="0.5" fill={CORAL} />
      <rect x="10.4" y="11" width="2" height="2" rx="0.5" fill={BLUE} />
    </Svg>
  );
}

export function UsersIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <circle cx="9" cy="8.6" r="3.4" fill={BLUE} {...edge} />
      <circle cx="17" cy="9.6" r="2.7" fill={CORAL} {...edge} />
      <path
        d="M15.4 19.4C15.6 16.8 16.9 15 18.8 14.4 20.4 15 21.4 16.8 21.4 19.4Z"
        fill={CORAL}
        {...edge}
      />
      <path
        d="M2.9 19.4C2.9 15.9 5.6 13.6 9 13.6 12.4 13.6 15.1 15.9 15.1 19.4Z"
        fill={PAPER}
        {...edge}
      />
    </Svg>
  );
}

export function TeamIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <circle cx="5.4" cy="10" r="2.5" fill={PAPER} {...edge} />
      <circle cx="18.6" cy="10" r="2.5" fill={CORAL} {...edge} />
      <circle cx="12" cy="7.4" r="3.2" fill={BLUE} {...edge} />
      <path
        d="M6.4 20C6.4 16.6 8.9 14.2 12 14.2 15.1 14.2 17.6 16.6 17.6 20Z"
        fill={PAPER}
        {...edge}
      />
    </Svg>
  );
}

export function SettingsIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <path
        d="M9.7 2.9a1 1 0 0 1 .98-.8h2.64a1 1 0 0 1 .98.8l.28 1.5a7.7 7.7 0 0 1 1.86 1.08l1.45-.52a1 1 0 0 1 1.2.46l1.32 2.28a1 1 0 0 1-.22 1.26l-1.17.98a7.8 7.8 0 0 1 0 2.16l1.17.98a1 1 0 0 1 .22 1.26l-1.32 2.28a1 1 0 0 1-1.2.46l-1.45-.52a7.7 7.7 0 0 1-1.86 1.08l-.28 1.5a1 1 0 0 1-.98.8h-2.64a1 1 0 0 1-.98-.8l-.28-1.5a7.7 7.7 0 0 1-1.86-1.08l-1.45.52a1 1 0 0 1-1.2-.46l-1.32-2.28a1 1 0 0 1 .22-1.26l1.17-.98a7.8 7.8 0 0 1 0-2.16l-1.17-.98a1 1 0 0 1-.22-1.26l1.32-2.28a1 1 0 0 1 1.2-.46l1.45.52A7.7 7.7 0 0 1 9.42 4.4z"
        fill={PAPER}
        {...edge}
      />
      <circle cx="12" cy="12" r="3" fill={CORAL} {...edge} />
    </Svg>
  );
}

export function SharingIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <path
        d="M8.4 10.7 15.2 7M8.4 13.3 15.2 17"
        stroke={BLUE}
        strokeWidth={SW}
        strokeLinecap="round"
      />
      <circle cx="6" cy="12" r="2.9" fill={PAPER} {...edge} />
      <circle cx="17.4" cy="5.8" r="2.9" fill={CORAL} {...edge} />
      <circle cx="17.4" cy="18.2" r="2.9" fill={BLUE} {...edge} />
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/* Chrome / UI controls (monochrome, follow currentColor)              */
/* ------------------------------------------------------------------ */

export function SearchIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <circle cx="10.5" cy="10.5" r="6.4" {...ctrl} />
      <path d="M15.3 15.3 20.4 20.4" {...ctrl} />
    </Svg>
  );
}

export function HelpIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.8" {...ctrl} />
      <path
        d="M9.4 9.4A2.8 2.8 0 0 1 14.8 10.4C14.8 12.3 12 12.4 12 14"
        {...ctrl}
      />
      <circle cx="12" cy="17.3" r="1.2" fill="currentColor" />
    </Svg>
  );
}

export function MenuIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <path d="M4 7H20M4 12H20M4 17H20" {...ctrl} />
    </Svg>
  );
}

export function CloseIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <path d="M6 6 18 18M18 6 6 18" {...ctrl} />
    </Svg>
  );
}

export function ChevronRightIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <path d="M9 5 16 12 9 19" {...ctrl} />
    </Svg>
  );
}

export function ChevronLeftIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <path d="M15 5 8 12 15 19" {...ctrl} />
    </Svg>
  );
}

export function ArrowRightIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <path d="M4 12H19M13 6 19 12 13 18" {...ctrl} />
    </Svg>
  );
}

export function ArrowLeftIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <path d="M20 12H5M11 6 5 12 11 18" {...ctrl} />
    </Svg>
  );
}

export function LogoutIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <path
        d="M9.5 4.6H6.4A1.6 1.6 0 0 0 4.8 6.2V17.8A1.6 1.6 0 0 0 6.4 19.4H9.5"
        {...ctrl}
      />
      <path d="M13.5 8 17.5 12 13.5 16M17 12H9.2" {...ctrl} />
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/* Venture / marketplace extras                                        */
/* ------------------------------------------------------------------ */

export function GraduationCapIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3.8 2.6 8.4 12 13 21.4 8.4Z" fill={BLUE} {...edge} />
      <path
        d="M6.8 10.6V15.2C6.8 16.7 9.1 17.9 12 17.9 14.9 17.9 17.2 16.7 17.2 15.2V10.6"
        fill={PAPER}
        {...edge}
      />
      <path d="M21.4 8.4V13.6" {...edge} />
      <Heart cx={21.4} cy={15.4} w={3.2} />
    </Svg>
  );
}

export function CalendarIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <rect x="3.4" y="5" width="17.2" height="15.6" rx="3" fill={PAPER} {...edge} />
      <path d="M3.6 9.4H20.4" {...edge} />
      <path d="M7.6 3V6.4M16.4 3V6.4" {...edge} />
      <rect x="6" y="11.4" width="2.6" height="2.6" rx="0.7" fill={BLUE} />
      <rect x="10.7" y="11.4" width="2.6" height="2.6" rx="0.7" fill={BLUE} />
      <rect x="15.4" y="11.4" width="2.6" height="2.6" rx="0.7" fill={BLUE} />
      <rect x="6" y="15.4" width="2.6" height="2.6" rx="0.7" fill={BLUE} />
      <rect x="10.7" y="15.4" width="2.6" height="2.6" rx="0.7" fill={BLUE} />
      <circle cx="17" cy="17" r="3.4" fill={CORAL} {...edge} />
      <path
        d="M15.4 17 16.7 18.3 18.8 16"
        stroke={PAPER}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

export function CalendarClockIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <rect x="3.4" y="5" width="13.6" height="14" rx="3" fill={PAPER} {...edge} />
      <path d="M3.6 9.2H17" {...edge} />
      <path d="M7 3V6.2M13.4 3V6.2" {...edge} />
      <circle cx="16.6" cy="16.4" r="4.4" fill={CORAL} {...edge} />
      <path
        d="M16.6 14.2V16.4L18.2 17.4"
        stroke={PAPER}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

export function GlobeIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.8" fill={PAPER} {...edge} />
      <path d="M3.2 12H20.8" {...edge} />
      <path
        d="M12 3.2C14.4 5.5 15.8 8.6 15.8 12 15.8 15.4 14.4 18.5 12 20.8 9.6 18.5 8.2 15.4 8.2 12 8.2 8.6 9.6 5.5 12 3.2Z"
        fill="none"
        {...edge}
      />
      <circle cx="16.4" cy="7.6" r="1.6" fill={CORAL} />
    </Svg>
  );
}

export function CheckIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <path d="M4.5 12.5 9.5 17.5 19.5 6.5" {...ctrl} strokeWidth={2.4} />
    </Svg>
  );
}

export function CheckCheckIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <path d="M2.6 12.6 6.9 17 14.2 7.6" {...ctrl} />
      <path d="M12 15.4 13.3 16.8 21.4 7" {...ctrl} />
    </Svg>
  );
}

export function PlusIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <path d="M12 5V19M5 12H19" {...ctrl} strokeWidth={2.4} />
    </Svg>
  );
}
