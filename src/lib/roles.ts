import type { UserRole } from "@/generated/prisma/enums";
import type { LovedisIconName } from "@/components/icons/lovedis";

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
  /** Semantic name into the bespoke Lovedis pictogram set. */
  icon: LovedisIconName;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

// ---------------------------------------------------------------------------
// Alpha launch — Partner nav allowlist (flip ONE value to restore the old nav)
// ---------------------------------------------------------------------------
//
// Pre-Alpha BUSINESS_PARTNER sidebar / command-palette nav (DE labels):
//   [untitled]     Dashboard              /dashboard/partner
//   Ökosystem      Entdecken              /discover
//                  Feed                   /feed
//   Screening      Match-Matrix           /matrix
//                  Longlist-Screening     /screening
//                  Use-Case-Bewertung     /use-cases
//                  Check-ins              /check-ins
//   Zusammenarbeit Meine Challenges       /challenges
//                  Engagements            /engagements
//                  PoC-Tracking           /pocs
//                  Geteilte Scorings      /scorings
//                  Nachrichten            /messages
//   Wissen         Partner-Hub            /partner-hub
//   Unternehmen    Team                   /team
//   [untitled]     Einstellungen          /settings
//
// During Alpha the Partner nav is reduced to a strict KEEP-list (allowlist):
// only the six hrefs in ALPHA_VISIBLE_PARTNER_HREFS stay visible. Everything
// else above — Dashboard (/dashboard/partner), Feed (/feed), Longlist-Screening
// (/screening), Use-Case-Bewertung (/use-cases), Check-ins (/check-ins),
// Engagements (/engagements), PoC-Tracking (/pocs), Geteilte Scorings
// (/scorings) and Nachrichten (/messages) — is hidden from the Partner nav.
//
// Set to `false` to show every item above again. Pages/routes stay registered
// either way; this only filters Partner ROLE_NAV (sidebar + command palette).
// ADMIN / MEMBER / STARTUP / INVESTOR nav is untouched.
export const ALPHA_HIDE_PARTNER_SECTIONS = true;

/**
 * Partner nav hrefs that stay VISIBLE while ALPHA_HIDE_PARTNER_SECTIONS is
 * true. This is an allowlist: any Partner nav item whose href is NOT listed
 * here is hidden during Alpha (and now-empty sections are dropped).
 */
const ALPHA_VISIBLE_PARTNER_HREFS = [
  "/discover", // Entdecken
  "/matrix", // Startup-Partner Matchmaking
  "/challenges", // Challenges
  "/partner-hub", // Partner-Hub
  "/team", // Team
  "/settings", // Einstellungen
] as const;

function applyPartnerAlphaNav(sections: NavSection[]): NavSection[] {
  if (!ALPHA_HIDE_PARTNER_SECTIONS) return sections;
  const visible = new Set<string>(ALPHA_VISIBLE_PARTNER_HREFS);
  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => visible.has(item.href)),
    }))
    .filter((section) => section.items.length > 0);
}

// ---------------------------------------------------------------------------
// Alpha launch — Startup nav hide-list (flip ONE value to restore the old nav)
// ---------------------------------------------------------------------------
//
// Pre-Alpha STARTUP sidebar / command-palette nav (DE labels):
//   [untitled]        Dashboard                     /dashboard/startup
//   Ökosystem         Feed                          /feed
//   Chancen           Startup-Partner Matchmaking   /matrix
//                     Challenges                    /challenges
//                     Meine Bewerbungen             /applications
//                     Mein Profil                   /profile
//                     Nachrichten                   /messages
//   Venture Platform  Venture Platform              /venture
//                     Marktplatz                    /venture/marketplace
//                     Meine Anfragen                /venture/marketplace/requests
//                     Mein Guthaben                 /venture/credits
//   [untitled]        Einstellungen                 /settings
//
// During Alpha the Startup nav hides a strict HIDE-list (denylist): the six
// hrefs in ALPHA_HIDDEN_STARTUP_HREFS are removed and every OTHER Startup nav
// item stays visible. Hidden for Alpha: Feed (/feed), Nachrichten (/messages),
// Marktplatz (/venture/marketplace), Meine Anfragen
// (/venture/marketplace/requests) and Mein Guthaben (/venture/credits).
// Hiding Feed empties the "Ökosystem" section, so that whole section (header
// included) is dropped too. Everything else — Dashboard (/dashboard/startup),
// Startup-Partner Matchmaking (/matrix), Challenges (/challenges), Meine
// Bewerbungen (/applications), Mein Profil (/profile), Venture Platform
// (/venture) and Einstellungen (/settings) — stays visible.
//
// Set to `false` to show every item above again. Pages/routes stay registered
// either way; this only filters Startup ROLE_NAV (sidebar + command palette).
// ADMIN / MEMBER / BUSINESS_PARTNER / INVESTOR nav is untouched.
export const ALPHA_HIDE_STARTUP_SECTIONS = true;

/**
 * Startup nav hrefs that are HIDDEN while ALPHA_HIDE_STARTUP_SECTIONS is true.
 * This is a denylist: any Startup nav item whose href IS listed here is hidden
 * during Alpha (and now-empty sections are dropped). Everything else stays.
 */
const ALPHA_HIDDEN_STARTUP_HREFS = [
  "/feed", // Feed (empties the "Ökosystem" section → header dropped too)
  "/messages", // Nachrichten
  "/venture/marketplace", // Marktplatz
  "/venture/marketplace/requests", // Meine Anfragen
  "/venture/credits", // Mein Guthaben
] as const;

// ---------------------------------------------------------------------------
// Alpha launch — rename the Startup "Venture Platform" nav to "Übersicht"
// (flip ONE value to restore the old label).
// ---------------------------------------------------------------------------
//
// After ALPHA_HIDE_STARTUP_SECTIONS hides Marktplatz / Meine Anfragen / Mein
// Guthaben, the "Venture Platform" section collapses to a single visible item
// (/venture), whose label is ALSO "Venture Platform" — so the user would see
// "Venture Platform" twice (section header + item). For Alpha we rename BOTH
// the section header (title === "Venture Platform") and the /venture item label
// to "Übersicht". The href "/venture" and routing are unchanged.
//
// Set ALPHA_RENAME_STARTUP_VENTURE to `false` to restore the original
// "Venture Platform" header + item label. Only the STARTUP nav is affected.
export const ALPHA_RENAME_STARTUP_VENTURE = true;
const ALPHA_STARTUP_VENTURE_LABEL = "Übersicht";

function applyStartupAlphaNav(sections: NavSection[]): NavSection[] {
  let result = sections;

  if (ALPHA_HIDE_STARTUP_SECTIONS) {
    const hidden = new Set<string>(ALPHA_HIDDEN_STARTUP_HREFS);
    result = result
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => !hidden.has(item.href)),
      }))
      .filter((section) => section.items.length > 0);
  }

  if (ALPHA_RENAME_STARTUP_VENTURE) {
    result = result.map((section) => ({
      ...section,
      title:
        section.title === "Venture Platform"
          ? ALPHA_STARTUP_VENTURE_LABEL
          : section.title,
      items: section.items.map((item) =>
        item.href === "/venture"
          ? { ...item, label: ALPHA_STARTUP_VENTURE_LABEL }
          : item,
      ),
    }));
  }

  return result;
}

const MESSAGES_ITEM: NavItem = {
  label: "Nachrichten",
  href: "/messages",
  icon: "messages",
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
    { label: "Startups", href: "/startups", icon: "startups" },
    { label: "Longlist", href: "/longlist", icon: "longlist" },
    { label: "Bewertungen", href: "/evaluations", icon: "evaluations" },
    { label: "Vergleich", href: "/compare", icon: "compare" },
    { label: "Radar", href: "/radar", icon: "radar" },
  ],
};

/** Two-sided fit: the Match-Matrix plus the partner use-case verdicts. */
const MATCHMAKING_SECTION: NavSection = {
  title: "Matchmaking & Use-Cases",
  items: [
    { label: "Batches", href: "/batches", icon: "batches" },
    { label: "Match-Matrix", href: "/match-matrix", icon: "matchMatrix" },
    { label: "Use-Case-Bewertung (Partner)", href: "/use-cases", icon: "useCases" },
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
    { label: "Engagements", href: "/engagements", icon: "engagements" },
    { label: "Push & Check-ins", href: "/pushes", icon: "pushes" },
    { label: "Partner-Screening (Vorschau)", href: "/screening", icon: "screening" },
    { label: "Partner-Check-ins (Vorschau)", href: "/check-ins", icon: "checkIns" },
  ],
};

/** Roadmap / Info-Space / Knowledge — the SSOT the team curates + preview. */
const SPACE_SECTION: NavSection = {
  title: "Roadmap & Wissen (SSOT)",
  items: [
    { label: "SSOT-Pflege", href: "/hub-admin", icon: "ssot" },
    { label: "Partner-Hub (Vorschau)", href: "/partner-hub", icon: "partnerHub" },
  ],
};

/** Marketplace & venture credits (team-side inbox + storefront + grants). */
const MARKET_SECTION: NavSection = {
  title: "Marktplatz & Credits",
  items: [
    { label: "Venture-Credits", href: "/credits", icon: "credits" },
    { label: "Marktplatz-Inbox", href: "/marketplace", icon: "inbox" },
    { label: "Marktplatz-Storefront", href: "/venture/marketplace", icon: "storefront" },
  ],
};

/** Internal status tracking — the funnel board + reporting. */
const TRACKING_SECTION: NavSection = {
  title: "Tracking (intern)",
  items: [
    { label: "Pipeline", href: "/pipeline", icon: "pipeline" },
    { label: "Berichte", href: "/reports", icon: "reports" },
  ],
};

const MARKETPLACE_SECTION: NavSection = {
  title: "Ökosystem",
  items: [
    { label: "Entdecken", href: "/discover", icon: "discover" },
    { label: "Feed", href: "/feed", icon: "feed" },
  ],
};

// ---------------------------------------------------------------------------
// ADMIN-only variants of the shared team spaces. ADMIN must see the internal
// team/admin working tools but NOT previews of the Partner/Startup end-user
// surfaces. The shared *_SECTION constants above are still used verbatim by
// MEMBER, so we clone them here with the partner-view PREVIEW items stripped
// out instead of mutating the shared objects. Nav-level only — the underlying
// routes and their ADMIN-inclusive guards are unchanged.
// ---------------------------------------------------------------------------

/** Matchmaking for ADMIN: drops "Use-Case-Bewertung (Partner)" (/use-cases is
 *  the partner-facing verdict mask, shown to the team only as a preview). */
const MATCHMAKING_SECTION_ADMIN: NavSection = {
  title: "Matchmaking & Use-Cases",
  items: [
    { label: "Batches", href: "/batches", icon: "batches" },
    { label: "Startup-Partner Matchmaking", href: "/match-matrix", icon: "matchMatrix" },
  ],
};

/** Collaboration for ADMIN: drops the "Partner-Screening (Vorschau)" and
 *  "Partner-Check-ins (Vorschau)" partner-view previews; keeps the internal
 *  engagements + Team→Partner push tools. */
const COLLAB_SECTION_ADMIN: NavSection = {
  title: "Zusammenarbeit & Kommunikation",
  items: [
    { label: "Engagements", href: "/engagements", icon: "engagements" },
    { label: "Push & Check-ins", href: "/pushes", icon: "pushes" },
  ],
};

/** SSOT for ADMIN: drops "Partner-Hub (Vorschau)"; keeps the team's SSOT
 *  curation tool. */
const SPACE_SECTION_ADMIN: NavSection = {
  title: "Roadmap & Wissen (SSOT)",
  items: [{ label: "SSOT-Pflege", href: "/hub-admin", icon: "ssot" }],
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
    { label: "Partner-Dashboard", href: "/dashboard/partner", icon: "partnerDashboard" },
    { label: "Challenges (Use-Cases)", href: "/challenges", icon: "challenges" },
    { label: "PoC-Tracking", href: "/pocs", icon: "pocs" },
    { label: "Geteilte Scorings", href: "/scorings", icon: "scorings" },
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
    { label: "Startup-Dashboard", href: "/dashboard/startup", icon: "startupDashboard" },
    { label: "Meine Bewerbungen", href: "/applications", icon: "applications" },
    { label: "Mein Profil", href: "/profile", icon: "profile" },
    { label: "Venture Platform", href: "/venture", icon: "venture" },
    { label: "Meine Anfragen", href: "/venture/marketplace/requests", icon: "requests" },
    { label: "Mein Guthaben", href: "/venture/credits", icon: "wallet" },
  ],
};

/**
 * Platform-level coordination pages for the internal team. Intro-Anfragen is
 * shared by ADMIN + MEMBER; ADMIN additionally reaches Nutzerverwaltung and the
 * Sharing (Geteilte Scorings) admin so those surfaces aren't orphaned.
 */
const PLATFORM_SECTION_MEMBER: NavSection = {
  title: "Plattform",
  items: [{ label: "Intro-Anfragen", href: "/intros", icon: "intros" }],
};

const PLATFORM_SECTION_ADMIN: NavSection = {
  title: "Plattform",
  items: [
    { label: "Intro-Anfragen", href: "/intros", icon: "intros" },
    { label: "Unternehmen", href: "/companies", icon: "companies" },
    { label: "Nutzerverwaltung", href: "/users", icon: "users" },
    { label: "Geteilte Scorings", href: "/sharing", icon: "sharing" },
  ],
};

const SETTINGS_SECTION: NavSection = {
  items: [{ label: "Einstellungen", href: "/settings", icon: "settings" }],
};

export const ROLE_NAV: Record<UserRole, NavSection[]> = {
  // ADMIN sees a focused, admin-relevant navigation: platform administration
  // (Nutzerverwaltung, Unternehmen, Intro-Anfragen, Geteilte Scorings), the
  // internal scouting/curation workflow it oversees (Sourcing → Matchmaking →
  // Zusammenarbeit → SSOT → Marktplatz), tracking/reporting, and settings.
  //
  // The personal end-user role previews — "Startup-Funktionen (Admin-Sicht)"
  // and "Partner-Funktionen (Admin-Sicht)" — are intentionally NOT surfaced
  // here: items like "Mein Profil", "Mein Guthaben", "Meine Bewerbungen" or a
  // partner's personal dashboard are role-specific end-user surfaces, not admin
  // tools, and only cluttered the admin view. The remaining partner-view
  // PREVIEW items embedded in the shared spaces are likewise dropped for ADMIN
  // via the *_SECTION_ADMIN variants: "Use-Case-Bewertung (Partner)",
  // "Partner-Screening (Vorschau)", "Partner-Check-ins (Vorschau)" and
  // "Partner-Hub (Vorschau)". Those routes still exist and stay reachable by
  // URL (their ADMIN-inclusive guards are unchanged), and MEMBER keeps the full
  // preview nav below — this is a nav-level declutter only.
  ADMIN: [
    {
      items: [{ label: "Dashboard", href: "/dashboard/admin", icon: "dashboard" }],
    },
    SOURCING_SECTION,
    MATCHMAKING_SECTION_ADMIN,
    COLLAB_SECTION_ADMIN,
    SPACE_SECTION_ADMIN,
    MARKET_SECTION,
    TRACKING_SECTION,
    MARKETPLACE_SECTION,
    PLATFORM_SECTION_ADMIN,
    SETTINGS_SECTION,
  ],
  MEMBER: [
    {
      items: [{ label: "Dashboard", href: "/dashboard/member", icon: "dashboard" }],
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
  BUSINESS_PARTNER: applyPartnerAlphaNav([
    {
      items: [{ label: "Dashboard", href: "/dashboard/partner", icon: "partnerDashboard" }],
    },
    MARKETPLACE_SECTION,
    {
      title: "Screening",
      items: [
        { label: "Startup-Partner Matchmaking", href: "/matrix", icon: "matchMatrix" },
        { label: "Longlist-Screening", href: "/screening", icon: "screening" },
        { label: "Use-Case-Bewertung", href: "/use-cases", icon: "useCases" },
        { label: "Check-ins", href: "/check-ins", icon: "checkIns" },
      ],
    },
    {
      title: "Zusammenarbeit",
      items: [
        { label: "Challenges", href: "/challenges", icon: "challenges" },
        { label: "Engagements", href: "/engagements", icon: "engagements" },
        { label: "PoC-Tracking", href: "/pocs", icon: "pocs" },
        { label: "Geteilte Scorings", href: "/scorings", icon: "scorings" },
        MESSAGES_ITEM,
      ],
    },
    {
      title: "Wissen",
      items: [{ label: "Partner-Hub", href: "/partner-hub", icon: "partnerHub" }],
    },
    {
      title: "Unternehmen",
      items: [{ label: "Team", href: "/team", icon: "team" }],
    },
    SETTINGS_SECTION,
  ]),
  INVESTOR: [
    {
      items: [{ label: "Dashboard", href: "/dashboard/investor", icon: "dashboard" }],
    },
    MARKETPLACE_SECTION,
    {
      title: "Portfolio",
      items: [
        { label: "PoC-Tracking", href: "/pocs", icon: "pocs" },
        { label: "Geteilte Scorings", href: "/scorings", icon: "scorings" },
        MESSAGES_ITEM,
      ],
    },
    SETTINGS_SECTION,
  ],
  STARTUP: applyStartupAlphaNav([
    {
      items: [{ label: "Dashboard", href: "/dashboard/startup", icon: "startupDashboard" }],
    },
    {
      // Feed only — Discover/follow stay marketplace-gated (see FEED_ROLES).
      title: "Ökosystem",
      items: [{ label: "Feed", href: "/feed", icon: "feed" }],
    },
    {
      title: "Startup-Hub",
      items: [
        { label: "Startup-Partner Matchmaking", href: "/matrix", icon: "matchMatrix" },
        { label: "Challenges", href: "/challenges", icon: "challenges" },
        { label: "Meine Bewerbungen", href: "/applications", icon: "applications" },
        { label: "Mein Profil", href: "/profile", icon: "profile" },
        MESSAGES_ITEM,
      ],
    },
    {
      title: "Venture Platform",
      items: [
        { label: "Venture Platform", href: "/venture", icon: "venture" },
        { label: "Marktplatz", href: "/venture/marketplace", icon: "storefront" },
        { label: "Meine Anfragen", href: "/venture/marketplace/requests", icon: "requests" },
        { label: "Mein Guthaben", href: "/venture/credits", icon: "wallet" },
      ],
    },
    SETTINGS_SECTION,
  ]),
};
