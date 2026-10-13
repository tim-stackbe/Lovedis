"use client";

import { Plus, Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { startConversation } from "@/app/actions/messages";
import { Avatar } from "@/components/messages/Avatar";
import type { UserRole } from "@/generated/prisma/enums";
import { formatConversationTime } from "@/lib/messages";
import { ROLE_LABELS } from "@/lib/roles";
import { cn, truncate } from "@/lib/utils";

export interface ConversationItem {
  id: string;
  otherName: string;
  otherRole: UserRole;
  otherCompany: string | null;
  lastBody: string | null;
  lastFromMe: boolean;
  lastAt: string;
  unread: number;
}

export interface Contact {
  id: string;
  name: string;
  role: UserRole;
  company: string | null;
}

export function ConversationList({
  items,
  selectedId,
  contacts,
}: {
  items: ConversationItem[];
  selectedId: string | null;
  contacts: Contact[];
}) {
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.otherName.toLowerCase().includes(q) ||
        (i.otherCompany ?? "").toLowerCase().includes(q)
    );
  }, [items, query]);

  return (
    <>
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <h2 className="text-lg font-bold text-lv-text">Nachrichten</h2>
        <button
          onClick={() => setDialogOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-button bg-lv-blue-soft px-2.5 py-1.5 text-xs font-semibold text-lv-blue transition-colors hover:bg-lv-blue hover:text-white"
        >
          <Plus className="h-3.5 w-3.5" />
          Neu
        </button>
      </div>

      <div className="px-3 pb-2">
        <div className="flex items-center gap-2 rounded-button border border-lv-border px-3 py-2">
          <Search className="h-4 w-4 text-lv-secondary" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Konversation suchen…"
            className="flex-1 bg-transparent text-base sm:text-sm text-lv-text placeholder:text-lv-secondary/60 outline-none"
          />
        </div>
      </div>

      <ul className="flex-1 overflow-y-auto lv-scroll px-2 pb-2">
        {filtered.length === 0 && (
          <li className="px-3 py-8 text-center text-sm text-lv-secondary">
            {items.length === 0
              ? "Noch keine Konversationen."
              : "Keine Treffer."}
          </li>
        )}
        {filtered.map((c) => {
          const active = c.id === selectedId;
          return (
            <li key={c.id}>
              <Link
                href={`/messages?c=${c.id}`}
                className={cn(
                  "flex items-center gap-3 rounded-button px-2.5 py-2.5 transition-colors",
                  active ? "bg-lv-blue-soft" : "hover:bg-lv-surface"
                )}
              >
                <Avatar name={c.otherName} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span
                      className={cn(
                        "truncate text-sm",
                        c.unread > 0 ? "font-bold text-lv-text" : "font-semibold"
                      )}
                    >
                      {c.otherName}
                    </span>
                    <span className="shrink-0 text-[11px] text-lv-secondary">
                      {formatConversationTime(c.lastAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        "truncate text-xs",
                        c.unread > 0
                          ? "font-medium text-lv-text"
                          : "text-lv-secondary"
                      )}
                    >
                      {c.lastBody
                        ? `${c.lastFromMe ? "Du: " : ""}${truncate(c.lastBody, 38)}`
                        : "Noch keine Nachrichten"}
                    </span>
                    {c.unread > 0 && (
                      <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-lv-blue px-1.5 text-[11px] font-bold text-white">
                        {c.unread}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      {dialogOpen && (
        <NewConversationDialog
          contacts={contacts}
          onClose={() => setDialogOpen(false)}
        />
      )}
    </>
  );
}

function NewConversationDialog({
  contacts,
  onClose,
}: {
  contacts: Contact[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.company ?? "").toLowerCase().includes(q)
    );
  }, [contacts, query]);

  function choose(id: string) {
    startTransition(async () => {
      const res = await startConversation(id);
      if (res.error || !res.conversationId) {
        setError(res.error ?? "Konversation konnte nicht erstellt werden.");
        return;
      }
      onClose();
      router.push(`/messages?c=${res.conversationId}`);
      router.refresh();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:items-center">
      <div className="absolute inset-0 bg-lv-text/40" onClick={onClose} aria-hidden />
      <div className="relative z-10 mt-16 w-full max-w-md rounded-card border border-lv-border bg-white shadow-card sm:mt-0">
        <div className="flex items-center justify-between border-b border-lv-border px-4 py-3">
          <h3 className="text-sm font-bold text-lv-text">Neue Nachricht</h3>
          <button
            onClick={onClose}
            className="rounded-button p-1.5 text-lv-secondary hover:bg-lv-surface"
            aria-label="Schließen"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-3">
          <div className="flex items-center gap-2 rounded-button border border-lv-border px-3 py-2">
            <Search className="h-4 w-4 text-lv-secondary" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Person oder Unternehmen suchen…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-lv-secondary/60"
            />
          </div>
          {error && (
            <p className="mt-2 text-xs font-medium text-lv-orange">{error}</p>
          )}
        </div>
        <ul className="max-h-80 overflow-y-auto lv-scroll px-2 pb-3">
          {filtered.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-lv-secondary">
              Niemand gefunden.
            </li>
          )}
          {filtered.map((c) => (
            <li key={c.id}>
              <button
                disabled={pending}
                onClick={() => choose(c.id)}
                className="flex w-full items-center gap-3 rounded-button px-2.5 py-2 text-left transition-colors hover:bg-lv-surface disabled:opacity-50"
              >
                <Avatar name={c.name} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-lv-text">
                    {c.name}
                  </p>
                  <p className="truncate text-xs text-lv-secondary">
                    {ROLE_LABELS[c.role]}
                    {c.company ? ` · ${c.company}` : ""}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
