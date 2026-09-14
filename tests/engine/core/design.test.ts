import { describe, expect, test } from "vitest";
import {
  checkConstraints,
  compareDesigns,
  type Design,
  type Evaluation,
} from "../../../src/engine/core/design";
import type { ConstraintSpec } from "../../../src/engine/core/problem";

function design(objective: number, violation: number, feasible = violation === 0): Design {
  const evaluation: Evaluation = {
    status: "ok",
    metrics: { mass_kg: objective },
    objectives: { mass: objective },
    constraints: [],
    feasible,
    totalViolation: violation,
    diagnostics: [],
    fidelity: "test",
    backend: "test",
  };
  return {
    id: `d-${objective}-${violation}`,
    generation: 0,
    parentIds: [],
    operator: "test",
    parameters: [],
    evaluation,
  };
}

describe("constraint checking", () => {
  const specs: ConstraintSpec[] = [
    { id: "stress", metric: "stressUtilization", op: "<=", limit: 1, label: "Stress", source: "design-code" },
    { id: "defl", metric: "maxDisplacement_m", op: "<=", limit: 0.008, label: "Deflection", source: "assumed" },
    { id: "sf", metric: "safetyMargin", op: ">=", limit: 2, label: "Safety", source: "user" },
  ];

  test("satisfied constraints have zero violation", () => {
    const res = checkConstraints(specs, {
      stressUtilization: 0.8,
      maxDisplacement_m: 0.004,
      safetyMargin: 2.5,
    });
    expect(res.every((c) => c.satisfied)).toBe(true);
    expect(res.every((c) => c.violation === 0)).toBe(true);
  });

  test("violations are normalised relative to the limit", () => {
    const res = checkConstraints(specs, {
      stressUtilization: 1.5,
      maxDisplacement_m: 0.016,
      safetyMargin: 1,
    });
    expect(res[0].violation).toBeCloseTo(0.5, 12);
    expect(res[1].violation).toBeCloseTo(1.0, 12);
    expect(res[2].violation).toBeCloseTo(0.5, 12);
    expect(res.some((c) => c.satisfied)).toBe(false);
  });

  test("a missing metric is reported as a violation, never silently passed", () => {
    const res = checkConstraints(specs, { stressUtilization: 0.5 });
    expect(res[1].satisfied).toBe(false);
    expect(res[1].violation).toBeGreaterThan(0);
  });
});

describe("compareDesigns (Deb feasibility rules)", () => {
  test("a feasible design beats an infeasible one regardless of objective", () => {
    const feasible = design(10, 0);
    const infeasible = design(1, 0.2);
    expect(compareDesigns(feasible, infeasible, "mass", "minimize")).toBeLessThan(0);
    expect(compareDesigns(infeasible, feasible, "mass", "minimize")).toBeGreaterThan(0);
  });

  test("between infeasible designs, the smaller total violation wins", () => {
    const a = design(1, 0.9);
    const b = design(50, 0.1);
    expect(compareDesigns(a, b, "mass", "minimize")).toBeGreaterThan(0);
  });

  test("between feasible designs, the better objective wins in the stated direction", () => {
    const light = design(2, 0);
    const heavy = design(5, 0);
    expect(compareDesigns(light, heavy, "mass", "minimize")).toBeLessThan(0);
    expect(compareDesigns(light, heavy, "mass", "maximize")).toBeGreaterThan(0);
  });

  test("an unevaluated design always loses", () => {
    const evaluated = design(100, 5);
    const pending: Design = { ...evaluated, id: "p", evaluation: undefined };
    expect(compareDesigns(pending, evaluated, "mass", "minimize")).toBeGreaterThan(0);
  });
});
