import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Must never be prerendered: it reports the live DB state and the deployed
// version of the running container.
export const dynamic = "force-dynamic";

/**
 * Deployed version, baked into the image by the Dockerfile ARGs that
 * `deploy/hetzner/deploy-platform.sh` passes. Lets anyone confirm which commit
 * is actually live: `curl -s https://app.<host>/api/health`.
 * Non-sensitive by design — short SHA, branch and build timestamp only.
 */
function deployInfo() {
  return {
    version: process.env.APP_VERSION ?? "unknown",
    branch: process.env.APP_BRANCH ?? "unknown",
    deployedAt: process.env.APP_DEPLOYED_AT ?? "unknown",
  };
}

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: "ok",
      database: "up",
      ...deployInfo(),
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      {
        status: "degraded",
        database: "down",
        ...deployInfo(),
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
