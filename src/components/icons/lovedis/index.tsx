import type { ComponentType } from "react";
import type { LovedisIconProps } from "./types";
import * as G from "./glyphs";

/**
 * Canonical `name -> Component` registry for the bespoke Lovedis pictogram set.
 * Keys are semantic (map to what the icon MEANS in the product), so callers ask
 * for `"matchMatrix"` rather than a lucide shape name. A handful of chrome /
 * marketplace utility entries are included so surfaces can drop lucide entirely.
 */
export const LOVEDIS_ICONS = {
  // Sourcing & core
  dashboard: G.DashboardIcon,
  startups: G.StartupsIcon,
  longlist: G.LonglistIcon,
  evaluations: G.EvaluationsIcon,
  compare: G.CompareIcon,
  radar: G.RadarIcon,
  // Matchmaking
  batches: G.BatchesIcon,
  matchMatrix: G.MatchMatrixIcon,
  useCases: G.UseCasesIcon,
  // Collaboration
  engagements: G.EngagementsIcon,
  pushes: G.PushesIcon,
  screening: G.ScreeningIcon,
  checkIns: G.CheckInsIcon,
  // Roadmap & knowledge
  ssot: G.SsotIcon,
  partnerHub: G.PartnerHubIcon,
  // Marketplace & credits
  credits: G.CreditsIcon,
  inbox: G.InboxIcon,
  storefront: G.StorefrontIcon,
  // Tracking
  pipeline: G.PipelineIcon,
  reports: G.ReportsIcon,
  // Ecosystem
  discover: G.DiscoverIcon,
  feed: G.FeedIcon,
  // Partner / startup functions
  partnerDashboard: G.PartnerDashboardIcon,
  challenges: G.ChallengesIcon,
  pocs: G.PocsIcon,
  scorings: G.ScoringsIcon,
  messages: G.MessagesIcon,
  startupDashboard: G.StartupDashboardIcon,
  applications: G.ApplicationsIcon,
  profile: G.ProfileIcon,
  venture: G.VentureIcon,
  requests: G.RequestsIcon,
  wallet: G.WalletIcon,
  // Platform
  intros: G.IntrosIcon,
  companies: G.CompaniesIcon,
  users: G.UsersIcon,
  team: G.TeamIcon,
  settings: G.SettingsIcon,
  sharing: G.SharingIcon,
  // Chrome / UI controls
  search: G.SearchIcon,
  help: G.HelpIcon,
  menu: G.MenuIcon,
  close: G.CloseIcon,
  chevronRight: G.ChevronRightIcon,
  chevronLeft: G.ChevronLeftIcon,
  arrowRight: G.ArrowRightIcon,
  arrowLeft: G.ArrowLeftIcon,
  logout: G.LogoutIcon,
  // Venture / marketplace extras
  graduationCap: G.GraduationCapIcon,
  calendar: G.CalendarIcon,
  calendarClock: G.CalendarClockIcon,
  globe: G.GlobeIcon,
  check: G.CheckIcon,
  checkCheck: G.CheckCheckIcon,
  send: G.PushesIcon,
  plus: G.PlusIcon,
} satisfies Record<string, ComponentType<LovedisIconProps>>;

/** Union of every valid pictogram name in the set. */
export type LovedisIconName = keyof typeof LOVEDIS_ICONS;

interface LovedisIconWrapperProps extends LovedisIconProps {
  name: LovedisIconName;
}

/**
 * Shared wrapper — the primary public API for the icon set. Resolves a semantic
 * `name` to its bespoke glyph. `size` defaults to 24; `className` passes through
 * so Tailwind sizing/colour utilities (e.g. `h-4 w-4`) win over the attribute.
 */
export function LovedisIcon({ name, size = 24, className }: LovedisIconWrapperProps) {
  const Glyph = LOVEDIS_ICONS[name];
  return <Glyph size={size} className={className} />;
}

export * from "./glyphs";
export type { LovedisIconProps, IconRenderer } from "./types";
export { LV_CORAL } from "./types";
