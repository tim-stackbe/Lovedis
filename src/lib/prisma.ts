import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Cloudflare Workers sets navigator.userAgent to this sentinel. We use it to
// pick the serverless Neon driver (HTTP/WebSocket, no TCP) on the Worker, while
// local dev + scripts keep the standard `pg` driver against embedded Postgres.
const isCloudflareWorkers =
  typeof navigator !== "undefined" &&
  navigator.userAgent === "Cloudflare-Workers";

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (isCloudflareWorkers) {
    // maxUses: 1 — don't reuse a pooled connection across Worker requests
    // (Cloudflare invalidates the I/O context between requests).
    const adapter = new PrismaNeon({ connectionString, maxUses: 1 });
    return new PrismaClient({ adapter });
  }

  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
