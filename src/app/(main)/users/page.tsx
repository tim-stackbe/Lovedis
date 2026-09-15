import type { Metadata } from "next";
import {
  ActiveToggle,
  ApprovePartnerButton,
  CreateUserForm,
  RoleSelect,
} from "@/components/users/UserAdmin";
import { Badge } from "@/components/ui/Badge";
import { BannerStat, Card } from "@/components/ui/Card";
import { HeroBanner } from "@/components/ui/HeroBanner";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { TableCard, Td, Th, THead, Tr } from "@/components/ui/Table";
import { requireRole } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Nutzerverwaltung" };

export default async function UsersPage() {
  const session = await requireRole(["ADMIN"]);

  const users = await prisma.user.findMany({
    orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
  });

  const active = users.filter((u) => u.isActive).length;
  const pendingPartners = users.filter(
    (u) => u.role === "BUSINESS_PARTNER" && u.approvedAt === null
  ).length;

  const isPendingPartner = (u: (typeof users)[number]) =>
    u.role === "BUSINESS_PARTNER" && u.approvedAt === null;

  return (
    <>
      <HeroBanner
        kicker="Plattform"
        title="Nutzerverwaltung"
        subtitle="Erstelle Konten, ändere Rollen und deaktiviere Nutzer über alle fünf Rollen hinweg."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:max-w-2xl">
          <BannerStat label="Nutzer" value={users.length} />
          <BannerStat label="Aktiv" value={active} />
          <BannerStat label="Deaktiviert" value={users.length - active} />
          <BannerStat label="Partner offen" value={pendingPartners} />
        </div>
      </HeroBanner>

      <section className="space-y-4">
        <SectionLabel number="01" label="Erstellen" title="Neuer Nutzer" />
        <Card className="p-6">
          <CreateUserForm />
        </Card>
      </section>

      <section className="space-y-4">
        <SectionLabel number="02" label="Verwalten" title="Alle Nutzer" />

        {/* Mobile: stacked cards */}
        <div className="space-y-3 md:hidden">
          {users.map((u) => {
            const isSelf = u.id === session.user.id;
            return (
              <Card
                key={u.id}
                className={`space-y-3 p-4 ${!u.isActive ? "opacity-60" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{u.name}</p>
                    <p className="truncate text-xs text-lv-secondary">
                      {u.email}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {u.isActive ? (
                      <Badge tone="mint">Aktiv</Badge>
                    ) : (
                      <Badge tone="orange">Deaktiviert</Badge>
                    )}
                    {isPendingPartner(u) && (
                      <Badge tone="blue">Freigabe offen</Badge>
                    )}
                  </div>
                </div>
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <dt className="text-xs text-lv-secondary">Unternehmen</dt>
                    <dd>{u.company ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-lv-secondary">Erstellt</dt>
                    <dd>{formatDate(u.createdAt)}</dd>
                  </div>
                </dl>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <RoleSelect userId={u.id} role={u.role} disabled={isSelf} />
                  <div className="flex items-center gap-2">
                    {isPendingPartner(u) && (
                      <ApprovePartnerButton userId={u.id} />
                    )}
                    <ActiveToggle
                      userId={u.id}
                      isActive={u.isActive}
                      disabled={isSelf}
                    />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Desktop: table */}
        <TableCard className="hidden md:block">
          <THead>
            <tr>
              <Th>Nutzer</Th>
              <Th>Unternehmen</Th>
              <Th>Erstellt</Th>
              <Th>Rolle</Th>
              <Th>Status</Th>
              <Th className="text-right">Aktionen</Th>
            </tr>
          </THead>
          <tbody>
            {users.map((u) => {
              const isSelf = u.id === session.user.id;
              return (
                <Tr key={u.id} className={!u.isActive ? "opacity-60" : ""}>
                  <Td>
                    <p className="font-semibold">{u.name}</p>
                    <p className="text-xs text-lv-secondary">{u.email}</p>
                  </Td>
                  <Td className="text-lv-secondary">{u.company ?? "—"}</Td>
                  <Td className="text-lv-secondary">{formatDate(u.createdAt)}</Td>
                  <Td>
                    <RoleSelect userId={u.id} role={u.role} disabled={isSelf} />
                  </Td>
                  <Td>
                    <div className="flex flex-col gap-1">
                      {u.isActive ? (
                        <Badge tone="mint">Aktiv</Badge>
                      ) : (
                        <Badge tone="orange">Deaktiviert</Badge>
                      )}
                      {isPendingPartner(u) && (
                        <Badge tone="blue">Freigabe offen</Badge>
                      )}
                    </div>
                  </Td>
                  <Td className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {isPendingPartner(u) && (
                        <ApprovePartnerButton userId={u.id} />
                      )}
                      <ActiveToggle
                        userId={u.id}
                        isActive={u.isActive}
                        disabled={isSelf}
                      />
                    </div>
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </TableCard>
      </section>
    </>
  );
}
