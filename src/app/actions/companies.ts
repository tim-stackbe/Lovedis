"use server";

import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { CompanyRole } from "@/generated/prisma/enums";
import { firstZodError, type ActionState } from "@/lib/action-state";
import {
  authorizeCompanyManagement,
  authorizePlatformAdmin,
  countOtherOwners,
} from "@/lib/company-guards";
import {
  COMPANY_ROLE_LABELS,
  INVITABLE_COMPANY_ROLES,
} from "@/lib/company-roles";
import { sendEmail } from "@/lib/email";
import { sendPartnerInvitationEmail } from "@/lib/invitation-email";
import { prisma } from "@/lib/prisma";
import { isRecordNotFoundError } from "@/lib/prisma-errors";
import { generateTempPassword } from "@/lib/temp-password";

// Invitations live for a week; expired/revoked tokens are rejected on accept.
const INVITE_TTL_DAYS = 7;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

function inviteExpiry(): Date {
  return new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
}

function buildInviteUrl(token: string): string {
  const base = (
    process.env.NEXTAUTH_URL ?? "http://localhost:3000"
  ).replace(/\/$/, "");
  return `${base}/auth/invite/${token}`;
}

/** Revalidates every surface a company/team change can appear on. */
function revalidateCompanySurfaces(companyId?: string): void {
  revalidatePath("/team");
  revalidatePath("/companies");
  if (companyId) revalidatePath(`/companies/${companyId}`);
}

/**
 * Counts the "seats in use" for a company = active members + still-pending
 * invitations. Used to enforce an optional per-company seat cap.
 */
async function seatsInUse(companyId: string): Promise<number> {
  const [members, pending] = await Promise.all([
    prisma.user.count({ where: { companyId, isActive: true } }),
    prisma.invitation.count({ where: { companyId, status: "PENDING" } }),
  ]);
  return members + pending;
}

const companyRoleEnum = z.enum(["OWNER", "ADMIN", "MEMBER"]);
const invitableRoleEnum = z.enum(
  INVITABLE_COMPANY_ROLES as [CompanyRole, ...CompanyRole[]]
);

// ---------------------------------------------------------------------------
// Company CRUD — platform admin only
// ---------------------------------------------------------------------------

const companySchema = z.object({
  name: z.string().min(2, "Name muss mindestens 2 Zeichen lang sein").max(160),
  website: z.string().max(200).optional(),
  seatLimit: z.coerce
    .number()
    .int()
    .positive("Sitzplatzlimit muss positiv sein")
    .max(100000)
    .optional(),
});

export async function createCompany(
  _prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const authz = await authorizePlatformAdmin();
  if (!authz.ok) return { error: authz.error };

  const parsed = companySchema.safeParse({
    name: formData.get("name"),
    website: formData.get("website") || undefined,
    seatLimit: formData.get("seatLimit") || undefined,
  });
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  const company = await prisma.company.create({
    data: {
      name: parsed.data.name,
      website: parsed.data.website,
      seatLimit: parsed.data.seatLimit,
    },
  });
  revalidateCompanySurfaces(company.id);
  return { success: "Unternehmen erstellt." };
}

const updateCompanySchema = companySchema.extend({
  id: z.string().min(1),
});

export async function updateCompany(
  _prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const authz = await authorizePlatformAdmin();
  if (!authz.ok) return { error: authz.error };

  const parsed = updateCompanySchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    website: formData.get("website") || undefined,
    seatLimit: formData.get("seatLimit") || undefined,
  });
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  // An unchecked checkbox is simply absent from the form body, so derive the
  // boolean from its presence rather than trusting a value that never arrives.
  const isActive = formData.get("isActive") === "true";

  try {
    await prisma.company.update({
      where: { id: parsed.data.id },
      data: {
        name: parsed.data.name,
        website: parsed.data.website ?? null,
        seatLimit: parsed.data.seatLimit ?? null,
        isActive,
      },
    });
  } catch (err) {
    if (isRecordNotFoundError(err))
      return { error: "Unternehmen nicht gefunden." };
    throw err;
  }
  revalidateCompanySurfaces(parsed.data.id);
  return { success: "Unternehmen aktualisiert." };
}

// ---------------------------------------------------------------------------
// Invitations
// ---------------------------------------------------------------------------

const inviteSchema = z.object({
  companyId: z.string().min(1),
  name: z.string().min(2, "Name muss mindestens 2 Zeichen lang sein").max(120),
  email: z.email("Bitte gib eine gültige E-Mail-Adresse ein"),
  role: invitableRoleEnum,
});

/**
 * Invites someone into a company by immediately provisioning their account with
 * a temporary single-sign-on password. Authorized for platform admins (any
 * company) and OWNER/ADMIN of the target company.
 *
 * The invitee is created right away as a BUSINESS_PARTNER scoped to the inviting
 * partner's company (companyId + companyRole), active and approved, carrying a
 * generated temp password and `mustChangePassword = true`. The invitation email
 * hands them their login URL, email and that temporary password; the shared
 * first-login gate (middleware → /change-password) forces them to set their own
 * password before reaching any app surface. Handles duplicate email (already a
 * platform user) with a friendly error and enforces the optional seat cap.
 */
export async function inviteEmployee(
  _prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const parsed = inviteSchema.safeParse({
    companyId: formData.get("companyId"),
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  const { companyId, role, name } = parsed.data;
  const email = parsed.data.email.toLowerCase();

  const authz = await authorizeCompanyManagement(companyId);
  if (!authz.ok) return { error: authz.error };

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) return { error: "Unternehmen nicht gefunden." };
  if (!company.isActive) {
    return { error: "Dieses Unternehmen ist derzeit deaktiviert." };
  }

  // A platform account for this email must not already exist — the temp-password
  // flow provisions a brand-new account. (Adding an existing user to a company
  // is a separate, explicit management action.)
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return existingUser.companyId === companyId
      ? { error: "Diese Person ist bereits Teil des Unternehmens." }
      : { error: "Ein Nutzer mit dieser E-Mail existiert bereits." };
  }

  // Seat cap (counts active members + any legacy pending invites).
  if (company.seatLimit != null && (await seatsInUse(companyId)) >= company.seatLimit) {
    return {
      error: "Das Sitzplatzlimit dieses Unternehmens ist erreicht.",
    };
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      // Invited members are partner-side end users scoped to the company; the
      // company-scoped role carries their management rights, never OWNER.
      role: "BUSINESS_PARTNER",
      companyId,
      companyRole: role,
      company: company.name,
      // Invited by a trusted partner → approved immediately (no /pending gate).
      approvedAt: new Date(),
      isActive: true,
      // Force the shared first-login password change on first sign-in.
      mustChangePassword: true,
    },
  });

  const inviter = await prisma.user.findUnique({
    where: { id: authz.actor.userId },
    select: { name: true },
  });

  await sendPartnerInvitationEmail({
    to: email,
    name,
    companyName: company.name,
    invitedByName: inviter?.name,
    tempPassword,
  });

  revalidateCompanySurfaces(companyId);
  return {
    success: `Zugang für ${email} erstellt — Zugangsdaten wurden per E-Mail versendet.`,
  };
}

async function sendInviteEmail(opts: {
  email: string;
  companyName: string;
  role: CompanyRole;
  token: string;
}): Promise<void> {
  const url = buildInviteUrl(opts.token);
  await sendEmail({
    to: opts.email,
    subject: `Einladung zu ${opts.companyName} auf Lovedis`,
    text:
      `Du wurdest als ${COMPANY_ROLE_LABELS[opts.role]} zum Team von ` +
      `${opts.companyName} auf Lovedis eingeladen.\n\n` +
      `Einladung annehmen:\n${url}\n\n` +
      `Der Link ist ${INVITE_TTL_DAYS} Tage gültig.`,
  });
}

export async function resendInvitation(
  invitationId: string
): Promise<ActionState> {
  const invite = await prisma.invitation.findUnique({
    where: { id: invitationId },
    include: { company: true },
  });
  if (!invite) return { error: "Einladung nicht gefunden." };

  const authz = await authorizeCompanyManagement(invite.companyId);
  if (!authz.ok) return { error: authz.error };

  if (invite.status !== "PENDING") {
    return { error: "Nur offene Einladungen können erneut gesendet werden." };
  }

  const token = generateToken();
  await prisma.invitation.update({
    where: { id: invite.id },
    data: { token, expiresAt: inviteExpiry() },
  });

  await sendInviteEmail({
    email: invite.email,
    companyName: invite.company.name,
    role: invite.role,
    token,
  });

  revalidateCompanySurfaces(invite.companyId);
  return { success: `Einladung an ${invite.email} erneut gesendet.` };
}

export async function revokeInvitation(
  invitationId: string
): Promise<ActionState> {
  const invite = await prisma.invitation.findUnique({
    where: { id: invitationId },
  });
  if (!invite) return { error: "Einladung nicht gefunden." };

  const authz = await authorizeCompanyManagement(invite.companyId);
  if (!authz.ok) return { error: authz.error };

  if (invite.status !== "PENDING") {
    return { error: "Nur offene Einladungen können widerrufen werden." };
  }

  await prisma.invitation.update({
    where: { id: invite.id },
    data: { status: "REVOKED" },
  });
  revalidateCompanySurfaces(invite.companyId);
  return { success: "Einladung widerrufen." };
}

// ---------------------------------------------------------------------------
// Employee management (role, active state, removal, move)
// ---------------------------------------------------------------------------

/**
 * Changes an employee's company role. Platform admins may set any role
 * (including appointing OWNERs); company OWNERs may too; company ADMINs may only
 * set ADMIN/MEMBER (they cannot mint owners). Demoting the last remaining OWNER
 * is blocked to preserve the "≥1 owner" invariant.
 */
export async function changeEmployeeCompanyRole(
  userId: string,
  role: string
): Promise<ActionState> {
  const parsedRole = companyRoleEnum.safeParse(role);
  if (!parsedRole.success) return { error: "Ungültige Rolle." };

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, companyId: true, companyRole: true },
  });
  if (!target?.companyId) {
    return { error: "Mitarbeiter:in gehört zu keinem Unternehmen." };
  }

  const authz = await authorizeCompanyManagement(target.companyId);
  if (!authz.ok) return { error: authz.error };

  // Company ADMINs cannot create/appoint owners; only OWNER or platform admin.
  const actorMayAppointOwner =
    authz.actor.isPlatformAdmin || authz.actor.companyRole === "OWNER";
  if (parsedRole.data === "OWNER" && !actorMayAppointOwner) {
    return { error: "Nur Inhaber:innen dürfen weitere Inhaber:innen ernennen." };
  }

  // Guard the last-owner invariant on demotion.
  if (
    target.companyRole === "OWNER" &&
    parsedRole.data !== "OWNER" &&
    (await countOtherOwners(target.companyId, target.id)) === 0
  ) {
    return {
      error:
        "Das ist die/der letzte Inhaber:in — bestimme zuerst eine andere Person zum Inhaber.",
    };
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { companyRole: parsedRole.data },
    });
  } catch (err) {
    if (isRecordNotFoundError(err))
      return { error: "Mitarbeiter:in nicht gefunden." };
    throw err;
  }
  revalidateCompanySurfaces(target.companyId);
  return { success: "Rolle aktualisiert." };
}

/**
 * Deactivates / reactivates an employee (toggles isActive). Deactivating a user
 * revokes their access on the next request (requireAuth clears the session).
 * The last active OWNER cannot be deactivated.
 */
export async function setEmployeeActive(
  userId: string,
  isActive: boolean
): Promise<ActionState> {
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, companyId: true, companyRole: true, isActive: true },
  });
  if (!target?.companyId) {
    return { error: "Mitarbeiter:in gehört zu keinem Unternehmen." };
  }

  const authz = await authorizeCompanyManagement(target.companyId);
  if (!authz.ok) return { error: authz.error };

  if (userId === authz.actor.userId && !isActive) {
    return { error: "Du kannst dein eigenes Konto nicht deaktivieren." };
  }

  if (
    !isActive &&
    target.companyRole === "OWNER" &&
    (await countOtherOwners(target.companyId, target.id)) === 0
  ) {
    return {
      error: "Die/der letzte Inhaber:in kann nicht deaktiviert werden.",
    };
  }

  try {
    await prisma.user.update({ where: { id: userId }, data: { isActive } });
  } catch (err) {
    if (isRecordNotFoundError(err))
      return { error: "Mitarbeiter:in nicht gefunden." };
    throw err;
  }
  revalidateCompanySurfaces(target.companyId);
  return { success: isActive ? "Mitarbeiter:in reaktiviert." : "Mitarbeiter:in deaktiviert." };
}

/**
 * Removes an employee from their company: unlinks the membership AND revokes
 * access (isActive=false) so any live session is cleared on the next request.
 * The last remaining OWNER cannot be removed.
 */
export async function removeEmployee(userId: string): Promise<ActionState> {
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, companyId: true, companyRole: true },
  });
  if (!target?.companyId) {
    return { error: "Mitarbeiter:in gehört zu keinem Unternehmen." };
  }

  const authz = await authorizeCompanyManagement(target.companyId);
  if (!authz.ok) return { error: authz.error };

  if (userId === authz.actor.userId) {
    return { error: "Du kannst dich nicht selbst entfernen." };
  }

  if (
    target.companyRole === "OWNER" &&
    (await countOtherOwners(target.companyId, target.id)) === 0
  ) {
    return { error: "Die/der letzte Inhaber:in kann nicht entfernt werden." };
  }

  const companyId = target.companyId;
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { companyId: null, companyRole: null, isActive: false },
    });
  } catch (err) {
    if (isRecordNotFoundError(err))
      return { error: "Mitarbeiter:in nicht gefunden." };
    throw err;
  }
  revalidateCompanySurfaces(companyId);
  return { success: "Mitarbeiter:in aus dem Unternehmen entfernt." };
}

/**
 * Moves an employee from one company to another. Platform-admin only (a partner
 * must never reach into another company). Preserves the source company's
 * last-owner invariant and re-checks the destination's seat cap.
 */
export async function moveEmployee(
  userId: string,
  targetCompanyId: string
): Promise<ActionState> {
  const authz = await authorizePlatformAdmin();
  if (!authz.ok) return { error: authz.error };

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, companyId: true, companyRole: true },
  });
  if (!target) return { error: "Mitarbeiter:in nicht gefunden." };
  if (target.companyId === targetCompanyId) {
    return { error: "Mitarbeiter:in ist bereits in diesem Unternehmen." };
  }

  const destination = await prisma.company.findUnique({
    where: { id: targetCompanyId },
  });
  if (!destination) return { error: "Zielunternehmen nicht gefunden." };

  if (
    target.companyId &&
    target.companyRole === "OWNER" &&
    (await countOtherOwners(target.companyId, target.id)) === 0
  ) {
    return {
      error:
        "Die/der letzte Inhaber:in kann nicht verschoben werden — bestimme zuerst eine:n andere:n Inhaber:in.",
    };
  }

  if (
    destination.seatLimit != null &&
    (await seatsInUse(targetCompanyId)) >= destination.seatLimit
  ) {
    return { error: "Das Sitzplatzlimit des Zielunternehmens ist erreicht." };
  }

  const from = target.companyId;
  await prisma.user.update({
    where: { id: userId },
    data: { companyId: targetCompanyId, companyRole: "MEMBER" },
  });
  revalidateCompanySurfaces(targetCompanyId);
  if (from) revalidatePath(`/companies/${from}`);
  return { success: "Mitarbeiter:in verschoben." };
}

// ---------------------------------------------------------------------------
// Invitation acceptance (public, token-based)
// ---------------------------------------------------------------------------

export interface InvitationView {
  status: "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED";
  email: string;
  companyName: string;
  role: CompanyRole;
  /** Whether an account for this email already exists (join vs create). */
  accountExists: boolean;
}

/**
 * Loads a safe, public view of an invitation by token for the accept page.
 * Lazily flips a past-due PENDING invite to EXPIRED so the UI + accept action
 * agree. Returns null for an unknown token.
 */
export async function loadInvitation(
  token: string
): Promise<InvitationView | null> {
  const invite = await prisma.invitation.findUnique({
    where: { token },
    include: { company: true },
  });
  if (!invite) return null;

  let status = invite.status;
  if (status === "PENDING" && invite.expiresAt.getTime() < Date.now()) {
    await prisma.invitation.update({
      where: { id: invite.id },
      data: { status: "EXPIRED" },
    });
    status = "EXPIRED";
  }

  const account = await prisma.user.findUnique({
    where: { email: invite.email },
    select: { id: true },
  });

  return {
    status,
    email: invite.email,
    companyName: invite.company.name,
    role: invite.role,
    accountExists: account != null,
  };
}

const acceptSchema = z.object({
  token: z.string().min(1),
  name: z.string().min(2).max(120).optional(),
  password: z.string().min(8, "Passwort muss mindestens 8 Zeichen lang sein").optional(),
});

/**
 * Accepts an invitation. If no account exists for the invited email, a new
 * BUSINESS_PARTNER account is created (name + password required) linked to the
 * company with the invited role. If an account already exists, it is joined to
 * the company. Expired/revoked/already-accepted tokens are rejected with a
 * clear message. Possession of the token proves control of the invited inbox,
 * so no separate login is required to join.
 */
export async function acceptInvitation(
  _prevState: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const parsed = acceptSchema.safeParse({
    token: formData.get("token"),
    name: formData.get("name") || undefined,
    password: formData.get("password") || undefined,
  });
  if (!parsed.success) return { error: firstZodError(parsed.error) };

  const invite = await prisma.invitation.findUnique({
    where: { token: parsed.data.token },
    include: { company: true },
  });
  if (!invite) return { error: "Diese Einladung ist ungültig." };

  if (invite.status === "ACCEPTED") {
    return { error: "Diese Einladung wurde bereits angenommen." };
  }
  if (invite.status === "REVOKED") {
    return { error: "Diese Einladung wurde widerrufen." };
  }
  if (
    invite.status === "EXPIRED" ||
    invite.expiresAt.getTime() < Date.now()
  ) {
    if (invite.status !== "EXPIRED") {
      await prisma.invitation.update({
        where: { id: invite.id },
        data: { status: "EXPIRED" },
      });
    }
    return { error: "Diese Einladung ist abgelaufen. Bitte fordere eine neue an." };
  }
  if (!invite.company.isActive) {
    return { error: "Dieses Unternehmen ist derzeit deaktiviert." };
  }

  const existing = await prisma.user.findUnique({
    where: { email: invite.email },
  });

  if (existing) {
    // Join the existing account to the company with the invited role.
    await prisma.$transaction([
      prisma.user.update({
        where: { id: existing.id },
        data: {
          companyId: invite.companyId,
          companyRole: invite.role,
          isActive: true,
          approvedAt: existing.approvedAt ?? new Date(),
        },
      }),
      prisma.invitation.update({
        where: { id: invite.id },
        data: { status: "ACCEPTED", acceptedAt: new Date() },
      }),
    ]);
    return { success: "Einladung angenommen. Du kannst dich jetzt anmelden." };
  }

  // No account yet → create one. Name + password are required.
  if (!parsed.data.name || !parsed.data.password) {
    return { error: "Bitte gib deinen Namen und ein Passwort an." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await prisma.$transaction([
    prisma.user.create({
      data: {
        email: invite.email,
        name: parsed.data.name,
        passwordHash,
        role: "BUSINESS_PARTNER",
        companyId: invite.companyId,
        companyRole: invite.role,
        company: invite.company.name,
        // Invited by a trusted partner → approved immediately (no /pending gate).
        approvedAt: new Date(),
        isActive: true,
      },
    }),
    prisma.invitation.update({
      where: { id: invite.id },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    }),
  ]);
  return { success: "Konto erstellt. Du kannst dich jetzt anmelden." };
}
