import { afterAll, beforeEach, describe, expect, it } from "vitest";

import {
  ONBOARDING_CREDIT_AMOUNT,
  ONBOARDING_FLEX_REASON,
  grantOnboardingCredits,
} from "@/lib/onboarding-credits";
import { createUser, prisma, resetDb } from "../helpers/db";

let creatorId: string;

async function makeStartup() {
  const startup = await prisma.startup.create({
    data: {
      name: `Startup ${Math.random().toString(36).slice(2, 8)}`,
      description: "Test startup",
      industry: "AI",
    },
  });
  return startup;
}

beforeEach(async () => {
  await resetDb();
  const creator = await createUser({ role: "MEMBER" });
  creatorId = creator.id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("grantOnboardingCredits — 10 flexible credits", () => {
  it("grants 10 FLEX credits in a single transaction and mirrors the cached balances", async () => {
    const startup = await makeStartup();

    const granted = await grantOnboardingCredits(prisma, startup.id, creatorId);
    expect(granted).toBe(true);

    const account = await prisma.creditAccount.findUniqueOrThrow({
      where: { startupId: startup.id },
    });
    expect(account.balance).toBe(ONBOARDING_CREDIT_AMOUNT); // 10
    expect(account.fixBalance).toBe(0);
    expect(account.flexBalance).toBe(10);

    const txs = await prisma.creditTransaction.findMany({
      where: { accountId: account.id },
    });
    expect(txs).toHaveLength(1);
    expect(txs[0]).toMatchObject({
      type: "GRANT",
      bucket: "FLEX",
      amount: 10,
      reason: ONBOARDING_FLEX_REASON,
    });
  });

  it("is idempotent — a second call never double-grants", async () => {
    const startup = await makeStartup();

    const first = await grantOnboardingCredits(prisma, startup.id, creatorId);
    const second = await grantOnboardingCredits(prisma, startup.id, creatorId);

    expect(first).toBe(true);
    expect(second).toBe(false);

    const account = await prisma.creditAccount.findUniqueOrThrow({
      where: { startupId: startup.id },
    });
    expect(account.balance).toBe(10);
    expect(
      await prisma.creditTransaction.count({ where: { accountId: account.id } })
    ).toBe(1);
  });
});
