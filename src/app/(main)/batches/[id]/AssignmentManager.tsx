"use client";

import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import type { ActionState } from "@/lib/action-state";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Field";
import { toast } from "@/stores/useToast";

type BoundAction = (
  prev: ActionState | undefined,
  formData: FormData
) => Promise<ActionState>;

export interface AssignItem {
  id: string;
  name: string;
  sub?: string | null;
}

/** A single add/remove form wired to a server action, with toast + refresh. */
function MembershipForm({
  action,
  hidden,
  children,
  variant = "secondary",
  size = "sm",
}: {
  action: BoundAction;
  hidden: Record<string, string>;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "white";
  size?: "sm" | "md";
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(action, undefined);
  const handled = useRef<ActionState | undefined>(undefined);

  useEffect(() => {
    if (state && state !== handled.current) {
      handled.current = state;
      if (state.success) {
        toast.success(state.success);
        router.refresh();
      } else if (state.error) {
        toast.error(state.error);
      }
    }
  }, [state, router]);

  return (
    <form action={formAction}>
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <Button type="submit" variant={variant} size={size} disabled={pending}>
        {children}
      </Button>
    </form>
  );
}

/**
 * Generic two-part membership editor: the assigned items (each removable) plus
 * an "add" picker over the still-available items. Used for both the batch's
 * startups and its partner companies.
 */
export function AssignmentManager({
  batchId,
  idField,
  action,
  assigned,
  available,
  addLabel,
  emptyLabel,
  canManage,
}: {
  batchId: string;
  /** Hidden field name the action expects for the item id. */
  idField: "startupId" | "partnerCompanyId";
  action: BoundAction;
  assigned: AssignItem[];
  available: AssignItem[];
  addLabel: string;
  emptyLabel: string;
  canManage: boolean;
}) {
  const [pick, setPick] = useState("");

  return (
    <Card className="space-y-4 p-5">
      {assigned.length === 0 ? (
        <p className="text-sm text-lv-secondary">{emptyLabel}</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {assigned.map((it) => (
            <li
              key={it.id}
              className="flex items-center gap-2 rounded-full border border-lv-border bg-white py-1 pl-3 pr-1 text-sm"
            >
              <span className="font-medium text-lv-text">{it.name}</span>
              {it.sub && (
                <span className="text-xs text-lv-secondary">{it.sub}</span>
              )}
              {canManage && (
                <MembershipForm
                  action={action}
                  hidden={{ batchId, [idField]: it.id, mode: "remove" }}
                  variant="ghost"
                  size="sm"
                >
                  <X className="h-3.5 w-3.5" />
                </MembershipForm>
              )}
            </li>
          ))}
        </ul>
      )}

      {canManage && available.length > 0 && (
        <div className="flex flex-wrap items-end gap-2 border-t border-lv-border pt-4">
          <div className="min-w-[220px] flex-1">
            <Select
              value={pick}
              onChange={(e) => setPick(e.target.value)}
              aria-label={addLabel}
            >
              <option value="">{addLabel}…</option>
              {available.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.name}
                  {it.sub ? ` — ${it.sub}` : ""}
                </option>
              ))}
            </Select>
          </div>
          {pick && (
            <MembershipForm
              action={action}
              hidden={{ batchId, [idField]: pick, mode: "add" }}
              variant="primary"
              size="sm"
            >
              <Plus className="h-4 w-4" />
              Hinzufügen
            </MembershipForm>
          )}
        </div>
      )}
    </Card>
  );
}
