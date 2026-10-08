import { pointLoadMagnitude_N } from "../../../src/engine/core/problem";
import { describe, expect, test } from "vitest";
import { validateProblem } from "../../../src/engine/domains/registry";
import { interpretBrief, ruleBasedInterpreter } from "../../../src/engine/interpret";

describe("rule-based brief interpreter", () => {
  test("extracts span, load and objective from the canonical bridge brief", () => {
    const r = interpretBrief("Design a lightweight bridge spanning 2 meters that supports 500 N.");
    expect(r.supported).toBe(true);
    if (!r.supported) return;
    expect(r.problem.geometry.kind === "truss-bridge" ? r.problem.geometry.span_m : NaN).toBe(2);
    expect(pointLoadMagnitude_N(r.problem)).toBe(500);
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
    expect(r.problem.geometry.kind === "truss-bridge" ? r.problem.geometry.span_m : NaN).toBeCloseTo(1.5, 12);
    expect(pointLoadMagnitude_N(r.problem)).toBeCloseTo(2000, 9);
    expect(r.problem.safetyFactor).toBe(1.5);
    expect(r.problem.material.id).toBe("steel-a36");
    expect(r.problem.assumptions.map((a) => a.field)).not.toContain("safetyFactor");
    expect(r.problem.assumptions.map((a) => a.field)).not.toContain("material");
  });

  test("converts a mass load to newtons and says so", () => {
    const r = interpretBrief("Bridge with a 3 m span holding 50 kg");
    expect(r.supported).toBe(true);
    if (!r.supported) return;
    expect(pointLoadMagnitude_N(r.problem)).toBeCloseTo(50 * 9.80665, 6);
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
    const r = interpretBrief("Design a drone frame that minimizes mass while maintaining a safety factor of 2.");
    expect(r.supported).toBe(false);
    if (r.supported) return;
    expect(r.reason).toMatch(/aerospace/i);
    expect(r.detectedDomain).toBe("aerospace");
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

  test("interprets a manipulator brief as a robotics problem", () => {
    const r = interpretBrief("Design a robot arm that lifts a 2 kg payload anywhere within a 0.8 m reach with minimum motor torque.");
    expect(r.supported).toBe(true);
    if (!r.supported) return;
    expect(r.problem.domain).toBe("robotics");
    expect(r.problem.geometry.kind).toBe("planar-manipulator");
    if (r.problem.geometry.kind !== "planar-manipulator") return;
    expect(r.problem.geometry.reach_m).toBeCloseTo(0.8, 9);
    expect(pointLoadMagnitude_N(r.problem)).toBeCloseTo(2 * 9.80665, 6);
    expect(r.problem.objectives[0].metric).toBe("peakTorque_Nm");
    expect(r.extracted.map((e) => e.field)).toEqual(expect.arrayContaining(["payload_kg", "reach_m"]));
    expect(validateProblem(r.problem)).toEqual([]);
    expect(r.problem.provenance.interpreter).toBe(ruleBasedInterpreter.id);
  });

  test("a robotics brief without numbers records payload and reach as low-confidence assumptions", () => {
    const r = interpretBrief("Design a lightweight aluminium manipulator arm.");
    expect(r.supported).toBe(true);
    if (!r.supported) return;
    expect(r.problem.domain).toBe("robotics");
    expect(r.problem.objectives[0].metric).toBe("mass_kg");
    expect(r.problem.material.id).toBe("aluminum-6061-t6");
    expect(r.problem.assumptions.find((a) => a.field === "payload")?.confidence).toBe("low");
    expect(r.problem.assumptions.find((a) => a.field === "reach")?.confidence).toBe("low");
  });

  test("interprets a heat-sink brief as a thermal problem with power, temperature limit and ambient", () => {
    const r = interpretBrief("Design a heatsink that keeps a 40 W processor below 80 C with ambient air at 30 C.");
    expect(r.supported).toBe(true);
    if (!r.supported) return;
    expect(r.problem.domain).toBe("thermal");
    expect(r.problem.geometry.kind).toBe("fin-array");
    expect(r.problem.loads[0].kind === "heat" && r.problem.loads[0].power_W).toBe(40);
    expect(r.problem.constraints.find((c) => c.id === "temperature")?.limit).toBe(80);
    expect(r.problem.geometry.kind === "fin-array" && r.problem.geometry.ambient_C).toBe(30);
    expect(r.extracted.map((e) => e.field)).toEqual(expect.arrayContaining(["power_W", "maxTemperature_C", "ambient_C"]));
    expect(validateProblem(r.problem)).toEqual([]);
  });

  test("a 100 W brief is accepted and left to the engine to judge; missing values become assumptions", () => {
    const r = interpretBrief("Design a heatsink that keeps a 100 W processor below 80°C.");
    expect(r.supported).toBe(true);
    if (!r.supported) return;
    expect(r.problem.loads[0].kind === "heat" && r.problem.loads[0].power_W).toBe(100);
    expect(r.problem.assumptions.find((a) => a.field === "ambient")?.confidence).toBe("medium");
    const bare = interpretBrief("Design a lightweight heatsink.");
    expect(bare.supported && bare.problem.assumptions.some((a) => a.field === "power" && a.confidence === "low")).toBe(true);
  });

  test("a brief that asks for a 3D or spatial truss routes to the space-truss domain", () => {
    const r = interpretBrief("Design a lightweight 3D space truss spanning 3 meters that carries 2 kN at midspan.");
    expect(r.supported).toBe(true);
    if (!r.supported) return;
    expect(r.problem.domain).toBe("structural3d");
    expect(r.problem.geometry.kind).toBe("space-truss");
    expect(r.problem.geometry.kind === "space-truss" && r.problem.geometry.span_m).toBe(3);
    expect(pointLoadMagnitude_N(r.problem)).toBe(2000);
    expect(validateProblem(r.problem)).toEqual([]);
    const flat = interpretBrief("Design a lightweight bridge spanning 2 meters that supports 500 N.");
    expect(flat.supported && flat.problem.domain).toBe("structural");
  });
});
