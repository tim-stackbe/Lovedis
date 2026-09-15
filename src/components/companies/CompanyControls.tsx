"use client";

import { useActionState, useState, useTransition } from "react";
import {
  changeEmployeeCompanyRole,
  createCompany,
  inviteEmployee,
  moveEmployee,
  removeEmployee,
  setEmployeeActive,
  updateCompany,
} from "@/app/actions/companies";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ErrorChip, Field, Input, Select, SuccessChip } from "@/components/ui/Field";
import type { CompanyRole } from "@/generated/prisma/enums";
import { ALL_COMPANY_ROLES, COMPANY_ROLE_LABELS } from "@/lib/company-roles";
import { toast } from "@/stores/useToast";

// ---------------------------------------------------------------------------
// Invitations
// ---------------------------------------------------------------------------

export function InviteEmployeeForm({ companyId }: { companyId: string }) {
  const [state, formAction, pending] = useActionState(
    inviteEmployee,
    undefined
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="companyId" value={companyId} />
      <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Field label="Name" htmlFor="invite-name">
          <Input
            id="invite-name"
            name="name"
            placeholder="Jane Doe"
            autoComplete="off"
            required
            minLength={2}
          />
        </Field>
        <Field label="E-Mail" htmlFor="invite-email">
          <Input
            id="invite-email"
            name="email"
            type="email"
            placeholder="kolleg:in@firma.de"
            required
          />
        </Field>
        <Button type="submit" disabled={pending}>
          {pending ? "Senden…" : "Einladen"}
        </Button>
      </div>
      <p className="text-xs text-lv-secondary">
        Es wird sofort ein Zugang als Mitglied mit einem temporären Passwort
        angelegt. Die Person erhält ihre Zugangsdaten per E-Mail und legt beim
        ersten Login ein eigenes Passwort fest.
      </p>
      {state?.error && <ErrorChip>{state.error}</ErrorChip>}
      {state?.success && <SuccessChip>{state.success}</SuccessChip>}
    </form>
  );
}

// ---------------------------------------------------------------------------
// Employee controls
// ---------------------------------------------------------------------------

export function CompanyRoleSelect({
  userId,
  role,
  disabled,
}: {
  userId: string;
  role: CompanyRole;
  disabled?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState<CompanyRole>(role);
  const [confirming, setConfirming] = useState(false);
  const dirty = value !== role;

  const save = () =>
    startTransition(async () => {
      const res = await changeEmployeeCompanyRole(userId, value);
      setConfirming(false);
      if (res.error) {
        toast.error(res.error);
        setValue(role);
        return;
      }
      if (res.success) toast.success(res.success);
    });

  return (
    <div className="flex items-center gap-2">
      <Select
        value={value}
        disabled={disabled || pending}
        className="w-36 py-2 text-xs"
        onChange={(e) => setValue(e.target.value as CompanyRole)}
      >
        {ALL_COMPANY_ROLES.map((r) => (
          <option key={r} value={r}>
            {COMPANY_ROLE_LABELS[r]}
          </option>
        ))}
      </Select>
      {dirty && (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() => setConfirming(true)}
        >
          Speichern
        </Button>
      )}
      <ConfirmDialog
        open={confirming}
        title="Rolle ändern?"
        description={`Company-Rolle auf „${COMPANY_ROLE_LABELS[value]}“ ändern?`}
        confirmLabel="Ändern"
        pending={pending}
        onConfirm={save}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}

export function EmployeeActiveToggle({
  userId,
  isActive,
  disabled,
}: {
  userId: string;
  isActive: boolean;
  disabled?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  const run = () =>
    startTransition(async () => {
      const res = await setEmployeeActive(userId, !isActive);
      setConfirming(false);
      if (res.error) toast.error(res.error);
      else if (res.success) toast.success(res.success);
    });

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant={isActive ? "danger" : "secondary"}
        disabled={disabled || pending}
        onClick={() => (isActive ? setConfirming(true) : run())}
      >
        {pending ? "…" : isActive ? "Deaktivieren" : "Reaktivieren"}
      </Button>
      <ConfirmDialog
        open={confirming}
        title="Mitarbeiter:in deaktivieren?"
        description="Der Zugang wird bis zur Reaktivierung gesperrt."
        confirmLabel="Deaktivieren"
        tone="danger"
        pending={pending}
        onConfirm={run}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}

export function RemoveEmployeeButton({
  userId,
  disabled,
}: {
  userId: string;
  disabled?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  const run = () =>
    startTransition(async () => {
      const res = await removeEmployee(userId);
      setConfirming(false);
      if (res.error) toast.error(res.error);
      else if (res.success) toast.success(res.success);
    });

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={disabled || pending}
        onClick={() => setConfirming(true)}
      >
        Entfernen
      </Button>
      <ConfirmDialog
        open={confirming}
        title="Aus Unternehmen entfernen?"
        description="Die Person verliert Zugriff und wird aus dem Unternehmen entfernt. Dies sperrt außerdem ihr Konto."
        confirmLabel="Entfernen"
        tone="danger"
        pending={pending}
        onConfirm={run}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Platform-admin controls
// ---------------------------------------------------------------------------

export function CreateCompanyForm() {
  const [state, formAction, pending] = useActionState(createCompany, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Name" htmlFor="company-name">
          <Input id="company-name" name="name" placeholder="ACME GmbH" required />
        </Field>
        <Field label="Website (optional)" htmlFor="company-website">
          <Input id="company-website" name="website" placeholder="acme.de" />
        </Field>
        <Field label="Sitzplatzlimit (optional)" htmlFor="company-seats">
          <Input
            id="company-seats"
            name="seatLimit"
            type="number"
            min={1}
            placeholder="unbegrenzt"
          />
        </Field>
      </div>
      {state?.error && <ErrorChip>{state.error}</ErrorChip>}
      {state?.success && <SuccessChip>{state.success}</SuccessChip>}
      <Button type="submit" disabled={pending}>
        {pending ? "Erstellen…" : "Unternehmen erstellen"}
      </Button>
    </form>
  );
}

export function CompanyEditForm({
  company,
}: {
  company: {
    id: string;
    name: string;
    website: string | null;
    seatLimit: number | null;
    isActive: boolean;
  };
}) {
  const [state, formAction, pending] = useActionState(updateCompany, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={company.id} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Name" htmlFor="edit-name">
          <Input id="edit-name" name="name" defaultValue={company.name} required />
        </Field>
        <Field label="Website" htmlFor="edit-website">
          <Input
            id="edit-website"
            name="website"
            defaultValue={company.website ?? ""}
            placeholder="acme.de"
          />
        </Field>
        <Field label="Sitzplatzlimit" htmlFor="edit-seats">
          <Input
            id="edit-seats"
            name="seatLimit"
            type="number"
            min={1}
            defaultValue={company.seatLimit ?? ""}
            placeholder="unbegrenzt"
          />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm text-lv-text">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={company.isActive}
          value="true"
          className="h-4 w-4 rounded border-lv-border"
        />
        Unternehmen aktiv
      </label>
      {state?.error && <ErrorChip>{state.error}</ErrorChip>}
      {state?.success && <SuccessChip>{state.success}</SuccessChip>}
      <Button type="submit" disabled={pending}>
        {pending ? "Speichern…" : "Änderungen speichern"}
      </Button>
    </form>
  );
}

export function MoveEmployeeControl({
  userId,
  currentCompanyId,
  companies,
}: {
  userId: string;
  currentCompanyId: string;
  companies: { id: string; name: string }[];
}) {
  const [pending, startTransition] = useTransition();
  const [target, setTarget] = useState("");

  const run = () => {
    if (!target) return;
    startTransition(async () => {
      const res = await moveEmployee(userId, target);
      if (res.error) toast.error(res.error);
      else if (res.success) {
        toast.success(res.success);
        setTarget("");
      }
    });
  };

  const options = companies.filter((c) => c.id !== currentCompanyId);

  return (
    <div className="flex items-center gap-2">
      <Select
        value={target}
        disabled={pending}
        className="w-44 py-2 text-xs"
        onChange={(e) => setTarget(e.target.value)}
      >
        <option value="">Verschieben nach…</option>
        {options.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Select>
      {target && (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={run}
        >
          Verschieben
        </Button>
      )}
    </div>
  );
}
