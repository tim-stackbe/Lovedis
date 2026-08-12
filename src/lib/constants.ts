import type {
  ApplicationStatus,
  BatchType,
  BookingStatus,
  ChallengeStatus,
  ContentAudience,
  CreditTxType,
  EngagementStatus,
  IntroStatus,
  KnowledgeResourceType,
  MarketplaceOfferingType,
  MatchContactStatus,
  MatchUseCaseType,
  PartnerVerdict,
  PipelineStage,
  RelevanceLevel,
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

// LOVEDIS Challenge Program — 6 challenge-focused criteria (each rated 0–5).
export const SCORE_DIMENSIONS: ScoreDimension[] = [
  "CHALLENGE_FIT",
  "MATURITY_FEASIBILITY",
  "TEAM_EXECUTION",
  "MARKET_SCALABILITY",
  "STRATEGIC_ECOSYSTEM_FIT",
  "TRACTION_REFERENCES",
];

export const DIMENSION_LABELS: Record<ScoreDimension, string> = {
  CHALLENGE_FIT: "Challenge Fit",
  MATURITY_FEASIBILITY: "Reife & Machbarkeit",
  TEAM_EXECUTION: "Team & Umsetzung",
  MARKET_SCALABILITY: "Marktpotenzial & Skalierbarkeit",
  STRATEGIC_ECOSYSTEM_FIT: "Strategischer Ökosystem-Fit",
  TRACTION_REFERENCES: "Traktion & Referenzen",
};

export const DIMENSION_DESCRIPTIONS: Record<ScoreDimension, string> = {
  CHALLENGE_FIT:
    "Wie präzise löst das Startup die konkrete Challenge des Partners und trifft den Kern des Problems?",
  MATURITY_FEASIBILITY:
    "Technologiereife, Pilotreife und wie schnell realistisch ein PoC starten kann",
  TEAM_EXECUTION:
    "Kompetenz, Vollständigkeit, Erfahrung und Umsetzungsstärke des Teams",
  MARKET_SCALABILITY:
    "Marktgröße, Übertragbarkeit über die einzelne Challenge hinaus und Wachstumsperspektive",
  STRATEGIC_ECOSYSTEM_FIT:
    "Passung zu den Verticals (Bau, Health Tech, Industrie) und zu weiteren Hub-Partnern",
  TRACTION_REFERENCES:
    "Bestehende Kunden, Piloten, Umsatz und validierte Use-Cases",
};

/**
 * Default challenge-matrix weights — MUST sum to 1.0 (= 100 %).
 * This is the single source of truth for the weighted-total formula. Runtime
 * validation (assertWeightsSumToOne) and a unit test guard the invariant.
 */
export const CHALLENGE_WEIGHTS: Record<ScoreDimension, number> = {
  CHALLENGE_FIT: 0.3,
  MATURITY_FEASIBILITY: 0.2,
  TEAM_EXECUTION: 0.15,
  MARKET_SCALABILITY: 0.15,
  STRATEGIC_ECOSYSTEM_FIT: 0.1,
  TRACTION_REFERENCES: 0.1,
};

/** Alias kept for existing imports (personal weight overrides, previews). */
export const DEFAULT_WEIGHTS = CHALLENGE_WEIGHTS;

export const MAX_SCORE = 5;

/**
 * Challenge-Fit is a hard minimum gate: a startup scoring below this on
 * CHALLENGE_FIT is flagged "Kein Fit (Gate)" regardless of its weighted total,
 * and its recommendation is overridden to STRONG_NO.
 */
export const CHALLENGE_FIT_GATE_MIN = 3;

/** Status label shown when the Challenge-Fit gate is triggered. */
export const GATE_STATUS_LABEL = "Kein Fit (Gate)";

// ---------------------------------------------------------------------------
// Recommendation
// ---------------------------------------------------------------------------

// 4-band challenge scheme. MAYBE is intentionally unused by the scoring engine
// (kept only for the enum / legacy rows); see src/lib/scoring.ts.
export const RECOMMENDATION_LABELS: Record<Recommendation, string> = {
  STRONG_YES: "Klares Ja",
  YES: "Ja mit Nachfassen",
  MAYBE: "Vielleicht",
  NO: "Eher Nein",
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

// Technology-radar fields aligned to the challenge verticals. CONSTRUCTION,
// HEALTH_TECH and INDUSTRY are the core verticals; AI_DATA and CLIMATE_ENERGY
// are cross-cutting. Placement stays manual (not derived from the score).
export const RADAR_QUADRANTS: RadarQuadrant[] = [
  "AI_DATA",
  "CLIMATE_ENERGY",
  "CONSTRUCTION",
  "HEALTH_TECH",
  "INDUSTRY",
];

export const RADAR_QUADRANT_LABELS: Record<RadarQuadrant, string> = {
  AI_DATA: "KI & Daten",
  CLIMATE_ENERGY: "Klima & Energie",
  CONSTRUCTION: "Bau",
  HEALTH_TECH: "Health Tech",
  INDUSTRY: "Industrie",
};

export const RADAR_RINGS: RadarRing[] = ["ADOPT", "TRIAL", "ASSESS", "HOLD"];

export const RADAR_RING_LABELS: Record<RadarRing, string> = {
  ADOPT: "Adopt",
  TRIAL: "Trial",
  ASSESS: "Assess",
  HOLD: "Hold",
};

/**
 * What each ring means as an internal *recommendation to act* (ThoughtWorks-
 * style tech-radar semantics, adapted to startup adoption). This is the
 * "Definition der Stages" the radar was missing — the ring encodes how far the
 * team recommends going with a startup right now, set MANUALLY and independent
 * of the weighted score. From ADOPT (act now) inward-out to HOLD (wait).
 */
export const RADAR_RING_DESCRIPTIONS: Record<RadarRing, string> = {
  ADOPT:
    "Reif & überzeugend — aktiv für Piloten/Partnerschaften vorantreiben. Höchste Priorität.",
  TRIAL:
    "Vielversprechend — in einem konkreten, abgegrenzten Piloten testen und Erfahrung sammeln.",
  ASSESS:
    "Beobachten — Potenzial vorhanden, aber noch prüfen. Noch kein aktiver Piloten-Einsatz.",
  HOLD: "Zurückhalten — aktuell kein aktives Vorgehen; später neu bewerten.",
};

/** One-line purpose of the radar (internal strategic tool, team-only). */
export const RADAR_PURPOSE =
  "Interne Strategie-Landkarte des Teams: Wo steht jedes gescoutete Startup je Technologiefeld und wie weit empfehlen wir aktuell zu gehen? Manuell klassifiziert, unabhängig vom Score — aktuell team-intern.";

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

export const KNOWLEDGE_RESOURCE_TYPES: KnowledgeResourceType[] = [
  "BOOK",
  "VIDEO",
  "ARTICLE",
  "PODCAST",
  "TOOL",
  "COURSE",
];

export const KNOWLEDGE_RESOURCE_TYPE_LABELS: Record<
  KnowledgeResourceType,
  string
> = {
  BOOK: "Buch",
  VIDEO: "Video",
  ARTICLE: "Artikel",
  PODCAST: "Podcast",
  TOOL: "Tool",
  COURSE: "Kurs",
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

// ---------------------------------------------------------------------------
// Match-Matrix — Relevanz, Use-Case-Typen & Kontakt-Status
// ---------------------------------------------------------------------------

export const BATCH_TYPES: BatchType[] = [
  "ACCELERATOR",
  "INDUSTRIEPROGRAMM",
  "SONSTIGES",
];

export const BATCH_TYPE_LABELS: Record<BatchType, string> = {
  ACCELERATOR: "Accelerator",
  INDUSTRIEPROGRAMM: "Industrieprogramm",
  SONSTIGES: "Sonstiges Programm",
};

export const RELEVANCE_LEVELS: RelevanceLevel[] = ["HIGH", "MEDIUM", "LOW"];

export const RELEVANCE_LABELS: Record<RelevanceLevel, string> = {
  HIGH: "Hoch",
  MEDIUM: "Mittel",
  LOW: "Niedrig",
};

export const MATCH_USE_CASE_TYPES: MatchUseCaseType[] = [
  "PILOT",
  "CO_DEVELOPMENT",
  "CUSTOMER_RELATION",
  "WHITE_LABEL",
  "TECH_LICENSE",
  "SPARRING",
];

// Kurzlabels — bewusst kompakt, passend zu den Use-Case-Chips der Matrix.
export const MATCH_USE_CASE_LABELS: Record<MatchUseCaseType, string> = {
  PILOT: "Pilot",
  CO_DEVELOPMENT: "Co-Dev",
  CUSTOMER_RELATION: "Kundenbez.",
  WHITE_LABEL: "White-label",
  TECH_LICENSE: "Tech-Lizenz",
  SPARRING: "Sparring",
};

export const MATCH_CONTACT_STATUSES: MatchContactStatus[] = [
  "NONE",
  "IN_CONTACT",
  "FOLLOW_UP",
  "PILOT_AGREED",
];

export const MATCH_CONTACT_STATUS_LABELS: Record<MatchContactStatus, string> = {
  NONE: "Offen",
  IN_CONTACT: "In Kontakt",
  FOLLOW_UP: "Folgetermin",
  PILOT_AGREED: "Pilot vereinbart",
};
