"use client";

import { Command } from "cmdk";
import { ArrowRight, Rocket } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { UserRole } from "@/generated/prisma/enums";
import { ROLE_NAV } from "@/lib/roles";

export interface PaletteStartup {
  id: string;
  name: string;
  industry: string;
}

interface CommandPaletteProps {
  role: UserRole;
  startups: PaletteStartup[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({
  role,
  startups,
  open,
  onOpenChange,
}: CommandPaletteProps) {
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  const go = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      <div
        className="absolute inset-0 bg-lv-text/40"
        onClick={() => onOpenChange(false)}
        aria-hidden
      />
      <div className="absolute left-1/2 top-24 w-full max-w-lg -translate-x-1/2 px-4">
        <Command
          label="Befehlspalette"
          className="overflow-hidden rounded-card border border-lv-border bg-white shadow-card"
        >
          <Command.Input
            autoFocus
            placeholder="Seiten und Startups durchsuchen…"
            className="w-full border-b border-lv-border px-4 py-3.5 text-base sm:text-sm outline-none placeholder:text-lv-secondary/60"
          />
          <Command.List className="max-h-80 overflow-y-auto p-2 lv-scroll">
            <Command.Empty className="px-3 py-8 text-center text-sm text-lv-secondary">
              Keine Ergebnisse gefunden.
            </Command.Empty>

            <Command.Group
              heading="Navigation"
              className="text-[10px] uppercase tracking-[0.18em] text-lv-secondary [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5"
            >
              {ROLE_NAV[role]
                .flatMap((s) => s.items)
                .map((item) => (
                  <Command.Item
                    key={item.href}
                    value={`nav ${item.label}`}
                    onSelect={() => go(item.href)}
                    className="flex cursor-pointer items-center gap-3 rounded-button px-3 py-2.5 text-sm text-lv-text data-[selected=true]:bg-lv-blue-soft data-[selected=true]:text-lv-blue"
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    <ArrowRight className="h-3.5 w-3.5 opacity-40" />
                  </Command.Item>
                ))}
            </Command.Group>

            {startups.length > 0 && (
              <Command.Group
                heading="Startups"
                className="text-[10px] uppercase tracking-[0.18em] text-lv-secondary [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5"
              >
                {startups.map((s) => (
                  <Command.Item
                    key={s.id}
                    value={`startup ${s.name} ${s.industry}`}
                    onSelect={() => go(`/startups/${s.id}`)}
                    className="flex cursor-pointer items-center gap-3 rounded-button px-3 py-2.5 text-sm text-lv-text data-[selected=true]:bg-lv-blue-soft data-[selected=true]:text-lv-blue"
                  >
                    <Rocket className="h-4 w-4 shrink-0" />
                    <span className="flex-1">{s.name}</span>
                    <span className="text-xs text-lv-secondary">
                      {s.industry}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
