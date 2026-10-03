/**
 * Robustness of a design to manufacturing and parameter tolerance, measured
 * by perturbing its parameters and re-running the real evaluator. No model
 * of the response is fitted: every sample is a solver call.
 *
 *   p_i' = clamp(p_i (1 + tol * u_i), lower_i, upper_i)
 *
 * with u_i ~ U(-1, 1) (uniform) or N(0, 1/2) (gaussian, so that tol is about
 * two standard deviations). Only variables in `groups` are perturbed when
 * groups are given.
 */
import type { Evaluation } from "../core/design";
import { Rng } from "../core/rng";
import type { CompiledProblem } from "../domains/domain";
import { median, quantile } from "../ml/statistics";

export interface RobustnessOptions {
  samples: number;
  seed: number;
  /** Relative tolerance on each perturbed variable (0.02 = +/- 2 %). */
  tolerance: number;
  distribution?: "uniform" | "gaussian";
  /** Variable groups to perturb; all variables when omitted. */
  groups?: string[];
}

export interface ConstraintRobustness {
  id: string;
  metric: string;
  nominalUtilization: number;
  maxUtilization: number;
  /** Fraction of samples in which this constraint was violated. */
  violationProbability: number;
}

export interface RobustnessResult {
  parameters: number[];
  nominal: Evaluation;
  samples: number;
  evaluations: number;
  tolerance: number;
  distribution: "uniform" | "gaussian";
  seed: number;
  perturbedVariables: number;
  feasibleFraction: number;
  objective: { id: string; nominal: number; median: number; q05: number; q95: number; worst: number };
  constraints: ConstraintRobustness[];
}

function utilization(c: Evaluation["constraints"][number]): number {
  if (!Number.isFinite(c.value)) return Infinity;
  if (c.op === "<=") return c.limit !== 0 ? c.value / c.limit : c.value;
  return c.value !== 0 ? c.limit / c.value : Infinity;
}

export function perturb(compiled: CompiledProblem, params: number[], rng: Rng, opts: RobustnessOptions): number[] {
  const groups = opts.groups ? new Set(opts.groups) : null;
  const dist = opts.distribution ?? "uniform";
  return params.map((p, i) => {
    const v = compiled.space.variables[i];
    if (groups && !groups.has(v.group)) return p;
    const u = dist === "uniform" ? rng.uniform(-1, 1) : 0.5 * rng.gaussian();
    const q = p * (1 + opts.tolerance * u);
    return Math.min(v.upper, Math.max(v.lower, q));
  });
}

export function robustnessStudy(compiled: CompiledProblem, params: number[], opts: RobustnessOptions): RobustnessResult {
  if (!(opts.samples > 0)) throw new Error("samples must be positive");
  if (!(opts.tolerance >= 0)) throw new Error("tolerance must be non-negative");
  const objective = compiled.problem.objectives[0];
  const nominal = compiled.evaluate(params);
  const rng = new Rng(opts.seed).fork(`robustness-${opts.tolerance}`);
  const groups = opts.groups ? new Set(opts.groups) : null;
  const perturbedVariables = compiled.space.variables.filter((v) => !groups || groups.has(v.group)).length;
  const violations = new Map<string, number>();
  const maxUtil = new Map<string, number>();
  for (const c of nominal.constraints) {
    violations.set(c.id, 0);
    maxUtil.set(c.id, utilization(c));
  }
  let feasible = 0;
  const objectives: number[] = [];
  const worstDirection = objective.direction === "minimize" ? 1 : -1;
  for (let s = 0; s < opts.samples; s++) {
    const ev = compiled.evaluate(perturb(compiled, params, rng, opts));
    if (ev.feasible) feasible++;
    const o = ev.objectives[objective.id];
    objectives.push(Number.isFinite(o) ? o : worstDirection * Infinity);
    for (const c of ev.constraints) {
      if (!c.satisfied) violations.set(c.id, (violations.get(c.id) ?? 0) + 1);
      const u = utilization(c);
      if (u > (maxUtil.get(c.id) ?? -Infinity)) maxUtil.set(c.id, u);
    }
  }
  const finite = objectives.filter((o) => Number.isFinite(o));
  const sorted = finite.slice().sort((a, b) => a - b);
  const worst = finite.length ? (objective.direction === "minimize" ? sorted[sorted.length - 1] : sorted[0]) : NaN;
  return {
    parameters: params.slice(),
    nominal,
    samples: opts.samples,
    evaluations: opts.samples,
    tolerance: opts.tolerance,
    distribution: opts.distribution ?? "uniform",
    seed: opts.seed,
    perturbedVariables,
    feasibleFraction: feasible / opts.samples,
    objective: {
      id: objective.id,
      nominal: nominal.objectives[objective.id],
      median: finite.length ? median(finite) : NaN,
      q05: finite.length ? quantile(finite, 0.05) : NaN,
      q95: finite.length ? quantile(finite, 0.95) : NaN,
      worst,
    },
    constraints: nominal.constraints.map((c) => ({
      id: c.id,
      metric: c.metric,
      nominalUtilization: utilization(c),
      maxUtilization: maxUtil.get(c.id) ?? NaN,
      violationProbability: (violations.get(c.id) ?? 0) / opts.samples,
    })),
  };
}

export interface SweepPoint {
  tolerance: number;
  feasibleFraction: number;
  objectiveMedian: number;
  objectiveQ95: number;
}

/** Feasibility and objective spread at each tolerance, same seed per level. */
export function toleranceSweep(compiled: CompiledProblem, params: number[], tolerances: number[], opts: Omit<RobustnessOptions, "tolerance">): SweepPoint[] {
  return tolerances.map((tolerance) => {
    const r = robustnessStudy(compiled, params, { ...opts, tolerance });
    return { tolerance, feasibleFraction: r.feasibleFraction, objectiveMedian: r.objective.median, objectiveQ95: r.objective.q95 };
  });
}

export interface MarginOptions extends Omit<RobustnessOptions, "tolerance"> {
  /** Required feasible fraction (default 0.95). */
  target?: number;
  /** Search interval for the tolerance (default 0 to 0.5). */
  maxTolerance?: number;
  iterations?: number;
}

/**
 * Largest relative tolerance at which the feasible fraction still meets the
 * target, by bisection on the (approximately monotone) sweep. Returns 0 when
 * the nominal design itself does not meet the target.
 */
export function robustMargin(compiled: CompiledProblem, params: number[], opts: MarginOptions): number {
  const target = opts.target ?? 0.95;
  const hi0 = opts.maxTolerance ?? 0.5;
  const ok = (tol: number) => robustnessStudy(compiled, params, { ...opts, tolerance: tol }).feasibleFraction >= target;
  if (!ok(0)) return 0;
  if (ok(hi0)) return hi0;
  let lo = 0;
  let hi = hi0;
  for (let i = 0; i < (opts.iterations ?? 12); i++) {
    const mid = 0.5 * (lo + hi);
    if (ok(mid)) lo = mid;
    else hi = mid;
  }
  return lo;
}
