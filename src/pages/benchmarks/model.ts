/**
 * View model for committed benchmark records (`benchmarks/results/*.json`).
 * Two producers exist, `scripts/benchmark.ts` and `scripts/ablation.ts`;
 * both are normalised into groups of runs with a summary.
 */

export interface CurvePoint {
  evaluations: number;
  best: number;
}

export interface NormalizedRun {
  seed: number;
  best: number | null;
  feasible: boolean;
  evaluationsToTarget: number | null;
  wallTimeMs?: number;
  curve: CurvePoint[];
  reliability?: { precision?: number; recall?: number; falseFeasibleRate?: number; falseInfeasibleRate?: number; forceR2?: number; coverage95?: number };
}

export interface GroupSummary {
  medianBest: number | null;
  q1Best: number | null;
  q3Best: number | null;
  medianEvaluationsToTarget: number | null;
  runsReachingTarget: number;
  runs: number;
  feasibleRuns: number;
  meanWallTimeS?: number;
  medianFalseFeasible?: number;
  medianFalseInfeasible?: number;
  medianForceR2?: number;
  medianCoverage?: number;
}

export interface NormalizedGroup {
  label: string;
  optimizer: string;
  budget: number;
  params: Record<string, number>;
  runs: NormalizedRun[];
  summary: GroupSummary;
}

export interface NormalizedReport {
  file: string;
  kind: "benchmark" | "ablation";
  engineVersion: string;
  createdAt: string;
  budget: number;
  seeds: number;
  baselineMass: number;
  targetMass: number;
  problemTitle: string;
  groups: NormalizedGroup[];
}

type BenchmarkFile = {
  engineVersion: string;
  createdAt: string;
  problem: { title: string; brief: string; baselineMass_kg: number; targetMass_kg: number };
  seeds: number[];
  budget: number;
  params: Record<string, Record<string, number>>;
  runs: { optimizer: string; seed: number; budget: number; bestMass_kg: number | null; feasible: boolean; evaluationsToTarget: number | null; wallTimeMs: number; curve: CurvePoint[]; reliability?: NormalizedRun["reliability"] }[];
  summaries: { optimizer: string; budget: number; runs: number; feasibleRuns: number; medianBest_kg: number | null; q1Best_kg: number | null; q3Best_kg: number | null; medianEvaluationsToTarget: number | null; runsReachingTarget: number; meanWallTimeS: number; medianFalseFeasibleRate?: number; medianFalseInfeasibleRate?: number; medianForceR2?: number }[];
};

type AblationFile = {
  engineVersion: string;
  createdAt: string;
  seeds: number;
  budget: number;
  targetMass_kg: number;
  baselineMass_kg: number;
  rows: { label: string; optimizer: string; params: Record<string, number>; medianBest: number; q1: number; q3: number; medianToTarget: number | null; reached: number; medianFalseFeasible: number | null; medianFalseInfeasible: number | null; medianForceR2: number | null; medianCoverage: number | null; runs: { seed: number; best: number; toTarget: number | null; falseFeasible?: number; falseInfeasible?: number; forceR2?: number; coverage95?: number; precision?: number; recall?: number }[] }[];
};

export function normalizeReport(file: string, raw: unknown): NormalizedReport {
  const r = raw as Partial<BenchmarkFile & AblationFile>;
  if (Array.isArray(r.rows)) {
    const a = raw as AblationFile;
    return {
      file,
      kind: "ablation",
      engineVersion: a.engineVersion,
      createdAt: a.createdAt,
      budget: a.budget,
      seeds: a.seeds,
      baselineMass: a.baselineMass_kg,
      targetMass: a.targetMass_kg,
      problemTitle: "Canonical truss bridge",
      groups: a.rows.map((row) => ({
        label: row.label,
        optimizer: row.optimizer,
        budget: a.budget,
        params: row.params,
        runs: row.runs.map((run) => ({
          seed: run.seed,
          best: run.best,
          feasible: true,
          evaluationsToTarget: run.toTarget,
          curve: [],
          reliability: run.precision !== undefined || run.falseFeasible !== undefined ? { precision: run.precision, recall: run.recall, falseFeasibleRate: run.falseFeasible, falseInfeasibleRate: run.falseInfeasible, forceR2: run.forceR2, coverage95: run.coverage95 } : undefined,
        })),
        summary: {
          medianBest: row.medianBest,
          q1Best: row.q1,
          q3Best: row.q3,
          medianEvaluationsToTarget: row.medianToTarget,
          runsReachingTarget: row.reached,
          runs: row.runs.length,
          feasibleRuns: row.runs.length,
          medianFalseFeasible: row.medianFalseFeasible ?? undefined,
          medianFalseInfeasible: row.medianFalseInfeasible ?? undefined,
          medianForceR2: row.medianForceR2 ?? undefined,
          medianCoverage: row.medianCoverage ?? undefined,
        },
      })),
    };
  }
  const b = raw as BenchmarkFile;
  return {
    file,
    kind: "benchmark",
    engineVersion: b.engineVersion,
    createdAt: b.createdAt,
    budget: b.budget,
    seeds: b.seeds.length,
    baselineMass: b.problem.baselineMass_kg,
    targetMass: b.problem.targetMass_kg,
    problemTitle: b.problem.title,
    groups: b.summaries.map((s) => ({
      label: s.optimizer,
      optimizer: s.optimizer,
      budget: s.budget,
      params: b.params[s.optimizer] ?? {},
      runs: b.runs
        .filter((run) => run.optimizer === s.optimizer)
        .map((run) => ({ seed: run.seed, best: run.bestMass_kg, feasible: run.feasible, evaluationsToTarget: run.evaluationsToTarget, wallTimeMs: run.wallTimeMs, curve: run.curve, reliability: run.reliability })),
      summary: {
        medianBest: s.medianBest_kg,
        q1Best: s.q1Best_kg,
        q3Best: s.q3Best_kg,
        medianEvaluationsToTarget: s.medianEvaluationsToTarget,
        runsReachingTarget: s.runsReachingTarget,
        runs: s.runs,
        feasibleRuns: s.feasibleRuns,
        meanWallTimeS: s.meanWallTimeS,
        medianFalseFeasible: s.medianFalseFeasibleRate,
        medianFalseInfeasible: s.medianFalseInfeasibleRate,
        medianForceR2: s.medianForceR2,
      },
    })),
  };
}

export interface AggregatePoint {
  evaluations: number;
  median: number;
  q1: number;
  q3: number;
  count: number;
}

function quantile(sorted: number[], q: number): number {
  const i = (sorted.length - 1) * q;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
}

/** Best-so-far is a step function; sample each run at the grid and aggregate across runs. */
export function aggregateCurves(runs: CurvePoint[][], grid: number[]): AggregatePoint[] {
  return grid.map((x) => {
    const values: number[] = [];
    for (const curve of runs) {
      let v: number | null = null;
      for (const p of curve) {
        if (p.evaluations <= x) v = p.best;
        else break;
      }
      if (v !== null && Number.isFinite(v)) values.push(v);
    }
    values.sort((a, b) => a - b);
    return {
      evaluations: x,
      median: values.length ? quantile(values, 0.5) : NaN,
      q1: values.length ? quantile(values, 0.25) : NaN,
      q3: values.length ? quantile(values, 0.75) : NaN,
      count: values.length,
    };
  });
}

export function evaluationGrid(budget: number, steps = 60): number[] {
  return Array.from({ length: steps }, (_, i) => Math.round(((i + 1) / steps) * budget));
}
