/**
 * Experiment runner.
 *
 * Implemented as a synchronous generator so the same code runs inside a
 * test, a Web Worker, or a Node process: the caller pulls one generation at
 * a time, forwards progress, and may stop early by returning from the
 * generator. Determinism comes from the seeded Rng and counter-based ids;
 * wall-clock timestamps are recorded but never influence the search.
 */
import { compareDesigns, type Design } from "../core/design";
import type { EngineeringProblem } from "../core/problem";
import { Rng } from "../core/rng";
import { compileProblem } from "../domains/registry";
import type { CompiledProblem } from "../domains/domain";
import { createOptimizer, getOptimizerDescriptor, resolveParams } from "../optimization";
import { hypervolume2d, paretoFront } from "../optimization/pareto";
import { ENGINE_VERSION } from "../version";
import type {
  ExperimentBudget,
  ExperimentConfig,
  ExperimentRecord,
  GenerationSummary,
  OptimizerSelection,
} from "./experiment";

export interface CreateExperimentOptions {
  id?: string;
  label?: string;
  problem: EngineeringProblem;
  seed: number;
  optimizer: OptimizerSelection;
  budget: ExperimentBudget;
  seedBaseline?: boolean;
}

export function createExperimentConfig(opts: CreateExperimentOptions): ExperimentConfig {
  const desc = getOptimizerDescriptor(opts.optimizer.id);
  if (!desc) throw new Error(`unknown optimizer "${opts.optimizer.id}"`);
  return {
    id: opts.id ?? `exp-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`,
    label: opts.label ?? `${opts.problem.title} / ${desc.label}`,
    problem: opts.problem,
    seed: opts.seed,
    optimizer: { id: desc.id, params: resolveParams(desc.params, opts.optimizer.params) },
    budget: { ...opts.budget },
    seedBaseline: opts.seedBaseline ?? true,
  };
}

export type ExperimentEvent =
  | { type: "started"; record: ExperimentRecord; compiled: CompiledProblem }
  | { type: "generation"; summary: GenerationSummary; record: ExperimentRecord };

export interface RunHooks {
  /** Called with every evaluated batch, in order. Used to build datasets. */
  onBatch?(designs: Design[]): void;
  /** Checked after each generation; returning true ends the run as completed (e.g. on convergence). */
  shouldStop?(record: ExperimentRecord): boolean;
}

export function* runExperiment(
  config: ExperimentConfig,
  hooks: RunHooks = {}
): Generator<ExperimentEvent, ExperimentRecord, void> {
  const compiled = compileProblem(config.problem);
  const objective = config.problem.objectives[0];
  const rng = new Rng(config.seed);
  let counter = 0;
  const nextId = () => `d${(++counter).toString().padStart(6, "0")}`;

  const baseline: Design = {
    id: "baseline",
    generation: 0,
    parentIds: [],
    operator: "baseline",
    parameters: compiled.baseline.parameters,
  };
  baseline.evaluation = compiled.evaluate(baseline.parameters);

  const optimizer = createOptimizer(
    config.optimizer.id,
    {
      space: compiled.space,
      objective,
      rng,
      nextId,
      screening: { objectiveMetric: objective.metric, constraints: config.problem.constraints },
      objectives: config.problem.objectives,
      compiled,
    },
    config.optimizer.params,
    config.seedBaseline ? [baseline] : []
  );

  const startedAt = new Date();
  const record: ExperimentRecord = {
    id: config.id,
    label: config.label,
    config,
    status: "running",
    startedAt: startedAt.toISOString(),
    backendId: compiled.backendId,
    engineVersion: ENGINE_VERSION,
    baseline,
    generations: [],
    best: null,
    totalEvaluations: 0,
    wallTimeMs: 0,
  };
  yield { type: "started", record, compiled };

  const t0 = now();
  let generation = 0;
  let bestSoFar: Design | undefined;
  const objectives = config.problem.objectives;
  const multiObjective = objectives.length > 1;
  // External archive of every feasible non-dominated design evaluated so far.
  // Unlike the optimiser's population, it can only grow in dominated volume.
  let archive: Design[] = multiObjective && baseline.evaluation?.feasible ? [baseline] : [];
  // Hypervolume reference: the baseline's objective values (minimisation
  // orientation), normalised so the metric is the dominated fraction of the
  // baseline box.
  const reference: [number, number] | null =
    objectives.length === 2 && baseline.evaluation
      ? [oriented(baseline.evaluation.objectives[objectives[0].id], objectives[0]), oriented(baseline.evaluation.objectives[objectives[1].id], objectives[1])]
      : null;
  try {
    while (
      record.totalEvaluations < config.budget.maxEvaluations &&
      (config.budget.maxGenerations === undefined || generation < config.budget.maxGenerations)
    ) {
      const batch = optimizer.ask(generation);
      let feasibleCount = 0;
      let bestObjective: number | null = null;
      let sumFeasible = 0;
      for (const d of batch) {
        d.evaluation = compiled.evaluate(d.parameters);
        if (d.evaluation.feasible) {
          feasibleCount++;
          const v = d.evaluation.objectives[objective.id];
          sumFeasible += v;
          if (bestObjective === null || better(v, bestObjective, objective.direction)) bestObjective = v;
        }
        if (!bestSoFar || compareDesigns(d, bestSoFar, objective.id, objective.direction) < 0) {
          bestSoFar = d;
        }
      }
      optimizer.tell(batch);
      hooks.onBatch?.(batch);
      record.totalEvaluations += batch.length;
      const summary: GenerationSummary = {
        generation,
        evaluations: batch.length,
        cumulativeEvaluations: record.totalEvaluations,
        feasibleCount,
        bestObjective,
        meanFeasibleObjective: feasibleCount > 0 ? sumFeasible / feasibleCount : null,
        bestSoFar: cloneDesign(bestSoFar!),
        elapsedMs: now() - t0,
      };
      if (multiObjective) {
        archive = paretoFront(archive.concat(batch), objectives);
        summary.frontSize = archive.length;
        if (reference && Number.isFinite(reference[0]) && Number.isFinite(reference[1]) && reference[0] !== 0 && reference[1] !== 0) {
          summary.hypervolume = hypervolume2d(archive, objectives, reference) / Math.abs(reference[0] * reference[1]);
        }
      }
      record.generations.push(summary);
      record.best = summary.bestSoFar;
      record.wallTimeMs = summary.elapsedMs;
      generation++;
      yield { type: "generation", summary, record };
      if (hooks.shouldStop?.(record)) break;
    }
    record.status = "completed";
  } finally {
    if (optimizer.diagnostics) record.optimizerDiagnostics = optimizer.diagnostics();
    if (multiObjective) record.paretoFront = archive.map(cloneDesign);
    if (record.status === "running") record.status = "cancelled";
    record.finishedAt = new Date().toISOString();
    record.wallTimeMs = now() - t0;
  }
  return record;
}

/** Drive the generator to completion synchronously. */
export function runExperimentToCompletion(config: ExperimentConfig): ExperimentRecord {
  const gen = runExperiment(config);
  let step = gen.next();
  while (!step.done) step = gen.next();
  return step.value;
}

function oriented(v: number, o: { direction: "minimize" | "maximize" }): number {
  return o.direction === "minimize" ? v : -v;
}

function better(a: number, b: number, direction: "minimize" | "maximize"): boolean {
  return direction === "minimize" ? a < b : a > b;
}

function cloneDesign(d: Design): Design {
  return {
    ...d,
    parentIds: d.parentIds.slice(),
    parameters: d.parameters.slice(),
    evaluation: d.evaluation
      ? {
          ...d.evaluation,
          metrics: { ...d.evaluation.metrics },
          objectives: { ...d.evaluation.objectives },
          constraints: d.evaluation.constraints.map((c) => ({ ...c })),
          diagnostics: d.evaluation.diagnostics.slice(),
        }
      : undefined,
  };
}

function now(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}
