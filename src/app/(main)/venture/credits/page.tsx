import { Coins } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { CreditTxTypeBadge } from "@/components/shared/badges";
import { PreviewBanner } from "@/components/shared/PreviewBanner";
import { BannerStat } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { TableCard, Td, Th, THead, Tr } from "@/components/ui/Table";
import { requireVentureView } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { isTeamRole } from "@/lib/roles";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Mein Guthaben" };

export default async function VentureCreditsPage() {
  const session = await requireVentureView();
  const teamMode = isTeamRole(session.user.role);

  const startup = teamMode
    ? null
    : await prisma.startup.findUnique({
        where: { ownerUserId: session.user.id },
        select: {
          id: true,
          name: true,
          creditAccount: {
            include: {
              transactions: { orderBy: { createdAt: "desc" } },
            },
          },
        },
      });

  const balance = startup?.creditAccount?.balance ?? 0;
  const transactions = startup?.creditAccount?.transactions ?? [];

  return (
    <>
      <HeroBanner
        kicker="Venture Platform"
        title="Mein Venture-Guthaben"
        subtitle="Dein aktuelles Credit-Guthaben und die komplette Buchungshistorie."
      >
        <div className="grid grid-cols-2 gap-3 sm:max-w-md">
          <BannerStat label="Aktuelles Guthaben" value={balance} />
          <BannerStat label="Buchungen" value={transactions.length} />
        </div>
      </HeroBanner>

      {teamMode ? (
        <PreviewBanner>
          Dies ist die persönliche Guthaben-Ansicht eines Startups (für dein
          Team-Konto leer). Um einem Startup Venture-Credits zu vergeben oder
          den gesamten Ledger zu verwalten, nutze die{" "}
          <Link
            href="/credits"
            className="font-semibold underline underline-offset-2"
          >
            Venture-Credits-Verwaltung
          </Link>
          .
        </PreviewBanner>
      ) : !startup ? (
        <EmptyState
          icon={Coins}
          title="Kein Startup-Profil"
          description="Lege zuerst dein Startup-Profil an, um Venture-Credits zu erhalten."
        />
      ) : (
        <>
          <SectionLabel number="01" label="Historie" title="Buchungen" />
          {transactions.length === 0 ? (
            <EmptyState
              icon={Coins}
              title="Noch keine Buchungen"
              description="Sobald das Lovedis-Team dir Credits gutschreibt, erscheinen sie hier."
            />
          ) : (
            <TableCard>
              <THead>
                <tr>
                  <Th>Datum</Th>
                  <Th>Art</Th>
                  <Th>Grund</Th>
                  <Th className="text-right">Betrag</Th>
                </tr>
              </THead>
              <tbody>
                {transactions.map((t) => (
                  <Tr key={t.id}>
                    <Td className="text-lv-secondary">
                      {formatDate(t.createdAt)}
                    </Td>
                    <Td>
                      <CreditTxTypeBadge value={t.type} />
                    </Td>
                    <Td className="text-lv-secondary">{t.reason}</Td>
                    <Td
                      className={
                        "text-right font-semibold tabular-nums " +
                        (t.amount < 0 ? "text-lv-orange" : "text-lv-mint-deep")
                      }
                    >
                      {t.amount > 0 ? `+${t.amount}` : t.amount}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </TableCard>
          )}
        </>
      )}
    </>
  );
}
