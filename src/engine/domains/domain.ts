/**
 * Contract every engineering domain module implements.
 *
 * A domain knows how to validate a problem in its area, compile it into a
 * design space plus an evaluator, describe the metrics it computes, and
 * provide a baseline design for comparison. Everything above this layer
 * (optimisers, experiments, surrogates, UI) is domain-agnostic.
 */
import type { Evaluation } from "../core/design";
import type {
  DomainId,
  EngineeringProblem,
  MetricDescriptor,
  ValidationIssue,
} from "../core/problem";
import type { DesignSpace } from "../core/space";

export interface BaselineDesign {
  label: string;
  description: string;
  parameters: number[];
}

/** A vector-valued response the evaluator exposes (e.g. one axial force per member). */
export interface ResponseDescriptor {
  id: string;
  label: string;
  unit: string;
  size: number;
}

/**
 * Exact physics after prediction: derives scalar metrics from responses using
 * the domain's own equations, so a surrogate only has to learn the responses.
 */
export interface ResponseModel {
  responseIds: string[];
  /** Metric ids that `derive` can compute from responses alone. */
  derivableMetrics: string[];
  derive(params: number[], responses: Record<string, number[]>): Record<string, number>;
  /** Per-component utilisation for each derivable constraint metric, keyed by metric id. */
  componentUtilizations(params: number[], responses: Record<string, number[]>): Record<string, number[]>;
}

export interface CompiledProblem<TArtifact = unknown> {
  problem: EngineeringProblem;
  space: DesignSpace;
  metrics: MetricDescriptor[];
  /** Vector responses the evaluator attaches to evaluations. */
  responses: ResponseDescriptor[];
  /** Present when the domain can derive metrics exactly from responses. */
  responseModel?: ResponseModel;
  baseline: BaselineDesign;
  /** Deterministic evaluation of one parameter vector. */
  evaluate(params: number[]): Evaluation;
  /** Domain-specific model for visualisation (e.g. a TrussModel). */
  artifact(params: number[]): TArtifact;
  backendId: string;
}

export interface EngineeringDomain<TArtifact = unknown> {
  id: DomainId;
  label: string;
  metrics: MetricDescriptor[];
  validate(problem: EngineeringProblem): ValidationIssue[];
  compile(problem: EngineeringProblem): CompiledProblem<TArtifact>;
}
