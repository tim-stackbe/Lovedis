import { randomInt } from "node:crypto";

// Human-typeable alphabets with visually ambiguous characters removed (no
// 0/O, 1/l/I) so a temp password copied from an email is easy to type by hand.
const LOWER = "abcdefghijkmnpqrstuvwxyz";
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const DIGITS = "23456789";
const SYMBOLS = "!@#$%*?";

const ALL = LOWER + UPPER + DIGITS;

/** Picks a cryptographically-random character from `alphabet`. */
function pick(alphabet: string): string {
  return alphabet[randomInt(alphabet.length)];
}

/** Fisher–Yates shuffle using a CSPRNG so category order is not predictable. */
function shuffle(chars: string[]): string[] {
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars;
}

/**
 * Generates a secure, human-typeable temporary password. Guarantees at least
 * one lowercase letter, one uppercase letter, one digit and one symbol, drawn
 * from unambiguous alphabets (no 0/O/1/l/I). Default length is 14. Used to
 * provision invited accounts that must change their password on first login.
 */
export function generateTempPassword(length = 14): string {
  const required = [pick(LOWER), pick(UPPER), pick(DIGITS), pick(SYMBOLS)];
  const rest = Array.from({ length: Math.max(length, 8) - required.length }, () =>
    pick(ALL)
  );
  return shuffle([...required, ...rest]).join("");
}
