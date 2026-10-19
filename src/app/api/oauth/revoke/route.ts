import { prisma } from "@/lib/prisma";
import { authenticateClient } from "@/lib/mcp/clients";
import { corsPreflight, readParams, withCors } from "@/lib/mcp/http";
import { sha256Hex } from "@/lib/mcp/oauth";

export const dynamic = "force-dynamic";

/** Token revocation (RFC 7009): either token ends the whole connection. */
export async function POST(req: Request) {
  const params = await readParams(req);
  const client = await authenticateClient(req, params);
  if (client instanceof Response) return withCors(client);

  if (params.token) {
    const hash = sha256Hex(params.token);
    await prisma.oAuthGrant.updateMany({
      where: {
        clientId: client.clientId,
        revokedAt: null,
        OR: [{ accessTokenHash: hash }, { refreshTokenHash: hash }],
      },
      data: { revokedAt: new Date() },
    });
  }
  return withCors(new Response(null, { status: 200 }));
}

export function OPTIONS() {
  return corsPreflight();
}
