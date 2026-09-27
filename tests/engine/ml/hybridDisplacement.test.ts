import { describe, expect, test } from "vitest";
import { Rng } from "../../../src/engine/core/rng";
import { compileProblem } from "../../../src/engine/domains/registry";
import { createTrussBridgeProblem } from "../../../src/engine/domains/structural/truss/template";
import { createExperimentConfig } from "../../../src/engine/experiments/runner";
import { buildDataset, collectDesigns } from "../../../src/engine/ml/dataset";
import { HybridPredictor } from "../../../src/engine/ml/hybrid";
import { runMemberStudy } from "../../../src/engine/ml/study";

const problem = createTrussBridgeProblem({ span_m: 2, load_N: 500, panels: 4 });
const compiled = compileProblem(problem);
const config = createExperimentConfig({ id: "hd", problem, seed: 9, optimizer: { id: "evolutionary", params: { populationSize: 40 } }, budget: { maxEvaluations: 1600 } });

describe("hybrid predictor on the displacement representation", () => {
  const designs = collectDesigns(config);
  const ds = buildDataset(compiled.space, designs, [], ["memberForces_N", "nodeDisplacements_m"]);

  test("derives every constraint metric from predicted displacements without any global surrogate", () => {
    const hp = new HybridPredictor(compiled, { representation: "displacements", memberModel: "ridge", riskK: 2 }, new Rng(1));
    hp.fit(ds);
    expect(hp.globalMetrics).toEqual([]);
    const out = hp.predict(designs.slice(0, 20).map((d) => d.parameters));
    for (const o of out) {
      expect(o.displacements?.mean).toHaveLength(15);
      expect(o.forces.mean).toHaveLength(15);
      expect(o.forces.std).toHaveLength(15);
      for (const m of ["stressUtilization", "bucklingUtilization", "maxDisplacement_m", "compliance_J"]) {
        expect(Number.isFinite(o.nominal.metrics[m])).toBe(true);
        expect(o.conservative.metrics[m]).toBeGreaterThanOrEqual(o.nominal.metrics[m] - 1e-12);
      }
    }
  });

  test("force uncertainty is propagated through the linear map: sigma_N = sqrt(sum (B sigma_u)^2)", () => {
    const hp = new HybridPredictor(compiled, { representation: "displacements", memberModel: "ridge", riskK: 1 }, new Rng(1));
    hp.fit(ds);
    const params = designs[5].parameters;
    const [o] = hp.predict([params]);
    const { matrix } = compiled.responseModel!.forcesFromDisplacements!(params, o.displacements!.mean);
    matrix.forEach((row, m) => {
      const expected = Math.sqrt(row.reduce((s, b, j) => s + (b * o.displacements!.std[j]) ** 2, 0));
      expect(o.forces.std[m]).toBeCloseTo(expected, 9);
    });
  });

  test("the combined representation derives deflection from the field and keeps force accuracy, with no global regressor", () => {
    const f = runMemberStudy(config, { memberModel: "ridge", riskK: 2, splitSeed: 1, representation: "forces" });
    const b = runMemberStudy(config, { memberModel: "ridge", riskK: 2, splitSeed: 1, representation: "both" });
    expect(f.representation).toBe("forces");
    expect(b.representation).toBe("both");
    const defl = b.derivedMetrics.find((x) => x.target === "maxDisplacement_m")!;
    expect(defl.r2).toBeGreaterThan(0.5);
    expect(b.forces.overallR2).toBeGreaterThan(0.9);
    expect(b.feasibility.accuracy).toBeGreaterThan(0.9);
    const hp = new HybridPredictor(compiled, { representation: "both", memberModel: "ridge", riskK: 2 }, new Rng(1));
    expect(hp.globalMetrics).toEqual([]);
  });

  test("differencing a learned displacement field to obtain forces is ill-conditioned (recorded finding)", () => {
    const d = runMemberStudy(config, { memberModel: "ridge", riskK: 2, splitSeed: 1, representation: "displacements" });
    expect(d.forces.overallR2).toBeLessThan(0.9);
  });
});
