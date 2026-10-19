import type { OAuthClient } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { loadMcpUser, newTokenPair } from "@/lib/mcp/auth";
import { authenticateClient } from "@/lib/mcp/clients";
import {
  clientIp,
  corsPreflight,
  noStoreJson,
  oauthError,
  rateLimited,
  readParams,
  withCors,
} from "@/lib/mcp/http";
import { sha256Hex, verifyPkceS256 } from "@/lib/mcp/oauth";

export const dynamic = "force-dynamic";

/** Token endpoint: authorization_code (+ PKCE) and rotating refresh_token. */
export async function POST(req: Request) {
  if (rateLimited(`token:${clientIp(req)}`, 60)) {
    return withCors(oauthError("slow_down", "Zu viele Anfragen", 429));
  }
  const params = await readParams(req);
  const client = await authenticateClient(req, params);
  if (client instanceof Response) return withCors(client);

  const res =
    params.grant_type === "authorization_code"
      ? await exchangeCode(client, params)
      : params.grant_type === "refresh_token"
        ? await refresh(client, params)
        : oauthError("unsupported_grant_type", "grant_type nicht unterstützt");
  return withCors(res);
}

async function exchangeCode(
  client: OAuthClient,
  params: Record<string, string>
): Promise<Response> {
  const { code, redirect_uri: redirectUri, code_verifier: verifier } = params;
  if (!code || !verifier) {
    return oauthError("invalid_request", "code und code_verifier sind Pflicht");
  }
  const record = await prisma.oAuthAuthorizationCode.findUnique({
    where: { codeHash: sha256Hex(code) },
  });
  const now = new Date();
  if (
    !record ||
    record.clientId !== client.clientId ||
    record.usedAt ||
    record.expiresAt <= now ||
    (redirectUri !== undefined && redirectUri !== record.redirectUri) ||
    !verifyPkceS256(verifier, record.codeChallenge)
  ) {
    return oauthError("invalid_grant", "Code ungültig, abgelaufen oder bereits benutzt");
  }

  const claimed = await prisma.oAuthAuthorizationCode.updateMany({
    where: { id: record.id, usedAt: null },
    data: { usedAt: now },
  });
  if (claimed.count !== 1) {
    return oauthError("invalid_grant", "Code bereits benutzt");
  }
  if (!(await loadMcpUser(record.userId))) {
    return oauthError("invalid_grant", "Kein Zugriff (Team-Rolle erforderlich)");
  }

  const tokens = newTokenPair(now);
  await prisma.oAuthGrant.create({
    data: {
      clientId: client.clientId,
      userId: record.userId,
      scope: record.scope,
      resource: record.resource,
      ...tokens.data,
    },
  });
  await prisma.oAuthClient.update({
    where: { id: client.id },
    data: { lastUsedAt: now },
  });
  return noStoreJson(tokens.response);
}

async function refresh(
  client: OAuthClient,
  params: Record<string, string>
): Promise<Response> {
  const token = params.refresh_token;
  if (!token) return oauthError("invalid_request", "refresh_token fehlt");
  const hash = sha256Hex(token);
  const grant = await prisma.oAuthGrant.findUnique({
    where: { refreshTokenHash: hash },
  });
  const now = new Date();
  if (
    !grant ||
    grant.clientId !== client.clientId ||
    grant.revokedAt ||
    grant.refreshExpiresAt <= now
  ) {
    return oauthError("invalid_grant", "Refresh-Token ungültig oder abgelaufen");
  }
  if (!(await loadMcpUser(grant.userId))) {
    await prisma.oAuthGrant.update({
      where: { id: grant.id },
      data: { revokedAt: now },
    });
    return oauthError("invalid_grant", "Kein Zugriff (Team-Rolle erforderlich)");
  }

  const tokens = newTokenPair(now);
  const rotated = await prisma.oAuthGrant.updateMany({
    where: { id: grant.id, refreshTokenHash: hash, revokedAt: null },
    data: tokens.data,
  });
  if (rotated.count !== 1) {
    return oauthError("invalid_grant", "Refresh-Token bereits benutzt");
  }
  return noStoreJson(tokens.response);
}

export function OPTIONS() {
  return corsPreflight();
}
