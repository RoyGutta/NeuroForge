import { ruleBasedInterpreter } from "./ruleBased";
import type { InterpretResult, ProblemInterpreter } from "./types";

export type { ExtractedValue, InterpretDiagnostics, InterpretFailureKind, InterpretResult, InterpretStage, InterpreterKind, ProblemInterpreter, TokenUsage } from "./types";
export type { Ambiguity, CandidateSpec, Conflict, FieldProvenance, ObjectiveMetric, SpecField, SpecFieldId } from "./spec";
export { SPEC_SCHEMA_VERSION } from "./spec";
export { ruleBasedInterpreter, extractRuleSpec, RULE_INTERPRETER_ID } from "./ruleBased";
export { realizeSpec, checkSpec } from "./realize";

const INTERPRETERS: ProblemInterpreter[] = [ruleBasedInterpreter];

export function listInterpreters(): ProblemInterpreter[] {
  return INTERPRETERS.slice();
}

/** Interpret with the deterministic reference interpreter (synchronous, offline). */
export function interpretBrief(brief: string): InterpretResult {
  return ruleBasedInterpreter.interpret(brief) as InterpretResult;
}
