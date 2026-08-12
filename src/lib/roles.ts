import type { UserRole } from "@/generated/prisma/enums";
import {
  BarChart3,
  Bell,
  BookOpen,
  Building2,
  ClipboardCheck,
  Coins,
  Compass,
  FlaskConical,
  GitCompare,
  Handshake,
  Home,
  Inbox,
  Kanban,
  Layers,
  LayoutGrid,
  Library,
  ListChecks,
  MessageSquare,
  Newspaper,
  Radar,
  Rocket,
  Send,
  Settings,
  Share2,
  Sparkles,
  Store,
  Target,
  Users,
  type LucideIcon,
} from "lucide-react";

export const ALL_ROLES: UserRole[] = [
  "ADMIN",
  "MEMBER",
  "BUSINESS_PARTNER",
  "INVESTOR",
  "STARTUP",
];

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Admin",
  MEMBER: "Mitglied",
  BUSINESS_PARTNER: "Business Partner",
  INVESTOR: "Investor",
  STARTUP: "Startup",
};

/** Roles allowed into the internal Venture Scout module. */
export const VENTURE_SCOUT_ROLES: UserRole[] = ["ADMIN", "MEMBER"];

/**
 * Roles allowed to VIEW the startup-facing Venture Platform / Marktplatz
 * (storefront, offering detail, Anfrage flow, bookings list, credits view).
 * Startups use it as self-service; the internal team (ADMIN + MEMBER) gets the
 * exact same surfaces as a fully-visible "Admin-Sicht" preview and can act on
 * behalf of a startup. Per the product model, admin must see EVERYTHING.
 */
export const VENTURE_VIEW_ROLES: UserRole[] = ["STARTUP", "ADMIN", "MEMBER"];

/**
 * Roles allowed to VIEW the partner-facing feedback/screening masks
 * (Longlist-Screening, Use-Case-Bewertung, Check-ins, Partner-Hub). Partners
 * use them to give feedback; the internal team (ADMIN + MEMBER) gets the exact
 * same surfaces as a fully-visible "Partner-Sicht – Vorschau". The preview is
 * view-only — only a partner submits their own verdict. Per the product model,
 * admin must see EVERYTHING.
 */
export const PARTNER_VIEW_ROLES: UserRole[] = [
  "BUSINESS_PARTNER",
  "ADMIN",
  "MEMBER",
];

/** True for the internal Lovedis team (who preview/coordinate on behalf). */
export function isTeamRole(role: UserRole): boolean {
  return role === "ADMIN" || role === "MEMBER";
}

/**
 * Roles with access to the curated ecosystem marketplace (Discover + Feed).
 * Internal team is included so they can preview exactly what externals see.
 */
export const MARKETPLACE_ROLES: UserRole[] = [
  "ADMIN",
  "MEMBER",
  "INVESTOR",
  "BUSINESS_PARTNER",
];

/**
 * Roles allowed into the shared ecosystem Feed only. This is intentionally a
 * SUPERSET of MARKETPLACE_ROLES with STARTUP added: startups get full feed
 * access (official Lovedis broadcasts + updates of startups they follow)
 * WITHOUT unlocking the rest of the marketplace. Discover listing, startup
 * detail, the follow toggle and investor intro requests stay gated by
 * MARKETPLACE_ROLES (which excludes STARTUP), so this does not open any other
 * marketplace feature for startups.
 */
export const FEED_ROLES: UserRole[] = [...MARKETPLACE_ROLES, "STARTUP"];

export const ROLE_HOMES: Record<UserRole, string> = {
  ADMIN: "/dashboard/admin",
  MEMBER: "/dashboard/member",
  BUSINESS_PARTNER: "/dashboard/partner",
  INVESTOR: "/dashboard/investor",
  STARTUP: "/dashboard/startup",
};

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

const MESSAGES_ITEM: NavItem = {
  label: "Nachrichten",
  href: "/messages",
  icon: MessageSquare,
};

// ---------------------------------------------------------------------------
// Team navigation — grouped into thematic "Spaces" (Sourcing, Matchmaking,
// Zusammenarbeit, Roadmap/Wissen, Marktplatz, Tracking) instead of one long
// flat list, so the internal team navigates by journey stage / category. All
// hrefs are existing routes; this is an information-architecture regrouping.
// ---------------------------------------------------------------------------

/** Discover → screen → longlist: the top of the scouting funnel. */
const SOURCING_SECTION: NavSection = {
  title: "Sourcing & Screening",
  items: [
    { label: "Startups", href: "/startups", icon: Rocket },
    { label: "Longlist", href: "/longlist", icon: ListChecks },
    { label: "Bewertungen", href: "/evaluations", icon: BarChart3 },
    { label: "Vergleich", href: "/compare", icon: GitCompare },
    { label: "Radar", href: "/radar", icon: Radar },
  ],
};

/** Two-sided fit: the Match-Matrix plus the partner use-case verdicts. */
const MATCHMAKING_SECTION: NavSection = {
  title: "Matchmaking & Use-Cases",
  items: [
    { label: "Batches", href: "/batches", icon: Layers },
    { label: "Match-Matrix", href: "/match-matrix", icon: LayoutGrid },
    { label: "Use-Case-Bewertung (Partner)", href: "/use-cases", icon: Target },
  ],
};

/**
 * Collaboration & communication status: engagements, the Team→Partner push
 * with check-in reminders, and the partner-facing feedback masks as a
 * fully-visible "Partner-Sicht" preview (view-only; only partners submit).
 */
const COLLAB_SECTION: NavSection = {
  title: "Zusammenarbeit & Kommunikation",
  items: [
    { label: "Engagements", href: "/engagements", icon: Handshake },
    { label: "Push & Check-ins", href: "/pushes", icon: Send },
    { label: "Partner-Screening (Vorschau)", href: "/screening", icon: ClipboardCheck },
    { label: "Partner-Check-ins (Vorschau)", href: "/check-ins", icon: Bell },
  ],
};

/** Roadmap / Info-Space / Knowledge — the SSOT the team curates + preview. */
const SPACE_SECTION: NavSection = {
  title: "Roadmap & Wissen (SSOT)",
  items: [
    { label: "SSOT-Pflege", href: "/hub-admin", icon: BookOpen },
    { label: "Partner-Hub (Vorschau)", href: "/partner-hub", icon: Library },
  ],
};

/** Marketplace & venture credits (team-side inbox + storefront + grants). */
const MARKET_SECTION: NavSection = {
  title: "Marktplatz & Credits",
  items: [
    { label: "Venture-Credits", href: "/credits", icon: Coins },
    { label: "Marktplatz-Inbox", href: "/marketplace", icon: Inbox },
    { label: "Marktplatz-Storefront", href: "/venture/marketplace", icon: Store },
  ],
};

/** Internal status tracking — the funnel board + reporting. */
const TRACKING_SECTION: NavSection = {
  title: "Tracking (intern)",
  items: [
    { label: "Pipeline", href: "/pipeline", icon: Kanban },
    { label: "Berichte", href: "/reports", icon: Share2 },
  ],
};

const MARKETPLACE_SECTION: NavSection = {
  title: "Ökosystem",
  items: [
    { label: "Entdecken", href: "/discover", icon: Compass },
    { label: "Feed", href: "/feed", icon: Newspaper },
  ],
};

/**
 * Cross-role access for the internal team: the partner-native surfaces the
 * admin (and member) must be able to open and work on, clearly labelled as a
 * partner view. Screening/Use-Cases/Check-ins/Partner-Hub already live in the
 * team spaces above (as "Vorschau"), so they are intentionally NOT duplicated
 * here — this section only surfaces the partner tabs the team nav was missing.
 * Data is scoped to the logged-in user, so the team sees safe empty states.
 */
const PARTNER_FUNCTIONS_SECTION: NavSection = {
  title: "Partner-Funktionen (Admin-Sicht)",
  items: [
    { label: "Partner-Dashboard", href: "/dashboard/partner", icon: Handshake },
    { label: "Challenges (Use-Cases)", href: "/challenges", icon: Target },
    { label: "PoC-Tracking", href: "/pocs", icon: FlaskConical },
    { label: "Geteilte Scorings", href: "/scorings", icon: BarChart3 },
    MESSAGES_ITEM,
  ],
};

/**
 * Cross-role access for the internal team: the startup-native surfaces the
 * admin (and member) must be able to open and work on, clearly labelled as a
 * startup view. The Marktplatz-Storefront (/venture/marketplace) already lives
 * in "Marktplatz & Credits" above, so it is intentionally NOT duplicated here.
 * Data is scoped to the logged-in user, so the team sees safe empty states.
 */
const STARTUP_FUNCTIONS_SECTION: NavSection = {
  title: "Startup-Funktionen (Admin-Sicht)",
  items: [
    { label: "Startup-Dashboard", href: "/dashboard/startup", icon: Home },
    { label: "Meine Bewerbungen", href: "/applications", icon: Building2 },
    { label: "Mein Profil", href: "/profile", icon: Rocket },
    { label: "Venture Platform", href: "/venture", icon: Sparkles },
    { label: "Meine Anfragen", href: "/venture/marketplace/requests", icon: Inbox },
    { label: "Mein Guthaben", href: "/venture/credits", icon: Coins },
  ],
};

/**
 * Platform-level coordination pages for the internal team. Intro-Anfragen is
 * shared by ADMIN + MEMBER; ADMIN additionally reaches Nutzerverwaltung and the
 * Sharing (Geteilte Scorings) admin so those surfaces aren't orphaned.
 */
const PLATFORM_SECTION_MEMBER: NavSection = {
  title: "Plattform",
  items: [{ label: "Intro-Anfragen", href: "/intros", icon: Handshake }],
};

const PLATFORM_SECTION_ADMIN: NavSection = {
  title: "Plattform",
  items: [
    { label: "Intro-Anfragen", href: "/intros", icon: Handshake },
    { label: "Unternehmen", href: "/companies", icon: Building2 },
    { label: "Nutzerverwaltung", href: "/users", icon: Users },
    { label: "Geteilte Scorings", href: "/sharing", icon: Share2 },
  ],
};

const SETTINGS_SECTION: NavSection = {
  items: [{ label: "Einstellungen", href: "/settings", icon: Settings }],
};

export const ROLE_NAV: Record<UserRole, NavSection[]> = {
  ADMIN: [
    {
      items: [{ label: "Dashboard", href: "/dashboard/admin", icon: Home }],
    },
    SOURCING_SECTION,
    MATCHMAKING_SECTION,
    COLLAB_SECTION,
    SPACE_SECTION,
    MARKET_SECTION,
    TRACKING_SECTION,
    MARKETPLACE_SECTION,
    PARTNER_FUNCTIONS_SECTION,
    STARTUP_FUNCTIONS_SECTION,
    PLATFORM_SECTION_ADMIN,
    SETTINGS_SECTION,
  ],
  MEMBER: [
    {
      items: [{ label: "Dashboard", href: "/dashboard/member", icon: Home }],
    },
    SOURCING_SECTION,
    MATCHMAKING_SECTION,
    COLLAB_SECTION,
    SPACE_SECTION,
    MARKET_SECTION,
    TRACKING_SECTION,
    MARKETPLACE_SECTION,
    PARTNER_FUNCTIONS_SECTION,
    STARTUP_FUNCTIONS_SECTION,
    PLATFORM_SECTION_MEMBER,
    SETTINGS_SECTION,
  ],
  BUSINESS_PARTNER: [
    {
      items: [{ label: "Dashboard", href: "/dashboard/partner", icon: Home }],
    },
    MARKETPLACE_SECTION,
    {
      title: "Screening",
      items: [
        { label: "Match-Matrix", href: "/matrix", icon: LayoutGrid },
        { label: "Longlist-Screening", href: "/screening", icon: ClipboardCheck },
        { label: "Use-Case-Bewertung", href: "/use-cases", icon: Target },
        { label: "Check-ins", href: "/check-ins", icon: Bell },
      ],
    },
    {
      title: "Zusammenarbeit",
      items: [
        { label: "Meine Challenges", href: "/challenges", icon: Target },
        { label: "Engagements", href: "/engagements", icon: Handshake },
        { label: "PoC-Tracking", href: "/pocs", icon: FlaskConical },
        { label: "Geteilte Scorings", href: "/scorings", icon: BarChart3 },
        MESSAGES_ITEM,
      ],
    },
    {
      title: "Wissen",
      items: [{ label: "Partner-Hub", href: "/partner-hub", icon: BookOpen }],
    },
    {
      title: "Unternehmen",
      items: [{ label: "Team", href: "/team", icon: Users }],
    },
    SETTINGS_SECTION,
  ],
  INVESTOR: [
    {
      items: [{ label: "Dashboard", href: "/dashboard/investor", icon: Home }],
    },
    MARKETPLACE_SECTION,
    {
      title: "Portfolio",
      items: [
        { label: "PoC-Tracking", href: "/pocs", icon: FlaskConical },
        { label: "Geteilte Scorings", href: "/scorings", icon: BarChart3 },
        MESSAGES_ITEM,
      ],
    },
    SETTINGS_SECTION,
  ],
  STARTUP: [
    {
      items: [{ label: "Dashboard", href: "/dashboard/startup", icon: Home }],
    },
    {
      // Feed only — Discover/follow stay marketplace-gated (see FEED_ROLES).
      title: "Ökosystem",
      items: [{ label: "Feed", href: "/feed", icon: Newspaper }],
    },
    {
      title: "Chancen",
      items: [
        { label: "Match-Matrix", href: "/matrix", icon: LayoutGrid },
        { label: "Challenges", href: "/challenges", icon: Target },
        { label: "Meine Bewerbungen", href: "/applications", icon: Building2 },
        { label: "Mein Profil", href: "/profile", icon: Rocket },
        MESSAGES_ITEM,
      ],
    },
    {
      title: "Venture Platform",
      items: [
        { label: "Venture Platform", href: "/venture", icon: Sparkles },
        { label: "Marktplatz", href: "/venture/marketplace", icon: Store },
        { label: "Meine Anfragen", href: "/venture/marketplace/requests", icon: Inbox },
        { label: "Mein Guthaben", href: "/venture/credits", icon: Coins },
      ],
    },
    SETTINGS_SECTION,
  ],
};
