/**
 * Robust mode for any compiled problem: each design is evaluated nominally
 * and then at `samples` perturbed copies drawn within the tolerance, and a
 * synthetic constraint requires at least `targetFraction` of them to be
 * feasible. The perturbation sample is seeded from a hash of the parameter
 * vector, so evaluation is deterministic per design while neighbouring
 * designs see different samples (there is no fixed sample to exploit).
 * Every perturbed copy is a real solver call; nothing is predicted.
 */
import type { ConstraintResult, Evaluation } from "../core/design";
import type { ConstraintSpec, MetricDescriptor } from "../core/problem";
import { Rng } from "../core/rng";
import type { CompiledProblem } from "../domains/domain";
import { quantile } from "../ml/statistics";
import { perturb } from "./robustness";

export interface RobustSpec {
  /** Relative tolerance on every design variable (0.02 = +/- 2 %). */
  tolerance: number;
  /** Perturbed copies evaluated per design (each one a solver call). */
  samples: number;
  /** Required feasible fraction among the perturbed copies. */
  targetFraction: number;
}

export const ROBUST_METRICS: MetricDescriptor[] = [
  { id: "robustFeasibleFraction", label: "Robust feasible fraction", unit: "-", description: "Fraction of perturbed copies of the design that satisfy every nominal constraint." },
  { id: "robustObjectiveQ95", label: "Objective 95th percentile under tolerance", unit: "-", description: "95th percentile of the objective over the perturbed copies." },
  { id: "robustSampleSeed", label: "Perturbation sample seed", unit: "-", description: "Seed of the perturbation sample, derived from the parameter vector." },
];

/** FNV-1a over the IEEE-754 bytes of the parameter vector; stable across runs. */
export function hashParams(params: number[]): number {
  const bytes = new Uint8Array(new Float64Array(params).buffer);
  let h = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i++) {
    h ^= bytes[i];
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export function robustify<T>(compiled: CompiledProblem<T>, spec: RobustSpec): CompiledProblem<T> {
  if (!(spec.samples > 0) || !(spec.tolerance >= 0) || !(spec.targetFraction > 0 && spec.targetFraction <= 1)) throw new Error("robust spec needs samples > 0, tolerance >= 0 and 0 < targetFraction <= 1");
  const constraint: ConstraintSpec = {
    id: "robustness",
    metric: "robustFeasibleFraction",
    op: ">=",
    limit: spec.targetFraction,
    label: `Feasible in >= ${(spec.targetFraction * 100).toFixed(0)} % of +/- ${(spec.tolerance * 100).toFixed(1)} % perturbations`,
    source: "user",
  };
  const problem = { ...compiled.problem, constraints: [...compiled.problem.constraints, constraint] };
  const objective = compiled.problem.objectives[0];
  const perturbOpts = { samples: spec.samples, seed: 0, tolerance: spec.tolerance, distribution: "uniform" as const };

  const evaluate = (params: number[]): Evaluation => {
    const nominal = compiled.evaluate(params);
    const seed = hashParams(params);
    if (nominal.status !== "ok") {
      const failed: ConstraintResult = { id: constraint.id, metric: constraint.metric, op: ">=", value: NaN, limit: spec.targetFraction, satisfied: false, violation: 1 };
      return { ...nominal, metrics: { ...nominal.metrics, robustFeasibleFraction: 0, robustSampleSeed: seed }, constraints: [...nominal.constraints, failed], feasible: false, totalViolation: nominal.totalViolation + 1 };
    }
    const rng = new Rng(seed);
    let feasible = 0;
    const objectives: number[] = [];
    for (let k = 0; k < spec.samples; k++) {
      const ev = compiled.evaluate(perturb(compiled, params, rng, perturbOpts));
      if (ev.feasible) feasible++;
      const o = ev.objectives[objective.id];
      if (Number.isFinite(o)) objectives.push(o);
    }
    const fraction = feasible / spec.samples;
    const satisfied = fraction >= spec.targetFraction;
    const result: ConstraintResult = {
      id: constraint.id,
      metric: constraint.metric,
      op: ">=",
      value: fraction,
      limit: spec.targetFraction,
      satisfied,
      violation: satisfied ? 0 : (spec.targetFraction - fraction) / spec.targetFraction,
    };
    const q95 = objectives.length ? (objective.direction === "minimize" ? quantile(objectives, 0.95) : quantile(objectives, 0.05)) : NaN;
    return {
      ...nominal,
      metrics: { ...nominal.metrics, robustFeasibleFraction: fraction, robustObjectiveQ95: q95, robustSampleSeed: seed },
      constraints: [...nominal.constraints, result],
      feasible: nominal.feasible && satisfied,
      totalViolation: nominal.totalViolation + result.violation,
    };
  };

  return {
    ...compiled,
    problem,
    metrics: [...compiled.metrics, ...ROBUST_METRICS],
    evaluate,
    backendId: `${compiled.backendId}+robust(tol=${spec.tolerance},k=${spec.samples},p=${spec.targetFraction})`,
  };
}
