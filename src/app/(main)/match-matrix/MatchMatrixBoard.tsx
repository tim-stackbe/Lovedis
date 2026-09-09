"use client";

import { ChevronRight, LayoutGrid, Pencil, Sparkles, X } from "lucide-react";
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
  RelevanceBadge,
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
  mutualFitLevel,
  type MatchCellView,
  type MatchRowView,
  type MatchSideInput,
  type MutualFitLevel,
  type PartnerTally,
} from "@/lib/match-matrix";
import { cn } from "@/lib/utils";
import { toast } from "@/stores/useToast";

export interface PartnerColumn {
  id: string;
  name: string;
  slug: string;
}

interface MatchMatrixBoardProps {
  batchId: string;
  partners: PartnerColumn[];
  rows: MatchRowView[];
}

// --- Heatmap encoding -------------------------------------------------------
// The cell background communicates the MUTUAL fit at a glance; the individual
// S/P levels live in the two-dot indicator and the detail drawer.

const FIT_LABEL: Record<MutualFitLevel, string> = {
  top: "Top-Match",
  strong: "Stark",
  moderate: "Solide",
  weak: "Schwach",
  none: "—",
};

const FIT_TILE: Record<MutualFitLevel, string> = {
  top: "bg-lv-mint ring-1 ring-inset ring-lv-mint-deep/25",
  strong: "bg-lv-mint/55",
  moderate: "bg-lv-yellow/55",
  weak: "bg-lv-surface",
  none: "bg-white",
};

const FIT_TEXT: Record<MutualFitLevel, string> = {
  top: "text-lv-mint-deep",
  strong: "text-lv-mint-deep",
  moderate: "text-lv-yellow-deep",
  weak: "text-lv-secondary",
  none: "text-lv-secondary",
};

// Relevance dot colours for the compact S·P indicator (see legend).
const REL_DOT: Record<RelevanceLevel, string> = {
  HIGH: "bg-lv-mint-deep",
  MEDIUM: "bg-lv-yellow-deep",
  LOW: "bg-lv-secondary/40",
};

const KIND_LABEL: Record<"S" | "P", string> = {
  S: "Startup",
  P: "Partner",
};

/** Initials for the startup avatar (max two letters, upper-cased). */
function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/** Compact two-dot S·P indicator — colour encodes each side's relevance. */
function SpDots({ cell }: { cell: MatchCellView }) {
  const dot = (kind: "S" | "P", level: RelevanceLevel | null) => (
    <span
      className="inline-flex items-center gap-1"
      title={
        level
          ? `${KIND_LABEL[kind]}-Relevanz: ${RELEVANCE_LABELS[level]}`
          : `${KIND_LABEL[kind]}-Relevanz: —`
      }
    >
      <span className="text-[10px] font-bold text-lv-secondary">{kind}</span>
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          level ? REL_DOT[level] : "border border-lv-border bg-white"
        )}
      />
    </span>
  );
  return (
    <span className="flex items-center gap-2">
      {dot("S", cell.startupRelevance)}
      {dot("P", cell.partnerRelevance)}
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

/** Small, colour-coded chip summarising the mutual fit (mobile + drawer). */
function FitChip({ level }: { level: MutualFitLevel }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold",
        FIT_TILE[level],
        FIT_TEXT[level]
      )}
    >
      {FIT_LABEL[level]}
    </span>
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

/** Read-only detail summary shown at the top of the drawer. */
function CellDetails({ cell }: { cell: MatchCellView | null }) {
  const level = cell
    ? mutualFitLevel(cell.startupRelevance, cell.partnerRelevance)
    : "none";
  const hasData = cellHasData(cell);
  return (
    <div className="space-y-4 rounded-card bg-lv-surface/60 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <FitChip level={level} />
        {isTopMatch(cell?.startupRelevance, cell?.partnerRelevance) && (
          <TopMatchBadge />
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-lv-secondary">
            Startup-Relevanz
          </p>
          {cell?.startupRelevance ? (
            <RelevanceBadge value={cell.startupRelevance} />
          ) : (
            <span className="text-sm text-lv-secondary">—</span>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-lv-secondary">
            Partner-Relevanz
          </p>
          {cell?.partnerRelevance ? (
            <RelevanceBadge value={cell.partnerRelevance} />
          ) : (
            <span className="text-sm text-lv-secondary">—</span>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-lv-secondary">
          Use-Case
        </p>
        {cell && cell.useCaseTypes.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {cell.useCaseTypes.map((uc) => (
              <MatchUseCaseBadge key={uc} value={uc} />
            ))}
          </div>
        ) : (
          <span className="text-sm text-lv-secondary">—</span>
        )}
        {cell?.useCaseNote && (
          <p className="pt-1 text-sm text-lv-text">{cell.useCaseNote}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-lv-secondary">
            Kontakt-Status
          </p>
          <MatchContactStatusBadge value={cell?.contactStatus ?? "NONE"} />
        </div>
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-lv-secondary">
            Nächster Schritt
          </p>
          <p className="text-sm text-lv-text">{cell?.nextSteps || "—"}</p>
        </div>
      </div>

      {!hasData && (
        <p className="text-xs text-lv-secondary">
          Noch keine Daten für diese Paarung — unten anlegen.
        </p>
      )}
    </div>
  );
}

function yesNoDash(v: boolean | null | undefined): string {
  return v === true ? "Ja" : v === false ? "Nein" : "—";
}

/** Read-only summary of one self-service side (startup or partner). */
function SideSummary({
  title,
  side,
}: {
  title: string;
  side: MatchSideInput | null | undefined;
}) {
  const has =
    side &&
    (side.relevance !== null ||
      side.useCaseTypes.length > 0 ||
      Boolean(side.useCaseNote) ||
      Boolean(side.openQuestions) ||
      Boolean(side.notes) ||
      side.followUp !== null ||
      side.contacted !== null);
  return (
    <div className="space-y-2 rounded-card border border-lv-border p-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-lv-secondary">
          {title}
        </p>
        {side?.updatedAt && (
          <span className="text-[10px] text-lv-secondary">
            {new Date(side.updatedAt).toLocaleDateString("de-DE")}
          </span>
        )}
      </div>
      {!has ? (
        <p className="text-xs text-lv-secondary">Keine Selbstauskunft.</p>
      ) : (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            {side!.relevance ? (
              <RelevanceBadge value={side!.relevance} />
            ) : (
              <span className="text-xs text-lv-secondary">Relevanz —</span>
            )}
            <span className="text-[11px] text-lv-secondary">
              Kontakt: {yesNoDash(side!.contacted)} · Folgetermin:{" "}
              {yesNoDash(side!.followUp)}
            </span>
          </div>
          {side!.useCaseTypes.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {side!.useCaseTypes.map((uc) => (
                <MatchUseCaseBadge key={uc} value={uc} />
              ))}
            </div>
          )}
          {side!.useCaseNote && (
            <p className="text-xs text-lv-text">{side!.useCaseNote}</p>
          )}
          {side!.openQuestions && (
            <p className="text-xs text-lv-text">
              <span className="text-lv-secondary">Offene Fragen: </span>
              {side!.openQuestions}
            </p>
          )}
          {side!.notes && (
            <p className="text-xs text-lv-text">
              <span className="text-lv-secondary">Anmerkung: </span>
              {side!.notes}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function PartnerTallyBlock({ tally }: { tally: PartnerTally }) {
  const total = tally.yes + tally.no;
  return (
    <div className="space-y-2 rounded-card border border-lv-border p-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-lv-secondary">
          Abstimmung des Partners
        </p>
        {total > 0 ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
              tally.outcome
                ? "bg-lv-mint/60 text-lv-mint-deep"
                : "bg-lv-orange-soft text-lv-orange"
            )}
          >
            {tally.outcome ? "positiv" : "negativ"} {tally.yes}:{tally.no}
          </span>
        ) : (
          <span className="text-[11px] text-lv-secondary">offen</span>
        )}
      </div>
      {tally.votes.length === 0 ? (
        <p className="text-xs text-lv-secondary">Noch keine Stimmen abgegeben.</p>
      ) : (
        <ul className="space-y-1">
          {tally.votes.map((v, i) => (
            <li
              key={`${v.voterName}-${i}`}
              className="flex items-center justify-between gap-2 text-xs"
            >
              <span className="min-w-0 truncate text-lv-text">{v.voterName}</span>
              <span className="flex shrink-0 items-center gap-2">
                {v.relevance && <RelevanceBadge value={v.relevance} />}
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    v.interested === true
                      ? "bg-lv-mint/60 text-lv-mint-deep"
                      : v.interested === false
                        ? "bg-lv-orange-soft text-lv-orange"
                        : "bg-lv-surface text-lv-secondary"
                  )}
                >
                  {v.interested === true
                    ? "Ja"
                    : v.interested === false
                      ? "Nein"
                      : "—"}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EditCellDialog({
  batchId,
  target,
  onClose,
}: {
  batchId: string;
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
    <div className="fixed inset-0 z-[70] flex justify-end">
      <div
        className="absolute inset-0 bg-lv-text/40"
        onClick={() => !pending && onClose()}
        aria-hidden
      />
      <div className="relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-lv-border bg-white shadow-card lv-scroll">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-lv-border bg-white px-6 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-lv-blue">
              {target.partner.name}
            </p>
            <h2 className="mt-0.5 text-base font-bold text-lv-text">
              {target.startupName}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => !pending && onClose()}
            className="rounded-button p-1.5 text-lv-secondary transition-colors hover:bg-lv-surface"
            aria-label="Schließen"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          <CellDetails cell={cell} />

          <div className="space-y-2">
            <p className="lv-wordmark text-xs text-lv-blue">
              Selbstauskunft beider Seiten
            </p>
            <div className="grid gap-2">
              <SideSummary title="Startup-Seite" side={cell?.startupSide} />
              <SideSummary
                title="Partner-Seite (aggregiert)"
                side={cell?.partnerSide}
              />
              {cell?.partnerTally && (
                <PartnerTallyBlock tally={cell.partnerTally} />
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="lv-wordmark text-xs text-lv-blue shrink-0">
              Team-Bearbeitung
            </span>
            <span className="h-px flex-1 bg-lv-border" />
          </div>

          <form action={formAction} className="space-y-4">
            <input type="hidden" name="batchId" value={batchId} />
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

            <div className="flex justify-end gap-2 pb-2">
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
        </div>
      </div>
    </div>
  );
}

export function MatchMatrixBoard({
  batchId,
  partners,
  rows,
}: MatchMatrixBoardProps) {
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
          <span className="w-16 text-xs font-semibold uppercase tracking-wider text-lv-secondary">
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
          <span className="w-16 text-xs font-semibold uppercase tracking-wider text-lv-secondary">
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
          <span className="w-16 text-xs font-semibold uppercase tracking-wider text-lv-secondary">
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
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-lv-secondary">
              Gegenseitige Passung (Zellfarbe)
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              {(["top", "strong", "moderate", "weak"] as MutualFitLevel[]).map(
                (l) => (
                  <FitChip key={l} level={l} />
                )
              )}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-lv-secondary">
              S·P-Indikator
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-lv-secondary">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-lv-mint-deep" /> Hoch
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-lv-yellow-deep" /> Mittel
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-lv-secondary/40" /> Niedrig
              </span>
              <span className="text-lv-secondary">
                S = Startup · P = Partner
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-lv-secondary">
              Details je Zelle
            </p>
            <p className="text-xs text-lv-secondary">
              Zelle anklicken öffnet die Detail-Ansicht: Use-Case,
              Kontakt-Status und nächster Schritt — inkl. Bearbeiten.
            </p>
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
          {/* Mobile: stacked, readable per-startup cards */}
          <div className="space-y-3 md:hidden">
            {filteredRows.map((row) => (
              <Card key={row.startupId} className="overflow-hidden">
                <div className="flex items-center gap-3 border-b border-lv-border bg-lv-surface/60 px-4 py-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-lv-blue text-[11px] font-bold text-white">
                    {initials(row.startupName)}
                  </span>
                  <p className="font-semibold text-lv-text">{row.startupName}</p>
                </div>
                <div className="divide-y divide-lv-border">
                  {visiblePartners.map((p) => {
                    const partnerIndex = partners.findIndex(
                      (x) => x.slug === p.slug
                    );
                    const cell = row.cells[partnerIndex];
                    const level = cell
                      ? mutualFitLevel(
                          cell.startupRelevance,
                          cell.partnerRelevance
                        )
                      : "none";
                    return (
                      <button
                        type="button"
                        key={p.slug}
                        onClick={() => openEditor(row, partnerIndex)}
                        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-lv-surface/50"
                      >
                        <span className="min-w-0 text-sm font-semibold text-lv-text">
                          {p.name}
                        </span>
                        <span className="flex items-center gap-3">
                          {cellHasData(cell) ? (
                            <>
                              <SpDots cell={cell} />
                              <FitChip level={level} />
                            </>
                          ) : (
                            <span className="text-sm text-lv-secondary">—</span>
                          )}
                          <ChevronRight className="h-4 w-4 shrink-0 text-lv-secondary" />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </Card>
            ))}
          </div>

          {/* Desktop: heatmap matrix with sticky header row + startup column */}
          <TableCard className="hidden max-h-[72vh] overflow-y-auto md:block">
            <THead>
              <tr>
                <Th className="sticky left-0 top-0 z-30 bg-lv-surface">
                  Startup
                </Th>
                {visiblePartners.map((p) => (
                  <Th
                    key={p.slug}
                    className="sticky top-0 z-20 min-w-[150px] bg-lv-surface"
                  >
                    {p.name}
                  </Th>
                ))}
              </tr>
            </THead>
            <tbody>
              {filteredRows.map((row) => (
                <Tr key={row.startupId} className="hover:bg-transparent">
                  <Td className="sticky left-0 z-10 min-w-[190px] bg-white align-middle">
                    <span className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-lv-surface text-[11px] font-bold text-lv-secondary">
                        {initials(row.startupName)}
                      </span>
                      <span className="font-semibold text-lv-text">
                        {row.startupName}
                      </span>
                    </span>
                  </Td>
                  {visiblePartners.map((p) => {
                    const partnerIndex = partners.findIndex(
                      (x) => x.slug === p.slug
                    );
                    const cell = row.cells[partnerIndex];
                    const has = cellHasData(cell);
                    const level = cell
                      ? mutualFitLevel(
                          cell.startupRelevance,
                          cell.partnerRelevance
                        )
                      : "none";
                    const top =
                      has && isTopMatch(cell.startupRelevance, cell.partnerRelevance);
                    const hasActivity = has && cell.contactStatus !== "NONE";
                    return (
                      <Td key={p.slug} className="p-1.5 align-middle">
                        <button
                          type="button"
                          onClick={() => openEditor(row, partnerIndex)}
                          title={`${row.startupName} × ${p.name} — ${FIT_LABEL[level]}`}
                          className={cn(
                            "group relative flex h-[68px] w-full flex-col justify-between rounded-xl px-3 py-2.5 text-left transition-all hover:shadow-card focus:outline-none focus-visible:ring-2 focus-visible:ring-lv-blue",
                            FIT_TILE[level],
                            !has && "border border-dashed border-lv-border"
                          )}
                        >
                          <Pencil className="absolute right-2 top-2 h-3.5 w-3.5 text-lv-secondary opacity-0 transition-opacity group-hover:opacity-100" />
                          {has ? (
                            <>
                              <span className="flex items-center gap-1.5">
                                {top && (
                                  <Sparkles className="h-3.5 w-3.5 text-lv-mint-deep" />
                                )}
                                <span
                                  className={cn(
                                    "text-sm font-bold",
                                    FIT_TEXT[level]
                                  )}
                                >
                                  {FIT_LABEL[level]}
                                </span>
                                {hasActivity && (
                                  <span
                                    className="h-1.5 w-1.5 rounded-full bg-lv-blue"
                                    title="Aktivität vorhanden — Details ansehen"
                                  />
                                )}
                              </span>
                              <SpDots cell={cell} />
                            </>
                          ) : (
                            <span className="flex h-full items-center text-sm text-lv-secondary/70">
                              —
                            </span>
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
        um Details zu sehen und die Passung zu pflegen.
      </p>

      {editTarget && (
        <EditCellDialog
          key={`${editTarget.startupId}-${editTarget.partner.id}`}
          batchId={batchId}
          target={editTarget}
          onClose={() => setEditTarget(null)}
        />
      )}
    </>
  );
}
