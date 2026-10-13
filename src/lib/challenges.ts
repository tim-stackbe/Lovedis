import type { ChallengeStatus, Prisma } from "@/generated/prisma/client";

/** Statuses visible to partners for Lovedis-team-published industry challenges. */
export const PARTNER_VISIBLE_CHALLENGE_STATUSES: ChallengeStatus[] = [
  "OPEN",
  "IN_REVIEW",
  "CLOSED",
];

/** List filter: partner-owned challenges + platform-published team challenges. */
export function partnerChallengeWhere(
  partnerUserId: string
): Prisma.ChallengeWhereInput {
  return {
    OR: [
      { createdById: partnerUserId },
      {
        createdBy: { role: { in: ["ADMIN", "MEMBER"] } },
        status: { in: PARTNER_VISIBLE_CHALLENGE_STATUSES },
      },
    ],
  };
}

export function partnerCanViewChallenge(
  challenge: {
    createdById: string;
    status: ChallengeStatus;
    createdBy: { role: string };
  },
  partnerUserId: string
): boolean {
  if (challenge.createdById === partnerUserId) return true;
  if (
    challenge.createdBy.role !== "ADMIN" &&
    challenge.createdBy.role !== "MEMBER"
  ) {
    return false;
  }
  return PARTNER_VISIBLE_CHALLENGE_STATUSES.includes(challenge.status);
}
