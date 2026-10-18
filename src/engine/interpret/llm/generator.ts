/**
 * A brief generator turns a brief into a structured model response: a
 * provider behind the versioned prompt, or a remote endpoint. Kept apart from
 * the interpreter so the server function loads only the prompt, schema and
 * provider contract, not the engine. Relative imports in the server's module
 * graph carry explicit `.js` extensions because Vercel compiles functions
 * file by file as native ES modules.
 */
import { buildInterpreterRequest } from "./prompt.js";
import type { LLMProvider, StructuredRequest, StructuredResponse } from "./provider";

export interface BriefGenerator {
  id: string;
  model: string;
  effort?: string;
  generate(brief: string): Promise<StructuredResponse>;
}

export function generatorFromProvider(provider: LLMProvider, opts: { effort?: StructuredRequest["effort"]; maxTokens?: number; timeoutMs?: number } = {}): BriefGenerator {
  return {
    id: provider.id,
    model: provider.model,
    effort: opts.effort,
    generate: (brief) => provider.generateStructured(buildInterpreterRequest(brief, opts)),
  };
}
