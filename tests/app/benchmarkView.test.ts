import { describe, expect, test } from "vitest";
import { aggregateCurves, normalizeReport } from "../../src/pages/benchmarks/model";

describe("benchmark view model", () => {
  test("aggregateCurves interpolates each run onto a common grid and returns median and quartiles", () => {
    const runs = [
      [{ evaluations: 100, best: 10 }, { evaluations: 200, best: 8 }, { evaluations: 400, best: 4 }],
      [{ evaluations: 100, best: 12 }, { evaluations: 300, best: 6 }, { evaluations: 400, best: 6 }],
      [{ evaluations: 200, best: 9 }, { evaluations: 400, best: 5 }],
    ];
    const agg = aggregateCurves(runs, [100, 200, 300, 400]);
    expect(agg.map((p) => p.evaluations)).toEqual([100, 200, 300, 400]);
    // At 400: bests are 4, 6, 5 -> median 5, q1 4.5, q3 5.5
    const last = agg[3];
    expect(last.median).toBe(5);
    expect(last.q1).toBeCloseTo(4.5, 12);
    expect(last.q3).toBeCloseTo(5.5, 12);
    // Before a run's first point it contributes nothing (run 3 at 100).
    expect(agg[0].count).toBe(2);
    // Best-so-far is a step function: at 300, run 1 is still 8.
    expect(agg[2].count).toBe(3);
    expect(agg[2].median).toBe(8);
  });

  test("normalizeReport handles benchmark and ablation files into one shape", () => {
    const bench = normalizeReport("2026-01-01-truss-1500x5.json", {
      engineVersion: "0.4.0",
      createdAt: "2026-01-01T00:00:00.000Z",
      problem: { title: "T", brief: "b", baselineMass_kg: 1.6, targetMass_kg: 0.8 },
      seeds: [1, 2],
      budget: 1500,
      params: {},
      runs: [
        { optimizer: "a", seed: 1, budget: 1500, bestMass_kg: 0.5, feasible: true, evaluationsToTarget: 700, wallTimeMs: 10, curve: [{ evaluations: 100, best: 1 }] },
        { optimizer: "a", seed: 2, budget: 1500, bestMass_kg: 0.6, feasible: true, evaluationsToTarget: null, wallTimeMs: 12, curve: [{ evaluations: 100, best: 1.1 }] },
      ],
      summaries: [{ optimizer: "a", budget: 1500, runs: 2, feasibleRuns: 2, medianBest_kg: 0.55, q1Best_kg: 0.525, q3Best_kg: 0.575, medianEvaluationsToTarget: 700, runsReachingTarget: 1, meanWallTimeS: 0.011 }],
    });
    expect(bench.kind).toBe("benchmark");
    expect(bench.groups).toHaveLength(1);
    expect(bench.groups[0].runs).toHaveLength(2);
    expect(bench.groups[0].summary.medianBest).toBe(0.55);
    const abl = normalizeReport("2026-01-01-ablation-1500x8.json", {
      engineVersion: "0.4.0",
      createdAt: "x",
      seeds: 2,
      budget: 1500,
      targetMass_kg: 0.8,
      baselineMass_kg: 1.6,
      rows: [{ label: "v", optimizer: "o", params: {}, medianBest: 0.5, q1: 0.4, q3: 0.6, medianToTarget: 600, reached: 2, medianFalseFeasible: 0.01, medianFalseInfeasible: 0, medianForceR2: 0.99, medianCoverage: 0.97, runs: [{ seed: 1, best: 0.5, toTarget: 600 }, { seed: 2, best: 0.5, toTarget: 600 }] }],
    });
    expect(abl.kind).toBe("ablation");
    expect(abl.groups[0].label).toBe("v");
    expect(abl.groups[0].summary.medianFalseFeasible).toBe(0.01);
    expect(abl.groups[0].runs[0].curve).toEqual([]);
  });
});
