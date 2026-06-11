"use client";

import { useActionState, useTransition } from "react";
import {
  createUser,
  toggleUserActive,
  updateUserRole,
} from "@/app/actions/users";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  ErrorChip,
  Field,
  Input,
  Select,
  SuccessChip,
} from "@/components/ui/Field";
import type { UserRole } from "@/generated/prisma/enums";
import { ALL_ROLES, ROLE_LABELS } from "@/lib/roles";
import { cn } from "@/lib/utils";

export function CreateUserForm() {
  const [state, formAction, pending] = useActionState(createUser, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="new-name">
          <Input id="new-name" name="name" placeholder="Jane Doe" required />
        </Field>
        <Field label="Email" htmlFor="new-email">
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
        <Field label="Password" htmlFor="new-password">
          <Input
            id="new-password"
            name="password"
            type="text"
            placeholder="min. 8 characters"
            required
            minLength={8}
          />
        </Field>
        <Field label="Role" htmlFor="new-role">
          <Select id="new-role" name="role" defaultValue="MEMBER">
            {ALL_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Company (optional)" htmlFor="new-company">
          <Input id="new-company" name="company" placeholder="ACME GmbH" />
        </Field>
      </div>
      {state?.error && <ErrorChip>{state.error}</ErrorChip>}
      {state?.success && <SuccessChip>{state.success}</SuccessChip>}
      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create user"}
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

  return (
    <Select
      defaultValue={role}
      disabled={disabled || pending}
      className="w-40 py-1.5 text-xs"
      onChange={(e) => {
        const next = e.target.value;
        startTransition(async () => {
          await updateUserRole(userId, next);
        });
      }}
    >
      {ALL_ROLES.map((r) => (
        <option key={r} value={r}>
          {ROLE_LABELS[r]}
        </option>
      ))}
    </Select>
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

  if (disabled) {
    return <Badge tone="blue">You</Badge>;
  }

  return (
    <button
      onClick={() =>
        startTransition(async () => {
          await toggleUserActive(userId);
        })
      }
      disabled={pending}
      className={cn(
        "rounded-button px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50",
        isActive
          ? "bg-lv-orange-soft text-lv-orange hover:bg-lv-orange hover:text-white"
          : "bg-lv-mint text-lv-mint-deep hover:bg-lv-mint-deep hover:text-white"
      )}
    >
      {pending ? "…" : isActive ? "Deactivate" : "Reactivate"}
    </button>
  );
}
