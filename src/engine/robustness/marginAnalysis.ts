/**
 * Analysis of constraint-margin studies: how often each constraint of a
 * design fails under a sampled tolerance, with binomial confidence bounds, and
 * whether a margin meets a criterion fixed before the study ran. A sampled
 * failure rate of zero is an estimate with an upper bound, never a proof;
 * guarantees come only from analytic bounds (see `reachUtilizationBound`) and
 * are reported separately. The box-corner check evaluates the 2^d extreme
 * perturbations, which is the worst case only for responses monotone in every
 * variable, so it is evidence, not a guarantee.
 */
import type { CompiledProblem } from "../domains/domain";

export interface Interval {
  lower: number;
  upper: number;
}

/** Wilson score interval for k successes in n trials (z = 1.96 for 95 %). */
export function wilsonInterval(k: number, n: number, z = 1.959963984540054): Interval {
  if (!(n > 0) || k < 0 || k > n) throw new Error("wilsonInterval needs 0 <= k <= n and n > 0");
  const p = k / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const centre = (p + z2 / (2 * n)) / denom;
  const half = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denom;
  return { lower: k === 0 ? 0 : Math.max(0, centre - half), upper: k === n ? 1 : Math.min(1, centre + half) };
}

export interface CornerCheck {
  corners: number;
  tolerance: number;
  constraints: { id: string; maxUtilization: number; failingCorners: number }[];
}

function utilization(c: { value: number; limit: number; op: "<=" | ">=" }): number {
  if (!Number.isFinite(c.value)) return Infinity;
  if (c.op === "<=") return c.limit !== 0 ? c.value / c.limit : c.value;
  return c.value !== 0 ? c.limit / c.value : Infinity;
}

/** Evaluates every corner of the relative box p (1 +/- t), clamped to the variable bounds. */
export function boxCornerCheck(compiled: CompiledProblem, params: number[], tolerance: number): CornerCheck {
  const d = params.length;
  if (d > 16) throw new Error("box-corner check is limited to 16 variables (65,536 corners)");
  const vars = compiled.space.variables;
  const worst = new Map<string, { maxUtilization: number; failingCorners: number }>();
  const n = 1 << d;
  for (let mask = 0; mask < n; mask++) {
    const q = params.map((p, i) => Math.min(vars[i].upper, Math.max(vars[i].lower, p * (1 + ((mask >> i) & 1 ? tolerance : -tolerance)))));
    const ev = compiled.evaluate(q);
    for (const c of ev.constraints) {
      const w = worst.get(c.id) ?? { maxUtilization: -Infinity, failingCorners: 0 };
      w.maxUtilization = Math.max(w.maxUtilization, utilization(c));
      if (!c.satisfied) w.failingCorners++;
      worst.set(c.id, w);
    }
  }
  return { corners: n, tolerance, constraints: [...worst].map(([id, w]) => ({ id, ...w })) };
}

/** One run's independent robustness check, reduced to failure counts. */
export interface MarginRunInput {
  method: string;
  seed: number;
  /** Null when the run found no feasible design (it then fails every criterion). */
  bestObjective: number | null;
  samples: number;
  /** Failures per constraint id over `samples` perturbations. */
  failures: Record<string, number>;
  /** Perturbations in which at least one constraint failed. */
  overallFailures: number;
}

export interface FailureSummary {
  medianFailureRate: number | null;
  maxFailureRate: number | null;
  /** Largest per-run Wilson upper bound. */
  maxUpperBound: number | null;
  seedsMeetingCriterion: number;
  /** Every run, including runs without a design, has its Wilson upper bound <= the threshold. */
  meetsCriterion: boolean;
}

export interface MarginMethodSummary {
  method: string;
  seeds: number;
  runsWithoutDesign: number;
  medianObjective: number | null;
  /** Median over seeds of (objective - reference objective) / reference objective, paired by seed. */
  medianCost: number | null;
  maxCost: number | null;
  perConstraint: Record<string, FailureSummary>;
  overall: FailureSummary;
}

export interface MarginAnalysisOptions {
  reference: string;
  /** Criterion: a run passes when the 95 % Wilson upper bound of its failure rate is at most this. */
  maxFailureRate: number;
  constraints: string[];
}

const median = (xs: number[]): number | null => {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

function summarize(runs: MarginRunInput[], count: (r: MarginRunInput) => number, threshold: number): FailureSummary {
  const rates: number[] = [];
  const uppers: number[] = [];
  let pass = 0;
  for (const r of runs) {
    if (r.bestObjective === null || !(r.samples > 0)) continue;
    const k = count(r);
    rates.push(k / r.samples);
    const up = wilsonInterval(k, r.samples).upper;
    uppers.push(up);
    if (up <= threshold) pass++;
  }
  return {
    medianFailureRate: median(rates),
    maxFailureRate: rates.length ? Math.max(...rates) : null,
    maxUpperBound: uppers.length ? Math.max(...uppers) : null,
    seedsMeetingCriterion: pass,
    meetsCriterion: runs.length > 0 && pass === runs.length,
  };
}

export function analyzeMarginRuns(runs: MarginRunInput[], opts: MarginAnalysisOptions): { criterion: string; methods: MarginMethodSummary[] } {
  const order: string[] = [];
  for (const r of runs) if (!order.includes(r.method)) order.push(r.method);
  const ref = new Map(runs.filter((r) => r.method === opts.reference && r.bestObjective !== null).map((r) => [r.seed, r.bestObjective as number]));
  const methods = order.map((method): MarginMethodSummary => {
    const rs = runs.filter((r) => r.method === method);
    const objs = rs.flatMap((r) => (r.bestObjective === null ? [] : [r.bestObjective]));
    const costs = rs.flatMap((r) => {
      const b = ref.get(r.seed);
      return r.bestObjective === null || b === undefined ? [] : [(r.bestObjective - b) / b];
    });
    const perConstraint: Record<string, FailureSummary> = {};
    for (const id of opts.constraints) perConstraint[id] = summarize(rs, (r) => r.failures[id] ?? 0, opts.maxFailureRate);
    return {
      method,
      seeds: rs.length,
      runsWithoutDesign: rs.filter((r) => r.bestObjective === null || !(r.samples > 0)).length,
      medianObjective: median(objs),
      medianCost: method === opts.reference ? 0 : median(costs),
      maxCost: costs.length ? Math.max(...costs) : null,
      perConstraint,
      overall: summarize(rs, (r) => r.overallFailures, opts.maxFailureRate),
    };
  });
  return { criterion: `every run's 95 % Wilson upper bound on the failure rate <= ${(opts.maxFailureRate * 100).toFixed(1)} %`, methods };
}

export type MethodRow = { method: string; margins: Record<string, number>; medianCost: number | null; perConstraint: Record<string, { meetsCriterion: boolean; seedsMeetingCriterion: number }> };
/**
 * Smallest margin meeting the criterion for each constraint, among the methods
 * that margin only that constraint (plus the zero-margin reference). Reports
 * whether every larger tested margin also meets it.
 */
export function isolatedThresholds(methods: MethodRow[], constraintIds: string[], reference: string) {
  return constraintIds.map((id) => {
    const family = methods.filter((m) => constraintIds.every((o) => o === id || m.margins[o] === 0)).filter((m) => m.margins[id] > 0 || m.method === reference).sort((a, b) => a.margins[id] - b.margins[id]);
    if (family.filter((m) => m.margins[id] > 0).length === 0) return { constraint: id, tested: [] as { margin: number; method: string; meets: boolean; seeds: number; medianCost: number | null }[], smallestMeeting: null, monotone: true };
    const meets = family.map((m) => ({ margin: m.margins[id], method: m.method, meets: m.perConstraint[id].meetsCriterion, seeds: m.perConstraint[id].seedsMeetingCriterion, medianCost: m.medianCost }));
    const first = meets.find((x) => x.meets) ?? null;
    const monotone = first === null || meets.filter((x) => x.margin >= first.margin).every((x) => x.meets);
    return { constraint: id, tested: meets, smallestMeeting: first, monotone };
  });
}
