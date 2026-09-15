import { describe, expect, test } from "vitest";
import { createTrussBridgeProblem } from "../../../src/engine/domains/structural/truss/template";
import { createExperimentConfig } from "../../../src/engine/experiments/runner";
import { runSurrogateStudy } from "../../../src/engine/ml/study";

describe("surrogate study on a real experiment", () => {
  const problem = createTrussBridgeProblem({ span_m: 2, load_N: 500, panels: 4 });
  const config = createExperimentConfig({
    id: "study",
    problem,
    seed: 4,
    optimizer: { id: "evolutionary", params: { populationSize: 40 } },
    budget: { maxEvaluations: 1200 },
  });

  test("trains each model on a seeded split and reports held-out metrics per target", () => {
    const study = runSurrogateStudy(config, { models: ["ridge", "gp"], targets: ["mass_kg", "bucklingUtilization"], splitSeed: 1, maxTrainingPoints: 300 });
    expect(study.dataset.size).toBeGreaterThan(1000);
    expect(study.split.train + study.split.validation + study.split.test).toBe(study.dataset.size);
    expect(study.results).toHaveLength(4);
    for (const r of study.results) {
      expect(Number.isFinite(r.mae)).toBe(true);
      expect(Number.isFinite(r.rmse)).toBe(true);
      expect(r.r2).toBeLessThanOrEqual(1);
      expect(r.sample.length).toBeGreaterThan(10);
      expect(r.fitMs).toBeGreaterThanOrEqual(0);
    }
    const massRidge = study.results.find((r) => r.modelId === "ridge" && r.target === "mass_kg")!;
    // Mass is close to linear in member areas, so a quadratic ridge fit should be excellent.
    expect(massRidge.r2).toBeGreaterThan(0.95);
    const gp = study.results.find((r) => r.modelId === "gp" && r.target === "mass_kg")!;
    expect(gp.coverage95).toBeGreaterThan(0.6);
    // Mass is linear in member areas, so validation-based selection must keep
    // the raw (not log) transform for it and report the selection score.
    expect(massRidge.logSpace).toBe(false);
    expect(Number.isFinite(massRidge.validationR2)).toBe(true);
    // Buckling utilisation is a max over members of a 1/A^2 quantity: hard for
    // any global regressor. The study must still report finite, honest numbers.
    const buck = study.results.find((r) => r.modelId === "ridge" && r.target === "bucklingUtilization")!;
    expect(Number.isFinite(buck.r2)).toBe(true);
    expect(Number.isFinite(buck.rmse)).toBe(true);
  });

  test("is deterministic", () => {
    const a = runSurrogateStudy(config, { models: ["ridge"], targets: ["mass_kg"], splitSeed: 2, maxTrainingPoints: 200 });
    const b = runSurrogateStudy(config, { models: ["ridge"], targets: ["mass_kg"], splitSeed: 2, maxTrainingPoints: 200 });
    expect(a.results[0].r2).toBe(b.results[0].r2);
  });
});
