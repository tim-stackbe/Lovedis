import { describe, expect, it } from "vitest";

import {
  MARKETPLACE_MENTORS,
  MARKETPLACE_OFFERINGS,
  MARKETPLACE_PROGRAMS,
} from "@/lib/marketplace-catalog";
import {
  ONBOARDING_CREDIT_TOTAL,
  ONBOARDING_FIX_CREDITS,
  ONBOARDING_FLEX_CREDITS,
  deriveCreditBudget,
} from "@/lib/credit-buckets";
import { parseWorkshops } from "@/lib/program-workshops";

describe("deriveCreditBudget — X von 10 view", () => {
  it("maps a fresh onboarding account to 10/10, all flexible", () => {
    const view = deriveCreditBudget({ balance: 10, fixBalance: 0, flexBalance: 10 });
    expect(view.total).toBe(10);
    expect(view.remaining).toBe(10);
    expect(view.used).toBe(0);
    expect(view.fixTotal).toBe(0);
    expect(view.flexRemaining).toBe(10);
    expect(view.flexTotal).toBe(10);
  });

  it("reports remaining vs. total after 3 credits are used (7 von 10)", () => {
    const view = deriveCreditBudget({ balance: 7, fixBalance: 0, flexBalance: 7 });
    expect(view.remaining).toBe(7);
    expect(view.total).toBe(10);
    expect(view.used).toBe(3);
    expect(view.flexUsed).toBe(3);
  });

  it("defaults a null account to an empty 10-credit budget", () => {
    const view = deriveCreditBudget(null);
    expect(view.total).toBe(10);
    expect(view.remaining).toBe(0);
    expect(view.fixTotal).toBe(0);
    expect(view.flexTotal).toBe(10);
  });

  it("never lets remaining exceed total when a bucket is topped up beyond the default", () => {
    const view = deriveCreditBudget({ balance: 20, fixBalance: 8, flexBalance: 12 });
    expect(view.fixTotal).toBeGreaterThanOrEqual(view.fixRemaining);
    expect(view.flexTotal).toBeGreaterThanOrEqual(view.flexRemaining);
    expect(view.remaining).toBeLessThanOrEqual(view.total);
  });

  it("grants 10 credits, all flexible", () => {
    expect(ONBOARDING_FIX_CREDITS).toBe(0);
    expect(ONBOARDING_FLEX_CREDITS).toBe(10);
    expect(ONBOARDING_CREDIT_TOTAL).toBe(10);
  });
});

describe("marketplace catalog — Notion metadata in dedicated fields", () => {
  it("splits provider/company + contact person for a real offering", () => {
    const saas = MARKETPLACE_OFFERINGS.find((o) => o.title === "SaaS Contracting");
    expect(saas).toBeDefined();
    expect(saas!.providerCompany).toBe("Aulinger");
    expect(saas!.contactPerson).toBe("Axel Staudt");
    // The provider is no longer embedded in the description free-text.
    expect(saas!.description).not.toContain("Aulinger");
  });
});

describe("marketplace catalog — only real Notion entries", () => {
  it("contains the 37 storefront offerings (incl. Pitch Deck Review + Fördermittelberatung)", () => {
    expect(MARKETPLACE_OFFERINGS).toHaveLength(37);
    expect(
      MARKETPLACE_OFFERINGS.find((o) => o.title === "Fördermittelberatung")
    ).toMatchObject({
      category: "FUNDRAISING",
      providerCompany: "DnA Ventures, HML Capital",
      creditCost: 1,
    });
    const pitch = MARKETPLACE_OFFERINGS.find((o) => o.title === "Pitch Deck Review");
    expect(pitch).toMatchObject({
      category: "FUNDRAISING",
      contactPerson: "Tim Meggert",
      creditCost: 1,
    });
  });

  it("keeps the real 'Individual Expert Session' only in Legal, Marketing & Product/Tech", () => {
    const categories = MARKETPLACE_OFFERINGS.filter(
      (o) => o.title === "Individual Expert Session"
    )
      .map((o) => o.category)
      .sort();
    expect(categories).toEqual(["LEGAL", "MARKETING", "PRODUCT_TECH"]);
  });

  it("carries the five SALES support offerings", () => {
    const sales = MARKETPLACE_OFFERINGS.filter((o) => o.category === "SALES")
      .map((o) => o.title)
      .sort();
    expect(sales).toEqual([
      "Aufbau strukturierter Pipelines",
      "Community / Ökosystem Sales",
      "Nightmare Competitor",
      "Recruiting, People Culture, Leadership",
      "Sales",
    ]);
  });

  it("lists no mentors (Venture Store intentionally has none)", () => {
    expect(MARKETPLACE_MENTORS).toHaveLength(0);
  });

  it("carries only the two journeys as free OPEN programs", () => {
    const open = MARKETPLACE_PROGRAMS.filter((p) => p.status === "OPEN");
    expect(open.map((p) => p.title)).toEqual([
      "KI & Tech Journey",
      "Sales & Growth",
    ]);
    expect(
      MARKETPLACE_PROGRAMS.find((p) => p.title === "SaaS Contracting")?.status
    ).toBe("DRAFT");
    expect(
      MARKETPLACE_OFFERINGS.find((o) => o.title === "SaaS Contracting")?.category
    ).toBe("LEGAL");
    expect(open.every((p) => p.fixCreditCost === 0)).toBe(true);
    expect(open.every((p) => !p.sessionDate)).toBe(true);

    const ki = open.find((p) => p.title === "KI & Tech Journey")!;
    expect(ki.contactPerson).toBeUndefined();
    expect(ki.format).toBe("3 Wochen · Online & Onsite (Lokschuppen)");
    expect(ki.sessions).toEqual([
      "KI Trends & Modellvergleich",
      "KI Resilience Day",
      "KI Skalieren",
      "AI Act (optional)",
    ]);
    expect(parseWorkshops(ki.workshops)).toEqual(ki.workshops);
    expect(
      ki.workshops!.map((w) => [w.date, w.startTime, w.format, w.location])
    ).toEqual([
      ["2026-11-12", "11:00", "ONLINE", undefined],
      ["2026-11-23", "15:00", "ON_SITE", "Lokschuppen Marburg"],
      ["2026-12-01", "11:00", "ONLINE", undefined],
      [undefined, undefined, undefined, undefined],
    ]);
    expect(ki.comingSoon).toBeFalsy();
    const growth = open.find((p) => p.title === "Sales & Growth")!;
    expect(growth.comingSoon).toBe(true);
    expect(growth.contactPerson).toBeUndefined();
    expect(growth.format).toBe("4 Wochen · Online · Termine folgen");
  });

  it("spends 2 credits on ~2h formats and external providers, 1 on sparrings", () => {
    const twoCredit = MARKETPLACE_OFFERINGS.filter((o) => o.creditCost === 2)
      .map((o) => o.title)
      .sort();
    expect(twoCredit).toEqual([
      "AI Act & Datenschutz",
      "Aufbau strukturierter Pipelines",
      "Exit Readiness & Due Diligence",
      "Geschäftsführerhaftung",
      "SaaS Contracting",
      "Schutz des geistigen Eigentums / IP-Rechte",
      "Tech-Stack Check-up",
      "Vorbereitung einer Finanzierungsrunde",
      "Website-Strategie Starterkit",
    ]);
    for (const title of ["Live Hacking", "Community / Ökosystem Sales", "Nightmare Competitor"]) {
      expect(MARKETPLACE_OFFERINGS.find((o) => o.title === title)?.creditCost).toBe(1);
    }
  });
});
