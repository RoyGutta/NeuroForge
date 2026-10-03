import { describe, expect, test } from "vitest";
import { compileProblem } from "../../../src/engine/domains/registry";
import { createTrussBridgeProblem } from "../../../src/engine/domains/structural/truss/template";
import { createExperimentConfig, runExperimentToCompletion } from "../../../src/engine/experiments/runner";
import { robustify } from "../../../src/engine/robustness/robustProblem";
import { robustnessStudy } from "../../../src/engine/robustness/robustness";

const problem = createTrussBridgeProblem({ span_m: 2, load_N: 500, panels: 4 });
const nominal = compileProblem(problem);
const scaled = (f: number) => nominal.baseline.parameters.map((v, i) => (nominal.space.variables[i].group === "area" ? v * f : v));

describe("robust problem wrapper (optimise under tolerance)", () => {
  const robust = robustify(nominal, { tolerance: 0.02, samples: 16, targetFraction: 0.95 });

  test("adds a robustness constraint, keeps the nominal metrics and is deterministic per design", () => {
    const a = robust.evaluate(nominal.baseline.parameters);
    const b = robust.evaluate(nominal.baseline.parameters);
    expect(a).toEqual(b);
    const plain = nominal.evaluate(nominal.baseline.parameters);
    expect(a.metrics.mass_kg).toBe(plain.metrics.mass_kg);
    expect(a.constraints.map((c) => c.id)).toEqual([...plain.constraints.map((c) => c.id), "robustness"]);
    expect(a.metrics.robustFeasibleFraction).toBeGreaterThanOrEqual(0);
    expect(a.metrics.robustFeasibleFraction).toBeLessThanOrEqual(1);
    expect(robust.metrics.some((m) => m.id === "robustFeasibleFraction")).toBe(true);
    expect(robust.backendId).toContain(nominal.backendId);
    expect(robust.problem.constraints.some((c) => c.id === "robustness")).toBe(true);
  });

  test("a design sized to its limits is infeasible under tolerance while a generous one stays feasible", () => {
    const tight = robust.evaluate(nominal.baseline.parameters);
    expect(nominal.evaluate(nominal.baseline.parameters).feasible).toBe(true);
    expect(tight.feasible).toBe(false);
    expect(tight.totalViolation).toBeGreaterThan(0);
    const generous = robust.evaluate(scaled(1.5));
    expect(generous.feasible).toBe(true);
    expect(generous.metrics.robustFeasibleFraction).toBe(1);
  });

  test("nearby designs draw different perturbation samples (no fixed sample to exploit)", () => {
    const p = scaled(1.02);
    const q = p.slice();
    q[q.length - 1] *= 1.0001;
    const a = robust.evaluate(p);
    const b = robust.evaluate(q);
    expect(a.metrics.robustSampleSeed).not.toBe(b.metrics.robustSampleSeed);
  });

  test("an experiment in robust mode finds a design that is more robust and heavier than the nominal optimum, verified with an independent sample", () => {
    const base = { problem, seed: 3, optimizer: { id: "evolutionary", params: { populationSize: 30 } }, budget: { maxEvaluations: 4000 } };
    const plain = runExperimentToCompletion(createExperimentConfig({ ...base, id: "plain" }));
    const robustRun = runExperimentToCompletion(createExperimentConfig({ ...base, id: "robust", robust: { tolerance: 0.02, samples: 12, targetFraction: 0.95 } }));
    expect(robustRun.config.robust).toEqual({ tolerance: 0.02, samples: 12, targetFraction: 0.95 });
    expect(robustRun.backendId).toContain("robust");
    expect(robustRun.best?.evaluation?.feasible).toBe(true);
    const check = (params: number[]) => robustnessStudy(nominal, params, { samples: 300, seed: 999, tolerance: 0.02 }).feasibleFraction;
    const plainFraction = check(plain.best!.parameters);
    const robustFraction = check(robustRun.best!.parameters);
    // The nominal optimum sits on its constraint limits and is fragile; the robust optimum trades mass for slack.
    expect(plainFraction).toBeLessThan(0.95);
    expect(robustFraction).toBeGreaterThan(plainFraction);
    expect(robustFraction).toBeGreaterThan(0.6);
    expect(robustRun.best!.evaluation!.metrics.mass_kg).toBeGreaterThan(plain.best!.evaluation!.metrics.mass_kg);
    expect(nominal.evaluate(robustRun.best!.parameters).feasible).toBe(true);
  });
});
