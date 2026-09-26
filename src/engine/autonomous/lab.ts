/**
 * Autonomous engineering lab: a staged, measured search.
 *
 *   analysis  -> compile, size the baseline, sensitivity, binding constraints
 *   pilot     -> each strategy on an equal solver budget, same derived seed
 *   main      -> the strategy with the best pilot result, run until the
 *                best-so-far plateaus or the remaining budget is spent
 *   tradeoff  -> NSGA-II on mass versus compliance (when the domain exposes
 *                compliance) for a Pareto front around the discovery
 *   report    -> every number computed from the stage records
 *
 * The lab composes the existing runner and optimisers; it introduces no new
 * physics, no new randomness beyond derived seeds, and no numbers of its own.
 */
import type { Design } from "../core/design";
import type { EngineeringProblem, Objective } from "../core/problem";
import { compileProblem } from "../domains/registry";
import type { ExperimentConfig, ExperimentRecord, GenerationSummary } from "../experiments/experiment";
import { createExperimentConfig, runExperiment } from "../experiments/runner";
import { bindingConstraints, parameterSensitivity } from "../explain/sensitivity";
import { getOptimizerDescriptor } from "../optimization";
import { ENGINE_VERSION } from "../version";
import { detectPlateau, type PlateauOptions } from "./convergence";

export interface LabConfig {
  id: string;
  label: string;
  problem: EngineeringProblem;
  seed: number;
  strategies: string[];
  pilotBudget: number;
  totalBudget: number;
  tradeoffBudget: number;
  convergence: PlateauOptions;
  optimizerParams: Record<string, Record<string, number>>;
}

export interface CreateLabOptions {
  id?: string;
  label?: string;
  problem: EngineeringProblem;
  seed: number;
  strategies?: string[];
  pilotBudget?: number;
  totalBudget?: number;
  tradeoffBudget?: number;
  convergence?: PlateauOptions;
  optimizerParams?: Record<string, Record<string, number>>;
}

export function createLabConfig(opts: CreateLabOptions): LabConfig {
  const strategies = opts.strategies ?? ["evolutionary", "surrogate-evolutionary", "member-surrogate-evolutionary"];
  for (const s of strategies) if (!getOptimizerDescriptor(s)) throw new Error(`unknown strategy "${s}"`);
  const pilotBudget = opts.pilotBudget ?? 900;
  const tradeoffBudget = opts.tradeoffBudget ?? 2000;
  const totalBudget = opts.totalBudget ?? 12000;
  if (totalBudget <= strategies.length * pilotBudget + tradeoffBudget) throw new Error("total budget must exceed pilots plus trade-off budget");
  // Population-based strategies need enough generations inside a pilot to
  // differentiate; size populations to the pilot budget unless overridden.
  const pilotPopulation = Math.max(10, Math.min(60, Math.floor(pilotBudget / 25)));
  const optimizerParams: Record<string, Record<string, number>> = {};
  for (const s of strategies) {
    const base: Record<string, number> = {};
    const desc = getOptimizerDescriptor(s)!;
    if (desc.params.some((p) => p.id === "populationSize") && s !== "cmaes") base.populationSize = pilotPopulation;
    if (desc.params.some((p) => p.id === "warmupEvaluations")) base.warmupEvaluations = Math.min(240, Math.floor(pilotBudget / 3));
    optimizerParams[s] = { ...base, ...(opts.optimizerParams?.[s] ?? {}) };
  }
  optimizerParams.nsga2 = { populationSize: pilotPopulation, ...(opts.optimizerParams?.nsga2 ?? {}) };
  return {
    id: opts.id ?? `lab-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`,
    label: opts.label ?? `${opts.problem.title} / autonomous search`,
    problem: opts.problem,
    seed: opts.seed,
    strategies,
    pilotBudget,
    totalBudget,
    tradeoffBudget,
    convergence: opts.convergence ?? { window: 25, minRelativeImprovement: 0.002 },
    optimizerParams,
  };
}

export interface PilotResult {
  strategy: string;
  label: string;
  record: ExperimentRecord;
  bestObjective: number;
  feasible: boolean;
  evaluations: number;
  wallTimeMs: number;
}

export interface LabAnalysis {
  variables: number;
  constraints: number;
  baselineMetrics: Record<string, number>;
  baselineBinding: { id: string; utilization: number }[];
  sensitivityGroups: { group: string; share: number }[];
  topVariables: { label: string; share: number }[];
}

export interface LabReport {
  solverEvaluations: number;
  surrogatePredictions: number;
  candidatesGenerated: number;
  strategiesCompared: number;
  chosenStrategy: string;
  chosenStrategyLabel: string;
  baselineMass_kg: number;
  bestMass_kg: number;
  improvementPercent: number;
  bestDesignId: string;
  mainGenerations: number;
  stopReason: "converged" | "budget";
  bindingConstraints: { id: string; utilization: number }[];
  topVariables: { label: string; share: number }[];
  paretoFrontSize: number;
  hypervolume: number | null;
  screening?: { precision: number; recall: number; falseFeasibleRate: number; falseInfeasibleRate: number; forceR2?: number; coverage95?: number };
  wallTimeMs: number;
}

export interface LabRecord {
  id: string;
  label: string;
  config: LabConfig;
  engineVersion: string;
  status: "running" | "completed" | "cancelled";
  startedAt: string;
  finishedAt?: string;
  analysis: LabAnalysis | null;
  pilots: PilotResult[];
  chosenStrategy: string;
  main: ExperimentRecord;
  tradeoff: ExperimentRecord | null;
  report: LabReport;
  wallTimeMs: number;
}

export type LabStage = "analysis" | "pilot" | "main" | "tradeoff" | "report";

export type LabEvent =
  | { type: "started"; record: LabRecord }
  | { type: "stage"; stage: LabStage; message: string }
  | { type: "pilot"; result: PilotResult }
  | { type: "generation"; stage: "main" | "tradeoff"; summary: GenerationSummary; totalEvaluations: number }
  | { type: "report"; record: LabRecord };

function now(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function objectiveOf(d: Design | null | undefined, objective: Objective): number {
  const v = d?.evaluation?.objectives[objective.id];
  return v === undefined ? Infinity : v;
}

/** Drive one experiment to completion inside the lab, forwarding generation events. */
function* runStage(
  config: ExperimentConfig,
  stage: "main" | "tradeoff",
  shouldStop?: (record: ExperimentRecord) => boolean
): Generator<LabEvent, ExperimentRecord, void> {
  const gen = runExperiment(config, shouldStop ? { shouldStop } : {});
  let step = gen.next();
  while (!step.done) {
    if (step.value.type === "generation") yield { type: "generation", stage, summary: step.value.summary, totalEvaluations: step.value.record.totalEvaluations };
    step = gen.next();
  }
  return step.value;
}

function runQuiet(config: ExperimentConfig): ExperimentRecord {
  const gen = runExperiment(config);
  let step = gen.next();
  while (!step.done) step = gen.next();
  return step.value;
}

export function* runLab(config: LabConfig): Generator<LabEvent, LabRecord, void> {
  const t0 = now();
  const problem = config.problem;
  const objective = problem.objectives[0];
  const compiled = compileProblem(problem);
  const emptyRecord = (): ExperimentRecord => ({
    id: `${config.id}-main`,
    label: "main",
    config: createExperimentConfig({ id: `${config.id}-main`, problem, seed: config.seed, optimizer: { id: config.strategies[0], params: {} }, budget: { maxEvaluations: 1 } }),
    status: "cancelled",
    startedAt: new Date().toISOString(),
    backendId: compiled.backendId,
    engineVersion: ENGINE_VERSION,
    baseline: { id: "baseline", generation: 0, parentIds: [], operator: "baseline", parameters: compiled.baseline.parameters },
    generations: [],
    best: null,
    totalEvaluations: 0,
    wallTimeMs: 0,
  });
  const record: LabRecord = {
    id: config.id,
    label: config.label,
    config,
    engineVersion: ENGINE_VERSION,
    status: "running",
    startedAt: new Date().toISOString(),
    analysis: null,
    pilots: [],
    chosenStrategy: "",
    main: emptyRecord(),
    tradeoff: null,
    report: {
      solverEvaluations: 0,
      surrogatePredictions: 0,
      candidatesGenerated: 0,
      strategiesCompared: 0,
      chosenStrategy: "",
      chosenStrategyLabel: "",
      baselineMass_kg: NaN,
      bestMass_kg: NaN,
      improvementPercent: NaN,
      bestDesignId: "",
      mainGenerations: 0,
      stopReason: "budget",
      bindingConstraints: [],
      topVariables: [],
      paretoFrontSize: 0,
      hypervolume: null,
      wallTimeMs: 0,
    },
    wallTimeMs: 0,
  };

  yield { type: "started", record };
  try {
    // Stage 1: analysis.
    yield { type: "stage", stage: "analysis", message: "Compiling the specification, sizing the conventional baseline, measuring sensitivity." };
    const baselineEval = compiled.evaluate(compiled.baseline.parameters);
    const sens = parameterSensitivity(compiled, compiled.baseline.parameters, objective.metric);
    record.analysis = {
      variables: compiled.space.dimension,
      constraints: problem.constraints.length,
      baselineMetrics: baselineEval.metrics,
      baselineBinding: bindingConstraints(baselineEval, 0.05).map((b) => ({ id: b.id, utilization: b.utilization })),
      sensitivityGroups: sens.groups,
      topVariables: sens.entries.slice(0, 5).map((e) => ({ label: e.label, share: e.share })),
    };

    // Stage 2: pilots on equal budgets and the same derived seed.
    yield { type: "stage", stage: "pilot", message: `Piloting ${config.strategies.length} strategies at ${config.pilotBudget} solver evaluations each.` };
    for (let i = 0; i < config.strategies.length; i++) {
      const strategy = config.strategies[i];
      const cfg = createExperimentConfig({ id: `${config.id}-pilot-${strategy}`, label: `pilot ${strategy}`, problem, seed: config.seed * 1000 + 17, optimizer: { id: strategy, params: config.optimizerParams[strategy] ?? {} }, budget: { maxEvaluations: config.pilotBudget } });
      const t = now();
      const rec = runQuiet(cfg);
      const result: PilotResult = {
        strategy,
        label: getOptimizerDescriptor(strategy)?.label ?? strategy,
        record: rec,
        bestObjective: objectiveOf(rec.best, objective),
        feasible: !!rec.best?.evaluation?.feasible,
        evaluations: rec.totalEvaluations,
        wallTimeMs: now() - t,
      };
      record.pilots.push(result);
      yield { type: "pilot", result };
    }
    const ranked = record.pilots.slice().sort((a, b) => {
      if (a.feasible !== b.feasible) return a.feasible ? -1 : 1;
      return objective.direction === "minimize" ? a.bestObjective - b.bestObjective : b.bestObjective - a.bestObjective;
    });
    record.chosenStrategy = ranked[0].strategy;

    // Stage 3: main run with convergence detection.
    const mainBudget = config.totalBudget - config.strategies.length * config.pilotBudget - config.tradeoffBudget;
    yield { type: "stage", stage: "main", message: `Running ${ranked[0].label} with up to ${mainBudget.toLocaleString()} evaluations; stopping on a plateau of ${config.convergence.window} generations.` };
    const bests: number[] = [];
    let stopReason: "converged" | "budget" = "budget";
    const mainCfg = createExperimentConfig({ id: `${config.id}-main`, label: `autonomous ${ranked[0].label}`, problem, seed: config.seed, optimizer: { id: record.chosenStrategy, params: config.optimizerParams[record.chosenStrategy] ?? {} }, budget: { maxEvaluations: mainBudget } });
    record.main = yield* runStage(mainCfg, "main", (rec) => {
      const last = rec.generations[rec.generations.length - 1];
      const v = last?.bestSoFar.evaluation?.feasible ? objectiveOf(last.bestSoFar, objective) : Infinity;
      bests.push(objective.direction === "minimize" ? v : -v);
      if (detectPlateau(bests, config.convergence)) {
        stopReason = "converged";
        return true;
      }
      return false;
    });

    // Stage 4: trade-off front (when the domain can express compliance).
    const complianceMetric = compiled.metrics.find((m) => m.id === "compliance_J");
    if (complianceMetric && problem.objectives.length === 1 && objective.metric === "mass_kg") {
      yield { type: "stage", stage: "tradeoff", message: `Mapping the mass-versus-compliance trade-off with NSGA-II (${config.tradeoffBudget.toLocaleString()} evaluations).` };
      const moProblem: EngineeringProblem = { ...problem, objectives: [objective, { id: "compliance", metric: "compliance_J", direction: "minimize", label: "Compliance" }] };
      const moCfg = createExperimentConfig({ id: `${config.id}-tradeoff`, label: "autonomous trade-off", problem: moProblem, seed: config.seed * 7 + 3, optimizer: { id: "nsga2", params: config.optimizerParams.nsga2 ?? {} }, budget: { maxEvaluations: config.tradeoffBudget } });
      record.tradeoff = yield* runStage(moCfg, "tradeoff");
    } else {
      yield { type: "stage", stage: "tradeoff", message: "Trade-off stage skipped: the problem does not expose a second objective." };
    }

    // Stage 5: report, every number from the records.
    yield { type: "stage", stage: "report", message: "Compiling the discovery report." };
    const best = record.main.best;
    const bestEval = best?.evaluation;
    const diag = record.main.optimizerDiagnostics as Record<string, unknown> | undefined;
    const funnel = diag?.funnel as { candidatesGenerated: number; surrogatePredictions: number } | undefined;
    const feas = diag?.feasibility as LabReport["screening"] | undefined;
    const forces = diag?.forces as { overallR2: number; coverage95: number } | undefined;
    const surrogatePredictions = funnel?.surrogatePredictions ?? (typeof diag?.predictedPairs === "number" ? (diag.predictedPairs as number) : 0);
    const lastTrade = record.tradeoff?.generations[record.tradeoff.generations.length - 1];
    const baselineMass = baselineEval.metrics.mass_kg;
    const bestMass = bestEval?.metrics.mass_kg ?? NaN;
    record.report = {
      solverEvaluations: record.pilots.reduce((s, p) => s + p.evaluations, 0) + record.main.totalEvaluations + (record.tradeoff?.totalEvaluations ?? 0),
      surrogatePredictions,
      candidatesGenerated: funnel?.candidatesGenerated ?? 0,
      strategiesCompared: record.pilots.length,
      chosenStrategy: record.chosenStrategy,
      chosenStrategyLabel: ranked[0].label,
      baselineMass_kg: baselineMass,
      bestMass_kg: bestMass,
      improvementPercent: (1 - bestMass / baselineMass) * 100,
      bestDesignId: best?.id ?? "",
      mainGenerations: record.main.generations.length,
      stopReason,
      bindingConstraints: bestEval ? bindingConstraints(bestEval, 0.05).map((b) => ({ id: b.id, utilization: b.utilization })) : [],
      topVariables: best ? parameterSensitivity(compiled, best.parameters, objective.metric).entries.slice(0, 5).map((e) => ({ label: e.label, share: e.share })) : [],
      paretoFrontSize: record.tradeoff?.paretoFront?.length ?? 0,
      hypervolume: lastTrade?.hypervolume ?? null,
      screening: feas ? { precision: feas.precision, recall: feas.recall, falseFeasibleRate: feas.falseFeasibleRate, falseInfeasibleRate: feas.falseInfeasibleRate, forceR2: forces?.overallR2, coverage95: forces?.coverage95 } : undefined,
      wallTimeMs: now() - t0,
    };
    record.status = "completed";
    yield { type: "report", record };
  } finally {
    if (record.status === "running") record.status = "cancelled";
    record.finishedAt = new Date().toISOString();
    record.wallTimeMs = now() - t0;
  }
  return record;
}

export function runLabToCompletion(config: LabConfig): LabRecord {
  const gen = runLab(config);
  let step = gen.next();
  while (!step.done) step = gen.next();
  return step.value;
}
