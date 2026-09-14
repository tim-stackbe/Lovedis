import { describe, expect, it } from "vitest";
import {
  isStaleDeploymentError,
  shouldAutoReloadForStaleDeployment,
  STALE_RELOAD_FLAG,
  STALE_RELOAD_GUARD_MS,
} from "@/lib/stale-deployment";

describe("isStaleDeploymentError — stale client bundle after a deploy", () => {
  // Proven on the Hetzner TEST box on 2026-09-14: the `login` Server Action id
  // was 604b46e2…403 in the 12:33 build and 6089cc90…ab0 in the 13:19 build.
  // Posting the older id returned `404` + `x-nextjs-action-not-found: 1`, and
  // the platform log showed `Failed to find Server Action "600e3bd0…"` at
  // 13:09:59 CEST — an id from a build that had already been replaced.
  it("matches the error Next.js throws for an unknown Server Action", () => {
    const error = new Error(
      'Server Action "600e3bd0b063c60b37916c2f4ead466e8668add61d" was not found on the server.'
    );
    error.name = "UnrecognizedActionError";
    expect(isStaleDeploymentError(error)).toBe(true);
  });

  it("matches on the error code alone, without the name", () => {
    expect(
      isStaleDeploymentError(
        Object.assign(new Error("boom"), { __NEXT_ERROR_CODE: "E715" })
      )
    ).toBe(true);
  });

  it("matches on the message alone, without name or code", () => {
    expect(
      isStaleDeploymentError(
        new Error('Failed to find Server Action "600e3bd0b063c60b3791".')
      )
    ).toBe(true);
  });

  it("matches the failed soft navigation of a stale tab", () => {
    expect(
      isStaleDeploymentError(
        new Error("The router state header was sent but could not be parsed.")
      )
    ).toBe(true);
  });

  it("reads a digest-only server error", () => {
    expect(
      isStaleDeploymentError(
        Object.assign(new Error("An error occurred in the Server Components render."), {
          digest: "Failed to find Server Action",
        })
      )
    ).toBe(true);
  });
});

describe("isStaleDeploymentError — everything else stays a real error", () => {
  it("does not match an ordinary application error", () => {
    expect(isStaleDeploymentError(new Error("Cannot read properties of null"))).toBe(
      false
    );
  });

  it("does not match a Prisma failure", () => {
    expect(
      isStaleDeploymentError(
        new Error("Invalid `prisma.challenge.findMany()` invocation")
      )
    ).toBe(false);
  });

  it("does not match a digest-only server error with an unrelated digest", () => {
    expect(
      isStaleDeploymentError(
        Object.assign(new Error("Connection closed."), { digest: "1720008400" })
      )
    ).toBe(false);
  });

  it("tolerates non-objects", () => {
    for (const value of [null, undefined, "boom", 42]) {
      expect(isStaleDeploymentError(value)).toBe(false);
    }
  });
});

/** Minimal in-memory Storage stand-in for the guard logic. */
function memoryStorage(
  overrides: Partial<Pick<Storage, "getItem" | "setItem">> = {}
): Pick<Storage, "getItem" | "setItem"> {
  const map = new Map<string, string>();
  return {
    getItem: overrides.getItem ?? ((k) => map.get(k) ?? null),
    setItem: overrides.setItem ?? ((k, v) => void map.set(k, String(v))),
  };
}

describe("shouldAutoReloadForStaleDeployment — invisible one-time recovery", () => {
  it("reloads the first time and stamps the flag", () => {
    const store = memoryStorage();
    expect(shouldAutoReloadForStaleDeployment(store, 1_000)).toBe(true);
    expect(store.getItem(STALE_RELOAD_FLAG)).toBe("1000");
  });

  it("does NOT reload again within the guard window (loop guard)", () => {
    const store = memoryStorage();
    expect(shouldAutoReloadForStaleDeployment(store, 1_000)).toBe(true);
    // Same error fires again almost immediately (would-be loop) → declined.
    expect(
      shouldAutoReloadForStaleDeployment(store, 1_000 + STALE_RELOAD_GUARD_MS - 1)
    ).toBe(false);
  });

  it("reloads again once the guard window has elapsed (a later deploy)", () => {
    const store = memoryStorage();
    expect(shouldAutoReloadForStaleDeployment(store, 1_000)).toBe(true);
    expect(
      shouldAutoReloadForStaleDeployment(store, 1_000 + STALE_RELOAD_GUARD_MS)
    ).toBe(true);
  });

  it("treats a malformed flag as 'never reloaded'", () => {
    const store = memoryStorage();
    store.setItem(STALE_RELOAD_FLAG, "not-a-number");
    expect(shouldAutoReloadForStaleDeployment(store, 5_000)).toBe(true);
  });

  it("treats a flag stamped in the future as stale and reloads", () => {
    // Clock skew / restored session: a future timestamp must not wedge recovery.
    const store = memoryStorage();
    store.setItem(STALE_RELOAD_FLAG, String(10_000));
    expect(shouldAutoReloadForStaleDeployment(store, 1_000)).toBe(true);
  });

  it("declines the reload if the flag cannot be persisted (no loop guard possible)", () => {
    const store = memoryStorage({
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceeded / storage disabled");
      },
    });
    expect(shouldAutoReloadForStaleDeployment(store, 1_000)).toBe(false);
  });

  it("recovers once when reads throw but writes succeed", () => {
    const map = new Map<string, string>();
    const store = memoryStorage({
      getItem: () => {
        throw new Error("SecurityError: storage blocked");
      },
      setItem: (k, v) => void map.set(k, String(v)),
    });
    expect(shouldAutoReloadForStaleDeployment(store, 1_000)).toBe(true);
    expect(map.get(STALE_RELOAD_FLAG)).toBe("1000");
  });
});
