import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";
import { ROLE_HOMES } from "@/lib/roles";

const { auth } = NextAuth(authConfig);

const PUBLIC_PATHS = [
  "/login",
  "/auth",
  // Self-service password reset — reachable WITHOUT a session so a locked-out
  // user can request and complete a reset. The reset itself is gated by the
  // single-use token, not by auth.
  "/forgot-password",
  "/reset-password",
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

// Paths reachable while a user still owes a first-login password change: the
// change-password screen itself plus the NextAuth/session endpoints needed to
// submit it or sign out. Everything else bounces to /change-password.
const PASSWORD_CHANGE_EXEMPT = [
  "/change-password",
  "/api/auth",
  "/api/session-clear",
];

function isPasswordChangeExempt(pathname: string): boolean {
  return PASSWORD_CHANGE_EXEMPT.some(
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

  // First-login gate: an admin-provisioned account carrying a temporary
  // password must set its own password before reaching any app surface. This
  // runs BEFORE the "/" → role-home bounce so those users land on
  // /change-password in a single hop.
  if (user.mustChangePassword && !isPasswordChangeExempt(nextUrl.pathname)) {
    return NextResponse.redirect(new URL("/change-password", nextUrl));
  }

  // Authenticated users hitting "/" or the auth pages → role home.
  if (
    nextUrl.pathname === "/" ||
    nextUrl.pathname === "/login" ||
    nextUrl.pathname.startsWith("/auth/")
  ) {
    return NextResponse.redirect(new URL(ROLE_HOMES[user.role], nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|jpg|jpeg|webp|ico)).*)"],
};
