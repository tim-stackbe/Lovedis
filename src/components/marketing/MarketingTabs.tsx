"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/marketing", label: "Übersicht" },
  { href: "/marketing/linkedin", label: "LinkedIn" },
  { href: "/marketing/website", label: "Website" },
  { href: "/marketing/email", label: "E-Mail & Newsletter" },
  { href: "/marketing/redaktionsplan", label: "Redaktionsplan" },
  { href: "/marketing/integrationen", label: "Integrationen" },
];

export function MarketingTabs({ badges = {} }: { badges?: Record<string, number> }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Marketing Dashboard" className="flex flex-wrap gap-2">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        const badge = badges[tab.href] ?? 0;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
              active
                ? "border-lv-blue bg-lv-blue text-white"
                : "border-lv-border bg-white text-lv-secondary hover:bg-lv-surface hover:text-lv-text"
            )}
          >
            {tab.label}
            {badge > 0 && (
              <span
                className={cn(
                  "rounded-full px-1.5 text-[11px] font-bold",
                  active ? "bg-white/20 text-white" : "bg-lv-orange-soft text-lv-orange"
                )}
              >
                {badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
