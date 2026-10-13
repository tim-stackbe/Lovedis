"use client";

import { GitCompare } from "lucide-react";
import { useMemo } from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  EvaluationStatusBadge,
  ScorePill,
} from "@/components/shared/badges";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Recommendation, ScoreDimension } from "@/generated/prisma/enums";
import { DIMENSION_LABELS, SCORE_DIMENSIONS } from "@/lib/constants";
import { evaluateScores, isChallengeFitGated } from "@/lib/scoring";
import { useAppStore } from "@/stores/useAppStore";
import { cn } from "@/lib/utils";

export interface CompareStartup {
  id: string;
  name: string;
  industry: string;
  /** Team-consensus mean per criterion (0–5). */
  scores: Partial<Record<ScoreDimension, number>>;
  /** Team-consensus weighted total (0–5). */
  overallScore: number;
  recommendation: Recommendation;
  hasEvaluation: boolean;
  /** Number of scout-role evaluators behind the consensus. */
  evaluatorCount: number;
}

const SERIES_COLORS = ["#2926E5", "#FF5736", "#0E7C4A", "#7A5A00"];

export function CompareView({ startups }: { startups: CompareStartup[] }) {
  const selection = useAppStore((s) => s.compareSelection);
  const toggle = useAppStore((s) => s.toggleCompare);
  const clear = useAppStore((s) => s.clearCompare);

  const selected = useMemo(
    () => startups.filter((s) => selection.includes(s.id)),
    [startups, selection]
  );

  const radarData = useMemo(
    () =>
      SCORE_DIMENSIONS.map((d) => ({
        dimension: DIMENSION_LABELS[d],
        ...Object.fromEntries(selected.map((s) => [s.name, s.scores[d] ?? 0])),
      })),
    [selected]
  );

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-semibold">
            Wähle bis zu 4 Startups{" "}
            <span className="font-normal text-lv-secondary">
              ({selected.length} ausgewählt)
            </span>
          </p>
          {selection.length > 0 && (
            <button
              onClick={clear}
              className="text-xs font-semibold text-lv-orange hover:underline"
            >
              Auswahl zurücksetzen
            </button>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {startups.map((s) => {
            const active = selection.includes(s.id);
            return (
              <button
                key={s.id}
                onClick={() => toggle(s.id)}
                disabled={!s.hasEvaluation}
                title={
                  s.hasEvaluation ? undefined : "Noch keine Bewertung"
                }
                className={cn(
                  "rounded-button border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
                  active
                    ? "border-lv-blue bg-lv-blue-soft text-lv-blue font-semibold"
                    : "border-lv-border bg-white text-lv-text hover:bg-lv-surface"
                )}
              >
                {s.name}
              </button>
            );
          })}
        </div>
      </Card>

      {selected.length < 2 ? (
        <EmptyState
          icon={GitCompare}
          title="Wähle mindestens zwei Startups"
          description="Wähle oben bewertete Startups aus, um sie über alle sechs Challenge-Kriterien zu vergleichen."
        />
      ) : (
        <>
          <Card className="p-5">
            <p className="lv-wordmark mb-4 text-xs text-lv-blue">
              Dimensions-Overlay
            </p>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} outerRadius="75%">
                  <PolarGrid stroke="#E5E5EE" />
                  <PolarAngleAxis
                    dataKey="dimension"
                    tick={{ fill: "#6B6B7B", fontSize: 12 }}
                  />
                  <PolarRadiusAxis
                    domain={[0, 5]}
                    tickCount={6}
                    tick={{ fill: "#6B6B7B", fontSize: 10 }}
                  />
                  {selected.map((s, i) => (
                    <Radar
                      key={s.id}
                      name={s.name}
                      dataKey={s.name}
                      stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
                      fill={SERIES_COLORS[i % SERIES_COLORS.length]}
                      fillOpacity={0.12}
                      strokeWidth={2}
                    />
                  ))}
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="overflow-x-auto lv-scroll">
            <table className="w-full text-sm">
              <thead className="bg-lv-surface text-lv-secondary uppercase tracking-wide text-xs">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">
                    Dimension
                  </th>
                  {selected.map((s) => (
                    <th
                      key={s.id}
                      className="px-4 py-3 text-right font-semibold"
                    >
                      {s.name}
                      <span className="block text-[11px] font-normal normal-case text-lv-secondary">
                        Konsens · {s.evaluatorCount}{" "}
                        {s.evaluatorCount === 1 ? "Bewertung" : "Bewertungen"}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SCORE_DIMENSIONS.map((d) => {
                  const best = Math.max(
                    ...selected.map((s) => s.scores[d] ?? 0)
                  );
                  return (
                    <tr key={d} className="border-t border-lv-border">
                      <td className="px-4 py-3 font-medium">
                        {DIMENSION_LABELS[d]}
                      </td>
                      {selected.map((s) => {
                        const v = s.scores[d] ?? 0;
                        return (
                          <td
                            key={s.id}
                            className={cn(
                              "px-4 py-3 text-right tabular-nums",
                              v === best && best > 0
                                ? "font-bold text-lv-mint-deep"
                                : "text-lv-text"
                            )}
                          >
                            {v}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                <tr className="border-t border-lv-border bg-lv-surface/50">
                  <td className="px-4 py-3 font-semibold">Gesamt (gewichtet)</td>
                  {selected.map((s) => (
                    <td key={s.id} className="px-4 py-3 text-right">
                      <ScorePill
                        score={evaluateScores(s.scores).overallScore}
                      />
                    </td>
                  ))}
                </tr>
                <tr className="border-t border-lv-border">
                  <td className="px-4 py-3 font-semibold">Empfehlung / Status</td>
                  {selected.map((s) => (
                    <td key={s.id} className="px-4 py-3 text-right">
                      <EvaluationStatusBadge
                        recommendation={s.recommendation}
                        gated={isChallengeFitGated(s.scores)}
                      />
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}
