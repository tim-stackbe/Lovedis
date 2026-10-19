import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { prisma } from "@/lib/prisma";
import type { McpContext } from "@/lib/mcp/auth";
import { ToolError, toolsForRole, type ToolDef } from "@/lib/mcp/tools";

const INSTRUCTIONS = `LOVEDIS Ecosystem Platform (Venture Scouting, Corporate-Startup-Matching, Accelerator-Batches). Read-only.
Begriffe: Batch = Programm/Kohorte (Startups + Partner-Unternehmen). Match-Matrix = Startup × Partner-Unternehmen je Batch, beide Seiten bewerten die Relevanz. Match (KPI) = beide Seiten „Hoch“. Pilot = Matrix-Status PILOT_AGREED, Engagement mit dem Partner, Challenge-PoC oder Pipeline-Tracking ab Stufe PILOT. Venture Store = Programme, Mentor-Sessions und Support, bezahlt mit Credits (FIX/FLEX).
Startups, Batches und Partner können per ID oder Name übergeben werden. Antworte auf Deutsch, wenn der User Deutsch schreibt.`;

const MAX_AUDIT_ARGS = 1000;

async function audit(
  ctx: McpContext,
  tool: string,
  args: unknown,
  ok: boolean,
  startedAt: number
): Promise<void> {
  const json = JSON.stringify(args ?? {});
  await prisma.mcpAuditLog
    .create({
      data: {
        userId: ctx.userId,
        clientId: ctx.clientId,
        tool,
        args: json.length > MAX_AUDIT_ARGS ? json.slice(0, MAX_AUDIT_ARGS) : json,
        ok,
        durationMs: Date.now() - startedAt,
      },
    })
    .catch((err) => console.error("[mcp] audit log failed", err));
}

async function runTool(def: ToolDef, args: unknown, ctx: McpContext): Promise<CallToolResult> {
  const startedAt = Date.now();
  try {
    const result = await def.run(args as never, ctx);
    await audit(ctx, def.name, args, true, startedAt);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  } catch (err) {
    await audit(ctx, def.name, args, false, startedAt);
    if (!(err instanceof ToolError)) console.error(`[mcp] ${def.name} failed`, err);
    const message =
      err instanceof ToolError ? err.message : "Interner Fehler beim Lesen der Daten.";
    return { isError: true, content: [{ type: "text", text: message }] };
  }
}

/** A fresh server per request (stateless transport), scoped to the caller's role. */
export function createLovedisMcpServer(ctx: McpContext): McpServer {
  const server = new McpServer(
    { name: "lovedis", title: "LOVEDIS Plattform", version: "1.0.0" },
    { instructions: INSTRUCTIONS }
  );
  for (const def of toolsForRole(ctx.role)) {
    server.registerTool(
      def.name,
      {
        title: def.title,
        description: def.description,
        inputSchema: def.input,
        annotations: {
          title: def.title,
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
      },
      (args: unknown) => runTool(def, args, ctx)
    );
  }
  return server;
}
