"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  toggleMentorActive,
  toggleOfferingActive,
  toggleProgramOpen,
} from "@/app/actions/marketplace";

type Kind = "program" | "mentor" | "offering";

export function CatalogToggle({
  id,
  kind,
  active,
}: {
  id: string;
  kind: Kind;
  active: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const toggle = () => {
    startTransition(async () => {
      if (kind === "program") await toggleProgramOpen(id);
      else if (kind === "mentor") await toggleMentorActive(id);
      else await toggleOfferingActive(id);
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
      {active ? "Deaktivieren" : "Aktivieren"}
    </button>
  );
}
