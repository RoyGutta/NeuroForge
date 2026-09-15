/**
 * Experiment records: everything needed to reproduce and re-render a run.
 */
import type { Design } from "../core/design";
import type { EngineeringProblem } from "../core/problem";

export interface OptimizerSelection {
  id: string;
  params: Record<string, number>;
}

export interface ExperimentBudget {
  maxEvaluations: number;
  maxGenerations?: number;
}

export interface ExperimentConfig {
  id: string;
  label: string;
  problem: EngineeringProblem;
  seed: number;
  optimizer: OptimizerSelection;
  budget: ExperimentBudget;
  /** Start the search from the domain baseline as well as random designs. */
  seedBaseline: boolean;
}

export interface GenerationSummary {
  generation: number;
  /** Evaluations performed in this generation. */
  evaluations: number;
  /** Cumulative evaluations after this generation. */
  cumulativeEvaluations: number;
  feasibleCount: number;
  /** Best objective among this generation's designs, or null if none feasible. */
  bestObjective: number | null;
  meanFeasibleObjective: number | null;
  /** Snapshot of the best design found so far (for history scrubbing). */
  bestSoFar: Design;
  elapsedMs: number;
}

export type ExperimentStatus = "running" | "completed" | "cancelled" | "failed";

export interface ExperimentRecord {
  id: string;
  label: string;
  config: ExperimentConfig;
  status: ExperimentStatus;
  startedAt: string;
  finishedAt?: string;
  backendId: string;
  engineVersion: string;
  baseline: Design;
  generations: GenerationSummary[];
  best: Design | null;
  totalEvaluations: number;
  wallTimeMs: number;
  error?: string;
  /** Algorithm-specific diagnostics, e.g. online surrogate accuracy. */
  optimizerDiagnostics?: Record<string, unknown>;
}

export interface ExperimentSummary {
  id: string;
  label: string;
  problemTitle: string;
  optimizerId: string;
  status: ExperimentStatus;
  startedAt: string;
  totalEvaluations: number;
  bestObjective: number | null;
  baselineObjective: number | null;
}

export function summarize(r: ExperimentRecord): ExperimentSummary {
  const objectiveId = r.config.problem.objectives[0]?.id;
  return {
    id: r.id,
    label: r.label,
    problemTitle: r.config.problem.title,
    optimizerId: r.config.optimizer.id,
    status: r.status,
    startedAt: r.startedAt,
    totalEvaluations: r.totalEvaluations,
    bestObjective: r.best?.evaluation?.objectives[objectiveId] ?? null,
    baselineObjective: r.baseline.evaluation?.objectives[objectiveId] ?? null,
  };
}
