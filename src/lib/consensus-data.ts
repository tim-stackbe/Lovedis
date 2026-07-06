import type { ScoreDimension } from "@/generated/prisma/enums";
import {
  aggregateEvaluations,
  type ConsensusResult,
  type EvaluatorEvaluationInput,
} from "@/lib/consensus";
import { prisma } from "@/lib/prisma";
import { VENTURE_SCOUT_ROLES } from "@/lib/roles";
import { scoresToMap } from "@/lib/scoring";

/**
 * Server-side data helpers that load all scout-role evaluations (with scores +
 * evaluator name/role) for a startup and feed them to the pure aggregator.
 * Intended to be called only from server components / server actions (they
 * import Prisma).
 *
 * Filtering by the evaluator's CURRENT role happens at the DB level
 * (`evaluator.role IN VENTURE_SCOUT_ROLES`) via the relation join, so if a user
 * later loses ADMIN/MEMBER their evaluations drop out of the consensus. The
 * aggregator re-checks the role defensively, so a stale/loosened query still
 * can't leak a non-scout evaluation into the consensus.
 */

// Only what the aggregator needs. `evaluator.role` is the join that enforces
// "count by the evaluator's current role", not by who authored the row.
const CONSENSUS_EVAL_SELECT = {
  startupId: true,
  updatedAt: true,
  evaluator: { select: { id: true, name: true, role: true } },
  scores: { select: { dimension: true, value: true } },
} as const;

interface ConsensusEvalRow {
  startupId: string;
  updatedAt: Date;
  evaluator: { id: string; name: string; role: EvaluatorEvaluationInput["evaluatorRole"] };
  scores: { dimension: ScoreDimension; value: number }[];
}

function toInput(row: ConsensusEvalRow): EvaluatorEvaluationInput {
  return {
    evaluatorId: row.evaluator.id,
    evaluatorName: row.evaluator.name,
    evaluatorRole: row.evaluator.role,
    scores: scoresToMap(row.scores),
    updatedAt: row.updatedAt,
  };
}

/** Team consensus for a single startup. */
export async function getStartupConsensus(
  startupId: string
): Promise<ConsensusResult> {
  const rows = await prisma.evaluation.findMany({
    where: { startupId, evaluator: { role: { in: VENTURE_SCOUT_ROLES } } },
    select: CONSENSUS_EVAL_SELECT,
  });
  return aggregateEvaluations(rows.map(toInput));
}

/**
 * Team consensus for many startups at once, keyed by startupId. Pass a list of
 * ids to scope the query (list/compare/report views); omit to load all.
 * Startups with no scout-role evaluations simply won't appear in the map —
 * callers fall back to the empty ("noch nicht bewertet") state.
 */
export async function getConsensusByStartup(
  startupIds?: string[]
): Promise<Map<string, ConsensusResult>> {
  const rows = await prisma.evaluation.findMany({
    where: {
      evaluator: { role: { in: VENTURE_SCOUT_ROLES } },
      ...(startupIds ? { startupId: { in: startupIds } } : {}),
    },
    select: CONSENSUS_EVAL_SELECT,
  });

  const byStartup = new Map<string, EvaluatorEvaluationInput[]>();
  for (const row of rows) {
    const list = byStartup.get(row.startupId) ?? [];
    list.push(toInput(row));
    byStartup.set(row.startupId, list);
  }

  const result = new Map<string, ConsensusResult>();
  for (const [startupId, inputs] of byStartup) {
    result.set(startupId, aggregateEvaluations(inputs));
  }
  return result;
}
