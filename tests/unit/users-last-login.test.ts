import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// The Nutzerverwaltung (/users) list surfaces, for each account, WHEN it last
// logged in. `lastLoginAt` is stamped on every successful credentials sign-in
// (see src/auth.ts). Here we pin the display contract:
//
//   * the column/label "Letzter Login" is present,
//   * a user who has logged in shows their timestamp, formatted the same way
//     as everywhere else (formatDateTime),
//   * a user who never logged in (lastLoginAt = null) shows the app-wide "—"
//     placeholder instead of a crash or an invalid date.
//
// The page is an async server component, so awaiting it renders exactly the
// page body. Only the ADMIN guard and Prisma are mocked.
// ---------------------------------------------------------------------------

vi.mock("@/lib/auth-guards", () => ({
  requireRole: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findMany: vi.fn() },
  },
}));

import { requireRole } from "@/lib/auth-guards";
import UsersPage from "@/app/(main)/users/page";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";

const mockRequireRole = vi.mocked(requireRole);
const mockFindMany = vi.mocked(prisma.user.findMany);

/** The visible copy of an element tree — prop-carried strings included. */
const NON_TEXT_PROPS = new Set(["className", "href", "key"]);

function textOf(node: unknown, out: string[] = []): string[] {
  if (node == null || typeof node === "boolean") return out;
  if (typeof node === "string" || typeof node === "number") {
    out.push(String(node));
    return out;
  }
  if (Array.isArray(node)) {
    for (const child of node) textOf(child, out);
    return out;
  }
  if (typeof node === "object") {
    const props = (node as { props?: Record<string, unknown> }).props;
    if (props) {
      for (const [key, value] of Object.entries(props)) {
        if (!NON_TEXT_PROPS.has(key)) textOf(value, out);
      }
    }
  }
  return out;
}

async function render(): Promise<string> {
  return textOf(await UsersPage()).join("");
}

const LOGGED_IN_AT = new Date("2026-09-12T09:30:00Z");

const USERS = [
  {
    id: "usr_returning",
    name: "Rita Berger",
    email: "rita@example.com",
    company: "Nordwerk AG",
    role: "MEMBER",
    isActive: true,
    approvedAt: new Date("2026-01-01T00:00:00Z"),
    createdAt: new Date("2026-01-01T00:00:00Z"),
    lastLoginAt: LOGGED_IN_AT,
  },
  {
    id: "usr_never",
    name: "Tom Neu",
    email: "tom@example.com",
    company: null,
    role: "STARTUP",
    isActive: true,
    approvedAt: new Date("2026-01-01T00:00:00Z"),
    createdAt: new Date("2026-02-01T00:00:00Z"),
    lastLoginAt: null,
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireRole.mockResolvedValue({
    user: { id: "usr_admin", role: "ADMIN" },
  } as never);
  mockFindMany.mockResolvedValue(USERS as never);
});

describe("Nutzerverwaltung — Letzter Login", () => {
  it("labels the last-login column", async () => {
    const text = await render();
    expect(text).toContain("Letzter Login");
  });

  it("shows a returning user's login stamp, formatted like everywhere else", async () => {
    const text = await render();
    expect(text).toContain(formatDateTime(LOGGED_IN_AT));
  });

  it("shows the app-wide placeholder for a user who never logged in", async () => {
    const text = await render();
    // formatDateTime(null) is the shared em-dash placeholder.
    expect(formatDateTime(null)).toBe("—");
    expect(text).toContain("Tom Neu");
    expect(text).toContain("—");
  });
});
