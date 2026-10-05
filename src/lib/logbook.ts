import { z } from "zod";
import type {
  LogEntrySource,
  LogEntryType,
  ApplicationStatus,
  PipelineStage,
  BookingStatus,
  EngagementStatus,
  IntroStatus,
  MatchContactStatus,
  PartnerVerdict,
  Recommendation,
  ReminderStatus,
} from "@/generated/prisma/enums";
import { requireAdmin } from "@/lib/auth-guards";
import {
  APPLICATION_STATUS_LABELS,
  BOOKING_STATUS_LABELS,
  ENGAGEMENT_STATUS_LABELS,
  INTRO_STATUS_LABELS,
  LOG_ACTIVE_STAGES,
  LOG_ENTRY_MANUAL_TYPES,
  LOG_MAX_PINNED,
  LOG_REF_TYPE_LABELS,
  LOG_REF_TYPES,
  LOG_STALE_DAYS,
  type LogRefType,
  MATCH_CONTACT_STATUS_LABELS,
  PARTNER_VERDICT_LABELS,
  RECOMMENDATION_LABELS,
  REMINDER_STATUS_LABELS,
} from "@/lib/constants";
import { formatLogDate } from "@/lib/logbook-format";
import { prisma } from "@/lib/prisma";
import { truncate } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Logbuch: admin-only interaction log per startup.
//
// Manual entries live in StartupLogEntry. System events are NOT stored; they
// are derived at read time from existing tables (screening, evaluations,
// partner verdicts, bookings, …) and merged into the timeline as read-only
// rows. Support tickets are deliberately never part of the log.
//
// Every exported query calls requireAdmin() itself, so a caller can never
// forget the gate (MEMBER and all external roles are redirected away).
// ---------------------------------------------------------------------------

export interface LogUser {
  id: string;
  name: string;
}

export interface LogCommentView {
  id: string;
  body: string;
  createdAt: Date;
  editedAt: Date | null;
  author: LogUser | null;
  canEdit: boolean;
}

/** Where an entry was captured from, e.g. "aus Match-Matrix: FingerHaus". */
export interface LogEntryContext {
  label: string;
  href: string | null;
}

export interface LogEntryView {
  kind: "entry";
  id: string;
  type: LogEntryType;
  source: LogEntrySource;
  occurredAt: Date;
  createdAt: Date;
  editedAt: Date | null;
  title: string | null;
  body: string;
  contactIds: string[];
  teamParticipantIds: string[];
  externalParticipants: string | null;
  nextStep: string | null;
  followUpAt: Date | null;
  followUpDoneAt: Date | null;
  followUpAssignee: LogUser | null;
  pinnedAt: Date | null;
  author: LogUser | null;
  canEdit: boolean;
  context: LogEntryContext | null;
  comments: LogCommentView[];
}

/** Read-only row derived from existing data (never stored, never editable). */
export interface DerivedEvent {
  kind: "system";
  key: string;
  occurredAt: Date;
  label: string;
  detail: string | null;
  href: string | null;
  actorId: string | null;
}

export type TimelineItem = LogEntryView | DerivedEvent;

// ---------------------------------------------------------------------------
// Permission rules (pure, unit-tested). The ADMIN gate itself is enforced by
// requireAdmin() in every query/action; these add the per-row rules on top.
// ---------------------------------------------------------------------------

interface EditableEntry {
  authorId: string | null;
  source: LogEntrySource;
  type: LogEntryType;
  deletedAt: Date | null;
}

/** Only the author may edit, and SYSTEM rows are never editable. */
export function canEditEntry(entry: EditableEntry, userId: string): boolean {
  return (
    entry.source === "MANUAL" &&
    entry.type !== "SYSTEM" &&
    entry.deletedAt === null &&
    entry.authorId !== null &&
    entry.authorId === userId
  );
}

export function canEditComment(
  comment: { authorId: string | null; deletedAt: Date | null },
  userId: string
): boolean {
  return (
    comment.deletedAt === null &&
    comment.authorId !== null &&
    comment.authorId === userId
  );
}

/** Whether one more entry may be pinned given the current pinned count. */
export function canPinAnother(pinnedCount: number): boolean {
  return pinnedCount < LOG_MAX_PINNED;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/** Optional trimmed text: empty input becomes null. */
const optionalText = (max: number, tooLong: string) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null),
    z.string().max(max, tooLong).nullable()
  );

/** Optional ISO date string (hidden composer field): empty becomes null. */
const optionalDate = (invalid: string) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null),
    z
      .string()
      .refine((s) => !Number.isNaN(Date.parse(s)), invalid)
      .transform((s) => new Date(s))
      .nullable()
  );

const idList = z.array(z.string().min(1).max(64)).max(50).default([]);

const entryFields = {
  type: z.enum(LOG_ENTRY_MANUAL_TYPES, { message: "Bitte wähle einen Typ." }),
  occurredAt: optionalDate("Ungültiges Datum bei „Wann?“."),
  title: optionalText(200, "Der Titel ist zu lang (max. 200 Zeichen)."),
  body: z
    .string()
    .trim()
    .min(1, "Bitte beschreibe kurz, was passiert ist.")
    .max(10000, "Der Eintrag ist zu lang (max. 10.000 Zeichen)."),
  contactIds: idList,
  teamParticipantIds: idList,
  externalParticipants: optionalText(
    500,
    "Externe Teilnehmende: max. 500 Zeichen."
  ),
  nextStep: optionalText(500, "Der nächste Schritt ist zu lang (max. 500 Zeichen)."),
  followUpAt: optionalDate("Ungültiges Follow-up-Datum."),
  followUpAssigneeId: optionalText(64, "Ungültige Zuständigkeit."),
};

/** A follow-up date or assignee only makes sense with a described next step. */
function refineFollowUp<
  T extends { nextStep: string | null; followUpAt: Date | null },
>(data: T, ctx: z.RefinementCtx) {
  if (data.followUpAt && !data.nextStep) {
    ctx.addIssue({
      code: "custom",
      path: ["nextStep"],
      message: "Bitte beschreibe den nächsten Schritt zum Follow-up-Datum.",
    });
  }
}

const optionalId = z.preprocess(
  (v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null),
  z.string().max(64).nullable()
);

export const createEntrySchema = z
  .object({
    startupId: z.string().min(1),
    ...entryFields,
    // Optional platform context. The server resolves and verifies it; the
    // client never supplies display metadata directly.
    refType: z.preprocess(
      (v) => (v === "" || v === null ? null : v),
      z.enum(LOG_REF_TYPES, { message: "Unbekannter Kontext." }).nullable()
    ),
    refId: optionalId,
    partnerCompanyId: optionalId,
    batchId: optionalId,
    assignSelf: z.preprocess((v) => v === "1", z.boolean()),
  })
  .superRefine(refineFollowUp);

export const updateEntrySchema = z
  .object({ entryId: z.string().min(1), ...entryFields })
  .superRefine(refineFollowUp);

const commentBody = z
  .string()
  .trim()
  .min(1, "Bitte gib eine Antwort ein.")
  .max(5000, "Die Antwort ist zu lang (max. 5.000 Zeichen).");

export const createCommentSchema = z.object({
  entryId: z.string().min(1),
  body: commentBody,
});

export const updateCommentSchema = z.object({
  commentId: z.string().min(1),
  body: commentBody,
});

/** Maps the composer FormData onto the entry schema input. */
export function entryFormInput(formData: FormData) {
  return {
    startupId: formData.get("startupId") ?? undefined,
    entryId: formData.get("entryId") ?? undefined,
    type: formData.get("type"),
    occurredAt: formData.get("occurredAt"),
    title: formData.get("title"),
    body: formData.get("body") ?? "",
    contactIds: formData.getAll("contactIds").map(String),
    teamParticipantIds: formData.getAll("teamParticipantIds").map(String),
    externalParticipants: formData.get("externalParticipants"),
    nextStep: formData.get("nextStep"),
    followUpAt: formData.get("followUpAt"),
    followUpAssigneeId: formData.get("followUpAssigneeId"),
    refType: formData.get("refType"),
    refId: formData.get("refId"),
    partnerCompanyId: formData.get("partnerCompanyId"),
    batchId: formData.get("batchId"),
    assignSelf: formData.get("assignSelf"),
  };
}

/** Metadata the server stores alongside a context reference. */
export type LogRefMetadata = Record<string, string | null>;

const str = (v: unknown) => (typeof v === "string" && v ? v : null);

/** Display label + link for an entry's context (pure; unit-tested). */
export function describeLogContext(
  refType: string | null,
  refId: string | null,
  metadata: unknown
): LogEntryContext | null {
  if (!refType || !(LOG_REF_TYPES as readonly string[]).includes(refType)) {
    return null;
  }
  const type = refType as LogRefType;
  const meta =
    metadata && typeof metadata === "object"
      ? (metadata as Record<string, unknown>)
      : {};
  const name = str(meta.contextLabel);
  const label = name
    ? `aus ${LOG_REF_TYPE_LABELS[type]}: ${name}`
    : `aus ${LOG_REF_TYPE_LABELS[type]}`;
  const hrefs: Record<LogRefType, string | null> = {
    PartnerStartupMatch: str(meta.batchId)
      ? `/match-matrix?batch=${str(meta.batchId)}`
      : "/match-matrix",
    MarketplaceBooking: "/marketplace",
    ChallengeApplication: str(meta.challengeId)
      ? `/challenges/${str(meta.challengeId)}`
      : null,
    Engagement: refId ? `/engagements/${refId}` : null,
  };
  return { label, href: hrefs[type] };
}

// ---------------------------------------------------------------------------
// Derived system events
// ---------------------------------------------------------------------------

type Named = { id: string; name: string };

/** Minimal shapes the derivation needs (mirrors the selects in loadDerivedSource). */
export interface DerivedSource {
  startup: {
    id: string;
    createdAt: Date;
    screenedAt: Date | null;
    screenSummary: string | null;
    screenRecommendation: Recommendation | null;
    screenedBy: Named | null;
  };
  evaluations: {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    overallScore: number;
    evaluator: Named;
  }[];
  partnerReviews: {
    id: string;
    updatedAt: Date;
    verdict: PartnerVerdict;
    partner: Named & { company: string | null };
    challenge: { title: string } | null;
  }[];
  pushes: {
    id: string;
    createdAt: Date;
    partner: Named & { company: string | null };
    pushedBy: Named;
  }[];
  reminders: {
    id: string;
    createdAt: Date;
    dueAt: Date;
    sentAt: Date | null;
    status: ReminderStatus;
    partner: Named & { company: string | null };
  }[];
  engagements: {
    id: string;
    createdAt: Date;
    title: string;
    status: EngagementStatus;
    partner: Named & { company: string | null };
    createdBy: Named;
  }[];
  bookings: {
    id: string;
    createdAt: Date;
    status: BookingStatus;
    program: { title: string } | null;
    mentor: { name: string } | null;
    offering: { title: string } | null;
  }[];
  introRequests: {
    id: string;
    createdAt: Date;
    status: IntroStatus;
    investor: Named & { company: string | null };
  }[];
  applications: {
    id: string;
    createdAt: Date;
    status: ApplicationStatus;
    challenge: { id: string; title: string };
  }[];
  matches: {
    id: string;
    updatedAt: Date;
    contactStatus: MatchContactStatus;
    updatedById: string | null;
    partner: { name: string };
    batch: { name: string };
  }[];
  partnerVotes: {
    id: string;
    updatedAt: Date;
    interested: boolean | null;
    voter: Named;
    partner: { name: string };
  }[];
  updates: { id: string; createdAt: Date; title: string; authorId: string }[];
  batchStartups: {
    id: string;
    createdAt: Date;
    addedById: string | null;
    batch: { id: string; name: string };
  }[];
}

const orgName = (u: { name: string; company: string | null }) =>
  u.company ?? u.name;

/** Evaluation edits within this window of creation count as "created". */
const EDIT_GRACE_MS = 60 * 1000;

export function deriveSystemEvents(src: DerivedSource): DerivedEvent[] {
  const s = src.startup;
  const events: DerivedEvent[] = [];
  const push = (e: Omit<DerivedEvent, "kind">) =>
    events.push({ kind: "system", ...e });

  push({
    key: `startup-created:${s.id}`,
    occurredAt: s.createdAt,
    label: "Startup angelegt",
    detail: null,
    href: null,
    actorId: null,
  });

  if (s.screenedAt) {
    const rec = s.screenRecommendation
      ? RECOMMENDATION_LABELS[s.screenRecommendation]
      : null;
    push({
      key: `screening:${s.id}`,
      occurredAt: s.screenedAt,
      label: s.screenedBy
        ? `Erst-Einordnung durch ${s.screenedBy.name}`
        : "Erst-Einordnung erfasst",
      detail:
        [rec, s.screenSummary ? truncate(s.screenSummary, 120) : null]
          .filter(Boolean)
          .join(": ") || null,
      href: `/startups/${s.id}`,
      actorId: s.screenedBy?.id ?? null,
    });
  }

  for (const e of src.evaluations) {
    push({
      key: `evaluation-created:${e.id}`,
      occurredAt: e.createdAt,
      label: `Bewertung gestartet von ${e.evaluator.name}`,
      detail: null,
      href: `/evaluations/${e.id}`,
      actorId: e.evaluator.id,
    });
    if (e.updatedAt.getTime() - e.createdAt.getTime() > EDIT_GRACE_MS) {
      push({
        key: `evaluation-updated:${e.id}`,
        occurredAt: e.updatedAt,
        label: `Bewertung aktualisiert von ${e.evaluator.name}`,
        detail: `Score ${e.overallScore.toFixed(1)}`,
        href: `/evaluations/${e.id}`,
        actorId: e.evaluator.id,
      });
    }
  }

  for (const r of src.partnerReviews) {
    push({
      key: `partner-review:${r.id}`,
      occurredAt: r.updatedAt,
      label: `Partner-Verdikt von ${orgName(r.partner)}: ${PARTNER_VERDICT_LABELS[r.verdict]}`,
      detail: r.challenge ? `Use-Case: ${r.challenge.title}` : null,
      href: null,
      actorId: r.partner.id,
    });
  }

  for (const p of src.pushes) {
    push({
      key: `push:${p.id}`,
      occurredAt: p.createdAt,
      label: `An ${orgName(p.partner)} gepusht von ${p.pushedBy.name}`,
      detail: null,
      href: "/pushes",
      actorId: p.pushedBy.id,
    });
  }

  for (const r of src.reminders) {
    push({
      key: `check-in:${r.id}`,
      occurredAt: r.sentAt ?? r.createdAt,
      label: `Check-in-Erinnerung an ${orgName(r.partner)}: ${REMINDER_STATUS_LABELS[r.status]}`,
      detail: r.sentAt ? null : `Fällig am ${formatLogDate(r.dueAt)}`,
      href: "/check-ins",
      actorId: null,
    });
  }

  for (const e of src.engagements) {
    push({
      key: `engagement:${e.id}`,
      occurredAt: e.createdAt,
      label: `Engagement „${e.title}“ mit ${orgName(e.partner)} angelegt`,
      detail: `Status: ${ENGAGEMENT_STATUS_LABELS[e.status]}`,
      href: `/engagements/${e.id}`,
      actorId: e.createdBy.id,
    });
  }

  for (const b of src.bookings) {
    const target =
      b.program?.title ?? b.mentor?.name ?? b.offering?.title ?? "Angebot";
    push({
      key: `booking:${b.id}`,
      occurredAt: b.createdAt,
      label: `Venture-Store-Anfrage: ${target}`,
      detail: `Status: ${BOOKING_STATUS_LABELS[b.status]}`,
      href: "/marketplace",
      actorId: null,
    });
  }

  for (const i of src.introRequests) {
    push({
      key: `intro:${i.id}`,
      occurredAt: i.createdAt,
      label: `Intro-Anfrage von ${orgName(i.investor)}`,
      detail: `Status: ${INTRO_STATUS_LABELS[i.status]}`,
      href: "/intros",
      actorId: null,
    });
  }

  for (const a of src.applications) {
    push({
      key: `application:${a.id}`,
      occurredAt: a.createdAt,
      label: `Bewerbung auf Challenge „${a.challenge.title}“`,
      detail: `Status: ${APPLICATION_STATUS_LABELS[a.status]}`,
      href: `/challenges/${a.challenge.id}`,
      actorId: null,
    });
  }

  for (const m of src.matches) {
    if (m.contactStatus === "NONE") continue;
    push({
      key: `match:${m.id}`,
      occurredAt: m.updatedAt,
      label: `Match-Matrix ${m.partner.name} (${m.batch.name}): ${MATCH_CONTACT_STATUS_LABELS[m.contactStatus]}`,
      detail: null,
      href: "/match-matrix",
      actorId: m.updatedById,
    });
  }

  for (const v of src.partnerVotes) {
    const vote =
      v.interested === null ? "offen" : v.interested ? "Interesse" : "kein Interesse";
    push({
      key: `vote:${v.id}`,
      occurredAt: v.updatedAt,
      label: `Partner-Vote ${v.voter.name} (${v.partner.name}): ${vote}`,
      detail: null,
      href: "/match-matrix",
      actorId: v.voter.id,
    });
  }

  for (const u of src.updates) {
    push({
      key: `update:${u.id}`,
      occurredAt: u.createdAt,
      label: `Update veröffentlicht: ${u.title}`,
      detail: null,
      href: "/feed",
      actorId: u.authorId,
    });
  }

  for (const b of src.batchStartups) {
    push({
      key: `batch:${b.id}`,
      occurredAt: b.createdAt,
      label: `Zu Batch „${b.batch.name}“ hinzugefügt`,
      detail: null,
      href: `/batches/${b.batch.id}`,
      actorId: b.addedById,
    });
  }

  return events;
}

const itemKey = (i: TimelineItem) => (i.kind === "entry" ? i.id : i.key);

/** Newest first; ties broken by key so the order is deterministic. */
export function mergeTimeline(
  entries: LogEntryView[],
  events: DerivedEvent[]
): TimelineItem[] {
  return [...entries, ...events].sort((a, b) => {
    const diff = b.occurredAt.getTime() - a.occurredAt.getTime();
    if (diff !== 0) return diff;
    return itemKey(a) < itemKey(b) ? -1 : itemKey(a) > itemKey(b) ? 1 : 0;
  });
}

// ---------------------------------------------------------------------------
// Filters (server-side; free-text search runs client-side)
// ---------------------------------------------------------------------------

export type LogSourceFilter = "all" | "manual" | "system";

export interface LogFilters {
  types: LogEntryType[];
  source: LogSourceFilter;
  authorId: string | null;
}

const FILTERABLE_TYPES = new Set<string>([...LOG_ENTRY_MANUAL_TYPES, "SYSTEM"]);

/** Parses URL search params (`?type=CALL&type=MEETING&source=manual&author=…`). */
export function parseLogFilters(
  params: Record<string, string | string[] | undefined>
): LogFilters {
  const raw = params.type;
  const list = Array.isArray(raw) ? raw : raw ? raw.split(",") : [];
  const types = list.filter((t): t is LogEntryType => FILTERABLE_TYPES.has(t));
  const source =
    params.source === "manual" || params.source === "system"
      ? params.source
      : "all";
  const author = typeof params.author === "string" ? params.author : null;
  return { types, source, authorId: author || null };
}

export function filterTimeline(
  items: TimelineItem[],
  filters: LogFilters
): TimelineItem[] {
  return items.filter((item) => {
    const isSystem = item.kind === "system" || item.source === "SYSTEM";
    if (filters.source === "manual" && isSystem) return false;
    if (filters.source === "system" && !isSystem) return false;
    if (filters.types.length > 0) {
      const type = item.kind === "system" ? "SYSTEM" : item.type;
      if (!filters.types.includes(type)) return false;
    }
    if (filters.authorId) {
      const actor = item.kind === "system" ? item.actorId : item.author?.id;
      if (actor !== filters.authorId) return false;
    }
    return true;
  });
}

// ---------------------------------------------------------------------------
// Queries (all ADMIN-gated)
// ---------------------------------------------------------------------------

const userSelect = { select: { id: true, name: true } } as const;

async function loadEntries(
  startupId: string,
  viewerId: string,
  take?: number
): Promise<LogEntryView[]> {
  const rows = await prisma.startupLogEntry.findMany({
    where: { startupId, deletedAt: null },
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    take,
    include: {
      author: userSelect,
      followUpAssignee: userSelect,
      comments: {
        where: { deletedAt: null },
        orderBy: { createdAt: "asc" },
        include: { author: userSelect },
      },
    },
  });
  return rows.map((r) => ({
    kind: "entry",
    id: r.id,
    type: r.type,
    source: r.source,
    occurredAt: r.occurredAt,
    createdAt: r.createdAt,
    editedAt: r.editedAt,
    title: r.title,
    body: r.body,
    contactIds: r.contactIds,
    teamParticipantIds: r.teamParticipantIds,
    externalParticipants: r.externalParticipants,
    nextStep: r.nextStep,
    followUpAt: r.followUpAt,
    followUpDoneAt: r.followUpDoneAt,
    followUpAssignee: r.followUpAssignee,
    pinnedAt: r.pinnedAt,
    author: r.author,
    canEdit: canEditEntry(r, viewerId),
    context: describeLogContext(r.refType, r.refId, r.metadata),
    comments: r.comments.map((c) => ({
      id: c.id,
      body: c.body,
      createdAt: c.createdAt,
      editedAt: c.editedAt,
      author: c.author,
      canEdit: canEditComment(c, viewerId),
    })),
  }));
}

const partnerSelect = {
  select: { id: true, name: true, company: true },
} as const;

async function loadDerivedSource(
  startupId: string
): Promise<DerivedSource | null> {
  const startup = await prisma.startup.findUnique({
    where: { id: startupId },
    select: {
      id: true,
      createdAt: true,
      screenedAt: true,
      screenSummary: true,
      screenRecommendation: true,
      screenedBy: userSelect,
      evaluations: {
        select: {
          id: true,
          createdAt: true,
          updatedAt: true,
          overallScore: true,
          evaluator: userSelect,
        },
      },
      partnerReviews: {
        select: {
          id: true,
          updatedAt: true,
          verdict: true,
          partner: partnerSelect,
          challenge: { select: { title: true } },
        },
      },
      pushes: {
        select: {
          id: true,
          createdAt: true,
          partner: partnerSelect,
          pushedBy: userSelect,
        },
      },
      reminders: {
        select: {
          id: true,
          createdAt: true,
          dueAt: true,
          sentAt: true,
          status: true,
          partner: partnerSelect,
        },
      },
      engagements: {
        select: {
          id: true,
          createdAt: true,
          title: true,
          status: true,
          partner: partnerSelect,
          createdBy: userSelect,
        },
      },
      bookings: {
        select: {
          id: true,
          createdAt: true,
          status: true,
          program: { select: { title: true } },
          mentor: { select: { name: true } },
          offering: { select: { title: true } },
        },
      },
      introRequests: {
        select: {
          id: true,
          createdAt: true,
          status: true,
          investor: partnerSelect,
        },
      },
      applications: {
        select: {
          id: true,
          createdAt: true,
          status: true,
          challenge: { select: { id: true, title: true } },
        },
      },
      matches: {
        select: {
          id: true,
          updatedAt: true,
          contactStatus: true,
          updatedById: true,
          partner: { select: { name: true } },
          batch: { select: { name: true } },
        },
      },
      partnerVotes: {
        select: {
          id: true,
          updatedAt: true,
          interested: true,
          voter: userSelect,
          partner: { select: { name: true } },
        },
      },
      updates: {
        select: { id: true, createdAt: true, title: true, authorId: true },
      },
      batchStartups: {
        select: {
          id: true,
          createdAt: true,
          addedById: true,
          batch: { select: { id: true, name: true } },
        },
      },
    },
  });
  if (!startup) return null;
  const {
    evaluations,
    partnerReviews,
    pushes,
    reminders,
    engagements,
    bookings,
    introRequests,
    applications,
    matches,
    partnerVotes,
    updates,
    batchStartups,
    ...core
  } = startup;
  return {
    startup: core,
    evaluations,
    partnerReviews,
    pushes,
    reminders,
    engagements,
    bookings,
    introRequests,
    applications,
    matches,
    partnerVotes,
    updates,
    batchStartups,
  };
}

export interface LogbookData {
  viewerId: string;
  startup: { id: string; name: string };
  contacts: { id: string; name: string; position: string | null }[];
  admins: LogUser[];
  entries: LogEntryView[];
  events: DerivedEvent[];
}

/** Full logbook for one startup, or null if the startup does not exist. */
export async function getLogbook(startupId: string): Promise<LogbookData | null> {
  const session = await requireAdmin();
  const startup = await prisma.startup.findUnique({
    where: { id: startupId },
    select: {
      id: true,
      name: true,
      contacts: {
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, position: true },
      },
    },
  });
  if (!startup) return null;

  const [entries, source, admins] = await Promise.all([
    loadEntries(startupId, session.user.id),
    loadDerivedSource(startupId),
    prisma.user.findMany({
      where: { role: "ADMIN", isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return {
    viewerId: session.user.id,
    startup: { id: startup.id, name: startup.name },
    contacts: startup.contacts,
    admins,
    entries,
    events: source ? deriveSystemEvents(source) : [],
  };
}

export interface LogbookTeaser {
  recent: {
    id: string;
    type: LogEntryType;
    title: string | null;
    body: string;
    occurredAt: Date;
    authorName: string | null;
  }[];
  openFollowUps: number;
  lastContactAt: Date | null;
}

/** Compact summary for the startup detail page (ADMIN only). */
export async function getLogbookTeaser(
  startupId: string
): Promise<LogbookTeaser> {
  await requireAdmin();
  const base = { startupId, deletedAt: null };
  const [recent, openFollowUps, lastManual] = await Promise.all([
    prisma.startupLogEntry.findMany({
      where: base,
      orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
      take: 3,
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        occurredAt: true,
        author: { select: { name: true } },
      },
    }),
    prisma.startupLogEntry.count({
      where: { ...base, nextStep: { not: null }, followUpDoneAt: null },
    }),
    prisma.startupLogEntry.findFirst({
      where: { ...base, source: "MANUAL" },
      orderBy: { occurredAt: "desc" },
      select: { occurredAt: true },
    }),
  ]);
  return {
    recent: recent.map(({ author, ...r }) => ({
      ...r,
      authorName: author?.name ?? null,
    })),
    openFollowUps,
    lastContactAt: lastManual?.occurredAt ?? null,
  };
}

/** Open follow-ups (next step not done), soonest due first, undated last. */
export function openFollowUps(entries: LogEntryView[]): LogEntryView[] {
  return entries
    .filter((e) => e.nextStep && !e.followUpDoneAt)
    .sort((a, b) => {
      const at = a.followUpAt?.getTime() ?? Number.POSITIVE_INFINITY;
      const bt = b.followUpAt?.getTime() ?? Number.POSITIVE_INFINITY;
      return at - bt;
    });
}

// ---------------------------------------------------------------------------
// Cross-platform surfaces (lists, drawer, dashboard). ADMIN-gated like above;
// callers on team pages must only invoke these for ADMIN sessions.
// ---------------------------------------------------------------------------

export interface LogListMeta {
  count: number;
  openFollowUps: number;
  lastContactAt: Date | null;
  nextFollowUpAt: Date | null;
  overdue: boolean;
}

/**
 * Indicator data for many startups at once: four grouped aggregates, no
 * per-startup queries. Startups without entries are absent from the map.
 */
export async function getLogbookListMeta(
  startupIds: string[],
  now: Date = new Date()
): Promise<Map<string, LogListMeta>> {
  await requireAdmin();
  const result = new Map<string, LogListMeta>();
  if (startupIds.length === 0) return result;

  const base = { startupId: { in: startupIds }, deletedAt: null };
  const openWhere = { ...base, nextStep: { not: null }, followUpDoneAt: null };
  const [counts, lastContacts, open, nextDue] = await Promise.all([
    prisma.startupLogEntry.groupBy({
      by: ["startupId"],
      where: base,
      _count: { _all: true },
    }),
    prisma.startupLogEntry.groupBy({
      by: ["startupId"],
      where: { ...base, source: "MANUAL" },
      _max: { occurredAt: true },
    }),
    prisma.startupLogEntry.groupBy({
      by: ["startupId"],
      where: openWhere,
      _count: { _all: true },
    }),
    prisma.startupLogEntry.groupBy({
      by: ["startupId"],
      where: { ...openWhere, followUpAt: { not: null } },
      _min: { followUpAt: true },
    }),
  ]);

  const get = (id: string) => {
    let m = result.get(id);
    if (!m) {
      m = {
        count: 0,
        openFollowUps: 0,
        lastContactAt: null,
        nextFollowUpAt: null,
        overdue: false,
      };
      result.set(id, m);
    }
    return m;
  };
  for (const c of counts) get(c.startupId).count = c._count._all;
  for (const l of lastContacts) get(l.startupId).lastContactAt = l._max.occurredAt;
  for (const o of open) get(o.startupId).openFollowUps = o._count._all;
  for (const n of nextDue) {
    const m = get(n.startupId);
    m.nextFollowUpAt = n._min.followUpAt;
    m.overdue = !!n._min.followUpAt && n._min.followUpAt < now;
  }
  return result;
}

/** Plain object form of the list meta, for passing into client components. */
export function logMetaRecord(
  map: Map<string, LogListMeta>
): Record<string, LogListMeta> {
  return Object.fromEntries(map);
}

export interface LogDrawerData {
  startup: { id: string; name: string };
  entries: LogEntryView[];
  meta: LogListMeta | null;
}

/** Latest entries for the side drawer (no derived events, no admin list). */
export async function getLogDrawerData(
  startupId: string,
  take = 8
): Promise<LogDrawerData | null> {
  const session = await requireAdmin();
  const startup = await prisma.startup.findUnique({
    where: { id: startupId },
    select: { id: true, name: true },
  });
  if (!startup) return null;
  const [entries, meta] = await Promise.all([
    loadEntries(startupId, session.user.id, take),
    getLogbookListMeta([startupId]),
  ]);
  return { startup, entries, meta: meta.get(startupId) ?? null };
}

export interface DashboardFollowUp {
  id: string;
  startupId: string;
  startupName: string;
  nextStep: string;
  followUpAt: Date | null;
  assignee: LogUser | null;
  mine: boolean;
  overdue: boolean;
}

export interface StaleStartup {
  id: string;
  name: string;
  pipelineStage: PipelineStage;
  lastContactAt: Date | null;
}

/** Mine first, then by due date (undated last). Pure; unit-tested. */
export function sortDashboardFollowUps(
  list: DashboardFollowUp[]
): DashboardFollowUp[] {
  return [...list].sort((a, b) => {
    if (a.mine !== b.mine) return a.mine ? -1 : 1;
    const at = a.followUpAt?.getTime() ?? Number.POSITIVE_INFINITY;
    const bt = b.followUpAt?.getTime() ?? Number.POSITIVE_INFINITY;
    return at - bt;
  });
}

/**
 * Active startups whose last manual entry is older than `days` (or missing),
 * never-contacted first, then the longest silence. Pure; unit-tested.
 */
export function pickStaleStartups(
  startups: { id: string; name: string; pipelineStage: PipelineStage }[],
  lastContact: Map<string, Date>,
  now: Date,
  days = LOG_STALE_DAYS
): StaleStartup[] {
  const cutoff = now.getTime() - days * 24 * 60 * 60 * 1000;
  return startups
    .map((s) => ({ ...s, lastContactAt: lastContact.get(s.id) ?? null }))
    .filter((s) => !s.lastContactAt || s.lastContactAt.getTime() < cutoff)
    .sort(
      (a, b) =>
        (a.lastContactAt?.getTime() ?? 0) - (b.lastContactAt?.getTime() ?? 0)
    );
}

export interface LogDashboardData {
  followUps: DashboardFollowUp[];
  followUpTotal: number;
  stale: StaleStartup[];
  staleTotal: number;
}

/** "Offene Follow-ups" + "Lange kein Kontakt" for the admin dashboard. */
export async function getLogDashboard(
  limit = 8,
  now: Date = new Date()
): Promise<LogDashboardData> {
  const session = await requireAdmin();
  const viewerId = session.user.id;

  const [openRows, followUpTotal, active] = await Promise.all([
    prisma.startupLogEntry.findMany({
      where: { deletedAt: null, nextStep: { not: null }, followUpDoneAt: null },
      orderBy: [{ followUpAt: { sort: "asc", nulls: "last" } }],
      take: 100,
      select: {
        id: true,
        startupId: true,
        nextStep: true,
        followUpAt: true,
        followUpAssignee: userSelect,
        startup: { select: { name: true } },
      },
    }),
    prisma.startupLogEntry.count({
      where: { deletedAt: null, nextStep: { not: null }, followUpDoneAt: null },
    }),
    prisma.startup.findMany({
      where: { pipelineStage: { in: LOG_ACTIVE_STAGES } },
      select: { id: true, name: true, pipelineStage: true },
    }),
  ]);

  const lastRows =
    active.length === 0
      ? []
      : await prisma.startupLogEntry.groupBy({
          by: ["startupId"],
          where: {
            startupId: { in: active.map((s) => s.id) },
            deletedAt: null,
            source: "MANUAL",
          },
          _max: { occurredAt: true },
        });
  const lastContact = new Map<string, Date>();
  for (const r of lastRows) {
    if (r._max.occurredAt) lastContact.set(r.startupId, r._max.occurredAt);
  }
  const stale = pickStaleStartups(active, lastContact, now);

  const followUps = sortDashboardFollowUps(
    openRows.map((r) => ({
      id: r.id,
      startupId: r.startupId,
      startupName: r.startup.name,
      nextStep: r.nextStep ?? "",
      followUpAt: r.followUpAt,
      assignee: r.followUpAssignee,
      mine: r.followUpAssignee?.id === viewerId,
      overdue: !!r.followUpAt && r.followUpAt < now,
    }))
  );

  return {
    followUps: followUps.slice(0, limit),
    followUpTotal,
    stale: stale.slice(0, limit),
    staleTotal: stale.length,
  };
}
