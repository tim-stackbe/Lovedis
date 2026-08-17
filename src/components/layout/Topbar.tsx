"use client";

import { useState } from "react";
import { logout } from "@/app/actions/auth";
import { LovedisIcon } from "@/components/icons/lovedis";
import { Badge } from "@/components/ui/Badge";
import { ROLE_LABELS } from "@/lib/roles";
import type { UserRole } from "@/generated/prisma/enums";
import { initials } from "@/lib/utils";

interface TopbarProps {
  userName: string;
  role: UserRole;
  onOpenMenu: () => void;
  onOpenPalette: () => void;
}

export function Topbar({
  userName,
  role,
  onOpenMenu,
  onOpenPalette,
}: TopbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const FAQ_URL =
    "https://app.notion.com/p/startmiup-factory1/Eine-Plattform-f-r-die-Darstellung-unseres-Programm-Portfolios-ist-etabliert-Startups-nutzen-das-V-358e06d44d1b80a28aebf902c547f220";

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-lv-border bg-white px-4 sm:px-6">
      <button
        onClick={onOpenMenu}
        className="rounded-button p-2 hover:bg-lv-surface lg:hidden"
        aria-label="Menü öffnen"
      >
        <LovedisIcon name="menu" className="h-5 w-5" />
      </button>

      <button
        onClick={onOpenPalette}
        className="group flex flex-1 max-w-md items-center gap-2 rounded-button border border-lv-border px-3.5 py-2 text-sm text-lv-secondary transition-colors hover:border-lv-blue-soft hover:bg-lv-surface"
      >
        <LovedisIcon name="search" className="h-4 w-4 text-lv-secondary transition-colors group-hover:text-lv-blue" />
        <span className="flex-1 text-left">Suchen & Navigieren…</span>
        <kbd className="hidden rounded bg-lv-surface px-1.5 py-0.5 text-[10px] font-semibold text-lv-secondary sm:inline">
          ⌘K
        </kbd>
      </button>

      <a
        href={FAQ_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="group ml-auto flex items-center gap-2 rounded-button px-2.5 py-2 text-sm font-medium text-lv-text hover:bg-lv-surface transition-colors"
        aria-label="Hilfe"
        title="Hilfe"
      >
        <LovedisIcon name="help" className="h-5 w-5 shrink-0 text-lv-secondary transition-colors group-hover:text-lv-blue" />
        <span className="hidden sm:inline">Hilfe</span>
      </a>

      <div className="relative">
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="flex items-center gap-3 rounded-button px-2 py-1.5 hover:bg-lv-surface transition-colors"
        >
          <span className="hidden text-right sm:block">
            <span className="block text-sm font-semibold leading-tight">
              {userName}
            </span>
            <span className="block text-[11px] text-lv-secondary leading-tight">
              {ROLE_LABELS[role]}
            </span>
          </span>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-lv-blue text-xs font-bold text-white">
            {initials(userName)}
          </span>
        </button>

        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setMenuOpen(false)}
              aria-hidden
            />
            <div className="absolute right-0 z-50 mt-2 w-56 rounded-card border border-lv-border bg-white p-2 shadow-card">
              <div className="px-3 py-2">
                <p className="text-sm font-semibold">{userName}</p>
                <Badge tone="blue" className="mt-1">
                  {ROLE_LABELS[role]}
                </Badge>
              </div>
              <div className="my-1 h-px bg-lv-border" />
              <form action={logout}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-2 rounded-button px-3 py-2 text-sm text-lv-text hover:bg-lv-surface transition-colors"
                >
                  <LovedisIcon name="logout" className="h-4 w-4" />
                  Abmelden
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
