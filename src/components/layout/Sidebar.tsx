"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserRole } from "@/generated/prisma/enums";
import { LovedisIcon } from "@/components/icons/lovedis";
import { Wordmark } from "@/components/ui/Wordmark";
import { ROLE_LABELS, ROLE_NAV } from "@/lib/roles";
import { cn, initials } from "@/lib/utils";

interface SidebarProps {
  role: UserRole;
  userName: string;
  mobileOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ role, userName, mobileOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const sections = ROLE_NAV[role];

  const userChip = (
    <Link
      href="/settings"
      onClick={onClose}
      className="flex items-center gap-3 rounded-card border border-lv-border bg-white px-3 py-2.5 transition-colors hover:bg-lv-surface"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-lv-blue text-xs font-bold text-white">
        {initials(userName)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-lv-text">
          {userName}
        </span>
        <span className="block truncate text-xs text-lv-secondary">
          {ROLE_LABELS[role]}
        </span>
      </span>
      <LovedisIcon name="chevronRight" className="h-4 w-4 shrink-0 text-lv-secondary" />
    </Link>
  );

  const nav = (
    <nav className="flex flex-col gap-6 px-3 py-4">
      {sections.map((section, i) => (
        <div key={i}>
          {section.title && (
            <p className="lv-wordmark mb-2 px-3 text-[10px] text-lv-secondary">
              {section.title}
            </p>
          )}
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(`${item.href}/`));
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-button py-1.5 pl-1.5 pr-3 text-sm transition-colors",
                      active
                        ? "bg-lv-blue-soft font-semibold text-lv-blue"
                        : "font-medium text-lv-text hover:bg-lv-surface"
                    )}
                  >
                    {active && (
                      <span
                        aria-hidden
                        className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-lv-orange"
                      />
                    )}
                    <span
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-button transition-colors",
                        active
                          ? "bg-white shadow-sm ring-1 ring-lv-blue/10"
                          : "bg-lv-blue-soft/60 group-hover:bg-white"
                      )}
                    >
                      {/* Two-tone "Sticker Pop" glyphs paint their own blue+coral,
                          so the chip stays LIGHT in both states — a solid-blue
                          active fill would hide the colourful icon. */}
                      <LovedisIcon name={item.icon} className="h-4 w-4" />
                    </span>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r border-lv-border bg-white">
        <div className="flex h-16 items-center border-b border-lv-border px-5">
          <Link href="/">
            <Wordmark />
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto lv-scroll">{nav}</div>
        <div className="border-t border-lv-border p-3">{userChip}</div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-lv-text/40"
            onClick={onClose}
            aria-hidden
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-white shadow-card">
            <div className="flex h-16 items-center justify-between border-b border-lv-border px-5">
              <Wordmark />
              <button
                onClick={onClose}
                className="rounded-button p-2 hover:bg-lv-surface"
                aria-label="Menü schließen"
              >
                <LovedisIcon name="close" className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto lv-scroll">{nav}</div>
            <div className="border-t border-lv-border p-3">{userChip}</div>
          </aside>
        </div>
      )}
    </>
  );
}
