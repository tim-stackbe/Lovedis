/** OAuth error response (RFC 6749 5.2), never cached. */
export function oauthError(
  error: string,
  description: string,
  status = 400,
  headers: Record<string, string> = {}
): Response {
  return Response.json(
    { error, error_description: description },
    { status, headers: { "Cache-Control": "no-store", ...headers } }
  );
}

export function noStoreJson(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", Pragma: "no-cache" },
  });
}

/** CORS for browser-based MCP clients (MCP Inspector); tokens are bearer only. */
export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Authorization, Content-Type, Mcp-Protocol-Version, Mcp-Session-Id, Last-Event-ID",
  "Access-Control-Expose-Headers": "WWW-Authenticate, Mcp-Session-Id",
};

export function withCors(res: Response): Response {
  const headers = new Headers(res.headers);
  for (const [key, value] of Object.entries(CORS_HEADERS)) headers.set(key, value);
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });
}

export function corsPreflight(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/** Form-encoded (spec) or JSON body as a flat string map. */
export async function readParams(req: Request): Promise<Record<string, string>> {
  const type = req.headers.get("content-type") ?? "";
  const out: Record<string, string> = {};
  if (type.includes("application/json")) {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    for (const [key, value] of Object.entries(body ?? {})) {
      if (typeof value === "string") out[key] = value;
    }
    return out;
  }
  const form = new URLSearchParams(await req.text());
  for (const [key, value] of form) out[key] = value;
  return out;
}

/** Client credentials from HTTP Basic (client_secret_basic) or the body. */
export function clientCredentials(
  req: Request,
  params: Record<string, string>
): { clientId: string | null; clientSecret: string | null } {
  const header = req.headers.get("authorization") ?? "";
  const basic = /^Basic\s+(.+)$/i.exec(header);
  if (basic) {
    const decoded = Buffer.from(basic[1], "base64").toString("utf8");
    const idx = decoded.indexOf(":");
    if (idx > 0) {
      return {
        clientId: decodeURIComponent(decoded.slice(0, idx)),
        clientSecret: decodeURIComponent(decoded.slice(idx + 1)),
      };
    }
  }
  return {
    clientId: params.client_id ?? null,
    clientSecret: params.client_secret ?? null,
  };
}

const WINDOW_MS = 60_000;
const hits = new Map<string, number[]>();

/** Small in-memory sliding window per key (single container deployment). */
export function rateLimited(key: string, max: number, now = Date.now()): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > max;
}

export function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}
