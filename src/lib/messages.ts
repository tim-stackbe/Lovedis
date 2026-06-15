import type { Prisma } from "@/generated/prisma/client";
import type { UserRole } from "@/generated/prisma/enums";

/** Internal Lovedis team — these roles may message anyone. */
export const INTERNAL_ROLES: UserRole[] = ["ADMIN", "MEMBER"];

/**
 * Prisma `where` for users the given user may start a conversation with.
 * Internal team members can message everyone; external roles (startups,
 * partners, investors) can only reach the internal team.
 */
export function messageableUsersWhere(
  userId: string,
  role: UserRole
): Prisma.UserWhereInput {
  const base: Prisma.UserWhereInput = { id: { not: userId }, isActive: true };
  if (INTERNAL_ROLES.includes(role)) return base;
  return { ...base, role: { in: INTERNAL_ROLES } };
}

/** Whether a sender with `senderRole` may message a recipient with `recipientRole`. */
export function canMessage(
  senderRole: UserRole,
  recipientRole: UserRole
): boolean {
  if (INTERNAL_ROLES.includes(senderRole)) return true;
  return INTERNAL_ROLES.includes(recipientRole);
}

/** Deterministic avatar color classes, derived from a stable seed. */
const AVATAR_TONES = [
  "bg-lv-mint text-lv-mint-deep",
  "bg-lv-orange-soft text-lv-orange",
  "bg-lv-yellow text-lv-yellow-deep",
  "bg-lv-pink text-lv-text",
  "bg-lv-blue-soft text-lv-blue",
];

export function avatarTone(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return AVATAR_TONES[hash % AVATAR_TONES.length];
}

/** Short time (HH:MM) for a message bubble. */
export function formatMessageTime(date: Date | string): string {
  return new Date(date).toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Compact timestamp for the conversation list (today → time, else date/weekday). */
export function formatConversationTime(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const diffDays = Math.floor(
    (startOfToday.getTime() -
      new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) /
      86_400_000
  );
  if (diffDays <= 0) {
    return d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  }
  if (diffDays === 1) return "Gestern";
  if (diffDays < 7) {
    return d.toLocaleDateString("de-DE", { weekday: "short" });
  }
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "short" });
}

/** Day separator label inside a thread (Heute / Gestern / date). */
export function formatDaySeparator(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const diffDays = Math.floor(
    (startOfToday.getTime() -
      new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) /
      86_400_000
  );
  if (diffDays <= 0) return "Heute";
  if (diffDays === 1) return "Gestern";
  return d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}
