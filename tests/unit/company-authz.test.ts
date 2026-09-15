import { describe, expect, it } from "vitest";
import {
  canManageCompany,
  isPlatformAdmin,
  type CompanyActorFacts,
} from "@/lib/company-authz";

const COMPANY_A = "company-a";
const COMPANY_B = "company-b";

function actor(overrides: Partial<CompanyActorFacts> = {}): CompanyActorFacts {
  return {
    isPlatformAdmin: false,
    companyId: null,
    companyRole: null,
    isActive: true,
    ...overrides,
  };
}

describe("isPlatformAdmin", () => {
  it("is true only for the platform ADMIN role", () => {
    expect(isPlatformAdmin("ADMIN")).toBe(true);
    expect(isPlatformAdmin("MEMBER")).toBe(false);
    expect(isPlatformAdmin("BUSINESS_PARTNER")).toBe(false);
    expect(isPlatformAdmin(null)).toBe(false);
  });
});

describe("canManageCompany — company management boundary", () => {
  it("lets a platform admin manage ANY company", () => {
    const admin = actor({ isPlatformAdmin: true });
    expect(canManageCompany(admin, COMPANY_A)).toBe(true);
    expect(canManageCompany(admin, COMPANY_B)).toBe(true);
  });

  it("lets an OWNER manage their OWN company", () => {
    const owner = actor({ companyId: COMPANY_A, companyRole: "OWNER" });
    expect(canManageCompany(owner, COMPANY_A)).toBe(true);
  });

  it("lets a company ADMIN manage their OWN company", () => {
    const admin = actor({ companyId: COMPANY_A, companyRole: "ADMIN" });
    expect(canManageCompany(admin, COMPANY_A)).toBe(true);
  });

  it("DENIES a company OWNER/ADMIN managing a DIFFERENT company", () => {
    const owner = actor({ companyId: COMPANY_A, companyRole: "OWNER" });
    const admin = actor({ companyId: COMPANY_A, companyRole: "ADMIN" });
    expect(canManageCompany(owner, COMPANY_B)).toBe(false);
    expect(canManageCompany(admin, COMPANY_B)).toBe(false);
  });

  it("DENIES a MEMBER managing even their own company", () => {
    const member = actor({ companyId: COMPANY_A, companyRole: "MEMBER" });
    expect(canManageCompany(member, COMPANY_A)).toBe(false);
  });

  it("DENIES a user with no company", () => {
    expect(canManageCompany(actor(), COMPANY_A)).toBe(false);
  });

  it("DENIES an inactive user regardless of role", () => {
    const inactiveOwner = actor({
      companyId: COMPANY_A,
      companyRole: "OWNER",
      isActive: false,
    });
    const inactiveAdmin = actor({ isPlatformAdmin: true, isActive: false });
    expect(canManageCompany(inactiveOwner, COMPANY_A)).toBe(false);
    expect(canManageCompany(inactiveAdmin, COMPANY_A)).toBe(false);
  });
});
