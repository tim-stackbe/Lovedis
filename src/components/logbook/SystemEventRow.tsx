import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { DerivedEvent } from "@/lib/logbook";
import { formatLogDateTime, formatRelative } from "@/lib/logbook-format";

/** Compact, read-only timeline row for a derived system event. */
export function SystemEventRow({ event, now }: { event: DerivedEvent; now: number }) {
  const label = event.detail ? `${event.label} · ${event.detail}` : event.label;
  return (
    <li className="relative">
      <span
        className="absolute -left-[31px] top-1.5 h-2 w-2 rounded-full bg-lv-secondary/60 ring-4 ring-white"
        aria-hidden
      />
      <div className="flex items-baseline gap-2 text-xs text-lv-secondary">
        <time
          dateTime={new Date(event.occurredAt).toISOString()}
          title={formatLogDateTime(event.occurredAt)}
          className="shrink-0 tabular-nums"
        >
          {formatRelative(event.occurredAt, now)}
        </time>
        <span className="min-w-0 flex-1 truncate" title={label}>
          {label}
        </span>
        {event.href && (
          <Link
            href={event.href}
            className="inline-flex shrink-0 items-center gap-0.5 font-semibold text-lv-blue hover:underline"
          >
            Öffnen
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        )}
      </div>
    </li>
  );
}
