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
import { createHeatSinkProblem } from "../domains/thermal/finArray/template";
import { createSpaceTrussProblem } from "../domains/structural/truss3d/template";
import type { Design, Evaluation } from "../core/design";
import { postHocRobustSelection } from "../robustness/formulations";
import { robustnessStudy } from "../robustness/robustness";
import type { RobustSpec } from "../robustness/robustProblem";
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
  /** Optimise in robust mode (perturbed copies inside every evaluation). */
  robust?: RobustSpec;
  /** Constraint tightening by a relative margin on every limit. */
  margin?: number;
  /** Nominal run, then the best-so-far trajectory screened with the study's robustCheck tolerance. */
  postHoc?: { targetFraction: number; strategy?: "linear" | "bisection" | "strided"; stride?: number };
  /** Per-constraint margin overrides used with `margin`. */
  margins?: Record<string, number>;
  /** With `robust`: spend this fraction of the budget nominally first, then continue in robust mode from the nominal best. */
  nominalPhaseFraction?: number;
}

export interface StudySpec {
  id: string;
  title: string;
  hypothesis: string;
  benchmark: StudyBenchmark;
  budget: number;
  /** "evaluations" (default): design evaluations per run. "solverCalls": copy-based methods get budget / (1 + copies) designs. */
  budgetUnit?: "evaluations" | "solverCalls";
  seeds: number[];
  reference: string;
  methods: StudyMethod[];
  metrics: string[];
  /** Target objective as a fraction of the baseline objective, for evaluations-to-target. */
  targetFraction: number;
  /** Independent robustness check of every run's best design (fresh seed, nominal evaluator). */
  robustCheck?: { tolerance: number; samples: number };
}

export type StudyBenchmark =
  | { problem: "truss-bridge"; span_m: number; load_N: number; panels: number; safetyFactor?: number; materialId?: string }
  | { problem: "planar-manipulator"; payload_kg: number; reach_m: number; safetyFactor?: number; materialId?: string; objectiveMetric?: "peakTorque_Nm" | "mass_kg" }
  | { problem: "fin-array"; power_W: number; maxTemperature_C: number; ambient_C?: number; baseWidth_m?: number; baseDepth_m?: number; materialId?: string; objectiveMetric?: "mass_kg" | "thermalResistance_K_W" }
  | { problem: "space-truss"; span_m: number; load_N: number; bays: number; safetyFactor?: number; materialId?: string };;

export function studyProblem(b: StudyBenchmark): EngineeringProblem {
  if (b.problem === "space-truss") return createSpaceTrussProblem({ span_m: b.span_m, load_N: b.load_N, bays: b.bays, safetyFactor: b.safetyFactor, materialId: b.materialId });
  if (b.problem === "fin-array") return createHeatSinkProblem({ power_W: b.power_W, maxTemperature_C: b.maxTemperature_C, ambient_C: b.ambient_C, baseWidth_m: b.baseWidth_m, baseDepth_m: b.baseDepth_m, materialId: b.materialId, objectiveMetric: b.objectiveMetric });
  if (b.problem === "planar-manipulator") return createManipulatorProblem({ payload_kg: b.payload_kg, reach_m: b.reach_m, safetyFactor: b.safetyFactor, materialId: b.materialId, objectiveMetric: b.objectiveMetric });
  return createTrussBridgeProblem({ span_m: b.span_m, load_N: b.load_N, panels: b.panels, safetyFactor: b.safetyFactor, materialId: b.materialId });
}

export function studyProblemTitle(b: StudyBenchmark): string {
  if (b.problem === "space-truss") return `Space truss girder (${b.span_m} m span, ${b.load_N} N, ${b.bays} bays)`;
  if (b.problem === "fin-array") return `Plate-fin heat sink (${b.power_W} W, limit ${b.maxTemperature_C} C)`;
  return b.problem === "planar-manipulator" ? `Planar manipulator (${b.payload_kg} kg payload, ${b.reach_m} m reach)` : `Truss bridge (${b.span_m} m span, ${b.load_N} N, ${b.panels} panels)`;
}

export interface StudyRun {
  method: string;
  seed: number;
  budget: number;
  /** Best feasible objective value at the end of the run (null when no feasible design was found). */
  bestObjective: number | null;
  feasible: boolean;
  /** Feasible fraction of the best design under the spec's robustCheck, measured with the nominal evaluator. */
  robustFeasibleFraction?: number;
  /** Per-constraint violation probabilities of that check. */
  robustDetail?: { tolerance: number; samples: number; seed: number; constraints: { id: string; violationProbability: number; maxUtilization: number }[] };
  /** The design behind the numbers, kept even when the record is stripped. */
  bestParameters: number[];
  bestEvaluation: Evaluation;
  /** Solver calls actually spent: design evaluations times copies, plus post-hoc checks and nominal phases. */
  solverCalls: number;
  /** Phases of a two-phase method; the final phase is `record`. */
  phases?: { kind: "nominal" | "robust"; evaluations: number; solverCalls: number; bestObjective: number | null }[];
  /** Post-hoc screening outcome. */
  postHoc?: { checks: number; selectedFromTrajectory: boolean };
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
  /** Median independent robust feasible fraction of the best designs (when the spec has robustCheck). */
  medianRobustFeasible?: number;
  medianSolverCalls: number;
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
    const stated = m.budget ?? spec.budget;
    const copies = m.robust ? 1 + m.robust.samples : 1;
    const solverUnit = spec.budgetUnit === "solverCalls";
    const phaseFraction = m.robust && m.nominalPhaseFraction ? Math.min(0.95, Math.max(0, m.nominalPhaseFraction)) : 0;
    // Design evaluations for the (final) run: equalise solver calls when asked.
    const nominalPhaseEvals = phaseFraction > 0 ? Math.floor(stated * phaseFraction) : 0;
    const budget = solverUnit ? Math.floor((stated - nominalPhaseEvals) / copies) : phaseFraction > 0 ? Math.floor(stated * (1 - phaseFraction)) : stated;
    if (!(budget > 0)) throw new Error(`method "${m.id}" has no design budget left`);
    for (const seed of spec.seeds) {
      const t0 = now();
      const phases: StudyRun["phases"] = [];
      let seedDesigns: number[][] | undefined;
      if (nominalPhaseEvals > 0) {
        const pre = runExperimentToCompletion(createExperimentConfig({ id: `${spec.id}-${m.id}-${seed}-nominal`, label: `${spec.id} ${m.id} seed ${seed} nominal phase`, problem, seed, optimizer: { id: m.optimizer, params: m.params }, budget: { maxEvaluations: nominalPhaseEvals }, margin: m.margin, margins: m.margins }));
        phases.push({ kind: "nominal", evaluations: pre.totalEvaluations, solverCalls: pre.totalEvaluations, bestObjective: pre.best?.evaluation?.feasible ? pre.best.evaluation.objectives[obj.id] : null });
        if (pre.best) seedDesigns = [pre.best.parameters];
      }
      const cfg = createExperimentConfig({ id: `${spec.id}-${m.id}-${seed}`, label: `${spec.id} ${m.id} seed ${seed}`, problem, seed, optimizer: { id: m.optimizer, params: m.params }, budget: { maxEvaluations: budget }, robust: m.robust, margin: m.margin, margins: m.margins, seedDesigns });
      const rec = runExperimentToCompletion(cfg);
      if (phases.length) phases.push({ kind: "robust", evaluations: rec.totalEvaluations, solverCalls: rec.totalEvaluations * copies, bestObjective: rec.best?.evaluation?.feasible ? rec.best.evaluation.objectives[obj.id] : null });
      let solverCalls = rec.totalEvaluations * copies + phases.reduce((acc, p) => acc + (p.kind === "nominal" ? p.solverCalls : 0), 0);
      // The reported design: the run's best, or the post-hoc selection from its trajectory.
      let chosen: Design | null = rec.best;
      let postHoc: StudyRun["postHoc"];
      if (m.postHoc && spec.robustCheck) {
        const sel = postHocRobustSelection(compiled, rec, { tolerance: spec.robustCheck.tolerance, samples: spec.robustCheck.samples, seed: 104729 + seed, targetFraction: m.postHoc.targetFraction, strategy: m.postHoc.strategy, stride: m.postHoc.stride });
        if (sel) {
          chosen = sel.design;
          solverCalls += sel.solverCalls;
          postHoc = { checks: sel.checks, selectedFromTrajectory: true };
        } else {
          chosen = null;
          const distinct = new Set(rec.generations.filter((g) => g.bestSoFar.evaluation?.feasible).map((g) => JSON.stringify(g.bestSoFar.parameters))).size;
          solverCalls += distinct * spec.robustCheck.samples;
          postHoc = { checks: distinct, selectedFromTrajectory: false };
        }
      }
      // Metrics are always reported from the nominal evaluator so methods are comparable.
      const nominalEval = chosen ? compiled.evaluate(chosen.parameters) : null;
      const hit = rec.generations.find((g) => g.bestSoFar.evaluation?.feasible && better(g.bestSoFar.evaluation.objectives[obj.id]));
      const run: StudyRun = {
        method: m.id,
        seed,
        budget,
        bestObjective: nominalEval?.feasible ? nominalEval.objectives[obj.id] : null,
        feasible: !!nominalEval?.feasible,
        evaluationsToTarget: hit?.cumulativeEvaluations ?? null,
        wallTimeMs: now() - t0,
        curve: rec.generations.map((g) => ({ evaluations: g.cumulativeEvaluations, best: g.bestSoFar.evaluation?.feasible ? g.bestSoFar.evaluation.objectives[obj.id] : NaN })).filter((c) => Number.isFinite(c.best)),
        reliability: reliabilityOf(rec),
        record: rec,
        bestParameters: chosen ? chosen.parameters.slice() : [],
        bestEvaluation: nominalEval ?? compiled.evaluate(compiled.baseline.parameters),
        solverCalls,
        ...(phases.length ? { phases } : {}),
        ...(postHoc ? { postHoc } : {}),
      };
      if (spec.robustCheck && chosen) {
        const check = robustnessStudy(compiled, chosen.parameters, { samples: spec.robustCheck.samples, seed: 7919 + seed, tolerance: spec.robustCheck.tolerance });
        run.robustFeasibleFraction = check.feasibleFraction;
        run.robustDetail = { tolerance: check.tolerance, samples: check.samples, seed: check.seed, constraints: check.constraints.map((c) => ({ id: c.id, violationProbability: c.violationProbability, maxUtilization: c.maxUtilization })) };
      }
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
    const rf = runs.map((r) => r.robustFeasibleFraction).filter((v): v is number => v !== undefined);
    const sc = runs.map((r) => r.solverCalls);
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
      medianRobustFeasible: rf.length ? median(rf) : undefined,
      medianSolverCalls: sc.length ? median(sc) : 0,
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
