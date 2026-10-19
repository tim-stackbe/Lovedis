import { CORS_HEADERS, corsPreflight } from "@/lib/mcp/http";
import { MCP_SCOPE, publicBaseUrl } from "@/lib/mcp/oauth";

export const dynamic = "force-dynamic";

/** Served at /.well-known/oauth-authorization-server (RFC 8414). */
export function GET() {
  const base = publicBaseUrl();
  return Response.json(
    {
      issuer: base,
      authorization_endpoint: `${base}/oauth/authorize`,
      token_endpoint: `${base}/api/oauth/token`,
      registration_endpoint: `${base}/api/oauth/register`,
      revocation_endpoint: `${base}/api/oauth/revoke`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: [
        "none",
        "client_secret_post",
        "client_secret_basic",
      ],
      revocation_endpoint_auth_methods_supported: [
        "none",
        "client_secret_post",
        "client_secret_basic",
      ],
      scopes_supported: [MCP_SCOPE],
    },
    { headers: CORS_HEADERS }
  );
}

export function OPTIONS() {
  return corsPreflight();
}
