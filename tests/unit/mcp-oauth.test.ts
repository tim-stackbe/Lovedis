import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import {
  isAllowedRedirectUri,
  isOwnResource,
  mcpResourceUrl,
  protectedResourceMetadataUrl,
  redirectWithParams,
  signConsent,
  verifyConsent,
  verifyPkceS256,
  type ConsentRequest,
} from "@/lib/mcp/oauth";
import { ToolError, pickByRef, toolsForRole } from "@/lib/mcp/tools";

const ENV = { ...process.env };

beforeEach(() => {
  process.env.NEXTAUTH_URL = "https://alpha.lovedis.de/";
  process.env.NEXTAUTH_SECRET = "test-secret";
  delete process.env.MCP_PUBLIC_URL;
  delete process.env.AUTH_URL;
  delete process.env.AUTH_SECRET;
  delete process.env.MCP_REDIRECT_URIS;
});

afterEach(() => {
  process.env = { ...ENV };
});

describe("PKCE S256", () => {
  const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
  const challenge = createHash("sha256").update(verifier).digest("base64url");

  it("accepts the matching verifier", () => {
    expect(verifyPkceS256(verifier, challenge)).toBe(true);
  });

  it("rejects a different verifier", () => {
    expect(verifyPkceS256(`${verifier}x`, challenge)).toBe(false);
  });

  it("rejects verifiers outside the RFC 7636 alphabet or length", () => {
    expect(verifyPkceS256("short", challenge)).toBe(false);
    expect(verifyPkceS256(`${verifier.slice(0, 42)}!`, challenge)).toBe(false);
  });
});

describe("redirect URI allowlist", () => {
  it("allows the Claude and Cursor callbacks", () => {
    expect(isAllowedRedirectUri("https://claude.ai/api/mcp/auth_callback")).toBe(true);
    expect(isAllowedRedirectUri("https://claude.com/api/mcp/auth_callback")).toBe(true);
    expect(isAllowedRedirectUri("cursor://anysphere.cursor-mcp/oauth/callback")).toBe(true);
    expect(
      isAllowedRedirectUri("https://www.cursor.com/agents/mcp/oauth/callback")
    ).toBe(true);
  });

  it("allows loopback callbacks on any port (native clients)", () => {
    expect(isAllowedRedirectUri("http://localhost:33418/callback")).toBe(true);
    expect(isAllowedRedirectUri("http://127.0.0.1:6274/oauth/callback")).toBe(true);
  });

  it("rejects foreign hosts, lookalikes and fragments", () => {
    expect(isAllowedRedirectUri("https://evil.example/callback")).toBe(false);
    expect(isAllowedRedirectUri("https://claude.ai.evil.example/api/mcp/auth_callback")).toBe(false);
    expect(isAllowedRedirectUri("https://claude.ai/api/mcp/auth_callback/../x")).toBe(false);
    expect(isAllowedRedirectUri("https://localhost/callback")).toBe(false);
    expect(isAllowedRedirectUri("http://localhost:3000/cb#frag")).toBe(false);
    expect(isAllowedRedirectUri("not a url")).toBe(false);
  });

  it("honours MCP_REDIRECT_URIS for extra clients", () => {
    process.env.MCP_REDIRECT_URIS = "https://chatgpt.com/connector_platform_oauth_redirect";
    expect(
      isAllowedRedirectUri("https://chatgpt.com/connector_platform_oauth_redirect")
    ).toBe(true);
  });
});

describe("resource and metadata URLs", () => {
  it("derive from NEXTAUTH_URL without trailing slash", () => {
    expect(mcpResourceUrl()).toBe("https://alpha.lovedis.de/api/mcp");
    expect(protectedResourceMetadataUrl()).toBe(
      "https://alpha.lovedis.de/.well-known/oauth-protected-resource/api/mcp"
    );
  });

  it("MCP_PUBLIC_URL wins", () => {
    process.env.MCP_PUBLIC_URL = "https://app.lovedis.de";
    expect(mcpResourceUrl()).toBe("https://app.lovedis.de/api/mcp");
  });

  it("accepts only this server as resource indicator", () => {
    expect(isOwnResource("https://alpha.lovedis.de/api/mcp")).toBe(true);
    expect(isOwnResource("https://alpha.lovedis.de/api/mcp/")).toBe(true);
    expect(isOwnResource("https://alpha.lovedis.de")).toBe(true);
    expect(isOwnResource("https://other.example/api/mcp")).toBe(false);
  });
});

describe("redirectWithParams", () => {
  it("adds params and skips empty ones", () => {
    const url = redirectWithParams("https://claude.ai/api/mcp/auth_callback", {
      code: "abc",
      state: null,
    });
    expect(url).toBe("https://claude.ai/api/mcp/auth_callback?code=abc");
  });
});

describe("signed consent", () => {
  const base: ConsentRequest = {
    clientId: "lvd_client_x",
    redirectUri: "https://claude.ai/api/mcp/auth_callback",
    codeChallenge: "c".repeat(43),
    state: "s1",
    scope: "lovedis.read",
    resource: "https://alpha.lovedis.de/api/mcp",
    userId: "user1",
    exp: Math.floor(Date.now() / 1000) + 600,
  };

  it("round-trips", () => {
    expect(verifyConsent(signConsent(base))).toEqual(base);
  });

  it("rejects a tampered payload", () => {
    const [, sig] = signConsent(base).split(".");
    const forged = Buffer.from(JSON.stringify({ ...base, userId: "admin" })).toString(
      "base64url"
    );
    expect(verifyConsent(`${forged}.${sig}`)).toBeNull();
  });

  it("rejects an expired request", () => {
    const token = signConsent({ ...base, exp: Math.floor(Date.now() / 1000) - 1 });
    expect(verifyConsent(token)).toBeNull();
  });

  it("rejects a token signed with another secret", () => {
    const token = signConsent(base);
    process.env.NEXTAUTH_SECRET = "other-secret";
    expect(verifyConsent(token)).toBeNull();
  });
});

describe("tool catalogue per role", () => {
  const ADMIN_ONLY = [
    "get_insights_overview",
    "get_batch_kpis",
    "get_partner_insights",
    "get_startup_insights",
    "explain_pilot_status",
    "list_pipeline_tracking",
    "get_logbook",
  ];

  it("hides Insights and Logbuch from MEMBER", () => {
    const names = toolsForRole("MEMBER").map((t) => t.name);
    for (const name of ADMIN_ONLY) expect(names).not.toContain(name);
    expect(names).toContain("search_startups");
    expect(names).toContain("get_match_matrix");
  });

  it("gives ADMIN every tool", () => {
    const names = toolsForRole("ADMIN").map((t) => t.name);
    for (const name of ADMIN_ONLY) expect(names).toContain(name);
  });
});

describe("pickByRef", () => {
  const items = [
    { id: "a1", name: "Credular" },
    { id: "b2", name: "Schneider Electric" },
    { id: "c3", name: "Schneider Bau" },
  ];

  it("matches id, exact name and unique partial name", () => {
    expect(pickByRef(items, "a1", "X").id).toBe("a1");
    expect(pickByRef(items, "credular", "X").id).toBe("a1");
    expect(pickByRef(items, "Electric", "X").id).toBe("b2");
  });

  it("reports ambiguity and misses as ToolError", () => {
    expect(() => pickByRef(items, "Schneider", "Partner")).toThrow(ToolError);
    expect(() => pickByRef(items, "Schneider", "Partner")).toThrow(/mehrdeutig/);
    expect(() => pickByRef(items, "Nope", "Partner")).toThrow(/nicht gefunden/);
  });
});
