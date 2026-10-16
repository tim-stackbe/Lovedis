"use client";

import { useEffect } from "react";

let locks = 0;
let restoreOverflow = "";

/**
 * Locks page scroll and returns the matching release. Ref-counted so stacked
 * overlays (e.g. the Match-Matrix panel with the Logbuch drawer on top) can
 * release in any order: React tears a deleted tree down parent-first, so a
 * per-overlay save/restore of `body.style.overflow` would leave the page stuck
 * on "hidden" after navigating away from both.
 */
export function lockBodyScroll(): () => void {
  if (locks === 0) {
    restoreOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  locks++;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    locks--;
    if (locks === 0) document.body.style.overflow = restoreOverflow;
  };
}

/** Locks page scroll while `active` (see `lockBodyScroll`). */
export function useBodyScrollLock(active = true) {
  useEffect(() => (active ? lockBodyScroll() : undefined), [active]);
}
