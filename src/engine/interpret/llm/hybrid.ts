/**
 * Hybrid interpreter: the model reads the brief, the deterministic layer
 * normalises it, the rule-based extractor reads the same brief
 * independently, and every disagreement is surfaced as a conflict rather
 * than resolved silently. Where both agree the value is confirmed; where
 * only one found a value it is used and marked; where they disagree the
 * rule-based value is kept, the confidence is lowered and the conflict is
 * listed with both readings so the user decides.
 */
import { realizeSpec } from "../realize";
import { extractRuleSpec, RULE_INTERPRETER_ID } from "../ruleBased";
import { SPEC_SCHEMA_VERSION, specField, type CandidateSpec, type Conflict, type SpecField } from "../spec";
import type { InterpretResult, ProblemInterpreter } from "../types";
import { PROMPT_VERSION } from "./prompt";

export const HYBRID_INTERPRETER_ID = "hybrid-v1";
const REL_TOL = 1e-6;

const same = (a: number | string, b: number | string) => (typeof a === "number" && typeof b === "number" ? Math.abs(a - b) <= REL_TOL * Math.max(1, Math.abs(a), Math.abs(b)) : a === b);

/** Merges a model-derived specification with the rule-based reading of the same brief. */
export function mergeSpecs(llm: CandidateSpec, rule: CandidateSpec, llmId: string): CandidateSpec {
  const ruleFellThrough = rule.warnings.some((w) => w.startsWith("No structural keywords"));
  const conflicts: Conflict[] = [];
  // Domain: the rule-based fallback to a bridge without keywords is weak evidence; otherwise a disagreement is a conflict.
  let domain = llm.domain;
  let detected = llm.detectedDomain;
  let unsupportedReason = llm.unsupportedReason;
  if (rule.domain !== llm.domain && !ruleFellThrough) {
    conflicts.push({ field: "domain", values: [{ source: llmId, value: llm.domain ?? `unsupported (${llm.detectedDomain ?? "none"})` }, { source: RULE_INTERPRETER_ID, value: rule.domain ?? `unsupported (${rule.detectedDomain ?? "none"})` }], resolution: rule.domain ? "The rule-based family is used; review the brief wording." : "The rule-based interpreter declined the brief by keyword; it is declined." });
    domain = rule.domain;
    detected = rule.detectedDomain;
    unsupportedReason = rule.unsupportedReason;
  }
  const merged: CandidateSpec = { ...llm, domain, detectedDomain: detected, fields: [], missing: [], conflicts, warnings: [...llm.warnings], ambiguities: llm.ambiguities.map((a) => ({ ...a })) };
  if (unsupportedReason) merged.unsupportedReason = unsupportedReason;
  if (domain === null) return merged;
  const fields: SpecField[] = [];
  const ids = new Set<SpecField["id"]>([...llm.fields.map((f) => f.id), ...rule.fields.map((f) => f.id)]);
  for (const id of ids) {
    const a = specField(llm, id);
    const b = rule.domain === domain ? specField(rule, id) : undefined;
    if (a && b) {
      if (same(a.value, b.value)) fields.push({ ...a, note: a.note ?? b.note, confidence: "high" });
      else if (a.provenance === "inferred" || b.provenance === "inferred") fields.push(id === "objective" && a.provenance === "explicit" ? a : b);
      else {
        conflicts.push({ field: id, values: [{ source: llmId, value: a.value, evidence: a.sourceSpan }, { source: RULE_INTERPRETER_ID, value: b.value, evidence: b.sourceSpan }], resolution: "The rule-based value is used with low confidence; confirm it in the specification." });
        fields.push({ ...b, confidence: "low", note: `Conflict: the model read ${String(a.value)}${a.rawUnit ? ` (${a.rawValue} ${a.rawUnit})` : ""}.` });
      }
    } else if (a) fields.push({ ...a, note: a.note ?? (a.provenance === "explicit" ? "Found by the model only; the rule-based extractor did not read this value." : undefined) });
    else if (b) fields.push({ ...b, note: b.note ?? "Found by the rule-based extractor only; the model did not report this value." });
  }
  merged.fields = fields;
  const stated = new Set(fields.map((f) => f.id));
  merged.missing = [...new Set([...llm.missing, ...(rule.domain === domain ? rule.missing : [])])].filter((m) => !stated.has(m));
  return merged;
}

export function createHybridInterpreter(llm: ProblemInterpreter, opts: { id?: string; label?: string } = {}): ProblemInterpreter {
  const id = opts.id ?? HYBRID_INTERPRETER_ID;
  return {
    id,
    label: opts.label ?? "Hybrid interpreter (model, normalised, cross-checked by rules)",
    kind: "hybrid",
    async interpret(brief: string): Promise<InterpretResult> {
      const text = brief.trim();
      const r = await llm.interpret(text);
      const diagnostics = { ...r.diagnostics, interpreter: id, kind: "hybrid" as const, schemaVersion: r.diagnostics.schemaVersion || SPEC_SCHEMA_VERSION };
      if (!r.supported && r.spec === undefined) return { ...r, diagnostics };
      const llmSpec = r.supported ? r.spec : r.spec!;
      const merged = mergeSpecs(llmSpec, extractRuleSpec(text), llm.id);
      return realizeSpec(merged, text, { interpreterId: id, model: r.diagnostics.model, promptVersion: PROMPT_VERSION, diagnostics });
    },
  };
}
