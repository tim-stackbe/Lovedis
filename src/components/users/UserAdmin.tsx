"use client";

import { useActionState, useState, useTransition } from "react";
import {
  approvePartner,
  createUser,
  toggleUserActive,
  updateUserRole,
} from "@/app/actions/users";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  ErrorChip,
  Field,
  Input,
  Select,
  SuccessChip,
} from "@/components/ui/Field";
import type { UserRole } from "@/generated/prisma/enums";
import { ALL_ROLES, ROLE_LABELS } from "@/lib/roles";
import { toast } from "@/stores/useToast";
import { cn } from "@/lib/utils";

export function CreateUserForm() {
  const [state, formAction, pending] = useActionState(createUser, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="new-name">
          <Input id="new-name" name="name" placeholder="Jane Doe" required />
        </Field>
        <Field label="E-Mail" htmlFor="new-email">
          <Input
            id="new-email"
            name="email"
            type="email"
            placeholder="jane@company.com"
            required
          />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Passwort" htmlFor="new-password">
          <Input
            id="new-password"
            name="password"
            type="text"
            placeholder="mind. 8 Zeichen"
            required
            minLength={8}
          />
        </Field>
        <Field label="Rolle" htmlFor="new-role">
          <Select id="new-role" name="role" defaultValue="MEMBER">
            {ALL_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Unternehmen (optional)" htmlFor="new-company">
          <Input id="new-company" name="company" placeholder="ACME GmbH" />
        </Field>
      </div>
      {state?.error && <ErrorChip>{state.error}</ErrorChip>}
      {state?.success && <SuccessChip>{state.success}</SuccessChip>}
      <Button type="submit" disabled={pending}>
        {pending ? "Erstellen…" : "Nutzer erstellen"}
      </Button>
    </form>
  );
}

export function RoleSelect({
  userId,
  role,
  disabled,
}: {
  userId: string;
  role: UserRole;
  disabled?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState<UserRole>(role);
  const [confirming, setConfirming] = useState(false);
  const dirty = value !== role;

  const save = () => {
    startTransition(async () => {
      const res = await updateUserRole(userId, value);
      setConfirming(false);
      if (res.error) {
        toast.error(res.error);
        setValue(role);
        return;
      }
      if (res.success) toast.success(res.success);
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Select
        value={value}
        disabled={disabled || pending}
        className="w-40 py-2 text-xs"
        onChange={(e) => setValue(e.target.value as UserRole)}
      >
        {ALL_ROLES.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABELS[r]}
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
        description={`Rolle auf „${ROLE_LABELS[value]}“ ändern? Das passt die Berechtigungen dieses Nutzers sofort an.`}
        confirmLabel="Ändern"
        pending={pending}
        onConfirm={save}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}

export function ApprovePartnerButton({ userId }: { userId: string }) {
  const [pending, startTransition] = useTransition();

  const run = () => {
    startTransition(async () => {
      const res = await approvePartner(userId);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      if (res.success) toast.success(res.success);
    });
  };

  return (
    <Button
      type="button"
      size="sm"
      disabled={pending}
      onClick={run}
    >
      {pending ? "Freigeben…" : "Freigeben"}
    </Button>
  );
}

export function ActiveToggle({
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

  const run = () => {
    startTransition(async () => {
      const res = await toggleUserActive(userId);
      setConfirming(false);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      if (res.success) toast.success(res.success);
    });
  };

  if (disabled) {
    return <Badge tone="blue">Du</Badge>;
  }

  return (
    <>
      <button
        onClick={() => (isActive ? setConfirming(true) : run())}
        disabled={pending}
        className={cn(
          "rounded-button px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50",
          isActive
            ? "bg-lv-orange-soft text-lv-orange hover:bg-lv-orange hover:text-white"
            : "bg-lv-mint text-lv-mint-deep hover:bg-lv-mint-deep hover:text-white"
        )}
      >
        {pending ? "…" : isActive ? "Deaktivieren" : "Reaktivieren"}
      </button>
      <ConfirmDialog
        open={confirming}
        title="Nutzer deaktivieren?"
        description="Der Nutzer kann sich anschließend nicht mehr anmelden, bis das Konto reaktiviert wird."
        confirmLabel="Deaktivieren"
        tone="danger"
        pending={pending}
        onConfirm={run}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
