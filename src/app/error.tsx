"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { isStaleDeploymentError } from "@/lib/stale-deployment";

/**
 * Root error boundary. Without one, any client-side exception unmounts the whole
 * tree and Next.js falls back to its bare "Application error" screen with no way
 * forward — which is what a stale tab hit after every deploy.
 */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const isStale = isStaleDeploymentError(error);

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
