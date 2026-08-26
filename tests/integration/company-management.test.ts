import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the framework/session edges; the DB layer is exercised for real.
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));
vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn().mockResolvedValue({ ok: true, id: "test" }),
}));

import { auth } from "@/auth";
import type { CompanyRole } from "@/generated/prisma/enums";
import {
  changeEmployeeCompanyRole,
  inviteEmployee,
  removeEmployee,
} from "@/app/actions/companies";
import { sendEmail } from "@/lib/email";
import { prisma, resetDb } from "../helpers/db";

const mockAuth = vi.mocked(auth);
const mockSendEmail = vi.mocked(sendEmail);

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

/** Points the mocked session at a given user id (or clears it). */
function actAs(userId: string | null): void {
  mockAuth.mockResolvedValue(
    userId ? ({ user: { id: userId } } as never) : (null as never)
  );
}

let seq = 0;
function makeCompany(name?: string) {
  seq += 1;
  return prisma.company.create({
    data: { name: name ?? `Company ${seq}` },
  });
}

function makeMember(opts: {
  companyId: string | null;
  companyRole: CompanyRole | null;
  role?: "ADMIN" | "MEMBER" | "BUSINESS_PARTNER";
  email?: string;
  isActive?: boolean;
}) {
  seq += 1;
  return prisma.user.create({
    data: {
      email: opts.email ?? `u${seq}-${Math.random().toString(36).slice(2, 7)}@test.local`,
      name: `User ${seq}`,
      passwordHash: "x",
      role: opts.role ?? "BUSINESS_PARTNER",
      isActive: opts.isActive ?? true,
      approvedAt: new Date(),
      companyId: opts.companyId,
      companyRole: opts.companyRole,
    },
  });
}

beforeEach(async () => {
  await resetDb();
  vi.clearAllMocks();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("inviteEmployee — temp-password provisioning + authorization", () => {
  it("lets a company OWNER provision a new member with a temp password + first-login gate", async () => {
    const company = await makeCompany();
    const owner = await makeMember({
      companyId: company.id,
      companyRole: "OWNER",
    });
    actAs(owner.id);

    const res = await inviteEmployee(
      undefined,
      form({
        companyId: company.id,
        name: "Nina New",
        email: "New@Example.com",
      })
    );

    expect(res.success).toBeTruthy();
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: "new@example.com" },
    });
    expect(user).toMatchObject({
      name: "Nina New",
      companyId: company.id,
      companyRole: "MEMBER",
      role: "BUSINESS_PARTNER",
      isActive: true,
      mustChangePassword: true,
    });
    expect(user.approvedAt).not.toBeNull();
    // A real (bcrypt) hash was stored, not the temp password in the clear.
    expect(user.passwordHash).not.toBe("");
    expect(user.passwordHash.startsWith("$2")).toBe(true);
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
  });

  it("DENIES a manager of a DIFFERENT company (no account created)", async () => {
    const companyA = await makeCompany();
    const companyB = await makeCompany();
    const ownerB = await makeMember({
      companyId: companyB.id,
      companyRole: "OWNER",
    });
    actAs(ownerB.id);

    const res = await inviteEmployee(
      undefined,
      form({
        companyId: companyA.id,
        name: "Xavier X",
        email: "x@example.com",
        role: "MEMBER",
      })
    );

    expect(res.error).toContain("Keine Berechtigung");
    expect(
      await prisma.user.findUnique({ where: { email: "x@example.com" } })
    ).toBeNull();
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("DENIES a plain MEMBER (no management rights)", async () => {
    const company = await makeCompany();
    const member = await makeMember({
      companyId: company.id,
      companyRole: "MEMBER",
    });
    actAs(member.id);

    const res = await inviteEmployee(
      undefined,
      form({
        companyId: company.id,
        name: "Xavier X",
        email: "x@example.com",
        role: "MEMBER",
      })
    );

    expect(res.error).toContain("Keine Berechtigung");
    expect(
      await prisma.user.findUnique({ where: { email: "x@example.com" } })
    ).toBeNull();
  });

  it("lets a PLATFORM ADMIN provision into ANY company (always as MEMBER)", async () => {
    const company = await makeCompany();
    const admin = await makeMember({
      companyId: null,
      companyRole: null,
      role: "ADMIN",
    });
    actAs(admin.id);

    const res = await inviteEmployee(
      undefined,
      form({
        companyId: company.id,
        name: "Xavier X",
        email: "x@example.com",
        // Even if a role is smuggled in via the form, invitees are always MEMBER.
        role: "ADMIN",
      })
    );

    expect(res.success).toBeTruthy();
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: "x@example.com" },
    });
    expect(user).toMatchObject({
      companyId: company.id,
      companyRole: "MEMBER",
      mustChangePassword: true,
    });
  });

  it("rejects an email that already exists as a platform account", async () => {
    const company = await makeCompany();
    const owner = await makeMember({
      companyId: company.id,
      companyRole: "OWNER",
    });
    await makeMember({
      companyId: null,
      companyRole: null,
      email: "exists@example.com",
    });
    actAs(owner.id);

    const res = await inviteEmployee(
      undefined,
      form({
        companyId: company.id,
        name: "Erin Exists",
        email: "exists@example.com",
        role: "MEMBER",
      })
    );
    expect(res.error).toContain("existiert bereits");
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("rejects inviting someone already in the company", async () => {
    const company = await makeCompany();
    const owner = await makeMember({
      companyId: company.id,
      companyRole: "OWNER",
    });
    await makeMember({
      companyId: company.id,
      companyRole: "MEMBER",
      email: "already@example.com",
    });
    actAs(owner.id);

    const res = await inviteEmployee(
      undefined,
      form({
        companyId: company.id,
        name: "Ada Already",
        email: "already@example.com",
        role: "MEMBER",
      })
    );
    expect(res.error).toContain("bereits Teil");
  });
});

describe("last-owner invariant + cross-company management", () => {
  it("blocks demoting the last remaining OWNER", async () => {
    const company = await makeCompany();
    const owner = await makeMember({
      companyId: company.id,
      companyRole: "OWNER",
    });
    actAs(owner.id);

    const res = await changeEmployeeCompanyRole(owner.id, "MEMBER");
    expect(res.error).toContain("letzte");
    const after = await prisma.user.findUniqueOrThrow({ where: { id: owner.id } });
    expect(after.companyRole).toBe("OWNER");
  });

  it("allows demoting an owner once a second owner exists", async () => {
    const company = await makeCompany();
    const owner1 = await makeMember({
      companyId: company.id,
      companyRole: "OWNER",
    });
    const owner2 = await makeMember({
      companyId: company.id,
      companyRole: "OWNER",
    });
    actAs(owner1.id);

    const res = await changeEmployeeCompanyRole(owner2.id, "MEMBER");
    expect(res.success).toBeTruthy();
  });

  it("blocks removing the last remaining OWNER", async () => {
    const company = await makeCompany();
    const owner = await makeMember({
      companyId: company.id,
      companyRole: "OWNER",
    });
    const admin = await makeMember({
      companyId: null,
      companyRole: null,
      role: "ADMIN",
    });
    actAs(admin.id); // platform admin acts

    const res = await removeEmployee(owner.id);
    expect(res.error).toContain("letzte");
  });

  it("stops a company OWNER from changing an employee in another company", async () => {
    const companyA = await makeCompany();
    const companyB = await makeCompany();
    const ownerA = await makeMember({
      companyId: companyA.id,
      companyRole: "OWNER",
    });
    const memberB = await makeMember({
      companyId: companyB.id,
      companyRole: "MEMBER",
    });
    actAs(ownerA.id);

    const res = await changeEmployeeCompanyRole(memberB.id, "ADMIN");
    expect(res.error).toContain("Keine Berechtigung");
    const after = await prisma.user.findUniqueOrThrow({
      where: { id: memberB.id },
    });
    expect(after.companyRole).toBe("MEMBER");
  });

  it("blocks a company ADMIN from appointing a new OWNER", async () => {
    const company = await makeCompany();
    await makeMember({ companyId: company.id, companyRole: "OWNER" });
    const admin = await makeMember({
      companyId: company.id,
      companyRole: "ADMIN",
    });
    const member = await makeMember({
      companyId: company.id,
      companyRole: "MEMBER",
    });
    actAs(admin.id);

    const res = await changeEmployeeCompanyRole(member.id, "OWNER");
    expect(res.error).toContain("Inhaber");
    const after = await prisma.user.findUniqueOrThrow({
      where: { id: member.id },
    });
    expect(after.companyRole).toBe("MEMBER");
  });
});
