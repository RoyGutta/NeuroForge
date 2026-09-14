import { ruleBasedInterpreter } from "./ruleBased";
import type { InterpretResult, ProblemInterpreter } from "./types";

export type { ExtractedValue, InterpretResult, ProblemInterpreter } from "./types";
export { ruleBasedInterpreter };

const INTERPRETERS: ProblemInterpreter[] = [ruleBasedInterpreter];

export function listInterpreters(): ProblemInterpreter[] {
  return INTERPRETERS.slice();
}

/** Interpret with the default (currently only) interpreter. */
export function interpretBrief(brief: string): InterpretResult {
  return ruleBasedInterpreter.interpret(brief);
}
