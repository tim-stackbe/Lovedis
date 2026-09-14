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

/** Throwaway key used to probe storage writability without touching the guard. */
const STALE_RELOAD_PROBE = `${STALE_RELOAD_FLAG}:probe`;

/**
 * READ-ONLY check: may this tab auto-reload right now? Safe to call during
 * render (including the multiple re-renders a doubled `ChunkLoadError` triggers)
 * because it NEVER stamps the guard — it only reads it and probes, via a
 * throwaway key, whether the guard could later be persisted. Stamping is
 * deferred to {@link markStaleDeploymentReload}, called from the reload effect.
 *
 * This split is what makes recovery robust: if the decision to reload were made
 * with a check-and-stamp in the render phase, a boundary render that never
 * commits its reload (webpack throws `ChunkLoadError` twice, so the boundary can
 * render more than once) would "spend" the one-shot guard, and the next
 * render/instance would then see the flag, decline, and strand the user on the
 * manual card even though NO reload ever fired. Reading here and stamping in the
 * effect guarantees the guard is consumed only when a reload actually happens.
 *
 * Returns true only when (a) we are outside the {@link STALE_RELOAD_GUARD_MS}
 * loop-guard window AND (b) storage is writable (otherwise we could not guard a
 * loop, so we decline and let the manual card handle it).
 */
export function canAutoReloadForStaleDeployment(
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem">,
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

  // Confirm we can PERSIST the loop guard before promising a reload; without a
  // durable guard a re-throw would loop. Probe a throwaway key so this read-only
  // check never consumes the one-shot guard itself.
  try {
    storage.setItem(STALE_RELOAD_PROBE, "1");
    storage.removeItem(STALE_RELOAD_PROBE);
  } catch {
    return false;
  }
  return true;
}

/**
 * Stamps the loop-guard flag with `now`, recording that this tab is about to
 * auto-reload. Call this in the COMMIT phase, immediately before
 * `window.location.reload()`, so the one-shot guard is consumed only when a
 * reload truly happens. Returns false if the flag could not be persisted.
 */
export function markStaleDeploymentReload(
  storage: Pick<Storage, "setItem">,
  now: number = Date.now()
): boolean {
  try {
    storage.setItem(STALE_RELOAD_FLAG, String(now));
    return true;
  } catch {
    return false;
  }
}

/**
 * Decides whether a stale-deployment error should trigger a one-time automatic
 * hard reload, checking the loop guard AND stamping it in one call. Pure and
 * storage-injected so it is unit-testable without a DOM.
 *
 * Returns true AT MOST once per {@link STALE_RELOAD_GUARD_MS} window: the first
 * call stamps the flag and returns true (reload now); any call within the guard
 * window returns false (we already reloaded — show the manual fallback instead
 * of looping). A malformed/absent flag is treated as "never reloaded".
 *
 * `error.tsx` no longer uses this combined form directly — it reads with
 * {@link canAutoReloadForStaleDeployment} during render and stamps with
 * {@link markStaleDeploymentReload} in the reload effect so the guard is never
 * consumed by a render that fails to reload. This function is retained as the
 * single-call equivalent for callers/tests that want an atomic decision.
 */
export function shouldAutoReloadForStaleDeployment(
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem">,
  now: number = Date.now()
): boolean {
  if (!canAutoReloadForStaleDeployment(storage, now)) return false;
  return markStaleDeploymentReload(storage, now);
}
