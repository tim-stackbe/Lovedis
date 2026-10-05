"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Input, Select } from "@/components/ui/Field";
import type { LogEntryType } from "@/generated/prisma/enums";
import {
  LOG_ENTRY_MANUAL_TYPES,
  LOG_ENTRY_TYPE_LABELS,
} from "@/lib/constants";
import type { LogFilters as LogFilterState, LogUser } from "@/lib/logbook";
import { cn } from "@/lib/utils";

const FILTER_TYPES: LogEntryType[] = [...LOG_ENTRY_MANUAL_TYPES, "SYSTEM"];

const SOURCES = [
  { value: "all", label: "Alle" },
  { value: "manual", label: "Manuell" },
  { value: "system", label: "System" },
] as const;

/**
 * Type / source / author filters live in the URL (applied server-side); the
 * free-text search is purely client-side and owned by the parent.
 */
export function LogFilters({
  filters,
  admins,
  search,
  onSearchChange,
}: {
  filters: LogFilterState;
  admins: LogUser[];
  search: string;
  onSearchChange: (value: string) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const update = (mutate: (p: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  };

  const toggleType = (t: LogEntryType) =>
    update((p) => {
      const next = filters.types.includes(t)
        ? filters.types.filter((x) => x !== t)
        : [...filters.types, t];
      p.delete("type");
      for (const x of next) p.append("type", x);
    });

  return (
    <div
      className={cn("space-y-3 transition-opacity", pending && "opacity-60")}
      aria-busy={pending}
    >
      <div className="flex flex-wrap items-center gap-2">
        {FILTER_TYPES.map((t) => {
          const active = filters.types.includes(t);
          return (
            <button
              key={t}
              type="button"
              aria-pressed={active}
              onClick={() => toggleType(t)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                active
                  ? "border-lv-blue bg-lv-blue text-white"
                  : "border-lv-border text-lv-secondary hover:bg-lv-surface"
              )}
            >
              {LOG_ENTRY_TYPE_LABELS[t]}
            </button>
          );
        })}
      </div>
      <div className="grid gap-2 sm:grid-cols-[auto_200px_1fr]">
        <div
          className="inline-flex rounded-button border border-lv-border p-0.5"
          role="group"
          aria-label="Quelle"
        >
          {SOURCES.map((s) => (
            <button
              key={s.value}
              type="button"
              aria-pressed={filters.source === s.value}
              onClick={() =>
                update((p) =>
                  s.value === "all" ? p.delete("source") : p.set("source", s.value)
                )
              }
              className={cn(
                "rounded-button px-3 py-1.5 text-xs font-semibold transition-colors",
                filters.source === s.value
                  ? "bg-lv-blue-soft text-lv-blue"
                  : "text-lv-secondary hover:text-lv-text"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
        <Select
          aria-label="Autor:in"
          value={filters.authorId ?? ""}
          onChange={(e) =>
            update((p) =>
              e.target.value ? p.set("author", e.target.value) : p.delete("author")
            )
          }
        >
          <option value="">Alle Personen</option>
          {admins.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-lv-secondary" />
          <Input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Im Logbuch suchen …"
            aria-label="Im Logbuch suchen"
            className="pl-9"
          />
        </div>
      </div>
    </div>
  );
}
