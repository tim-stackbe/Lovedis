import type {
  ApplicationStatus,
  ChallengeStatus,
  PipelineStage,
  PoCStatus,
  RadarQuadrant,
  RadarRing,
  Recommendation,
  ScoreDimension,
  StartupStage,
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
