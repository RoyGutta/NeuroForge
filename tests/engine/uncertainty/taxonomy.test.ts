import { describe, expect, test } from "vitest";
import { compileProblem } from "../../../src/engine/domains/registry";
import { createTrussBridgeProblem } from "../../../src/engine/domains/structural/truss/template";
import { robustnessStudy } from "../../../src/engine/robustness/robustness";
import { buildUncertaintyReport, UNCERTAINTY_KINDS } from "../../../src/engine/uncertainty/taxonomy";

const problem = createTrussBridgeProblem({ span_m: 2, load_N: 500, panels: 4 });
const compiled = compileProblem(problem);
const evaluation = compiled.evaluate(compiled.baseline.parameters);

describe("engineering uncertainty taxonomy", () => {
  test("covers every kind, quantifies only what was measured, and documents the rest", () => {
    const r = buildUncertaintyReport({ problem, evaluation });
    for (const k of UNCERTAINTY_KINDS) expect(r.entries.some((e) => e.kind === k)).toBe(true);
    expect(r.entries.filter((e) => e.kind === "model-form").length).toBeGreaterThanOrEqual(problem.assumptions.length);
    expect(r.entries.find((e) => e.kind === "manufacturing")!.status).toBe("not-modelled");
    expect(r.entries.find((e) => e.kind === "surrogate")!.status).toBe("not-modelled");
    expect(r.entries.find((e) => e.kind === "statistical")!.status).toBe("documented");
    expect(r.entries.filter((e) => e.status === "quantified").every((e) => typeof e.value === "number" && Number.isFinite(e.value))).toBe(true);
    expect(r.quantified + r.documented + r.notModelled).toBe(r.entries.length);
  });

  test("turns a robustness study, screening diagnostics and multi-seed pilots into quantified entries", () => {
    const robustness = robustnessStudy(compiled, compiled.baseline.parameters, { samples: 100, seed: 1, tolerance: 0.02 });
    const r = buildUncertaintyReport({
      problem,
      evaluation,
      robustness,
      screening: { precision: 0.97, falseFeasibleRate: 0.03, forceR2: 0.95 },
      pilots: [
        { strategy: "a", seed: 1, bestObjective: 0.5, feasible: true },
        { strategy: "a", seed: 2, bestObjective: 0.52, feasible: true },
        { strategy: "b", seed: 1, bestObjective: 0.6, feasible: true },
      ],
      chosenStrategy: "a",
    });
    const manufacturing = r.entries.find((e) => e.kind === "manufacturing")!;
    expect(manufacturing.status).toBe("quantified");
    expect(manufacturing.value).toBe(robustness.feasibleFraction);
    const surrogate = r.entries.find((e) => e.kind === "surrogate")!;
    expect(surrogate.status).toBe("quantified");
    expect(surrogate.value).toBe(0.03);
    const statistical = r.entries.find((e) => e.kind === "statistical")!;
    expect(statistical.status).toBe("quantified");
    expect(statistical.value).toBeCloseTo((0.52 - 0.5) / 0.51, 9);
    expect(r.quantified).toBeGreaterThanOrEqual(3);
  });
});
