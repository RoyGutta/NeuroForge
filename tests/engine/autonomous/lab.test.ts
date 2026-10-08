import { describe, expect, test } from "vitest";
import { createManipulatorProblem } from "../../../src/engine/domains/robotics/manipulator/template";
import { createSpaceTrussProblem } from "../../../src/engine/domains/structural/truss3d/template";
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
    expect(stages).toEqual(["analysis", "pilot", "main", "tradeoff", "robustness", "report"]);
    expect(record.status).toBe("completed");
    expect(record.pilots).toHaveLength(3);
    for (const p of record.pilots) expect(p.record.totalEvaluations).toBeGreaterThanOrEqual(600);
    // Pilots must actually differentiate: not all stuck on the seeded baseline.
    expect(new Set(record.pilots.map((p) => p.bestObjective.toFixed(4))).size).toBeGreaterThan(1);
    const bestPilot = record.pilots.slice().sort((a, b) => a.bestObjective - b.bestObjective)[0];
    expect(record.chosenStrategy).toBe(bestPilot.strategy);
    expect(record.main.config.optimizer.id).toBe(record.chosenStrategy);
    const solverTotal = record.pilots.reduce((s, p) => s + p.record.totalEvaluations, 0) + record.main.totalEvaluations + (record.tradeoff?.totalEvaluations ?? 0) + (record.robustness?.evaluations ?? 0);
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

  test("runs on the robotics domain and maps a torque-versus-mass trade-off", () => {
    const arm = createManipulatorProblem({ payload_kg: 2, reach_m: 0.8 });
    const cfg = createLabConfig({ problem: arm, seed: 5, strategies: ["evolutionary", "cmaes"], pilotBudget: 300, totalBudget: 2500, tradeoffBudget: 600, convergence: { window: 15, minRelativeImprovement: 0.002 } });
    const record = runLabToCompletion(cfg);
    expect(record.status).toBe("completed");
    expect(record.report.objectiveMetric).toBe("peakTorque_Nm");
    expect(record.report.bestObjective).toBe(record.main.best!.evaluation!.metrics.peakTorque_Nm);
    expect(record.report.improvementPercent).toBeCloseTo((1 - record.report.bestObjective / record.report.baselineObjective) * 100, 9);
    expect(record.tradeoff).not.toBeNull();
    expect(record.tradeoff!.config.problem.objectives.map((o) => o.metric)).toEqual(["peakTorque_Nm", "mass_kg"]);
    expect(record.report.paretoFrontSize).toBeGreaterThan(0);
  });

  test("pilots every strategy on several seeds, ranks by median, measures robustness and writes a lab report from the records", () => {
    const arm = createManipulatorProblem({ payload_kg: 2, reach_m: 0.8 });
    const cfg = createLabConfig({ problem: arm, seed: 11, strategies: ["evolutionary", "cmaes"], pilotSeeds: 3, pilotBudget: 200, totalBudget: 3000, tradeoffBudget: 400, robustness: { tolerance: 0.02, samples: 100 }, convergence: { window: 10, minRelativeImprovement: 0.002 } });
    expect(cfg.pilotSeeds).toBe(3);
    const record = runLabToCompletion(cfg);
    expect(record.status).toBe("completed");
    expect(record.pilots).toHaveLength(6);
    expect(new Set(record.pilots.map((p) => `${p.strategy}:${p.seed}`)).size).toBe(6);
    expect(record.ranking.map((r) => r.strategy).sort()).toEqual(["cmaes", "evolutionary"]);
    for (const r of record.ranking) {
      const bests = record.pilots.filter((p) => p.strategy === r.strategy && p.feasible).map((p) => p.bestObjective).sort((a, b) => a - b);
      expect(r.seeds).toBe(3);
      expect(r.medianObjective).toBe(bests[1]);
    }
    expect(record.chosenStrategy).toBe(record.ranking[0].strategy);
    expect(record.robustness).not.toBeNull();
    expect(record.robustness!.samples).toBe(100);
    expect(record.robustness!.parameters).toEqual(record.main.best!.parameters);
    expect(record.report.robustness?.feasibleFraction).toBe(record.robustness!.feasibleFraction);
    expect(record.report.solverEvaluations).toBe(record.pilots.reduce((s, p) => s + p.evaluations, 0) + record.main.totalEvaluations + (record.tradeoff?.totalEvaluations ?? 0) + 100);
    const u = record.report.uncertainty;
    expect(u.entries.find((e) => e.kind === "statistical")?.status).toBe("quantified");
    expect(u.entries.find((e) => e.kind === "manufacturing")?.status).toBe("quantified");
    const d = record.report.discovery;
    for (const section of [d.method, d.results, d.uncertainty, d.limitations, d.reproducibility]) expect(section.length).toBeGreaterThan(0);
    const text = [d.question, ...d.method, ...d.results, ...d.uncertainty, ...d.reproducibility, d.conclusion].join("\n");
    expect(text).toContain(record.report.chosenStrategyLabel);
    expect(text).toContain(Math.abs(record.report.improvementPercent).toFixed(1));
    expect(text).toContain(String(cfg.seed));
    expect(text).toContain(record.engineVersion);
  });

  test("a single-seed lab still reports, with seed variation documented rather than quantified", () => {
    const record = runLabToCompletion(createLabConfig({ ...config, id: "single", robustness: null }));
    expect(record.pilots).toHaveLength(3);
    expect(record.robustness).toBeNull();
    expect(record.report.uncertainty.entries.find((e) => e.kind === "statistical")?.status).toBe("documented");
    expect(record.report.uncertainty.entries.find((e) => e.kind === "manufacturing")?.status).toBe("not-modelled");
  });

  test("runs on the spatial truss through the registry: pilots, main, trade-off on compliance, robustness and report", () => {
    const girder = createSpaceTrussProblem({ span_m: 3, load_N: 2000, bays: 2 });
    const cfg = createLabConfig({ problem: girder, seed: 4, strategies: ["evolutionary", "cmaes"], pilotBudget: 250, totalBudget: 2600, tradeoffBudget: 500, robustness: { tolerance: 0.02, samples: 60 }, convergence: { window: 12, minRelativeImprovement: 0.002 } });
    const record = runLabToCompletion(cfg);
    expect(record.status).toBe("completed");
    expect(record.backendId).toBe("truss-fea-3d");
    expect(record.report.objectiveMetric).toBe("mass_kg");
    expect(record.tradeoff?.config.problem.objectives.map((o) => o.metric)).toEqual(["mass_kg", "compliance_J"]);
    expect(record.robustness?.samples).toBe(60);
    expect(record.report.improvementPercent).toBeGreaterThan(0);
    expect(record.report.discovery.results.length).toBeGreaterThan(0);
  });
});
