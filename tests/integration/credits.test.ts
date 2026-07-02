import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the framework/session edges; the DB layer is exercised for real.
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth-guards", () => ({ requireTeam: vi.fn() }));

import { bookCreditTransaction } from "@/app/actions/credits";
import { requireTeam } from "@/lib/auth-guards";
import {
  createStartupWithBalance,
  createUser,
  prisma,
  resetDb,
} from "../helpers/db";

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

let teamUserId: string;

beforeAll(async () => {
  await resetDb();
  const team = await createUser({ role: "ADMIN" });
  teamUserId = team.id;
});

beforeEach(() => {
  vi.mocked(requireTeam).mockResolvedValue({
    user: { id: teamUserId, role: "ADMIN" },
  } as Awaited<ReturnType<typeof requireTeam>>);
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("bookCreditTransaction — credit ledger floor", () => {
  it("applies a positive GRANT to the balance and writes a ledger row", async () => {
    const { startup, account } = await createStartupWithBalance(0);

    const res = await bookCreditTransaction(
      undefined,
      form({ startupId: startup.id, type: "GRANT", amount: "100", reason: "Seed" })
    );

    expect(res.success).toBeTruthy();
    const updated = await prisma.creditAccount.findUniqueOrThrow({
      where: { id: account.id },
    });
    expect(updated.balance).toBe(100);
    const txs = await prisma.creditTransaction.findMany({
      where: { accountId: account.id },
    });
    expect(txs).toHaveLength(1);
    expect(txs[0]).toMatchObject({ type: "GRANT", amount: 100 });
  });

  it("blocks a SPEND that would drive the balance below zero and writes NO ledger row", async () => {
    const { startup, account } = await createStartupWithBalance(50);

    const res = await bookCreditTransaction(
      undefined,
      form({ startupId: startup.id, type: "SPEND", amount: "100", reason: "Zu viel" })
    );

    expect(res.error).toContain("unter 0 fallen");
    const updated = await prisma.creditAccount.findUniqueOrThrow({
      where: { id: account.id },
    });
    // Balance untouched — the guarded updateMany matched 0 rows and the whole
    // transaction (including the would-be ledger entry) rolled back.
    expect(updated.balance).toBe(50);
    const txCount = await prisma.creditTransaction.count({
      where: { accountId: account.id },
    });
    expect(txCount).toBe(0);
  });

  it("applies a SPEND that fits within the balance", async () => {
    const { startup, account } = await createStartupWithBalance(100);

    const res = await bookCreditTransaction(
      undefined,
      form({ startupId: startup.id, type: "SPEND", amount: "40", reason: "Session" })
    );

    expect(res.success).toBeTruthy();
    const updated = await prisma.creditAccount.findUniqueOrThrow({
      where: { id: account.id },
    });
    expect(updated.balance).toBe(60);
    const tx = await prisma.creditTransaction.findFirstOrThrow({
      where: { accountId: account.id },
    });
    expect(tx.amount).toBe(-40);
  });

  it("blocks a negative ADJUSTMENT below the floor but allows a positive one", async () => {
    const { startup, account } = await createStartupWithBalance(30);

    const blocked = await bookCreditTransaction(
      undefined,
      form({ startupId: startup.id, type: "ADJUSTMENT", amount: "-50", reason: "Korrektur" })
    );
    expect(blocked.error).toContain("unter 0 fallen");
    expect(
      (await prisma.creditAccount.findUniqueOrThrow({ where: { id: account.id } }))
        .balance
    ).toBe(30);

    const applied = await bookCreditTransaction(
      undefined,
      form({ startupId: startup.id, type: "ADJUSTMENT", amount: "20", reason: "Bonus" })
    );
    expect(applied.success).toBeTruthy();
    expect(
      (await prisma.creditAccount.findUniqueOrThrow({ where: { id: account.id } }))
        .balance
    ).toBe(50);
  });

  it("rejects an amount of 0", async () => {
    const { startup } = await createStartupWithBalance(0);
    const res = await bookCreditTransaction(
      undefined,
      form({ startupId: startup.id, type: "GRANT", amount: "0", reason: "Nix" })
    );
    expect(res.error).toContain("0");
  });

  it("returns a clean error for an unknown startup", async () => {
    const res = await bookCreditTransaction(
      undefined,
      form({ startupId: "does-not-exist", type: "GRANT", amount: "10", reason: "X" })
    );
    expect(res.error).toBe("Startup nicht gefunden.");
  });
});
