import { NextResponse } from "next/server";

/**
 * Clears a stale/invalid auth session cookie and sends the user to /login.
 *
 * `requireAuth` redirects here (instead of straight to /login) when a JWT
 * cookie is valid but its user id no longer exists in the DB — e.g. after a
 * re-seed that mints fresh ids. Redirecting to /login alone would loop forever
 * because middleware bounces JWT-bearing requests away from /login. Deleting
 * the cookie first breaks that loop so a normal login can succeed without any
 * manual cookie surgery.
 */
const SESSION_COOKIE_NAMES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
];

/** Public origin for redirects behind a reverse proxy (Docker/Caddy). */
function getPublicOrigin(request: Request): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost.split(",")[0]!.trim()}`;
  }
  const fromEnv = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return new URL(request.url).origin;
}

export function GET(request: Request) {
  const response = NextResponse.redirect(
    new URL("/login", getPublicOrigin(request))
  );

  for (const base of SESSION_COOKIE_NAMES) {
    // Clear the unchunked cookie plus any chunked variants (.0, .1, …).
    response.cookies.delete(base);
    for (let i = 0; i < 5; i++) response.cookies.delete(`${base}.${i}`);
  }

  return response;
}
