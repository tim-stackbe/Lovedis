import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth-guards", () => ({
  requireTeam: vi.fn(),
  requireRole: vi.fn(),
}));

import { cancelBooking, confirmBooking } from "@/app/actions/marketplace";
import { requireRole, requireTeam } from "@/lib/auth-guards";
import {
  createMentor,
  createMentorBooking,
  createStartupWithBalance,
  createUser,
  prisma,
  resetDb,
} from "../helpers/db";

let teamUserId: string;

async function asTeam() {
  const session = {
    user: { id: teamUserId, role: "ADMIN" },
  } as Awaited<ReturnType<typeof requireTeam>>;
  vi.mocked(requireTeam).mockResolvedValue(session);
  vi.mocked(requireRole).mockResolvedValue(session);
}

beforeAll(async () => {
  await resetDb();
  const team = await createUser({ role: "ADMIN" });
  teamUserId = team.id;
});

beforeEach(async () => {
  await resetDb();
  const team = await createUser({ role: "ADMIN" });
  teamUserId = team.id;
  await asTeam();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("confirmBooking — redeem-on-confirm debit", () => {
  it("debits exactly the cost on IN_COORDINATION → CONFIRMED and links the SPEND", async () => {
    const { startup, account } = await createStartupWithBalance(100);
    const mentor = await createMentor(30);
    const booking = await createMentorBooking({
      startupId: startup.id,
      mentorId: mentor.id,
      requestedById: teamUserId,
      status: "IN_COORDINATION",
      creditCost: 30,
    });

    const res = await confirmBooking(booking.id);

    expect(res.success).toContain("30");
    const after = await prisma.marketplaceBooking.findUniqueOrThrow({
      where: { id: booking.id },
    });
    expect(after.status).toBe("CONFIRMED");
    expect(after.creditTransactionId).not.toBeNull();
    expect(
      (await prisma.creditAccount.findUniqueOrThrow({ where: { id: account.id } }))
        .balance
    ).toBe(70);
    const spend = await prisma.creditTransaction.findFirstOrThrow({
      where: { accountId: account.id, type: "SPEND" },
    });
    expect(spend.amount).toBe(-30);
    expect(after.creditTransactionId).toBe(spend.id);
  });

  it("refuses insufficient balance, keeps the booking IN_COORDINATION and writes NO ledger row", async () => {
    const { startup, account } = await createStartupWithBalance(10);
    const mentor = await createMentor(30);
    const booking = await createMentorBooking({
      startupId: startup.id,
      mentorId: mentor.id,
      requestedById: teamUserId,
      status: "IN_COORDINATION",
      creditCost: 30,
    });

    const res = await confirmBooking(booking.id);

    expect(res.error).toContain("reicht nicht aus");
    const after = await prisma.marketplaceBooking.findUniqueOrThrow({
      where: { id: booking.id },
    });
    // Whole transaction rolled back: still IN_COORDINATION, no link, balance kept.
    expect(after.status).toBe("IN_COORDINATION");
    expect(after.creditTransactionId).toBeNull();
    expect(
      (await prisma.creditAccount.findUniqueOrThrow({ where: { id: account.id } }))
        .balance
    ).toBe(10);
    expect(
      await prisma.creditTransaction.count({ where: { accountId: account.id } })
    ).toBe(0);
  });

  it("only confirms from IN_COORDINATION (a REQUESTED booking is rejected, no debit)", async () => {
    const { startup, account } = await createStartupWithBalance(100);
    const mentor = await createMentor(30);
    const booking = await createMentorBooking({
      startupId: startup.id,
      mentorId: mentor.id,
      requestedById: teamUserId,
      status: "REQUESTED",
      creditCost: 30,
    });

    const res = await confirmBooking(booking.id);

    expect(res.error).toContain("Koordination");
    expect(
      (await prisma.creditAccount.findUniqueOrThrow({ where: { id: account.id } }))
        .balance
    ).toBe(100);
  });

  it("is a no-op on double-confirm — debits once only", async () => {
    const { startup, account } = await createStartupWithBalance(100);
    const mentor = await createMentor(30);
    const booking = await createMentorBooking({
      startupId: startup.id,
      mentorId: mentor.id,
      requestedById: teamUserId,
      status: "IN_COORDINATION",
      creditCost: 30,
    });

    const first = await confirmBooking(booking.id);
    const second = await confirmBooking(booking.id);

    expect(first.success).toBeTruthy();
    expect(second.error).toBeTruthy();
    expect(
      (await prisma.creditAccount.findUniqueOrThrow({ where: { id: account.id } }))
        .balance
    ).toBe(70);
    expect(
      await prisma.creditTransaction.count({
        where: { accountId: account.id, type: "SPEND" },
      })
    ).toBe(1);
  });

  it("confirms a 0-credit program without touching the ledger", async () => {
    const { startup, account } = await createStartupWithBalance(0);
    const program = await prisma.program.create({
      data: {
        title: "Accelerator",
        summary: "Sum",
        description: "A program description.",
        status: "OPEN",
        createdById: teamUserId,
      },
    });
    const booking = await prisma.marketplaceBooking.create({
      data: {
        offeringType: "PROGRAM",
        status: "IN_COORDINATION",
        startupId: startup.id,
        requestedById: teamUserId,
        programId: program.id,
        message: "Bitte um Aufnahme ins Programm.",
        contactName: "C",
        contactEmail: "c@test.local",
        creditCost: 0,
      },
    });

    const res = await confirmBooking(booking.id);

    expect(res.success).toBeTruthy();
    expect(
      await prisma.creditTransaction.count({ where: { accountId: account.id } })
    ).toBe(0);
  });

  it("prevents overspend under concurrency: two confirms on one account, only one wins", async () => {
    // Balance covers ONE booking; the guarded updateMany(balance gte cost) must
    // let exactly one confirm through and leave the balance non-negative.
    const { startup, account } = await createStartupWithBalance(100);
    const mentor = await createMentor(60);
    const a = await createMentorBooking({
      startupId: startup.id,
      mentorId: mentor.id,
      requestedById: teamUserId,
      status: "IN_COORDINATION",
      creditCost: 60,
    });
    const b = await createMentorBooking({
      startupId: startup.id,
      mentorId: mentor.id,
      requestedById: teamUserId,
      status: "IN_COORDINATION",
      creditCost: 60,
    });

    const [r1, r2] = await Promise.all([
      confirmBooking(a.id),
      confirmBooking(b.id),
    ]);

    const successes = [r1, r2].filter((r) => r.success).length;
    const failures = [r1, r2].filter((r) => r.error).length;
    expect(successes).toBe(1);
    expect(failures).toBe(1);

    const finalBalance = (
      await prisma.creditAccount.findUniqueOrThrow({ where: { id: account.id } })
    ).balance;
    expect(finalBalance).toBe(40);
    expect(finalBalance).toBeGreaterThanOrEqual(0);
    expect(
      await prisma.creditTransaction.count({
        where: { accountId: account.id, type: "SPEND" },
      })
    ).toBe(1);
  });
});

describe("cancelBooking — refund lifecycle", () => {
  async function confirmedBookingWithRefund(cost: number) {
    // Represents the post-confirm state: balance already debited and a SPEND
    // transaction linked to the booking.
    const { startup, account } = await createStartupWithBalance(100 - cost);
    const mentor = await createMentor(cost);
    const spend = await prisma.creditTransaction.create({
      data: {
        accountId: account.id,
        type: "SPEND",
        amount: -cost,
        reason: "Marktplatz-Buchung",
        createdById: teamUserId,
      },
    });
    const booking = await createMentorBooking({
      startupId: startup.id,
      mentorId: mentor.id,
      requestedById: teamUserId,
      status: "CONFIRMED",
      creditCost: cost,
      creditTransactionId: spend.id,
    });
    return { startup, account, booking };
  }

  it("refunds a CONFIRMED booking as a positive ADJUSTMENT", async () => {
    const { account, booking } = await confirmedBookingWithRefund(30);

    const res = await cancelBooking(booking.id);

    expect(res.success).toContain("zurückgebucht");
    expect(
      (await prisma.creditAccount.findUniqueOrThrow({ where: { id: account.id } }))
        .balance
    ).toBe(100);
    const adj = await prisma.creditTransaction.findFirstOrThrow({
      where: { accountId: account.id, type: "ADJUSTMENT" },
    });
    expect(adj.amount).toBe(30);
  });

  it("cannot cancel a COMPLETED booking and issues no refund", async () => {
    const { account, booking } = await confirmedBookingWithRefund(30);
    await prisma.marketplaceBooking.update({
      where: { id: booking.id },
      data: { status: "COMPLETED" },
    });

    const res = await cancelBooking(booking.id);

    expect(res.error).toContain("Abgeschlossene Buchungen");
    expect(
      await prisma.creditTransaction.count({
        where: { accountId: account.id, type: "ADJUSTMENT" },
      })
    ).toBe(0);
  });

  it("does not double-refund on a second cancel", async () => {
    const { account, booking } = await confirmedBookingWithRefund(30);

    const first = await cancelBooking(booking.id);
    const second = await cancelBooking(booking.id);

    expect(first.success).toBeTruthy();
    expect(second.error).toBeTruthy();
    expect(
      (await prisma.creditAccount.findUniqueOrThrow({ where: { id: account.id } }))
        .balance
    ).toBe(100);
    expect(
      await prisma.creditTransaction.count({
        where: { accountId: account.id, type: "ADJUSTMENT" },
      })
    ).toBe(1);
  });
});
