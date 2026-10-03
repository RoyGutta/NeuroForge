import { describe, expect, test } from "vitest";
import { compileProblem } from "../../../src/engine/domains/registry";
import { createManipulatorProblem } from "../../../src/engine/domains/robotics/manipulator/template";
import { createTrussBridgeProblem } from "../../../src/engine/domains/structural/truss/template";
import { robustMargin, robustnessStudy, toleranceSweep } from "../../../src/engine/robustness/robustness";

const truss = compileProblem(createTrussBridgeProblem({ span_m: 2, load_N: 500, panels: 4 }));
const baseline = truss.baseline.parameters;
const n = truss.space.dimension;
const scaled = (f: number) => baseline.map((v, i) => (truss.space.variables[i].group === "area" ? v * f : v));

describe("robustness study (tolerance perturbation through the real evaluator)", () => {
  test("a design sized exactly to its limits fails under symmetric perturbation about half the time; a generous one never; an undersized one always", () => {
    const opts = { samples: 200, seed: 1, tolerance: 0.02, groups: ["area"] };
    const tight = robustnessStudy(truss, baseline, opts);
    expect(tight.samples).toBe(200);
    expect(tight.evaluations).toBe(200);
    expect(tight.feasibleFraction).toBeGreaterThan(0.1);
    expect(tight.feasibleFraction).toBeLessThan(0.9);
    expect(tight.nominal.feasible).toBe(true);
    const generous = robustnessStudy(truss, scaled(1.5), opts);
    expect(generous.feasibleFraction).toBe(1);
    const thin = robustnessStudy(truss, scaled(0.8), opts);
    expect(thin.feasibleFraction).toBe(0);
    expect(thin.nominal.feasible).toBe(false);
  });

  test("reports per-constraint violation probabilities and objective quantiles that bracket the nominal value", () => {
    const r = robustnessStudy(truss, baseline, { samples: 300, seed: 3, tolerance: 0.03, groups: ["area"] });
    const ids = r.constraints.map((c) => c.id);
    expect(ids).toEqual(truss.problem.constraints.map((c) => c.id));
    for (const c of r.constraints) {
      expect(c.violationProbability).toBeGreaterThanOrEqual(0);
      expect(c.violationProbability).toBeLessThanOrEqual(1);
      expect(c.maxUtilization).toBeGreaterThanOrEqual(c.nominalUtilization * 0.99);
    }
    expect(r.constraints.find((c) => c.id === "buckling")!.violationProbability).toBeGreaterThan(0);
    expect(r.objective.q05).toBeLessThanOrEqual(r.objective.median);
    expect(r.objective.median).toBeLessThanOrEqual(r.objective.q95);
    expect(r.objective.q05).toBeLessThanOrEqual(r.objective.nominal * 1.001);
    expect(r.objective.q95).toBeGreaterThanOrEqual(r.objective.nominal * 0.999);
    expect(r.objective.worst).toBeGreaterThanOrEqual(r.objective.median);
  });

  test("is deterministic for a seed and differs across seeds", () => {
    const a = robustnessStudy(truss, baseline, { samples: 100, seed: 5, tolerance: 0.02 });
    const b = robustnessStudy(truss, baseline, { samples: 100, seed: 5, tolerance: 0.02 });
    const c = robustnessStudy(truss, baseline, { samples: 100, seed: 6, tolerance: 0.02 });
    expect(a).toEqual(b);
    expect(a.feasibleFraction === c.feasibleFraction && a.objective.median === c.objective.median).toBe(false);
  });

  test("clamps perturbed parameters to the design space bounds", () => {
    const atUpper = baseline.map((_, i) => truss.space.variables[i].upper);
    const r = robustnessStudy(truss, atUpper, { samples: 50, seed: 2, tolerance: 0.1 });
    expect(r.evaluations).toBe(50);
    expect(r.samples).toBe(50);
    expect(Number.isFinite(r.objective.worst)).toBe(true);
  });

  test("a tolerance sweep is non-increasing in feasibility and a robust margin ranks designs by their slack", () => {
    const sweep = toleranceSweep(truss, scaled(1.05), [0.005, 0.01, 0.02, 0.05, 0.1], { samples: 120, seed: 4, groups: ["area"] });
    expect(sweep.map((s) => s.tolerance)).toEqual([0.005, 0.01, 0.02, 0.05, 0.1]);
    expect(sweep[sweep.length - 1].feasibleFraction).toBeLessThanOrEqual(sweep[0].feasibleFraction);
    const mTight = robustMargin(truss, baseline, { samples: 120, seed: 4, target: 0.95, groups: ["area"] });
    const mSlack = robustMargin(truss, scaled(1.2), { samples: 120, seed: 4, target: 0.95, groups: ["area"] });
    expect(mSlack).toBeGreaterThan(mTight);
    expect(mTight).toBeGreaterThanOrEqual(0);
  });

  test("runs on the robotics domain through the same contract", () => {
    const arm = compileProblem(createManipulatorProblem({ payload_kg: 2, reach_m: 0.8 }));
    const r = robustnessStudy(arm, arm.baseline.parameters, { samples: 100, seed: 1, tolerance: 0.02 });
    expect(r.evaluations).toBe(100);
    expect(r.feasibleFraction).toBeGreaterThanOrEqual(0);
    expect(r.feasibleFraction).toBeLessThanOrEqual(1);
    expect(r.constraints.map((c) => c.id)).toEqual(["reach", "stress", "deflection"]);
    expect(n).toBeGreaterThan(4);
  });
});
