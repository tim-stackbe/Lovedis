import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { TableCard, Td, Th, THead, Tr } from "@/components/ui/Table";
import {
  CompanyRoleSelect,
  EmployeeActiveToggle,
  MoveEmployeeControl,
  RemoveEmployeeButton,
} from "@/components/companies/CompanyControls";
import type { CompanyRole } from "@/generated/prisma/enums";
import { formatDateTime } from "@/lib/utils";

export interface MemberRow {
  id: string;
  name: string;
  email: string;
  companyRole: CompanyRole;
  isActive: boolean;
  lastLoginAt: Date | null;
}

/**
 * Shared employee view with the management controls. Server component: renders
 * the client controls from CompanyControls. Used by both the Partner /team page
 * and the platform-admin per-company page.
 */
export function CompanyMembers({
  companyId,
  members,
  currentUserId,
  moveCompanies,
}: {
  companyId: string;
  members: MemberRow[];
  currentUserId: string;
  /** When provided, renders a per-row "move to company" control (admin only). */
  moveCompanies?: { id: string; name: string }[];
}) {
  return (
    <div className="space-y-8">
      {members.length === 0 ? (
        <Card className="p-8 text-center text-sm text-lv-secondary">
          Noch keine Mitarbeiter:innen in diesem Unternehmen.
        </Card>
      ) : (
        <>
          {/* Mobile: stacked cards */}
          <div className="space-y-3 md:hidden">
            {members.map((m) => {
              const isSelf = m.id === currentUserId;
              return (
                <Card
                  key={m.id}
                  className={`space-y-3 p-4 ${!m.isActive ? "opacity-60" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">{m.name}</p>
                      <p className="truncate text-xs text-lv-secondary">
                        {m.email}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {m.isActive ? (
                        <Badge tone="mint">Aktiv</Badge>
                      ) : (
                        <Badge tone="orange">Deaktiviert</Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-lv-secondary">
                    Letzter Login: {formatDateTime(m.lastLoginAt)}
                  </p>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <CompanyRoleSelect
                      userId={m.id}
                      role={m.companyRole}
                      disabled={isSelf}
                    />
                    <div className="flex items-center gap-2">
                      <EmployeeActiveToggle
                        userId={m.id}
                        isActive={m.isActive}
                        disabled={isSelf}
                      />
                      <RemoveEmployeeButton userId={m.id} disabled={isSelf} />
                    </div>
                  </div>
                  {moveCompanies && (
                    <MoveEmployeeControl
                      userId={m.id}
                      currentCompanyId={companyId}
                      companies={moveCompanies}
                    />
                  )}
                </Card>
              );
            })}
          </div>

          {/* Desktop: table */}
          <TableCard className="hidden md:block">
            <THead>
              <tr>
                <Th>Mitarbeiter:in</Th>
                <Th>Letzter Login</Th>
                <Th>Company-Rolle</Th>
                <Th>Status</Th>
                <Th className="text-right">Aktionen</Th>
              </tr>
            </THead>
            <tbody>
              {members.map((m) => {
                const isSelf = m.id === currentUserId;
                return (
                  <Tr key={m.id} className={!m.isActive ? "opacity-60" : ""}>
                    <Td>
                      <p className="font-semibold">
                        {m.name}
                        {isSelf && (
                          <span className="ml-2 text-xs text-lv-secondary">
                            (Du)
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-lv-secondary">{m.email}</p>
                    </Td>
                    <Td className="text-lv-secondary">
                      {formatDateTime(m.lastLoginAt)}
                    </Td>
                    <Td>
                      <CompanyRoleSelect
                        userId={m.id}
                        role={m.companyRole}
                        disabled={isSelf}
                      />
                    </Td>
                    <Td>
                      {m.isActive ? (
                        <Badge tone="mint">Aktiv</Badge>
                      ) : (
                        <Badge tone="orange">Deaktiviert</Badge>
                      )}
                    </Td>
                    <Td>
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center justify-end gap-2">
                          <EmployeeActiveToggle
                            userId={m.id}
                            isActive={m.isActive}
                            disabled={isSelf}
                          />
                          <RemoveEmployeeButton userId={m.id} disabled={isSelf} />
                        </div>
                        {moveCompanies && (
                          <MoveEmployeeControl
                            userId={m.id}
                            currentCompanyId={companyId}
                            companies={moveCompanies}
                          />
                        )}
                      </div>
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </TableCard>
        </>
      )}
    </div>
  );
}
