import { describe, expect, it } from "vitest";
import {
  PARTNER_VISIBLE_CHALLENGE_STATUSES,
  partnerCanViewChallenge,
  partnerChallengeWhere,
} from "@/lib/challenges";

const PARTNER_A = "partner-a";
const PARTNER_B = "partner-b";
const TEAM_USER = "member-1";

function challenge(
  overrides: Partial<Parameters<typeof partnerCanViewChallenge>[0]> = {}
): Parameters<typeof partnerCanViewChallenge>[0] {
  return {
    createdById: PARTNER_A,
    status: "OPEN",
    createdBy: { role: "BUSINESS_PARTNER" },
    ...overrides,
  };
}

describe("partnerCanViewChallenge — own use-cases", () => {
  it("lets a partner read their own challenge in any status", () => {
    for (const status of ["DRAFT", "OPEN", "IN_REVIEW", "CLOSED"] as const) {
      expect(
        partnerCanViewChallenge(challenge({ status }), PARTNER_A)
      ).toBe(true);
    }
  });
});

describe("partnerCanViewChallenge — cross-partner boundary (IDOR)", () => {
  // Regression guard for the IDOR finding in docs/sicherheitskonzept-mara.md:
  // a BUSINESS_PARTNER must never read another partner's use-case, not even
  // when it is published. Team-authored challenges are the only exception.
  it("hides another partner's challenge in every status", () => {
    for (const status of ["DRAFT", "OPEN", "IN_REVIEW", "CLOSED"] as const) {
      expect(
        partnerCanViewChallenge(
          challenge({ createdById: PARTNER_B, status }),
          PARTNER_A
        )
      ).toBe(false);
    }
  });

  it("hides another partner's challenge even if that partner is a team member of a company", () => {
    expect(
      partnerCanViewChallenge(
        challenge({ createdById: PARTNER_B, createdBy: { role: "INVESTOR" } }),
        PARTNER_A
      )
    ).toBe(false);
  });
});

describe("partnerCanViewChallenge — team-published industry challenges", () => {
  it("lets any partner read published ADMIN/MEMBER challenges", () => {
    for (const role of ["ADMIN", "MEMBER"] as const) {
      for (const status of PARTNER_VISIBLE_CHALLENGE_STATUSES) {
        expect(
          partnerCanViewChallenge(
            challenge({ createdById: TEAM_USER, createdBy: { role }, status }),
            PARTNER_A
          )
        ).toBe(true);
      }
    }
  });

  it("keeps team DRAFTs hidden from partners", () => {
    expect(PARTNER_VISIBLE_CHALLENGE_STATUSES).not.toContain("DRAFT");
    expect(
      partnerCanViewChallenge(
        challenge({
          createdById: TEAM_USER,
          createdBy: { role: "ADMIN" },
          status: "DRAFT",
        }),
        PARTNER_A
      )
    ).toBe(false);
  });
});

describe("partnerChallengeWhere — list filter mirrors the detail guard", () => {
  it("scopes to own challenges OR published team challenges only", () => {
    expect(partnerChallengeWhere(PARTNER_A)).toEqual({
      OR: [
        { createdById: PARTNER_A },
        {
          createdBy: { role: { in: ["ADMIN", "MEMBER"] } },
          status: { in: PARTNER_VISIBLE_CHALLENGE_STATUSES },
        },
      ],
    });
  });

  it("never selects challenges by creator-independent status alone", () => {
    // A bare `{ status: { in: [...] } }` branch would expose other partners'
    // published use-cases — the filter must always pin the creator role.
    const where = partnerChallengeWhere(PARTNER_A);
    for (const branch of where.OR as Record<string, unknown>[]) {
      expect(
        "createdById" in branch || "createdBy" in branch
      ).toBe(true);
    }
  });
});
