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
  /** The response surrogates learn first (member forces, joint torques, thermal state). */
  primaryResponseId: string;
  /** A displacement-field response with an exact linear map to the primary response, when the domain has one. */
  displacementResponseId?: string;
  /** Union of metric ids that `derive` can compute from some response. */
  derivableMetrics: string[];
  /** Metric ids derivable from one specific response alone. */
  derivableFrom(responseId: string): string[];
  derive(params: number[], responses: Record<string, number[]>): Record<string, number>;
  /** Per-component utilisation for each derivable constraint metric, keyed by metric id. */
  componentUtilizations(params: number[], responses: Record<string, number[]>): Record<string, number[]>;
  /** Global DOF index of each free displacement component, when a displacement response exists. */
  freeDofs?: number[];
  /** Exact linear map from the free displacement field to member forces: forces = matrix . u. */
  forcesFromDisplacements?(params: number[], displacements: number[]): { forces: number[]; matrix: number[][] };
  /**
   * Conservative metrics from a displacement field with per-component
   * standard deviations: forces shifted by k times their propagated std,
   * deflection and compliance shifted in the unfavourable direction.
   */
  conservativeFromDisplacements?(params: number[], mean: number[], std: number[], k: number): Record<string, number>;
}

/** How a domain wants its learning results presented; owned by the domain, read by the interface. */
export interface DomainPresentation {
  /** Scalar surrogate targets the learning panel studies by default. */
  learningTargets: string[];
  /** Label of component `i` of the primary response. */
  componentLabel(i: number): string;
  /** Noun for the primary response's components ("member", "component"). */
  componentNoun: string;
  responseLearning: {
    heading: string;
    description: string;
    representations: { value: "forces" | "displacements" | "both"; label: string }[];
  };
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
  /** Metric the autonomous lab trades the objective against (e.g. compliance for a mass objective). */
  tradeoffMetric?: string;
  presentation?: DomainPresentation;
}

export interface EngineeringDomain<TArtifact = unknown> {
  id: DomainId;
  label: string;
  metrics: MetricDescriptor[];
  validate(problem: EngineeringProblem): ValidationIssue[];
  compile(problem: EngineeringProblem): CompiledProblem<TArtifact>;
}
