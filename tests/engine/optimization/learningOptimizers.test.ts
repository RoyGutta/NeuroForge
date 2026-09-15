import { describe, expect, test } from "vitest";
import { createTrussBridgeProblem } from "../../../src/engine/domains/structural/truss/template";
import { createExperimentConfig, runExperimentToCompletion } from "../../../src/engine/experiments/runner";
import { listOptimizers } from "../../../src/engine/optimization";

const problem = createTrussBridgeProblem({ span_m: 2, load_N: 500, panels: 4 });

function run(id: string, params: Record<string, number>, seed: number, budget: number) {
  return runExperimentToCompletion(
    createExperimentConfig({ id: `${id}-${seed}`, problem, seed, optimizer: { id, params }, budget: { maxEvaluations: budget } })
  );
}

describe("surrogate-assisted evolutionary optimizer", () => {
  test("is registered and runs to completion with a feasible result", () => {
    expect(listOptimizers().map((o) => o.id)).toContain("surrogate-evolutionary");
    const rec = run("surrogate-evolutionary", { populationSize: 30, screeningFactor: 4 }, 1, 1500);
    expect(rec.status).toBe("completed");
    expect(rec.best?.evaluation?.feasible).toBe(true);
    expect(rec.totalEvaluations).toBeGreaterThanOrEqual(1500);
  });

  test("records online surrogate accuracy in the experiment diagnostics", () => {
    const rec = run("surrogate-evolutionary", { populationSize: 30, screeningFactor: 4, warmupEvaluations: 200 }, 2, 1500);
    const d = rec.optimizerDiagnostics as { screenedGenerations: number; onlineR2: Record<string, number>; predictedPairs: number };
    expect(d).toBeDefined();
    expect(d.screenedGenerations).toBeGreaterThan(5);
    expect(d.predictedPairs).toBeGreaterThan(100);
    expect(Number.isFinite(d.onlineR2.mass_kg)).toBe(true);
    expect(d.onlineR2.mass_kg).toBeGreaterThan(0.5);
  });

  test("is deterministic", () => {
    const a = run("surrogate-evolutionary", { populationSize: 20 }, 3, 800);
    const b = run("surrogate-evolutionary", { populationSize: 20 }, 3, 800);
    expect(a.best?.parameters).toEqual(b.best?.parameters);
  });
});

describe("bayesian optimizer", () => {
  test("is registered, runs to completion and improves on random search at a small budget", () => {
    expect(listOptimizers().map((o) => o.id)).toContain("bayesian");
    const bo = run("bayesian", { batchSize: 8, initialDesigns: 40 }, 5, 240);
    const rs = run("random-search", { batchSize: 40 }, 5, 240);
    expect(bo.status).toBe("completed");
    expect(bo.best?.evaluation?.feasible).toBe(true);
    expect(bo.best!.evaluation!.objectives.mass).toBeLessThan(rs.best!.evaluation!.objectives.mass);
    const d = bo.optimizerDiagnostics as { gpPoints: number; lengthscale: Record<string, number> };
    expect(d.gpPoints).toBeGreaterThan(0);
    expect(d.lengthscale.mass_kg).toBeGreaterThan(0);
  });

  test("is deterministic", () => {
    const a = run("bayesian", { batchSize: 8, initialDesigns: 30 }, 6, 150);
    const b = run("bayesian", { batchSize: 8, initialDesigns: 30 }, 6, 150);
    expect(a.best?.parameters).toEqual(b.best?.parameters);
  });
});
