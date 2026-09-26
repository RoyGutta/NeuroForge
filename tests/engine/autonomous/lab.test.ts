import { describe, expect, test } from "vitest";
import { createTrussBridgeProblem } from "../../../src/engine/domains/structural/truss/template";
import { detectPlateau } from "../../../src/engine/autonomous/convergence";
import { createLabConfig, runLab, runLabToCompletion, type LabEvent } from "../../../src/engine/autonomous/lab";

const problem = createTrussBridgeProblem({ span_m: 2, load_N: 500, panels: 4 });

describe("plateau detection", () => {
  test("reports convergence when the best objective has not improved by the relative tolerance over the window", () => {
    const flat = [1, 0.9, 0.8, 0.7999, 0.7998, 0.7998, 0.7998, 0.7997];
    expect(detectPlateau(flat, { window: 4, minRelativeImprovement: 0.001 })).toBe(true);
    const improving = [1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3];
    expect(detectPlateau(improving, { window: 4, minRelativeImprovement: 0.001 })).toBe(false);
    expect(detectPlateau([1, 0.9], { window: 4, minRelativeImprovement: 0.001 })).toBe(false);
  });
});

describe("autonomous lab", () => {
  const config = createLabConfig({
    problem,
    seed: 3,
    strategies: ["evolutionary", "surrogate-evolutionary", "member-surrogate-evolutionary"],
    pilotBudget: 600,
    totalBudget: 5000,
    tradeoffBudget: 1000,
    convergence: { window: 20, minRelativeImprovement: 0.002 },
  });

  test("runs every stage in order and produces a report whose numbers reconcile with the records", () => {
    const events: LabEvent[] = [];
    const gen = runLab(config);
    let step = gen.next();
    while (!step.done) {
      events.push(step.value);
      step = gen.next();
    }
    const record = step.value;
    const stages = events.filter((e) => e.type === "stage").map((e) => (e as { stage: string }).stage);
    expect(stages).toEqual(["analysis", "pilot", "main", "tradeoff", "report"]);
    expect(record.status).toBe("completed");
    expect(record.pilots).toHaveLength(3);
    for (const p of record.pilots) expect(p.record.totalEvaluations).toBeGreaterThanOrEqual(600);
    // Pilots must actually differentiate: not all stuck on the seeded baseline.
    expect(new Set(record.pilots.map((p) => p.bestObjective.toFixed(4))).size).toBeGreaterThan(1);
    const bestPilot = record.pilots.slice().sort((a, b) => a.bestObjective - b.bestObjective)[0];
    expect(record.chosenStrategy).toBe(bestPilot.strategy);
    expect(record.main.config.optimizer.id).toBe(record.chosenStrategy);
    const solverTotal = record.pilots.reduce((s, p) => s + p.record.totalEvaluations, 0) + record.main.totalEvaluations + (record.tradeoff?.totalEvaluations ?? 0);
    expect(record.report.solverEvaluations).toBe(solverTotal);
    expect(record.report.strategiesCompared).toBe(3);
    expect(record.report.bestMass_kg).toBe(record.main.best!.evaluation!.metrics.mass_kg);
    expect(record.report.improvementPercent).toBeCloseTo((1 - record.report.bestMass_kg / record.report.baselineMass_kg) * 100, 9);
    expect(record.report.improvementPercent).toBeGreaterThan(30);
    expect(record.report.bindingConstraints.length).toBeGreaterThan(0);
    expect(record.report.paretoFrontSize).toBeGreaterThan(3);
    expect(["converged", "budget"]).toContain(record.report.stopReason);
    expect(record.tradeoff?.paretoFront?.length).toBe(record.report.paretoFrontSize);
    expect(record.report.surrogatePredictions).toBeGreaterThanOrEqual(0);
  });

  test("is deterministic", () => {
    const a = runLabToCompletion(config);
    const b = runLabToCompletion(config);
    expect(a.chosenStrategy).toBe(b.chosenStrategy);
    expect(a.main.best?.parameters).toEqual(b.main.best?.parameters);
    expect(a.report.solverEvaluations).toBe(b.report.solverEvaluations);
  });

  test("stops the main stage on convergence before the budget when a plateau appears", () => {
    const tight = createLabConfig({ ...config, id: "tight", convergence: { window: 5, minRelativeImprovement: 0.5 } });
    const record = runLabToCompletion(tight);
    expect(record.report.stopReason).toBe("converged");
    expect(record.main.totalEvaluations).toBeLessThan(tight.totalBudget - 3 * tight.pilotBudget - tight.tradeoffBudget);
  });

  test("can be cancelled part-way; the record handed out at start reports cancelled", () => {
    const gen = runLab(config);
    const first = gen.next().value as LabEvent;
    expect(first.type).toBe("started");
    gen.next();
    gen.next();
    const fin = gen.return(undefined as never);
    expect(fin.done).toBe(true);
    expect((first as { type: "started"; record: { status: string } }).record.status).toBe("cancelled");
  });
});
