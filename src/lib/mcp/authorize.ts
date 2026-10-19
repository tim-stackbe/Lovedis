import { prisma } from "@/lib/prisma";
import {
  MCP_SCOPE,
  isOwnResource,
  isValidCodeChallenge,
  mcpResourceUrl,
  redirectWithParams,
} from "@/lib/mcp/oauth";

export interface AuthorizeRequest {
  clientId: string;
  clientName: string;
  redirectUri: string;
  codeChallenge: string;
  state: string | null;
  scope: string;
  resource: string;
}

export type AuthorizeValidation =
  | { ok: true; request: AuthorizeRequest }
  /** Client or redirect URI unknown: show the error, never redirect. */
  | { ok: false; error: string }
  /** Valid client, bad request: report back to the client's redirect URI. */
  | { ok: false; error: string; redirectTo: string };

type Params = Record<string, string | string[] | undefined>;

function param(params: Params, key: string): string | undefined {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

/** Validates an OAuth authorization request (RFC 6749 4.1.1 + PKCE). */
export async function validateAuthorizeRequest(
  params: Params
): Promise<AuthorizeValidation> {
  const clientId = param(params, "client_id");
  if (!clientId) return { ok: false, error: "client_id fehlt." };
  const client = await prisma.oAuthClient.findUnique({ where: { clientId } });
  if (!client) return { ok: false, error: "Unbekannte App (client_id)." };

  const requestedRedirect = param(params, "redirect_uri");
  const redirectUri =
    requestedRedirect ??
    (client.redirectUris.length === 1 ? client.redirectUris[0] : undefined);
  if (!redirectUri || !client.redirectUris.includes(redirectUri)) {
    return { ok: false, error: "redirect_uri ist für diese App nicht registriert." };
  }

  const state = param(params, "state") ?? null;
  const fail = (error: string, description: string) => ({
    ok: false as const,
    error: description,
    redirectTo: redirectWithParams(redirectUri, {
      error,
      error_description: description,
      state,
    }),
  });

  if (param(params, "response_type") !== "code") {
    return fail("unsupported_response_type", "Nur response_type=code wird unterstützt.");
  }
  const codeChallenge = param(params, "code_challenge");
  if (
    !codeChallenge ||
    param(params, "code_challenge_method") !== "S256" ||
    !isValidCodeChallenge(codeChallenge)
  ) {
    return fail("invalid_request", "PKCE mit code_challenge_method=S256 ist Pflicht.");
  }
  const resource = param(params, "resource");
  if (resource && !isOwnResource(resource)) {
    return fail("invalid_target", "Unbekannte Ressource.");
  }

  return {
    ok: true,
    request: {
      clientId,
      clientName: client.clientName?.trim() || "Unbenannte App",
      redirectUri,
      codeChallenge,
      state,
      scope: MCP_SCOPE,
      resource: mcpResourceUrl(),
    },
  };
}
