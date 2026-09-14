/**
 * Detects the client-side errors a browser hits when its JS bundle is older
 * than the running server build.
 *
 * Every deploy produces a fresh `BUILD_ID` and re-derives EVERY Server Action
 * id. A tab that was loaded before the deploy still holds the previous ids, so
 * the next form submit posts an id the server no longer knows. The server
 * answers `404` with `x-nextjs-action-not-found: 1` and the Next.js client
 * router throws `UnrecognizedActionError` (E715). Soft navigations fail the
 * same way, with a router state tree the new build cannot parse.
 *
 * The error crosses into an error boundary in the browser, so `name` and
 * `message` survive, but `instanceof` does not (the class is internal to Next
 * and not part of its public API). Match on the shape instead.
 */
export function isStaleDeploymentError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const { name, message, digest } = error as {
    name?: unknown;
    message?: unknown;
    digest?: unknown;
  };

  if (name === "UnrecognizedActionError") return true;
  if ((error as { __NEXT_ERROR_CODE?: unknown }).__NEXT_ERROR_CODE === "E715") {
    return true;
  }

  const text = [message, digest].filter((v) => typeof v === "string").join(" ");
  return (
    text.includes("was not found on the server") ||
    text.includes("Failed to find Server Action") ||
    text.includes("router state header was sent but could not be parsed")
  );
}

/**
 * sessionStorage key recording WHEN we last auto-reloaded to escape a stale
 * bundle. Scoped to the tab (sessionStorage), so a reload in one tab never
 * suppresses recovery in another.
 */
export const STALE_RELOAD_FLAG = "lv:stale-deploy-reloaded-at";

/**
 * Loop guard window. A single deploy can only make ONE tab stale once, so a
 * correct auto-reload fixes it permanently and this flag is never read again.
 * If, after reloading into the fresh bundle, the SAME tab throws another stale
 * error within this window, something is wrong (e.g. a proxy still serving the
 * old document) — we must NOT reload again or the tab spins in an infinite
 * reload loop. 30s comfortably covers a reload + re-render while still letting a
 * genuinely separate later deploy (minutes apart) auto-recover again.
 */
export const STALE_RELOAD_GUARD_MS = 30_000;

/**
 * Decides whether a stale-deployment error should trigger a one-time automatic
 * hard reload. Pure and storage-injected so it is unit-testable without a DOM.
 *
 * Returns true AT MOST once per {@link STALE_RELOAD_GUARD_MS} window: the first
 * call stamps the flag and returns true (reload now); any call within the guard
 * window returns false (we already reloaded — show the manual fallback instead
 * of looping). A malformed/absent flag is treated as "never reloaded".
 *
 * The caller reloads only on a true return, so users self-heal invisibly after
 * a deploy instead of ever seeing an error screen, and a persistently broken
 * fresh bundle degrades to the manual "reload" UI rather than a reload loop.
 */
export function shouldAutoReloadForStaleDeployment(
  storage: Pick<Storage, "getItem" | "setItem">,
  now: number = Date.now()
): boolean {
  let last = Number.NaN;
  try {
    const raw = storage.getItem(STALE_RELOAD_FLAG);
    if (raw != null) last = Number.parseInt(raw, 10);
  } catch {
    // Storage unreadable (Safari private mode, disabled cookies) — fall back to
    // "never reloaded" so recovery still fires once.
  }

  if (Number.isFinite(last) && now - last >= 0 && now - last < STALE_RELOAD_GUARD_MS) {
    // We already auto-reloaded moments ago and still landed here — stop, or we
    // would loop. Let the caller render the manual recovery UI.
    return false;
  }

  try {
    storage.setItem(STALE_RELOAD_FLAG, String(now));
  } catch {
    // If we cannot persist the flag we cannot guard against a loop, so decline
    // the automatic reload and let the user reload manually instead.
    return false;
  }
  return true;
}
