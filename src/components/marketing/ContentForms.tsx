"use client";

import { Pencil, Trash2 } from "lucide-react";
import { startTransition, useActionState, useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { changeContentStatus, deleteContentItem, saveContentItem } from "@/app/actions/marketing";
import { useActionFeedback } from "@/components/insights/useActionFeedback";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ErrorChip, Field, Input, Select, Textarea } from "@/components/ui/Field";
import {
  CONTENT_ACTION_LABELS,
  availableActions,
  type ContentAction,
} from "@/lib/marketing/content";
import {
  CONTENT_CHANNEL_LABELS,
  CONTENT_CHANNELS,
  CONTENT_FORMAT_LABELS,
  CONTENT_FORMATS,
} from "@/lib/marketing/constants";
import { toast } from "@/stores/useToast";

export interface ContentValues {
  id: string;
  title: string;
  body: string | null;
  channel: string;
  format: string | null;
  plannedFor: string | null;
  assigneeId: string | null;
  campaign: string | null;
  publishedUrl: string | null;
}

/** Create (no `item`) or edit a Redaktionsplan entry. */
export function ContentForm({
  item,
  admins,
  onDone,
}: {
  item?: ContentValues;
  admins: { id: string; name: string }[];
  onDone?: () => void;
}) {
  const [state, formAction, pending] = useActionState(saveContentItem, undefined);
  useActionFeedback(state);
  const ref = useRef<HTMLFormElement>(null);
  const handled = useRef<typeof state>(undefined);
  const p = item ? `ci-${item.id}` : "ci-new";

  useEffect(() => {
    if (!state?.success || handled.current === state) return;
    handled.current = state;
    if (!item) ref.current?.reset();
    onDone?.();
  }, [state, item, onDone]);

  // Keep entered values when validation fails (no automatic form reset).
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => formAction(fd));
  };

  return (
    <form ref={ref} onSubmit={onSubmit} className="space-y-3">
      {item && <input type="hidden" name="id" value={item.id} />}
      <fieldset disabled={pending} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <Field label="Titel" htmlFor={`${p}-title`} className="sm:col-span-2 lg:col-span-3">
          <Input id={`${p}-title`} name="title" defaultValue={item?.title ?? ""} placeholder="z. B. Startup-Spotlight Batch 3" />
        </Field>
        <Field label="Kanal" htmlFor={`${p}-channel`}>
          <Select id={`${p}-channel`} name="channel" defaultValue={item?.channel ?? "LINKEDIN"}>
            {CONTENT_CHANNELS.map((c) => (
              <option key={c} value={c}>
                {CONTENT_CHANNEL_LABELS[c]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Format" htmlFor={`${p}-format`}>
          <Select id={`${p}-format`} name="format" defaultValue={item?.format ?? ""}>
            <option value="">offen</option>
            {CONTENT_FORMATS.map((f) => (
              <option key={f} value={f}>
                {CONTENT_FORMAT_LABELS[f]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Geplant am" htmlFor={`${p}-date`}>
          <Input id={`${p}-date`} name="plannedFor" type="date" defaultValue={item?.plannedFor ?? ""} />
        </Field>
        <Field label="Verantwortlich" htmlFor={`${p}-assignee`} className="lg:col-span-2">
          <Select id={`${p}-assignee`} name="assigneeId" defaultValue={item?.assigneeId ?? ""}>
            <option value="">niemand</option>
            {admins.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Kampagne" htmlFor={`${p}-campaign`} className="lg:col-span-2">
          <Input id={`${p}-campaign`} name="campaign" defaultValue={item?.campaign ?? ""} placeholder="optional, z. B. KI Resilience Day" />
        </Field>
        <Field label="Link zum veröffentlichten Beitrag" htmlFor={`${p}-url`} className="sm:col-span-2 lg:col-span-2">
          <Input id={`${p}-url`} name="publishedUrl" defaultValue={item?.publishedUrl ?? ""} placeholder="https://www.linkedin.com/feed/update/…" />
        </Field>
        <Field label="Text / Notizen" htmlFor={`${p}-body`} className="sm:col-span-2 lg:col-span-6">
          <Textarea id={`${p}-body`} name="body" defaultValue={item?.body ?? ""} placeholder="Entwurf, Hashtags, Assets aus dem Media Kit…" />
        </Field>
      </fieldset>
      {state?.error && <ErrorChip>{state.error}</ErrorChip>}
      <div className="flex justify-end gap-2">
        {onDone && item && (
          <Button type="button" variant="ghost" size="sm" onClick={onDone} disabled={pending}>
            Abbrechen
          </Button>
        )}
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Speichern…" : item ? "Speichern" : "Beitrag anlegen"}
        </Button>
      </div>
    </form>
  );
}

/** Status buttons, edit toggle and delete for one entry. */
export function ContentItemControls({
  item,
  status,
  admins,
}: {
  item: ContentValues;
  status: string;
  admins: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");

  const run = (action: ContentAction, withNote?: string) =>
    start(async () => {
      const result = await changeContentStatus(item.id, action, withNote);
      if (result.error) toast.error(result.error);
      else {
        toast.success(result.success ?? "Gespeichert.");
        setRejecting(false);
        setNote("");
        router.refresh();
      }
    });

  const onDelete = () =>
    start(async () => {
      const result = await deleteContentItem(item.id);
      setConfirmDelete(false);
      if (result.error) toast.error(result.error);
      else {
        toast.success(result.success ?? "Gelöscht.");
        router.refresh();
      }
    });

  if (editing) {
    return <ContentForm item={item} admins={admins} onDone={() => setEditing(false)} />;
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {availableActions(status).map((action) =>
          action === "reject" ? (
            <Button key={action} size="sm" variant="secondary" disabled={pending} onClick={() => setRejecting((v) => !v)}>
              {CONTENT_ACTION_LABELS[action]}
            </Button>
          ) : (
            <Button
              key={action}
              size="sm"
              variant={action === "approve" || action === "submit" ? "primary" : "secondary"}
              disabled={pending}
              onClick={() => run(action)}
            >
              {CONTENT_ACTION_LABELS[action]}
            </Button>
          )
        )}
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => setEditing(true)}>
          <Pencil className="h-3.5 w-3.5" />
          Bearbeiten
        </Button>
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => setConfirmDelete(true)} aria-label="Löschen">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      {rejecting && (
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Was soll geändert werden?" htmlFor={`rej-${item.id}`} className="min-w-64 flex-1">
            <Input id={`rej-${item.id}`} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <Button size="sm" variant="danger" disabled={pending} onClick={() => run("reject", note)}>
            Zurückgeben
          </Button>
        </div>
      )}
      <ConfirmDialog
        open={confirmDelete}
        title="Beitrag löschen?"
        description={`„${item.title}“ wird aus dem Redaktionsplan entfernt.`}
        confirmLabel="Löschen"
        tone="danger"
        pending={pending}
        onConfirm={onDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
