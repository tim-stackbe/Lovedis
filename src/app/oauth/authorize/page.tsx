import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { validateAuthorizeRequest } from "@/lib/mcp/authorize";
import { loadMcpUser } from "@/lib/mcp/auth";
import { consentExpiry, redirectHost, signConsent } from "@/lib/mcp/oauth";
import { MCP_AREAS_ADMIN, MCP_AREAS_TEAM } from "@/lib/mcp/tools";

export const metadata: Metadata = { title: "App verbinden" };
export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <AuthLayout
      headline={["Verbinden.", "Fragen.", "Verstehen."]}
      subline="LOVEDIS für Claude und andere KI-Assistenten"
    >
      <Card className="p-6 sm:p-8">{children}</Card>
    </AuthLayout>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <Shell>
      <h1 className="text-xl font-bold text-lv-text">Verbindung nicht möglich</h1>
      <p className="mt-3 text-sm text-lv-secondary">{message}</p>
    </Shell>
  );
}

export default async function AuthorizePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const session = await auth();
  if (!session?.user?.id) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === "string") query.set(key, value);
    }
    redirect(`/login?callbackUrl=${encodeURIComponent(`/oauth/authorize?${query}`)}`);
  }

  const user = await loadMcpUser(session.user.id);
  if (!user) {
    return (
      <ErrorCard message="Der KI-Zugang ist nur für das interne LOVEDIS-Team (Admin und Member) freigeschaltet." />
    );
  }

  const validation = await validateAuthorizeRequest(params);
  if (!validation.ok) {
    if ("redirectTo" in validation) redirect(validation.redirectTo);
    return <ErrorCard message={validation.error} />;
  }
  const { request } = validation;

  const consent = signConsent({
    clientId: request.clientId,
    redirectUri: request.redirectUri,
    codeChallenge: request.codeChallenge,
    state: request.state,
    scope: request.scope,
    resource: request.resource,
    userId: user.id,
    exp: consentExpiry(),
  });
  const areas = user.role === "ADMIN" ? [...MCP_AREAS_TEAM, ...MCP_AREAS_ADMIN] : MCP_AREAS_TEAM;

  return (
    <Shell>
      <p className="text-xs font-semibold uppercase tracking-wide text-lv-secondary">
        App verbinden
      </p>
      <h1 className="mt-2 text-xl font-bold text-lv-text">
        {request.clientName} möchte auf die LOVEDIS-Plattform zugreifen
      </h1>
      <p className="mt-3 text-sm text-lv-secondary">
        Angemeldet als <span className="font-medium text-lv-text">{user.name}</span> (
        {user.role === "ADMIN" ? "Admin" : "Member"}). Die App sieht nur, was du
        auch in der Plattform sehen darfst.
      </p>

      <div className="mt-5 rounded-card border border-lv-border bg-lv-surface/60 p-4">
        <p className="text-sm font-semibold text-lv-text">Nur lesen</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-lv-secondary">
          {areas.map((area) => (
            <li key={area}>{area}</li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-lv-secondary">
          Die App kann nichts anlegen, ändern, löschen oder versenden. E-Mail-Adressen
          und Telefonnummern von Kontakten werden nicht übertragen.
        </p>
      </div>

      <p className="mt-4 text-xs text-lv-secondary">
        Weiterleitung an <span className="font-medium">{redirectHost(request.redirectUri)}</span>.
        Du kannst die Verbindung jederzeit unter Einstellungen, Verbundene Apps trennen.
      </p>

      <form method="post" action="/api/oauth/authorize/decision" className="mt-6 flex gap-3">
        <input type="hidden" name="consent" value={consent} />
        <Button type="submit" name="decision" value="deny" variant="secondary" className="flex-1">
          Ablehnen
        </Button>
        <Button type="submit" name="decision" value="allow" className="flex-1">
          Zugriff erlauben
        </Button>
      </form>
    </Shell>
  );
}
