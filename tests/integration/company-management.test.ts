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
  acceptInvitation,
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

describe("inviteEmployee — authorization boundary", () => {
  it("lets a company OWNER invite into their own company (PENDING invite + email)", async () => {
    const company = await makeCompany();
    const owner = await makeMember({
      companyId: company.id,
      companyRole: "OWNER",
    });
    actAs(owner.id);

    const res = await inviteEmployee(
      undefined,
      form({ companyId: company.id, email: "New@Example.com", role: "MEMBER" })
    );

    expect(res.success).toBeTruthy();
    const invite = await prisma.invitation.findFirst({
      where: { companyId: company.id },
    });
    expect(invite).toMatchObject({
      email: "new@example.com",
      role: "MEMBER",
      status: "PENDING",
    });
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
  });

  it("DENIES a manager of a DIFFERENT company (no invite created)", async () => {
    const companyA = await makeCompany();
    const companyB = await makeCompany();
    const ownerB = await makeMember({
      companyId: companyB.id,
      companyRole: "OWNER",
    });
    actAs(ownerB.id);

    const res = await inviteEmployee(
      undefined,
      form({ companyId: companyA.id, email: "x@example.com", role: "MEMBER" })
    );

    expect(res.error).toContain("Keine Berechtigung");
    expect(await prisma.invitation.count()).toBe(0);
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
      form({ companyId: company.id, email: "x@example.com", role: "MEMBER" })
    );

    expect(res.error).toContain("Keine Berechtigung");
    expect(await prisma.invitation.count()).toBe(0);
  });

  it("lets a PLATFORM ADMIN invite into ANY company", async () => {
    const company = await makeCompany();
    const admin = await makeMember({
      companyId: null,
      companyRole: null,
      role: "ADMIN",
    });
    actAs(admin.id);

    const res = await inviteEmployee(
      undefined,
      form({ companyId: company.id, email: "x@example.com", role: "ADMIN" })
    );

    expect(res.success).toBeTruthy();
    expect(await prisma.invitation.count()).toBe(1);
  });

  it("re-inviting a pending email refreshes the SAME invite (no duplicate)", async () => {
    const company = await makeCompany();
    const owner = await makeMember({
      companyId: company.id,
      companyRole: "OWNER",
    });
    actAs(owner.id);

    await inviteEmployee(
      undefined,
      form({ companyId: company.id, email: "dup@example.com", role: "MEMBER" })
    );
    const first = await prisma.invitation.findFirstOrThrow({
      where: { email: "dup@example.com" },
    });

    await inviteEmployee(
      undefined,
      form({ companyId: company.id, email: "dup@example.com", role: "ADMIN" })
    );

    const all = await prisma.invitation.findMany({
      where: { email: "dup@example.com" },
    });
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe(first.id);
    expect(all[0].role).toBe("ADMIN"); // refreshed
    expect(all[0].token).not.toBe(first.token); // new token
  });

  it("rejects re-inviting someone already in the company", async () => {
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
      form({ companyId: company.id, email: "already@example.com", role: "MEMBER" })
    );
    expect(res.error).toContain("bereits Teil");
  });
});

describe("acceptInvitation — onboarding flow", () => {
  async function seedPendingInvite(role: CompanyRole = "MEMBER") {
    const company = await makeCompany("Rheinwerk");
    const owner = await makeMember({
      companyId: company.id,
      companyRole: "OWNER",
    });
    actAs(owner.id);
    await inviteEmployee(
      undefined,
      form({ companyId: company.id, email: "invitee@example.com", role })
    );
    const invite = await prisma.invitation.findFirstOrThrow({
      where: { email: "invitee@example.com" },
    });
    return { company, invite };
  }

  it("creates a new account inside the correct company with the invited role", async () => {
    const { company, invite } = await seedPendingInvite("ADMIN");

    const res = await acceptInvitation(
      undefined,
      form({ token: invite.token, name: "Ida Invitee", password: "supersecret" })
    );

    expect(res.success).toBeTruthy();
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: "invitee@example.com" },
    });
    expect(user).toMatchObject({
      companyId: company.id,
      companyRole: "ADMIN",
      role: "BUSINESS_PARTNER",
      isActive: true,
    });
    expect(user.approvedAt).not.toBeNull();

    const after = await prisma.invitation.findUniqueOrThrow({
      where: { id: invite.id },
    });
    expect(after.status).toBe("ACCEPTED");
  });

  it("joins an EXISTING account to the company on accept", async () => {
    const { company, invite } = await seedPendingInvite("MEMBER");
    const existing = await makeMember({
      companyId: null,
      companyRole: null,
      email: "invitee@example.com",
    });

    const res = await acceptInvitation(undefined, form({ token: invite.token }));

    expect(res.success).toBeTruthy();
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: existing.id },
    });
    expect(user.companyId).toBe(company.id);
    expect(user.companyRole).toBe("MEMBER");
  });

  it("rejects an EXPIRED invitation with a clear message", async () => {
    const { invite } = await seedPendingInvite();
    await prisma.invitation.update({
      where: { id: invite.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const res = await acceptInvitation(
      undefined,
      form({ token: invite.token, name: "Ida Invitee", password: "supersecret" })
    );
    expect(res.error).toContain("abgelaufen");

    const after = await prisma.invitation.findUniqueOrThrow({
      where: { id: invite.id },
    });
    expect(after.status).toBe("EXPIRED");
  });

  it("rejects a REVOKED invitation", async () => {
    const { invite } = await seedPendingInvite();
    await prisma.invitation.update({
      where: { id: invite.id },
      data: { status: "REVOKED" },
    });

    const res = await acceptInvitation(
      undefined,
      form({ token: invite.token, name: "Ida Invitee", password: "supersecret" })
    );
    expect(res.error).toContain("widerrufen");
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
