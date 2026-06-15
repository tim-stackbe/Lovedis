"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Lightweight polling: re-fetches the server-rendered page on an interval so
 * new messages appear without a manual reload. Pauses while the tab is hidden.
 */
export function PollRefresher({ intervalMs = 5000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);

  return null;
}
