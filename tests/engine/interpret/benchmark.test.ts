import { describe, expect, test } from "vitest";
import dataset from "../../../benchmarks/interpreter/briefs-v1.0.0.json";
import { compileProblem } from "../../../src/engine/domains/registry";
import { interpretBrief } from "../../../src/engine/interpret";
import { aggregateScores, loadDataset, referenceProblem, scoreEntry, validateDataset, type BenchmarkEntry } from "../../../src/engine/interpret/benchmark";
import type { InterpretResult } from "../../../src/engine/interpret";

const ds = loadDataset(dataset);

describe("interpreter benchmark dataset v1.0.0", () => {
  test("is well formed: unique ids, known domains and categories, SI references, consistent missing lists", () => {
    expect(validateDataset(dataset)).toEqual([]);
    expect(ds.version).toBe("1.0.0");
    expect(ds.entries.length).toBeGreaterThanOrEqual(50);
    for (const d of ["structural", "structural3d", "robotics", "thermal", "unsupported"]) expect(ds.entries.some((e) => e.domain === d)).toBe(true);
    for (const c of Object.keys(ds.categories)) expect(ds.entries.some((e) => e.category === c)).toBe(true);
  });

  test("rejects malformed datasets", () => {
    expect(validateDataset({ version: "1", entries: [] })).toContain("version must be semantic");
    const bad = { version: "1.0.0", entries: [{ id: "a", domain: "thermal", category: "basic", brief: "a long enough brief", expected: { fields: { span_m: 2 }, missing: ["span_m"] } }, { id: "a", domain: "x", category: "y", brief: "short", expected: {} }] };
    const errors = validateDataset(bad);
    expect(errors.join("\n")).toMatch(/span_m is not a numeric thermal field/);
    expect(errors.join("\n")).toMatch(/duplicate id/);
    expect(errors.join("\n")).toMatch(/unknown domain x/);
    expect(errors.join("\n")).toMatch(/objective required/);
  });

  test("every reference reading realises into a valid problem", () => {
    for (const e of ds.entries) {
      if (e.domain === "unsupported") continue;
      const p = referenceProblem(e);
      expect(p, e.id).not.toBeNull();
      expect(p!.domain).toBe(e.domain);
    }
  });

  test("entries marked infeasible are decided by the engine: their baseline violates a constraint; sized baselines of the others are feasible", () => {
    for (const e of ds.entries) {
      if (e.domain === "unsupported") continue;
      const p = referenceProblem(e)!;
      const c = compileProblem(p);
      const feasible = c.evaluate(c.baseline.parameters).feasible;
      if (e.expected.infeasible) expect(feasible, `${e.id} baseline feasible=${feasible}`).toBe(false);
      // The compliance baseline is deliberately heavy and is not a feasibility witness under a mass budget.
      else if (e.expected.objective !== "compliance_J") expect(feasible, `${e.id} baseline feasible=${feasible}`).toBe(true);
    }
  });
});

describe("scoring", () => {
  const byId = (id: string) => ds.entries.find((e) => e.id === id)! as BenchmarkEntry;

  test("the rule-based reference scores perfectly on the canonical brief and semantically equivalent", () => {
    const s = scoreEntry(byId("s-basic-1"), interpretBrief(byId("s-basic-1").brief));
    expect(s).toMatchObject({ domainCorrect: true, fieldAccuracy: 1, missingDetected: 1, objectiveCorrect: true, validationPassed: true, semanticallyEquivalent: true, failures: [] });
  });

  test("a unit slip is classified as a unit-conversion failure, a different number as a value failure, an absent one as missing", () => {
    const e = byId("s-units-1");
    const ok = interpretBrief(e.brief);
    if (!ok.supported) throw new Error("unexpected");
    const withSlip: InterpretResult = { ...ok, spec: { ...ok.spec, fields: ok.spec.fields.map((f) => (f.id === "span_m" ? { ...f, value: 1500 } : f)) } };
    expect(scoreEntry(e, withSlip).failures).toContain("wrong-unit-conversion");
    const withWrong: InterpretResult = { ...ok, spec: { ...ok.spec, fields: ok.spec.fields.map((f) => (f.id === "load_N" ? { ...f, value: 2300 } : f)) } };
    expect(scoreEntry(e, withWrong).failures).toContain("wrong-numeric-value");
    const withMissing: InterpretResult = { ...ok, spec: { ...ok.spec, fields: ok.spec.fields.filter((f) => f.id !== "safetyFactor") } };
    expect(scoreEntry(e, withMissing).failures).toContain("missing-constraint");
  });

  test("unsupported-domain misses, false declines and ignored ambiguities are named", () => {
    const poem = scoreEntry(byId("u-text-1"), interpretBrief(byId("u-text-1").brief));
    expect(poem.failures).toContain("unsupported-domain-miss");
    expect(poem.domainCorrect).toBe(false);
    const drone = scoreEntry(byId("u-aero-1"), interpretBrief(byId("u-aero-1").brief));
    expect(drone).toMatchObject({ domainCorrect: true, failures: [] });
    const amb = scoreEntry(byId("s-ambig-1"), interpretBrief(byId("s-ambig-1").brief));
    expect(amb.ambiguityDetected).toBe(false);
    expect(amb.failures).toContain("ambiguity-ignored");
    const e = byId("s-basic-1");
    const declined: InterpretResult = { supported: false, kind: "unsupported-domain", reason: "no", detectedDomain: "aerospace", diagnostics: { interpreter: "x", kind: "llm", schemaVersion: "", stage: "complete", notes: [] } };
    expect(scoreEntry(e, declined).failures).toContain("false-decline");
  });

  test("an invented value for a field the brief does not state is an invented assumption", () => {
    const e = byId("s-missing-1");
    const r = interpretBrief(e.brief);
    if (!r.supported) throw new Error("unexpected");
    const invented: InterpretResult = { ...r, spec: { ...r.spec, fields: [...r.spec.fields, { id: "span_m", value: 2, provenance: "explicit", confidence: "high" }] } };
    expect(scoreEntry(e, invented).failures).toContain("invented-assumption");
    expect(scoreEntry(e, r).missingDetected).toBe(1);
  });

  test("aggregation reports rates per dimension and failure counts", () => {
    const scores = ds.entries.map((e) => scoreEntry(e as BenchmarkEntry, interpretBrief(e.brief)));
    const m = aggregateScores(scores);
    expect(m.entries).toBe(ds.entries.length);
    expect(m.schemaValidity.value).toBe(1);
    expect(m.domainClassification.n).toBe(ds.entries.length);
    expect(m.unsupportedDetection.n).toBe(ds.entries.filter((e) => e.domain === "unsupported").length);
    expect(m.costUsd.total).toBe(0);
    expect(Object.values(m.failures).reduce((a, b) => a + (b ?? 0), 0)).toBeGreaterThan(0);
    expect(m.byCategory.units.entries).toBeGreaterThan(0);
  });
});
