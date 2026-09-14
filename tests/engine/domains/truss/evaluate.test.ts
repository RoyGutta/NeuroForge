import { describe, expect, test } from "vitest";
import { compileProblem } from "../../../../src/engine/domains/registry";
import { Rng } from "../../../../src/engine/core/rng";
import { createTrussBridgeProblem } from "../../../../src/engine/domains/structural/truss/template";

describe("truss design evaluation", () => {
  const problem = createTrussBridgeProblem({ span_m: 2, load_N: 500, panels: 4 });
  const compiled = compileProblem(problem);

  test("the baseline design is feasible and reports every metric", () => {
    const ev = compiled.evaluate(compiled.baseline.parameters);
    expect(ev.status).toBe("ok");
    expect(ev.feasible).toBe(true);
    expect(ev.totalViolation).toBe(0);
    expect(ev.metrics.mass_kg).toBeGreaterThan(0);
    for (const key of [
      "mass_kg",
      "maxStress_Pa",
      "stressUtilization",
      "bucklingUtilization",
      "maxDisplacement_m",
      "compliance_J",
    ]) {
      expect(Number.isFinite(ev.metrics[key])).toBe(true);
    }
    expect(ev.objectives.mass).toBe(ev.metrics.mass_kg);
    expect(ev.constraints).toHaveLength(problem.constraints.length);
  });

  test("the baseline is sized to be nearly critical: some constraint utilisation is close to 1", () => {
    const ev = compiled.evaluate(compiled.baseline.parameters);
    const util = Math.max(ev.metrics.stressUtilization, ev.metrics.bucklingUtilization);
    expect(util).toBeGreaterThan(0.9);
    expect(util).toBeLessThanOrEqual(1);
  });

  test("shrinking every member to the minimum area is infeasible with positive violation", () => {
    const params = compiled.space.variables.map((v) => (v.group === "area" ? v.lower : 0.25));
    const ev = compiled.evaluate(params);
    expect(ev.status).toBe("ok");
    expect(ev.feasible).toBe(false);
    expect(ev.totalViolation).toBeGreaterThan(0);
    expect(ev.constraints.some((c) => !c.satisfied)).toBe(true);
  });

  test("evaluation is deterministic", () => {
    const params = compiled.space.sample(new Rng(5));
    const a = compiled.evaluate(params);
    const b = compiled.evaluate(params);
    expect(a).toEqual(b);
  });

  test("a wrong-length parameter vector is rejected", () => {
    expect(() => compiled.evaluate([1, 2, 3])).toThrow();
  });

  test("the compiled problem exposes labelled metrics and a described baseline", () => {
    expect(compiled.metrics.find((m) => m.id === "mass_kg")?.unit).toBe("kg");
    expect(compiled.baseline.label.length).toBeGreaterThan(0);
    expect(compiled.baseline.description).toMatch(/uniform/i);
  });
});
