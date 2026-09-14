import { describe, expect, test } from "vitest";
import { compileProblem } from "../../../src/engine/domains/registry";
import { createTrussBridgeProblem } from "../../../src/engine/domains/structural/truss/template";
import {
  createExperimentConfig,
  runExperiment,
  runExperimentToCompletion,
  type ExperimentEvent,
} from "../../../src/engine/experiments/runner";

const problem = createTrussBridgeProblem({ span_m: 2, load_N: 500, panels: 4 });

describe("experiment runner", () => {
  test("produces a record with per-generation summaries, a baseline and a best design", () => {
    const config = createExperimentConfig({
      problem,
      seed: 11,
      optimizer: { id: "evolutionary", params: { populationSize: 30 } },
      budget: { maxEvaluations: 900 },
    });
    const record = runExperimentToCompletion(config);
    expect(record.status).toBe("completed");
    expect(record.totalEvaluations).toBeGreaterThanOrEqual(900);
    expect(record.generations.length).toBeGreaterThan(5);
    expect(record.baseline.evaluation?.feasible).toBe(true);
    expect(record.best?.evaluation?.feasible).toBe(true);
    const gens = record.generations.map((g) => g.generation);
    expect(gens).toEqual(gens.map((_, i) => i));
    for (const g of record.generations) {
      expect(g.evaluations).toBeGreaterThan(0);
      expect(g.bestSoFar.evaluation).toBeDefined();
    }
    // Best-so-far objective is monotone non-increasing across generations.
    const bests = record.generations.map((g) => g.bestSoFar.evaluation!.objectives.mass);
    for (let i = 1; i < bests.length; i++) expect(bests[i]).toBeLessThanOrEqual(bests[i - 1]);
    expect(record.engineVersion).toMatch(/^\d+\.\d+\.\d+$/);
  });

  test("beats the conventional baseline on the truss problem", () => {
    const config = createExperimentConfig({
      problem,
      seed: 21,
      optimizer: { id: "evolutionary", params: { populationSize: 40 } },
      budget: { maxEvaluations: 4000 },
    });
    const record = runExperimentToCompletion(config);
    const baselineMass = record.baseline.evaluation!.metrics.mass_kg;
    const bestMass = record.best!.evaluation!.metrics.mass_kg;
    expect(bestMass).toBeLessThan(baselineMass * 0.9);
  });

  test("is reproducible: identical config yields identical generations and best design", () => {
    const make = () =>
      createExperimentConfig({
        id: "repro",
        problem,
        seed: 5,
        optimizer: { id: "annealing", params: {} },
        budget: { maxEvaluations: 600 },
      });
    const a = runExperimentToCompletion(make());
    const b = runExperimentToCompletion(make());
    expect(a.best!.parameters).toEqual(b.best!.parameters);
    expect(a.generations.map((g) => g.bestSoFar.evaluation!.objectives.mass)).toEqual(
      b.generations.map((g) => g.bestSoFar.evaluation!.objectives.mass)
    );
  });

  test("streams generation events and can be cancelled part-way", () => {
    const config = createExperimentConfig({
      problem,
      seed: 1,
      optimizer: { id: "random-search", params: { batchSize: 50 } },
      budget: { maxEvaluations: 5000 },
    });
    const gen = runExperiment(config);
    const events: ExperimentEvent[] = [];
    let step = gen.next();
    while (!step.done && events.length < 3) {
      events.push(step.value);
      step = gen.next();
    }
    const finished = gen.return(undefined as never);
    expect(events[0].type).toBe("started");
    expect(events.slice(1).every((e) => e.type === "generation")).toBe(true);
    expect(finished.done).toBe(true);
  });

  test("records the compiled problem's backend and the optimizer settings used", () => {
    const config = createExperimentConfig({
      problem,
      seed: 2,
      optimizer: { id: "evolutionary", params: {} },
      budget: { maxEvaluations: 200 },
    });
    const record = runExperimentToCompletion(config);
    expect(record.backendId).toBe(compileProblem(problem).backendId);
    expect(record.config.optimizer.params.populationSize).toBeGreaterThan(0);
    expect(record.config.seed).toBe(2);
  });
});
