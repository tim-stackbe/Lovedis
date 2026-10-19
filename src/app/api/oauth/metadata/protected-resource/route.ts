import { CORS_HEADERS, corsPreflight } from "@/lib/mcp/http";
import { MCP_SCOPE, mcpResourceUrl, publicBaseUrl } from "@/lib/mcp/oauth";

export const dynamic = "force-dynamic";

/** Served at /.well-known/oauth-protected-resource[/api/mcp] (RFC 9728). */
export function GET() {
  return Response.json(
    {
      resource: mcpResourceUrl(),
      authorization_servers: [publicBaseUrl()],
      scopes_supported: [MCP_SCOPE],
      bearer_methods_supported: ["header"],
      resource_name: "LOVEDIS Plattform",
    },
    { headers: CORS_HEADERS }
  );
}

export function OPTIONS() {
  return corsPreflight();
}
