"use client";

import { ArrowUpRight, CalendarClock, PanelRight, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { loadLogDrawer } from "@/app/actions/logbook";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LOG_ENTRY_TYPE_LABELS, LOG_ENTRY_TYPE_TONES } from "@/lib/constants";
import type { LogDrawerData } from "@/lib/logbook";
import {
  FORMER_MEMBER_NAME,
  formatLogDate,
  formatLogDateTime,
  formatRelative,
} from "@/lib/logbook-format";
import { cn, truncate } from "@/lib/utils";
import { LogQuickAdd } from "./LogQuickAdd";
import type { LogQuickAddContext } from "./types";

/** Button that opens the drawer; usable from server components. */
export function LogDrawerButton({
  startupId,
  quickAdd,
  label = "Schnellansicht",
}: {
  startupId: string;
  quickAdd?: LogQuickAddContext;
  label?: string;
}) {
  return (
    <LogDrawer
      startupId={startupId}
      quickAdd={quickAdd}
      trigger={(open) => (
        <Button type="button" variant="secondary" size="sm" onClick={open}>
          <PanelRight className="h-4 w-4" />
          {label}
        </Button>
      )}
    />
  );
}

interface LogDrawerProps {
  startupId: string;
  /** Context for the drawer's quick add (e.g. the matrix cell it opened from). */
  quickAdd?: LogQuickAddContext;
  /** Renders the element that opens the drawer. */
  trigger: (open: () => void) => React.ReactNode;
}

/**
 * Side panel with the latest Logbuch entries plus quick add. Data is loaded
 * lazily through an ADMIN-guarded server action when the drawer opens, so
 * pages only pay for it on demand. Render only for admin sessions.
 */
export function LogDrawer({ startupId, quickAdd, trigger }: LogDrawerProps) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<LogDrawerData | null>(null);
  const [now, setNow] = useState(0);
  const [failed, setFailed] = useState(false);
  const [loading, startTransition] = useTransition();

  const load = () =>
    startTransition(async () => {
      try {
        const res = await loadLogDrawer(startupId);
        setData(res);
        setNow(Date.now());
        setFailed(res === null);
      } catch {
        setFailed(true);
      }
    });

  const openDrawer = () => {
    setOpen(true);
    load();
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const href = `/startups/${startupId}/logbuch`;

  return (
    <>
      {trigger(openDrawer)}
      {open &&
        createPortal(
          <div className="fixed inset-0 z-[75] flex justify-end">
            <div
              className="absolute inset-0 bg-lv-text/40"
              onClick={() => setOpen(false)}
              aria-hidden
            />
            <aside
              role="dialog"
              aria-modal="true"
              aria-label="Logbuch"
              className="relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-lv-border bg-white shadow-card lv-scroll"
            >
              <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-lv-border bg-white px-5 py-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-lv-blue">
                    Logbuch · nur Admins
                  </p>
                  <h2 className="mt-0.5 text-base font-bold text-lv-text">
                    {data?.startup.name ?? "Lädt …"}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-button p-1.5 text-lv-secondary transition-colors hover:bg-lv-surface"
                  aria-label="Schließen"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-5 px-5 py-4">
                <LogQuickAdd
                  startupId={startupId}
                  {...quickAdd}
                  defaultOpen
                  onCreated={load}
                />

                {failed ? (
                  <p className="text-sm text-lv-orange">
                    Das Logbuch konnte nicht geladen werden.
                  </p>
                ) : !data ? (
                  <p className="text-sm text-lv-secondary">Lädt …</p>
                ) : data.entries.length === 0 ? (
                  <p className="text-sm text-lv-secondary">
                    Noch keine Einträge zu diesem Startup.
                  </p>
                ) : (
                  <ul
                    className={cn(
                      "divide-y divide-lv-border transition-opacity",
                      loading && "opacity-60"
                    )}
                  >
                    {data.entries.map((e) => {
                      const overdue =
                        !!e.followUpAt &&
                        !e.followUpDoneAt &&
                        new Date(e.followUpAt).getTime() < now;
                      return (
                        <li key={e.id} className="space-y-1 py-3">
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <Badge tone={LOG_ENTRY_TYPE_TONES[e.type]}>
                              {LOG_ENTRY_TYPE_LABELS[e.type]}
                            </Badge>
                            <span className="font-semibold text-lv-text">
                              {e.author?.name ?? FORMER_MEMBER_NAME}
                            </span>
                            <time
                              title={formatLogDateTime(e.occurredAt)}
                              className="text-lv-secondary"
                            >
                              {formatRelative(e.occurredAt, now)}
                            </time>
                          </div>
                          <Link
                            href={`${href}#eintrag-${e.id}`}
                            className="block text-sm text-lv-text hover:text-lv-blue"
                          >
                            {e.title && (
                              <span className="font-semibold">{e.title}: </span>
                            )}
                            {truncate(e.body.replace(/\s+/g, " "), 160)}
                          </Link>
                          {e.context && (
                            <p className="text-xs text-lv-blue">{e.context.label}</p>
                          )}
                          {e.nextStep && !e.followUpDoneAt && (
                            <p
                              className={cn(
                                "flex items-center gap-1 text-xs",
                                overdue
                                  ? "font-semibold text-lv-orange"
                                  : "text-lv-secondary"
                              )}
                            >
                              <CalendarClock className="h-3 w-3" />
                              {e.nextStep}
                              {e.followUpAt && ` · ${formatLogDate(e.followUpAt)}`}
                            </p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}

                <Link
                  href={href}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-lv-blue hover:underline"
                >
                  Ganzes Logbuch öffnen
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </aside>
          </div>,
          document.body
        )}
    </>
  );
}
