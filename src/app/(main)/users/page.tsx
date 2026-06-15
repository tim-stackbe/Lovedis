import type { Metadata } from "next";
import {
  ActiveToggle,
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

  return (
    <>
      <HeroBanner
        kicker="Plattform"
        title="Nutzerverwaltung"
        subtitle="Erstelle Konten, ändere Rollen und deaktiviere Nutzer über alle fünf Rollen hinweg."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:max-w-md">
          <BannerStat label="Nutzer" value={users.length} />
          <BannerStat label="Aktiv" value={active} />
          <BannerStat label="Deaktiviert" value={users.length - active} />
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
        <TableCard>
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
                    {u.isActive ? (
                      <Badge tone="mint">Aktiv</Badge>
                    ) : (
                      <Badge tone="orange">Deaktiviert</Badge>
                    )}
                  </Td>
                  <Td className="text-right">
                    <ActiveToggle
                      userId={u.id}
                      isActive={u.isActive}
                      disabled={isSelf}
                    />
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
