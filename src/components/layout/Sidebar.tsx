"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import type { UserRole } from "@/generated/prisma/enums";
import { Wordmark } from "@/components/ui/Wordmark";
import { ROLE_LABELS, ROLE_NAV } from "@/lib/roles";
import { cn } from "@/lib/utils";

interface SidebarProps {
  role: UserRole;
  mobileOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ role, mobileOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const sections = ROLE_NAV[role];

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
                    className={cn(
                      "flex items-center gap-3 rounded-button px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-lv-blue-soft text-lv-blue font-semibold"
                        : "text-lv-text hover:bg-lv-surface"
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
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
        <div className="border-t border-lv-border px-5 py-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-lv-secondary">
            {ROLE_LABELS[role]}-Workspace
          </p>
        </div>
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
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">{nav}</div>
          </aside>
        </div>
      )}
    </>
  );
}
