import type { Metadata } from "next";
import Link from "next/link";
import { loadInvitation } from "@/app/actions/companies";
import { AcceptInviteForm } from "@/components/auth/AcceptInviteForm";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Card } from "@/components/ui/Card";

export const metadata: Metadata = { title: "Einladung annehmen" };

const HEADLINE: [string, string, string] = [
  "Gemeinsam screenen.",
  "Als Team entscheiden.",
  "Dranbleiben.",
];
const SUBLINE =
  "Tritt dem Team deines Unternehmens auf Lovedis bei und arbeitet gemeinsam an Screening, Use-Cases und Check-ins.";

/** Friendly card shown when a token can't be redeemed. */
function InviteNotice({ title, body }: { title: string; body: string }) {
  return (
    <Card className="p-8">
      <p className="lv-wordmark text-xs text-lv-blue">Einladung</p>
      <h2 className="mt-2 text-2xl font-bold tracking-tight">{title}</h2>
      <p className="mt-2 text-sm text-lv-secondary">{body}</p>
      <div className="mt-6 border-t border-lv-border pt-5 text-center text-sm text-lv-secondary">
        <Link href="/login" className="font-semibold text-lv-blue hover:underline">
          Zur Anmeldung
        </Link>
      </div>
    </Card>
  );
}

export default async function AcceptInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invitation = await loadInvitation(token);

  let content: React.ReactNode;
  if (!invitation) {
    content = (
      <InviteNotice
        title="Einladung ungültig"
        body="Dieser Einladungslink ist ungültig oder wurde bereits verwendet. Bitte fordere eine neue Einladung an."
      />
    );
  } else if (invitation.status === "ACCEPTED") {
    content = (
      <InviteNotice
        title="Bereits angenommen"
        body="Diese Einladung wurde bereits angenommen. Melde dich einfach an."
      />
    );
  } else if (invitation.status === "REVOKED") {
    content = (
      <InviteNotice
        title="Einladung widerrufen"
        body="Diese Einladung wurde von einem:einer Team-Verantwortlichen widerrufen."
      />
    );
  } else if (invitation.status === "EXPIRED") {
    content = (
      <InviteNotice
        title="Einladung abgelaufen"
        body="Dieser Einladungslink ist abgelaufen. Bitte fordere eine neue Einladung an."
      />
    );
  } else {
    content = <AcceptInviteForm token={token} invitation={invitation} />;
  }

  return (
    <AuthLayout headline={HEADLINE} subline={SUBLINE}>
      {content}
    </AuthLayout>
  );
}
