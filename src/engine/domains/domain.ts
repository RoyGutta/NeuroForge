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

export interface CompiledProblem<TArtifact = unknown> {
  problem: EngineeringProblem;
  space: DesignSpace;
  metrics: MetricDescriptor[];
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
