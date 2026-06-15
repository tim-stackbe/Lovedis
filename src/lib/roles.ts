import type { UserRole } from "@/generated/prisma/enums";
import {
  BarChart3,
  Building2,
  FlaskConical,
  GitCompare,
  Home,
  Kanban,
  MessageSquare,
  Radar,
  Rocket,
  Settings,
  Share2,
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
    SCOUT_SECTION,
    {
      title: "Plattform",
      items: [
        { label: "Challenges", href: "/challenges", icon: Target },
        { label: "Geteilte Scorings", href: "/sharing", icon: Share2 },
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
    { items: [MESSAGES_ITEM] },
    SETTINGS_SECTION,
  ],
  BUSINESS_PARTNER: [
    {
      items: [{ label: "Dashboard", href: "/dashboard/partner", icon: Home }],
    },
    {
      title: "Zusammenarbeit",
      items: [
        { label: "Meine Challenges", href: "/challenges", icon: Target },
        { label: "PoC-Tracking", href: "/pocs", icon: FlaskConical },
        { label: "Geteilte Scorings", href: "/scorings", icon: BarChart3 },
        MESSAGES_ITEM,
      ],
    },
    SETTINGS_SECTION,
  ],
  INVESTOR: [
    {
      items: [{ label: "Dashboard", href: "/dashboard/investor", icon: Home }],
    },
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
    SETTINGS_SECTION,
  ],
};
