"use client";

import { Card } from "@/components/ui/Card";
import type { LogEntryView } from "@/lib/logbook";
import { cn } from "@/lib/utils";
import { FollowUpMeta, isOverdue, useFollowUpToggle } from "./LogEntryCard";

/** "Anstehend und überfällig": open next steps, overdue ones highlighted. */
export function LogFollowUps({
  entries,
  now,
}: {
  entries: LogEntryView[];
  now: number;
}) {
  return (
    <Card className="divide-y divide-lv-border">
      {entries.map((e) => (
        <FollowUpRow key={e.id} entry={e} now={now} />
      ))}
    </Card>
  );
}

function FollowUpRow({ entry, now }: { entry: LogEntryView; now: number }) {
  const { pending, toggle } = useFollowUpToggle(entry.id);
  const overdue = isOverdue(entry, now);
  return (
    <div
      className={cn(
        "flex items-start gap-3 px-4 py-3",
        overdue && "bg-lv-orange-soft/40"
      )}
    >
      <input
        type="checkbox"
        checked={false}
        disabled={pending}
        onChange={toggle}
        aria-label="Als erledigt markieren"
        className="mt-0.5 h-4 w-4 shrink-0 accent-lv-blue"
      />
      <div className="min-w-0 flex-1">
        <a
          href={`#eintrag-${entry.id}`}
          className="text-sm font-medium text-lv-text hover:text-lv-blue"
        >
          {entry.nextStep}
        </a>
        <FollowUpMeta entry={entry} overdue={overdue} />
      </div>
    </div>
  );
}
