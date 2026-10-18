/**
 * Model-backed interpreter. The model only reports what the brief says; the
 * schema validator, the unit normaliser, the realize step and the domain
 * validator decide everything else. A failure is attributed to the stage
 * that produced it: model (transport, refusal, truncation), schema (output
 * off contract), normalization (a unit the engine does not know),
 * validation (the engine rejects the specification).
 */
import { realizeSpec } from "../realize";
import { SPEC_SCHEMA_VERSION } from "../spec";
import type { InterpretDiagnostics, InterpretResult, ProblemInterpreter } from "../types";
import { candidateFromLLMOutput } from "./candidate";
import type { BriefGenerator } from "./generator";
import { PROMPT_VERSION } from "./prompt";
import { estimateCostUsd, LLMProviderError, type StructuredResponse } from "./provider";
import { LLM_SCHEMA_VERSION, parseLLMOutput } from "./schema";

export { generatorFromProvider, type BriefGenerator } from "./generator";

export const LLM_INTERPRETER_ID = "llm-v1";

export function createLLMInterpreter(gen: BriefGenerator, opts: { id?: string; label?: string } = {}): ProblemInterpreter {
  const id = opts.id ?? LLM_INTERPRETER_ID;
  return {
    id,
    label: opts.label ?? `LLM interpreter (${gen.model})`,
    kind: "llm",
    async interpret(brief: string): Promise<InterpretResult> {
      const text = brief.trim();
      const t0 = Date.now();
      const base: InterpretDiagnostics = { interpreter: id, kind: "llm", schemaVersion: `${SPEC_SCHEMA_VERSION}/llm-${LLM_SCHEMA_VERSION}`, stage: "model", model: gen.model, promptVersion: PROMPT_VERSION, ...(gen.effort ? { effort: gen.effort } : {}), notes: [] };
      let res: StructuredResponse;
      try {
        res = await gen.generate(text);
      } catch (e) {
        const err = e instanceof LLMProviderError ? e : new LLMProviderError(e instanceof Error ? e.message : String(e), "api");
        return { supported: false, kind: "model-error", reason: `The model call failed (${err.kind}): ${err.message}`, detectedDomain: null, diagnostics: { ...base, latencyMs: Date.now() - t0, notes: [err.kind] } };
      }
      const diag: InterpretDiagnostics = { ...base, latencyMs: res.latencyMs, usage: res.usage, costUsd: estimateCostUsd(res.model, res.usage), model: res.model, rawOutput: res.raw, ...(res.requestId ? { requestId: res.requestId } : {}) };
      if (res.stopReason === "refusal") return { supported: false, kind: "model-error", reason: `The model declined the request${res.refusal?.explanation ? `: ${res.refusal.explanation}` : "."}`, detectedDomain: null, diagnostics: { ...diag, notes: ["refusal", ...(res.refusal?.category ? [res.refusal.category] : [])] } };
      if (res.stopReason === "max_tokens") return { supported: false, kind: "model-error", reason: "The model's output was cut off before it was complete.", detectedDomain: null, diagnostics: { ...diag, notes: ["max_tokens"] } };
      if (res.json === null || res.json === undefined) return { supported: false, kind: "schema-error", reason: "The model returned no parseable JSON.", detectedDomain: null, diagnostics: { ...diag, stage: "schema", notes: ["no-json"] } };
      const parsed = parseLLMOutput(res.json);
      if (!parsed.ok) return { supported: false, kind: "schema-error", reason: `The model's output does not satisfy the schema: ${parsed.errors.join("; ")}.`, detectedDomain: null, diagnostics: { ...diag, stage: "schema", notes: parsed.errors } };
      const { spec, normalizationErrors } = candidateFromLLMOutput(parsed.output);
      const notes = normalizationErrors.map((n) => `normalization: ${n.field}: ${n.error}`);
      const result = realizeSpec(spec, text, { interpreterId: id, model: res.model, promptVersion: PROMPT_VERSION, diagnostics: { ...diag, stage: normalizationErrors.length > 0 ? "normalization" : "complete", notes } });
      if (result.supported && normalizationErrors.length > 0) result.diagnostics.stage = "normalization";
      return result;
    },
  };
}
