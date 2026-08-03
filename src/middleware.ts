import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";
import { ROLE_HOMES } from "@/lib/roles";

const { auth } = NextAuth(authConfig);

const PUBLIC_PATHS = [
  "/login",
  "/auth",
  // Hidden Odie Easter-egg route — reachable with or without a session.
  "/odie",
  "/api/auth",
  "/api/health",
  "/api/session-clear",
  // Cron endpoints are reached by external schedulers without a session; the
  // route's own Bearer (CRON_SECRET) check governs access.
  "/api/cron",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
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

  // Authenticated users hitting "/" or the auth pages → role home. The invite
  // accept flow is exempt: an already-logged-in user may still open a tokenized
  // invite link to join a company, so it must render for authenticated users.
  if (
    (nextUrl.pathname === "/" ||
      nextUrl.pathname === "/login" ||
      nextUrl.pathname.startsWith("/auth/")) &&
    !nextUrl.pathname.startsWith("/auth/invite/")
  ) {
    return NextResponse.redirect(new URL(ROLE_HOMES[user.role], nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|jpg|jpeg|webp|ico)).*)"],
};
