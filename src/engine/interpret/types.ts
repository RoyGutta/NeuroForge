import type { Confidence, EngineeringProblem } from "../core/problem";

export interface ExtractedValue {
  field: string;
  value: number | string;
  confidence: Confidence;
  /** The text fragment the value was read from. */
  sourceSpan?: string;
  note?: string;
}

export type InterpretResult =
  | {
      supported: true;
      problem: EngineeringProblem;
      extracted: ExtractedValue[];
      warnings: string[];
    }
  | {
      supported: false;
      reason: string;
      detectedDomain: string | null;
    };

/**
 * Turns a natural-language brief into an `EngineeringProblem`. Implementations
 * must record themselves in `problem.provenance.interpreter` and must never
 * fabricate a value silently: anything not in the brief becomes an assumption.
 */
export interface ProblemInterpreter {
  id: string;
  label: string;
  interpret(brief: string): InterpretResult;
}
