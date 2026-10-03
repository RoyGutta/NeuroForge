/**
 * Autonomous engineering lab: a staged, measured search.
 *
 *   analysis   -> compile, size the baseline, sensitivity, binding constraints
 *   pilot      -> each strategy on an equal solver budget, one or more
 *                 derived seeds; strategies ranked by median best objective
 *   main       -> the winning strategy, run until the best-so-far plateaus
 *                 or the remaining budget is spent
 *   tradeoff   -> NSGA-II on the objective against a second metric the domain
 *                 exposes (compliance when minimising mass, otherwise mass)
 *   robustness -> the discovered design perturbed within a tolerance and
 *                 re-evaluated by the solver
 *   report     -> every number computed from the stage records; an
 *                 uncertainty taxonomy and a lab-report style discovery note
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
import { robustnessStudy, type RobustnessResult } from "../robustness/robustness";
import type { RobustSpec } from "../robustness/robustProblem";
import { buildUncertaintyReport, type UncertaintyReport } from "../uncertainty/taxonomy";
import { ENGINE_VERSION } from "../version";
import { detectPlateau, type PlateauOptions } from "./convergence";
import { buildDiscoveryReport, type DiscoveryReport } from "./report";

export interface LabConfig {
  id: string;
  label: string;
  problem: EngineeringProblem;
  seed: number;
  strategies: string[];
  /** Seeds per strategy in the pilot stage; strategies are ranked by median. */
  pilotSeeds: number;
  pilotBudget: number;
  totalBudget: number;
  tradeoffBudget: number;
  /** Tolerance study of the discovered design; null skips the stage. */
  robustness: { tolerance: number; samples: number } | null;
  /** Optimise every stage in robust mode (perturbed copies inside each evaluation). */
  robust?: RobustSpec;
  convergence: PlateauOptions;
  optimizerParams: Record<string, Record<string, number>>;
}

export interface CreateLabOptions {
  id?: string;
  label?: string;
  problem: EngineeringProblem;
  seed: number;
  strategies?: string[];
  pilotSeeds?: number;
  pilotBudget?: number;
  totalBudget?: number;
  tradeoffBudget?: number;
  robustness?: { tolerance: number; samples: number } | null;
  robust?: RobustSpec;
  convergence?: PlateauOptions;
  optimizerParams?: Record<string, Record<string, number>>;
}

export function createLabConfig(opts: CreateLabOptions): LabConfig {
  const strategies = opts.strategies ?? ["evolutionary", "surrogate-evolutionary", "member-surrogate-evolutionary"];
  for (const s of strategies) if (!getOptimizerDescriptor(s)) throw new Error(`unknown strategy "${s}"`);
  const pilotSeeds = Math.max(1, Math.floor(opts.pilotSeeds ?? 1));
  const pilotBudget = opts.pilotBudget ?? 900;
  const tradeoffBudget = opts.tradeoffBudget ?? 2000;
  const totalBudget = opts.totalBudget ?? 12000;
  const robustness = opts.robustness === undefined ? { tolerance: 0.02, samples: 200 } : opts.robustness;
  if (robustness && (!(robustness.samples > 0) || !(robustness.tolerance >= 0))) throw new Error("robustness needs positive samples and a non-negative tolerance");
  if (totalBudget <= strategies.length * pilotSeeds * pilotBudget + tradeoffBudget + (robustness?.samples ?? 0)) throw new Error("total budget must exceed pilots, trade-off and robustness budgets");
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
    pilotSeeds,
    pilotBudget,
    totalBudget,
    tradeoffBudget,
    robustness,
    ...(opts.robust ? { robust: { ...opts.robust } } : {}),
    convergence: opts.convergence ?? { window: 25, minRelativeImprovement: 0.002 },
    optimizerParams,
  };
}

export interface PilotResult {
  strategy: string;
  label: string;
  seed: number;
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

export interface StrategyRanking {
  strategy: string;
  label: string;
  seeds: number;
  feasibleSeeds: number;
  /** Median best objective over the feasible pilot seeds (Infinity when none). */
  medianObjective: number;
  bestObjective: number;
  worstObjective: number;
}

export interface LabReport {
  solverEvaluations: number;
  surrogatePredictions: number;
  candidatesGenerated: number;
  strategiesCompared: number;
  chosenStrategy: string;
  chosenStrategyLabel: string;
  objectiveMetric: string;
  baselineObjective: number;
  bestObjective: number;
  baselineMass_kg: number;
  bestMass_kg: number;
  /** Relative improvement of the objective in its favourable direction. */
  improvementPercent: number;
  bestDesignId: string;
  mainGenerations: number;
  stopReason: "converged" | "budget";
  bindingConstraints: { id: string; utilization: number }[];
  topVariables: { label: string; share: number }[];
  paretoFrontSize: number;
  hypervolume: number | null;
  screening?: { precision: number; recall: number; falseFeasibleRate: number; falseInfeasibleRate: number; forceR2?: number; coverage95?: number };
  pilotSeeds: number;
  robustness?: { tolerance: number; samples: number; feasibleFraction: number; objectiveMedian: number; objectiveQ95: number; worstConstraint: string | null };
  uncertainty: UncertaintyReport;
  discovery: DiscoveryReport;
  wallTimeMs: number;
}

export interface LabRecord {
  id: string;
  label: string;
  config: LabConfig;
  engineVersion: string;
  backendId: string;
  baselineLabel: string;
  /** Unit of every metric the domain exposes, for the report. */
  metricUnits: Record<string, string>;
  status: "running" | "completed" | "cancelled";
  startedAt: string;
  finishedAt?: string;
  analysis: LabAnalysis | null;
  pilots: PilotResult[];
  ranking: StrategyRanking[];
  chosenStrategy: string;
  main: ExperimentRecord;
  tradeoff: ExperimentRecord | null;
  robustness: RobustnessResult | null;
  report: LabReport;
  wallTimeMs: number;
}

export type LabStage = "analysis" | "pilot" | "main" | "tradeoff" | "robustness" | "report";

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
    backendId: compiled.backendId,
    baselineLabel: compiled.baseline.label,
    metricUnits: Object.fromEntries(compiled.metrics.map((m) => [m.id, m.unit])),
    status: "running",
    startedAt: new Date().toISOString(),
    analysis: null,
    pilots: [],
    ranking: [],
    chosenStrategy: "",
    main: emptyRecord(),
    tradeoff: null,
    robustness: null,
    report: {
      solverEvaluations: 0,
      surrogatePredictions: 0,
      candidatesGenerated: 0,
      strategiesCompared: 0,
      chosenStrategy: "",
      chosenStrategyLabel: "",
      objectiveMetric: objective.metric,
      baselineObjective: NaN,
      bestObjective: NaN,
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
      pilotSeeds: config.pilotSeeds,
      uncertainty: { entries: [], quantified: 0, documented: 0, notModelled: 0 },
      discovery: { title: "", question: "", method: [], results: [], uncertainty: [], limitations: [], reproducibility: [], conclusion: "" },
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

    // Stage 2: pilots on equal budgets; the same derived seeds for every strategy.
    yield { type: "stage", stage: "pilot", message: `Piloting ${config.strategies.length} strategies at ${config.pilotBudget} solver evaluations each on ${config.pilotSeeds} seed${config.pilotSeeds === 1 ? "" : "s"}.` };
    for (let k = 0; k < config.pilotSeeds; k++) {
      const seed = config.seed * 1000 + 17 + k * 101;
      for (const strategy of config.strategies) {
        const cfg = createExperimentConfig({ id: `${config.id}-pilot-${strategy}-${k}`, label: `pilot ${strategy} seed ${seed}`, problem, seed, optimizer: { id: strategy, params: config.optimizerParams[strategy] ?? {} }, budget: { maxEvaluations: config.pilotBudget }, robust: config.robust });
        const t = now();
        const rec = runQuiet(cfg);
        const result: PilotResult = {
          strategy,
          label: getOptimizerDescriptor(strategy)?.label ?? strategy,
          seed,
          record: rec,
          bestObjective: objectiveOf(rec.best, objective),
          feasible: !!rec.best?.evaluation?.feasible,
          evaluations: rec.totalEvaluations,
          wallTimeMs: now() - t,
        };
        record.pilots.push(result);
        yield { type: "pilot", result };
      }
    }
    record.ranking = rankStrategies(record.pilots, config.strategies, objective);
    const ranked = record.ranking;
    record.chosenStrategy = ranked[0].strategy;

    // Stage 3: main run with convergence detection.
    const mainBudget = config.totalBudget - config.strategies.length * config.pilotSeeds * config.pilotBudget - config.tradeoffBudget - (config.robustness?.samples ?? 0);
    yield { type: "stage", stage: "main", message: `Running ${ranked[0].label} with up to ${mainBudget.toLocaleString()} evaluations; stopping on a plateau of ${config.convergence.window} generations.` };
    const bests: number[] = [];
    let stopReason: "converged" | "budget" = "budget";
    const mainCfg = createExperimentConfig({ id: `${config.id}-main`, label: `autonomous ${ranked[0].label}`, problem, seed: config.seed, optimizer: { id: record.chosenStrategy, params: config.optimizerParams[record.chosenStrategy] ?? {} }, budget: { maxEvaluations: mainBudget }, robust: config.robust });
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

    // Stage 4: trade-off front against a second metric the domain exposes.
    const secondId = objective.metric === "mass_kg" ? "compliance_J" : "mass_kg";
    const second = compiled.metrics.find((m) => m.id === secondId);
    if (second && problem.objectives.length === 1) {
      yield { type: "stage", stage: "tradeoff", message: `Mapping the ${objective.label.toLowerCase()}-versus-${second.label.toLowerCase()} trade-off with NSGA-II (${config.tradeoffBudget.toLocaleString()} evaluations).` };
      const moProblem: EngineeringProblem = { ...problem, objectives: [objective, { id: second.id, metric: second.id, direction: "minimize", label: second.label }] };
      const moCfg = createExperimentConfig({ id: `${config.id}-tradeoff`, label: "autonomous trade-off", problem: moProblem, seed: config.seed * 7 + 3, optimizer: { id: "nsga2", params: config.optimizerParams.nsga2 ?? {} }, budget: { maxEvaluations: config.tradeoffBudget }, robust: config.robust });
      record.tradeoff = yield* runStage(moCfg, "tradeoff");
    } else {
      yield { type: "stage", stage: "tradeoff", message: "Trade-off stage skipped: the problem does not expose a second objective." };
    }

    // Stage 5: robustness of the discovered design, through the solver.
    const best = record.main.best;
    const bestEval = best?.evaluation;
    if (config.robustness && best) {
      yield { type: "stage", stage: "robustness", message: `Perturbing the discovered design within +/- ${(config.robustness.tolerance * 100).toFixed(1)} % (${config.robustness.samples} solver evaluations).` };
      record.robustness = robustnessStudy(compiled, best.parameters, { samples: config.robustness.samples, seed: config.seed * 13 + 5, tolerance: config.robustness.tolerance });
    } else {
      yield { type: "stage", stage: "robustness", message: config.robustness ? "Robustness stage skipped: no design to perturb." : "Robustness stage skipped by configuration." };
    }

    // Stage 6: report, every number from the records.
    yield { type: "stage", stage: "report", message: "Compiling the discovery report." };
    const diag = record.main.optimizerDiagnostics as Record<string, unknown> | undefined;
    const funnel = diag?.funnel as { candidatesGenerated: number; surrogatePredictions: number } | undefined;
    const feas = diag?.feasibility as LabReport["screening"] | undefined;
    const forces = diag?.forces as { overallR2: number; coverage95: number } | undefined;
    const surrogatePredictions = funnel?.surrogatePredictions ?? (typeof diag?.predictedPairs === "number" ? (diag.predictedPairs as number) : 0);
    const lastTrade = record.tradeoff?.generations[record.tradeoff.generations.length - 1];
    const baselineObjective = baselineEval.objectives[objective.id];
    const bestObjective = bestEval?.objectives[objective.id] ?? NaN;
    const improvementPercent = objective.direction === "minimize" ? (1 - bestObjective / baselineObjective) * 100 : (bestObjective / baselineObjective - 1) * 100;
    const rb = record.robustness;
    const worstConstraint = rb ? rb.constraints.slice().sort((a, b) => b.violationProbability - a.violationProbability || b.maxUtilization - a.maxUtilization)[0] : null;
    const screening = feas ? { precision: feas.precision, recall: feas.recall, falseFeasibleRate: feas.falseFeasibleRate, falseInfeasibleRate: feas.falseInfeasibleRate, forceR2: forces?.overallR2, coverage95: forces?.coverage95 } : undefined;
    record.report = {
      solverEvaluations: record.pilots.reduce((s, p) => s + p.evaluations, 0) + record.main.totalEvaluations + (record.tradeoff?.totalEvaluations ?? 0) + (rb?.evaluations ?? 0),
      surrogatePredictions,
      candidatesGenerated: funnel?.candidatesGenerated ?? 0,
      strategiesCompared: record.pilots.length,
      chosenStrategy: record.chosenStrategy,
      chosenStrategyLabel: ranked[0].label,
      objectiveMetric: objective.metric,
      baselineObjective,
      bestObjective,
      baselineMass_kg: baselineEval.metrics.mass_kg,
      bestMass_kg: bestEval?.metrics.mass_kg ?? NaN,
      improvementPercent,
      bestDesignId: best?.id ?? "",
      mainGenerations: record.main.generations.length,
      stopReason,
      bindingConstraints: bestEval ? bindingConstraints(bestEval, 0.05).map((b) => ({ id: b.id, utilization: b.utilization })) : [],
      topVariables: best ? parameterSensitivity(compiled, best.parameters, objective.metric).entries.slice(0, 5).map((e) => ({ label: e.label, share: e.share })) : [],
      paretoFrontSize: record.tradeoff?.paretoFront?.length ?? 0,
      hypervolume: lastTrade?.hypervolume ?? null,
      screening,
      pilotSeeds: config.pilotSeeds,
      robustness: rb ? { tolerance: rb.tolerance, samples: rb.samples, feasibleFraction: rb.feasibleFraction, objectiveMedian: rb.objective.median, objectiveQ95: rb.objective.q95, worstConstraint: worstConstraint?.id ?? null } : undefined,
      uncertainty: buildUncertaintyReport({ problem, evaluation: bestEval, robustness: rb ?? undefined, screening, pilots: record.pilots.map((p) => ({ strategy: p.strategy, seed: p.seed, bestObjective: p.bestObjective, feasible: p.feasible })), chosenStrategy: record.chosenStrategy }),
      discovery: { title: "", question: "", method: [], results: [], uncertainty: [], limitations: [], reproducibility: [], conclusion: "" },
      wallTimeMs: now() - t0,
    };
    record.report.discovery = buildDiscoveryReport(record);
    record.status = "completed";
    yield { type: "report", record };
  } finally {
    if (record.status === "running") record.status = "cancelled";
    record.finishedAt = new Date().toISOString();
    record.wallTimeMs = now() - t0;
  }
  return record;
}

/** Rank strategies by the median best objective over their feasible pilot seeds; infeasible-only strategies last. */
export function rankStrategies(pilots: PilotResult[], strategies: string[], objective: Objective): StrategyRanking[] {
  const sign = objective.direction === "minimize" ? 1 : -1;
  const rows = strategies.map((strategy) => {
    const mine = pilots.filter((p) => p.strategy === strategy);
    const feasible = mine.filter((p) => p.feasible && Number.isFinite(p.bestObjective)).map((p) => p.bestObjective).sort((a, b) => sign * (a - b));
    const med = feasible.length ? feasible[Math.floor((feasible.length - 1) / 2)] : Infinity;
    return {
      strategy,
      label: mine[0]?.label ?? getOptimizerDescriptor(strategy)?.label ?? strategy,
      seeds: mine.length,
      feasibleSeeds: feasible.length,
      medianObjective: med,
      bestObjective: feasible.length ? feasible[0] : Infinity,
      worstObjective: feasible.length ? feasible[feasible.length - 1] : Infinity,
    };
  });
  return rows.sort((a, b) => {
    if (a.feasibleSeeds === 0 || b.feasibleSeeds === 0) return b.feasibleSeeds - a.feasibleSeeds;
    return sign * (a.medianObjective - b.medianObjective);
  });
}

export function runLabToCompletion(config: LabConfig): LabRecord {
  const gen = runLab(config);
  let step = gen.next();
  while (!step.done) step = gen.next();
  return step.value;
}
