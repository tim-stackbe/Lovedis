import { z } from "zod";
import {
  BookingStatus,
  ChallengeStatus,
  MarketplaceOfferingType,
  PipelineStage,
} from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import type { McpContext } from "@/lib/mcp/auth";
import { loadInsightsDataset } from "@/lib/insights/data";
import {
  PILOT_SOURCE_LABELS,
  buildPilotIndex,
  dataQuality,
  industryBreakdown,
  isQualifiedMatch,
  pairKey,
  partnerDetail,
  partnersInBatch,
  startupDetail,
  startupsInBatch,
  summarizeBatch,
  summarizePortfolio,
  type InsightsDataset,
} from "@/lib/insights/metrics";
import { effectiveStage, stageRank } from "@/lib/insights/stages";
import {
  summarizeBatchReporting,
  summarizeOneOnOne,
  trackingDataQuality,
} from "@/lib/insights/tracking";

// ---------------------------------------------------------------------------
// Read-only MCP tools over the platform data. Every tool only reads; team
// tools mirror what ADMIN and MEMBER see in the app, admin tools mirror the
// requireAdmin areas (Insights, Logbuch). Contact e-mail/phone, booking
// contact data and anything credential-like are never returned.
// ---------------------------------------------------------------------------

/** Shown on the consent screen; keep in sync with the tools below. */
export const MCP_AREAS_TEAM = [
  "Startups (Profil, Bewertungen, Kontakte ohne E-Mail und Telefon)",
  "Batches, Match-Matrix und Partner-Unternehmen",
  "Challenges, Bewerbungen, PoCs und Engagements",
  "Venture Store, Buchungen und Credits",
  "Startup-Updates",
];
export const MCP_AREAS_ADMIN = [
  "Insights-KPIs, Pipeline-Tracking und Pilot-Diagnose (nur Admin)",
  "Logbuch (nur Admin)",
];

/** A user-facing tool failure (not found, ambiguous); returned as isError. */
export class ToolError extends Error {}

type Shape = Record<string, z.ZodType>;

export interface ToolDef<S extends Shape = Shape> {
  name: string;
  title: string;
  description: string;
  input: S;
  adminOnly?: boolean;
  run: (args: z.infer<z.ZodObject<S>>, ctx: McpContext) => Promise<unknown>;
}

function tool<S extends Shape>(def: ToolDef<S>): ToolDef {
  return def as unknown as ToolDef;
}

export function clip(text: string | null | undefined, max = 1500): string | null {
  if (text == null) return null;
  return text.length > max ? `${text.slice(0, max)} [gekürzt]` : text;
}

const limit = (fallback: number, max: number) =>
  z.number().int().min(1).max(max).default(fallback).describe(`Max. Anzahl (1 bis ${max})`);

const startupRef = z
  .string()
  .min(1)
  .describe("Startup-ID oder Name (Teilname reicht, wenn eindeutig)");
const batchRef = z.string().min(1).describe("Batch-ID oder Name");
const partnerRef = z
  .string()
  .min(1)
  .describe("Partner-Unternehmen (Matrix-Spalte): ID oder Name");

interface Named {
  id: string;
  name: string;
}

/** Exact id, exact name, or a unique partial name match. */
export function pickByRef<T extends Named>(items: T[], ref: string, what: string): T {
  const needle = ref.trim().toLowerCase();
  const exact =
    items.find((i) => i.id === ref.trim()) ??
    items.find((i) => i.name.toLowerCase() === needle);
  if (exact) return exact;
  const partial = items.filter((i) => i.name.toLowerCase().includes(needle));
  if (partial.length === 1) return partial[0];
  if (partial.length > 1) {
    const options = partial
      .slice(0, 10)
      .map((p) => `${p.name} (${p.id})`)
      .join(", ");
    throw new ToolError(`${what} „${ref}“ ist mehrdeutig: ${options}`);
  }
  throw new ToolError(`${what} „${ref}“ nicht gefunden.`);
}

async function resolveStartup(ref: string): Promise<Named> {
  const byId = await prisma.startup.findUnique({
    where: { id: ref.trim() },
    select: { id: true, name: true },
  });
  if (byId) return byId;
  const candidates = await prisma.startup.findMany({
    where: { name: { contains: ref.trim(), mode: "insensitive" } },
    select: { id: true, name: true },
    take: 20,
  });
  return pickByRef(candidates, ref, "Startup");
}

async function resolveBatch(ref: string): Promise<Named> {
  const batches = await prisma.scoutingCampaign.findMany({
    select: { id: true, name: true },
  });
  return pickByRef(batches, ref, "Batch");
}

async function resolvePartner(ref: string): Promise<Named> {
  const partners = await prisma.partnerCompany.findMany({
    select: { id: true, name: true },
  });
  return pickByRef(partners, ref, "Partner-Unternehmen");
}

const userName = { select: { name: true } } as const;
const userNameCompany = { select: { name: true, company: true } } as const;

// --- Team tools (ADMIN + MEMBER) ------------------------------------------------

const searchStartups = tool({
  name: "search_startups",
  title: "Startups suchen",
  description:
    "Durchsucht die Startup-Datenbank nach Name, Beschreibung, Tagline oder Branche. Filter für Branche, Pipeline-Status und Batch. Liefert Kurzprofile mit ID für get_startup.",
  input: {
    query: z.string().optional().describe("Suchbegriff (leer = alle)"),
    industry: z.string().optional().describe("Branche (enthält, ohne Groß/Klein)"),
    pipelineStage: z.enum(PipelineStage).optional(),
    batch: batchRef.optional(),
    limit: limit(25, 100),
  },
  async run({ query, industry, pipelineStage, batch, limit: take }) {
    const batchId = batch ? (await resolveBatch(batch)).id : undefined;
    const q = query?.trim();
    const where = {
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              { description: { contains: q, mode: "insensitive" as const } },
              { tagline: { contains: q, mode: "insensitive" as const } },
              { industry: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
      ...(industry ? { industry: { contains: industry, mode: "insensitive" as const } } : {}),
      ...(pipelineStage ? { pipelineStage } : {}),
      ...(batchId ? { batchStartups: { some: { batchId } } } : {}),
    };
    const [total, startups] = await Promise.all([
      prisma.startup.count({ where }),
      prisma.startup.findMany({
        where,
        orderBy: { name: "asc" },
        take,
        select: {
          id: true,
          name: true,
          tagline: true,
          industry: true,
          city: true,
          country: true,
          stage: true,
          pipelineStage: true,
          radarQuadrant: true,
          radarRing: true,
          screenRecommendation: true,
          website: true,
          updatedAt: true,
        },
      }),
    ]);
    return { total, returned: startups.length, startups };
  },
});

const getStartup = tool({
  name: "get_startup",
  title: "Startup-Profil",
  description:
    "Vollständiges Profil eines Startups: Stammdaten, Screening, Bewertungen mit Scores, Kontakte (Name und Position), Batches, Challenge-Bewerbungen, Engagements, Partner-Reviews und Credit-Stand.",
  input: { startup: startupRef },
  async run({ startup }) {
    const { id } = await resolveStartup(startup);
    const s = await prisma.startup.findUnique({
      where: { id },
      include: {
        screenedBy: userName,
        contacts: { select: { name: true, position: true }, orderBy: { createdAt: "asc" } },
        attachments: { select: { name: true, url: true, type: true } },
        evaluations: {
          orderBy: { createdAt: "desc" },
          select: {
            overallScore: true,
            recommendation: true,
            notes: true,
            createdAt: true,
            evaluator: userName,
            scores: { select: { dimension: true, value: true } },
          },
        },
        batchStartups: { select: { batch: { select: { id: true, name: true, type: true } } } },
        applications: {
          select: {
            status: true,
            createdAt: true,
            challenge: { select: { id: true, title: true } },
            poc: { select: { title: true, status: true } },
          },
        },
        engagements: {
          select: {
            title: true,
            status: true,
            startDate: true,
            endDate: true,
            partner: userNameCompany,
          },
        },
        partnerReviews: {
          select: { verdict: true, note: true, updatedAt: true, partner: userNameCompany },
        },
        creditAccount: { select: { balance: true, fixBalance: true, flexBalance: true } },
      },
    });
    if (!s) throw new ToolError("Startup nicht gefunden.");
    return {
      id: s.id,
      name: s.name,
      tagline: s.tagline,
      website: s.website,
      description: clip(s.description, 4000),
      publicPitch: clip(s.publicPitch, 2000),
      industry: s.industry,
      city: s.city,
      country: s.country,
      foundedYear: s.foundedYear,
      teamSize: s.teamSize,
      stage: s.stage,
      fundingRaisedEurM: s.fundingRaised,
      seekingFunding: s.seekingFunding,
      seekingAmountEurM: s.seekingAmount,
      lookingFor: s.lookingFor,
      pipelineStage: s.pipelineStage,
      radar: { quadrant: s.radarQuadrant, ring: s.radarRing },
      source: { type: s.sourceType, detail: s.sourceDetail },
      screening: {
        recommendation: s.screenRecommendation,
        summary: clip(s.screenSummary, 2000),
        screenedAt: s.screenedAt,
        screenedBy: s.screenedBy?.name ?? null,
      },
      isPublished: s.isPublished,
      contacts: s.contacts,
      attachments: s.attachments,
      evaluations: s.evaluations.map((e) => ({
        evaluator: e.evaluator.name,
        overallScore: e.overallScore,
        recommendation: e.recommendation,
        scores: e.scores,
        notes: clip(e.notes, 1000),
        createdAt: e.createdAt,
      })),
      batches: s.batchStartups.map((b) => b.batch),
      applications: s.applications,
      engagements: s.engagements,
      partnerReviews: s.partnerReviews.map((r) => ({ ...r, note: clip(r.note, 800) })),
      credits: s.creditAccount,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    };
  },
});

const listBatches = tool({
  name: "list_batches",
  title: "Batches",
  description: "Alle Batches (Programme/Kohorten) mit Typ, Zeitraum und Anzahl Startups, Partner und Matrix-Zellen.",
  input: {},
  async run() {
    const batches = await prisma.scoutingCampaign.findMany({
      orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        type: true,
        description: true,
        startDate: true,
        endDate: true,
        _count: { select: { batchStartups: true, batchPartners: true, matches: true } },
      },
    });
    return batches.map(({ _count, description, ...b }) => ({
      ...b,
      description: clip(description, 500),
      startups: _count.batchStartups,
      partners: _count.batchPartners,
      matrixCells: _count.matches,
    }));
  },
});

const getBatch = tool({
  name: "get_batch",
  title: "Batch-Details",
  description: "Ein Batch mit allen Startups (inkl. Pipeline-Status) und Partner-Unternehmen.",
  input: { batch: batchRef },
  async run({ batch }) {
    const { id } = await resolveBatch(batch);
    const b = await prisma.scoutingCampaign.findUnique({
      where: { id },
      include: {
        batchStartups: {
          select: {
            startup: {
              select: { id: true, name: true, industry: true, city: true, pipelineStage: true },
            },
          },
        },
        batchPartners: {
          orderBy: { sortOrder: "asc" },
          select: { partnerCompany: { select: { id: true, name: true } } },
        },
      },
    });
    if (!b) throw new ToolError("Batch nicht gefunden.");
    return {
      id: b.id,
      name: b.name,
      type: b.type,
      description: clip(b.description, 2000),
      startDate: b.startDate,
      endDate: b.endDate,
      startups: b.batchStartups
        .map((s) => s.startup)
        .sort((x, y) => x.name.localeCompare(y.name, "de")),
      partners: b.batchPartners.map((p) => p.partnerCompany),
    };
  },
});

const getMatchMatrix = tool({
  name: "get_match_matrix",
  title: "Match-Matrix",
  description:
    "Zellen der Match-Matrix eines Batches (Startup × Partner-Unternehmen): Relevanz beider Seiten, Top-Match (beide „Hoch“), Kontaktstatus (z. B. PILOT_AGREED), Use-Cases, Folgegespräch, Partner-Votes und Notizen. Optional auf ein Startup oder einen Partner filtern.",
  input: {
    batch: batchRef,
    startup: startupRef.optional(),
    partner: partnerRef.optional(),
    onlyRated: z
      .boolean()
      .default(true)
      .describe("Nur Zellen, die mindestens eine Seite bewertet oder bearbeitet hat"),
    limit: limit(200, 500),
  },
  async run({ batch, startup, partner, onlyRated, limit: take }) {
    const batchRow = await resolveBatch(batch);
    const startupId = startup ? (await resolveStartup(startup)).id : undefined;
    const partnerId = partner ? (await resolvePartner(partner)).id : undefined;
    const cells = await prisma.partnerStartupMatch.findMany({
      where: {
        batchId: batchRow.id,
        ...(startupId ? { startupId } : {}),
        ...(partnerId ? { partnerId } : {}),
        ...(onlyRated
          ? {
              OR: [
                { startupRelevance: { not: null } },
                { partnerRelevance: { not: null } },
                { contactStatus: { not: "NONE" as const } },
              ],
            }
          : {}),
      },
      take,
      include: {
        startup: { select: { id: true, name: true } },
        partner: { select: { id: true, name: true } },
      },
    });
    return {
      batch: batchRow,
      cells: cells
        .map((m) => ({
          startup: m.startup,
          partner: m.partner,
          startupRelevance: m.startupRelevance,
          partnerRelevance: m.partnerRelevance,
          topMatch: isQualifiedMatch(m),
          contactStatus: m.contactStatus,
          useCaseTypes: m.useCaseTypes,
          useCaseNote: clip(m.useCaseNote, 500),
          nextSteps: clip(m.nextSteps, 500),
          startupSide: {
            followUp: m.startupFollowUp,
            contacted: m.startupContacted,
            useCaseTypes: m.startupUseCaseTypes,
            openQuestions: clip(m.startupOpenQuestions, 500),
            notes: clip(m.startupNotes, 500),
          },
          partnerSide: {
            interested: m.partnerInterested,
            votesYes: m.partnerVotesYes,
            votesNo: m.partnerVotesNo,
            followUp: m.partnerFollowUp,
            contacted: m.partnerContacted,
            useCaseTypes: m.partnerUseCaseTypes,
            openQuestions: clip(m.partnerOpenQuestions, 500),
            notes: clip(m.partnerNotes, 500),
          },
          updatedAt: m.updatedAt,
        }))
        .sort(
          (a, b) =>
            a.startup.name.localeCompare(b.startup.name, "de") ||
            a.partner.name.localeCompare(b.partner.name, "de")
        ),
    };
  },
});

const listPartnerCompanies = tool({
  name: "list_partner_companies",
  title: "Partner-Unternehmen",
  description: "Alle Partner-Unternehmen (Spalten der Match-Matrix) mit ihren Batches.",
  input: {},
  async run() {
    const partners = await prisma.partnerCompany.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        companyId: true,
        batchPartners: { select: { batch: { select: { id: true, name: true } } } },
      },
    });
    return partners.map((p) => ({
      id: p.id,
      name: p.name,
      hasLinkedCompanyAccount: p.companyId !== null,
      batches: p.batchPartners.map((bp) => bp.batch),
    }));
  },
});

const listChallenges = tool({
  name: "list_challenges",
  title: "Challenges",
  description: "Challenges der Corporate-Partner mit Status, Deadline, Tags, Ersteller:in und Anzahl Bewerbungen.",
  input: { status: z.enum(ChallengeStatus).optional(), limit: limit(50, 200) },
  async run({ status, limit: take }) {
    const challenges = await prisma.challenge.findMany({
      where: status ? { status } : {},
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        title: true,
        status: true,
        deadline: true,
        tags: true,
        createdAt: true,
        createdBy: userNameCompany,
        _count: { select: { applications: true } },
      },
    });
    return challenges.map(({ _count, ...c }) => ({ ...c, applications: _count.applications }));
  },
});

const getChallenge = tool({
  name: "get_challenge",
  title: "Challenge mit Bewerbungen",
  description: "Eine Challenge mit Beschreibung, allen Bewerbungen (Pitch, Status) und zugehörigen PoCs.",
  input: { challengeId: z.string().min(1).describe("Challenge-ID (aus list_challenges)") },
  async run({ challengeId }) {
    const c = await prisma.challenge.findUnique({
      where: { id: challengeId },
      include: {
        createdBy: userNameCompany,
        applications: {
          orderBy: { createdAt: "asc" },
          select: {
            status: true,
            pitch: true,
            createdAt: true,
            startup: { select: { id: true, name: true } },
            poc: {
              select: { title: true, status: true, startDate: true, endDate: true, kpis: true },
            },
          },
        },
      },
    });
    if (!c) throw new ToolError("Challenge nicht gefunden.");
    return {
      id: c.id,
      title: c.title,
      status: c.status,
      deadline: c.deadline,
      tags: c.tags,
      createdBy: c.createdBy,
      description: clip(c.description, 4000),
      applications: c.applications.map((a) => ({ ...a, pitch: clip(a.pitch, 2500) })),
    };
  },
});

const listCollaborations = tool({
  name: "list_engagements_and_pocs",
  title: "Engagements und PoCs",
  description:
    "Laufende und vergangene Zusammenarbeiten: Engagements (Startup × Partner-Konto) und Challenge-PoCs, jeweils mit Status, Zeitraum, KPIs und Meilensteinen. Optional auf ein Startup filtern.",
  input: { startup: startupRef.optional(), limit: limit(50, 200) },
  async run({ startup, limit: take }) {
    const startupId = startup ? (await resolveStartup(startup)).id : undefined;
    const [engagements, pocs] = await Promise.all([
      prisma.engagement.findMany({
        where: startupId ? { startupId } : {},
        orderBy: { createdAt: "desc" },
        take,
        select: {
          id: true,
          title: true,
          status: true,
          startDate: true,
          endDate: true,
          kpis: true,
          milestones: true,
          notes: true,
          startup: { select: { id: true, name: true } },
          partner: userNameCompany,
        },
      }),
      prisma.poCPerformance.findMany({
        where: startupId ? { application: { startupId } } : {},
        orderBy: { createdAt: "desc" },
        take,
        select: {
          id: true,
          title: true,
          status: true,
          startDate: true,
          endDate: true,
          kpis: true,
          milestones: true,
          notes: true,
          trackedBy: userName,
          application: {
            select: {
              startup: { select: { id: true, name: true } },
              challenge: { select: { id: true, title: true, createdBy: userNameCompany } },
            },
          },
        },
      }),
    ]);
    return {
      engagements: engagements.map((e) => ({ ...e, notes: clip(e.notes, 800) })),
      pocs: pocs.map(({ application, trackedBy, notes, ...p }) => ({
        ...p,
        notes: clip(notes, 800),
        trackedBy: trackedBy.name,
        startup: application.startup,
        challenge: { id: application.challenge.id, title: application.challenge.title },
        partner: application.challenge.createdBy,
      })),
    };
  },
});

const listOfferings = tool({
  name: "list_venture_store_offerings",
  title: "Venture-Store-Angebote",
  description: "Angebote im Venture Store: Programme, Mentor:innen und Support-Angebote mit Credit-Preisen.",
  input: {
    type: z.enum(MarketplaceOfferingType).optional(),
    includeInactive: z.boolean().default(false),
  },
  async run({ type, includeInactive }) {
    const want = (t: string) => !type || type === t;
    const [programs, mentors, support] = await Promise.all([
      want("PROGRAM")
        ? prisma.program.findMany({
            where: includeInactive ? {} : { status: { not: "DRAFT" } },
            orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
            select: {
              id: true,
              title: true,
              summary: true,
              status: true,
              focusTags: true,
              format: true,
              sessionDate: true,
              sessions: true,
              comingSoon: true,
              fixCreditCost: true,
            },
          })
        : [],
      want("MENTOR_SESSION")
        ? prisma.mentorProfile.findMany({
            where: includeInactive ? {} : { isActive: true },
            orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
            select: {
              id: true,
              name: true,
              company: true,
              role: true,
              expertise: true,
              bio: true,
              creditCost: true,
              isActive: true,
            },
          })
        : [],
      want("SUPPORT")
        ? prisma.supportOffering.findMany({
            where: includeInactive ? {} : { isActive: true },
            orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
            select: {
              id: true,
              title: true,
              category: true,
              summary: true,
              format: true,
              providerCompany: true,
              sessionDate: true,
              creditCost: true,
              isActive: true,
            },
          })
        : [],
    ]);
    return {
      programs,
      mentors: mentors.map((m) => ({ ...m, bio: clip(m.bio, 500) })),
      support,
    };
  },
});

const listBookings = tool({
  name: "list_bookings",
  title: "Venture-Store-Buchungen",
  description:
    "Buchungen im Venture Store (Programme, Mentor-Sessions, Support) mit Status, Credits, Wunschtermin und Koordinations-Notiz. Ohne Kontakt-E-Mail.",
  input: {
    startup: startupRef.optional(),
    status: z.enum(BookingStatus).optional(),
    offeringType: z.enum(MarketplaceOfferingType).optional(),
    limit: limit(50, 200),
  },
  async run({ startup, status, offeringType, limit: take }) {
    const startupId = startup ? (await resolveStartup(startup)).id : undefined;
    const bookings = await prisma.marketplaceBooking.findMany({
      where: {
        ...(startupId ? { startupId } : {}),
        ...(status ? { status } : {}),
        ...(offeringType ? { offeringType } : {}),
      },
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        offeringType: true,
        status: true,
        message: true,
        preferredAt: true,
        creditCost: true,
        fixCreditCost: true,
        coordinatorNote: true,
        createdAt: true,
        startup: { select: { id: true, name: true } },
        requestedBy: userName,
        handledBy: userName,
        program: { select: { title: true } },
        mentor: { select: { name: true } },
        offering: { select: { title: true } },
      },
    });
    return bookings.map(({ program, mentor, offering, requestedBy, handledBy, ...b }) => ({
      ...b,
      message: clip(b.message, 600),
      coordinatorNote: clip(b.coordinatorNote, 600),
      item: program?.title ?? mentor?.name ?? offering?.title ?? null,
      requestedBy: requestedBy.name,
      handledBy: handledBy?.name ?? null,
    }));
  },
});

const getCreditAccount = tool({
  name: "get_credit_account",
  title: "Credit-Konto",
  description: "Credit-Stand eines Startups (gesamt, FIX, FLEX) und die letzten Buchungen auf dem Konto.",
  input: { startup: startupRef, limit: limit(30, 200) },
  async run({ startup, limit: take }) {
    const s = await resolveStartup(startup);
    const account = await prisma.creditAccount.findUnique({
      where: { startupId: s.id },
      select: {
        balance: true,
        fixBalance: true,
        flexBalance: true,
        transactions: {
          orderBy: { createdAt: "desc" },
          take,
          select: {
            type: true,
            bucket: true,
            amount: true,
            reason: true,
            createdAt: true,
            createdBy: userName,
          },
        },
      },
    });
    if (!account) return { startup: s, account: null, note: "Noch kein Credit-Konto." };
    return {
      startup: s,
      balance: account.balance,
      fixBalance: account.fixBalance,
      flexBalance: account.flexBalance,
      transactions: account.transactions.map((t) => ({
        ...t,
        createdBy: t.createdBy?.name ?? null,
      })),
    };
  },
});

const listStartupUpdates = tool({
  name: "list_startup_updates",
  title: "Startup-Updates",
  description: "Neuigkeiten von Startups (Meilensteine, Funding, Produkt) und offizielle LOVEDIS-Updates, neueste zuerst.",
  input: {
    startup: startupRef.optional(),
    officialOnly: z.boolean().default(false),
    limit: limit(20, 100),
  },
  async run({ startup, officialOnly, limit: take }) {
    const startupId = startup ? (await resolveStartup(startup)).id : undefined;
    const updates = await prisma.startupUpdate.findMany({
      where: {
        ...(startupId ? { startupId } : {}),
        ...(officialOnly ? { isOfficial: true } : {}),
      },
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        title: true,
        body: true,
        category: true,
        isOfficial: true,
        createdAt: true,
        author: userName,
        startup: { select: { id: true, name: true } },
      },
    });
    return updates.map((u) => ({ ...u, body: clip(u.body, 1500), author: u.author.name }));
  },
});

// --- Admin tools (Insights, Logbuch) -------------------------------------------

function batchLabel(ds: InsightsDataset, id: string | null): string | null {
  return id ? (ds.batches.find((b) => b.id === id)?.name ?? id) : null;
}

const insightsOverview = tool({
  name: "get_insights_overview",
  title: "Insights-Übersicht",
  description:
    "Portfolio-KPIs (Matches, Pilot-Paare, aktive Engagements, externe Startups), Kennzahlen je Batch, 1:1-Track und Datenqualität. Ein Match = beide Seiten „Hoch“.",
  input: {},
  adminOnly: true,
  async run() {
    const ds = await loadInsightsDataset();
    const pilots = buildPilotIndex(ds);
    return {
      portfolio: summarizePortfolio(ds, pilots),
      batches: ds.batches.map((b) => {
        const s = summarizeBatch(ds, b.id, pilots);
        return s
          ? {
              id: b.id,
              name: b.name,
              type: b.type,
              startups: s.startups,
              partners: s.partners,
              matches: s.matches,
              pilotPairs: s.pilotPairs,
              matchToPilotRate: s.matchToPilotRate,
            }
          : { id: b.id, name: b.name };
      }),
      oneOnOne: summarizeOneOnOne(ds),
      dataQuality: [...dataQuality(ds), ...trackingDataQuality(ds)].filter((d) => d.count > 0),
      pilotSources: PILOT_SOURCE_LABELS,
    };
  },
});

const batchKpis = tool({
  name: "get_batch_kpis",
  title: "Batch-KPIs",
  description:
    "KPI-Report eines Batches wie in Insights: Matches, Match-zu-Pilot-Quote, Pilot-Paare, Bewerbungen, Sessions, Credits, Partner-Retention, Förder-Reporting sowie Aufschlüsselung je Partner, Startup und Branche.",
  input: { batch: batchRef },
  adminOnly: true,
  async run({ batch }) {
    const ds = await loadInsightsDataset();
    const b = pickByRef(ds.batches, batch, "Batch");
    const pilots = buildPilotIndex(ds);
    const summary = summarizeBatch(ds, b.id, pilots);
    return {
      summary,
      reporting: summarizeBatchReporting(ds, b.id, pilots),
      partners: partnersInBatch(ds, b.id, pilots).map((r) => ({
        partner: r.partner.name,
        partnerId: r.partner.id,
        ratedPairings: r.ratedPairings,
        matches: r.matches,
        pilots: r.pilots,
      })),
      startups: startupsInBatch(ds, b.id, pilots).map(({ startup, ...r }) => ({
        startup: startup.name,
        startupId: startup.id,
        ...r,
      })),
      industries: industryBreakdown(ds, b.id, pilots),
    };
  },
});

const partnerInsights = tool({
  name: "get_partner_insights",
  title: "Partner-Insights",
  description:
    "Insights-Drilldown eines Partner-Unternehmens: Batches, bewertete Matrix-Paare mit Pilot-Quellen, zugeordnete Engagements und Challenges.",
  input: { partner: partnerRef },
  adminOnly: true,
  async run({ partner }) {
    const ds = await loadInsightsDataset();
    const p = pickByRef(ds.partners, partner, "Partner-Unternehmen");
    const detail = partnerDetail(ds, p.id);
    if (!detail) throw new ToolError("Partner nicht gefunden.");
    return {
      partner: detail.partner,
      totals: detail.totals,
      batches: detail.batches.map((r) => ({ ...r, batch: r.batch.name })),
      matchRows: detail.matchRows.map((r) => ({
        batch: r.batch.name,
        startup: r.startup.name,
        startupId: r.startup.id,
        startupRelevance: r.startupRelevance,
        partnerRelevance: r.partnerRelevance,
        contactStatus: r.contactStatus,
        match: r.qualified,
        pilotSources: r.pilotSources,
      })),
      engagements: detail.engagements,
      challenges: detail.challenges,
    };
  },
});

const startupInsights = tool({
  name: "get_startup_insights",
  title: "Startup-Insights",
  description:
    "Insights-Drilldown eines Startups: Batches, Matrix-Paare mit Pilot-Quellen, Engagements mit Partner-Zuordnung, Bewerbungen, Sessions und Credits, Förder-Stammdaten.",
  input: { startup: startupRef },
  adminOnly: true,
  async run({ startup }) {
    const ds = await loadInsightsDataset();
    const s = pickByRef(ds.startups, startup, "Startup");
    const detail = startupDetail(ds, s.id);
    if (!detail) throw new ToolError("Startup nicht gefunden.");
    return {
      ...detail,
      batches: detail.batches.map((b) => ({ id: b.id, name: b.name, type: b.type })),
      matchRows: detail.matchRows.map((r) => ({
        batch: r.batch.name,
        partner: r.partner.name,
        partnerId: r.partner.id,
        startupRelevance: r.startupRelevance,
        partnerRelevance: r.partnerRelevance,
        contactStatus: r.contactStatus,
        match: r.qualified,
        pilotSources: r.pilotSources,
      })),
      reportingMeta: ds.reportingMeta.find((m) => m.startupId === s.id) ?? null,
    };
  },
});

const explainPilot = tool({
  name: "explain_pilot_status",
  title: "Pilot-Diagnose",
  description:
    "Erklärt, ob und warum ein Startup × Partner-Paar in den Insights als Pilot zählt (oder nicht): Batch-Mitgliedschaft beider Seiten, Matrix-Status, Engagements mit Partner-Zuordnung, PoCs und Pipeline-Tracking. Nutzen, wenn ein eingetragener Pilot in den KPIs fehlt.",
  input: { startup: startupRef, partner: partnerRef },
  adminOnly: true,
  async run({ startup, partner }) {
    const ds = await loadInsightsDataset();
    const s = pickByRef(ds.startups, startup, "Startup");
    const p = pickByRef(ds.partners, partner, "Partner-Unternehmen");
    const pilots = buildPilotIndex(ds);
    const sources = pilots.get(pairKey(s.id, p.id)) ?? [];
    const partnerName = (id: string | null) =>
      id ? (ds.partners.find((x) => x.id === id)?.name ?? id) : null;

    const startupBatches = new Set(
      ds.batchStartups.filter((bs) => bs.startupId === s.id).map((bs) => bs.batchId)
    );
    const partnerBatches = new Set(
      ds.batchPartners.filter((bp) => bp.partnerId === p.id).map((bp) => bp.batchId)
    );
    const cells = ds.matches.filter((m) => m.startupId === s.id && m.partnerId === p.id);
    const batches = ds.batches
      .filter((b) => startupBatches.has(b.id) || partnerBatches.has(b.id))
      .map((b) => {
        const cell = cells.find((m) => m.batchId === b.id);
        const both = startupBatches.has(b.id) && partnerBatches.has(b.id);
        return {
          batch: b.name,
          batchId: b.id,
          startupInBatch: startupBatches.has(b.id),
          partnerInBatch: partnerBatches.has(b.id),
          matrixCell: cell
            ? {
                startupRelevance: cell.startupRelevance,
                partnerRelevance: cell.partnerRelevance,
                contactStatus: cell.contactStatus,
                match: isQualifiedMatch(cell),
              }
            : null,
          countsAsPilotPair: both && sources.length > 0,
          countsInMatchToPilot: both && sources.length > 0 && !!cell && isQualifiedMatch(cell),
        };
      });

    const engagements = ds.engagements
      .filter((e) => e.startupId === s.id)
      .map((e) => ({
        title: e.title,
        status: e.status,
        attributedPartner: partnerName(e.partnerCompanyId),
        attribution: e.partnerResolution,
      }));
    const challengeById = new Map(ds.challenges.map((c) => [c.id, c]));
    const pocs = ds.applications
      .filter((a) => a.startupId === s.id && a.pocStatus)
      .map((a) => ({
        challenge: challengeById.get(a.challengeId)?.title ?? a.challengeId,
        pocStatus: a.pocStatus,
        challengePartner: partnerName(challengeById.get(a.challengeId)?.partnerCompanyId ?? null),
      }));
    const tracking = ds.tracking
      .filter((t) => t.startupId === s.id)
      .map((t) => ({
        track: t.track,
        partner: partnerName(t.partnerCompanyId),
        batch: batchLabel(ds, t.batchId),
        stage: t.stage,
        effectiveStage: effectiveStage(t),
      }));

    const reasons: string[] = [];
    if (sources.length === 0) {
      reasons.push(
        "Kein Pilot-Signal für dieses Paar. Gezählt wird ein Pilot nur über: Matrix-Status „Pilot vereinbart“ (PILOT_AGREED), ein nicht abgebrochenes Engagement mit einem Partner-Konto dieses Unternehmens, einen PoC zu einer Challenge des Partners oder einen Pipeline-Tracking-Eintrag mit diesem Partner ab Stufe PILOT."
      );
      for (const cell of cells) {
        if (cell.contactStatus !== "PILOT_AGREED") {
          reasons.push(
            `Matrix-Zelle in „${batchLabel(ds, cell.batchId)}“ steht auf ${cell.contactStatus}, nicht PILOT_AGREED.`
          );
        }
      }
      for (const e of ds.engagements.filter((x) => x.startupId === s.id)) {
        if (e.partnerResolution === "none") {
          reasons.push(
            `Engagement „${e.title}“ ist keinem Matrix-Partner zugeordnet: Partner-Konto mit dem Unternehmen verknüpfen.`
          );
        } else if (e.partnerCompanyId !== p.id) {
          reasons.push(
            `Engagement „${e.title}“ ist ${partnerName(e.partnerCompanyId)} zugeordnet, nicht ${p.name}.`
          );
        } else if (e.status === "CANCELLED") {
          reasons.push(`Engagement „${e.title}“ ist abgebrochen und zählt nicht.`);
        }
      }
      for (const t of ds.tracking.filter((x) => x.startupId === s.id)) {
        if (!t.partnerCompanyId) {
          reasons.push("Pipeline-Tracking-Eintrag ohne Partner-Unternehmen: Partner eintragen.");
        } else if (t.partnerCompanyId === p.id && stageRank(effectiveStage(t)) < stageRank("PILOT")) {
          reasons.push(
            `Pipeline-Tracking mit ${p.name} steht auf ${effectiveStage(t)} (unter PILOT). Stufe auf PILOT setzen oder Pilotstart-Datum eintragen.`
          );
        }
      }
    } else {
      reasons.push(
        `Pilot-Signal vorhanden: ${sources.map((src) => PILOT_SOURCE_LABELS[src]).join(", ")}. Zählt in den Portfolio-Pilot-Paaren.`
      );
      const shared = batches.filter((b) => b.startupInBatch && b.partnerInBatch);
      if (shared.length === 0) {
        reasons.push(
          `Startup und Partner sind in keinem gemeinsamen Batch, daher zählt der Pilot in keiner Batch-KPI. ${p.name} als Partner zum Batch des Startups hinzufügen (oder umgekehrt).`
        );
      }
      for (const b of shared) {
        reasons.push(
          b.countsInMatchToPilot
            ? `Batch „${b.batch}“: zählt als Pilot-Paar und in der Match-zu-Pilot-Quote.`
            : `Batch „${b.batch}“: zählt als Pilot-Paar, aber nicht in der Match-zu-Pilot-Quote (kein Match, also nicht beide Seiten „Hoch“).`
        );
      }
    }

    return {
      startup: { id: s.id, name: s.name },
      partner: { id: p.id, name: p.name },
      isPilot: sources.length > 0,
      pilotSources: sources.map((src) => PILOT_SOURCE_LABELS[src]),
      reasons,
      batches,
      evidence: { engagements, pocs, tracking },
    };
  },
});

const pipelineTracking = tool({
  name: "list_pipeline_tracking",
  title: "Pipeline-Tracking",
  description:
    "Strukturierte Pipeline-Tracking-Einträge (Basis und 1:1): Stufe, effektive Stufe, Meilenstein-Daten, Umsatz, Kosten, Verträge. Ohne Freitext. Filter nach Startup, Partner oder Batch.",
  input: {
    startup: startupRef.optional(),
    partner: partnerRef.optional(),
    batch: batchRef.optional(),
    limit: limit(100, 500),
  },
  adminOnly: true,
  async run({ startup, partner, batch, limit: take }) {
    const ds = await loadInsightsDataset();
    const startupId = startup ? pickByRef(ds.startups, startup, "Startup").id : null;
    const partnerId = partner ? pickByRef(ds.partners, partner, "Partner-Unternehmen").id : null;
    const batchId = batch ? pickByRef(ds.batches, batch, "Batch").id : null;
    const startupName = new Map(ds.startups.map((s) => [s.id, s.name]));
    const partnerName = new Map(ds.partners.map((p) => [p.id, p.name]));
    const rows = ds.tracking.filter(
      (t) =>
        (!startupId || t.startupId === startupId) &&
        (!partnerId || t.partnerCompanyId === partnerId) &&
        (!batchId || t.batchId === batchId)
    );
    return {
      total: rows.length,
      entries: rows.slice(0, take).map((t) => ({
        ...t,
        startup: startupName.get(t.startupId) ?? t.startupId,
        partner: t.partnerCompanyId ? (partnerName.get(t.partnerCompanyId) ?? null) : null,
        batch: batchLabel(ds, t.batchId),
        effectiveStage: effectiveStage(t),
      })),
    };
  },
});

const logbook = tool({
  name: "get_logbook",
  title: "Logbuch",
  description:
    "Internes Logbuch eines Startups (Notizen, Calls, Meetings, System-Ereignisse) mit nächsten Schritten, Follow-ups und Kommentaren, neueste zuerst. Streng intern.",
  input: { startup: startupRef, limit: limit(30, 100) },
  adminOnly: true,
  async run({ startup, limit: take }) {
    const s = await resolveStartup(startup);
    const entries = await prisma.startupLogEntry.findMany({
      where: { startupId: s.id, deletedAt: null },
      orderBy: [{ pinnedAt: { sort: "desc", nulls: "last" } }, { occurredAt: "desc" }],
      take,
      select: {
        type: true,
        source: true,
        occurredAt: true,
        title: true,
        body: true,
        externalParticipants: true,
        nextStep: true,
        followUpAt: true,
        followUpDoneAt: true,
        pinnedAt: true,
        author: userName,
        followUpAssignee: userName,
        comments: {
          where: { deletedAt: null },
          orderBy: { createdAt: "asc" },
          select: { body: true, createdAt: true, author: userName },
        },
      },
    });
    return {
      startup: s,
      entries: entries.map((e) => ({
        ...e,
        body: clip(e.body, 3000),
        nextStep: clip(e.nextStep, 500),
        author: e.author?.name ?? null,
        followUpAssignee: e.followUpAssignee?.name ?? null,
        pinned: e.pinnedAt !== null,
        comments: e.comments.map((c) => ({
          body: clip(c.body, 1000),
          author: c.author?.name ?? null,
          createdAt: c.createdAt,
        })),
      })),
    };
  },
});

export const TOOLS: ToolDef[] = [
  searchStartups,
  getStartup,
  listBatches,
  getBatch,
  getMatchMatrix,
  listPartnerCompanies,
  listChallenges,
  getChallenge,
  listCollaborations,
  listOfferings,
  listBookings,
  getCreditAccount,
  listStartupUpdates,
  insightsOverview,
  batchKpis,
  partnerInsights,
  startupInsights,
  explainPilot,
  pipelineTracking,
  logbook,
];

/** The tools a role may see; admin-only tools are not even listed for MEMBER. */
export function toolsForRole(role: McpContext["role"]): ToolDef[] {
  return TOOLS.filter((t) => !t.adminOnly || role === "ADMIN");
}
