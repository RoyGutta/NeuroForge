import { describe, expect, test } from "vitest";
import { validateProblem } from "../../../src/engine/domains/registry";
import { createTrussBridgeProblem } from "../../../src/engine/domains/structural/truss/template";

describe("truss bridge problem template", () => {
  test("creates a valid problem from the canonical brief values", () => {
    const p = createTrussBridgeProblem({ span_m: 2, load_N: 500, safetyFactor: 2 });
    expect(validateProblem(p)).toEqual([]);
    expect(p.domain).toBe("structural");
    expect(p.geometry.kind).toBe("truss-bridge");
    expect(p.geometry.span_m).toBe(2);
    expect(p.loads[0].magnitude_N).toBe(500);
    expect(p.safetyFactor).toBe(2);
    expect(p.objectives.map((o) => o.metric)).toContain("mass_kg");
  });

  test("records the assumptions it had to make, with reasons and confidence", () => {
    const p = createTrussBridgeProblem({ span_m: 2, load_N: 500 });
    const fields = p.assumptions.map((a) => a.field);
    expect(fields).toContain("supports");
    expect(fields).toContain("deflectionLimit");
    expect(fields).toContain("sectionShape");
    for (const a of p.assumptions) {
      expect(a.reason.length).toBeGreaterThan(10);
      expect(["high", "medium", "low"]).toContain(a.confidence);
    }
  });

  test("constraints include stress, buckling and deflection with explicit limits", () => {
    const p = createTrussBridgeProblem({ span_m: 2, load_N: 500 });
    const metrics = p.constraints.map((c) => c.metric);
    expect(metrics).toContain("stressUtilization");
    expect(metrics).toContain("bucklingUtilization");
    expect(metrics).toContain("maxDisplacement_m");
    const defl = p.constraints.find((c) => c.metric === "maxDisplacement_m")!;
    expect(defl.limit).toBeCloseTo(2 / 250, 12);
  });
});

describe("validateProblem", () => {
  test("rejects an odd panel count (no midspan node for the load)", () => {
    const p = createTrussBridgeProblem({ span_m: 2, load_N: 500, panels: 3 });
    const issues = validateProblem(p);
    expect(issues.some((i) => i.path === "geometry.panels")).toBe(true);
  });

  test("rejects non-positive span and load", () => {
    const p = createTrussBridgeProblem({ span_m: -1, load_N: 0 });
    const paths = validateProblem(p).map((i) => i.path);
    expect(paths).toContain("geometry.span_m");
    expect(paths).toContain("loads[0].magnitude_N");
  });

  test("rejects a safety factor below 1 and inverted bounds", () => {
    const p = createTrussBridgeProblem({ span_m: 2, load_N: 500, safetyFactor: 0.5 });
    p.geometry.depthMin_m = 0.5;
    p.geometry.depthMax_m = 0.1;
    const paths = validateProblem(p).map((i) => i.path);
    expect(paths).toContain("safetyFactor");
    expect(paths).toContain("geometry.depthMin_m");
  });

  test("rejects an objective or constraint on a metric the domain cannot compute", () => {
    const p = createTrussBridgeProblem({ span_m: 2, load_N: 500 });
    p.objectives.push({ id: "x", metric: "liftCoefficient", direction: "maximize", label: "Lift" });
    const issues = validateProblem(p);
    expect(issues.some((i) => i.path === "objectives[1].metric")).toBe(true);
  });

  test("rejects an unknown domain", () => {
    const p = createTrussBridgeProblem({ span_m: 2, load_N: 500 });
    (p as { domain: string }).domain = "aerodynamics";
    expect(validateProblem(p).some((i) => i.path === "domain")).toBe(true);
  });
});
