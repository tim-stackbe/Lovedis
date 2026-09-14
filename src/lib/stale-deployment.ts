/**
 * Detects the client-side errors a browser hits when its JS bundle is older
 * than the running server build.
 *
 * Every deploy produces a fresh `BUILD_ID`, re-derives EVERY Server Action id
 * AND re-hashes the per-route JavaScript chunks (deleting the previous ones).
 * A tab that was loaded before the deploy still holds the previous bundle, so
 * it fails in one of two ways after a deploy:
 *
 *   1. SERVER ACTION SUBMIT (e.g. the `login` form). The tab posts an action id
 *      the server no longer knows; the server answers `404` with
 *      `x-nextjs-action-not-found: 1` and the client throws
 *      `UnrecognizedActionError` (`__NEXT_ERROR_CODE` `E715`,
 *      message "…was not found on the server."). A stale MPA submit instead
 *      throws "Failed to find Server Action…" (`E975`). Soft navigations can
 *      fail with a router state tree the new build cannot parse.
 *
 *   2. SOFT NAVIGATION / LAZY ROUTE. The tab navigates to a route it has not
 *      loaded yet and asks for a hashed chunk (`/_next/static/chunks/….js`)
 *      that the deploy has already deleted. The webpack runtime then throws a
 *      `ChunkLoadError` ("Loading chunk … failed"). Firefox/Safari word the
 *      dynamic-import variant differently ("error loading dynamically imported
 *      module", "Importing a module script failed"). THIS is the case the
 *      previous fix missed: it is not a Server Action error at all, so it was
 *      classified NON-stale and the user saw the generic
 *      "Diese Seite konnte nicht geladen werden" card with no auto-recovery.
 *
 * The error crosses into an error boundary in the browser, so `name` and
 * `message` survive, but `instanceof` does not (the classes are internal to
 * Next/webpack and are minified — the observed `constructor.name` was `"l"`).
 * Match on the stable, explicitly-assigned `name`, on the `__NEXT_ERROR_CODE`,
 * and on the human-readable message/digest text instead.
 */
export function isStaleDeploymentError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const { name, message, digest } = error as {
    name?: unknown;
    message?: unknown;
    digest?: unknown;
  };

  // Stale Server Action id (login and every other form submit after a deploy).
  // `name` is assigned explicitly in the Next constructor, so it survives
  // minification even though the class identity does not.
  if (name === "UnrecognizedActionError") return true;

  // Stale route chunk after a deploy. `ChunkLoadError` is likewise a name the
  // webpack runtime assigns explicitly, so it survives minification.
  if (name === "ChunkLoadError") return true;

  const code = (error as { __NEXT_ERROR_CODE?: unknown }).__NEXT_ERROR_CODE;
  // E715: UnrecognizedActionError. E975: stale MPA Server Action submit.
  if (code === "E715" || code === "E975") return true;

  const text = [message, digest].filter((v) => typeof v === "string").join(" ");
  return (
    // Stale Server Action (fetch + MPA phrasings) / stale soft navigation.
    text.includes("was not found on the server") ||
    text.includes("Failed to find Server Action") ||
    text.includes("router state header was sent but could not be parsed") ||
    // Stale route chunk / dynamic import across engines (webpack, Chrome,
    // Firefox, Safari). A failed chunk/module fetch in a deployed SPA is, in
    // practice, always the current tab referencing assets a newer build has
    // already removed — recover the same way as a stale action.
    /Loading chunk [^\s]+ failed/i.test(text) ||
    text.includes("Loading CSS chunk") ||
    text.includes("Failed to fetch dynamically imported module") ||
    text.includes("error loading dynamically imported module") ||
    text.includes("Importing a module script failed")
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
