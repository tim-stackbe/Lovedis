"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import type { ActionState } from "@/lib/action-state";
import { toast } from "@/stores/useToast";

/** Toast + refresh (or navigate) once per successful action result. */
export function useActionFeedback(state: ActionState | undefined) {
  const router = useRouter();
  const handled = useRef<ActionState | undefined>(undefined);

  useEffect(() => {
    if (!state?.success || handled.current === state) return;
    handled.current = state;
    toast.success(state.success);
    if (state.redirectTo) router.push(state.redirectTo);
    else router.refresh();
  }, [state, router]);
}
