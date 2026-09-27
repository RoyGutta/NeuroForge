/**
 * Study registry: a declared hypothesis, a benchmark problem, methods,
 * seeds and a solver budget, run in full and then analysed separately.
 * `runStudy` produces raw runs; `analyzeStudy` produces medians with
 * seeded bootstrap intervals and rank-based effect sizes against a
 * reference method. Keeping the two apart is what makes cherry-picking
 * visible: the analysis is a function of all the runs the spec declared.
 */
import { createManipulatorProblem } from "../domains/robotics/manipulator/template";
import { createTrussBridgeProblem } from "../domains/structural/truss/template";
import { compileProblem } from "../domains/registry";
import { getOptimizerDescriptor } from "../optimization";
import { bootstrapMedianCI, cliffsDelta, median, quantile, varghaDelaneyA, type BootstrapCI } from "../ml/statistics";
import { ENGINE_VERSION } from "../version";
import type { EngineeringProblem } from "../core/problem";
import type { ExperimentRecord } from "./experiment";
import { createExperimentConfig, runExperimentToCompletion } from "./runner";

export interface StudyMethod {
  id: string;
  optimizer: string;
  params: Record<string, number>;
  /** Budget override for expensive methods; must be stated in the spec. */
  budget?: number;
}

export interface StudySpec {
  id: string;
  title: string;
  hypothesis: string;
  benchmark: StudyBenchmark;
  budget: number;
  seeds: number[];
  reference: string;
  methods: StudyMethod[];
  metrics: string[];
  /** Target objective as a fraction of the baseline objective, for evaluations-to-target. */
  targetFraction: number;
}

export type StudyBenchmark =
  | { problem: "truss-bridge"; span_m: number; load_N: number; panels: number; safetyFactor?: number; materialId?: string }
  | { problem: "planar-manipulator"; payload_kg: number; reach_m: number; safetyFactor?: number; materialId?: string; objectiveMetric?: "peakTorque_Nm" | "mass_kg" };

export function studyProblem(b: StudyBenchmark): EngineeringProblem {
  if (b.problem === "planar-manipulator") return createManipulatorProblem({ payload_kg: b.payload_kg, reach_m: b.reach_m, safetyFactor: b.safetyFactor, materialId: b.materialId, objectiveMetric: b.objectiveMetric });
  return createTrussBridgeProblem({ span_m: b.span_m, load_N: b.load_N, panels: b.panels, safetyFactor: b.safetyFactor, materialId: b.materialId });
}

export function studyProblemTitle(b: StudyBenchmark): string {
  return b.problem === "planar-manipulator" ? `Planar manipulator (${b.payload_kg} kg payload, ${b.reach_m} m reach)` : `Truss bridge (${b.span_m} m span, ${b.load_N} N, ${b.panels} panels)`;
}

export interface StudyRun {
  method: string;
  seed: number;
  budget: number;
  /** Best feasible objective value at the end of the run (null when no feasible design was found). */
  bestObjective: number | null;
  feasible: boolean;
  evaluationsToTarget: number | null;
  wallTimeMs: number;
  curve: { evaluations: number; best: number }[];
  reliability?: { precision: number; recall: number; falseFeasibleRate: number; falseInfeasibleRate: number; forceR2?: number; coverage95?: number };
  record: ExperimentRecord;
}

export interface StudyObjective {
  metric: string;
  label: string;
  unit: string;
  direction: "minimize" | "maximize";
}

export interface StudyResult {
  spec: StudySpec;
  engineVersion: string;
  objective: StudyObjective;
  baselineObjective: number;
  targetObjective: number;
  runs: StudyRun[];
}

export interface MethodAnalysis {
  id: string;
  optimizer: string;
  budget: number;
  runs: number;
  feasibleRuns: number;
  best: BootstrapCI;
  q1Best: number;
  q3Best: number;
  medianEvaluationsToTarget: number | null;
  runsReachingTarget: number;
  meanWallTimeS: number;
  medianFalseFeasible?: number;
  medianFalseInfeasible?: number;
  medianForceR2?: number;
}

export interface MethodComparison {
  method: string;
  reference: string;
  /** P(method best mass < reference best mass); > 0.5 favours the method. */
  varghaDelaneyA: number;
  cliffsDelta: number;
  effectLabel: "negligible" | "small" | "medium" | "large";
  medianDifference: number;
}

export interface StudyAnalysis {
  studyId: string;
  engineVersion: string;
  seeds: number;
  budget: number;
  objective: StudyObjective;
  baselineObjective: number;
  targetObjective: number;
  methods: MethodAnalysis[];
  comparisons: MethodComparison[];
  bootstrap: { resamples: number; level: number; seed: number };
}

function reliabilityOf(rec: ExperimentRecord): StudyRun["reliability"] {
  const d = rec.optimizerDiagnostics as Record<string, unknown> | undefined;
  const f = d?.feasibility as StudyRun["reliability"] | undefined;
  const forces = d?.forces as { overallR2: number; coverage95: number } | undefined;
  return f ? { precision: f.precision, recall: f.recall, falseFeasibleRate: f.falseFeasibleRate, falseInfeasibleRate: f.falseInfeasibleRate, forceR2: forces?.overallR2, coverage95: forces?.coverage95 } : undefined;
}

export function runStudy(spec: StudySpec, onRun?: (run: StudyRun, index: number, total: number) => void): StudyResult {
  if (!spec.methods.some((m) => m.id === spec.reference)) throw new Error(`reference method "${spec.reference}" is not among the study's methods`);
  for (const m of spec.methods) if (!getOptimizerDescriptor(m.optimizer)) throw new Error(`unknown optimizer "${m.optimizer}" in method "${m.id}"`);
  const problem = studyProblem(spec.benchmark);
  const compiled = compileProblem(problem);
  const obj = problem.objectives[0];
  const metricDesc = compiled.metrics.find((m) => m.id === obj.metric);
  const objective: StudyObjective = { metric: obj.metric, label: metricDesc?.label ?? obj.label, unit: metricDesc?.unit ?? "", direction: obj.direction };
  const baselineObjective = compiled.evaluate(compiled.baseline.parameters).objectives[obj.id];
  const target = baselineObjective * spec.targetFraction;
  const better = (v: number) => (obj.direction === "minimize" ? v <= target : v >= target);
  const runs: StudyRun[] = [];
  const total = spec.methods.length * spec.seeds.length;
  for (const m of spec.methods) {
    const budget = m.budget ?? spec.budget;
    for (const seed of spec.seeds) {
      const cfg = createExperimentConfig({ id: `${spec.id}-${m.id}-${seed}`, label: `${spec.id} ${m.id} seed ${seed}`, problem, seed, optimizer: { id: m.optimizer, params: m.params }, budget: { maxEvaluations: budget } });
      const t0 = now();
      const rec = runExperimentToCompletion(cfg);
      const ev = rec.best?.evaluation;
      const hit = rec.generations.find((g) => g.bestSoFar.evaluation?.feasible && better(g.bestSoFar.evaluation.objectives[obj.id]));
      const run: StudyRun = {
        method: m.id,
        seed,
        budget,
        bestObjective: ev?.feasible ? ev.objectives[obj.id] : null,
        feasible: !!ev?.feasible,
        evaluationsToTarget: hit?.cumulativeEvaluations ?? null,
        wallTimeMs: now() - t0,
        curve: rec.generations.map((g) => ({ evaluations: g.cumulativeEvaluations, best: g.bestSoFar.evaluation?.feasible ? g.bestSoFar.evaluation.objectives[obj.id] : NaN })).filter((c) => Number.isFinite(c.best)),
        reliability: reliabilityOf(rec),
        record: rec,
      };
      runs.push(run);
      onRun?.(run, runs.length, total);
    }
  }
  return { spec, engineVersion: ENGINE_VERSION, objective, baselineObjective, targetObjective: target, runs };
}

function effectLabel(delta: number): MethodComparison["effectLabel"] {
  const d = Math.abs(delta);
  return d < 0.147 ? "negligible" : d < 0.33 ? "small" : d < 0.474 ? "medium" : "large";
}

export function analyzeStudy(result: StudyResult, opts: { resamples?: number; level?: number; seed?: number } = {}): StudyAnalysis {
  const resamples = opts.resamples ?? 2000;
  const level = opts.level ?? 0.95;
  const seed = opts.seed ?? 1;
  const byMethod = new Map<string, StudyRun[]>();
  for (const r of result.runs) byMethod.set(r.method, (byMethod.get(r.method) ?? []).concat(r));
  const methods: MethodAnalysis[] = result.spec.methods.map((m) => {
    const runs = byMethod.get(m.id) ?? [];
    const bests = runs.map((r) => r.bestObjective).filter((v): v is number => v !== null);
    const tt = runs.map((r) => r.evaluationsToTarget).filter((v): v is number => v !== null);
    const ff = runs.map((r) => r.reliability?.falseFeasibleRate).filter((v): v is number => v !== undefined);
    const fi = runs.map((r) => r.reliability?.falseInfeasibleRate).filter((v): v is number => v !== undefined);
    const fr = runs.map((r) => r.reliability?.forceR2).filter((v): v is number => v !== undefined);
    return {
      id: m.id,
      optimizer: m.optimizer,
      budget: m.budget ?? result.spec.budget,
      runs: runs.length,
      feasibleRuns: bests.length,
      best: bests.length ? bootstrapMedianCI(bests, { seed, resamples, level }) : { median: NaN, lower: NaN, upper: NaN, level, resamples, seed },
      q1Best: bests.length ? quantile(bests, 0.25) : NaN,
      q3Best: bests.length ? quantile(bests, 0.75) : NaN,
      medianEvaluationsToTarget: tt.length ? median(tt) : null,
      runsReachingTarget: tt.length,
      meanWallTimeS: runs.length ? runs.reduce((s, r) => s + r.wallTimeMs, 0) / runs.length / 1000 : 0,
      medianFalseFeasible: ff.length ? median(ff) : undefined,
      medianFalseInfeasible: fi.length ? median(fi) : undefined,
      medianForceR2: fr.length ? median(fr) : undefined,
    };
  });
  const refBests = (byMethod.get(result.spec.reference) ?? []).map((r) => r.bestObjective).filter((v): v is number => v !== null);
  const comparisons: MethodComparison[] = result.spec.methods
    .filter((m) => m.id !== result.spec.reference)
    .map((m) => {
      const bests = (byMethod.get(m.id) ?? []).map((r) => r.bestObjective).filter((v): v is number => v !== null);
      const A = varghaDelaneyA(bests, refBests);
      const delta = cliffsDelta(bests, refBests);
      return { method: m.id, reference: result.spec.reference, varghaDelaneyA: A, cliffsDelta: delta, effectLabel: effectLabel(delta), medianDifference: median(bests) - median(refBests) };
    });
  return { studyId: result.spec.id, engineVersion: result.engineVersion, seeds: result.spec.seeds.length, budget: result.spec.budget, objective: result.objective, baselineObjective: result.baselineObjective, targetObjective: result.targetObjective, methods, comparisons, bootstrap: { resamples, level, seed } };
}

function now(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}
