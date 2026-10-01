"use client";

import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  deleteOffering,
  deleteProgram,
  moveOffering,
  moveProgram,
  setOfferingActive,
} from "@/app/actions/venture-store-editor";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ErrorChip } from "@/components/ui/Field";
import type { ActionState } from "@/lib/action-state";

type Kind = "offering" | "program";

const ICON_BUTTON =
  "inline-flex h-7 w-7 items-center justify-center rounded-button border border-lv-border text-lv-secondary transition-colors hover:bg-lv-surface hover:text-lv-blue disabled:cursor-not-allowed disabled:opacity-40";

/** Up/down reordering plus (for offerings) a quick visibility switch. */
export function EditorRowActions({
  kind,
  id,
  isFirst,
  isLast,
  isActive,
}: {
  kind: Kind;
  id: string;
  isFirst: boolean;
  isLast: boolean;
  isActive?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (fn: () => Promise<ActionState>) => {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (result.error) setError(result.error);
      router.refresh();
    });
  };

  const move = (direction: "up" | "down") =>
    run(() =>
      kind === "offering" ? moveOffering(id, direction) : moveProgram(id, direction)
    );

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          className={ICON_BUTTON}
          onClick={() => move("up")}
          disabled={pending || isFirst}
          aria-label="Nach oben"
          title="Nach oben"
        >
          <ArrowUp className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          className={ICON_BUTTON}
          onClick={() => move("down")}
          disabled={pending || isLast}
          aria-label="Nach unten"
          title="Nach unten"
        >
          <ArrowDown className="h-3.5 w-3.5" />
        </button>
        {kind === "offering" && isActive !== undefined && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={pending}
            onClick={() => run(() => setOfferingActive(id, !isActive))}
          >
            {isActive ? "Ausblenden" : "Einblenden"}
          </Button>
        )}
      </div>
      {error && <ErrorChip>{error}</ErrorChip>}
    </div>
  );
}

/** Delete with confirmation; the server refuses when bookings exist. */
export function EditorDeleteButton({
  kind,
  id,
  title,
}: {
  kind: Kind;
  id: string;
  title: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const confirm = () => {
    setError(null);
    startTransition(async () => {
      const result =
        kind === "offering" ? await deleteOffering(id) : await deleteProgram(id);
      setOpen(false);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push(result.redirectTo ?? "/venture-store-editor");
      router.refresh();
    });
  };

  return (
    <div className="space-y-3">
      <Button type="button" variant="danger" size="sm" onClick={() => setOpen(true)}>
        <Trash2 className="h-4 w-4" />
        {kind === "offering" ? "Angebot löschen" : "Programm löschen"}
      </Button>
      {error && <ErrorChip>{error}</ErrorChip>}
      <ConfirmDialog
        open={open}
        title={kind === "offering" ? "Angebot löschen?" : "Programm löschen?"}
        description={
          <>
            „{title}“ wird endgültig aus dem Venture Store entfernt. Das geht
            nur, solange es keine Buchungen gibt. Zum vorübergehenden
            Verstecken lieber ausblenden.
          </>
        }
        confirmLabel="Endgültig löschen"
        tone="danger"
        pending={pending}
        onConfirm={confirm}
        onCancel={() => setOpen(false)}
      />
    </div>
  );
}
