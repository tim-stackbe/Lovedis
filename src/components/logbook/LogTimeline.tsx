"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Timeline } from "@/components/ui/Timeline";
import type { LogFilters as LogFilterState, TimelineItem } from "@/lib/logbook";
import { monthKey, monthLabel } from "@/lib/logbook-format";
import { LogEntryCard } from "./LogEntryCard";
import { LogFilters } from "./LogFilters";
import { SystemEventRow } from "./SystemEventRow";
import type { LogContext } from "./types";

function searchText(item: TimelineItem): string {
  if (item.kind === "system") return `${item.label} ${item.detail ?? ""}`;
  return [
    item.title,
    item.body,
    item.nextStep,
    item.externalParticipants,
    item.author?.name,
    item.context?.label,
    ...item.comments.map((c) => c.body),
  ]
    .filter(Boolean)
    .join(" ");
}

/** Filter bar plus the chronological timeline, grouped by month. */
export function LogTimeline({
  items,
  filters,
  ctx,
}: {
  items: TimelineItem[];
  filters: LogFilterState;
  ctx: LogContext;
}) {
  const [search, setSearch] = useState("");

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const visible = q
      ? items.filter((i) => searchText(i).toLowerCase().includes(q))
      : items;
    const out: { key: string; label: string; items: TimelineItem[] }[] = [];
    for (const item of visible) {
      const key = monthKey(item.occurredAt);
      const last = out[out.length - 1];
      if (last?.key === key) last.items.push(item);
      else out.push({ key, label: monthLabel(item.occurredAt), items: [item] });
    }
    return out;
  }, [items, search]);

  return (
    <div className="space-y-5">
      <LogFilters
        filters={filters}
        admins={ctx.admins}
        search={search}
        onSearchChange={setSearch}
      />
      {groups.length === 0 ? (
        <Card className="p-6 text-sm text-lv-secondary">
          Keine Einträge für diese Auswahl.
        </Card>
      ) : (
        groups.map((g) => (
          <section key={g.key} className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-lv-secondary">
              {g.label}
            </h3>
            <Card className="p-5 sm:p-6">
              <Timeline>
                {g.items.map((item) =>
                  item.kind === "system" ? (
                    <SystemEventRow key={item.key} event={item} now={ctx.now} />
                  ) : (
                    <LogEntryCard key={item.id} entry={item} ctx={ctx} />
                  )
                )}
              </Timeline>
            </Card>
          </section>
        ))
      )}
    </div>
  );
}
