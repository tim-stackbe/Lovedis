import { prisma } from "@/lib/prisma";
import {
  clientIp,
  corsPreflight,
  noStoreJson,
  oauthError,
  rateLimited,
  withCors,
} from "@/lib/mcp/http";
import { isAllowedRedirectUri, randomToken, sha256Hex } from "@/lib/mcp/oauth";

export const dynamic = "force-dynamic";

const AUTH_METHODS = ["none", "client_secret_post", "client_secret_basic"] as const;
type AuthMethod = (typeof AUTH_METHODS)[number];

/** Dynamic Client Registration (RFC 7591), restricted to known redirect URIs. */
export async function POST(req: Request) {
  if (rateLimited(`register:${clientIp(req)}`, 10)) {
    return withCors(oauthError("slow_down", "Zu viele Registrierungen", 429));
  }
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return withCors(oauthError("invalid_client_metadata", "JSON-Body erwartet"));
  }

  const redirectUris = Array.isArray(body.redirect_uris)
    ? body.redirect_uris.filter((u): u is string => typeof u === "string")
    : [];
  if (redirectUris.length === 0 || redirectUris.length > 10) {
    return withCors(oauthError("invalid_redirect_uri", "redirect_uris fehlt"));
  }
  const rejected = redirectUris.find((u) => !isAllowedRedirectUri(u));
  if (rejected) {
    return withCors(
      oauthError("invalid_redirect_uri", `redirect_uri nicht erlaubt: ${rejected}`)
    );
  }

  const grantTypes = Array.isArray(body.grant_types) ? body.grant_types : null;
  if (grantTypes && !grantTypes.includes("authorization_code")) {
    return withCors(
      oauthError("invalid_client_metadata", "grant_types muss authorization_code enthalten")
    );
  }
  const authMethod = (
    typeof body.token_endpoint_auth_method === "string"
      ? body.token_endpoint_auth_method
      : "client_secret_basic"
  ) as AuthMethod;
  if (!AUTH_METHODS.includes(authMethod)) {
    return withCors(
      oauthError("invalid_client_metadata", "token_endpoint_auth_method nicht unterstützt")
    );
  }
  const clientName =
    typeof body.client_name === "string" ? body.client_name.trim().slice(0, 100) : null;

  const clientId = randomToken("lvd_client");
  const clientSecret = authMethod === "none" ? null : randomToken("lvd_secret");
  const client = await prisma.oAuthClient.create({
    data: {
      clientId,
      clientSecretHash: clientSecret ? sha256Hex(clientSecret) : null,
      clientName,
      redirectUris,
    },
  });

  return withCors(
    noStoreJson(
      {
        client_id: clientId,
        ...(clientSecret
          ? { client_secret: clientSecret, client_secret_expires_at: 0 }
          : {}),
        client_id_issued_at: Math.floor(client.createdAt.getTime() / 1000),
        client_name: clientName ?? undefined,
        redirect_uris: redirectUris,
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        token_endpoint_auth_method: authMethod,
      },
      201
    )
  );
}

export function OPTIONS() {
  return corsPreflight();
}
