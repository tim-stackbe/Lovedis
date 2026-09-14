import { describe, expect, it } from "vitest";
import {
  isStaleDeploymentError,
  shouldAutoReloadForStaleDeployment,
  STALE_RELOAD_FLAG,
  STALE_RELOAD_GUARD_MS,
} from "@/lib/stale-deployment";

describe("isStaleDeploymentError — stale client bundle after a deploy", () => {
  // Captured LIVE in the browser on the Hetzner TEST box on 2026-09-14 against
  // the deployed build: submitting the `login` form with a stale action id
  // returned `404` + `x-nextjs-action-not-found: 1` and the client threw this
  // exact object into the root error boundary. Note the object had:
  //   name: "UnrecognizedActionError"  (assigned explicitly; survives minify)
  //   __NEXT_ERROR_CODE: "E715"
  //   message: 'Server Action "602a8f74…" was not found on the server. …'
  //   constructor.name: "l"  (minified — so we must NOT rely on class identity)
  it("matches the REAL production UnrecognizedActionError (E715) shape", () => {
    const error = Object.assign(
      new Error(
        'Server Action "602a8f74addf7a53658359a334a8157c097a48bf77" was not found on the server. \nRead more: https://nextjs.org/docs/messages/failed-to-find-server-action'
      ),
      { __NEXT_ERROR_CODE: "E715" }
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

  it("matches a stale MPA Server Action submit (E975)", () => {
    expect(
      isStaleDeploymentError(
        Object.assign(
          new Error(
            "Failed to find Server Action. This request might be from an older or newer deployment."
          ),
          { __NEXT_ERROR_CODE: "E975" }
        )
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

  // The class of error the previous fix missed: a stale tab that soft-navigates
  // to a route whose hashed JS chunk the new deploy has already deleted. The
  // webpack runtime throws a `ChunkLoadError` — NOT a Server Action error — so
  // it was classified non-stale and the user saw the generic
  // "Diese Seite konnte nicht geladen werden" card instead of self-healing.
  it("matches a webpack ChunkLoadError by name (minify-safe)", () => {
    const error = new Error(
      "Loading chunk 4823 failed.\n(missing: https://app.example/_next/static/chunks/4823-abc123.js)"
    );
    error.name = "ChunkLoadError";
    expect(isStaleDeploymentError(error)).toBe(true);
  });

  it("matches a chunk-load failure by message even if the name is generic", () => {
    // Minified/re-thrown copies can lose the ChunkLoadError name; the message
    // still carries the tell-tale "Loading chunk … failed".
    expect(
      isStaleDeploymentError(new Error("Loading chunk app/dashboard/page failed."))
    ).toBe(true);
  });

  it("matches a failed CSS chunk load", () => {
    const error = new Error("Loading CSS chunk 91 failed.");
    error.name = "ChunkLoadError";
    expect(isStaleDeploymentError(error)).toBe(true);
  });

  it("matches dynamic-import failures across engines", () => {
    for (const message of [
      "Failed to fetch dynamically imported module: https://app.example/_next/static/chunks/x.js",
      "error loading dynamically imported module: https://app.example/_next/static/chunks/x.js",
      "Importing a module script failed.",
    ]) {
      expect(isStaleDeploymentError(new Error(message))).toBe(true);
    }
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

  it("does not match a bare network failure (not a stale-chunk signal)", () => {
    // A generic `TypeError: Failed to fetch` is an ordinary connectivity error,
    // not a missing-chunk error — auto-reloading it could loop offline users.
    const error = new TypeError("Failed to fetch");
    expect(isStaleDeploymentError(error)).toBe(false);
  });

  it("does not match an unrelated error that merely mentions 'chunk'", () => {
    expect(
      isStaleDeploymentError(new Error("Uploaded chunk size exceeds the limit"))
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
