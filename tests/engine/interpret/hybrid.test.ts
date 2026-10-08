import { describe, expect, test } from "vitest";
import { pointLoadMagnitude_N } from "../../../src/engine/core/problem";
import { createHybridInterpreter } from "../../../src/engine/interpret/llm/hybrid";
import { createLLMInterpreter, type BriefGenerator } from "../../../src/engine/interpret/llm/llmInterpreter";
import type { StructuredResponse } from "../../../src/engine/interpret/llm/provider";
import type { LLMOutput } from "../../../src/engine/interpret/llm/schema";

const gen = (out: LLMOutput): BriefGenerator => ({ id: "fake", model: "claude-opus-5", generate: async (): Promise<StructuredResponse> => ({ json: out, raw: JSON.stringify(out), model: "claude-opus-5", stopReason: "end_turn", usage: { inputTokens: 1, outputTokens: 1 }, latencyMs: 1 }) });
const base = (over: Partial<LLMOutput>): LLMOutput => ({ domain: "structural", domain_reasoning: "", unsupported_domain: "", fields: [], material: { id: "unspecified", evidence: "" }, objective: { metric: "mass_kg", provenance: "inferred", evidence: "" }, missing: [], ambiguities: [], unsupported_elements: [], confidence: "high", notes: "", ...over });
const hybrid = (out: LLMOutput) => createHybridInterpreter(createLLMInterpreter(gen(out)));

describe("hybrid interpreter surfaces conflicts instead of choosing silently", () => {
  test("agreement confirms the value; a model-only value is kept with a note", async () => {
    const out = base({ fields: [{ id: "span_m", value: 2, unit: "m", provenance: "explicit", evidence: "2 m" }, { id: "load_N", value: 500, unit: "N", provenance: "explicit", evidence: "500 N" }, { id: "deflectionRatio", value: 400, unit: "", provenance: "explicit", evidence: "L over 400" }] });
    const r = await hybrid(out).interpret("A 2 m bridge carrying 500 N with a deflection limit of L over 400");
    expect(r.supported).toBe(true);
    if (!r.supported) return;
    expect(r.conflicts).toEqual([]);
    expect(r.spec.fields.find((f) => f.id === "deflectionRatio")?.note).toMatch(/model only/);
    expect(r.problem.constraints.find((c) => c.id === "deflection")?.limit).toBeCloseTo(2 / 400, 12);
    expect(r.diagnostics.kind).toBe("hybrid");
    expect(r.problem.provenance.interpreter).toBe("hybrid-v1");
  });

  test("a disagreement on an explicit value is listed with both readings and the rule-based value is kept at low confidence", async () => {
    const out = base({ fields: [{ id: "span_m", value: 2.5, unit: "m", provenance: "explicit", evidence: "2500 mm" }, { id: "load_N", value: 500, unit: "N", provenance: "explicit", evidence: "500 N" }] });
    const r = await hybrid(out).interpret("A 2 m span bridge carrying 500 N; note that the drawing says 2500 mm.");
    expect(r.supported).toBe(true);
    if (!r.supported) return;
    expect(r.conflicts).toHaveLength(1);
    expect(r.conflicts[0]).toMatchObject({ field: "span_m", values: [{ source: "llm-v1", value: 2.5 }, { source: "rule-based-v1", value: 2 }] });
    expect(r.problem.geometry.kind === "truss-bridge" && r.problem.geometry.span_m).toBe(2);
    expect(r.spec.fields.find((f) => f.id === "span_m")).toMatchObject({ confidence: "low" });
    expect(pointLoadMagnitude_N(r.problem)).toBe(500);
  });

  test("a rule-only value fills what the model missed", async () => {
    const out = base({ fields: [{ id: "span_m", value: 2, unit: "m", provenance: "explicit", evidence: "2 m" }], missing: ["load_N"] });
    const r = await hybrid(out).interpret("A 2 m bridge carrying 500 N");
    expect(r.supported && pointLoadMagnitude_N(r.problem)).toBe(500);
    expect(r.supported && r.spec.fields.find((f) => f.id === "load_N")?.note).toMatch(/rule-based extractor only/);
    expect(r.supported && r.spec.missing).not.toContain("load_N");
  });

  test("the model's decline wins over the rule-based keyword fallback, and a keyword decline wins over the model", async () => {
    const poem = await hybrid(base({ domain: "unsupported", unsupported_domain: "none", domain_reasoning: "prose" })).interpret("Write a poem about bridges.");
    expect(poem).toMatchObject({ supported: false, kind: "unsupported-domain", detectedDomain: "none" });
    const wing = await hybrid(base({ fields: [{ id: "span_m", value: 2, unit: "m", provenance: "explicit", evidence: "2 m" }] })).interpret("Optimise the wing spar of a small UAV spanning 2 m for a 300 N lift load.");
    expect(wing).toMatchObject({ supported: false, kind: "unsupported-domain", detectedDomain: "aerospace" });
    expect(!wing.supported && wing.spec?.conflicts[0].field).toBe("domain");
  });
});
