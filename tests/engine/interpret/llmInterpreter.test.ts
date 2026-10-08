import { describe, expect, test } from "vitest";
import { pointLoadMagnitude_N } from "../../../src/engine/core/problem";
import { compileProblem, validateProblem } from "../../../src/engine/domains/registry";
import { createLLMInterpreter, type BriefGenerator } from "../../../src/engine/interpret/llm/llmInterpreter";
import { LLMProviderError, type StructuredResponse } from "../../../src/engine/interpret/llm/provider";
import { parseLLMOutput, type LLMOutput } from "../../../src/engine/interpret/llm/schema";
import { candidateFromLLMOutput } from "../../../src/engine/interpret/llm/candidate";

const usage = { inputTokens: 900, outputTokens: 120 };
const response = (json: unknown, extra: Partial<StructuredResponse> = {}): StructuredResponse => ({ json, raw: JSON.stringify(json), model: "claude-opus-5", stopReason: "end_turn", usage, latencyMs: 12, ...extra });
const gen = (fn: (brief: string) => StructuredResponse | Promise<StructuredResponse>): BriefGenerator => ({ id: "fake", model: "claude-opus-5", effort: "medium", generate: async (b) => fn(b) });

const base = (over: Partial<LLMOutput>): LLMOutput => ({ domain: "structural", domain_reasoning: "truss bridge", unsupported_domain: "", fields: [], material: { id: "unspecified", evidence: "" }, objective: { metric: "mass_kg", provenance: "inferred", evidence: "minimize weight" }, missing: [], ambiguities: [], unsupported_elements: [], confidence: "high", notes: "", ...over });

describe("model-backed interpreter: the model reports, the engine decides", () => {
  test("imperial units are normalised deterministically and the problem passes real validation", async () => {
    const out = base({ fields: [{ id: "span_m", value: 10, unit: "ft", provenance: "explicit", evidence: "10 ft" }, { id: "load_N", value: 200, unit: "lbf", provenance: "explicit", evidence: "200 lbf" }], missing: ["safetyFactor"] });
    const r = await createLLMInterpreter(gen(() => response(out))).interpret("A 10 ft truss bridge carrying 200 lbf at the centre; minimize weight.");
    expect(r.supported).toBe(true);
    if (!r.supported) return;
    expect(r.problem.geometry.kind === "truss-bridge" ? r.problem.geometry.span_m : NaN).toBeCloseTo(3.048, 12);
    expect(pointLoadMagnitude_N(r.problem)).toBeCloseTo(889.64432305, 6);
    expect(validateProblem(r.problem)).toEqual([]);
    expect(r.problem.provenance).toMatchObject({ interpreter: "llm-v1", model: "claude-opus-5", promptVersion: "1.0.0" });
    expect(r.problem.assumptions.map((a) => a.field)).toContain("safetyFactor");
    expect(r.problem.assumptions.map((a) => a.field)).toContain("material");
    expect(r.spec.missing).toEqual(expect.arrayContaining(["safetyFactor", "materialId"]));
    expect(r.diagnostics).toMatchObject({ kind: "llm", stage: "complete", model: "claude-opus-5", promptVersion: "1.0.0", effort: "medium", usage, costUsd: (900 * 5 + 120 * 25) / 1e6 });
    expect(r.extracted.find((e) => e.field === "span_m")).toMatchObject({ provenance: "explicit", sourceSpan: "10 ft", note: expect.stringContaining("0.3048") });
    const compiled = compileProblem(r.problem);
    expect(Number.isFinite(compiled.evaluate(compiled.baseline.parameters).metrics.mass_kg)).toBe(true);
  });

  test("a load written as a mass is converted with g and the note says so", async () => {
    const out = base({ fields: [{ id: "span_m", value: 3, unit: "m", provenance: "explicit", evidence: "3 m" }, { id: "load_N", value: 50, unit: "kg", provenance: "explicit", evidence: "50 kg" }] });
    const r = await createLLMInterpreter(gen(() => response(out))).interpret("Bridge with a 3 m span holding 50 kg");
    expect(r.supported && pointLoadMagnitude_N(r.problem)).toBeCloseTo(50 * 9.80665, 6);
    expect(r.supported && r.extracted.find((e) => e.field === "load_N")?.note).toMatch(/9.80665/);
  });

  test("an unknown unit is discarded, reported, and the value becomes an assumption rather than a guess", async () => {
    const out = base({ fields: [{ id: "span_m", value: 2, unit: "cubits", provenance: "explicit", evidence: "2 cubits" }, { id: "load_N", value: 500, unit: "N", provenance: "explicit", evidence: "500 N" }] });
    const r = await createLLMInterpreter(gen(() => response(out))).interpret("A 2 cubit bridge carrying 500 N");
    expect(r.supported).toBe(true);
    if (!r.supported) return;
    expect(r.diagnostics.stage).toBe("normalization");
    expect(r.diagnostics.notes[0]).toMatch(/cubits/);
    expect(r.warnings.join(" ")).toMatch(/cubits/);
    expect(r.problem.assumptions.find((a) => a.field === "span")).toBeDefined();
    expect(r.spec.missing).toContain("span_m");
  });

  test("the domain validator is authoritative over the model: an inconsistent thermal spec is rejected, not repaired", async () => {
    const out = base({ domain: "thermal", fields: [{ id: "power_W", value: 40, unit: "W", provenance: "explicit", evidence: "40 W" }, { id: "maxTemperature_C", value: 20, unit: "C", provenance: "explicit", evidence: "20 C" }, { id: "ambient_C", value: 25, unit: "C", provenance: "explicit", evidence: "25 C" }] });
    const r = await createLLMInterpreter(gen(() => response(out))).interpret("40 W below 20 C in 25 C air");
    expect(r.supported).toBe(false);
    if (r.supported) return;
    expect(r.kind).toBe("validation-failed");
    expect(r.diagnostics.stage).toBe("validation");
    expect(r.validation?.[0].message).toMatch(/ambient/);
  });

  test("a negative safety factor from the model is a validation failure with the field named", async () => {
    const out = base({ fields: [{ id: "span_m", value: 2, unit: "m", provenance: "explicit", evidence: "2 m" }, { id: "safetyFactor", value: 0.5, unit: "", provenance: "explicit", evidence: "0.5" }] });
    const r = await createLLMInterpreter(gen(() => response(out))).interpret("2 m bridge, SF 0.5");
    expect(r.supported).toBe(false);
    if (r.supported) return;
    expect(r.kind).toBe("validation-failed");
    expect(r.validation).toEqual([{ path: "safetyFactor", message: "safety factor must be >= 1" }]);
  });

  test("unsupported domains are declined with the model's family name", async () => {
    const out = base({ domain: "unsupported", unsupported_domain: "electronics", domain_reasoning: "a power converter", objective: { metric: "unspecified", provenance: "inferred", evidence: "" } });
    const r = await createLLMInterpreter(gen(() => response(out))).interpret("Design a 12 V buck converter");
    expect(r).toMatchObject({ supported: false, kind: "unsupported-domain", detectedDomain: "electronics" });
    expect(!r.supported && r.reason).toMatch(/electronics/);
  });

  test("ambiguities and unsupported elements are carried through with normalised candidates", async () => {
    const out = base({ fields: [{ id: "span_m", value: 2, unit: "m", provenance: "explicit", evidence: "2 m" }, { id: "load_N", value: 500, unit: "N", provenance: "explicit", evidence: "500 N" }], ambiguities: [{ field: "load_N", candidates: [{ value: 500, unit: "N" }, { value: 0.8, unit: "kN" }], description: "two loads are mentioned" }], unsupported_elements: ["lateral wind load"] });
    const r = await createLLMInterpreter(gen(() => response(out))).interpret("2 m, 500 N or 0.8 kN, wind");
    expect(r.supported && r.ambiguities).toEqual([{ field: "load_N", candidates: [500, 800], description: "two loads are mentioned" }]);
    expect(r.supported && r.unsupportedElements).toEqual(["lateral wind load"]);
  });

  test("an unspecified objective becomes the family default, marked assumed", async () => {
    const out = base({ domain: "robotics", fields: [{ id: "payload_kg", value: 2, unit: "kg", provenance: "explicit", evidence: "2 kg" }, { id: "reach_m", value: 800, unit: "mm", provenance: "explicit", evidence: "800 mm" }], objective: { metric: "unspecified", provenance: "inferred", evidence: "" } });
    const r = await createLLMInterpreter(gen(() => response(out))).interpret("arm 2 kg 800 mm");
    expect(r.supported && r.problem.objectives[0].metric).toBe("peakTorque_Nm");
    expect(r.supported && r.spec.fields.find((f) => f.id === "objective")).toMatchObject({ provenance: "assumed", confidence: "low" });
    expect(r.supported && r.extracted.map((e) => e.field)).not.toContain("objective");
  });

  test("model failures are attributed to the model stage: transport error, refusal, truncation, no JSON", async () => {
    const brief = "2 m bridge, 500 N";
    const err = await createLLMInterpreter(gen(() => { throw new LLMProviderError("rate limited", "rate-limit", 429); })).interpret(brief);
    expect(err).toMatchObject({ supported: false, kind: "model-error", diagnostics: { stage: "model", notes: ["rate-limit"] } });
    const refusal = await createLLMInterpreter(gen(() => response(null, { stopReason: "refusal", refusal: { category: null, explanation: "declined" } }))).interpret(brief);
    expect(refusal).toMatchObject({ supported: false, kind: "model-error", reason: expect.stringContaining("declined") });
    const truncated = await createLLMInterpreter(gen(() => response(null, { stopReason: "max_tokens" }))).interpret(brief);
    expect(truncated).toMatchObject({ supported: false, kind: "model-error", reason: expect.stringContaining("cut off") });
    const noJson = await createLLMInterpreter(gen(() => response(null, { raw: "not json" }))).interpret(brief);
    expect(noJson).toMatchObject({ supported: false, kind: "schema-error", diagnostics: { stage: "schema" } });
  });

  test("malformed outputs are schema errors with every violation listed", async () => {
    const bad = { domain: "bridge", fields: [{ id: "span", value: "2", unit: 3 }], material: {}, objective: { metric: "mass" }, missing: ["x"], ambiguities: "none", unsupported_elements: [1], confidence: "sure" };
    const r = await createLLMInterpreter(gen(() => response(bad))).interpret("2 m bridge");
    expect(r.supported).toBe(false);
    if (r.supported) return;
    expect(r.kind).toBe("schema-error");
    expect(r.diagnostics.notes.length).toBeGreaterThanOrEqual(10);
    expect(parseLLMOutput("text")).toEqual({ ok: false, errors: ["output is not an object"] });
  });

  test("fields from another family and duplicates are ignored with a warning", () => {
    const { spec } = candidateFromLLMOutput(base({ domain: "thermal", fields: [{ id: "span_m", value: 2, unit: "m", provenance: "explicit", evidence: "" }, { id: "power_W", value: 40, unit: "W", provenance: "explicit", evidence: "40 W" }, { id: "power_W", value: 50, unit: "W", provenance: "explicit", evidence: "50 W" }] }));
    expect(spec.fields.filter((f) => f.id === "power_W").map((f) => f.value)).toEqual([40]);
    expect(spec.fields.map((f) => f.id)).not.toContain("span_m");
    expect(spec.warnings.length).toBe(2);
    expect(spec.missing).toEqual(expect.arrayContaining(["maxTemperature_C", "materialId"]));
  });
});
