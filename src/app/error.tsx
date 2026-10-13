"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  canAutoReloadForStaleDeployment,
  isNewerBuildLive,
  isStaleDeploymentError,
  isTransientServerError,
  markStaleDeploymentReload,
} from "@/lib/stale-deployment";

const CLIENT_VERSION = process.env.NEXT_PUBLIC_APP_VERSION;

const SERVER_WAIT_INTERVAL_MS = 1_000;
const SERVER_WAIT_TIMEOUT_MS = 90_000;

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
  const [newerBuildLive, setNewerBuildLive] = useState(false);
  const isStale = isStaleDeploymentError(error) || newerBuildLive;
  const isTransient = !isStale && isTransientServerError(error);

  // A request that hit the server while it was restarting (deploy) or offline:
  // wait until the app answers again, then reload once. Same loop guard as the
  // stale path, so a server that stays broken ends on the manual card.
  const [waitingForServer, setWaitingForServer] = useState(
    () =>
      isTransient &&
      typeof window !== "undefined" &&
      canAutoReloadForStaleDeployment(window.sessionStorage)
  );

  useEffect(() => {
    if (!waitingForServer) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = Date.now() + SERVER_WAIT_TIMEOUT_MS;
    const poll = async () => {
      try {
        const res = await fetch("/api/health", { cache: "no-store" });
        if (cancelled) return;
        if (res.ok) {
          markStaleDeploymentReload(window.sessionStorage);
          window.location.reload();
          return;
        }
      } catch {
        if (cancelled) return;
      }
      if (Date.now() >= deadline) {
        setWaitingForServer(false);
        return;
      }
      timer = setTimeout(poll, SERVER_WAIT_INTERVAL_MS);
    };
    poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [waitingForServer]);

  // Decide in the RENDER phase whether we will auto-recover, using a READ-ONLY
  // check that never stamps the loop guard. `useState`'s lazy initializer runs
  // once per boundary instance; because the check does not consume the guard, a
  // boundary that renders more than once (webpack throws `ChunkLoadError` twice)
  // — or a fresh instance after a remount — still sees the guard as available
  // and can reload. This is the fix for the tab that got stranded on the manual
  // card with the guard already stamped: stamping now happens ONLY in the effect
  // below, right before the actual reload. Client-only (no sessionStorage in SSR).
  const [autoReloading, setAutoReloading] = useState(
    () =>
      isStale &&
      typeof window !== "undefined" &&
      canAutoReloadForStaleDeployment(window.sessionStorage)
  );

  // Fallback for post-deploy failures whose message we don't recognise: if the
  // server now runs a different build than this tab, it is stale regardless of
  // the error wording.
  useEffect(() => {
    if (isStale || isTransient) return;
    let cancelled = false;
    fetch("/api/health", { cache: "no-store" })
      .then((res) => res.json())
      .then((body: { version?: unknown }) => {
        if (cancelled || !isNewerBuildLive(CLIENT_VERSION, body?.version)) return;
        setNewerBuildLive(true);
        if (canAutoReloadForStaleDeployment(window.sessionStorage)) {
          setAutoReloading(true);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isStale, isTransient]);

  // Guarantees the stamp-and-reload runs at most once per boundary instance.
  const reloadedRef = useRef(false);

  useEffect(() => {
    console.error(error);
  }, [error]);

  useEffect(() => {
    if (!autoReloading || reloadedRef.current) return;
    reloadedRef.current = true;
    // Stamp the loop guard and reload together, in the commit phase, so the
    // one-shot guard is consumed only when a reload truly fires. A stale bundle
    // can only be replaced by a full document request — a fresh load pulls the
    // new build's chunks; reset() would re-run the same stale JS.
    markStaleDeploymentReload(window.sessionStorage);
    window.location.reload();
  }, [autoReloading]);

  // While the one-time hard reload is in flight, show a neutral "updating" state
  // instead of flashing the error card — the user sees a brief refresh, not an error.
  if (autoReloading || waitingForServer) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-lv-surface/60 px-4 py-12">
        <Card className="w-full max-w-md p-8 text-center">
          <p className="lv-wordmark text-xs text-lv-blue">
            {autoReloading ? "Neue Version verfügbar" : "Einen Moment bitte"}
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">
            {autoReloading ? "Wird aktualisiert …" : "Verbindung wird wiederhergestellt …"}
          </h1>
          <p className="mt-3 text-sm text-lv-secondary">
            {autoReloading
              ? "LOVEDIS wurde aktualisiert. Wir laden die aktuelle Version, einen Moment bitte."
              : "LOVEDIS war kurz nicht erreichbar. Die Seite lädt automatisch neu, sobald die Verbindung wieder steht."}
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
          {isStale
            ? "Bitte Seite neu laden"
            : isTransient
              ? "Server gerade nicht erreichbar"
              : "Diese Seite konnte nicht geladen werden"}
        </h1>
        <p className="mt-3 text-sm text-lv-secondary">
          {isStale
            ? "LOVEDIS wurde aktualisiert, während dieser Tab offen war. Lade die Seite neu, um mit der aktuellen Version weiterzuarbeiten. Deine Eingaben im Formular musst du danach erneut machen."
            : isTransient
              ? "LOVEDIS ist gerade nicht erreichbar. Bitte lade die Seite in ein paar Sekunden neu."
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
