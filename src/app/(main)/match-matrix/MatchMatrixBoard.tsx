"use client";

import { LayoutGrid, Pencil, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { upsertMatchCell } from "@/app/actions/match-matrix";
import type {
  MatchUseCaseType,
  RelevanceLevel,
} from "@/generated/prisma/enums";
import {
  MatchContactStatusBadge,
  MatchUseCaseBadge,
} from "@/components/shared/badges";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorChip, Field, Input, Select, Textarea } from "@/components/ui/Field";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { TableCard, Td, Th, THead, Tr } from "@/components/ui/Table";
import {
  MATCH_CONTACT_STATUSES,
  MATCH_CONTACT_STATUS_LABELS,
  MATCH_USE_CASE_LABELS,
  MATCH_USE_CASE_TYPES,
  RELEVANCE_LABELS,
  RELEVANCE_LEVELS,
} from "@/lib/constants";
import {
  cellHasData,
  filterRows,
  isTopMatch,
  type MatchCellView,
  type MatchRowView,
} from "@/lib/match-matrix";
import { cn } from "@/lib/utils";
import { toast } from "@/stores/useToast";

export interface PartnerColumn {
  id: string;
  name: string;
  slug: string;
}

interface MatchMatrixBoardProps {
  partners: PartnerColumn[];
  rows: MatchRowView[];
}

// Relevance pill colour scale — encodes Hoch/Mittel/Niedrig (see legend).
const RELEVANCE_PILL: Record<RelevanceLevel, string> = {
  HIGH: "bg-lv-mint text-lv-mint-deep",
  MEDIUM: "bg-lv-yellow text-lv-yellow-deep",
  LOW: "bg-lv-surface text-lv-secondary",
};

const KIND_LABEL: Record<"S" | "P", string> = {
  S: "Startup",
  P: "Partner",
};

function RelPill({
  kind,
  level,
}: {
  kind: "S" | "P";
  level: RelevanceLevel;
}) {
  return (
    <span
      title={`${KIND_LABEL[kind]}-Relevanz: ${RELEVANCE_LABELS[level]}`}
      className={cn(
        "inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[11px] font-bold tabular-nums",
        RELEVANCE_PILL[level]
      )}
    >
      {kind}
    </span>
  );
}

function TopMatchBadge() {
  return (
    <Badge tone="mint" className="px-2 py-0 text-[10px] uppercase tracking-wide">
      <Sparkles className="h-3 w-3" />
      Top-Match
    </Badge>
  );
}

/** The inner content shared by desktop cells and mobile rows. */
function CellBody({ cell }: { cell: MatchCellView }) {
  const top = isTopMatch(cell.startupRelevance, cell.partnerRelevance);
  const hasRelevance = cell.startupRelevance || cell.partnerRelevance;
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-1">
        {cell.startupRelevance && <RelPill kind="S" level={cell.startupRelevance} />}
        {cell.partnerRelevance && <RelPill kind="P" level={cell.partnerRelevance} />}
        {!hasRelevance && <span className="text-xs text-lv-secondary">—</span>}
        {top && <TopMatchBadge />}
      </div>
      {cell.useCaseTypes.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {cell.useCaseTypes.map((uc) => (
            <MatchUseCaseBadge key={uc} value={uc} />
          ))}
        </div>
      ) : null}
      {cell.contactStatus !== "NONE" && (
        <MatchContactStatusBadge value={cell.contactStatus} />
      )}
      {cell.nextSteps && (
        <p
          title={cell.nextSteps}
          className="line-clamp-2 text-[11px] leading-tight text-lv-secondary"
        >
          {cell.nextSteps}
        </p>
      )}
    </div>
  );
}

/** Client filter chip — mirrors the Longlist FilterChip look, now interactive. */
function FilterChip({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
        active
          ? "border-lv-blue bg-lv-blue text-white"
          : "border-lv-border bg-white text-lv-secondary hover:bg-lv-surface"
      )}
    >
      {children}
    </button>
  );
}

interface EditTarget {
  startupId: string;
  startupName: string;
  partner: PartnerColumn;
  cell: MatchCellView | null;
}

function EditCellDialog({
  target,
  onClose,
}: {
  target: EditTarget;
  onClose: () => void;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(upsertMatchCell, undefined);
  const handled = useRef(false);

  useEffect(() => {
    if (state?.success && !handled.current) {
      handled.current = true;
      toast.success(state.success);
      router.refresh();
      onClose();
    }
  }, [state, router, onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pending) onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [pending, onClose]);

  const cell = target.cell;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-lv-text/40"
        onClick={() => !pending && onClose()}
        aria-hidden
      />
      <Card className="relative w-full max-w-md p-6">
        <h2 className="text-base font-bold text-lv-text">
          {target.startupName} × {target.partner.name}
        </h2>
        <p className="mt-1 text-xs text-lv-secondary">
          Passung pflegen — Relevanz, Use-Case und nächster Schritt.
        </p>
        <form action={formAction} className="mt-4 space-y-4">
          <input type="hidden" name="partnerId" value={target.partner.id} />
          <input type="hidden" name="startupId" value={target.startupId} />

          <div className="grid grid-cols-2 gap-3">
            <Field label="Startup-Relevanz (S)" htmlFor="mm-s">
              <Select
                id="mm-s"
                name="startupRelevance"
                defaultValue={cell?.startupRelevance ?? ""}
              >
                <option value="">—</option>
                {RELEVANCE_LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {RELEVANCE_LABELS[l]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Partner-Relevanz (P)" htmlFor="mm-p">
              <Select
                id="mm-p"
                name="partnerRelevance"
                defaultValue={cell?.partnerRelevance ?? ""}
              >
                <option value="">—</option>
                {RELEVANCE_LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {RELEVANCE_LABELS[l]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <fieldset>
            <legend className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-lv-secondary">
              Use-Case
            </legend>
            <div className="flex flex-wrap gap-2">
              {MATCH_USE_CASE_TYPES.map((uc) => (
                <label
                  key={uc}
                  className="inline-flex items-center gap-1.5 rounded-full border border-lv-border bg-white px-2.5 py-1 text-xs font-medium text-lv-text"
                >
                  <input
                    type="checkbox"
                    name="useCaseTypes"
                    value={uc}
                    defaultChecked={cell?.useCaseTypes.includes(uc) ?? false}
                    className="accent-lv-blue"
                  />
                  {MATCH_USE_CASE_LABELS[uc]}
                </label>
              ))}
            </div>
          </fieldset>

          <Field label="Kontakt-Status" htmlFor="mm-status">
            <Select
              id="mm-status"
              name="contactStatus"
              defaultValue={cell?.contactStatus ?? "NONE"}
            >
              {MATCH_CONTACT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {MATCH_CONTACT_STATUS_LABELS[s]}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Use-Case-Notiz" htmlFor="mm-note">
            <Input
              id="mm-note"
              name="useCaseNote"
              defaultValue={cell?.useCaseNote ?? ""}
              placeholder="Original-Beschreibung des Use-Cases…"
            />
          </Field>

          <Field label="Nächster Schritt" htmlFor="mm-next">
            <Textarea
              id="mm-next"
              name="nextSteps"
              defaultValue={cell?.nextSteps ?? ""}
              className="min-h-16 text-sm"
              placeholder="z. B. Folgetermin, 1-Pager senden…"
            />
          </Field>

          {state?.error && <ErrorChip>{state.error}</ErrorChip>}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
              disabled={pending}
            >
              Abbrechen
            </Button>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Speichern…" : "Speichern"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

export function MatchMatrixBoard({ partners, rows }: MatchMatrixBoardProps) {
  const [partnerSlug, setPartnerSlug] = useState<string | null>(null);
  const [useCase, setUseCase] = useState<MatchUseCaseType | null>(null);
  const [onlyTopMatch, setOnlyTopMatch] = useState(false);
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);

  const filters = { partnerSlug, useCase, onlyTopMatch };
  const filteredRows = filterRows(rows, filters);

  // Which partner columns are visible (all, or the single selected one).
  const visiblePartners = partnerSlug
    ? partners.filter((p) => p.slug === partnerSlug)
    : partners;

  const openEditor = (row: MatchRowView, partnerIndex: number) => {
    const partner = partners[partnerIndex];
    setEditTarget({
      startupId: row.startupId,
      startupName: row.startupName,
      partner,
      cell: row.cells[partnerIndex],
    });
  };

  return (
    <>
      <SectionLabel number="01" label="Filter" title="Partner, Use-Case & Fokus" />
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-lv-secondary">
            Partner
          </span>
          <FilterChip active={!partnerSlug} onClick={() => setPartnerSlug(null)}>
            Alle
          </FilterChip>
          {partners.map((p) => (
            <FilterChip
              key={p.slug}
              active={partnerSlug === p.slug}
              onClick={() =>
                setPartnerSlug(partnerSlug === p.slug ? null : p.slug)
              }
            >
              {p.name}
            </FilterChip>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-lv-secondary">
            Use-Case
          </span>
          <FilterChip active={!useCase} onClick={() => setUseCase(null)}>
            Alle
          </FilterChip>
          {MATCH_USE_CASE_TYPES.map((uc) => (
            <FilterChip
              key={uc}
              active={useCase === uc}
              onClick={() => setUseCase(useCase === uc ? null : uc)}
            >
              {MATCH_USE_CASE_LABELS[uc]}
            </FilterChip>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-lv-secondary">
            Fokus
          </span>
          <button
            type="button"
            onClick={() => setOnlyTopMatch((v) => !v)}
            aria-pressed={onlyTopMatch}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
              onlyTopMatch
                ? "border-lv-blue bg-lv-blue text-white"
                : "border-lv-border bg-white text-lv-secondary hover:bg-lv-surface"
            )}
          >
            <span
              className={cn(
                "relative inline-flex h-4 w-7 items-center rounded-full transition-colors",
                onlyTopMatch ? "bg-white/40" : "bg-lv-surface"
              )}
            >
              <span
                className={cn(
                  "absolute h-3 w-3 rounded-full bg-white shadow-sm transition-all",
                  onlyTopMatch ? "left-3.5" : "left-0.5"
                )}
              />
            </span>
            Nur beidseitig Hoch
          </button>
        </div>
      </div>

      <SectionLabel number="02" label="Legende" title="Wie die Matrix zu lesen ist" />
      <Card className="p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-lv-secondary">
              Relevanz-Pills
            </p>
            <div className="flex items-center gap-2">
              <RelPill kind="S" level="HIGH" />
              <RelPill kind="P" level="HIGH" />
              <span className="text-xs text-lv-secondary">
                S = Startup · P = Partner
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-lv-secondary">
              Farbskala
            </p>
            <div className="flex flex-wrap items-center gap-2 text-xs text-lv-secondary">
              {RELEVANCE_LEVELS.map((l) => (
                <span
                  key={l}
                  className={cn(
                    "rounded-full px-2 py-0.5 font-semibold",
                    RELEVANCE_PILL[l]
                  )}
                >
                  {RELEVANCE_LABELS[l]}
                </span>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-lv-secondary">
              Use-Cases
            </p>
            <div className="flex flex-wrap gap-1">
              {MATCH_USE_CASE_TYPES.map((uc) => (
                <MatchUseCaseBadge key={uc} value={uc} />
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-lv-secondary">
              Top-Match
            </p>
            <div className="flex items-center gap-2">
              <TopMatchBadge />
              <span className="text-xs text-lv-secondary">
                S &amp; P beide Hoch
              </span>
            </div>
          </div>
        </div>
      </Card>

      <SectionLabel number="03" label="Matrix" title="Startups × Partner" />

      {filteredRows.length === 0 ? (
        <Card className="p-8 text-center text-sm text-lv-secondary">
          Keine Paarungen für diese Filter. Passe Partner, Use-Case oder den
          Fokus an.
        </Card>
      ) : (
        <>
          {/* Mobile: stacked cards */}
          <div className="space-y-3 md:hidden">
            {filteredRows.map((row) => (
              <Card key={row.startupId} className="space-y-3 p-4">
                <p className="font-semibold">{row.startupName}</p>
                <div className="divide-y divide-lv-border">
                  {visiblePartners.map((p) => {
                    const partnerIndex = partners.findIndex(
                      (x) => x.slug === p.slug
                    );
                    const cell = row.cells[partnerIndex];
                    const top =
                      cellHasData(cell) &&
                      isTopMatch(cell.startupRelevance, cell.partnerRelevance);
                    return (
                      <button
                        type="button"
                        key={p.slug}
                        onClick={() => openEditor(row, partnerIndex)}
                        className={cn(
                          "flex w-full items-start justify-between gap-3 py-2.5 text-left first:pt-0 last:pb-0",
                          top && "-mx-4 rounded-md bg-lv-mint/30 px-4"
                        )}
                      >
                        <span className="pt-0.5 text-xs font-semibold uppercase tracking-wide text-lv-secondary">
                          {p.name}
                        </span>
                        <div className="min-w-0 text-right">
                          {cellHasData(cell) ? (
                            <div className="flex flex-col items-end">
                              <CellBody cell={cell} />
                            </div>
                          ) : (
                            <span className="text-lv-secondary">—</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </Card>
            ))}
          </div>

          {/* Desktop: matrix table with sticky startup column */}
          <TableCard className="hidden md:block">
            <THead>
              <tr>
                <Th className="sticky left-0 z-20 bg-lv-surface">Startup</Th>
                {visiblePartners.map((p) => (
                  <Th key={p.slug} className="min-w-[190px]">
                    {p.name}
                  </Th>
                ))}
              </tr>
            </THead>
            <tbody>
              {filteredRows.map((row) => (
                <Tr key={row.startupId}>
                  <Td className="sticky left-0 z-10 bg-white align-top font-semibold">
                    {row.startupName}
                  </Td>
                  {visiblePartners.map((p) => {
                    const partnerIndex = partners.findIndex(
                      (x) => x.slug === p.slug
                    );
                    const cell = row.cells[partnerIndex];
                    const top =
                      cellHasData(cell) &&
                      isTopMatch(cell.startupRelevance, cell.partnerRelevance);
                    return (
                      <Td
                        key={p.slug}
                        className={cn("group p-0 align-top", top && "bg-lv-mint/30")}
                      >
                        <button
                          type="button"
                          onClick={() => openEditor(row, partnerIndex)}
                          className="relative flex h-full w-full cursor-pointer flex-col px-4 py-3 text-left transition-colors hover:bg-lv-blue-soft/40"
                        >
                          <Pencil className="absolute right-2 top-2 h-3.5 w-3.5 text-lv-secondary opacity-0 transition-opacity group-hover:opacity-100" />
                          {cellHasData(cell) ? (
                            <CellBody cell={cell} />
                          ) : (
                            <span className="text-lv-secondary">—</span>
                          )}
                        </button>
                      </Td>
                    );
                  })}
                </Tr>
              ))}
            </tbody>
          </TableCard>
        </>
      )}

      <p className="flex items-center gap-2 text-xs text-lv-secondary">
        <LayoutGrid className="h-3.5 w-3.5" />
        Interne Cross-Partner-Ansicht — nur fürs Lovedis-Team. Zelle anklicken,
        um die Passung zu pflegen.
      </p>

      {editTarget && (
        <EditCellDialog
          key={`${editTarget.startupId}-${editTarget.partner.id}`}
          target={editTarget}
          onClose={() => setEditTarget(null)}
        />
      )}
    </>
  );
}
