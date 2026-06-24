"use client";

import { Send } from "lucide-react";
import { useActionState } from "react";
import { runDueReminders } from "@/app/actions/pushes";
import type { ActionState } from "@/lib/action-state";
import { Button } from "@/components/ui/Button";

export function RunRemindersButton() {
  const [state, formAction, pending] = useActionState<ActionState | undefined>(
    async () => runDueReminders(),
    undefined
  );

  return (
    <form action={formAction} className="flex items-center gap-3">
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        <Send className="h-4 w-4" />
        {pending ? "Verarbeite…" : "Fällige verarbeiten"}
      </Button>
      {state?.error && (
        <span className="text-xs text-lv-orange">{state.error}</span>
      )}
      {state?.success && (
        <span className="text-xs text-lv-mint-deep">{state.success}</span>
      )}
    </form>
  );
}
