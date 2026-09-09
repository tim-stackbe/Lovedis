import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { logout } from "@/app/actions/auth";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/Button";
import { requireAuth } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { ROLE_HOMES } from "@/lib/roles";

export const metadata: Metadata = { title: "Konto wird geprüft" };

/**
 * Holding page for self-registered business partners awaiting admin approval.
 * Lives outside the `(main)` route group, so it is not caught by the app-shell
 * approval gate and cannot redirect-loop. Approved users (and any non-partner)
 * are sent straight to their role home.
 */
export default async function PendingPage() {
  const session = await requireAuth();

  if (session.user.role !== "BUSINESS_PARTNER") {
    redirect(ROLE_HOMES[session.user.role]);
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { approvedAt: true },
  });
  if (user?.approvedAt) {
    redirect(ROLE_HOMES.BUSINESS_PARTNER);
  }

  return (
    <AuthLayout
      headline={["Willkommen.", "Fast geschafft.", "Freigabe folgt."]}
      subline="Business-Partner-Konten werden vom Lovedis-Team geprüft, bevor die kuratierte Longlist und die Screening-Masken sichtbar werden."
    >
      <div className="space-y-6">
        <div className="space-y-2">
          <span className="inline-flex items-center rounded-full bg-lv-blue-soft px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-lv-blue">
            In Prüfung
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-lv-text">
            Dein Konto wartet auf Freigabe
          </h2>
        </div>

        <p className="text-sm leading-relaxed text-lv-secondary">
          Danke für deine Registrierung, {session.user.name?.split(" ")[0]}!
          Damit wir dir die passenden Startups und internen Einordnungen zeigen,
          gibt ein:e Administrator:in dein Partner-Konto zunächst frei. Das
          dauert in der Regel nicht lange — du musst nichts weiter tun.
        </p>

        <div className="rounded-card border border-lv-border bg-lv-surface/60 p-4 text-sm text-lv-secondary">
          Sobald dein Konto freigegeben ist, hast du beim nächsten Login vollen
          Zugriff auf Longlist-Screening, Use-Case-Bewertung und den Partner-Hub.
        </div>

        <form action={logout}>
          <Button type="submit" variant="secondary" className="w-full">
            Abmelden
          </Button>
        </form>
      </div>
    </AuthLayout>
  );
}
