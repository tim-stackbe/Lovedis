import type {
  ApplicationStatus,
  BookingStatus,
  ChallengeStatus,
  ContentAudience,
  CreditTxType,
  EngagementStatus,
  IntroStatus,
  MarketplaceOfferingType,
  PartnerVerdict,
  PipelineStage,
  PoCStatus,
  ProgramStatus,
  RadarQuadrant,
  RadarRing,
  Recommendation,
  ReminderStatus,
  RoadmapStatus,
  ScoreDimension,
  SourceType,
  StartupStage,
  SupportCategory,
  UpdateCategory,
} from "@/generated/prisma/enums";

// ---------------------------------------------------------------------------
// Scoring dimensions & default weights
// ---------------------------------------------------------------------------

export const SCORE_DIMENSIONS: ScoreDimension[] = [
  "MARKET",
  "PRODUCT",
  "TRACTION",
  "COMPETITIVE_POSITION",
  "TEAM",
  "BUSINESS_MODEL",
  "STRATEGIC_FIT",
];

export const DIMENSION_LABELS: Record<ScoreDimension, string> = {
  MARKET: "Markt",
  PRODUCT: "Produkt",
  TRACTION: "Traktion",
  COMPETITIVE_POSITION: "Wettbewerbsposition",
  TEAM: "Team",
  BUSINESS_MODEL: "Geschäftsmodell",
  STRATEGIC_FIT: "Strategischer Fit",
};

export const DIMENSION_DESCRIPTIONS: Record<ScoreDimension, string> = {
  MARKET: "Marktgröße, Wachstum und Timing",
  PRODUCT: "Produktreife, Differenzierung und Verteidigungsfähigkeit",
  TRACTION: "Kunden, Umsatz und Wachstumssignale",
  COMPETITIVE_POSITION: "Burggraben gegenüber aktuellen und künftigen Wettbewerbern",
  TEAM: "Founder-Market-Fit, Vollständigkeit und Umsetzungsstärke",
  BUSINESS_MODEL: "Unit Economics, Preissetzungsmacht und Skalierbarkeit",
  STRATEGIC_FIT: "Passung zu unserer Scouting-These und den Partner-Bedürfnissen",
};

/** Default dimension weights — must sum to 1. */
export const DEFAULT_WEIGHTS: Record<ScoreDimension, number> = {
  MARKET: 0.2,
  PRODUCT: 0.15,
  TRACTION: 0.15,
  COMPETITIVE_POSITION: 0.1,
  TEAM: 0.2,
  BUSINESS_MODEL: 0.1,
  STRATEGIC_FIT: 0.1,
};

export const MAX_SCORE = 5;

// ---------------------------------------------------------------------------
// Recommendation
// ---------------------------------------------------------------------------

export const RECOMMENDATION_LABELS: Record<Recommendation, string> = {
  STRONG_YES: "Klares Ja",
  YES: "Ja",
  MAYBE: "Vielleicht",
  NO: "Nein",
  STRONG_NO: "Klares Nein",
};

export const RECOMMENDATION_ORDER: Recommendation[] = [
  "STRONG_YES",
  "YES",
  "MAYBE",
  "NO",
  "STRONG_NO",
];

// ---------------------------------------------------------------------------
// Quadrants (Potential × Feasibility)
// ---------------------------------------------------------------------------

export type Quadrant = "MONEY_MAKER" | "DREAMER" | "SOLID_BET" | "PASS";

export const QUADRANT_LABELS: Record<Quadrant, string> = {
  MONEY_MAKER: "Money Maker",
  DREAMER: "Dreamer",
  SOLID_BET: "Solid Bet",
  PASS: "Pass",
};

export const QUADRANT_DESCRIPTIONS: Record<Quadrant, string> = {
  MONEY_MAKER: "Hohes Potenzial, hohe Machbarkeit",
  DREAMER: "Hohes Potenzial, geringe Machbarkeit",
  SOLID_BET: "Geringeres Upside, starke Umsetzung",
  PASS: "Geringes Potenzial, geringe Machbarkeit",
};

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

export const PIPELINE_STAGES: PipelineStage[] = [
  "DISCOVERED",
  "SCREENING",
  "IN_EVALUATION",
  "PILOT",
  "PARTNERED",
  "PASSED",
];

export const PIPELINE_STAGE_LABELS: Record<PipelineStage, string> = {
  DISCOVERED: "Entdeckt",
  SCREENING: "Screening",
  IN_EVALUATION: "In Bewertung",
  PILOT: "Pilot",
  PARTNERED: "Partnerschaft",
  PASSED: "Abgelehnt",
};

// ---------------------------------------------------------------------------
// Radar
// ---------------------------------------------------------------------------

export const RADAR_QUADRANTS: RadarQuadrant[] = [
  "AI_DATA",
  "CLIMATE_ENERGY",
  "HEALTH_BIO",
  "INDUSTRY_40",
];

export const RADAR_QUADRANT_LABELS: Record<RadarQuadrant, string> = {
  AI_DATA: "KI & Daten",
  CLIMATE_ENERGY: "Klima & Energie",
  HEALTH_BIO: "Health & Bio",
  INDUSTRY_40: "Industrie 4.0",
};

export const RADAR_RINGS: RadarRing[] = ["ADOPT", "TRIAL", "ASSESS", "HOLD"];

export const RADAR_RING_LABELS: Record<RadarRing, string> = {
  ADOPT: "Adopt",
  TRIAL: "Trial",
  ASSESS: "Assess",
  HOLD: "Hold",
};

// ---------------------------------------------------------------------------
// Startup stage
// ---------------------------------------------------------------------------

export const STARTUP_STAGES: StartupStage[] = [
  "PRE_SEED",
  "SEED",
  "SERIES_A",
  "SERIES_B",
  "GROWTH",
];

export const STARTUP_STAGE_LABELS: Record<StartupStage, string> = {
  PRE_SEED: "Pre-Seed",
  SEED: "Seed",
  SERIES_A: "Series A",
  SERIES_B: "Series B",
  GROWTH: "Growth",
};

// ---------------------------------------------------------------------------
// Challenges & applications
// ---------------------------------------------------------------------------

export const CHALLENGE_STATUSES: ChallengeStatus[] = [
  "DRAFT",
  "OPEN",
  "IN_REVIEW",
  "CLOSED",
];

export const CHALLENGE_STATUS_LABELS: Record<ChallengeStatus, string> = {
  DRAFT: "Entwurf",
  OPEN: "Offen",
  IN_REVIEW: "In Prüfung",
  CLOSED: "Geschlossen",
};

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  PENDING: "Ausstehend",
  ACCEPTED: "Angenommen",
  REJECTED: "Abgelehnt",
};

// ---------------------------------------------------------------------------
// PoC
// ---------------------------------------------------------------------------

export const POC_STATUSES: PoCStatus[] = [
  "PLANNED",
  "RUNNING",
  "COMPLETED",
  "CANCELLED",
];

export const POC_STATUS_LABELS: Record<PoCStatus, string> = {
  PLANNED: "Geplant",
  RUNNING: "Laufend",
  COMPLETED: "Abgeschlossen",
  CANCELLED: "Abgebrochen",
};

// ---------------------------------------------------------------------------
// Ecosystem — startup updates, intro requests & "looking for"
// ---------------------------------------------------------------------------

export const UPDATE_CATEGORIES: UpdateCategory[] = [
  "MILESTONE",
  "FUNDING",
  "PRODUCT",
  "TEAM",
  "PRESS",
  "GENERAL",
];

export const UPDATE_CATEGORY_LABELS: Record<UpdateCategory, string> = {
  MILESTONE: "Meilenstein",
  FUNDING: "Finanzierung",
  PRODUCT: "Produkt",
  TEAM: "Team",
  PRESS: "Presse",
  GENERAL: "Allgemein",
};

export const INTRO_STATUSES: IntroStatus[] = [
  "PENDING",
  "APPROVED",
  "DECLINED",
  "CONNECTED",
];

export const INTRO_STATUS_LABELS: Record<IntroStatus, string> = {
  PENDING: "Ausstehend",
  APPROVED: "Angenommen",
  DECLINED: "Abgelehnt",
  CONNECTED: "Verbunden",
};

/** Options a startup can signal it is looking for (free-form, but suggested). */
export const LOOKING_FOR_OPTIONS = [
  "Funding",
  "Piloten",
  "Talent",
  "Partnerschaften",
  "Beirat",
] as const;

// ---------------------------------------------------------------------------
// Industries (suggestions for forms/filters)
// ---------------------------------------------------------------------------

export const INDUSTRIES = [
  "Künstliche Intelligenz",
  "Climate Tech",
  "Cybersecurity",
  "Energie",
  "FinTech",
  "Health Tech",
  "Industrial IoT",
  "Logistik",
  "Fertigung",
  "Mobilität",
  "Robotik",
  "SaaS",
] as const;

// ---------------------------------------------------------------------------
// Partner verdict (lightweight screening feedback)
// ---------------------------------------------------------------------------

export const PARTNER_VERDICTS: PartnerVerdict[] = [
  "PENDING",
  "CONTINUE",
  "PASS",
];

export const PARTNER_VERDICT_LABELS: Record<PartnerVerdict, string> = {
  PENDING: "Offen",
  CONTINUE: "Weitermachen",
  PASS: "Nicht weiter",
};

// ---------------------------------------------------------------------------
// Sourcing provenance (Inbound vs. Outbound)
// ---------------------------------------------------------------------------

export const SOURCE_TYPES: SourceType[] = ["INBOUND", "OUTBOUND"];

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  INBOUND: "Inbound",
  OUTBOUND: "Outbound",
};

// ---------------------------------------------------------------------------
// Check-in reminders
// ---------------------------------------------------------------------------

export const REMINDER_STATUSES: ReminderStatus[] = [
  "SCHEDULED",
  "SENT",
  "DONE",
  "CANCELLED",
];

export const REMINDER_STATUS_LABELS: Record<ReminderStatus, string> = {
  SCHEDULED: "Geplant",
  SENT: "Versendet",
  DONE: "Erledigt",
  CANCELLED: "Abgebrochen",
};

// ---------------------------------------------------------------------------
// Engagements (accelerator-independent collaboration)
// ---------------------------------------------------------------------------

export const ENGAGEMENT_STATUSES: EngagementStatus[] = [
  "ACTIVE",
  "PAUSED",
  "COMPLETED",
  "CANCELLED",
];

export const ENGAGEMENT_STATUS_LABELS: Record<EngagementStatus, string> = {
  ACTIVE: "Aktiv",
  PAUSED: "Pausiert",
  COMPLETED: "Abgeschlossen",
  CANCELLED: "Abgebrochen",
};

// ---------------------------------------------------------------------------
// SSOT content — roadmap status & audience
// ---------------------------------------------------------------------------

export const ROADMAP_STATUSES: RoadmapStatus[] = [
  "PLANNED",
  "IN_PROGRESS",
  "DONE",
];

export const ROADMAP_STATUS_LABELS: Record<RoadmapStatus, string> = {
  PLANNED: "Geplant",
  IN_PROGRESS: "In Arbeit",
  DONE: "Erledigt",
};

export const CONTENT_AUDIENCES: ContentAudience[] = [
  "PARTNER",
  "STARTUP",
  "BOTH",
];

export const CONTENT_AUDIENCE_LABELS: Record<ContentAudience, string> = {
  PARTNER: "Partner",
  STARTUP: "Startups",
  BOTH: "Alle",
};

// ---------------------------------------------------------------------------
// Venture credits
// ---------------------------------------------------------------------------

export const CREDIT_TX_TYPES: CreditTxType[] = [
  "GRANT",
  "SPEND",
  "ADJUSTMENT",
];

export const CREDIT_TX_TYPE_LABELS: Record<CreditTxType, string> = {
  GRANT: "Gutschrift",
  SPEND: "Verbrauch",
  ADJUSTMENT: "Korrektur",
};

// ---------------------------------------------------------------------------
// Startup-Marktplatz — Angebotstypen, Support-Kategorien, Programm-/Buchungsstatus
// ---------------------------------------------------------------------------

export const MARKETPLACE_OFFERING_TYPES: MarketplaceOfferingType[] = [
  "PROGRAM",
  "MENTOR_SESSION",
  "SUPPORT",
];

export const MARKETPLACE_OFFERING_TYPE_LABELS: Record<
  MarketplaceOfferingType,
  string
> = {
  PROGRAM: "Programm",
  MENTOR_SESSION: "Mentor:innen-Session",
  SUPPORT: "Support-Angebot",
};

export const SUPPORT_CATEGORIES: SupportCategory[] = [
  "FUNDRAISING",
  "LEGAL",
  "MARKETING",
  "PRODUCT_TECH",
  "SALES",
  "OTHER",
];

export const SUPPORT_CATEGORY_LABELS: Record<SupportCategory, string> = {
  FUNDRAISING: "Fundraising",
  LEGAL: "Legal",
  MARKETING: "Marketing",
  PRODUCT_TECH: "Product & Tech",
  SALES: "Sales",
  OTHER: "Sonstiges",
};

export const PROGRAM_STATUSES: ProgramStatus[] = ["DRAFT", "OPEN", "CLOSED"];

export const PROGRAM_STATUS_LABELS: Record<ProgramStatus, string> = {
  DRAFT: "Entwurf",
  OPEN: "Offen",
  CLOSED: "Geschlossen",
};

export const BOOKING_STATUSES: BookingStatus[] = [
  "REQUESTED",
  "IN_COORDINATION",
  "CONFIRMED",
  "COMPLETED",
  "DECLINED",
  "CANCELLED",
];

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  REQUESTED: "Angefragt",
  IN_COORDINATION: "In Koordination",
  CONFIRMED: "Bestätigt",
  COMPLETED: "Abgeschlossen",
  DECLINED: "Abgelehnt",
  CANCELLED: "Storniert",
};
