import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { loadMcpUser } from "@/lib/mcp/auth";
import {
  AUTH_CODE_TTL_SECONDS,
  randomToken,
  redirectWithParams,
  sha256Hex,
  verifyConsent,
} from "@/lib/mcp/oauth";

export const dynamic = "force-dynamic";

function seeOther(location: string): Response {
  return new Response(null, { status: 303, headers: { Location: location } });
}

function plainError(message: string, status: number): Response {
  return new Response(message, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

/** Consent form target: issues the authorization code or reports the denial. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return plainError("Nicht angemeldet.", 401);

  const form = await req.formData();
  const consent = verifyConsent(String(form.get("consent") ?? ""));
  if (!consent || consent.userId !== session.user.id) {
    return plainError("Anfrage ungültig oder abgelaufen. Bitte erneut verbinden.", 400);
  }
  const client = await prisma.oAuthClient.findUnique({
    where: { clientId: consent.clientId },
  });
  if (!client || !client.redirectUris.includes(consent.redirectUri)) {
    return plainError("Unbekannte App.", 400);
  }

  if (form.get("decision") !== "allow") {
    return seeOther(
      redirectWithParams(consent.redirectUri, {
        error: "access_denied",
        state: consent.state,
      })
    );
  }
  if (!(await loadMcpUser(session.user.id))) {
    return plainError("Kein Zugriff (Team-Rolle erforderlich).", 403);
  }

  const code = randomToken("lvd_code");
  await prisma.oAuthAuthorizationCode.create({
    data: {
      codeHash: sha256Hex(code),
      clientId: consent.clientId,
      userId: session.user.id,
      redirectUri: consent.redirectUri,
      codeChallenge: consent.codeChallenge,
      scope: consent.scope,
      resource: consent.resource,
      expiresAt: new Date(Date.now() + AUTH_CODE_TTL_SECONDS * 1000),
    },
  });
  return seeOther(
    redirectWithParams(consent.redirectUri, { code, state: consent.state })
  );
}
