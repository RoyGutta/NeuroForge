/**
 * Optimiser benchmark at equal solver budget across seeds.
 *
 *   npm run benchmark                        # 5 seeds, 1,500 evaluations
 *   npm run benchmark -- 10 3000             # seeds, budget
 *   npm run benchmark -- 10 3000 --out       # also write benchmarks/results/<date>-<budget>.json
 *
 * Every registered single-objective optimiser runs on the canonical problem
 * with the same seeds and the same evaluation budget. Reports median and
 * interquartile range of the best feasible mass, median evaluations to reach
 * a target mass, wall time, and, for surrogate-based methods, the screening
 * reliability measured on the designs each model gated. Bayesian optimisation
 * runs at a reduced budget because its cost per evaluation is far higher;
 * this is stated in the output.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { createTrussBridgeProblem } from "../src/engine/domains/structural/truss/template";
import { compileProblem } from "../src/engine/domains/registry";
import type { ExperimentRecord } from "../src/engine/experiments/experiment";
import { createExperimentConfig, runExperimentToCompletion } from "../src/engine/experiments/runner";
import { listOptimizers } from "../src/engine/optimization";
import { ENGINE_VERSION } from "../src/engine/version";

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const writeOut = process.argv.includes("--out");
const seeds = Number(args[0] ?? 5);
const budget = Number(args[1] ?? 1500);
const problem = createTrussBridgeProblem({ span_m: 2, load_N: 500, safetyFactor: 2 });
const compiled = compileProblem(problem);
const baselineMass = compiled.evaluate(compiled.baseline.parameters).metrics.mass_kg;
const target = baselineMass * 0.5;

const PARAMS: Record<string, Record<string, number>> = {
  evolutionary: { populationSize: 30 },
  "surrogate-evolutionary": { populationSize: 30, screeningFactor: 4, warmupEvaluations: 200 },
  "member-surrogate-evolutionary": { populationSize: 30, screeningFactor: 4, warmupEvaluations: 200, riskK: 2, exploreFraction: 0.2 },
  annealing: { chains: 8 },
  "random-search": { batchSize: 50 },
  bayesian: { batchSize: 8, initialDesigns: 40 },
};
const BUDGET: Record<string, number> = { bayesian: Math.min(budget, 300) };

export interface BenchmarkRun {
  optimizer: string;
  seed: number;
  budget: number;
  bestMass_kg: number | null;
  feasible: boolean;
  evaluationsToTarget: number | null;
  wallTimeMs: number;
  /** Best-so-far objective per generation (for convergence curves). */
  curve: { evaluations: number; best: number }[];
  reliability?: { precision: number; recall: number; falseFeasibleRate: number; falseInfeasibleRate: number; forceR2?: number; coverage95?: number; onlineR2?: Record<string, number> };
}

export interface BenchmarkSummary {
  optimizer: string;
  budget: number;
  runs: number;
  feasibleRuns: number;
  medianBest_kg: number | null;
  q1Best_kg: number | null;
  q3Best_kg: number | null;
  medianEvaluationsToTarget: number | null;
  runsReachingTarget: number;
  meanWallTimeS: number;
  medianFalseFeasibleRate?: number;
  medianFalseInfeasibleRate?: number;
  medianForceR2?: number;
}

export interface BenchmarkReport {
  engineVersion: string;
  createdAt: string;
  problem: { title: string; brief: string; baselineMass_kg: number; targetMass_kg: number };
  seeds: number[];
  budget: number;
  params: Record<string, Record<string, number>>;
  runs: BenchmarkRun[];
  summaries: BenchmarkSummary[];
}

function quantile(xs: number[], q: number): number {
  const s = xs.slice().sort((a, b) => a - b);
  const i = (s.length - 1) * q;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return s[lo] + (s[hi] - s[lo]) * (i - lo);
}
const med = (xs: number[]) => (xs.length ? quantile(xs, 0.5) : null);

function reliabilityOf(rec: ExperimentRecord): BenchmarkRun["reliability"] {
  const d = rec.optimizerDiagnostics as Record<string, unknown> | undefined;
  if (!d) return undefined;
  const f = d.feasibility as { precision: number; recall: number; falseFeasibleRate: number; falseInfeasibleRate: number } | undefined;
  const forces = d.forces as { overallR2: number; coverage95: number } | undefined;
  if (f) return { precision: f.precision, recall: f.recall, falseFeasibleRate: f.falseFeasibleRate, falseInfeasibleRate: f.falseInfeasibleRate, forceR2: forces?.overallR2, coverage95: forces?.coverage95 };
  if (d.onlineR2) return { precision: NaN, recall: NaN, falseFeasibleRate: NaN, falseInfeasibleRate: NaN, onlineR2: d.onlineR2 as Record<string, number> };
  return undefined;
}

const seedList = Array.from({ length: seeds }, (_, i) => i + 1);
const runs: BenchmarkRun[] = [];
const summaries: BenchmarkSummary[] = [];

console.log(`NeuroForge ${ENGINE_VERSION} benchmark: canonical truss bridge, ${seeds} seeds, budget ${budget} evaluations`);
console.log(`baseline mass ${baselineMass.toFixed(3)} kg; target for time-to-target: ${target.toFixed(3)} kg`);
console.log("");
console.log(["optimizer".padEnd(32), "budget".padStart(7), "median kg".padStart(10), "IQR kg".padStart(14), "feasible".padStart(9), "evals->target".padStart(14), "s/run".padStart(7), "false-feas".padStart(11), "false-infeas".padStart(13)].join(" "));
for (const desc of listOptimizers().filter((o) => !o.multiObjective)) {
  const b = BUDGET[desc.id] ?? budget;
  const bests: number[] = [];
  const toTarget: number[] = [];
  const ff: number[] = [];
  const fi: number[] = [];
  const fr2: number[] = [];
  let feasible = 0;
  let time = 0;
  for (const seed of seedList) {
    const cfg = createExperimentConfig({ id: `bench-${desc.id}-${seed}`, problem, seed, optimizer: { id: desc.id, params: PARAMS[desc.id] ?? {} }, budget: { maxEvaluations: b } });
    const t0 = performance.now();
    const rec = runExperimentToCompletion(cfg);
    const wall = performance.now() - t0;
    time += wall / 1000;
    const ev = rec.best?.evaluation;
    const isFeasible = !!ev?.feasible;
    if (isFeasible) {
      feasible++;
      bests.push(ev!.metrics.mass_kg);
    }
    const hit = rec.generations.find((g) => g.bestSoFar.evaluation?.feasible && g.bestSoFar.evaluation.metrics.mass_kg <= target);
    if (hit) toTarget.push(hit.cumulativeEvaluations);
    const rel = reliabilityOf(rec);
    if (rel && Number.isFinite(rel.falseFeasibleRate)) {
      ff.push(rel.falseFeasibleRate);
      fi.push(rel.falseInfeasibleRate);
      if (rel.forceR2 !== undefined) fr2.push(rel.forceR2);
    }
    runs.push({
      optimizer: desc.id,
      seed,
      budget: b,
      bestMass_kg: isFeasible ? ev!.metrics.mass_kg : null,
      feasible: isFeasible,
      evaluationsToTarget: hit?.cumulativeEvaluations ?? null,
      wallTimeMs: wall,
      curve: rec.generations.map((g) => ({ evaluations: g.cumulativeEvaluations, best: g.bestSoFar.evaluation?.feasible ? g.bestSoFar.evaluation.metrics.mass_kg : NaN })).filter((c) => Number.isFinite(c.best)),
      reliability: rel,
    });
  }
  const summary: BenchmarkSummary = {
    optimizer: desc.id,
    budget: b,
    runs: seeds,
    feasibleRuns: feasible,
    medianBest_kg: med(bests),
    q1Best_kg: bests.length ? quantile(bests, 0.25) : null,
    q3Best_kg: bests.length ? quantile(bests, 0.75) : null,
    medianEvaluationsToTarget: med(toTarget),
    runsReachingTarget: toTarget.length,
    meanWallTimeS: time / seeds,
    medianFalseFeasibleRate: ff.length ? med(ff)! : undefined,
    medianFalseInfeasibleRate: fi.length ? med(fi)! : undefined,
    medianForceR2: fr2.length ? med(fr2)! : undefined,
  };
  summaries.push(summary);
  const iqr = bests.length ? `${summary.q1Best_kg!.toFixed(3)}-${summary.q3Best_kg!.toFixed(3)}` : "-";
  const tt = toTarget.length ? `${Math.round(summary.medianEvaluationsToTarget!)} (${toTarget.length}/${seeds})` : "not reached";
  const pct = (v?: number) => (v === undefined ? "-" : `${(v * 100).toFixed(1)} %`);
  console.log([desc.id.padEnd(32), String(b).padStart(7), (summary.medianBest_kg?.toFixed(3) ?? "-").padStart(10), iqr.padStart(14), `${feasible}/${seeds}`.padStart(9), tt.padStart(14), summary.meanWallTimeS.toFixed(2).padStart(7), pct(summary.medianFalseFeasibleRate).padStart(11), pct(summary.medianFalseInfeasibleRate).padStart(13)].join(" "));
}
console.log("");
console.log("Lower median mass is better. IQR = interquartile range across seeds. evals->target = median cumulative evaluations at which the best feasible design first reached the target (runs reaching it / seeds). false-feas/false-infeas = median screening error rates of surrogate methods, measured on the designs the model gated.");

if (writeOut) {
  const report: BenchmarkReport = {
    engineVersion: ENGINE_VERSION,
    createdAt: new Date().toISOString(),
    problem: { title: problem.title, brief: problem.brief, baselineMass_kg: baselineMass, targetMass_kg: target },
    seeds: seedList,
    budget,
    params: PARAMS,
    runs,
    summaries,
  };
  mkdirSync("benchmarks/results", { recursive: true });
  const file = `benchmarks/results/${new Date().toISOString().slice(0, 10)}-truss-${budget}x${seeds}.json`;
  writeFileSync(file, JSON.stringify(report, null, 1));
  console.log(`\nwrote ${file}`);
}
