import { describe, expect, test } from "vitest";
import { createTrussBridgeProblem } from "../../../src/engine/domains/structural/truss/template";
import { createExperimentConfig, runExperimentToCompletion } from "../../../src/engine/experiments/runner";
import { listOptimizers } from "../../../src/engine/optimization";
import type { MemberSurrogateDiagnostics } from "../../../src/engine/optimization/memberSurrogateEvolutionary";

const problem = createTrussBridgeProblem({ span_m: 2, load_N: 500, panels: 4 });

function run(params: Record<string, number>, seed: number, budget: number) {
  return runExperimentToCompletion(
    createExperimentConfig({ id: `ms-${seed}`, problem, seed, optimizer: { id: "member-surrogate-evolutionary", params }, budget: { maxEvaluations: budget } })
  );
}

describe("member-surrogate, uncertainty-aware evolutionary optimizer", () => {
  test("is registered and every design in the record was verified by the solver", () => {
    expect(listOptimizers().map((o) => o.id)).toContain("member-surrogate-evolutionary");
    const rec = run({ populationSize: 30, screeningFactor: 4, warmupEvaluations: 200 }, 1, 1200);
    expect(rec.status).toBe("completed");
    expect(rec.totalEvaluations).toBeGreaterThanOrEqual(1200);
    expect(rec.best?.evaluation?.feasible).toBe(true);
    expect(rec.best?.evaluation?.backend).toBe("truss-fea-2d");
    for (const g of rec.generations) expect(g.bestSoFar.evaluation?.fidelity).toBe("linear-static-fea");
  });

  test("records a screening funnel, feasibility confusion and force accuracy computed from actual pairs", () => {
    const rec = run({ populationSize: 30, screeningFactor: 4, warmupEvaluations: 200, riskK: 2, exploreFraction: 0.2 }, 2, 1500);
    const d = rec.optimizerDiagnostics as unknown as MemberSurrogateDiagnostics;
    expect(d.surrogate).toBe("member-forces:ridge");
    expect(d.funnel.candidatesGenerated).toBeGreaterThan(d.funnel.sentToSolver);
    expect(d.funnel.surrogatePredictions).toBe(d.funnel.candidatesGenerated);
    expect(d.funnel.sentToSolver + d.funnel.warmupEvaluations).toBe(rec.totalEvaluations);
    expect(d.funnel.explorationPicks).toBeGreaterThan(0);
    const c = d.feasibility;
    expect(c.truePositive + c.falsePositive + c.trueNegative + c.falseNegative).toBe(d.funnel.sentToSolver);
    expect(c.precision).toBeGreaterThanOrEqual(0);
    expect(c.precision).toBeLessThanOrEqual(1);
    expect(c.falseFeasibleRate).toBeGreaterThanOrEqual(0);
    expect(c.falseInfeasibleRate).toBeGreaterThanOrEqual(0);
    expect(d.forces.perMemberMae).toHaveLength(15);
    expect(Number.isFinite(d.forces.overallR2)).toBe(true);
    expect(d.forces.coverage95).toBeGreaterThan(0);
    expect(d.forces.coverage95).toBeLessThanOrEqual(1);
    expect(Number.isFinite(d.forces.errorStdCorrelation)).toBe(true);
    expect(d.policy).toEqual({ riskK: 2, exploreFraction: 0.2 });
  });

  test("with riskK = 0 the conservative prediction equals the nominal one, so the risk-adjusted confusion matches the nominal one", () => {
    const rec = run({ populationSize: 20, screeningFactor: 3, warmupEvaluations: 120, riskK: 0, exploreFraction: 0 }, 3, 600);
    const d = rec.optimizerDiagnostics as unknown as MemberSurrogateDiagnostics;
    expect(d.feasibility.falsePositive).toBe(d.feasibilityNominal.falsePositive);
    expect(d.funnel.explorationPicks).toBe(0);
  });

  test("a larger riskK never predicts feasible more often than a smaller one on the same predictions", () => {
    const a = run({ populationSize: 20, screeningFactor: 3, warmupEvaluations: 120, riskK: 0, exploreFraction: 0 }, 4, 600).optimizerDiagnostics as unknown as MemberSurrogateDiagnostics;
    expect(a.feasibility.predictedFeasibleRate).toBeGreaterThanOrEqual(a.feasibilityNominal.predictedFeasibleRate - 1e-12);
    const b = run({ populationSize: 20, screeningFactor: 3, warmupEvaluations: 120, riskK: 3, exploreFraction: 0 }, 4, 600).optimizerDiagnostics as unknown as MemberSurrogateDiagnostics;
    // Conservative screening (k = 3) must classify fewer candidates as feasible than nominal within the same run.
    expect(b.feasibility.predictedFeasibleRate).toBeLessThanOrEqual(b.feasibilityNominal.predictedFeasibleRate + 1e-12);
  });

  test("is deterministic", () => {
    const a = run({ populationSize: 20, warmupEvaluations: 120 }, 5, 500);
    const b = run({ populationSize: 20, warmupEvaluations: 120 }, 5, 500);
    expect(a.best?.parameters).toEqual(b.best?.parameters);
    // Wall-clock fit time is the only legitimately non-deterministic field.
    const strip = (d: unknown) => ({ ...(d as Record<string, unknown>), lastFitMs: 0 });
    expect(strip(a.optimizerDiagnostics)).toEqual(strip(b.optimizerDiagnostics));
  });
});
