import { describe, expect, it } from "vitest";
import { isStaleDeploymentError } from "@/lib/stale-deployment";

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
