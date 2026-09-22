/**
 * Candidate designs and their evaluations.
 *
 * A `Design` is a point in a design space plus its lineage. An `Evaluation`
 * is what the simulation backend said about it. Both are plain data so they
 * can be stored inside an experiment record and re-rendered later.
 */
import type { ConstraintOp, ConstraintSpec, ObjectiveDirection } from "./problem";

export interface ConstraintResult {
  id: string;
  metric: string;
  op: ConstraintOp;
  value: number;
  limit: number;
  satisfied: boolean;
  /** Normalised violation: 0 when satisfied, (value/limit - 1) for "<=". */
  violation: number;
}

export type EvaluationStatus = "ok" | "unstable" | "invalid";

export interface Evaluation {
  status: EvaluationStatus;
  /** Every metric the backend computed, keyed by metric id. */
  metrics: Record<string, number>;
  /** Objective values keyed by objective id (copied from metrics). */
  objectives: Record<string, number>;
  constraints: ConstraintResult[];
  feasible: boolean;
  /** Sum of normalised constraint violations; 0 when feasible. */
  totalViolation: number;
  diagnostics: string[];
  /** What kind of analysis produced this, e.g. "linear-static-fea". */
  fidelity: string;
  backend: string;
  /** Vector-valued responses (e.g. member axial forces) for learning at the component level. */
  responses?: Record<string, number[]>;
}

export type DesignOperator =
  | "baseline"
  | "random"
  | "initial"
  | "mutation"
  | "crossover"
  | "annealing-move"
  | "surrogate-proposal"
  | "manual";

export interface Design {
  id: string;
  generation: number;
  parentIds: string[];
  operator: DesignOperator | string;
  /** Parameter vector aligned with the design space's variables. */
  parameters: number[];
  evaluation?: Evaluation;
}

/** Violation used for designs whose analysis failed outright. */
export const FAILED_DESIGN_VIOLATION = 1e6;

export function checkConstraints(
  specs: ConstraintSpec[],
  metrics: Record<string, number>
): ConstraintResult[] {
  return specs.map((spec) => {
    const value = metrics[spec.metric];
    if (value === undefined || !Number.isFinite(value)) {
      return {
        id: spec.id,
        metric: spec.metric,
        op: spec.op,
        value: Number.NaN,
        limit: spec.limit,
        satisfied: false,
        violation: FAILED_DESIGN_VIOLATION,
      };
    }
    const scale = Math.abs(spec.limit) > 0 ? Math.abs(spec.limit) : 1;
    let violation = 0;
    if (spec.op === "<=") violation = Math.max(0, (value - spec.limit) / scale);
    else violation = Math.max(0, (spec.limit - value) / scale);
    return {
      id: spec.id,
      metric: spec.metric,
      op: spec.op,
      value,
      limit: spec.limit,
      satisfied: violation === 0,
      violation,
    };
  });
}

/**
 * Deb's feasibility rules (Deb, 2000): feasible beats infeasible; among
 * infeasible, lower total violation wins; among feasible, better objective
 * wins. Returns negative when `a` is better, positive when `b` is better.
 */
export function compareDesigns(
  a: Design,
  b: Design,
  objectiveId: string,
  direction: ObjectiveDirection
): number {
  const ea = a.evaluation;
  const eb = b.evaluation;
  if (!ea && !eb) return 0;
  if (!ea) return 1;
  if (!eb) return -1;
  if (ea.feasible !== eb.feasible) return ea.feasible ? -1 : 1;
  if (!ea.feasible) return ea.totalViolation - eb.totalViolation;
  const va = ea.objectives[objectiveId];
  const vb = eb.objectives[objectiveId];
  return direction === "minimize" ? va - vb : vb - va;
}
