"use client";

import { ChevronRight, Sparkles, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import type {
  MatchUseCaseType,
  RelevanceLevel,
} from "@/generated/prisma/enums";
import {
  MatchUseCaseBadge,
  RelevanceBadge,
} from "@/components/shared/badges";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  ErrorChip,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/ui/Field";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { TableCard, Td, Th, THead, Tr } from "@/components/ui/Table";
import type { ActionState } from "@/lib/action-state";
import {
  MATCH_USE_CASE_LABELS,
  MATCH_USE_CASE_TYPES,
  RELEVANCE_LABELS,
  RELEVANCE_LEVELS,
} from "@/lib/constants";
import {
  coordState,
  mutualFitLevel,
  type MatchCoordState,
  type MutualFitLevel,
} from "@/lib/match-matrix";
import { cn } from "@/lib/utils";
import { toast } from "@/stores/useToast";

/** One party's serialisable side input (Date carried as ISO string). */
export interface SideView {
  relevance: RelevanceLevel | null;
  useCaseTypes: MatchUseCaseType[];
  useCaseNote: string | null;
  followUp: boolean | null;
  openQuestions: string | null;
  notes: string | null;
  contacted: boolean | null;
  /** Partner side only: "Interesse: Ja/Nein" (null = noch offen). */
  interested?: boolean | null;
}

/** Aggregated partner-company outcome for one pairing (majority of "Ja"). */
export interface VoteTally {
  yes: number;
  no: number;
  outcome: boolean | null;
}

export interface CounterpartyRow {
  /** The counterparty id (a startupId in partner mode, partnerId in startup mode). */
  id: string;
  name: string;
  /** Optional sub-line (e.g. industry). */
  sub?: string | null;
  /** The current user's own side for this pairing. */
  own: SideView;
  /** The counterparty's side (read-only — the mutual picture). */
  other: SideView;
  /** Aggregated partner-company outcome (the company's vote result). */
  tally?: VoteTally;
}

interface SelfServiceMatrixProps {
  /** "partner" → I fill the partner side, rows are startups. */
  mode: "partner" | "startup";
  /** The batch (program) this matrix belongs to — submitted with every edit. */
  batchId: string;
  rows: CounterpartyRow[];
  /** Hidden field name for the counterparty id the action expects. */
  counterpartyField: "startupId" | "partnerId";
  /** The bound server action for my side. */
  action: (
    prev: ActionState | undefined,
    formData: FormData
  ) => Promise<ActionState>;
  /** Label for the counterparty column ("Startup" / "Partner"). */
  counterpartyLabel: string;
  /** Section heading (defaults to a generic title when omitted). */
  title?: string;
  /** Section number badge (for stacking several batches). */
  sectionNumber?: string;
  /** Partner mode: render the "Interesse: Ja/Nein" vote field + company tally. */
  showInterest?: boolean;
}

const FIT_LABEL: Record<MutualFitLevel, string> = {
  top: "Top-Match",
  strong: "Stark",
  moderate: "Solide",
  weak: "Schwach",
  none: "—",
};

const FIT_TILE: Record<MutualFitLevel, string> = {
  top: "bg-lv-mint text-lv-mint-deep",
  strong: "bg-lv-mint/55 text-lv-mint-deep",
  moderate: "bg-lv-yellow/55 text-lv-yellow-deep",
  weak: "bg-lv-surface text-lv-secondary",
  none: "bg-white text-lv-secondary",
};

const COORD_LABEL: Record<MatchCoordState, string> = {
  matched: "Beidseitig bewertet",
  awaiting: "Wartet auf Gegenseite",
  todo: "Deine Bewertung fehlt",
  none: "Offen",
};

const COORD_TONE: Record<MatchCoordState, string> = {
  matched: "bg-lv-mint/50 text-lv-mint-deep",
  awaiting: "bg-lv-blue/10 text-lv-blue",
  todo: "bg-lv-yellow/50 text-lv-yellow-deep",
  none: "bg-lv-surface text-lv-secondary",
};

/**
 * The two relevances in canonical (startup, partner) order regardless of which
 * side the current user represents — so `mutualFitLevel` reads consistently.
 */
function relevances(mode: "partner" | "startup", row: CounterpartyRow) {
  return mode === "partner"
    ? { startup: row.other.relevance, partner: row.own.relevance }
    : { startup: row.own.relevance, partner: row.other.relevance };
}

function FitChip({ level }: { level: MutualFitLevel }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold",
        FIT_TILE[level]
      )}
    >
      {level === "top" && <Sparkles className="h-3 w-3" />}
      {FIT_LABEL[level]}
    </span>
  );
}

function CoordChip({ state }: { state: MatchCoordState }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
        COORD_TONE[state]
      )}
    >
      {COORD_LABEL[state]}
    </span>
  );
}

/** Aggregated company outcome chip: "positiv 8:2" / "negativ 2:3" / "offen". */
function OutcomeChip({ tally }: { tally: VoteTally }) {
  const total = tally.yes + tally.no;
  if (tally.outcome === null || total === 0) {
    return (
      <span className="inline-flex items-center rounded-full bg-lv-surface px-2.5 py-0.5 text-[11px] font-semibold text-lv-secondary">
        Abstimmung offen
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
        tally.outcome
          ? "bg-lv-mint/60 text-lv-mint-deep"
          : "bg-lv-orange-soft text-lv-orange"
      )}
      title={`${tally.yes} Ja · ${tally.no} Nein`}
    >
      {tally.outcome ? "positiv" : "negativ"} {tally.yes}:{tally.no}
    </span>
  );
}

function triDefault(v: boolean | null): string {
  return v === true ? "true" : v === false ? "false" : "";
}

/** Read-only rendering of the counterparty's side. */
function OtherSide({
  side,
  title,
}: {
  side: SideView;
  title: string;
}) {
  const empty =
    side.relevance === null &&
    side.useCaseTypes.length === 0 &&
    !side.useCaseNote &&
    !side.openQuestions &&
    !side.notes &&
    side.followUp === null &&
    side.contacted === null;
  return (
    <div className="space-y-3 rounded-card bg-lv-surface/60 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-lv-secondary">
        {title}
      </p>
      {empty && side.interested == null ? (
        <p className="text-sm text-lv-secondary">
          Noch keine Rückmeldung der Gegenseite.
        </p>
      ) : (
        <div className="space-y-3">
          {side.interested != null && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-lv-secondary">Interesse:</span>
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                  side.interested
                    ? "bg-lv-mint/60 text-lv-mint-deep"
                    : "bg-lv-orange-soft text-lv-orange"
                )}
              >
                {side.interested ? "positiv" : "negativ"}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-xs text-lv-secondary">Relevanz:</span>
            {side.relevance ? (
              <RelevanceBadge value={side.relevance} />
            ) : (
              <span className="text-sm text-lv-secondary">—</span>
            )}
          </div>
          {side.useCaseTypes.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {side.useCaseTypes.map((uc) => (
                <MatchUseCaseBadge key={uc} value={uc} />
              ))}
            </div>
          )}
          {side.useCaseNote && (
            <p className="text-sm text-lv-text">{side.useCaseNote}</p>
          )}
          {side.openQuestions && (
            <p className="text-sm text-lv-text">
              <span className="text-lv-secondary">Offene Fragen: </span>
              {side.openQuestions}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

interface EditTarget {
  row: CounterpartyRow;
}

function EditSideDialog({
  mode,
  batchId,
  target,
  counterpartyField,
  action,
  onClose,
  showInterest,
}: {
  mode: "partner" | "startup";
  batchId: string;
  target: EditTarget;
  counterpartyField: "startupId" | "partnerId";
  action: SelfServiceMatrixProps["action"];
  onClose: () => void;
  showInterest?: boolean;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(action, undefined);
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

  const { own, other } = target.row;
  const otherTitle =
    mode === "partner" ? "Sicht des Startups auf euch" : "Sicht des Partners auf euch";

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
              {mode === "partner" ? "Startup bewerten" : "Partner bewerten"}
            </p>
            <h2 className="mt-0.5 text-base font-bold text-lv-text">
              {target.row.name}
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
          <OtherSide side={other} title={otherTitle} />

          {showInterest && target.row.tally && (
            <div className="flex items-center justify-between gap-3 rounded-card border border-lv-border px-4 py-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-lv-secondary">
                Ergebnis eures Unternehmens
              </span>
              <OutcomeChip tally={target.row.tally} />
            </div>
          )}

          <div className="flex items-center gap-3">
            <span className="lv-wordmark text-xs text-lv-blue shrink-0">
              {showInterest ? "Deine Stimme" : "Deine Einschätzung"}
            </span>
            <span className="h-px flex-1 bg-lv-border" />
          </div>

          <form action={formAction} className="space-y-4">
            <input type="hidden" name="batchId" value={batchId} />
            <input
              type="hidden"
              name={counterpartyField}
              value={target.row.id}
            />

            {showInterest && (
              <Field label="Interesse an diesem Startup?" htmlFor="mx-interested">
                <Select
                  id="mx-interested"
                  name="interested"
                  defaultValue={triDefault(own.interested ?? null)}
                >
                  <option value="">— (noch offen)</option>
                  <option value="true">Ja</option>
                  <option value="false">Nein</option>
                </Select>
              </Field>
            )}

            <Field label="Relevanz für euch" htmlFor="mx-rel">
              <Select
                id="mx-rel"
                name="relevance"
                defaultValue={own.relevance ?? ""}
              >
                <option value="">—</option>
                {RELEVANCE_LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {RELEVANCE_LABELS[l]}
                  </option>
                ))}
              </Select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Erstkontakt?" htmlFor="mx-contacted">
                <Select
                  id="mx-contacted"
                  name="contacted"
                  defaultValue={triDefault(own.contacted)}
                >
                  <option value="">—</option>
                  <option value="true">Ja</option>
                  <option value="false">Nein</option>
                </Select>
              </Field>
              <Field label="Folgegespräch?" htmlFor="mx-follow">
                <Select
                  id="mx-follow"
                  name="followUp"
                  defaultValue={triDefault(own.followUp)}
                >
                  <option value="">—</option>
                  <option value="true">Ja</option>
                  <option value="false">Nein</option>
                </Select>
              </Field>
            </div>

            <fieldset>
              <legend className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-lv-secondary">
                Vorstellbare Partnerschaft
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
                      defaultChecked={own.useCaseTypes.includes(uc)}
                      className="accent-lv-blue"
                    />
                    {MATCH_USE_CASE_LABELS[uc]}
                  </label>
                ))}
              </div>
            </fieldset>

            <Field label="Konkrete Use-Cases" htmlFor="mx-uc-note">
              <Textarea
                id="mx-uc-note"
                name="useCaseNote"
                defaultValue={own.useCaseNote ?? ""}
                className="min-h-16 text-sm"
                placeholder="Welche konkreten Use-Cases könnt ihr euch vorstellen?"
              />
            </Field>

            <Field label="Offene Fragen" htmlFor="mx-oq">
              <Textarea
                id="mx-oq"
                name="openQuestions"
                defaultValue={own.openQuestions ?? ""}
                className="min-h-16 text-sm"
                placeholder="Welche Fragen sind offen geblieben?"
              />
            </Field>

            <Field label="Sonstige Anmerkungen" htmlFor="mx-notes">
              <Input
                id="mx-notes"
                name="notes"
                defaultValue={own.notes ?? ""}
                placeholder="Optionale Notizen…"
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

export function SelfServiceMatrix({
  mode,
  batchId,
  rows,
  counterpartyField,
  action,
  counterpartyLabel,
  title,
  sectionNumber = "01",
  showInterest,
}: SelfServiceMatrixProps) {
  const [target, setTarget] = useState<EditTarget | null>(null);

  if (rows.length === 0) {
    return (
      <>
        {title && (
          <SectionLabel number={sectionNumber} label="Batch" title={title} />
        )}
        <Card className="p-8 text-center text-sm text-lv-secondary">
          {mode === "partner"
            ? "In diesem Batch wurden dir noch keine Startups zugewiesen."
            : "In diesem Batch sind noch keine Partner-Unternehmen hinterlegt."}
        </Card>
      </>
    );
  }

  return (
    <>
      <SectionLabel
        number={sectionNumber}
        label={title ? "Batch" : "Matrix"}
        title={title ?? "Deine Einschätzungen"}
      />

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {rows.map((row) => {
          const rel = relevances(mode, row);
          const fit = mutualFitLevel(rel.startup, rel.partner);
          const coord = coordState(row.own.relevance, row.other.relevance);
          return (
            <button
              type="button"
              key={row.id}
              onClick={() => setTarget({ row })}
              className="flex w-full items-center justify-between gap-3 rounded-card border border-lv-border bg-white px-4 py-3 text-left transition-colors hover:bg-lv-surface/50"
            >
              <span className="min-w-0">
                <span className="block font-semibold text-lv-text">
                  {row.name}
                </span>
                {row.sub && (
                  <span className="block text-xs text-lv-secondary">
                    {row.sub}
                  </span>
                )}
                <span className="mt-1 inline-flex flex-wrap gap-1.5">
                  <CoordChip state={coord} />
                  {row.tally && <OutcomeChip tally={row.tally} />}
                </span>
              </span>
              <span className="flex items-center gap-2">
                {fit !== "none" && <FitChip level={fit} />}
                <ChevronRight className="h-4 w-4 shrink-0 text-lv-secondary" />
              </span>
            </button>
          );
        })}
      </div>

      {/* Desktop table */}
      <TableCard className="hidden md:block">
        <THead>
          <tr>
            <Th>{counterpartyLabel}</Th>
            <Th>Deine Relevanz</Th>
            <Th>Gegenseite</Th>
            <Th>Status</Th>
            <Th className="text-right">Aktion</Th>
          </tr>
        </THead>
        <tbody>
          {rows.map((row) => {
            const rel = relevances(mode, row);
            const fit = mutualFitLevel(rel.startup, rel.partner);
            const coord = coordState(row.own.relevance, row.other.relevance);
            return (
              <Tr key={row.id}>
                <Td className="align-middle">
                  <span className="font-semibold text-lv-text">{row.name}</span>
                  {row.sub && (
                    <span className="block text-xs text-lv-secondary">
                      {row.sub}
                    </span>
                  )}
                </Td>
                <Td className="align-middle">
                  {row.own.relevance ? (
                    <RelevanceBadge value={row.own.relevance} />
                  ) : (
                    <span className="text-sm text-lv-secondary">Offen</span>
                  )}
                </Td>
                <Td className="align-middle">
                  {row.other.relevance ? (
                    <RelevanceBadge value={row.other.relevance} />
                  ) : (
                    <span className="text-sm text-lv-secondary">—</span>
                  )}
                </Td>
                <Td className="align-middle">
                  <span className="flex flex-wrap items-center gap-1.5">
                    {row.tally ? (
                      <OutcomeChip tally={row.tally} />
                    ) : (
                      <CoordChip state={coord} />
                    )}
                    {fit === "top" && <FitChip level={fit} />}
                  </span>
                </Td>
                <Td className="text-right align-middle">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setTarget({ row })}
                  >
                    {showInterest ? "Abstimmen" : "Bewerten"}
                  </Button>
                </Td>
              </Tr>
            );
          })}
        </tbody>
      </TableCard>

      <p className="text-xs text-lv-secondary">
        {showInterest
          ? "Jede Person aus eurem Unternehmen stimmt einzeln ab; das Ergebnis ergibt sich aus der Mehrheit. Andere Partner sehen eure Stimmen nicht."
          : mode === "partner"
            ? "Deine Einschätzungen sind nur für dich und das Lovedis-Team sichtbar — andere Partner sehen sie nicht."
            : "Deine Einschätzungen sind nur für dich und das Lovedis-Team sichtbar — andere Startups sehen sie nicht."}
      </p>

      {target && (
        <EditSideDialog
          key={target.row.id}
          mode={mode}
          batchId={batchId}
          target={target}
          counterpartyField={counterpartyField}
          action={action}
          onClose={() => setTarget(null)}
          showInterest={showInterest}
        />
      )}
    </>
  );
}
