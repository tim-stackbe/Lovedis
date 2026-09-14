import { describe, expect, it } from "vitest";

import {
  MARKETPLACE_MENTORS,
  MARKETPLACE_OFFERINGS,
  MARKETPLACE_PROGRAMS,
} from "@/lib/marketplace-catalog";
import {
  ONBOARDING_FIX_CREDITS,
  ONBOARDING_FLEX_CREDITS,
  PROGRAM_FIX_CREDIT_COST,
  deriveCreditBudget,
} from "@/lib/credit-buckets";

describe("deriveCreditBudget — X von 12 view", () => {
  it("maps a fresh onboarding account to 12/12 with a 6/6 split", () => {
    const view = deriveCreditBudget({ balance: 12, fixBalance: 6, flexBalance: 6 });
    expect(view.total).toBe(12);
    expect(view.remaining).toBe(12);
    expect(view.used).toBe(0);
    expect(view.fixRemaining).toBe(6);
    expect(view.fixTotal).toBe(6);
    expect(view.flexRemaining).toBe(6);
    expect(view.flexTotal).toBe(6);
  });

  it("reports remaining vs. total after 3 FLEX credits are used (9 von 12, Fix 6/6 · Flex 3/6)", () => {
    const view = deriveCreditBudget({ balance: 9, fixBalance: 6, flexBalance: 3 });
    expect(view.remaining).toBe(9);
    expect(view.total).toBe(12);
    expect(view.used).toBe(3);
    expect(view.fixRemaining).toBe(6);
    expect(view.flexRemaining).toBe(3);
    expect(view.flexUsed).toBe(3);
  });

  it("counts a fully-consumed FIX bucket as used (program enrolled)", () => {
    const view = deriveCreditBudget({ balance: 6, fixBalance: 0, flexBalance: 6 });
    expect(view.fixRemaining).toBe(0);
    expect(view.fixUsed).toBe(6);
    expect(view.remaining).toBe(6);
    expect(view.total).toBe(12);
  });

  it("defaults a null account to an empty 12-credit budget", () => {
    const view = deriveCreditBudget(null);
    expect(view.total).toBe(12);
    expect(view.remaining).toBe(0);
    expect(view.fixTotal).toBe(6);
    expect(view.flexTotal).toBe(6);
  });

  it("never lets remaining exceed total when a bucket is topped up beyond the default", () => {
    const view = deriveCreditBudget({ balance: 20, fixBalance: 8, flexBalance: 12 });
    expect(view.fixTotal).toBeGreaterThanOrEqual(view.fixRemaining);
    expect(view.flexTotal).toBeGreaterThanOrEqual(view.flexRemaining);
    expect(view.remaining).toBeLessThanOrEqual(view.total);
  });
});

describe("marketplace catalog — Notion metadata in dedicated fields", () => {
  it("puts the Sales program's contact/date/fix-cost in structured fields", () => {
    const sales = MARKETPLACE_PROGRAMS.find(
      (p) => p.title === "Sales, Pricing & Growth"
    );
    expect(sales).toBeDefined();
    expect(sales!.contactPerson).toBe("Claudia Proß");
    expect(sales!.sessionDate).toContain("27. August");
    expect(sales!.fixCreditCost).toBe(PROGRAM_FIX_CREDIT_COST);
    // Kept as content but hidden from the storefront (matches the restored DB).
    expect(sales!.status).toBe("DRAFT");
  });

  it("splits provider/company + contact person for a real offering", () => {
    const saas = MARKETPLACE_OFFERINGS.find((o) => o.title === "SaaS Contracting");
    expect(saas).toBeDefined();
    expect(saas!.providerCompany).toBe("Aulinger");
    expect(saas!.contactPerson).toBe("Axel Staudt");
    // The provider is no longer embedded in the description free-text.
    expect(saas!.description).not.toContain("Aulinger");
  });

  it("keeps the onboarding split summing to 12", () => {
    expect(ONBOARDING_FIX_CREDITS + ONBOARDING_FLEX_CREDITS).toBe(12);
  });
});

describe("marketplace catalog — only real Notion entries", () => {
  it("contains the 34 storefront offerings (30 Notion + 3 moved Sales sessions + generic Sales)", () => {
    // 2026-09-14: the three Sales sessions moved from the programme into the
    // Support-Angebote (SALES) and a generic "Sales" offering was added.
    expect(MARKETPLACE_OFFERINGS).toHaveLength(34);
  });

  it("keeps the real 'Individual Expert Session' only in Legal, Marketing & Product/Tech", () => {
    const categories = MARKETPLACE_OFFERINGS.filter(
      (o) => o.title === "Individual Expert Session"
    )
      .map((o) => o.category)
      .sort();
    expect(categories).toEqual(["LEGAL", "MARKETING", "PRODUCT_TECH"]);
  });

  // 2026-09-14: the three recovered Sales sessions were moved out of the
  // programme into the Support-Angebote, and a generic "Sales" offering added.
  it("carries the four SALES support offerings (3 moved sessions + generic Sales)", () => {
    const sales = MARKETPLACE_OFFERINGS.filter((o) => o.category === "SALES")
      .map((o) => o.title)
      .sort();
    expect(sales).toEqual([
      "Aufbau strukturierter Pipelines",
      "Community / Ökosystem Sales",
      "Nightmare Competitor",
      "Sales",
    ]);
    // The three moved sessions were repriced to 2 credits on 2026-09-14.
    const moved = MARKETPLACE_OFFERINGS.filter(
      (o) => o.category === "SALES" && o.title !== "Sales"
    );
    expect(moved.every((o) => o.creditCost === 2)).toBe(true);
    // The standalone "Sales" offering stays at 1 credit (not repriced).
    const standaloneSales = MARKETPLACE_OFFERINGS.find(
      (o) => o.category === "SALES" && o.title === "Sales"
    );
    expect(standaloneSales?.creditCost).toBe(1);
  });

  // The eight mentor profiles were removed from the Venture Store on
  // 2026-09-11; the catalog must stay empty so a sync can never re-create them.
  it("lists no mentors (Venture Store intentionally has none)", () => {
    expect(MARKETPLACE_MENTORS).toHaveLength(0);
  });

  // The four "Exclusive" sessions were hard-deleted by the 2026-09-14 sync and
  // recovered in prisma/restore-venture-store-20260914.sql. On the same day
  // three of them (Community / Ökosystem Sales, Aufbau strukturierter Pipelines,
  // Nightmare Competitor) were moved into the Support-Angebote (see the SALES
  // test above), leaving SaaS Contracting + Workshop 1 as OPEN programmes.
  it("carries the two OPEN storefront programs after the Sales sessions moved out", () => {
    const open = MARKETPLACE_PROGRAMS.filter((p) => p.status === "OPEN")
      .map((p) => p.title)
      .sort();
    expect(open).toEqual([
      "SaaS Contracting",
      "Workshop 1: KI Trends & Modellvergleich",
    ]);
    const saas = MARKETPLACE_PROGRAMS.find(
      (p) => p.title === "SaaS Contracting" && p.status === "OPEN"
    );
    expect(saas?.contactPerson).toBe("Dr. Ralf Heine");
    expect(saas?.sessionDate).toBe("23. September, 10–12 Uhr");
    // The remaining OPEN programmes are included → no FIX credits.
    expect(
      MARKETPLACE_PROGRAMS.filter((p) => p.status === "OPEN").every(
        (p) => p.fixCreditCost === 0
      )
    ).toBe(true);
  });

  it("spends 2 credits on the GAL-Digital 1:1 formats, Live Hacking, the Notion „1-2\" Legal offerings and the 3 moved Sales sessions", () => {
    const twoCredit = MARKETPLACE_OFFERINGS.filter((o) => o.creditCost === 2)
      .map((o) => o.title)
      .sort();
    expect(twoCredit).toEqual([
      "AI Act & Datenschutz",
      "Aufbau strukturierter Pipelines",
      "Community / Ökosystem Sales",
      "Exit Readiness & Due Diligence",
      "Live Hacking",
      "Nightmare Competitor",
      "SaaS Contracting",
      "Schutz des geistigen Eigentums / IP-Rechte",
      "Tech-Stack Check-up",
      "Vorbereitung einer Finanzierungsrunde",
      "Website-Strategie Starterkit",
    ]);
  });
});
