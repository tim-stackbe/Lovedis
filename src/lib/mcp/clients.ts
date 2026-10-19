import type { OAuthClient } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { clientCredentials, oauthError } from "@/lib/mcp/http";
import { safeEqual, sha256Hex } from "@/lib/mcp/oauth";

/**
 * Authenticates the client at the token/revocation endpoint: confidential
 * clients must present their secret, public clients (PKCE) only their id.
 */
export async function authenticateClient(
  req: Request,
  params: Record<string, string>
): Promise<OAuthClient | Response> {
  const { clientId, clientSecret } = clientCredentials(req, params);
  if (!clientId) return oauthError("invalid_client", "client_id fehlt", 401);
  const client = await prisma.oAuthClient.findUnique({ where: { clientId } });
  if (!client) return oauthError("invalid_client", "Unbekannter Client", 401);
  if (client.clientSecretHash) {
    if (!clientSecret || !safeEqual(sha256Hex(clientSecret), client.clientSecretHash)) {
      return oauthError("invalid_client", "Client-Authentifizierung fehlgeschlagen", 401);
    }
  }
  return client;
}
