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
    { label: "Nutzerverwaltung", href: "/users", icon: Users },
    { label: "Geteilte Scorings", href: "/sharing", icon: Share2 },
  ],
};

const MESSAGES_ITEM: NavItem = {
  label: "Nachrichten",
  href: "/messages",
  icon: MessageSquare,
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
      title: "Chancen",
      items: [
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
