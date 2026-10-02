import { Coins } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { CreditTxTypeBadge } from "@/components/shared/badges";
import { CreditBookingForm } from "@/components/credits/CreditBookingForm";
import { BannerStat, Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { TableCard, Td, Th, THead, Tr } from "@/components/ui/Table";
import { requireTeam } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Venture-Credits" };

export default async function CreditsPage() {
  await requireTeam();

  const [accounts, recent, startups] = await Promise.all([
    prisma.creditAccount.findMany({
      orderBy: { balance: "desc" },
      include: {
        startup: { select: { id: true, name: true } },
        _count: { select: { transactions: true } },
      },
    }),
    prisma.creditTransaction.findMany({
      orderBy: { createdAt: "desc" },
      take: 25,
      include: {
        account: { select: { startup: { select: { name: true } } } },
        createdBy: { select: { name: true } },
      },
    }),
    prisma.startup.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const totalIssued = accounts.reduce((sum, a) => sum + a.balance, 0);
  const startupOptions = startups.map((s) => ({ id: s.id, label: s.name }));

  return (
    <>
      <HeroBanner
        kicker="Venture Platform"
        title="Venture-Credits"
        subtitle="Vergib Startups Venture-Credits und verwalte ihr Guthaben. Jede Buchung landet im Ledger, aktualisiert den Saldo und steht sofort für Marktplatz-Buchungen zur Verfügung."
      >
        <div className="grid grid-cols-2 gap-3 sm:max-w-md">
          <BannerStat label="Konten" value={accounts.length} />
          <BannerStat label="Saldo gesamt" value={totalIssued} />
        </div>
      </HeroBanner>

      <SectionLabel
        number="01"
        label="Vergabe"
        title="Venture-Credits an Startup vergeben"
      />
      <Card className="space-y-4 p-6">
        <p className="text-sm text-lv-secondary">
          Wähle ein Startup, gib den Betrag und einen Grund an und erfasse die
          Buchung. Für eine Gutschrift bleibt die Art auf{" "}
          <span className="font-semibold text-lv-text">Gutschrift (GRANT)</span>
          . Hat das Startup noch kein Konto, wird es automatisch angelegt.
        </p>
        <CreditBookingForm startups={startupOptions} />
      </Card>

      <SectionLabel number="02" label="Konten" title="Guthaben je Startup" />
      {accounts.length === 0 ? (
        <EmptyState
          icon={Coins}
          title="Noch keine Konten"
          description="Sobald du eine Buchung erfasst, wird automatisch ein Konto angelegt."
        />
      ) : (
        <TableCard>
          <THead>
            <tr>
              <Th>Startup</Th>
              <Th>Buchungen</Th>
              <Th className="text-right">Fix</Th>
              <Th className="text-right">Flexibel</Th>
              <Th className="text-right">Saldo</Th>
            </tr>
          </THead>
          <tbody>
            {accounts.map((a) => (
              <Tr key={a.id}>
                <Td>
                  <Link
                    href={`/startups/${a.startup.id}`}
                    className="font-semibold hover:text-lv-blue"
                  >
                    {a.startup.name}
                  </Link>
                </Td>
                <Td className="text-lv-secondary">{a._count.transactions}</Td>
                <Td className="text-right tabular-nums text-lv-secondary">
                  {a.fixBalance}
                </Td>
                <Td className="text-right tabular-nums text-lv-secondary">
                  {a.flexBalance}
                </Td>
                <Td className="text-right font-semibold tabular-nums">
                  {a.balance}
                </Td>
              </Tr>
            ))}
          </tbody>
        </TableCard>
      )}

      <SectionLabel number="03" label="Ledger" title="Letzte Buchungen" />
      {recent.length === 0 ? (
        <EmptyState
          icon={Coins}
          title="Noch keine Buchungen"
          description="Erfasse oben eine erste Buchung."
        />
      ) : (
        <TableCard>
          <THead>
            <tr>
              <Th>Datum</Th>
              <Th>Startup</Th>
              <Th>Art</Th>
              <Th>Grund</Th>
              <Th>Von</Th>
              <Th className="text-right">Betrag</Th>
            </tr>
          </THead>
          <tbody>
            {recent.map((t) => (
              <Tr key={t.id}>
                <Td className="text-lv-secondary">{formatDate(t.createdAt)}</Td>
                <Td>{t.account.startup.name}</Td>
                <Td>
                  <CreditTxTypeBadge value={t.type} />
                </Td>
                <Td className="text-lv-secondary">{t.reason}</Td>
                <Td className="text-lv-secondary">
                  {t.createdBy?.name ?? "—"}
                </Td>
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
  );
}
