import { describe, expect, test } from "vitest";
import { validateProblem } from "../../../src/engine/domains/registry";
import { interpretBrief, ruleBasedInterpreter } from "../../../src/engine/interpret";

describe("rule-based brief interpreter", () => {
  test("extracts span, load and objective from the canonical bridge brief", () => {
    const r = interpretBrief("Design a lightweight bridge spanning 2 meters that supports 500 N.");
    expect(r.supported).toBe(true);
    if (!r.supported) return;
    expect(r.problem.geometry.span_m).toBe(2);
    expect(r.problem.loads[0].magnitude_N).toBe(500);
    expect(r.problem.objectives[0].metric).toBe("mass_kg");
    expect(r.problem.provenance.source).toBe("interpreter");
    expect(r.problem.provenance.sourceText).toContain("bridge");
    expect(validateProblem(r.problem)).toEqual([]);
    expect(r.extracted.find((e) => e.field === "span_m")?.confidence).toBe("high");
  });

  test("understands unit variants: mm, cm, kN, kg and 'safety factor of'", () => {
    const r = interpretBrief(
      "A 1500 mm steel truss bridge must carry a 2 kN load with a safety factor of 1.5, minimising mass."
    );
    expect(r.supported).toBe(true);
    if (!r.supported) return;
    expect(r.problem.geometry.span_m).toBeCloseTo(1.5, 12);
    expect(r.problem.loads[0].magnitude_N).toBeCloseTo(2000, 9);
    expect(r.problem.safetyFactor).toBe(1.5);
    expect(r.problem.material.id).toBe("steel-a36");
    expect(r.problem.assumptions.map((a) => a.field)).not.toContain("safetyFactor");
    expect(r.problem.assumptions.map((a) => a.field)).not.toContain("material");
  });

  test("converts a mass load to newtons and says so", () => {
    const r = interpretBrief("Bridge with a 3 m span holding 50 kg");
    expect(r.supported).toBe(true);
    if (!r.supported) return;
    expect(r.problem.loads[0].magnitude_N).toBeCloseTo(50 * 9.80665, 6);
    expect(r.extracted.find((e) => e.field === "load_N")?.note).toMatch(/kg/i);
  });

  test("falls back to defaults with low-confidence assumptions when values are missing", () => {
    const r = interpretBrief("Design a lightweight bridge.");
    expect(r.supported).toBe(true);
    if (!r.supported) return;
    const fields = r.problem.assumptions.map((a) => a.field);
    expect(fields).toContain("span");
    expect(fields).toContain("load");
    expect(r.problem.assumptions.find((a) => a.field === "span")?.confidence).toBe("low");
  });

  test("reports unsupported domains honestly instead of guessing", () => {
    const r = interpretBrief("Design a heatsink that keeps a 100 W processor below 80 C.");
    expect(r.supported).toBe(false);
    if (r.supported) return;
    expect(r.reason).toMatch(/thermal|heat/i);
    expect(r.detectedDomain).toBe("thermal");
  });

  test("picks 'minimize displacement' when the brief asks for stiffness", () => {
    const r = interpretBrief("2 m bridge carrying 500 N; make it as stiff as possible.");
    expect(r.supported).toBe(true);
    if (!r.supported) return;
    expect(r.problem.objectives[0].metric).toBe("compliance_J");
  });

  test("the interpreter identifies itself so provenance is traceable", () => {
    expect(ruleBasedInterpreter.id).toMatch(/rule/);
    const r = interpretBrief("2 m bridge, 500 N");
    if (r.supported) expect(r.problem.provenance.interpreter).toBe(ruleBasedInterpreter.id);
  });
});
