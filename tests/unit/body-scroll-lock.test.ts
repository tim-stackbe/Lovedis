import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { lockBodyScroll } from "@/lib/use-body-scroll-lock";

describe("lockBodyScroll", () => {
  beforeEach(() => {
    vi.stubGlobal("document", { body: { style: { overflow: "" } } });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("restores scroll when stacked overlays release parent-first", () => {
    const releasePanel = lockBodyScroll();
    const releaseDrawer = lockBodyScroll();
    expect(document.body.style.overflow).toBe("hidden");

    releasePanel();
    expect(document.body.style.overflow).toBe("hidden");
    releaseDrawer();
    expect(document.body.style.overflow).toBe("");
  });

  it("restores the overflow value that was set before the first lock", () => {
    document.body.style.overflow = "auto";
    const release = lockBodyScroll();
    expect(document.body.style.overflow).toBe("hidden");
    release();
    expect(document.body.style.overflow).toBe("auto");
  });

  it("ignores a second call to the same release", () => {
    const releaseA = lockBodyScroll();
    const releaseB = lockBodyScroll();
    releaseA();
    releaseA();
    expect(document.body.style.overflow).toBe("hidden");
    releaseB();
    expect(document.body.style.overflow).toBe("");
  });
});
