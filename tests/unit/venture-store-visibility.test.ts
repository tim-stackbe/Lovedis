import { describe, expect, it } from "vitest";

import type { UserRole } from "@/generated/prisma/enums";
import {
  ROLE_NAV,
  VENTURE_STORE_VIEW_ROLES,
  VENTURE_VIEW_ROLES,
  isStartupMarketplaceHiddenForAlpha,
  isStartupVentureSectionHiddenForAlpha,
  isVentureStoreViewOnly,
} from "@/lib/roles";

const navHrefs = (role: UserRole) =>
  ROLE_NAV[role].flatMap((s) => s.items.map((i) => i.href));

describe("Venture Store visibility", () => {
  it("shows the full Venture Store to startups", () => {
    expect(navHrefs("STARTUP")).toEqual(
      expect.arrayContaining([
        "/venture/marketplace",
        "/venture/marketplace/requests",
        "/venture/credits",
      ])
    );
    expect(isStartupMarketplaceHiddenForAlpha()).toBe(false);
    expect(isStartupVentureSectionHiddenForAlpha()).toBe(false);
  });

  it("lets partners and investors browse the store read-only", () => {
    for (const role of ["BUSINESS_PARTNER", "INVESTOR"] as const) {
      expect(navHrefs(role)).toContain("/venture/marketplace");
      expect(navHrefs(role)).not.toContain("/venture/credits");
      expect(VENTURE_STORE_VIEW_ROLES).toContain(role);
      expect(VENTURE_VIEW_ROLES).not.toContain(role);
      expect(isVentureStoreViewOnly(role)).toBe(true);
    }
    for (const role of ["STARTUP", "ADMIN", "MEMBER"] as const) {
      expect(isVentureStoreViewOnly(role)).toBe(false);
    }
  });
});
