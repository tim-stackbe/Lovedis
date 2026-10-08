import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ALL_ROLES, PENDING_APPROVAL_PATH, ROLE_HOMES } from "@/lib/roles";

// ---------------------------------------------------------------------------
// Every URL the auth flow can redirect to must resolve to a real page.
//
// Regression: `/dashboard` had only per-role children (`/dashboard/startup`,
// `/dashboard/partner`, …) and no page of its own, so the bare parent segment
// 404'd. Middleware turns any logged-out request into
// `/login?callbackUrl=<path>` and the login action honours that callbackUrl
// verbatim, so a visitor who arrived on `/dashboard` signed in successfully and
// was then dropped on "This page could not be found" — a post-login page-load
// failure with no server error behind it.
//
// These checks are filesystem-based on purpose: a missing route is invisible to
// tsc, eslint and any test that only exercises the redirect *decision*.
// ---------------------------------------------------------------------------

const APP_DIR = path.join(process.cwd(), "src", "app");
const PAGE_EXTENSIONS = ["tsx", "ts", "jsx", "js"];

/**
 * `dir` plus every directory reachable from it without consuming a URL segment,
 * i.e. through route groups like `(main)` / `(auth)`.
 */
function withRouteGroups(dir: string): string[] {
  const dirs = [dir];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (
      entry.isDirectory() &&
      entry.name.startsWith("(") &&
      entry.name.endsWith(")")
    ) {
      dirs.push(...withRouteGroups(path.join(dir, entry.name)));
    }
  }
  return dirs;
}

/**
 * Resolves a pathname the way the app router does — transparently crossing
 * route groups and matching `[param]` / `[...param]` segments — and returns the
 * page file backing it, or null when nothing renders that URL.
 */
function resolvePage(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean);
  let candidates = withRouteGroups(APP_DIR);

  for (const segment of segments) {
    const next: string[] = [];
    for (const dir of candidates) {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const isDynamic = entry.name.startsWith("[");
        if (entry.name === segment || isDynamic) {
          next.push(...withRouteGroups(path.join(dir, entry.name)));
        }
      }
    }
    if (next.length === 0) return null;
    candidates = next;
  }

  for (const dir of candidates) {
    for (const ext of PAGE_EXTENSIONS) {
      const file = path.join(dir, `page.${ext}`);
      if (existsSync(file)) return file;
    }
  }
  return null;
}

describe("resolvePage (test helper sanity)", () => {
  it("finds a page behind a route group", () => {
    expect(resolvePage("/login")).toContain(path.join("(auth)", "login"));
  });

  it("returns null for a URL nothing renders", () => {
    expect(resolvePage("/definitely-not-a-route-xyz")).toBeNull();
  });
});

describe("post-login redirect targets resolve to real pages", () => {
  for (const role of ALL_ROLES) {
    it(`${role}'s role home (${ROLE_HOMES[role]}) renders`, () => {
      expect(resolvePage(ROLE_HOMES[role])).not.toBeNull();
    });
  }

  it("the approval-gate destination renders", () => {
    expect(resolvePage(PENDING_APPROVAL_PATH)).not.toBeNull();
  });

  it("the first-login destination renders", () => {
    expect(resolvePage("/change-password")).not.toBeNull();
  });
});

describe("no role home sits under a dead parent segment", () => {
  // `/dashboard` is reachable as a typed/bookmarked URL and survives login as a
  // callbackUrl, so every ancestor of a role home has to render something too.
  const ancestors = new Set<string>();
  for (const role of ALL_ROLES) {
    const segments = ROLE_HOMES[role].split("/").filter(Boolean);
    for (let i = 1; i < segments.length; i++) {
      ancestors.add(`/${segments.slice(0, i).join("/")}`);
    }
  }

  for (const ancestor of [...ancestors].sort()) {
    it(`${ancestor} renders instead of 404ing`, () => {
      expect(resolvePage(ancestor)).not.toBeNull();
    });
  }

  it("covers /dashboard explicitly", () => {
    expect(ancestors).toContain("/dashboard");
  });
});
