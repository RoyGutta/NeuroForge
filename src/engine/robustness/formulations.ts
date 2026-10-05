/**
 * Cheaper robustness formulations, all optimiser-agnostic and all verified
 * afterwards with an independent perturbation sample:
 *
 *  - constraint tightening: every limit scaled by a margin (one solver call per
 *    design; a first-order proxy for tolerance, since utilisation changes by
 *    about k * delta for a relative perturbation delta, k = 1 for stress and
 *    2 for Euler buckling);
 *  - post-hoc selection: a nominal run's best-so-far trajectory walked
 *    backwards to the lightest design that passes the robust check.
 *
 * The brute-force formulation (perturbed copies inside every evaluation) is
 * `robustify` in robustProblem.ts.
 */
import type { Design } from "../core/design";
import type { CompiledProblem } from "../domains/domain";
import type { ExperimentRecord } from "../experiments/experiment";
import { robustnessStudy, type RobustnessResult } from "./robustness";

export interface MarginSpec {
  /** Relative tightening of every constraint limit (0.05 = limits at 95 %). */
  margin: number;
  /** Per-constraint overrides by constraint id (e.g. a larger margin for buckling, which scales like 1/A^2). */
  margins?: Record<string, number>;
}

export function tightenConstraints<T>(compiled: CompiledProblem<T>, spec: MarginSpec): CompiledProblem<T> {
  if (!(spec.margin >= 0 && spec.margin < 1)) throw new Error("margin must be in [0, 1)");
  const marginOf = (id: string) => spec.margins?.[id] ?? spec.margin;
  const constraints = compiled.problem.constraints.map((c) => ({
    ...c,
    limit: c.op === "<=" ? c.limit * (1 - marginOf(c.id)) : c.limit * (1 + marginOf(c.id)),
    label: `${c.label} (margin ${(marginOf(c.id) * 100).toFixed(1)} %)`,
  }));
  const tag = spec.margins ? `${spec.margin},${Object.entries(spec.margins).map(([k, v]) => `${k}=${v}`).join(",")}` : `${spec.margin}`;
  const problem = { ...compiled.problem, constraints };
  const evaluate = (params: number[]) => {
    const ev = compiled.evaluate(params);
    const checked = constraints.map((c) => {
      const r = ev.constraints.find((x) => x.id === c.id)!;
      const scale = Math.abs(c.limit) > 0 ? Math.abs(c.limit) : 1;
      const violation = !Number.isFinite(r.value) ? r.violation : c.op === "<=" ? Math.max(0, (r.value - c.limit) / scale) : Math.max(0, (c.limit - r.value) / scale);
      return { ...r, limit: c.limit, satisfied: Number.isFinite(r.value) && violation === 0, violation };
    });
    const totalViolation = checked.reduce((s, c) => s + c.violation, 0);
    return { ...ev, constraints: checked, feasible: ev.status === "ok" && totalViolation === 0, totalViolation };
  };
  return { ...compiled, problem, evaluate, backendId: `${compiled.backendId}+margin(${tag})` };
}

export interface PostHocOptions {
  tolerance: number;
  samples: number;
  seed: number;
  targetFraction: number;
  /**
   * "linear" (default) walks the trajectory from its end until a design passes
   * and is exact. "bisection" assumes robustness decreases along the trajectory
   * (designs get lighter and tighter), finds the boundary in O(log n) checks,
   * and verifies the returned design; it may miss a lighter passing design when
   * the trajectory is not monotone.
   */
  strategy?: "linear" | "bisection" | "strided";
  /** Strided search: check every `stride`-th design from the end until one passes, then refine linearly within the stride. */
  stride?: number;
}

export interface PostHocSelection {
  design: Design;
  robustFeasibleFraction: number;
  study: RobustnessResult;
  /** Distinct trajectory designs checked. */
  checks: number;
  solverCalls: number;
  strategy: "linear" | "bisection" | "strided";
}

/**
 * Walk the best-so-far trajectory from the end towards the start and return
 * the first (lightest, latest) design whose independent robust feasible
 * fraction meets the target. Null when none does.
 */
export function postHocRobustSelection(compiled: CompiledProblem, record: ExperimentRecord, opts: PostHocOptions): PostHocSelection | null {
  const seen = new Set<string>();
  const trajectory: Design[] = [];
  for (let i = record.generations.length - 1; i >= 0; i--) {
    const d = record.generations[i].bestSoFar;
    const key = JSON.stringify(d.parameters);
    if (seen.has(key) || !d.evaluation?.feasible) continue;
    seen.add(key);
    trajectory.push(d);
  }
  let checks = 0;
  const check = (d: Design) => {
    checks++;
    return robustnessStudy(compiled, d.parameters, { samples: opts.samples, seed: opts.seed, tolerance: opts.tolerance });
  };
  const strategy = opts.strategy ?? "linear";
  if (strategy === "strided") {
    const stride = Math.max(2, Math.floor(opts.stride ?? 16));
    let passIdx = -1;
    let passStudy: RobustnessResult | null = null;
    for (let idx = 0; idx < trajectory.length; idx += stride) {
      const study = check(trajectory[idx]);
      if (study.feasibleFraction >= opts.targetFraction) {
        passIdx = idx;
        passStudy = study;
        break;
      }
    }
    if (passIdx < 0) {
      const lastIdx = trajectory.length - 1;
      if (lastIdx % stride !== 0) {
        const study = check(trajectory[lastIdx]);
        if (study.feasibleFraction >= opts.targetFraction) {
          passIdx = lastIdx;
          passStudy = study;
        }
      }
      if (passIdx < 0) return null;
    }
    // Refine: the lightest passing design between the previous (failing) probe and this one.
    for (let idx = Math.max(0, passIdx - stride + 1); idx < passIdx; idx++) {
      const study = check(trajectory[idx]);
      if (study.feasibleFraction >= opts.targetFraction) return { design: trajectory[idx], robustFeasibleFraction: study.feasibleFraction, study, checks, solverCalls: checks * opts.samples, strategy };
    }
    return { design: trajectory[passIdx], robustFeasibleFraction: passStudy!.feasibleFraction, study: passStudy!, checks, solverCalls: checks * opts.samples, strategy };
  }
  if (strategy === "linear") {
    for (const d of trajectory) {
      const study = check(d);
      if (study.feasibleFraction >= opts.targetFraction) return { design: d, robustFeasibleFraction: study.feasibleFraction, study, checks, solverCalls: checks * opts.samples, strategy };
    }
    return null;
  }
  // Index 0 is the latest (lightest) design. Robustness is not monotone from
  // the start of a run (the solver-sized baseline itself may fail), so first
  // search backwards geometrically for a passing anchor, then bisect between
  // the last failing index and that anchor.
  if (trajectory.length === 0) return null;
  const first = check(trajectory[0]);
  if (first.feasibleFraction >= opts.targetFraction) return { design: trajectory[0], robustFeasibleFraction: first.feasibleFraction, study: first, checks, solverCalls: checks * opts.samples, strategy };
  let lo = 0;
  let hi = -1;
  let anchor: { design: Design; study: RobustnessResult } | null = null;
  for (let step = 1; lo + step < trajectory.length; step *= 2) {
    const idx = lo + step;
    const study = check(trajectory[idx]);
    if (study.feasibleFraction >= opts.targetFraction) {
      hi = idx;
      anchor = { design: trajectory[idx], study };
      break;
    }
    lo = idx;
  }
  if (!anchor) {
    const lastIdx = trajectory.length - 1;
    if (lastIdx > lo) {
      const study = check(trajectory[lastIdx]);
      if (study.feasibleFraction >= opts.targetFraction) {
        hi = lastIdx;
        anchor = { design: trajectory[lastIdx], study };
      }
    }
    if (!anchor) return null;
  }
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    const study = check(trajectory[mid]);
    if (study.feasibleFraction >= opts.targetFraction) {
      hi = mid;
      anchor = { design: trajectory[mid], study };
    } else lo = mid;
  }
  return { design: anchor.design, robustFeasibleFraction: anchor.study.feasibleFraction, study: anchor.study, checks, solverCalls: checks * opts.samples, strategy };
}
