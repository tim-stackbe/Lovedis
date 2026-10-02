import { Users } from "lucide-react";
import {
  EvaluationStatusBadge,
  RecommendationBadge,
  ScorePill,
} from "@/components/shared/badges";
import { Card } from "@/components/ui/Card";
import { CHALLENGE_FIT_GATE_MIN, GATE_STATUS_LABEL } from "@/lib/constants";
import type { ConsensusResult } from "@/lib/consensus";
import { formatScore } from "@/lib/utils";

/** Short "Team-Konsens (n Bewertungen)" label used across the surfaces. */
export function consensusLabel(count: number): string {
  return `Team-Konsens (${count} ${count === 1 ? "Bewertung" : "Bewertungen"})`;
}

/**
 * Primary team-consensus panel for the startup detail page. Shows the
 * aggregated weighted total + gate-aware status, the participating evaluator
 * count, an optional spread (min–max) when opinions diverge, and a compact
 * per-evaluator breakdown so disagreement stays visible. Presentational only —
 * the caller loads/aggregates the data (see `@/lib/consensus-data`).
 *
 * n = 0 renders a graceful "noch nicht bewertet" state; n = 1 shows a consensus
 * that equals the single evaluation.
 */
export function TeamConsensusCard({
  consensus,
}: {
  consensus: ConsensusResult;
}) {
  const {
    evaluatorCount,
    weightedTotal,
    gated,
    recommendation,
    breakdown,
    minTotal,
    maxTotal,
  } = consensus;

  if (evaluatorCount === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-lv-secondary">
          <Users className="h-4 w-4" />
          Team-Konsens
        </div>
        <p className="mt-3 text-sm text-lv-secondary">
          Noch nicht bewertet — sobald ein Teammitglied (Admin/Mitglied) die
          Bewertungsmatrix ausfüllt, erscheint hier der aggregierte Konsens.
        </p>
      </Card>
    );
  }

  const hasSpread =
    evaluatorCount > 1 &&
    minTotal != null &&
    maxTotal != null &&
    maxTotal - minTotal > 0.001;

  return (
    <Card className="overflow-hidden">
      <div className="relative bg-lv-cover p-5 text-white">
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-lv-orange/40 blur-2xl pointer-events-none" />
        <p className="lv-wordmark relative text-[10px] text-white/70">
          {consensusLabel(evaluatorCount)}
        </p>
        <p className="relative mt-2 text-4xl font-bold tabular-nums">
          {weightedTotal.toFixed(2)}
          <span className="ml-1 text-base font-medium text-white/60">/ 5</span>
        </p>
        <div className="relative mt-3 flex flex-wrap items-center gap-2">
          <EvaluationStatusBadge recommendation={recommendation} gated={gated} />
          {!gated && <RecommendationBadge value={recommendation} />}
        </div>
      </div>

      <div className="space-y-4 p-5 text-sm">
        {gated && (
          <p className="text-xs text-lv-orange">
            {GATE_STATUS_LABEL}: gemittelter „Challenge Fit“ liegt unter{" "}
            {CHALLENGE_FIT_GATE_MIN}.
          </p>
        )}
        {hasSpread && (
          <div className="flex items-center justify-between">
            <span className="text-lv-secondary">Spanne (min–max)</span>
            <span className="font-medium tabular-nums">
              {formatScore(minTotal)} – {formatScore(maxTotal)}
            </span>
          </div>
        )}

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-lv-secondary">
            Einzelbewertungen
          </p>
          <ul className="divide-y divide-lv-border">
            {breakdown.map((b) => (
              <li
                key={b.evaluatorId}
                className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
              >
                <span className="min-w-0 truncate font-medium">
                  {b.evaluatorName}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <EvaluationStatusBadge
                    recommendation={b.recommendation}
                    gated={b.gated}
                  />
                  <ScorePill score={b.overallScore} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}
