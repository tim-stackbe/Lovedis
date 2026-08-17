import type { ReactNode } from "react";
import { LV_CORAL, type LovedisIconProps } from "./types";

/**
 * ---------------------------------------------------------------------------
 * Lovedis bespoke pictogram family
 * ---------------------------------------------------------------------------
 * Hand-authored, on-brand pictograms — NOT recoloured generic monoline icons.
 *
 * Shared art direction (kept consistent across EVERY glyph so they read as one
 * designed family):
 *  - Grid: 24×24 viewBox, artwork kept within ~2px optical padding.
 *  - Weight: bold + geometric. Masses are drawn as solid fills; where a line is
 *    unavoidable it uses a chunky 2.4 stroke with round caps/joins — never a
 *    thin 1.5px outline.
 *  - Corner language: rounded rects use rx 1.5–3; everything reads soft/playful
 *    to echo the chunky geometric wordmark.
 *  - Duotone: the PRIMARY form is `currentColor` (so it inherits white on an
 *    active blue chip and blue/secondary when inactive). A SECONDARY form is
 *    `currentColor` at reduced opacity for depth.
 *  - Coral accent rule: most glyphs carry exactly one tasteful coral detail
 *    (a dot / spark / heart / highlight) using the brand token, tying the whole
 *    set back to the logo. Pure UI-control glyphs (close, chevrons, check) stay
 *    monochrome so they don't shout.
 * ---------------------------------------------------------------------------
 */

/** Shared root: fixes the viewBox, inherits `currentColor`, passes className. */
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

/* ------------------------------------------------------------------ */
/* Sourcing & core                                                     */
/* ------------------------------------------------------------------ */

export function DashboardIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="3" width="8" height="8" rx="2.5" fill="currentColor" />
      <rect x="13" y="3" width="8" height="8" rx="2.5" fill="currentColor" fillOpacity="0.35" />
      <rect x="3" y="13" width="8" height="8" rx="2.5" fill={LV_CORAL} />
      <rect x="13" y="13" width="8" height="8" rx="2.5" fill="currentColor" />
    </Svg>
  );
}

export function StartupsIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <path
        d="M12 2.4c2.7 1.9 4.2 5 4.2 8.4 0 1.8-.4 3.6-1.2 5.2H9c-.8-1.6-1.2-3.4-1.2-5.2 0-3.4 1.5-6.5 4.2-8.4Z"
        fill="currentColor"
      />
      <path
        d="M8.7 14.4 5.9 16.3c-.5.35-.8.94-.8 1.55v2.05l3.9-1.85z"
        fill="currentColor"
        fillOpacity="0.35"
      />
      <path
        d="M15.3 14.4 18.1 16.3c.5.35.8.94.8 1.55v2.05l-3.9-1.85z"
        fill="currentColor"
        fillOpacity="0.35"
      />
      <path d="M10.3 17.8h3.4L12 21.6z" fill="currentColor" />
      <circle cx="12" cy="9" r="1.9" fill={LV_CORAL} />
    </Svg>
  );
}

export function LonglistIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <path
        d="M3.6 6.6 5.1 8.1 8 5"
        stroke={LV_CORAL}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M3.6 12 5.1 13.5 8 10.4"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M3.6 17.4 5.1 18.9 8 15.8"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <rect x="11.5" y="5.4" width="9" height="2.5" rx="1.25" fill="currentColor" />
      <rect x="11.5" y="10.8" width="9" height="2.5" rx="1.25" fill="currentColor" fillOpacity="0.5" />
      <rect x="11.5" y="16.2" width="9" height="2.5" rx="1.25" fill="currentColor" fillOpacity="0.5" />
    </Svg>
  );
}

export function EvaluationsIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <rect x="3.5" y="12" width="4.4" height="8" rx="1.6" fill="currentColor" fillOpacity="0.4" />
      <rect x="9.8" y="8" width="4.4" height="12" rx="1.6" fill="currentColor" />
      <rect x="16.1" y="4" width="4.4" height="16" rx="1.6" fill={LV_CORAL} />
    </Svg>
  );
}

export function CompareIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <rect x="3.4" y="7" width="6.6" height="13" rx="2.4" fill="currentColor" />
      <rect x="14" y="4" width="6.6" height="16" rx="2.4" fill="currentColor" fillOpacity="0.35" />
      <path d="M12 7.6 10.5 9.6h3z" fill={LV_CORAL} />
      <path d="M12 16.4 10.5 14.4h3z" fill={LV_CORAL} />
    </Svg>
  );
}

export function RadarIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" fill="currentColor" fillOpacity="0.12" />
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.2" strokeOpacity="0.4" fill="none" />
      <circle cx="12" cy="12" r="4.4" stroke="currentColor" strokeWidth="2.2" fill="none" />
      <path d="M12 12 18 7.2" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="17.4" cy="7.6" r="2.1" fill={LV_CORAL} />
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/* Matchmaking                                                         */
/* ------------------------------------------------------------------ */

export function BatchesIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3 21 8l-9 5-9-5z" fill={LV_CORAL} />
      <path
        d="M3 12.2 12 17.2 21 12.2"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M3 16.2 12 21.2 21 16.2"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

export function MatchMatrixIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="3" width="5" height="5" rx="1.6" fill="currentColor" />
      <rect x="9.5" y="3" width="5" height="5" rx="1.6" fill="currentColor" fillOpacity="0.35" />
      <rect x="16" y="3" width="5" height="5" rx="1.6" fill="currentColor" />
      <rect x="3" y="9.5" width="5" height="5" rx="1.6" fill="currentColor" fillOpacity="0.35" />
      <rect x="9.5" y="9.5" width="5" height="5" rx="1.6" fill={LV_CORAL} />
      <rect x="16" y="9.5" width="5" height="5" rx="1.6" fill="currentColor" fillOpacity="0.35" />
      <rect x="3" y="16" width="5" height="5" rx="1.6" fill="currentColor" />
      <rect x="9.5" y="16" width="5" height="5" rx="1.6" fill="currentColor" fillOpacity="0.35" />
      <rect x="16" y="16" width="5" height="5" rx="1.6" fill="currentColor" />
    </Svg>
  );
}

export function UseCasesIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.4" fill="none" />
      <circle cx="12" cy="12" r="4.8" stroke="currentColor" strokeWidth="2.4" strokeOpacity="0.5" fill="none" />
      <circle cx="12" cy="12" r="2" fill={LV_CORAL} />
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/* Collaboration                                                       */
/* ------------------------------------------------------------------ */

export function EngagementsIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <circle cx="9" cy="12" r="5.4" stroke="currentColor" strokeWidth="2.6" fill="none" />
      <circle cx="15" cy="12" r="5.4" stroke={LV_CORAL} strokeWidth="2.6" fill="none" />
    </Svg>
  );
}

export function PushesIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <path
        d="M20.6 4.1 3.9 10.5c-.9.35-.86 1.64.05 1.92l6.15 1.9 1.9 6.15c.28.9 1.57.95 1.92.05z"
        fill="currentColor"
      />
      <path
        d="M20.6 4.1 10.1 14.32"
        stroke={LV_CORAL}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function ScreeningIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <rect x="4.5" y="4" width="15" height="17" rx="3" fill="currentColor" fillOpacity="0.35" />
      <rect x="8.5" y="2.6" width="7" height="4" rx="1.6" fill="currentColor" />
      <path
        d="M8.2 13 10.6 15.4 15.6 10.2"
        stroke={LV_CORAL}
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

export function CheckInsIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <path
        d="M6 16.6c-.7 0-1.1-.82-.62-1.42C6.6 13.8 7 12.6 7 10.6 7 7.5 9.2 5.1 12 5.1s5 2.4 5 5.5c0 2 .4 3.2 1.62 4.58.48.6.08 1.42-.62 1.42z"
        fill="currentColor"
      />
      <path d="M12 3v2.1" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="12" cy="19.4" r="2" fill={LV_CORAL} />
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
        d="M12 6.6C10 5.1 7.5 4.7 4.6 5.3v12.5c2.9-.6 5.4-.2 7.4 1.3 2-1.5 4.5-1.9 7.4-1.3V5.3C16.5 4.7 14 5.1 12 6.6Z"
        fill="currentColor"
        fillOpacity="0.35"
      />
      <path d="M12 6.6v12.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M14.4 3.4h3.4v5.2l-1.7-1.2-1.7 1.2z" fill={LV_CORAL} />
    </Svg>
  );
}

export function PartnerHubIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <rect x="3.6" y="4" width="3.6" height="16" rx="1.4" fill="currentColor" />
      <rect x="8.2" y="4" width="3.6" height="16" rx="1.4" fill="currentColor" fillOpacity="0.35" />
      <rect x="12.8" y="4" width="3.6" height="16" rx="1.4" fill={LV_CORAL} />
      <rect
        x="16.6"
        y="5.6"
        width="3.4"
        height="14.4"
        rx="1.4"
        fill="currentColor"
        transform="rotate(13 18.3 12.8)"
      />
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/* Marketplace & credits                                               */
/* ------------------------------------------------------------------ */

export function CreditsIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <ellipse cx="12" cy="15.5" rx="7.5" ry="3" fill="currentColor" fillOpacity="0.35" />
      <ellipse cx="12" cy="11" rx="7.5" ry="3" fill="currentColor" fillOpacity="0.6" />
      <ellipse cx="12" cy="6.5" rx="7.5" ry="3" fill="currentColor" />
      <circle cx="12" cy="6.5" r="1.5" fill={LV_CORAL} />
    </Svg>
  );
}

export function InboxIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <rect x="3.4" y="5" width="17.2" height="14" rx="3" fill="currentColor" fillOpacity="0.35" />
      <path
        d="M3.6 13h4.1l1.5 2.3h5.6l1.5-2.3h4.1"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="12" cy="8.4" r="2" fill={LV_CORAL} />
    </Svg>
  );
}

export function StorefrontIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <path
        d="M4.4 9h15.2v9.5A1.5 1.5 0 0 1 18.1 20H5.9A1.5 1.5 0 0 1 4.4 18.5z"
        fill="currentColor"
        fillOpacity="0.35"
      />
      <path d="M3.4 4.6h17.2l1 4.4H2.4z" fill="currentColor" />
      <rect x="9.6" y="13" width="4.8" height="7" rx="1" fill={LV_CORAL} />
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/* Tracking                                                            */
/* ------------------------------------------------------------------ */

export function PipelineIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <rect x="3.4" y="4" width="17.2" height="16" rx="2.6" stroke="currentColor" strokeWidth="2" strokeOpacity="0.3" fill="none" />
      <rect x="5.2" y="6.4" width="4" height="3.2" rx="1" fill="currentColor" />
      <rect x="5.2" y="11" width="4" height="3.2" rx="1" fill="currentColor" fillOpacity="0.4" />
      <rect x="10" y="6.4" width="4" height="3.2" rx="1" fill={LV_CORAL} />
      <rect x="10" y="11" width="4" height="3.2" rx="1" fill="currentColor" />
      <rect x="14.8" y="6.4" width="4" height="3.2" rx="1" fill="currentColor" fillOpacity="0.4" />
    </Svg>
  );
}

export function ReportsIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <path
        d="M6.5 3h6.7L18 7.8V19.5A1.5 1.5 0 0 1 16.5 21h-10A1.5 1.5 0 0 1 5 19.5V4.5A1.5 1.5 0 0 1 6.5 3Z"
        fill="currentColor"
        fillOpacity="0.35"
      />
      <path
        d="M13 3v4.8h4.8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M7.6 16.4 9.9 13.8l2 1.8 2.7-3.4"
        stroke={LV_CORAL}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/* Ecosystem                                                           */
/* ------------------------------------------------------------------ */

export function DiscoverIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" fill="currentColor" fillOpacity="0.18" />
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.4" fill="none" />
      <path d="M16.2 7.8 13 13 7.8 16.2 11 11z" fill={LV_CORAL} />
    </Svg>
  );
}

export function FeedIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <rect x="3.6" y="5.4" width="14" height="14" rx="2.5" fill="currentColor" fillOpacity="0.35" />
      <path
        d="M17.6 8h1.4A1.5 1.5 0 0 1 20.5 9.5v8a1.9 1.9 0 0 1-1.9 1.9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <rect x="6" y="8" width="5.6" height="4.6" rx="1" fill={LV_CORAL} />
      <rect x="13" y="8.2" width="2" height="2" rx="0.6" fill="currentColor" />
      <rect x="6" y="14.4" width="9" height="2.1" rx="1" fill="currentColor" fillOpacity="0.6" />
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/* Partner / startup functions                                         */
/* ------------------------------------------------------------------ */

export function PartnerDashboardIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <rect x="3.4" y="7.4" width="17.2" height="12.2" rx="2.6" fill="currentColor" fillOpacity="0.35" />
      <path
        d="M9 7.4V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.4"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M12 17.4 9.5 14.9a1.75 1.75 0 1 1 2.5-2.45 1.75 1.75 0 1 1 2.5 2.45z"
        fill={LV_CORAL}
      />
    </Svg>
  );
}

export function ChallengesIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <path d="M6 3v18" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M6.6 4.4h11l-2.6 3.4 2.6 3.4h-11z" fill={LV_CORAL} />
    </Svg>
  );
}

export function PocsIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <path
        d="M9.6 3.4h4.8M10.4 3.8v5.4L5.8 17a2 2 0 0 0 1.72 3.05h8.96A2 2 0 0 0 18.2 17l-4.6-7.8V3.8"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M8.4 14h7.2l2.2 3.7a1.6 1.6 0 0 1-1.38 2.4H7.58A1.6 1.6 0 0 1 6.2 17.7z"
        fill={LV_CORAL}
      />
    </Svg>
  );
}

export function ScoringsIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <path d="M4 17.5a8 8 0 0 1 16 0" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" fill="none" />
      <path d="M4 17.5a8 8 0 0 1 4.8-7.35" stroke={LV_CORAL} strokeWidth="2.6" strokeLinecap="round" fill="none" />
      <path d="M12 17.5 16 12" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="12" cy="17.5" r="1.9" fill="currentColor" />
    </Svg>
  );
}

export function MessagesIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <path
        d="M3.6 6.6A2.6 2.6 0 0 1 6.2 4h11.6A2.6 2.6 0 0 1 20.4 6.6v6A2.6 2.6 0 0 1 17.8 15.2H10l-4.2 3.4v-3.4H6.2A2.6 2.6 0 0 1 3.6 12.6z"
        fill="currentColor"
      />
      <circle cx="17.4" cy="17" r="3.4" fill={LV_CORAL} />
    </Svg>
  );
}

export function StartupDashboardIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <path
        d="M3.6 11.2 12 4l8.4 7.2"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M5.8 10.4V19a1.6 1.6 0 0 0 1.6 1.6h9.2A1.6 1.6 0 0 0 18.2 19v-8.6"
        fill="currentColor"
        fillOpacity="0.35"
      />
      <rect x="9.8" y="13.4" width="4.4" height="7.2" rx="1" fill={LV_CORAL} />
    </Svg>
  );
}

export function ApplicationsIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <path
        d="M6.5 3h6.7L18 7.8V19.5A1.5 1.5 0 0 1 16.5 21h-10A1.5 1.5 0 0 1 5 19.5V4.5A1.5 1.5 0 0 1 6.5 3Z"
        fill="currentColor"
        fillOpacity="0.35"
      />
      <path
        d="M13 3v4.8h4.8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M7.8 15.2 9.6 17l4-4.4"
        stroke={LV_CORAL}
        strokeWidth="2.4"
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
      <circle cx="12" cy="8.6" r="4" fill="currentColor" />
      <path
        d="M4.5 20c0-4 3.4-6.5 7.5-6.5s7.5 2.5 7.5 6.5z"
        fill="currentColor"
        fillOpacity="0.35"
      />
      <circle cx="17.6" cy="6.4" r="2" fill={LV_CORAL} />
    </Svg>
  );
}

export function VentureIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <path
        d="M10.6 3.4c.44 4.15 1.95 5.66 6.1 6.1-4.15.44-5.66 1.95-6.1 6.1-.44-4.15-1.95-5.66-6.1-6.1 4.15-.44 5.66-1.95 6.1-6.1Z"
        fill="currentColor"
      />
      <path
        d="M17.4 13.6c.2 1.9.9 2.6 2.8 2.8-1.9.2-2.6.9-2.8 2.8-.2-1.9-.9-2.6-2.8-2.8 1.9-.2 2.6-.9 2.8-2.8Z"
        fill={LV_CORAL}
      />
    </Svg>
  );
}

export function RequestsIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <rect x="3.4" y="5.6" width="17.2" height="12.8" rx="2.6" fill="currentColor" fillOpacity="0.35" />
      <path
        d="M4.6 7.2 12 12.4l7.4-5.2"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="18.4" cy="6.4" r="2.7" fill={LV_CORAL} />
    </Svg>
  );
}

export function WalletIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <rect x="3.4" y="6" width="17.2" height="13" rx="3" fill="currentColor" fillOpacity="0.35" />
      <rect x="3.4" y="6" width="12.4" height="4.2" rx="2.1" fill="currentColor" />
      <path d="M14 11.6h6.6v3.8H14a1.9 1.9 0 0 1 0-3.8Z" fill="currentColor" />
      <circle cx="16.3" cy="13.5" r="1.3" fill={LV_CORAL} />
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/* Platform                                                            */
/* ------------------------------------------------------------------ */

export function IntrosIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <circle cx="8.4" cy="8.6" r="3.3" fill="currentColor" />
      <path
        d="M2.8 19.2c0-3.2 2.5-5.2 5.6-5.2s5.6 2 5.6 5.2z"
        fill="currentColor"
        fillOpacity="0.35"
      />
      <circle cx="16.4" cy="10" r="2.6" fill="currentColor" fillOpacity="0.6" />
      <path d="M19 5.4v4M17 7.4h4" stroke={LV_CORAL} strokeWidth="2.2" strokeLinecap="round" />
    </Svg>
  );
}

export function CompaniesIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <path
        d="M5 20.5V6.4A1.5 1.5 0 0 1 6.5 4.9H13A1.5 1.5 0 0 1 14.5 6.4V20.5z"
        fill="currentColor"
        fillOpacity="0.35"
      />
      <path d="M14.5 20.5V9.8h3.6A1.5 1.5 0 0 1 19.6 11.3V20.5z" fill="currentColor" />
      <rect x="7.4" y="7.6" width="2.1" height="2.1" rx="0.5" fill="currentColor" />
      <rect x="10.4" y="7.6" width="2.1" height="2.1" rx="0.5" fill="currentColor" />
      <rect x="7.4" y="11.6" width="2.1" height="2.1" rx="0.5" fill={LV_CORAL} />
      <rect x="10.4" y="11.6" width="2.1" height="2.1" rx="0.5" fill="currentColor" />
      <rect x="3.4" y="20" width="17.2" height="2" rx="1" fill="currentColor" />
    </Svg>
  );
}

export function UsersIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <circle cx="9" cy="8.6" r="3.5" fill="currentColor" />
      <path
        d="M2.8 19.4c0-3.4 2.8-5.5 6.2-5.5 3.4 0 6.2 2.1 6.2 5.5z"
        fill="currentColor"
        fillOpacity="0.35"
      />
      <circle cx="17" cy="9.4" r="2.8" fill={LV_CORAL} />
      <path
        d="M15.4 20c.15-2.7 1.6-4.6 3.6-5.2 1.8.65 2.9 2.4 2.9 5.2z"
        fill="currentColor"
        fillOpacity="0.35"
      />
    </Svg>
  );
}

export function TeamIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="7.4" r="3.2" fill="currentColor" />
      <circle cx="5.4" cy="10" r="2.5" fill="currentColor" fillOpacity="0.5" />
      <circle cx="18.6" cy="10" r="2.5" fill={LV_CORAL} />
      <path
        d="M6.4 20c0-3.3 2.5-5.6 5.6-5.6s5.6 2.3 5.6 5.6z"
        fill="currentColor"
        fillOpacity="0.35"
      />
    </Svg>
  );
}

export function SettingsIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <path
        d="M9.7 2.9a1 1 0 0 1 .98-.8h2.64a1 1 0 0 1 .98.8l.28 1.5a7.7 7.7 0 0 1 1.86 1.08l1.45-.52a1 1 0 0 1 1.2.46l1.32 2.28a1 1 0 0 1-.22 1.26l-1.17.98a7.8 7.8 0 0 1 0 2.16l1.17.98a1 1 0 0 1 .22 1.26l-1.32 2.28a1 1 0 0 1-1.2.46l-1.45-.52a7.7 7.7 0 0 1-1.86 1.08l-.28 1.5a1 1 0 0 1-.98.8h-2.64a1 1 0 0 1-.98-.8l-.28-1.5a7.7 7.7 0 0 1-1.86-1.08l-1.45.52a1 1 0 0 1-1.2-.46l-1.32-2.28a1 1 0 0 1 .22-1.26l1.17-.98a7.8 7.8 0 0 1 0-2.16l-1.17-.98a1 1 0 0 1-.22-1.26l1.32-2.28a1 1 0 0 1 1.2-.46l1.45.52A7.7 7.7 0 0 1 9.42 4.4z"
        fill="currentColor"
      />
      <circle cx="12" cy="12" r="3.2" fill={LV_CORAL} />
    </Svg>
  );
}

export function SharingIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <path d="M8.4 10.8 15 7.4M8.4 13.2 15 16.6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="6" cy="12" r="2.9" fill="currentColor" />
      <circle cx="17.6" cy="6" r="2.9" fill={LV_CORAL} />
      <circle cx="17.6" cy="18" r="2.9" fill="currentColor" />
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/* Chrome / UI controls                                                */
/* ------------------------------------------------------------------ */

export function SearchIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="2.6" fill="none" />
      <path d="M15.4 15.4 20.4 20.4" stroke={LV_CORAL} strokeWidth="2.8" strokeLinecap="round" />
    </Svg>
  );
}

export function HelpIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" fill="currentColor" fillOpacity="0.15" />
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.4" fill="none" />
      <path
        d="M9.3 9.3a2.8 2.8 0 0 1 5.4 1c0 1.9-2.7 2-2.7 3.6"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="12" cy="17.4" r="1.4" fill={LV_CORAL} />
    </Svg>
  );
}

export function MenuIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <path d="M4 7h16" stroke={LV_CORAL} strokeWidth="2.6" strokeLinecap="round" />
      <path d="M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    </Svg>
  );
}

export function CloseIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <path d="M6 6 18 18M18 6 6 18" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    </Svg>
  );
}

export function ChevronRightIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <path d="M9 5 16 12 9 19" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

export function ChevronLeftIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <path d="M15 5 8 12 15 19" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

export function ArrowRightIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <path d="M4 12h15M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

export function ArrowLeftIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <path d="M20 12H5M11 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

export function LogoutIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <path
        d="M9.5 4.6H6.5A1.6 1.6 0 0 0 4.9 6.2v11.6a1.6 1.6 0 0 0 1.6 1.6h3"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M13.5 8 17.5 12l-4 4M17 12H9.2"
        stroke={LV_CORAL}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/* Venture / marketplace extras                                        */
/* ------------------------------------------------------------------ */

export function GraduationCapIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <path d="M12 4 2.4 8.5 12 13l9.6-4.5z" fill="currentColor" />
      <path
        d="M6.6 11v4.2c0 1.45 2.42 2.6 5.4 2.6s5.4-1.15 5.4-2.6V11"
        fill="currentColor"
        fillOpacity="0.35"
      />
      <path d="M21.6 8.5v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="21.6" cy="15" r="1.5" fill={LV_CORAL} />
    </Svg>
  );
}

export function CalendarIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <rect x="3.4" y="5" width="17.2" height="16" rx="3" fill="currentColor" fillOpacity="0.35" />
      <path d="M3.4 9.6h17.2" stroke="currentColor" strokeWidth="2.2" />
      <path d="M8 2.8v4M16 2.8v4" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="8" cy="14" r="1.35" fill="currentColor" />
      <circle cx="12" cy="14" r="1.35" fill={LV_CORAL} />
      <circle cx="16" cy="14" r="1.35" fill="currentColor" />
      <circle cx="8" cy="17.6" r="1.35" fill="currentColor" />
      <circle cx="12" cy="17.6" r="1.35" fill="currentColor" />
    </Svg>
  );
}

export function CalendarClockIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <rect x="3.4" y="5" width="13.6" height="14" rx="3" fill="currentColor" fillOpacity="0.35" />
      <path d="M3.4 9.4h13.6" stroke="currentColor" strokeWidth="2.2" />
      <path d="M7.4 2.8v4M13 2.8v4" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="16.8" cy="16.4" r="4.6" fill={LV_CORAL} />
      <path
        d="M16.8 14.1V16.4l1.6 1"
        stroke="#fff"
        strokeWidth="1.8"
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
      <circle cx="12" cy="12" r="9" fill="currentColor" fillOpacity="0.18" />
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.4" fill="none" />
      <path
        d="M3.2 12h17.6M12 3c2.6 2.4 4 5.6 4 9s-1.4 6.6-4 9c-2.6-2.4-4-5.6-4-9s1.4-6.6 4-9Z"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="16.6" cy="7.2" r="1.7" fill={LV_CORAL} />
    </Svg>
  );
}

export function CheckIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <path d="M4.5 12.5 9.5 17.5 19.5 6.5" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

export function CheckCheckIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <path d="M2.4 12.6 6.9 17 14.4 7.4" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M12 15.6 13.4 17 21.6 7" stroke={LV_CORAL} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

export function PlusIcon(props: LovedisIconProps) {
  return (
    <Svg {...props}>
      <path d="M12 5v14" stroke={LV_CORAL} strokeWidth="2.8" strokeLinecap="round" />
      <path d="M5 12h14" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
    </Svg>
  );
}
