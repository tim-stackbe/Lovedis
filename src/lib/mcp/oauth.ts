import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

// ---------------------------------------------------------------------------
// OAuth 2.1 primitives for the MCP connector (Claude.ai, Claude Desktop,
// Claude Code, Cursor). Authorization server and protected resource are both
// this app; users sign in with their normal Lovedis login and approve the
// client on /oauth/authorize. Pure helpers, no DB access.
// ---------------------------------------------------------------------------

/** The single scope: read-only access to the team data. */
export const MCP_SCOPE = "lovedis.read";

export const ACCESS_TOKEN_TTL_SECONDS = 60 * 60;
export const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;
export const AUTH_CODE_TTL_SECONDS = 5 * 60;
export const CONSENT_TTL_SECONDS = 10 * 60;

/** Public origin, e.g. https://alpha.lovedis.de (no trailing slash). */
export function publicBaseUrl(): string {
  const raw =
    process.env.MCP_PUBLIC_URL ||
    process.env.AUTH_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

/** The protected resource (RFC 8707 resource indicator) = MCP endpoint URL. */
export function mcpResourceUrl(): string {
  return `${publicBaseUrl()}/api/mcp`;
}

export function protectedResourceMetadataUrl(): string {
  return `${publicBaseUrl()}/.well-known/oauth-protected-resource/api/mcp`;
}

/** True when `resource` names this MCP endpoint (or the bare origin). */
export function isOwnResource(resource: string): boolean {
  const normalized = resource.replace(/\/+$/, "");
  return normalized === mcpResourceUrl() || normalized === publicBaseUrl();
}

export function randomToken(prefix: string): string {
  return `${prefix}_${randomBytes(32).toString("base64url")}`;
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

const PKCE_VERIFIER = /^[A-Za-z0-9\-._~]{43,128}$/;
const PKCE_CHALLENGE = /^[A-Za-z0-9\-_]{43}$/;

export function isValidCodeChallenge(challenge: string): boolean {
  return PKCE_CHALLENGE.test(challenge);
}

/** PKCE S256 (RFC 7636): BASE64URL(SHA256(verifier)) === challenge. */
export function verifyPkceS256(verifier: string, challenge: string): boolean {
  if (!PKCE_VERIFIER.test(verifier)) return false;
  const computed = createHash("sha256").update(verifier).digest("base64url");
  return safeEqual(computed, challenge);
}

// --- Redirect URIs ------------------------------------------------------------

const DEFAULT_REDIRECT_URIS = [
  "https://claude.ai/api/mcp/auth_callback",
  "https://claude.com/api/mcp/auth_callback",
  "cursor://anysphere.cursor-mcp/oauth/callback",
];

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * Only known MCP clients may register: the Claude/Cursor callbacks, native
 * apps on a loopback port (RFC 8252: Claude Code, Claude Desktop, MCP
 * Inspector) and whatever MCP_REDIRECT_URIS (comma separated) adds.
 */
export function isAllowedRedirectUri(uri: string): boolean {
  let url: URL;
  try {
    url = new URL(uri);
  } catch {
    return false;
  }
  if (url.hash) return false;
  if (url.protocol === "http:" && LOOPBACK_HOSTS.has(url.hostname)) return true;
  const extra = (process.env.MCP_REDIRECT_URIS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return [...DEFAULT_REDIRECT_URIS, ...extra].includes(uri);
}

/** Display host of a redirect URI for the consent screen. */
export function redirectHost(uri: string): string {
  try {
    const url = new URL(uri);
    return url.host || `${url.protocol}//`;
  } catch {
    return uri;
  }
}

export function redirectWithParams(
  redirectUri: string,
  params: Record<string, string | null | undefined>
): string {
  const url = new URL(redirectUri);
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }
  return url.toString();
}

// --- Signed consent request -----------------------------------------------------

/** What the consent form carries from the authorize page to the decision. */
export interface ConsentRequest {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  state: string | null;
  scope: string;
  resource: string;
  userId: string;
  /** Expiry, unix seconds. */
  exp: number;
}

/** Expiry for a consent request issued now (unix seconds). */
export function consentExpiry(now: number = Date.now()): number {
  return Math.floor(now / 1000) + CONSENT_TTL_SECONDS;
}

function signingSecret(): string {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET/NEXTAUTH_SECRET fehlt");
  return secret;
}

function hmac(payload: string): string {
  return createHmac("sha256", signingSecret())
    .update(`mcp-consent:${payload}`)
    .digest("base64url");
}

export function signConsent(req: ConsentRequest): string {
  const payload = Buffer.from(JSON.stringify(req)).toString("base64url");
  return `${payload}.${hmac(payload)}`;
}

/** The consent request when signature and expiry check out, else null. */
export function verifyConsent(
  token: string,
  now: number = Date.now()
): ConsentRequest | null {
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra !== undefined) return null;
  if (!safeEqual(hmac(payload), signature)) return null;
  try {
    const req = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    ) as ConsentRequest;
    if (typeof req.exp !== "number" || req.exp * 1000 < now) return null;
    return req;
  } catch {
    return null;
  }
}
