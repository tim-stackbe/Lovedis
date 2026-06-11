"use client";

import { useEffect, useState } from "react";
import type { UserRole } from "@/generated/prisma/enums";
import {
  CommandPalette,
  type PaletteStartup,
} from "@/components/layout/CommandPalette";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { useAppStore } from "@/stores/useAppStore";

interface AppShellProps {
  userName: string;
  role: UserRole;
  startups: PaletteStartup[];
  children: React.ReactNode;
}

export function AppShell({ userName, role, startups, children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Rehydrate the persisted store after mount (skipHydration is enabled to
  // keep server and first client render identical).
  useEffect(() => {
    void useAppStore.persist.rehydrate();
  }, []);

  return (
    <div className="flex min-h-screen">
      <Sidebar
        role={role}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          userName={userName}
          role={role}
          onOpenMenu={() => setMobileOpen(true)}
          onOpenPalette={() => setPaletteOpen(true)}
        />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-6xl space-y-8">{children}</div>
        </main>
      </div>
      <CommandPalette
        role={role}
        startups={startups}
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
      />
    </div>
  );
}
