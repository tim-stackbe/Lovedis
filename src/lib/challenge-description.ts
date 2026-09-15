/** Known section titles in industry challenge bodies (plain-text storage). */
const SECTION_HEADINGS = new Set([
  "Zentrale Challenge",
  "Zielbild",
  "Herausforderung der Branche",
  "Gesuchte Expertise",
]);

export function isChallengeSectionHeading(line: string): boolean {
  const trimmed = line.trim();
  return SECTION_HEADINGS.has(trimmed);
}

export type ChallengeDescriptionBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] };

function parseContentLines(lines: string[]): ChallengeDescriptionBlock[] {
  if (lines.length === 0) return [];

  if (lines.every((l) => l.startsWith("- "))) {
    return [{ type: "ul", items: lines.map((l) => l.slice(2).trim()) }];
  }

  if (lines.every((l) => /^\d+\.\s/.test(l))) {
    return [
      {
        type: "ol",
        items: lines.map((l) => l.replace(/^\d+\.\s*/, "").trim()),
      },
    ];
  }

  return [{ type: "paragraph", text: lines.join(" ") }];
}

/** Turn a stored plain-text challenge body into structured render blocks. */
export function parseChallengeDescription(
  description: string
): ChallengeDescriptionBlock[] {
  const blocks: ChallengeDescriptionBlock[] = [];

  for (const raw of description.trim().split(/\n\n+/)) {
    const lines = raw
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) continue;

    if (isChallengeSectionHeading(lines[0])) {
      blocks.push({ type: "heading", text: lines[0] });
      if (lines.length > 1) {
        blocks.push(...parseContentLines(lines.slice(1)));
      }
      continue;
    }

    blocks.push(...parseContentLines(lines));
  }

  return blocks;
}

/** First intro paragraph (before any section heading). */
export function extractChallengeTeaser(
  description: string,
  maxLen = 200
): string {
  const blocks = parseChallengeDescription(description);
  const intro = blocks.find((b) => b.type === "paragraph");
  const text = intro?.text ?? description.trim().split(/\n\n+/)[0] ?? "";
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen - 1).trimEnd()}…`;
}
