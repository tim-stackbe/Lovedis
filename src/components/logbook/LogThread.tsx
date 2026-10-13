"use client";

import { useState, useTransition } from "react";
import {
  createLogComment,
  deleteLogComment,
  updateLogComment,
} from "@/app/actions/logbook";
import { Avatar } from "@/components/messages/Avatar";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ErrorChip, Textarea } from "@/components/ui/Field";
import type { LogCommentView } from "@/lib/logbook";
import {
  FORMER_MEMBER_NAME,
  formatLogDateTime,
  formatRelative,
} from "@/lib/logbook-format";
import { toast } from "@/stores/useToast";

interface LogThreadProps {
  entryId: string;
  comments: LogCommentView[];
  now: number;
  open: boolean;
  onToggle: () => void;
  /** Shows the reply composer (set by the card's "Antworten" action). */
  replying: boolean;
  onReplyDone: () => void;
}

/** Flat reply thread under an entry, collapsed to "N Antworten" by default. */
export function LogThread({
  entryId,
  comments,
  now,
  open,
  onToggle,
  replying,
  onReplyDone,
}: LogThreadProps) {
  if (comments.length === 0 && !replying) return null;

  return (
    <div className="mt-3 border-t border-lv-border pt-3">
      {comments.length > 0 && (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="text-xs font-semibold text-lv-blue hover:underline"
        >
          {open
            ? "Antworten ausblenden"
            : comments.length === 1
              ? "1 Antwort"
              : `${comments.length} Antworten`}
        </button>
      )}
      {open && comments.length > 0 && (
        <ul className="mt-3 space-y-3">
          {comments.map((c) => (
            <CommentRow key={c.id} comment={c} now={now} />
          ))}
        </ul>
      )}
      {replying && (
        <CommentForm
          entryId={entryId}
          onDone={onReplyDone}
          className={comments.length > 0 ? "mt-3" : undefined}
        />
      )}
    </div>
  );
}

function CommentRow({ comment, now }: { comment: LogCommentView; now: number }) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const name = comment.author?.name ?? FORMER_MEMBER_NAME;

  const remove = () =>
    startTransition(async () => {
      const res = await deleteLogComment(comment.id);
      setConfirming(false);
      if (res.error) toast.error(res.error);
      else if (res.success) toast.success(res.success);
    });

  return (
    <li className="flex items-start gap-2.5">
      <Avatar name={name} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 text-xs">
          <span className="font-semibold text-lv-text">{name}</span>
          <time
            dateTime={new Date(comment.createdAt).toISOString()}
            title={formatLogDateTime(comment.createdAt)}
            className="text-lv-secondary"
          >
            {formatRelative(comment.createdAt, now)}
          </time>
          {comment.editedAt && (
            <span className="text-lv-secondary">(bearbeitet)</span>
          )}
        </div>
        {editing ? (
          <CommentForm
            commentId={comment.id}
            initialBody={comment.body}
            onDone={() => setEditing(false)}
            className="mt-1.5"
          />
        ) : (
          <p className="mt-0.5 whitespace-pre-line text-sm text-lv-text">
            {comment.body}
          </p>
        )}
        {!editing && (
          <div className="mt-1 flex gap-3 text-xs text-lv-secondary">
            {comment.canEdit && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="hover:text-lv-blue"
              >
                Bearbeiten
              </button>
            )}
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="hover:text-lv-orange"
            >
              Löschen
            </button>
          </div>
        )}
      </div>
      <ConfirmDialog
        open={confirming}
        title="Antwort löschen?"
        description="Die Antwort wird für alle ausgeblendet."
        confirmLabel="Löschen"
        tone="danger"
        pending={pending}
        onConfirm={remove}
        onCancel={() => setConfirming(false)}
      />
    </li>
  );
}

function CommentForm({
  entryId,
  commentId,
  initialBody = "",
  onDone,
  className,
}: {
  entryId?: string;
  commentId?: string;
  initialBody?: string;
  onDone: () => void;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = commentId
        ? await updateLogComment(undefined, formData)
        : await createLogComment(undefined, formData);
      if (res.error) {
        setError(res.error);
        return;
      }
      if (res.success) toast.success(res.success);
      onDone();
    });
  };

  return (
    <form onSubmit={onSubmit} className={className}>
      {commentId ? (
        <input type="hidden" name="commentId" value={commentId} />
      ) : (
        <input type="hidden" name="entryId" value={entryId} />
      )}
      <Textarea
        name="body"
        required
        maxLength={5000}
        defaultValue={initialBody}
        className="min-h-16"
        placeholder="Antwort schreiben …"
        aria-label={commentId ? "Antwort bearbeiten" : "Antwort schreiben"}
        autoFocus
      />
      {error && <ErrorChip>{error}</ErrorChip>}
      <div className="mt-2 flex justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onDone}
          disabled={pending}
        >
          Abbrechen
        </Button>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Speichern…" : commentId ? "Speichern" : "Antworten"}
        </Button>
      </div>
    </form>
  );
}
