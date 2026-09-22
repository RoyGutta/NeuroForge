/**
 * Message protocol between the UI and the experiment worker. Everything
 * crossing the boundary is structured-clone-safe JSON.
 */
import type { ExperimentConfig, ExperimentRecord, GenerationSummary } from "../engine/experiments/experiment";
import type { MemberStudy, MemberStudyOptions, StudyOptions, SurrogateStudy } from "../engine/ml/study";

export type WorkerRequest =
  | { type: "start"; config: ExperimentConfig }
  | { type: "cancel" }
  | { type: "surrogateStudy"; config: ExperimentConfig; options: StudyOptions }
  | { type: "memberStudy"; config: ExperimentConfig; options: MemberStudyOptions };

export type WorkerResponse =
  | { type: "started"; record: ExperimentRecord }
  | { type: "generation"; summary: GenerationSummary; totalEvaluations: number; wallTimeMs: number }
  | { type: "finished"; record: ExperimentRecord }
  | { type: "study"; study: SurrogateStudy }
  | { type: "memberStudy"; study: MemberStudy }
  | { type: "error"; message: string };
