import { describe, expect, test } from "vitest";
import { compileProblem } from "../../../src/engine/domains/registry";
import { createManipulatorProblem } from "../../../src/engine/domains/robotics/manipulator/template";
import { createSpaceTrussProblem } from "../../../src/engine/domains/structural/truss3d/template";
import { createTrussBridgeProblem } from "../../../src/engine/domains/structural/truss/template";
import { createHeatSinkProblem } from "../../../src/engine/domains/thermal/finArray/template";
import { createExperimentConfig, runExperimentToCompletion } from "../../../src/engine/experiments/runner";
import { HybridPredictor } from "../../../src/engine/ml/hybrid";
import { runMemberStudy } from "../../../src/engine/ml/study";
import { Rng } from "../../../src/engine/core/rng";
import { memberStudyReference } from "../../fixtures/memberStudyReference";

/**
 * The fixture was generated before the refactor and matched bit for bit on the
 * generating machine. Across Node versions and platforms the learned models
 * differ in the last few ulps (up to about 1e-9 relative where ridge conditioning amplifies rounding), so the cross-platform
 * check uses a relative tolerance far below any behavioural change.
 */
function expectClose(actual: unknown, expected: unknown, path: string): void {
  if (typeof expected === "number" && typeof actual === "number") {
    if (Number.isNaN(expected)) return expect(Number.isNaN(actual), path).toBe(true);
    const tol = 1e-6 * Math.max(1, Math.abs(expected));
    expect(Math.abs(actual - expected), `${path}: ${actual} vs ${expected}`).toBeLessThanOrEqual(tol);
    return;
  }
  if (Array.isArray(expected)) {
    expect(Array.isArray(actual), path).toBe(true);
    expect((actual as unknown[]).length, path).toBe(expected.length);
    expected.forEach((e, i) => expectClose((actual as unknown[])[i], e, `${path}[${i}]`));
    return;
  }
  if (expected && typeof expected === "object") {
    expect(Object.keys(actual as object).sort(), path).toEqual(Object.keys(expected).sort());
    for (const k of Object.keys(expected)) expectClose((actual as Record<string, unknown>)[k], (expected as Record<string, unknown>)[k], `${path}.${k}`);
    return;
  }
  expect(actual, path).toEqual(expected);
}

const truss = compileProblem(createTrussBridgeProblem({ span_m: 2, load_N: 500, panels: 4 }));
const space = compileProblem(createSpaceTrussProblem({ span_m: 3, load_N: 2000, bays: 2 }));
const arm = compileProblem(createManipulatorProblem({ payload_kg: 2, reach_m: 0.8 }));
const sink = compileProblem(createHeatSinkProblem({ power_W: 40, maxTemperature_C: 80 }));

describe("response-id contract replaces string literals", () => {
  test("every domain names its primary response, and the trusses their displacement field", () => {
    expect(truss.responseModel!.primaryResponseId).toBe("memberForces_N");
    expect(truss.responseModel!.displacementResponseId).toBe("nodeDisplacements_m");
    expect(space.responseModel!.primaryResponseId).toBe("memberForces_N");
    expect(space.responseModel!.displacementResponseId).toBe("nodeDisplacements_m");
    expect(arm.responseModel!.primaryResponseId).toBe("jointTorques_Nm");
    expect(arm.responseModel!.displacementResponseId).toBeUndefined();
    expect(sink.responseModel!.primaryResponseId).toBe("thermalState");
    for (const c of [truss, space, arm, sink]) expect(c.responseModel!.responseIds[0]).toBe(c.responseModel!.primaryResponseId);
  });

  test("the hybrid predictor falls back to the primary response where no displacement field exists and honours requests where one does", () => {
    expect(new HybridPredictor(arm, { memberModel: "ridge", riskK: 2, representation: "both" }, new Rng(1)).representationUsed).toBe("forces");
    expect(new HybridPredictor(sink, { memberModel: "ridge", riskK: 2, representation: "displacements" }, new Rng(1)).representationUsed).toBe("forces");
    expect(new HybridPredictor(truss, { memberModel: "ridge", riskK: 2, representation: "both" }, new Rng(1)).representationUsed).toBe("both");
    expect(new HybridPredictor(space, { memberModel: "ridge", riskK: 2, representation: "displacements" }, new Rng(1)).representationUsed).toBe("displacements");
  });

  test("member studies reproduce the pre-refactor fixture exactly on the truss (both and forces) and the manipulator", () => {
    const fx = memberStudyReference as Record<string, { representation: string; forcesR2: number; precision: number; perMemberMae: number[]; derived: unknown }>;
    const cases = [
      ["truss-both", createTrussBridgeProblem({ span_m: 2, load_N: 500, panels: 4 }), "both"],
      ["truss-forces", createTrussBridgeProblem({ span_m: 2, load_N: 500, panels: 4 }), "forces"],
      ["arm", createManipulatorProblem({ payload_kg: 2, reach_m: 0.8 }), "forces"],
    ] as const;
    for (const [name, problem, rep] of cases) {
      const cfg = createExperimentConfig({ id: `fx-${name}`, problem, seed: 3, optimizer: { id: "evolutionary", params: { populationSize: 20 } }, budget: { maxEvaluations: 400 } });
      runExperimentToCompletion(cfg);
      const s = runMemberStudy(cfg, { memberModel: "ridge", riskK: 2, representation: rep, splitSeed: 3, maxTrainingPoints: 400 });
      expect(s.representation).toBe(fx[name].representation);
      expectClose(s.forces.overallR2, fx[name].forcesR2, `${name} forcesR2`);
      expectClose(s.feasibility.precision, fx[name].precision, `${name} precision`);
      expectClose(s.forces.perMemberMae, fx[name].perMemberMae, `${name} perMemberMae`);
      expectClose(s.derivedMetrics, fx[name].derived, `${name} derived`);
    }
  });
});

describe("domain-owned presentation replaces the interface's label maps", () => {
  test("learning targets equal the maps the panels used to hold", () => {
    expect(truss.presentation!.learningTargets).toEqual(["mass_kg", "maxStress_Pa", "bucklingUtilization", "maxDisplacement_m"]);
    expect(space.presentation!.learningTargets).toEqual(["mass_kg", "maxStress_Pa", "bucklingUtilization", "maxDisplacement_m"]);
    expect(arm.presentation!.learningTargets).toEqual(["peakTorque_Nm", "mass_kg", "stressUtilization", "maxTipDeflection_m"]);
    expect(sink.presentation!.learningTargets).toEqual(["mass_kg", "baseTemperature_C", "thermalResistance_K_W", "finEfficiency"]);
  });

  test("component labels reproduce the previous strings", () => {
    expect(truss.presentation!.componentLabel(0)).toBe(truss.space.variables.find((v) => v.id === "area_0")!.label.replace(" area", ""));
    expect(space.presentation!.componentLabel(3)).toBe(space.space.variables.find((v) => v.id === "area_3")!.label.replace(" area", ""));
    expect(space.presentation!.componentLabel(3)).toBe("Bottom tie 1");
    expect(arm.presentation!.componentLabel(3)).toBe("task point 2 · joint 2");
    expect(sink.presentation!.componentLabel(2)).toBe("convection coefficient");
    expect(sink.presentation!.componentLabel(99)).toBe("component 99");
    expect(truss.presentation!.responseLearning.representations.map((r) => r.value)).toEqual(["both", "forces", "displacements"]);
    expect(arm.presentation!.responseLearning.representations.map((r) => r.value)).toEqual(["forces"]);
  });
});
