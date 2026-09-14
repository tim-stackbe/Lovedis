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
