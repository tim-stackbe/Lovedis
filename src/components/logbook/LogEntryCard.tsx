"use client";

import { CalendarClock, Pencil, Pin, PinOff, Reply, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import {
  deleteLogEntry,
  toggleLogEntryPin,
  toggleLogFollowUpDone,
} from "@/app/actions/logbook";
import { Avatar } from "@/components/messages/Avatar";
import { Markdown } from "@/components/ssot/Markdown";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { TimelineItem } from "@/components/ui/Timeline";
import { LOG_ENTRY_TYPE_LABELS, LOG_ENTRY_TYPE_TONES } from "@/lib/constants";
import type { LogEntryView } from "@/lib/logbook";
import {
  FORMER_MEMBER_NAME,
  formatLogDate,
  formatLogDateTime,
  formatRelative,
} from "@/lib/logbook-format";
import { cn } from "@/lib/utils";
import { toast } from "@/stores/useToast";
import { LogComposer } from "./LogComposer";
import { LogThread } from "./LogThread";
import type { LogContext } from "./types";

const ACTION_BTN =
  "inline-flex items-center gap-1 rounded-button px-2 py-1 text-xs font-medium text-lv-secondary transition-colors hover:bg-lv-surface hover:text-lv-text disabled:opacity-50";

/** Done toggle for an entry's next step (shared by card and follow-up list). */
export function useFollowUpToggle(entryId: string) {
  const [pending, startTransition] = useTransition();
  const toggle = () =>
    startTransition(async () => {
      const res = await toggleLogFollowUpDone(entryId);
      if (res.error) toast.error(res.error);
    });
  return { pending, toggle };
}

export function isOverdue(entry: LogEntryView, now: number): boolean {
  return (
    !!entry.followUpAt &&
    !entry.followUpDoneAt &&
    new Date(entry.followUpAt).getTime() < now
  );
}

/** One manual entry on the Logbuch timeline. */
export function LogEntryCard({
  entry,
  ctx,
}: {
  entry: LogEntryView;
  ctx: LogContext;
}) {
  const [editing, setEditing] = useState(false);
  const [threadOpen, setThreadOpen] = useState(false);
  const [replying, setReplying] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const authorName = entry.author?.name ?? FORMER_MEMBER_NAME;

  const run = (fn: () => Promise<{ error?: string; success?: string }>) =>
    startTransition(async () => {
      const res = await fn();
      setConfirming(false);
      if (res.error) toast.error(res.error);
      else if (res.success) toast.success(res.success);
    });

  const contactNames = entry.contactIds
    .map((id) => ctx.contacts.find((c) => c.id === id)?.name)
    .filter(Boolean);
  const teamNames = entry.teamParticipantIds
    .map((id) => ctx.admins.find((a) => a.id === id)?.name)
    .filter(Boolean);
  const participants = [...contactNames, ...teamNames];
  if (entry.externalParticipants) participants.push(entry.externalParticipants);

  return (
    <TimelineItem
      marker={LOG_ENTRY_TYPE_TONES[entry.type]}
      leading={<Avatar name={authorName} size="sm" />}
      className="scroll-mt-24"
      meta={
        <>
          <span className="text-xs font-semibold text-lv-text">{authorName}</span>
          <time
            dateTime={new Date(entry.occurredAt).toISOString()}
            title={formatLogDateTime(entry.occurredAt)}
            className="text-xs text-lv-secondary"
          >
            {formatRelative(entry.occurredAt, ctx.now)}
          </time>
          <Badge tone={LOG_ENTRY_TYPE_TONES[entry.type]}>
            {LOG_ENTRY_TYPE_LABELS[entry.type]}
          </Badge>
          {entry.pinnedAt && (
            <Badge tone="blue">
              <Pin className="h-3 w-3" />
              Angepinnt
            </Badge>
          )}
          {entry.editedAt && (
            <span
              className="text-xs text-lv-secondary"
              title={`Bearbeitet am ${formatLogDateTime(entry.editedAt)}`}
            >
              (bearbeitet)
            </span>
          )}
        </>
      }
      title={
        <span id={`eintrag-${entry.id}`} className="scroll-mt-24">
          {entry.title ?? LOG_ENTRY_TYPE_LABELS[entry.type]}
        </span>
      }
    >
      {editing ? (
        <div className="mt-2 rounded-card border border-lv-border bg-white p-4">
          <LogComposer ctx={ctx} entry={entry} onDone={() => setEditing(false)} />
        </div>
      ) : (
        <>
          {entry.context && (
            <p className="mb-1.5 text-xs font-medium text-lv-blue">
              {entry.context.href ? (
                <Link href={entry.context.href} className="hover:underline">
                  {entry.context.label}
                </Link>
              ) : (
                entry.context.label
              )}
            </p>
          )}
          <Markdown source={entry.body} />
          {participants.length > 0 && (
            <p className="mt-2 flex items-start gap-1.5 text-xs text-lv-secondary">
              <Users className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {participants.join(", ")}
            </p>
          )}
          {entry.nextStep && <NextStepBox entry={entry} now={ctx.now} />}
          <div className="mt-2 flex flex-wrap gap-1">
            <button
              type="button"
              className={ACTION_BTN}
              onClick={() => {
                setReplying(true);
                setThreadOpen(true);
              }}
            >
              <Reply className="h-3.5 w-3.5" />
              Antworten
            </button>
            <button
              type="button"
              className={ACTION_BTN}
              disabled={pending}
              onClick={() => run(() => toggleLogEntryPin(entry.id))}
            >
              {entry.pinnedAt ? (
                <PinOff className="h-3.5 w-3.5" />
              ) : (
                <Pin className="h-3.5 w-3.5" />
              )}
              {entry.pinnedAt ? "Lösen" : "Anpinnen"}
            </button>
            {entry.canEdit && (
              <button
                type="button"
                className={ACTION_BTN}
                onClick={() => setEditing(true)}
              >
                <Pencil className="h-3.5 w-3.5" />
                Bearbeiten
              </button>
            )}
            <button
              type="button"
              className={cn(ACTION_BTN, "hover:bg-lv-orange-soft hover:text-lv-orange")}
              onClick={() => setConfirming(true)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Löschen
            </button>
          </div>
          <LogThread
            entryId={entry.id}
            comments={entry.comments}
            now={ctx.now}
            open={threadOpen}
            onToggle={() => setThreadOpen((v) => !v)}
            replying={replying}
            onReplyDone={() => setReplying(false)}
          />
        </>
      )}
      <ConfirmDialog
        open={confirming}
        title="Eintrag löschen?"
        description="Der Eintrag und seine Antworten werden für alle ausgeblendet."
        confirmLabel="Löschen"
        tone="danger"
        pending={pending}
        onConfirm={() => run(() => deleteLogEntry(entry.id))}
        onCancel={() => setConfirming(false)}
      />
    </TimelineItem>
  );
}

function NextStepBox({ entry, now }: { entry: LogEntryView; now: number }) {
  const { pending, toggle } = useFollowUpToggle(entry.id);
  const done = !!entry.followUpDoneAt;
  const overdue = isOverdue(entry, now);

  return (
    <div
      className={cn(
        "mt-3 flex items-start gap-3 rounded-button border px-3 py-2.5",
        done
          ? "border-lv-border bg-lv-surface"
          : overdue
            ? "border-lv-orange-soft bg-lv-orange-soft/60"
            : "border-lv-blue-soft bg-lv-blue-soft/50"
      )}
    >
      <input
        type="checkbox"
        checked={done}
        disabled={pending}
        onChange={toggle}
        aria-label={done ? "Als offen markieren" : "Als erledigt markieren"}
        className="mt-0.5 h-4 w-4 shrink-0 accent-lv-blue"
      />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-lv-secondary">
          Nächster Schritt
        </p>
        <p className={cn("text-sm text-lv-text", done && "line-through opacity-60")}>
          {entry.nextStep}
        </p>
        <FollowUpMeta entry={entry} overdue={overdue} />
      </div>
    </div>
  );
}

export function FollowUpMeta({
  entry,
  overdue,
}: {
  entry: LogEntryView;
  overdue: boolean;
}) {
  if (!entry.followUpAt && !entry.followUpAssignee) return null;
  return (
    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-lv-secondary">
      {entry.followUpAt && (
        <span
          className={cn(
            "inline-flex items-center gap-1",
            overdue && "font-semibold text-lv-orange"
          )}
        >
          <CalendarClock className="h-3 w-3" />
          {overdue ? "Überfällig seit " : "Fällig am "}
          {formatLogDate(entry.followUpAt)}
        </span>
      )}
      {entry.followUpAssignee && <span>Zuständig: {entry.followUpAssignee.name}</span>}
    </p>
  );
}
