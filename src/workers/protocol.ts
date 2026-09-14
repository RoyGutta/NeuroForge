/**
 * Message protocol between the UI and the experiment worker. Everything
 * crossing the boundary is structured-clone-safe JSON.
 */
import type { ExperimentConfig, ExperimentRecord, GenerationSummary } from "../engine/experiments/experiment";

export type WorkerRequest =
  | { type: "start"; config: ExperimentConfig }
  | { type: "cancel" };

export type WorkerResponse =
  | { type: "started"; record: ExperimentRecord }
  | { type: "generation"; summary: GenerationSummary; totalEvaluations: number; wallTimeMs: number }
  | { type: "finished"; record: ExperimentRecord }
  | { type: "error"; message: string };
