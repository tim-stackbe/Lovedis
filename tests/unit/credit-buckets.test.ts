import { describe, expect, it } from "vitest";

import {
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
