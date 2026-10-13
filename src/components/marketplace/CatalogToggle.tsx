"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toggleMentorActive } from "@/app/actions/marketplace";

export function MentorActiveToggle({
  id,
  active,
}: {
  id: string;
  active: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const toggle = () => {
    startTransition(async () => {
      await toggleMentorActive(id);
      router.refresh();
    });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className="rounded-button border border-lv-border px-3 py-1.5 text-xs font-semibold text-lv-secondary transition-colors hover:bg-lv-surface disabled:opacity-50"
    >
      {active ? "Ausblenden" : "Einblenden"}
    </button>
  );
}
