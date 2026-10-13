import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/insights/snapshot", () => ({
  takeInsightsSnapshot: vi.fn(async () => ({ takenOn: "2026-10-13", checked: 3, written: 1 })),
}));

import { GET, POST } from "@/app/api/cron/insights-snapshot/route";
import { takeInsightsSnapshot } from "@/lib/insights/snapshot";

function post(authorization?: string) {
  return new Request("http://localhost/api/cron/insights-snapshot", {
    method: "POST",
    headers: authorization ? { authorization } : {},
  });
}

describe("POST /api/cron/insights-snapshot", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    vi.mocked(takeInsightsSnapshot).mockClear();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects a missing or wrong bearer token without running the job", async () => {
    expect((await POST(post())).status).toBe(401);
    expect((await POST(post("Bearer nope"))).status).toBe(401);
    expect(takeInsightsSnapshot).not.toHaveBeenCalled();
  });

  it("runs the snapshot with the right token", async () => {
    const res = await POST(post("Bearer s3cret"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, takenOn: "2026-10-13", checked: 3, written: 1 });
  });

  it("fails closed in production when no secret is configured", async () => {
    vi.stubEnv("CRON_SECRET", "");
    vi.stubEnv("NODE_ENV", "production");
    expect((await POST(post())).status).toBe(401);
  });

  it("refuses GET", () => {
    expect(GET().status).toBe(405);
  });
});
