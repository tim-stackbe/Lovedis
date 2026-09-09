import { afterAll, beforeEach, describe, expect, it } from "vitest";

import {
  ONBOARDING_CREDIT_AMOUNT,
  ONBOARDING_FIX_REASON,
  ONBOARDING_FLEX_REASON,
  grantOnboardingCredits,
} from "@/lib/onboarding-credits";
import {
  ONBOARDING_FIX_CREDITS,
  ONBOARDING_FLEX_CREDITS,
} from "@/lib/credit-buckets";
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

describe("grantOnboardingCredits — 6 FIX + 6 FLEX split", () => {
  it("splits the 12-credit grant into 6 FIX + 6 FLEX and mirrors the cached bucket balances", async () => {
    const startup = await makeStartup();

    const granted = await grantOnboardingCredits(prisma, startup.id, creatorId);
    expect(granted).toBe(true);

    const account = await prisma.creditAccount.findUniqueOrThrow({
      where: { startupId: startup.id },
    });
    expect(account.balance).toBe(ONBOARDING_CREDIT_AMOUNT); // 12
    expect(account.fixBalance).toBe(ONBOARDING_FIX_CREDITS); // 6
    expect(account.flexBalance).toBe(ONBOARDING_FLEX_CREDITS); // 6
    expect(account.balance).toBe(account.fixBalance + account.flexBalance);

    const txs = await prisma.creditTransaction.findMany({
      where: { accountId: account.id },
      orderBy: { bucket: "asc" },
    });
    expect(txs).toHaveLength(2);
    const fix = txs.find((t) => t.bucket === "FIX");
    const flex = txs.find((t) => t.bucket === "FLEX");
    expect(fix).toMatchObject({
      type: "GRANT",
      amount: ONBOARDING_FIX_CREDITS,
      reason: ONBOARDING_FIX_REASON,
    });
    expect(flex).toMatchObject({
      type: "GRANT",
      amount: ONBOARDING_FLEX_CREDITS,
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
    expect(account.balance).toBe(ONBOARDING_CREDIT_AMOUNT);
    expect(account.fixBalance).toBe(ONBOARDING_FIX_CREDITS);
    expect(account.flexBalance).toBe(ONBOARDING_FLEX_CREDITS);
    expect(
      await prisma.creditTransaction.count({ where: { accountId: account.id } })
    ).toBe(2);
  });
});
