import type { ComponentType, ReactNode } from "react";

/**
 * ---------------------------------------------------------------------------
 * Lovedis Pop-Art illustration family — "Concept C: Pop Art"
 * ---------------------------------------------------------------------------
 * A bolder, editorial illustration style used ONLY on LARGE surfaces (empty
 * states, decorative heros) where the detail reads well. This is deliberately
 * a DIFFERENT visual language from the small `<LovedisIcon>` "Sticker Pop" set
 * that powers the sidebar / topbar / command palette — that set stays clean and
 * legible at ~20px and must not be touched.
 *
 * Shared art direction (matches the approved `lovedis-icon-concept-C-popart`
 * reference):
 *  - Framed rounded-square "sticker" tile, white interior, thick BLACK keyline.
 *  - Thick black keylines on every form (comic / pop-art energy).
 *  - Ben-Day halftone dots as shading fields (blue on white).
 *  - Flat, vivid brand blue (`#2926e5`) + coral (`#ff5736`); no gradients.
 *  - The logo's coral HEART recurs as a signature accent in every illustration.
 *
 * These are hand-authored SVGs (no new dependency). They MUST only be rendered
 * large (~96–140px) on LIGHT backgrounds — the black keylines vanish on dark.
 * ---------------------------------------------------------------------------
 */

const BLACK = "#141414";
const BLUE = "#2926e5";
const BLUE_DEEP = "#1b18b8";
const CORAL = "#ff5736";
const WHITE = "#ffffff";
const SOFT = "#eeedff";

export interface PopArtIllustrationProps {
  /** Rendered width/height in px (or any CSS length). Default 120. */
  size?: number | string;
  className?: string;
  /** Accessible label. When omitted the illustration is treated as decorative. */
  title?: string;
}

/** Shared stroke spread for bold pop-art keylines. */
const key = {
  stroke: BLACK,
  strokeLinejoin: "round" as const,
  strokeLinecap: "round" as const,
};

/**
 * Framed rounded-square tile shared by every illustration: white interior,
 * thick black keyline, plus a reusable Ben-Day halftone `<pattern>` and an
 * interior clip so subjects never bleed past the rounded corners.
 *
 * `id` MUST be unique per illustration (it namespaces the pattern/clip ids).
 * Rendering the same illustration twice yields duplicate — but identical — ids,
 * which is harmless. No React hooks are used so this stays usable inside RSC.
 */
function PopArtTile({
  id,
  size = 120,
  className,
  title,
  children,
}: {
  id: string;
  size?: number | string;
  className?: string;
  title?: string;
  children: ReactNode;
}) {
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={title || undefined}
      aria-hidden={title ? undefined : true}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {title ? <title>{title}</title> : null}
      <defs>
        <pattern
          id={`${id}-dots`}
          width="7"
          height="7"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="2" cy="2" r="1.5" fill={BLUE} />
        </pattern>
        <clipPath id={`${id}-clip`}>
          <rect x="9.5" y="9.5" width="101" height="101" rx="21" />
        </clipPath>
      </defs>
      <rect
        x="7"
        y="7"
        width="106"
        height="106"
        rx="24"
        fill={WHITE}
        stroke={BLACK}
        strokeWidth="5"
      />
      <g clipPath={`url(#${id}-clip)`}>{children}</g>
      <rect
        x="7"
        y="7"
        width="106"
        height="106"
        rx="24"
        fill="none"
        stroke={BLACK}
        strokeWidth="5"
      />
    </svg>
  );
}

/** Signature coral heart, centred on (x,y), keyline weight kept constant. */
function Heart({
  x,
  y,
  s = 1,
  fill = CORAL,
}: {
  x: number;
  y: number;
  s?: number;
  fill?: string;
}) {
  return (
    <path
      d="M0 7 C -2 3 -9 0.5 -9 -4 C -9 -8 -4 -9.5 0 -5 C 4 -9.5 9 -8 9 -4 C 9 0.5 2 3 0 7 Z"
      transform={`translate(${x} ${y}) scale(${s})`}
      fill={fill}
      strokeWidth={2.6 / s}
      {...key}
    />
  );
}

/** Generic "nothing here" — an open box with the coral heart rising out. */
export function EmptyBoxIllustration({
  size,
  className,
  title,
}: PopArtIllustrationProps) {
  const id = "lvpa-empty";
  return (
    <PopArtTile id={id} size={size} className={className} title={title}>
      <rect x="9" y="66" width="102" height="45" fill={`url(#${id}-dots)`} opacity="0.3" />
      <polygon points="60,44 92,57 60,70 28,57" fill={WHITE} strokeWidth="4" {...key} />
      <polygon points="28,57 60,70 60,100 28,87" fill={BLUE} strokeWidth="4" {...key} />
      <polygon points="92,57 60,70 60,100 92,87" fill={BLUE_DEEP} strokeWidth="4" {...key} />
      <polygon points="60,49 84,58 60,67 36,58" fill={`url(#${id}-dots)`} opacity="0.55" />
      <Heart x={60} y={33} s={1.5} />
    </PopArtTile>
  );
}

/** "No requests / inbox" — an inbox tray with a card popping out. */
export function InboxIllustration({
  size,
  className,
  title,
}: PopArtIllustrationProps) {
  const id = "lvpa-inbox";
  return (
    <PopArtTile id={id} size={size} className={className} title={title}>
      <rect x="46" y="30" width="30" height="34" rx="3" fill={WHITE} strokeWidth="4" {...key} />
      <line x1="52" y1="40" x2="70" y2="40" stroke={BLUE} strokeWidth="3.5" strokeLinecap="round" />
      <line x1="52" y1="48" x2="66" y2="48" stroke={BLUE} strokeWidth="3.5" strokeLinecap="round" />
      <path
        d="M26 60 L44 60 L50 72 L70 72 L76 60 L94 60 L94 96 L26 96 Z"
        fill={BLUE}
        strokeWidth="4"
        {...key}
      />
      <rect x="30" y="82" width="60" height="12" fill={`url(#${id}-dots)`} opacity="0.4" />
      <Heart x={61} y={47} s={0.85} />
    </PopArtTile>
  );
}

/** "No roadmap / map" — a folded map with a coral heart-pin. */
export function RoadmapIllustration({
  size,
  className,
  title,
}: PopArtIllustrationProps) {
  const id = "lvpa-roadmap";
  return (
    <PopArtTile id={id} size={size} className={className} title={title}>
      <rect x="26" y="34" width="68" height="58" rx="4" fill={WHITE} strokeWidth="4" {...key} />
      <polygon points="26,34 48,34 48,92 26,92" fill={SOFT} />
      <rect x="72" y="34" width="22" height="58" fill={`url(#${id}-dots)`} opacity="0.4" />
      <line x1="48" y1="34" x2="48" y2="92" stroke={BLACK} strokeWidth="3" strokeDasharray="5 5" />
      <line x1="72" y1="34" x2="72" y2="92" stroke={BLACK} strokeWidth="3" strokeDasharray="5 5" />
      <rect x="26" y="34" width="68" height="58" rx="4" fill="none" strokeWidth="4" {...key} />
      <path
        d="M38 84 C 38 70 56 74 56 62 C 56 52 70 56 76 46"
        fill="none"
        stroke={BLUE}
        strokeWidth="4"
        strokeDasharray="2 7"
        strokeLinecap="round"
      />
      <path
        d="M66 40 C 60 40 56 44.5 56 50 C 56 57 66 66 66 66 C 66 66 76 57 76 50 C 76 44.5 72 40 66 40 Z"
        fill={CORAL}
        strokeWidth="4"
        {...key}
      />
      <circle cx="66" cy="50" r="4.5" fill={WHITE} strokeWidth="2.5" {...key} />
    </PopArtTile>
  );
}

/** "No results / search" — a magnifier over a halftone lens with a heart. */
export function SearchIllustration({
  size,
  className,
  title,
}: PopArtIllustrationProps) {
  const id = "lvpa-search";
  return (
    <PopArtTile id={id} size={size} className={className} title={title}>
      <line x1="68" y1="66" x2="90" y2="90" stroke={BLACK} strokeWidth="11" strokeLinecap="round" />
      <line x1="69" y1="67" x2="88" y2="87" stroke={CORAL} strokeWidth="4.5" strokeLinecap="round" />
      <circle cx="52" cy="50" r="25" fill={WHITE} strokeWidth="5" {...key} />
      <circle cx="52" cy="50" r="20" fill={`url(#${id}-dots)`} opacity="0.5" />
      <Heart x={52} y={47} s={1.25} />
    </PopArtTile>
  );
}

/** "No data / chart" — a bar chart, tallest bar coral, heart on top. */
export function ChartIllustration({
  size,
  className,
  title,
}: PopArtIllustrationProps) {
  const id = "lvpa-chart";
  return (
    <PopArtTile id={id} size={size} className={className} title={title}>
      <line x1="30" y1="94" x2="96" y2="94" stroke={BLACK} strokeWidth="4.5" strokeLinecap="round" />
      <line x1="34" y1="30" x2="34" y2="94" stroke={BLACK} strokeWidth="4.5" strokeLinecap="round" />
      <rect x="42" y="68" width="14" height="26" fill={BLUE} strokeWidth="4" {...key} />
      <rect x="63" y="54" width="14" height="40" fill={BLUE} strokeWidth="4" {...key} />
      <rect x="63" y="54" width="14" height="40" fill={`url(#${id}-dots)`} opacity="0.35" />
      <rect x="84" y="44" width="14" height="50" fill={CORAL} strokeWidth="4" {...key} />
      <Heart x={91} y={32} s={0.9} />
    </PopArtTile>
  );
}

/** "Success / done" — a blue badge with a bold white check + coral heart. */
export function SuccessIllustration({
  size,
  className,
  title,
}: PopArtIllustrationProps) {
  const id = "lvpa-success";
  return (
    <PopArtTile id={id} size={size} className={className} title={title}>
      <circle cx="57" cy="55" r="29" fill={BLUE} strokeWidth="5" {...key} />
      <path d="M57 26 A29 29 0 0 1 57 84 Z" fill={BLUE_DEEP} />
      <circle cx="57" cy="55" r="24" fill={`url(#${id}-dots)`} opacity="0.28" />
      <circle cx="57" cy="55" r="29" fill="none" strokeWidth="5" {...key} />
      <path d="M44 56 L54 66 L72 44" fill="none" stroke={WHITE} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      <Heart x={84} y={84} s={0.95} />
    </PopArtTile>
  );
}

/** "No people" — three figures, the central one coral, heart above. */
export function PeopleIllustration({
  size,
  className,
  title,
}: PopArtIllustrationProps) {
  const id = "lvpa-people";
  return (
    <PopArtTile id={id} size={size} className={className} title={title}>
      <rect x="9" y="70" width="102" height="41" fill={`url(#${id}-dots)`} opacity="0.28" />
      <g>
        <path d="M28 96 C28 80 56 80 56 96 Z" fill={BLUE} strokeWidth="4" {...key} />
        <circle cx="42" cy="56" r="11" fill={BLUE} strokeWidth="4" {...key} />
      </g>
      <g>
        <path d="M64 96 C64 80 92 80 92 96 Z" fill={BLUE} strokeWidth="4" {...key} />
        <circle cx="78" cy="56" r="11" fill={BLUE} strokeWidth="4" {...key} />
      </g>
      <g>
        <path d="M42 98 C42 76 78 76 78 98 Z" fill={CORAL} strokeWidth="4.5" {...key} />
        <circle cx="60" cy="50" r="13" fill={CORAL} strokeWidth="4.5" {...key} />
      </g>
      <Heart x={60} y={28} s={1} />
    </PopArtTile>
  );
}

/** "No documents" — a stack of pages, the front sheet with a heart. */
export function DocumentsIllustration({
  size,
  className,
  title,
}: PopArtIllustrationProps) {
  const id = "lvpa-documents";
  return (
    <PopArtTile id={id} size={size} className={className} title={title}>
      <g transform="rotate(9 62 62)">
        <rect x="46" y="32" width="42" height="56" rx="4" fill={BLUE} strokeWidth="4" {...key} />
      </g>
      <rect x="32" y="38" width="44" height="56" rx="4" fill={WHITE} strokeWidth="4" {...key} />
      <line x1="40" y1="52" x2="68" y2="52" stroke={BLUE} strokeWidth="3.5" strokeLinecap="round" />
      <line x1="40" y1="62" x2="68" y2="62" stroke={BLUE} strokeWidth="3.5" strokeLinecap="round" />
      <line x1="40" y1="72" x2="58" y2="72" stroke={BLUE} strokeWidth="3.5" strokeLinecap="round" />
      <rect x="32" y="38" width="44" height="56" rx="4" fill={`url(#${id}-dots)`} opacity="0.16" />
      <Heart x={64} y={82} s={0.8} />
    </PopArtTile>
  );
}

/** "Credits / wallet" — a wallet with a coin bearing the coral heart. */
export function WalletIllustration({
  size,
  className,
  title,
}: PopArtIllustrationProps) {
  const id = "lvpa-wallet";
  return (
    <PopArtTile id={id} size={size} className={className} title={title}>
      <circle cx="70" cy="44" r="15" fill={WHITE} strokeWidth="4" {...key} />
      <Heart x={70} y={42} s={0.95} />
      <rect x="26" y="52" width="66" height="42" rx="9" fill={BLUE} strokeWidth="4.5" {...key} />
      <rect x="26" y="70" width="66" height="24" rx="9" fill={`url(#${id}-dots)`} opacity="0.35" />
      <path d="M26 66 L92 66" stroke={BLACK} strokeWidth="3.5" />
      <circle cx="82" cy="76" r="6.5" fill={CORAL} strokeWidth="4" {...key} />
    </PopArtTile>
  );
}

/** "Radar / target / goals" — a bullseye with a coral heart centre + arrow. */
export function TargetIllustration({
  size,
  className,
  title,
}: PopArtIllustrationProps) {
  const id = "lvpa-target";
  return (
    <PopArtTile id={id} size={size} className={className} title={title}>
      <circle cx="56" cy="60" r="30" fill={BLUE} strokeWidth="5" {...key} />
      <circle cx="56" cy="60" r="30" fill={`url(#${id}-dots)`} opacity="0.25" />
      <circle cx="56" cy="60" r="20" fill={WHITE} strokeWidth="4.5" {...key} />
      <circle cx="56" cy="60" r="10" fill={BLUE} strokeWidth="4" {...key} />
      <Heart x={56} y={58} s={0.85} />
      <line x1="90" y1="28" x2="64" y2="54" stroke={BLACK} strokeWidth="5" strokeLinecap="round" />
      <path d="M90 28 L82 30 L88 36 Z" fill={CORAL} strokeWidth="3.5" {...key} />
    </PopArtTile>
  );
}

/** "Startups / launch" — a rocket with a heart window and a coral flame. */
export function RocketIllustration({
  size,
  className,
  title,
}: PopArtIllustrationProps) {
  const id = "lvpa-rocket";
  return (
    <PopArtTile id={id} size={size} className={className} title={title}>
      <rect x="9" y="9" width="34" height="102" fill={`url(#${id}-dots)`} opacity="0.3" />
      <path d="M42 78 C 40 92 46 98 46 98 L52 88 Z" fill={CORAL} strokeWidth="4" {...key} />
      <path d="M78 78 C 80 92 74 98 74 98 L68 88 Z" fill={CORAL} strokeWidth="4" {...key} />
      <path
        d="M60 24 C 74 34 76 60 72 80 L48 80 C 44 60 46 34 60 24 Z"
        fill={WHITE}
        strokeWidth="4.5"
        {...key}
      />
      <path d="M48 80 L72 80 L67 90 L53 90 Z" fill={BLUE} strokeWidth="4" {...key} />
      <circle cx="60" cy="50" r="10" fill={BLUE} strokeWidth="4" {...key} />
      <Heart x={60} y={49} s={0.7} fill={CORAL} />
      <path d="M54 92 C 56 102 60 106 60 106 C 60 106 64 102 66 92 Z" fill={CORAL} strokeWidth="4" {...key} />
    </PopArtTile>
  );
}

/** Union of every valid Pop-Art illustration name. */
export type PopArtIllustrationName =
  | "empty"
  | "inbox"
  | "roadmap"
  | "search"
  | "chart"
  | "success"
  | "people"
  | "documents"
  | "wallet"
  | "target"
  | "rocket";

/** Canonical `name -> Component` registry for the Pop-Art illustration set. */
export const POPART_ILLUSTRATIONS = {
  empty: EmptyBoxIllustration,
  inbox: InboxIllustration,
  roadmap: RoadmapIllustration,
  search: SearchIllustration,
  chart: ChartIllustration,
  success: SuccessIllustration,
  people: PeopleIllustration,
  documents: DocumentsIllustration,
  wallet: WalletIllustration,
  target: TargetIllustration,
  rocket: RocketIllustration,
} satisfies Record<PopArtIllustrationName, ComponentType<PopArtIllustrationProps>>;

interface PopArtIllustrationWrapperProps extends PopArtIllustrationProps {
  name: PopArtIllustrationName;
}

/**
 * Shared wrapper — resolves a semantic `name` to its Pop-Art illustration.
 * Renders LARGE by default (120px); never shrink these into small nav icons.
 */
export function PopArtIllustration({
  name,
  ...props
}: PopArtIllustrationWrapperProps) {
  const Illustration = POPART_ILLUSTRATIONS[name];
  return <Illustration {...props} />;
}
