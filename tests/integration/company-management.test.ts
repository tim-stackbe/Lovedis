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
        role: "MEMBER",
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
    // No token-invite row is created in the temp-password flow.
    expect(await prisma.invitation.count()).toBe(0);
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

  it("lets a PLATFORM ADMIN provision into ANY company", async () => {
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
        role: "ADMIN",
      })
    );

    expect(res.success).toBeTruthy();
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: "x@example.com" },
    });
    expect(user).toMatchObject({
      companyId: company.id,
      companyRole: "ADMIN",
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

describe("acceptInvitation — onboarding flow", () => {
  // The token-based accept flow stays for legacy/existing pending invites, so it
  // is still exercised here by seeding an Invitation row directly (the partner
  // invite UI now provisions accounts via inviteEmployee instead of tokens).
  async function seedPendingInvite(role: CompanyRole = "MEMBER") {
    const company = await makeCompany("Rheinwerk");
    const owner = await makeMember({
      companyId: company.id,
      companyRole: "OWNER",
    });
    actAs(owner.id);
    const invite = await prisma.invitation.create({
      data: {
        companyId: company.id,
        email: "invitee@example.com",
        role,
        token: `tok-${Math.random().toString(36).slice(2)}`,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        invitedByUserId: owner.id,
      },
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
