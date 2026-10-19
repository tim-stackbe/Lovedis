import type { UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import {
  ACCESS_TOKEN_TTL_SECONDS,
  MCP_SCOPE,
  REFRESH_TOKEN_TTL_SECONDS,
  protectedResourceMetadataUrl,
  randomToken,
  sha256Hex,
} from "@/lib/mcp/oauth";
import { VENTURE_SCOUT_ROLES } from "@/lib/roles";

/** Who is calling the MCP endpoint, re-checked against the DB per request. */
export interface McpContext {
  userId: string;
  userName: string;
  role: UserRole;
  clientId: string;
  grantId: string;
}

/** Only the internal team (ADMIN, MEMBER) may connect an MCP client. */
export function isMcpRole(role: UserRole): boolean {
  return VENTURE_SCOUT_ROLES.includes(role);
}

export interface IssuedTokens {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  refresh_token: string;
  scope: string;
}

export function newTokenPair(now: Date = new Date()) {
  const accessToken = randomToken("lvd_at");
  const refreshToken = randomToken("lvd_rt");
  return {
    accessToken,
    refreshToken,
    data: {
      accessTokenHash: sha256Hex(accessToken),
      accessExpiresAt: new Date(now.getTime() + ACCESS_TOKEN_TTL_SECONDS * 1000),
      refreshTokenHash: sha256Hex(refreshToken),
      refreshExpiresAt: new Date(now.getTime() + REFRESH_TOKEN_TTL_SECONDS * 1000),
    },
    response: {
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: ACCESS_TOKEN_TTL_SECONDS,
      refresh_token: refreshToken,
      scope: MCP_SCOPE,
    } satisfies IssuedTokens,
  };
}

/** Active team user, or null (inactive, deleted or not ADMIN/MEMBER). */
export async function loadMcpUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, role: true, isActive: true },
  });
  if (!user || !user.isActive || !isMcpRole(user.role)) return null;
  return user;
}

function unauthorized(error?: "invalid_token", description?: string): Response {
  const parts = [`Bearer resource_metadata="${protectedResourceMetadataUrl()}"`];
  if (error) parts.push(`error="${error}"`);
  if (description) parts.push(`error_description="${description}"`);
  return Response.json(
    { error: error ?? "unauthorized", error_description: description },
    { status: 401, headers: { "WWW-Authenticate": parts.join(", ") } }
  );
}

/**
 * Verifies the bearer token of an MCP request. Returns the caller, or the
 * 401 response that sends the client into the OAuth flow.
 */
export async function authenticateMcpRequest(
  req: Request
): Promise<McpContext | Response> {
  const header = req.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) return unauthorized();

  const grant = await prisma.oAuthGrant.findUnique({
    where: { accessTokenHash: sha256Hex(match[1].trim()) },
  });
  if (!grant || grant.revokedAt || grant.accessExpiresAt <= new Date()) {
    return unauthorized("invalid_token", "Token ungültig oder abgelaufen");
  }
  const user = await loadMcpUser(grant.userId);
  if (!user) {
    return unauthorized("invalid_token", "Kein Zugriff (Team-Rolle erforderlich)");
  }

  await prisma.oAuthGrant.update({
    where: { id: grant.id },
    data: { lastUsedAt: new Date() },
  });
  return {
    userId: user.id,
    userName: user.name,
    role: user.role,
    clientId: grant.clientId,
    grantId: grant.id,
  };
}
