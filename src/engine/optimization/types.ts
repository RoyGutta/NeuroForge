/**
 * Optimiser contract: an ask/tell interface.
 *
 * The optimiser proposes designs (`ask`), somebody else evaluates them (the
 * experiment runner, a worker pool, eventually a remote cluster), and the
 * evaluated designs are handed back (`tell`). Keeping evaluation outside the
 * optimiser is what lets the same algorithm run against a local FEA solver,
 * a surrogate model, or a distributed job system without modification.
 */
import type { Design } from "../core/design";
import type { ConstraintSpec, Objective } from "../core/problem";
import type { Rng } from "../core/rng";
import type { DesignSpace } from "../core/space";

/** What a model-based optimiser needs to reason about metrics before the solver runs. */
export interface ScreeningSpec {
  objectiveMetric: string;
  constraints: ConstraintSpec[];
}

export interface OptimizerContext {
  space: DesignSpace;
  objective: Objective;
  rng: Rng;
  nextId(): string;
  /** Present when the problem exposes its objective metric and constraints (always, from the runner). */
  screening?: ScreeningSpec;
}

export interface Optimizer {
  readonly id: string;
  /** Designs to evaluate this generation. Never returns an empty array. */
  ask(generation: number): Design[];
  /** Hand back the designs from the last `ask`, now with evaluations. */
  tell(evaluated: Design[]): void;
  /** Best design seen so far under Deb's rules. */
  best(): Design | undefined;
  /** Current working set (population, chain state, ...). */
  population(): Design[];
  /** Optional algorithm-specific diagnostics recorded at the end of a run. */
  diagnostics?(): Record<string, unknown>;
}

export interface OptimizerParamSpec {
  id: string;
  label: string;
  description: string;
  default: number;
  min: number;
  max: number;
  step?: number;
}

export interface OptimizerDescriptor {
  id: string;
  label: string;
  description: string;
  params: OptimizerParamSpec[];
  create(
    ctx: OptimizerContext,
    params: Record<string, number>,
    seeds?: Design[]
  ): Optimizer;
}

/** Fill unspecified params with defaults and clamp to the declared range. */
export function resolveParams(
  spec: OptimizerParamSpec[],
  given: Record<string, number>
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const p of spec) {
    const v = given[p.id];
    out[p.id] = Number.isFinite(v) ? Math.min(p.max, Math.max(p.min, v)) : p.default;
  }
  return out;
}
