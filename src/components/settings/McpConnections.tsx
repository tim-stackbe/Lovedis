import { revokeMcpConnection } from "@/app/actions/mcp";
import { Button } from "@/components/ui/Button";
import { prisma } from "@/lib/prisma";
import { mcpResourceUrl } from "@/lib/mcp/oauth";

const dateFmt = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Berlin",
});

/** Active MCP connections (Claude etc.) of a user, with disconnect buttons. */
export async function McpConnections({ userId }: { userId: string }) {
  const grants = await prisma.oAuthGrant.findMany({
    where: { userId, revokedAt: null, refreshExpiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  const clients = await prisma.oAuthClient.findMany({
    where: { clientId: { in: grants.map((g) => g.clientId) } },
    select: { clientId: true, clientName: true },
  });
  const nameOf = new Map(clients.map((c) => [c.clientId, c.clientName]));

  return (
    <div className="space-y-5">
      <div className="text-sm text-lv-secondary">
        <p>
          Verbinde Claude (oder einen anderen MCP-Client) mit der Plattform. Der
          Zugriff ist nur lesend und auf das beschränkt, was du selbst sehen darfst.
        </p>
        <p className="mt-2">
          In Claude unter Einstellungen, Konnektoren, „Benutzerdefinierten Konnektor
          hinzufügen“ diese URL eintragen:
        </p>
        <code className="mt-2 block rounded-button border border-lv-border bg-lv-surface px-3 py-2 text-xs text-lv-text">
          {mcpResourceUrl()}
        </code>
      </div>

      {grants.length === 0 ? (
        <p className="text-sm text-lv-secondary">Noch keine App verbunden.</p>
      ) : (
        <ul className="divide-y divide-lv-border rounded-card border border-lv-border">
          {grants.map((g) => (
            <li key={g.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-lv-text">
                  {nameOf.get(g.clientId) ?? "Unbenannte App"}
                </p>
                <p className="text-xs text-lv-secondary">
                  Verbunden {dateFmt.format(g.createdAt)}
                  {g.lastUsedAt ? `, zuletzt genutzt ${dateFmt.format(g.lastUsedAt)}` : ""}
                </p>
              </div>
              <form action={revokeMcpConnection}>
                <input type="hidden" name="grantId" value={g.id} />
                <Button type="submit" variant="danger" size="sm">
                  Trennen
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
