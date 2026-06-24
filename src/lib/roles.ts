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
  Kanban,
  ListChecks,
  MessageSquare,
  Newspaper,
  Radar,
  Rocket,
  Send,
  Settings,
  Share2,
  Sparkles,
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

const SCOUT_SECTION: NavSection = {
  title: "Venture Scout",
  items: [
    { label: "Startups", href: "/startups", icon: Rocket },
    { label: "Bewertungen", href: "/evaluations", icon: BarChart3 },
    { label: "Vergleich", href: "/compare", icon: GitCompare },
    { label: "Pipeline", href: "/pipeline", icon: Kanban },
    { label: "Radar", href: "/radar", icon: Radar },
    { label: "Berichte", href: "/reports", icon: Share2 },
  ],
};

/**
 * Screening & SSOT workflows owned by the internal team. These create the
 * curated data (Polina screening, pushes, engagements, SSOT content, credits)
 * that partners and startups consume through their low-overload views.
 */
const TEAM_SSOT_SECTION: NavSection = {
  title: "Screening & SSOT",
  items: [
    { label: "Longlist", href: "/longlist", icon: ListChecks },
    { label: "Engagements", href: "/engagements", icon: Handshake },
    { label: "Push & Check-ins", href: "/pushes", icon: Send },
    { label: "SSOT-Pflege", href: "/hub-admin", icon: BookOpen },
    { label: "Venture-Credits", href: "/credits", icon: Coins },
  ],
};

const MARKETPLACE_SECTION: NavSection = {
  title: "Ökosystem",
  items: [
    { label: "Entdecken", href: "/discover", icon: Compass },
    { label: "Feed", href: "/feed", icon: Newspaper },
  ],
};

const MESSAGES_ITEM: NavItem = {
  label: "Nachrichten",
  href: "/messages",
  icon: MessageSquare,
};

const INTROS_ITEM: NavItem = {
  label: "Intro-Anfragen",
  href: "/intros",
  icon: Handshake,
};

const SETTINGS_SECTION: NavSection = {
  items: [{ label: "Einstellungen", href: "/settings", icon: Settings }],
};

export const ROLE_NAV: Record<UserRole, NavSection[]> = {
  ADMIN: [
    {
      items: [{ label: "Dashboard", href: "/dashboard/admin", icon: Home }],
    },
    SCOUT_SECTION,
    TEAM_SSOT_SECTION,
    MARKETPLACE_SECTION,
    {
      title: "Plattform",
      items: [
        { label: "Challenges", href: "/challenges", icon: Target },
        { label: "Geteilte Scorings", href: "/sharing", icon: Share2 },
        INTROS_ITEM,
        MESSAGES_ITEM,
        { label: "Nutzer", href: "/users", icon: Users },
      ],
    },
    SETTINGS_SECTION,
  ],
  MEMBER: [
    {
      items: [{ label: "Dashboard", href: "/dashboard/member", icon: Home }],
    },
    SCOUT_SECTION,
    TEAM_SSOT_SECTION,
    MARKETPLACE_SECTION,
    {
      title: "Plattform",
      items: [INTROS_ITEM, MESSAGES_ITEM],
    },
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
        { label: "Mein Guthaben", href: "/venture/credits", icon: Coins },
      ],
    },
    SETTINGS_SECTION,
  ],
};
