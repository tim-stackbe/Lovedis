import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";
import { ROLE_HOMES } from "@/lib/roles";

const { auth } = NextAuth(authConfig);

const PUBLIC_PATHS = [
  "/login",
  "/auth",
  "/api/auth",
  "/api/health",
  "/api/session-clear",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

/**
 * Internal Venture-Scout module index pages. Removed from navigation on this
 * branch and locked from direct URL access (redirected to the role home). The
 * underlying code/feature files are intentionally kept as a technical base for
 * Screening & SSOT, so only the listing entry points are locked here.
 *
 * Matched exactly (===) on purpose: detail/sub-routes such as `/startups/[id]`
 * are still linked from kept areas (Longlist, Venture-Credits, Check-ins,
 * command palette) and must stay reachable.
 */
const LOCKED_PATHS = [
  "/startups",
  "/evaluations",
  "/compare",
  "/pipeline",
  "/radar",
  "/reports",
];

function isLockedPath(pathname: string): boolean {
  return LOCKED_PATHS.includes(pathname);
}

export default auth((req) => {
  const { nextUrl } = req;
  const user = req.auth?.user;

  if (!user) {
    if (isPublicPath(nextUrl.pathname)) return NextResponse.next();
    const loginUrl = new URL("/login", nextUrl);
    if (nextUrl.pathname !== "/") {
      loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated users hitting "/" or the auth pages → role home.
  if (
    nextUrl.pathname === "/" ||
    nextUrl.pathname === "/login" ||
    nextUrl.pathname.startsWith("/auth/")
  ) {
    return NextResponse.redirect(new URL(ROLE_HOMES[user.role], nextUrl));
  }

  // Internal scouting index pages are hidden from nav and locked on this branch.
  if (isLockedPath(nextUrl.pathname)) {
    return NextResponse.redirect(new URL(ROLE_HOMES[user.role], nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|jpg|jpeg|webp|ico)).*)"],
};
