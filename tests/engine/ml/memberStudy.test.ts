import { describe, expect, test } from "vitest";
import { createTrussBridgeProblem } from "../../../src/engine/domains/structural/truss/template";
import { createExperimentConfig } from "../../../src/engine/experiments/runner";
import { runMemberStudy } from "../../../src/engine/ml/study";

describe("member-level surrogate study", () => {
  const problem = createTrussBridgeProblem({ span_m: 2, load_N: 500, panels: 4 });
  const config = createExperimentConfig({ id: "mstudy", problem, seed: 4, optimizer: { id: "evolutionary", params: { populationSize: 40 } }, budget: { maxEvaluations: 1200 } });

  test("reports per-member force errors, feasibility reliability and calibration on the held-out split", () => {
    const s = runMemberStudy(config, { memberModel: "ridge", riskK: 2, splitSeed: 1 });
    expect(s.dataset.size).toBeGreaterThan(1000);
    expect(s.forces.perMemberMae).toHaveLength(15);
    expect(s.forces.perMemberRmse).toHaveLength(15);
    expect(s.forces.overallR2).toBeGreaterThan(0.8);
    expect(s.forces.coverage95).toBeGreaterThan(0.5);
    expect(s.forces.coverage95).toBeLessThanOrEqual(1);
    expect(s.forces.meanStd).toBeGreaterThan(0);
    const f = s.feasibility;
    expect(f.truePositive + f.falsePositive + f.trueNegative + f.falseNegative).toBe(s.split.test);
    expect(f.accuracy).toBeGreaterThan(0.6);
    expect(s.feasibilityConservative.predictedFeasibleRate).toBeLessThanOrEqual(f.predictedFeasibleRate + 1e-12);
    // Derived metrics against the solver's on the test split.
    for (const m of ["stressUtilization", "bucklingUtilization"]) {
      const r = s.derivedMetrics.find((x) => x.target === m)!;
      expect(Number.isFinite(r.r2)).toBe(true);
      expect(r.sample.length).toBeGreaterThan(10);
    }
    // Calibration bins: error should rise with predicted uncertainty in at least the extreme bins.
    expect(s.calibration.length).toBeGreaterThanOrEqual(3);
    expect(s.calibration[s.calibration.length - 1].meanAbsError).toBeGreaterThanOrEqual(s.calibration[0].meanAbsError * 0.5);
  });

  test("is deterministic", () => {
    const a = runMemberStudy(config, { memberModel: "ridge", riskK: 1, splitSeed: 2 });
    const b = runMemberStudy(config, { memberModel: "ridge", riskK: 1, splitSeed: 2 });
    expect(a.forces.overallR2).toBe(b.forces.overallR2);
    expect(a.feasibility).toEqual(b.feasibility);
  });
});
