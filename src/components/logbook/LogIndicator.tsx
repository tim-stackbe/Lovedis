"use client";

import { BookOpen, CalendarClock } from "lucide-react";
import Link from "next/link";
import type { LogListMeta } from "@/lib/logbook";
import {
  daysSince,
  formatLogDate,
  lastContactText,
} from "@/lib/logbook-format";
import { cn } from "@/lib/utils";
import { LogDrawer } from "./LogDrawer";
import type { LogQuickAddContext } from "./types";

interface LogIndicatorProps {
  startupId: string;
  /** From getLogbookListMeta; undefined/null = no entries yet. */
  meta?: LogListMeta | null;
  /** Server render time (ms), keeps "vor X Tagen" hydration-stable. */
  now: number;
  /** "drawer" opens the side panel, "link" navigates to the full logbook. */
  mode?: "drawer" | "link";
  quickAdd?: LogQuickAddContext;
  className?: string;
}

/**
 * Compact Logbuch badge: entry count, next open follow-up (overdue in orange)
 * and days since the last manual contact. ADMIN only: render it only when the
 * page loaded meta for an admin session.
 */
export function LogIndicator({
  startupId,
  meta,
  now,
  mode = "drawer",
  quickAdd,
  className,
}: LogIndicatorProps) {
  const count = meta?.count ?? 0;
  const last = meta?.lastContactAt ?? null;
  const lastDays = last ? daysSince(last, now) : null;
  const title = [
    `${count} ${count === 1 ? "Logbuch-Eintrag" : "Logbuch-Einträge"}`,
    lastContactText(last, now),
    meta?.openFollowUps
      ? `${meta.openFollowUps} offene Follow-ups${meta.overdue ? " (überfällig)" : ""}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const body = (
    <>
      <span className="inline-flex items-center gap-1">
        <BookOpen className="h-3 w-3" />
        {count}
      </span>
      {meta?.openFollowUps ? (
        <span
          className={cn(
            "inline-flex items-center gap-1",
            meta.overdue && "font-semibold text-lv-orange"
          )}
        >
          <CalendarClock className="h-3 w-3" />
          {meta.nextFollowUpAt ? formatLogDate(meta.nextFollowUpAt) : meta.openFollowUps}
        </span>
      ) : null}
      {lastDays !== null && (
        <span className="text-lv-secondary">
          {lastDays === 0 ? "heute" : `vor ${lastDays} T.`}
        </span>
      )}
    </>
  );

  const classes = cn(
    "inline-flex items-center gap-2 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors",
    meta?.overdue
      ? "border-lv-orange-soft bg-lv-orange-soft/60 text-lv-text hover:bg-lv-orange-soft"
      : count > 0
        ? "border-lv-blue-soft bg-lv-blue-soft/50 text-lv-blue hover:bg-lv-blue-soft"
        : "border-lv-border bg-white text-lv-secondary hover:bg-lv-surface",
    className
  );

  // Keep clicks from reaching drag handles / row click targets underneath.
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  if (mode === "link") {
    return (
      <Link
        href={`/startups/${startupId}/logbuch`}
        title={title}
        aria-label={`Logbuch: ${title}`}
        className={classes}
        onPointerDown={stop}
        onClick={stop}
      >
        {body}
      </Link>
    );
  }

  return (
    <LogDrawer
      startupId={startupId}
      quickAdd={quickAdd}
      trigger={(open) => (
        <button
          type="button"
          title={title}
          aria-label={`Logbuch öffnen: ${title}`}
          className={classes}
          onPointerDown={stop}
          onClick={(e) => {
            e.stopPropagation();
            open();
          }}
        >
          {body}
        </button>
      )}
    />
  );
}
