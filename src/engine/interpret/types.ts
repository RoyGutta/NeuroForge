import type { Confidence, EngineeringProblem, ValidationIssue } from "../core/problem";
import type { Ambiguity, CandidateSpec, Conflict, FieldProvenance } from "./spec";

export interface ExtractedValue {
  field: string;
  value: number | string;
  confidence: Confidence;
  /** The text fragment the value was read from. */
  sourceSpan?: string;
  note?: string;
  provenance?: FieldProvenance;
}

export type InterpreterKind = "rule" | "llm" | "hybrid";

/** Where a run stopped, so model uncertainty, missing information and deterministic rejection stay distinguishable. */
export type InterpretStage = "model" | "schema" | "normalization" | "validation" | "complete";

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
}

export interface InterpretDiagnostics {
  interpreter: string;
  kind: InterpreterKind;
  schemaVersion: string;
  stage: InterpretStage;
  model?: string;
  promptVersion?: string;
  effort?: string;
  latencyMs?: number;
  usage?: TokenUsage;
  /** Estimated from the public price table; null when the model is not in it. */
  costUsd?: number | null;
  requestId?: string;
  /** The model's output before normalisation, kept for reproducibility. */
  rawOutput?: string;
  notes: string[];
}

export type InterpretFailureKind = "unsupported-domain" | "model-error" | "schema-error" | "validation-failed";

export type InterpretResult =
  | {
      supported: true;
      problem: EngineeringProblem;
      extracted: ExtractedValue[];
      warnings: string[];
      spec: CandidateSpec;
      ambiguities: Ambiguity[];
      unsupportedElements: string[];
      conflicts: Conflict[];
      validation: ValidationIssue[];
      diagnostics: InterpretDiagnostics;
    }
  | {
      supported: false;
      kind: InterpretFailureKind;
      reason: string;
      detectedDomain: string | null;
      spec?: CandidateSpec;
      /** Present when a problem was built but rejected by validation, so it can still be inspected and corrected. */
      problem?: EngineeringProblem;
      validation?: ValidationIssue[];
      diagnostics: InterpretDiagnostics;
    };

/**
 * Turns a natural-language brief into an `EngineeringProblem`. Implementations
 * must record themselves in `problem.provenance.interpreter` and must never
 * fabricate a value silently: anything not in the brief becomes an assumption.
 * Rule-based interpreters answer synchronously; model-backed ones return a
 * promise. Callers `await` either.
 */
export interface ProblemInterpreter {
  id: string;
  label: string;
  kind: InterpreterKind;
  interpret(brief: string): InterpretResult | Promise<InterpretResult>;
}
