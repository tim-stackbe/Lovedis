import type { PipelineStage, StartupStage } from "@/generated/prisma/enums";

// ---------------------------------------------------------------------------
// Rules-based startup ↔ challenge matching
//
// Deterministic, explainable scoring over fields we already store — NO
// external AI/LLM dependency. Every point a suggestion earns is tied to a
// human-readable German reason so the team can trust the triage queue.
// ---------------------------------------------------------------------------

export interface ChallengeForMatch {
  id: string;
  title: string;
  description: string;
  tags: string[];
}

export interface StartupForMatch {
  id: string;
  name: string;
  industry: string;
  description: string;
  tagline: string | null;
  publicPitch: string | null;
  lookingFor: string[];
  stage: StartupStage;
  pipelineStage: PipelineStage;
}

export interface MatchResult {
  /** 0–100, higher is a better fit. */
  score: number;
  /** Ordered, human-readable German justifications. */
  reasons: string[];
}

/** Minimum score for a startup to appear in the triage queue. */
export const MATCH_THRESHOLD = 18;

/** Max suggestions surfaced per challenge. */
export const MAX_SUGGESTIONS = 5;

/** Signals a startup is open to industrial pilots / partnerships. */
const PILOT_SIGNALS = ["piloten", "pilot", "partnerschaften", "partner"];

const STOPWORDS = new Set([
  "und", "für", "der", "die", "das", "den", "dem", "ein", "eine", "einer",
  "eines", "einem", "mit", "auf", "aus", "von", "im", "in", "zu", "zur",
  "zum", "wir", "unser", "unsere", "unseren", "sich", "oder", "auch", "bei",
  "über", "gegen", "ohne", "als", "ist", "sind", "wird", "werden", "sowie",
  "durch", "pro", "per", "the", "and", "for", "our", "with", "dass", "wie",
  "noch", "schon", "mehr", "sehr", "kann", "können", "etc", "z.b",
  // number words & generic fillers that produce noisy "shared keyword" hits
  "ein", "zwei", "drei", "vier", "fünf", "sechs", "bestehende", "bestehenden",
  "bestehender", "bestehendes", "neue", "neuen", "neuer", "jährlich", "bereits",
  "sowohl", "diese", "dieser", "dieses", "ihre", "ihren", "ihrer",
]);

/**
 * A single tag word counts as a hit if it is a whole token in the startup
 * profile, or — only for longer stems (≥5 chars, e.g. "industrie",
 * "predictive") — appears as a substring to absorb German compounds /
 * inflections. Short words (e.g. "iot", "ki") require an exact token match so
 * we never match "iot" inside "Physiotherapie".
 */
function wordHit(word: string, text: string, tokens: Set<string>): boolean {
  if (tokens.has(word)) return true;
  return word.length >= 5 && text.includes(word);
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9äöüß\s-]/g, " ");
}

function tokenize(text: string): Set<string> {
  return new Set(
    normalize(text)
      .split(/[\s-]+/)
      .filter((t) => t.length >= 3 && !STOPWORDS.has(t))
  );
}

function startupCorpus(s: StartupForMatch): string {
  return [
    s.name,
    s.industry,
    s.tagline ?? "",
    s.publicPitch ?? "",
    s.description,
    s.lookingFor.join(" "),
  ].join(" ");
}

/** True if a (possibly multi-word) tag matches the startup profile. */
function tagMatches(
  tag: string,
  startupText: string,
  startupTokens: Set<string>
): boolean {
  const t = normalize(tag).trim();
  if (!t) return false;
  const words = t.split(/\s+/).filter((w) => w.length >= 3 && !STOPWORDS.has(w));
  if (words.length === 0) return false;
  // Multi-word tag: accept the full phrase, or every significant word present.
  if (words.length > 1) {
    if (startupText.includes(t)) return true;
    return words.every((w) => wordHit(w, startupText, startupTokens));
  }
  return wordHit(words[0], startupText, startupTokens);
}

/**
 * Scores how well a scouted startup fits an open challenge and produces the
 * "warum das passt" reasons. Returns score 0 when there is no meaningful
 * signal at all.
 */
export function scoreStartupForChallenge(
  challenge: ChallengeForMatch,
  startup: StartupForMatch
): MatchResult {
  const reasons: string[] = [];
  let score = 0;

  const startupTextRaw = normalize(startupCorpus(startup));
  const startupTokens = tokenize(startupCorpus(startup));
  const challengeTokens = tokenize(`${challenge.title} ${challenge.description}`);

  // 1) Tag alignment — the strongest, most explicit signal.
  const matchedTags = challenge.tags.filter((tag) =>
    tagMatches(tag, startupTextRaw, startupTokens)
  );
  if (matchedTags.length > 0) {
    score += Math.min(matchedTags.length * 20, 48);
    reasons.push(
      matchedTags.length === 1
        ? `Passt zum Challenge-Tag „${matchedTags[0]}“`
        : `Trifft ${matchedTags.length} Challenge-Tags: ${matchedTags
            .map((t) => `„${t}“`)
            .join(", ")}`
    );
  }

  // 2) Industry overlap with the challenge wording.
  const industryTokens = tokenize(startup.industry);
  const industryHit =
    [...industryTokens].some((t) => challengeTokens.has(t)) ||
    challenge.tags.some((tag) => tagMatches(tag, normalize(startup.industry), industryTokens));
  if (industryHit) {
    score += 16;
    reasons.push(`Branche „${startup.industry}“ deckt sich mit der Challenge`);
  }

  // 3) Free-text keyword overlap between challenge and startup profile.
  //    Require meatier tokens (≥5 chars) so the reason stays meaningful.
  const shared = [...challengeTokens].filter(
    (t) => t.length >= 5 && startupTokens.has(t)
  );
  if (shared.length > 0) {
    score += Math.min(shared.length, 5) * 6;
    reasons.push(
      `Gemeinsame Begriffe: ${shared.slice(0, 4).join(", ")}`
    );
  }

  // 4) Explicit appetite for pilots / partnerships.
  const looking = startup.lookingFor.map((l) => l.toLowerCase());
  if (looking.some((l) => PILOT_SIGNALS.some((p) => l.includes(p)))) {
    score += 12;
    reasons.push("Sucht aktiv nach Piloten / Partnerschaften");
  }

  // 5) Pipeline posture — favour scouted, available startups; de-prioritise
  //    those already partnered or passed elsewhere.
  if (startup.pipelineStage === "DISCOVERED" || startup.pipelineStage === "SCREENING") {
    score += 8;
    reasons.push("Frisch gescoutet — noch nicht verplant");
  } else if (startup.pipelineStage === "PARTNERED" || startup.pipelineStage === "PASSED") {
    score -= 12;
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  return { score, reasons };
}

export interface ScoredStartup extends MatchResult {
  startup: StartupForMatch;
}

/**
 * Ranks candidate startups for a challenge, excluding ids already routed
 * (applied/invited) or dismissed, and returns the top matches above threshold.
 */
export function rankStartupsForChallenge(
  challenge: ChallengeForMatch,
  candidates: StartupForMatch[],
  excludeStartupIds: Set<string>
): ScoredStartup[] {
  return candidates
    .filter((s) => !excludeStartupIds.has(s.id))
    .map((s) => ({ startup: s, ...scoreStartupForChallenge(challenge, s) }))
    .filter((m) => m.score >= MATCH_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_SUGGESTIONS);
}
