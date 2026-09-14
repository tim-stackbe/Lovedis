"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  isStaleDeploymentError,
  shouldAutoReloadForStaleDeployment,
} from "@/lib/stale-deployment";

/**
 * Root error boundary. Without one, any client-side exception unmounts the whole
 * tree and Next.js falls back to its bare "Application error" screen with no way
 * forward — which is what a stale tab hit after every deploy.
 *
 * Every deploy re-derives the Server Action ids, so a tab still running the
 * previous JS bundle posts an id the new server 404s (`x-nextjs-action-not-found`).
 * Because `login` is itself a Server Action, this surfaces as a "login error" for
 * EVERY user of any role after a deploy. We recover INVISIBLY: on a stale-bundle
 * error we auto-trigger a single hard reload (guarded against reload loops), so
 * the tab picks up the fresh bundle without the user ever seeing an error screen.
 * The manual card below is only the fallback if the automatic reload is declined
 * (loop guard tripped or storage unavailable) or the error isn't stale at all.
 */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isStale = isStaleDeploymentError(error);

  // Decide ONCE, at first render, whether to auto-recover from a stale bundle.
  // A lazy initializer runs exactly once per boundary instance, so it stamps the
  // loop-guard flag a single time and keeps the reload decision out of an effect
  // (no setState-in-effect). Client-only: sessionStorage is absent during SSR.
  const [autoReloading] = useState(
    () =>
      isStale &&
      typeof window !== "undefined" &&
      shouldAutoReloadForStaleDeployment(window.sessionStorage)
  );

  useEffect(() => {
    console.error(error);
  }, [error]);

  useEffect(() => {
    // A stale bundle can only be replaced by a full document request — a fresh
    // load pulls the new build's chunks; reset() would re-run the same stale JS.
    if (autoReloading) window.location.reload();
  }, [autoReloading]);

  // While the one-time hard reload is in flight, show a neutral "updating" state
  // instead of flashing the error card — the user sees a brief refresh, not an error.
  if (autoReloading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-lv-surface/60 px-4 py-12">
        <Card className="w-full max-w-md p-8 text-center">
          <p className="lv-wordmark text-xs text-lv-blue">Neue Version verfügbar</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">
            Wird aktualisiert …
          </h1>
          <p className="mt-3 text-sm text-lv-secondary">
            LOVEDIS wurde aktualisiert. Wir laden die aktuelle Version — einen
            Moment bitte.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-lv-surface/60 px-4 py-12">
      <Card className="w-full max-w-md p-8">
        <p className="lv-wordmark text-xs text-lv-blue">
          {isStale ? "Neue Version verfügbar" : "Etwas ist schiefgelaufen"}
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">
          {isStale ? "Bitte Seite neu laden" : "Diese Seite konnte nicht geladen werden"}
        </h1>
        <p className="mt-3 text-sm text-lv-secondary">
          {isStale
            ? "LOVEDIS wurde aktualisiert, während dieser Tab offen war. Lade die Seite neu, um mit der aktuellen Version weiterzuarbeiten — deine Eingaben im Formular musst du danach erneut machen."
            : "Beim Laden dieser Seite ist ein Fehler aufgetreten. Versuche es erneut oder lade die Seite neu."}
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          {/* A stale bundle can only be replaced by a full document request —
              reset() would re-render the same outdated JS. */}
          <Button onClick={() => window.location.reload()}>
            Seite neu laden
          </Button>
          {!isStale && (
            <Button variant="secondary" onClick={reset}>
              Erneut versuchen
            </Button>
          )}
        </div>

        {error.digest && (
          <p className="mt-6 border-t border-lv-border pt-4 text-xs text-lv-secondary">
            Fehler-Referenz: <code>{error.digest}</code>
          </p>
        )}
      </Card>
    </div>
  );
}
