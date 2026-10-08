import { MessagesSquare } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Avatar } from "@/components/messages/Avatar";
import {
  ConversationList,
  type ConversationItem,
} from "@/components/messages/ConversationList";
import { Composer } from "@/components/messages/Composer";
import { PollRefresher } from "@/components/messages/PollRefresher";
import { Card } from "@/components/ui/Card";
import { requireAuth } from "@/lib/auth-guards";
import {
  formatDaySeparator,
  formatMessageTime,
  messageableUsersWhere,
} from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { ROLE_LABELS } from "@/lib/roles";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Nachrichten" };

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const session = await requireAuth();
  const meId = session.user.id;
  const { c } = await searchParams;

  // Resolve & validate the selected conversation, then mark it read first so
  // its unread badge clears in the freshly computed list below.
  let selectedId: string | null = null;
  if (c) {
    const link = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId: c, userId: meId } },
      select: { id: true },
    });
    if (link) {
      selectedId = c;
      await prisma.conversationParticipant.update({
        where: { conversationId_userId: { conversationId: c, userId: meId } },
        data: { lastReadAt: new Date() },
      });
    }
  }

  const links = await prisma.conversationParticipant.findMany({
    where: { userId: meId },
    select: {
      lastReadAt: true,
      conversation: {
        select: {
          id: true,
          lastMessageAt: true,
          participants: {
            where: { userId: { not: meId } },
            select: {
              user: {
                select: { id: true, name: true, role: true, company: true },
              },
            },
          },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { body: true, createdAt: true, senderId: true },
          },
        },
      },
    },
    orderBy: { conversation: { lastMessageAt: "desc" } },
  });

  // Single grouped query for unread counts across all conversations (avoids an
  // N+1 of one message.count per conversation). Each conversation keeps its own
  // `lastReadAt` threshold via a per-conversation OR branch, ANDed with the
  // "not my own message" filter; conversations with no unread simply don't
  // appear in the result and default to 0.
  const grouped = links.length
    ? await prisma.message.groupBy({
        by: ["conversationId"],
        where: {
          senderId: { not: meId },
          OR: links.map((l) => ({
            conversationId: l.conversation.id,
            createdAt: { gt: l.lastReadAt ?? new Date(0) },
          })),
        },
        _count: { _all: true },
      })
    : [];
  const unreadByConversation = new Map(
    grouped.map((g) => [g.conversationId, g._count._all])
  );

  const items: ConversationItem[] = [];
  links.forEach((l) => {
    const other = l.conversation.participants[0]?.user;
    if (!other) return;
    const last = l.conversation.messages[0];
    items.push({
      id: l.conversation.id,
      otherName: other.name,
      otherRole: other.role,
      otherCompany: other.company,
      lastBody: last?.body ?? null,
      lastFromMe: last?.senderId === meId,
      lastAt: l.conversation.lastMessageAt.toISOString(),
      unread: unreadByConversation.get(l.conversation.id) ?? 0,
    });
  });

  const contacts = (
    await prisma.user.findMany({
      where: messageableUsersWhere(meId, session.user.role),
      select: { id: true, name: true, role: true, company: true },
      orderBy: { name: "asc" },
      take: 200,
    })
  ).map((u) => ({
    id: u.id,
    name: u.name,
    role: u.role,
    company: u.company,
  }));

  // Selected conversation thread
  const selected = selectedId
    ? await prisma.conversation.findUnique({
        where: { id: selectedId },
        select: {
          id: true,
          participants: {
            where: { userId: { not: meId } },
            select: {
              user: { select: { name: true, role: true, company: true } },
            },
          },
          messages: {
            orderBy: { createdAt: "asc" },
            select: { id: true, body: true, createdAt: true, senderId: true },
          },
        },
      })
    : null;

  const otherUser = selected?.participants[0]?.user ?? null;

  return (
    <>
      <PollRefresher />
      <div className="h-[calc(100dvh-8rem)] min-h-[520px]">
        <Card className="flex h-full overflow-hidden p-0">
          {/* Conversation list */}
          <aside
            className={cn(
              "w-full flex-col border-r border-lv-border sm:flex sm:w-80",
              selectedId ? "hidden sm:flex" : "flex"
            )}
          >
            <ConversationList
              items={items}
              selectedId={selectedId}
              contacts={contacts}
            />
          </aside>

          {/* Thread */}
          <section
            className={cn(
              "min-w-0 flex-1 flex-col",
              selectedId ? "flex" : "hidden sm:flex"
            )}
          >
            {selected && otherUser ? (
              <>
                <header className="flex items-center gap-3 border-b border-lv-border px-4 py-3">
                  <Link
                    href="/messages"
                    className="rounded-button p-1.5 text-lv-secondary hover:bg-lv-surface sm:hidden"
                    aria-label="Zurück"
                  >
                    ←
                  </Link>
                  <Avatar name={otherUser.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-lv-text">
                      {otherUser.name}
                    </p>
                    <p className="truncate text-xs text-lv-secondary">
                      {ROLE_LABELS[otherUser.role]}
                      {otherUser.company ? ` · ${otherUser.company}` : ""}
                    </p>
                  </div>
                </header>

                <div className="flex-1 space-y-1 overflow-y-auto lv-scroll bg-lv-surface/40 px-4 py-4">
                  {selected.messages.length === 0 && (
                    <p className="py-10 text-center text-sm text-lv-secondary">
                      Noch keine Nachrichten — sag Hallo!
                    </p>
                  )}
                  {selected.messages.map((m, idx) => {
                    const mine = m.senderId === meId;
                    const prev = selected.messages[idx - 1];
                    const showDay =
                      !prev ||
                      new Date(prev.createdAt).toDateString() !==
                        new Date(m.createdAt).toDateString();
                    return (
                      <div key={m.id}>
                        {showDay && (
                          <div className="my-3 flex justify-center">
                            <span className="rounded-full bg-white px-3 py-1 text-[11px] font-medium text-lv-secondary shadow-card">
                              {formatDaySeparator(m.createdAt)}
                            </span>
                          </div>
                        )}
                        <div
                          className={cn(
                            "flex",
                            mine ? "justify-end" : "justify-start"
                          )}
                        >
                          <div
                            className={cn(
                              "max-w-[78%] rounded-card px-3.5 py-2 text-sm shadow-card sm:max-w-[68%]",
                              mine
                                ? "bg-lv-blue text-white"
                                : "bg-white text-lv-text"
                            )}
                          >
                            <p className="whitespace-pre-wrap break-words">
                              {m.body}
                            </p>
                            <p
                              className={cn(
                                "mt-1 text-right text-[10px]",
                                mine ? "text-white/70" : "text-lv-secondary"
                              )}
                            >
                              {formatMessageTime(m.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Composer conversationId={selected.id} />
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-lv-blue-soft text-lv-blue">
                  <MessagesSquare className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-bold text-lv-text">
                  {items.length === 0
                    ? "Noch keine Konversationen"
                    : "Konversation auswählen"}
                </h3>
                <p className="mt-1 max-w-xs text-sm text-lv-secondary">
                  {items.length === 0
                    ? "Starte über „Neu“ eine neue Unterhaltung mit deinem Team, Startups oder Partnern."
                    : "Wähle links eine Konversation aus, um die Nachrichten zu lesen."}
                </p>
              </div>
            )}
          </section>
        </Card>
      </div>
    </>
  );
}
