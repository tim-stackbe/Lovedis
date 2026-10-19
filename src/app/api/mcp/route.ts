import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { authenticateMcpRequest } from "@/lib/mcp/auth";
import { corsPreflight, withCors } from "@/lib/mcp/http";
import { createLovedisMcpServer } from "@/lib/mcp/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** MCP over Streamable HTTP, stateless: one server + transport per request. */
export async function POST(req: Request) {
  const ctx = await authenticateMcpRequest(req);
  if (ctx instanceof Response) return withCors(ctx);

  const server = createLovedisMcpServer(ctx);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  try {
    return withCors(await transport.handleRequest(req));
  } finally {
    await transport.close();
    await server.close();
  }
}

/** No server-initiated stream in stateless mode. */
async function notAllowed(req: Request) {
  const ctx = await authenticateMcpRequest(req);
  if (ctx instanceof Response) return withCors(ctx);
  return withCors(
    new Response(null, { status: 405, headers: { Allow: "POST, OPTIONS" } })
  );
}

export { notAllowed as GET, notAllowed as DELETE };

export function OPTIONS() {
  return corsPreflight();
}
